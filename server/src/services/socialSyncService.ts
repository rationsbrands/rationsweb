import SocialConnection from '../models/SocialConnection'
import SocialImport from '../models/SocialImport'
import IntegrationLog from '../models/IntegrationLog'
import CommunityPost from '../models/CommunityPost'
import { instagramClient, InstagramMedia } from '../integrations/instagram/instagramClient'
import { decryptSocial, encryptSocial } from '../utils/socialEncryption'
import { youtubeClient } from '../integrations/youtube/youtubeClient'
import { refreshYouTubeToken } from '../integrations/youtube/youtubeOAuth'
import { env } from '../config/env'

interface SyncResult {
  success: boolean
  imported: number
  failed: number
  totalFound: number
  previews?: any[]
  error?: string
}

interface SyncOptions {
  autoPublish?: boolean
  autoPublishHashtag?: string
  filterHashtag?: string
  filterKeyword?: string
  maxPerRun?: number
}

export class SocialSyncService {

  async syncProvider(provider: 'instagram' | 'youtube', mode: 'preview' | 'run' = 'run') {
    if (provider === 'instagram') return this.syncInstagram(mode)
    return this.syncYouTube(mode)
  }

  async syncYouTube(mode: 'preview' | 'run' = 'run') {
    const conn = await SocialConnection.findOne({ provider: 'youtube', isActive: true })
    if (!conn?.apiKeyEnc && !conn?.accessTokenEnc) return { success: false, imported: 0, failed: 0, totalFound: 0, error: 'YouTube not configured' }

    const syncMode = String(conn.mode || 'api_key')
    let playlistId = String(conn.settings?.playlistId || '')
    const limit = Number(conn.settings?.maxPerRun || 10)
    const filterKeyword = String(conn.settings?.filterKeyword || '').toLowerCase()
    const autoPublish = (conn.settings?.autoPublish === undefined)
      ? (process.env.NODE_ENV !== 'production')
      : Boolean(conn.settings?.autoPublish)

    let items: any[] = []

    if (syncMode === 'oauth' && (conn.accessTokenEnc || conn.refreshTokenEnc)) {
      const accessToken = await this.ensureValidYouTubeToken(conn)
      if (!accessToken) return { success: false, imported: 0, failed: 0, totalFound: 0, error: 'YouTube token expired and refresh failed' }

      // resolve uploads playlist if not set
      if (!playlistId) {
        playlistId = await youtubeClient.getMyUploadsPlaylistId(accessToken)
        await SocialConnection.updateOne(
          { provider: 'youtube' },
          { $set: { 'settings.playlistId': playlistId } }
        )
      }

      items = await youtubeClient.listPlaylistVideosWithOAuth(accessToken, playlistId, limit)
    } else {
      if (!conn.apiKeyEnc) return { success: false, imported: 0, failed: 0, totalFound: 0, error: 'YouTube API Key missing' }
      const apiKey = decryptSocial(conn.apiKeyEnc)
      if (!playlistId) throw new Error('Missing playlistId in YouTube settings')
      items = await youtubeClient.listPlaylistVideosWithApiKey(apiKey, playlistId, limit)
    }

    const filtered = filterKeyword
      ? items.filter(v => (v.title + ' ' + (v.description || '')).toLowerCase().includes(filterKeyword))
      : items

    if (mode === 'preview') {
      return {
        success: true,
        imported: 0,
        failed: 0,
        totalFound: filtered.length,
        previews: filtered.map(v => ({
          externalId: v.videoId,
          title: v.title,
          caption: v.description,
          mediaUrl: youtubeClient.videoUrl(v.videoId),
          thumbnailUrl: v.thumbnailUrl,
          timestamp: v.publishedAt,
          permalink: youtubeClient.videoUrl(v.videoId),
          mediaType: 'YOUTUBE_VIDEO'
        }))
      }
    }

    let imported = 0
    let failed = 0

    for (const v of filtered) {
      try {
        const externalPostId = v.videoId
        const exists = await SocialImport.findOne({ provider: 'youtube', externalPostId })
        if (exists) continue

        const permalink = youtubeClient.videoUrl(v.videoId)

        let communityPostId: any = undefined
        if (autoPublish) {
          const post = await CommunityPost.create({
            title: v.title || 'YouTube Video',
            content: v.description || '',
            author: 'Rations Team',
            tag: 'youtube',
            status: 'published',
            deleted: false,

            // this is what the site uses for embeds
            mediaUrl: permalink,
            mediaTitle: v.title || '',

            // optional but useful for preview cards
            imageUrl: v.thumbnailUrl || '',

            // optional external link button
            externalLinkUrl: permalink,
            externalLinkTitle: 'Watch on YouTube',

            // source tracking (we’ll update enum below)
            source: {
              provider: 'youtube',
              externalId: v.videoId,
              permalink,
              mediaType: 'YOUTUBE_VIDEO'
            }
          })
          communityPostId = post._id
        }

        await SocialImport.create({
          provider: 'youtube',
          externalPostId,
          communityPostId,
          status: autoPublish ? 'published' : 'imported',
          raw: v,
          normalized: {
            title: v.title,
            caption: v.description,
            mediaUrl: permalink,
            thumbnailUrl: v.thumbnailUrl,
            mediaType: 'YOUTUBE_VIDEO',
            timestamp: new Date(v.publishedAt),
            permalink
          }
        })

        imported++
      } catch {
        failed++
      }
    }

    await SocialConnection.updateOne({ provider: 'youtube' }, { lastSyncAt: new Date(), lastError: '' })

    // If auto-publish is enabled, also publish any previously imported items
    if (autoPublish && mode === 'run') {
      const published = await this.publishPendingYouTubeImports()
      if (published) console.log(`[SocialSync] Published ${published} pending YouTube imports`)
    }

    return { success: true, imported, failed, totalFound: filtered.length }
  }

  /**
   * Syncs content from a provider (Instagram only for now)
   */
  async syncInstagram(mode: 'preview' | 'run', options: SyncOptions = {}): Promise<SyncResult> {
    try {
      // 1. Get Connection
      const conn = await SocialConnection.findOne({ provider: 'instagram' })
      if (!conn || conn.status !== 'connected') {
        throw new Error('Instagram not connected')
      }

      // Fix legacy documents missing 'mode'
      if (!conn.mode) {
        conn.mode = 'oauth'
      }

      // 2. Ensure Valid Token (Refresh if needed)
      const token = await this.ensureValidInstagramToken(conn)
      if (!token) {
        throw new Error('Instagram token expired or invalid')
      }

      // 3. Fetch Media (use lastCursor if available)
      const limit = options.maxPerRun || 20
      const igUserId = await instagramClient.getInstagramBusinessAccount(token)
      const { data: items, paging } = await instagramClient.getRecentMedia(igUserId, token, limit)
      
      // Log Sync Start
      try {
        await IntegrationLog.create({
          provider: 'instagram',
          action: 'SYNC_START',
          direction: 'inbound',
          status: 'success',
          request: { limit, mode },
          response: { found: items.length }
        })
      } catch {}

      // 4. Handle Preview Mode
      if (mode === 'preview') {
        const previews = items.map(item => ({
          externalId: item.id,
          caption: item.caption,
          mediaUrl: item.media_url || item.thumbnail_url,
          mediaType: item.media_type,
          timestamp: item.timestamp,
          permalink: item.permalink
        }))
        return { success: true, imported: 0, failed: 0, totalFound: items.length, previews }
      }

      // 5. Handle Import Mode (run)
      let importedCount = 0
      let failedCount = 0

      for (const item of items) {
        try {
          // Apply Filters
          if (options.filterHashtag) {
            const caption = item.caption?.toLowerCase() || ''
            if (!caption.includes(options.filterHashtag.toLowerCase())) {
              continue // Skip if missing hashtag
            }
          }
          if (options.filterKeyword) {
            const caption = item.caption?.toLowerCase() || ''
            if (!caption.includes(options.filterKeyword.toLowerCase())) {
               continue // Skip if missing keyword
            }
          }

          const isImported = await this.processItem(item, options)
          if (isImported) importedCount++
        } catch (e) {
          console.error(`Failed to import item ${item.id}:`, e)
          failedCount++
        }
      }

      // 6. Update Connection Stats
      conn.lastSyncAt = new Date()
      // Store cursor for next page if we have one
      if (paging?.cursors?.after) {
        conn.lastCursor = paging.cursors.after
      }
      conn.lastError = undefined
      await conn.save()

      // Log Sync Summary
      try {
        await IntegrationLog.create({
          provider: 'instagram',
          action: 'SYNC_SUMMARY',
          direction: 'inbound',
          status: 'success',
          response: { imported: importedCount, failed: failedCount, total: items.length }
        })
      } catch {}

      return { success: true, imported: importedCount, failed: failedCount, totalFound: items.length }

    } catch (error: any) {
      console.error('Social Sync Service Error:', error)
      
      // Update connection with error
      await SocialConnection.findOneAndUpdate(
        { provider: 'instagram' },
        { lastError: error.message || 'Sync failed' }
      )
      
      // Log Error
      try {
        await IntegrationLog.create({
          provider: 'instagram',
          action: 'SYNC_ERROR',
          direction: 'inbound',
          status: 'failed',
          error: error.message
        })
      } catch {}
      
      return { success: false, imported: 0, failed: 0, totalFound: 0, error: error.message }
    }
  }

  /**
   * Checks token expiry and refreshes if within 7 days of expiration.
   * Returns valid token string, or null if expired/invalid.
   */
  async ensureValidInstagramToken(conn: any): Promise<string | null> {
    try {
      // 1. Check if already expired
      const now = Date.now()
      const expiry = conn.tokenExpiresAt ? new Date(conn.tokenExpiresAt).getTime() : 0
      
      // If we have an expiry date and it's in the past
      if (expiry && now > expiry) {
        console.warn(`[SocialSync] Token expired at ${conn.tokenExpiresAt}`)
        conn.status = 'expired'
        conn.lastError = 'Token expired. Please reconnect.'
        await conn.save()
        return null
      }

      // 2. Decrypt current token
      let currentToken: string
      try {
        currentToken = decryptSocial(conn.accessTokenEnc)
      } catch (e) {
        console.error('Failed to decrypt token:', e)
        return null
      }

      // 3. Check if needs refresh (within 7 days)
      // Only refresh long-lived tokens
      const isLongLived = conn.tokenType !== 'short_lived' 
      const daysUntilExpiry = (expiry - now) / (1000 * 60 * 60 * 24)
      
      if (isLongLived && expiry && daysUntilExpiry < 7) {
        console.log(`[SocialSync] Refreshing token (Expires in ${daysUntilExpiry.toFixed(1)} days)`)
        try {
          const data = await instagramClient.refreshLongLivedToken(currentToken)
          if (data.access_token) {
            // Success! Update connection
            const encrypted = encryptSocial(data.access_token)
            conn.accessTokenEnc = encrypted
            
            // Defend against missing expires_in
            const seconds = typeof data.expires_in === 'number' ? data.expires_in : 5184000 // 60 days default
            const newExpiry = new Date(now + (seconds * 1000))
            
            // Validate date before setting
            if (!isNaN(newExpiry.getTime())) {
              conn.tokenExpiresAt = newExpiry
            } else {
              console.warn('[SocialSync] Invalid expiry date calculated, using default 60 days')
              conn.tokenExpiresAt = new Date(now + (5184000 * 1000))
            }

            conn.lastTokenRefreshAt = new Date()
            conn.refreshError = undefined // Clear error

            // Ensure mode is set (migration fix)
            if (!conn.mode) {
              conn.mode = 'oauth'
            }

            await conn.save()
            
            return data.access_token
          }
        } catch (err: any) {
          console.error(`[SocialSync] Token refresh failed:`, err.message)
          // Mark warning but return existing token (it's still valid for a few days)
          conn.refreshError = err.message || 'Refresh failed'
          await conn.save()
          return currentToken
        }
      }

      return currentToken

    } catch (error) {
      console.error('Error ensuring valid token:', error)
      return null
    }
  }

  async ensureValidYouTubeToken(conn: any): Promise<string | null> {
    try {
      const now = Date.now()
      const expiry = conn.tokenExpiresAt ? new Date(conn.tokenExpiresAt).getTime() : 0
      
      let currentToken: string | null = null
      if (conn.accessTokenEnc) {
        try {
          currentToken = decryptSocial(conn.accessTokenEnc)
        } catch {}
      }

      // If token is expiring within 10 minutes (600 seconds) or already expired, attempt refresh
      const isExpiring = expiry && now > (expiry - 10 * 60 * 1000)
      
      if ((!currentToken || isExpiring) && conn.refreshTokenEnc) {
        console.log(`[SocialSync] Refreshing YouTube token`)
        try {
          const refreshToken = decryptSocial(conn.refreshTokenEnc)
          const data = await refreshYouTubeToken({
            clientId: env.YT_CLIENT_ID,
            clientSecret: env.YT_CLIENT_SECRET,
            refreshToken
          })

          if (data.accessToken) {
            currentToken = data.accessToken
            conn.accessTokenEnc = encryptSocial(data.accessToken)
            conn.tokenExpiresAt = new Date(now + data.expiresIn * 1000)
            conn.lastTokenRefreshAt = new Date()
            conn.refreshError = undefined
            await conn.save()
          }
        } catch (err: any) {
          console.error(`[SocialSync] YouTube token refresh failed:`, err.message)
          conn.refreshError = err.message || 'YT Refresh failed'
          conn.status = 'expired'
          await conn.save()
          return null
        }
      } else if (!currentToken) {
        return null // No token and no way to refresh
      }

      return currentToken

    } catch (error) {
      console.error('Error ensuring valid YouTube token:', error)
      return null
    }
  }

  /**
   * Process a single Instagram item:
   * - Deduplicate via SocialImport
   * - Create SocialImport
   * - Create CommunityPost (Pending)
   */
  private async processItem(item: InstagramMedia, options: SyncOptions): Promise<boolean> {
    // Check if already exists
    const existingImport = await SocialImport.findOne({ provider: 'instagram', externalPostId: item.id })
    if (existingImport) {
      return false // Already imported
    }

    // Determine Media URL (Video needs thumbnail or direct link? CommunityPost only has imageUrl)
    // If VIDEO, use thumbnail_url if available, else media_url
    // If CAROUSEL, media_url is the first item
    const displayUrl = item.thumbnail_url || item.media_url

    // Determine Status
    let status = 'pending'
    let reason: string | undefined

    if (options.autoPublish) {
       // If autoPublishHashtag is blank/undefined, publish everything.
       // Otherwise require the hashtag to be present (case-insensitive).
       const requiredHashtag = (options.autoPublishHashtag || '').trim()

       if (!requiredHashtag) {
         status = 'published'
       } else if (item.caption && item.caption.toLowerCase().includes(requiredHashtag.toLowerCase())) {
         status = 'published'
       } else {
         status = 'pending'
         reason = 'missing_autopublish_hashtag'
       }
    }

    // Create Community Post (Pending or Published)
    try {
      const post = await CommunityPost.create({
        title: this.deriveTitle(item.caption),
        content: (item.caption || '') + `\n\nSource: ${item.permalink}`,
        imageUrl: displayUrl,
        status: status, // Moderation Queue or Auto-Publish
        author: 'Instagram Import',
        source: {
          provider: 'instagram',
          externalId: item.id,
          permalink: item.permalink,
          mediaType: item.media_type
        }
      })

      // Create Social Import Record
      await SocialImport.create({
        provider: 'instagram',
        externalPostId: item.id,
        communityPostId: post._id,
        status: status === 'published' ? 'published' : 'imported',
        reason: reason,
        rawSummary: {
          caption: item.caption?.substring(0, 500),
          mediaUrl: displayUrl,
          mediaType: item.media_type,
          timestamp: item.timestamp,
          permalink: item.permalink
        }
      })

      return true
    } catch (error: any) {
      if (error.code === 11000) {
         // Duplicate key error - already exists
         return false
      }
      throw error
    }
  }

  
  private async publishPendingYouTubeImports() {
    // Publish any previously imported YouTube items (e.g. when autoPublish was enabled after an earlier sync)
    const pending = await SocialImport.find({
      provider: 'youtube',
      status: 'imported',
      $or: [{ communityPostId: { $exists: false } }, { communityPostId: null }]
    }).sort({ createdAt: 1 })

    if (!pending.length) return 0

    let published = 0
    for (const imp of pending) {
      try {
        const n: any = (imp as any).normalized || {}
        const permalink = String(n.permalink || '')
        const title = String(n.title || 'YouTube Video')
        const caption = String(n.caption || '')

        // avoid creating duplicates if a community post already exists for this source id
        const existing = await CommunityPost.findOne({
          'source.provider': 'youtube',
          'source.externalId': imp.externalPostId
        })
        if (existing) {
          ;(imp as any).communityPostId = existing._id
          ;(imp as any).status = 'published'
          await imp.save()
          published++
          continue
        }

        const post = await CommunityPost.create({
          title,
          content: caption,
          author: 'Rations Team',
          tag: 'youtube',
          status: 'published',
          deleted: false,

          mediaUrl: permalink || undefined,
          mediaTitle: title,

          imageUrl: String(n.thumbnailUrl || ''),

          externalLinkUrl: permalink || undefined,
          externalLinkTitle: 'Watch on YouTube',

          source: {
            provider: 'youtube',
            externalId: imp.externalPostId,
            permalink,
            mediaType: String(n.mediaType || 'YOUTUBE_VIDEO')
          }
        })

        ;(imp as any).communityPostId = post._id
        ;(imp as any).status = 'published'
        await imp.save()

        published++
      } catch {
        // keep the import as-is; it can be retried on next run
      }
    }

    return published
  }

private deriveTitle(caption?: string): string {
    if (!caption) return 'Instagram Post'
    // Take first line or first 50 chars
    const firstLine = caption.split('\n')[0]
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine
  }
}

export const socialSyncService = new SocialSyncService()
