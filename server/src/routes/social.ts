import express from 'express'
import rateLimit from 'express-rate-limit'
import { authorize, protect } from '../middleware/auth'
import SocialConnection from '../models/SocialConnection'
import { encryptSocial, decryptSocial } from '../utils/socialEncryption'
import { instagramClient } from '../integrations/instagram/instagramClient'
import CommunityPost from '../models/CommunityPost'
import Settings from '../models/Settings'
import { socialSyncService } from '../services/socialSyncService'
import { youtubeClient } from '../integrations/youtube/youtubeClient'
import { getYouTubeAuthUrl, exchangeYouTubeCode } from '../integrations/youtube/youtubeOAuth'
import { env } from '../config/env'
import crypto from 'crypto'

const router = express.Router()

// --- Rate Limiting (apply once globally) ---
const socialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: 'Too many social integration requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})
router.use(socialLimiter)

// -------------------------
// Helpers
// -------------------------
type StatePayload = { u: string; ts: number; r?: string; n?: string }

function encodeState(payload: StatePayload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

function decodeState(state: unknown): StatePayload {
  const raw = Array.isArray(state) ? String(state[0] || '') : String(state || '')
  if (!raw) throw new Error('missing_state')

  // base64url (preferred)
  try {
    const decoded = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    return decoded
  } catch {
    // fallback for older base64 states if any exist
    const decoded = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
    return decoded
  }
}

function isExpired(ts: number, maxMs = 10 * 60 * 1000) {
  return Date.now() - ts > maxMs
}

const getMissingIgEnvVars = () => {
  const required: string[] = []
  if (!env.IG_CLIENT_ID) required.push('IG_CLIENT_ID')
  if (!env.IG_CLIENT_SECRET) required.push('IG_CLIENT_SECRET')
  if (!env.IG_REDIRECT_URI) required.push('IG_REDIRECT_URI')
  return required
}

const isInstagramConfigured = () => getMissingIgEnvVars().length === 0


// Instagram OAuth Callback (Public)
router.get('/instagram/callback', async (req: any, res) => {
  try {
    const { code, error, state } = req.query

    let decoded: StatePayload
    try {
      decoded = decodeState(state)
      if (!decoded?.u || typeof decoded.ts !== 'number') throw new Error('bad_state')
      if (isExpired(decoded.ts)) throw new Error('state_expired')
    } catch (e) {
      return res.status(400).send('Invalid state parameter')
    }

    // CSRF Check using HttpOnly cookie
    const oauthCsrf = req.cookies?.oauth_csrf
    if (decoded.n && (!oauthCsrf || oauthCsrf !== decoded.n)) {
      console.warn('OAuth CSRF check failed or missing cookie.')
      const returnBase = decoded?.r || process.env.ADMIN_APP_URL || ''
      return res.redirect(`${returnBase}/admin/integrations/social?social_error=csrf_failed`)
    }

    if (error) {
      const returnBase = decoded?.r || process.env.ADMIN_APP_URL || ''
      return res.redirect(`${returnBase}/admin/integrations/social?social_error=${encodeURIComponent(String(error))}`)
    }

    if (!code) return res.status(400).send('Missing code')

    // Exchange for tokens
    const shortTokenData = await instagramClient.getShortLivedToken(
      env.IG_CLIENT_ID,
      env.IG_CLIENT_SECRET,
      env.IG_REDIRECT_URI,
      String(code)
    )

    // Exchange for long-lived
    let finalToken = shortTokenData.access_token
    let expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    try {
      const longData = await instagramClient.getLongLivedToken(env.IG_CLIENT_SECRET, shortTokenData.access_token)
      if (longData.access_token) {
        finalToken = longData.access_token
        const seconds = longData.expires_in || 5184000
        expiresAt = new Date(Date.now() + seconds * 1000)
      }
    } catch {
      console.warn('Failed to exchange for long-lived token, using short-lived')
    }

    // Fetch profile
    const profile = await instagramClient.getUserProfile(finalToken)

    // Encrypt token
    const encrypted = encryptSocial(finalToken)

    // Save Connection
    await SocialConnection.findOneAndUpdate(
      { provider: 'instagram' },
      {
        accountId: shortTokenData.user_id || profile.id,
        accountUsername: profile.username,
        accessTokenEnc: encrypted,
        tokenType: 'long_lived',
        tokenExpiresAt: expiresAt,
        lastTokenRefreshAt: new Date(),
        refreshError: undefined,

        status: 'connected',
        isActive: true,
        connectedByUserId: decoded.u,
        lastError: null,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    )

    const returnBase = decoded?.r || process.env.ADMIN_APP_URL || ''
    return res.redirect(`${returnBase}/admin/integrations/social?social_success=instagram`)
  } catch (e: any) {
    console.error('Instagram callback failed:', e?.response?.data || e?.message || e)
    const params = new URLSearchParams(req.query as any)
    const state = params.get('state')
    let returnBase = process.env.ADMIN_APP_URL || ''
    if (state) {
      try {
        const decoded = decodeState(state)
        if (decoded.r) returnBase = decoded.r
      } catch {}
    }
    return res.redirect(`${returnBase}/admin/integrations/social?social_error=callback_failed`)
  }
})

// YouTube OAuth Callback (Public)
router.get('/youtube/callback', async (req: any, res) => {
  try {
    const { code, error, state } = req.query

    let decoded: StatePayload
    try {
      decoded = decodeState(state)
      if (!decoded?.u || typeof decoded.ts !== 'number') throw new Error('bad_state')
      if (isExpired(decoded.ts)) throw new Error('state_expired')
    } catch (e) {
      return res.status(400).send('Invalid state parameter')
    }

    // CSRF Check using HttpOnly cookie
    const oauthCsrf = req.cookies?.oauth_csrf
    if (decoded.n && (!oauthCsrf || oauthCsrf !== decoded.n)) {
      console.warn('OAuth CSRF check failed or missing cookie.')
      return res.redirect(`${process.env.PUBLIC_BASE_URL || ''}/integrations/social?social_error=csrf_failed`)
    }

    if (error) {
      return res.redirect(`${process.env.PUBLIC_BASE_URL || ''}/integrations/social?social_error=${encodeURIComponent(String(error))}`)
    }
    if (!code) return res.status(400).send('Missing code')

    // YouTube env must exist
    const clientId = env.YT_CLIENT_ID
    const clientSecret = env.YT_CLIENT_SECRET
    const redirectUri = env.YT_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      return res.redirect(`${process.env.PUBLIC_BASE_URL || ''}/integrations/social?social_error=missing_youtube_env`)
    }

    // Exchange code for tokens
    const tok = await exchangeYouTubeCode({
      clientId,
      clientSecret,
      redirectUri,
      code: String(code),
    })

    const tokenExpiresAt = new Date(Date.now() + tok.expiresIn * 1000)

    const update: any = {
      provider: 'youtube',
      mode: 'oauth',
      isActive: true,

      // ✅ token storage
      accessTokenEnc: encryptSocial(tok.accessToken),
      tokenExpiresAt,
      tokenType: 'oauth',
      lastTokenRefreshAt: new Date(),

      // ✅ connection state
      status: 'connected',
      connectedByUserId: decoded.u,

      refreshError: undefined,
      lastError: null,
      updatedAt: new Date(),
    }

    if (tok.refreshToken) update.refreshTokenEnc = encryptSocial(tok.refreshToken)

    await SocialConnection.findOneAndUpdate({ provider: 'youtube' }, update, { upsert: true, new: true })

    return res.redirect(`${process.env.PUBLIC_BASE_URL || ''}/integrations/social?social_success=youtube`)
  } catch (e: any) {
    console.error('YouTube Callback Error:', e?.response?.data || e?.message || e)
    return res.redirect(`${process.env.PUBLIC_BASE_URL || ''}/integrations/social?social_error=youtube_callback_failed`)
  }
})

// -------------------------
// PROTECTED ROUTES
// -------------------------
router.use(protect)

// 1) YouTube config (already protected)
router.post('/youtube/config', authorize('owner', 'admin'), async (req, res) => {
  const { mode, apiKey, playlistId, enabled, autoPublish, filterKeyword, maxPerRun, syncIntervalMinutes } = req.body || {}

  if (mode === 'api_key' && !apiKey) {
    return res.status(400).json({ message: 'API Key is required for API Key mode' })
  }
  if (!playlistId) return res.status(400).json({ message: 'Playlist ID is required' })

  const update: any = {
    provider: 'youtube',
    isActive: Boolean(enabled),
    settings: {
      playlistId: String(playlistId),
      filterKeyword: String(filterKeyword || ''),
      maxPerRun: Number(maxPerRun || 10),
      syncIntervalMinutes: Number(syncIntervalMinutes || 30),
      autoPublish: Boolean(autoPublish),
    },
  }

  if (mode) {
    update.mode = mode
    if (mode === 'api_key' && apiKey) update.apiKeyEnc = encryptSocial(String(apiKey))
  } else {
    if (apiKey) {
      update.mode = 'api_key'
      update.apiKeyEnc = encryptSocial(String(apiKey))
    }
  }

  const conn = await SocialConnection.findOneAndUpdate({ provider: 'youtube' }, update, { upsert: true, new: true })
  res.json({ ok: true, provider: conn.provider })
})

// ✅ GET YouTube config (so the UI / requests like GET /youtube/config stop failing)
router.get('/youtube/config', authorize('owner', 'admin'), async (req, res) => {
  const conn = await SocialConnection.findOne({ provider: 'youtube' })

  if (!conn) {
    return res.json({
      ok: true,
      data: {
        provider: 'youtube',
        mode: 'api_key',
        enabled: false,
        playlistId: '',
        hasApiKey: false,
        hasOAuth: false,
        settings: {},
      }
    })
  }

  return res.json({
    ok: true,
    data: {
      provider: conn.provider,
      mode: conn.mode || 'api_key',
      enabled: !!conn.isActive,
      playlistId: String(conn.settings?.playlistId || ''),
      hasApiKey: !!conn.apiKeyEnc,
      hasOAuth: !!conn.accessTokenEnc,
      settings: conn.settings || {},
      lastError: conn.lastError || '',
      lastSyncAt: conn.lastSyncAt || null,
    }
  })
})



// 2) YouTube connect start (PROTECTED, single source of truth)
router.post('/youtube/connect/start', authorize('owner', 'admin'), async (req: any, res) => {
  try {
    const clientId = env.YT_CLIENT_ID
    const redirectUri = env.YT_REDIRECT_URI

    if (!clientId) return res.status(400).json({ message: 'Missing YT_CLIENT_ID' })
    if (!redirectUri) return res.status(400).json({ message: 'Missing YT_REDIRECT_URI' })

    const userId = String(req.user?._id || '')
    if (!userId) return res.status(401).json({ message: 'Not authenticated' })

    const nonce = crypto.randomBytes(16).toString('hex')
    res.cookie('oauth_csrf', nonce, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 10 * 60 * 1000 })

    const state = encodeState({ u: userId, ts: Date.now(), n: nonce })

    const authUrl = getYouTubeAuthUrl(clientId, redirectUri, state)

    if (!authUrl) return res.status(500).json({ message: 'Failed to create YouTube auth URL' })

    return res.json({ success: true, url: authUrl })
  } catch (e: any) {
    console.error('[YT CONNECT START ERROR]', e?.response?.data || e?.message || e)
    return res.status(500).json({ message: 'YouTube connect start failed' })
  }
})

router.post('/youtube/disconnect', authorize('owner', 'admin'), async (_req: any, res) => {
  await SocialConnection.findOneAndUpdate(
    { provider: 'youtube' },
    {
      isActive: false,
      status: 'disconnected',

      apiKeyEnc: null,
      accessTokenEnc: null,
      refreshTokenEnc: null,

      tokenExpiresAt: null,
      tokenType: null,
      lastTokenRefreshAt: null,

      refreshError: null,
      connectedByUserId: null,
      lastError: null,
      settings: {},
      updatedAt: new Date(),
    },
    { upsert: true }
  )
  res.json({ success: true })
})

router.post('/youtube/test', authorize('owner', 'admin'), async (req, res) => {
  const conn = await SocialConnection.findOne({ provider: 'youtube' })
  if (!conn) return res.status(400).json({ message: 'YouTube not configured' })

const rawPlaylist = String(conn.settings?.playlistId || '').trim()

// allow user to paste full URL; extract list= if present
const playlistId = (() => {
  if (!rawPlaylist) return ''
  try {
    if (rawPlaylist.includes('list=')) {
      const u = new URL(rawPlaylist)
      return String(u.searchParams.get('list') || '').trim()
    }
  } catch {}
  return rawPlaylist
})()



  try {
    let vids: any[]
    if (conn.mode === 'oauth' && (conn.accessTokenEnc || conn.refreshTokenEnc)) {
      const token = await socialSyncService.ensureValidYouTubeToken(conn)
      if (!token) return res.status(401).json({ message: 'YouTube token expired and could not be refreshed' })
      vids = await youtubeClient.listPlaylistVideosWithOAuth(token, playlistId, 1)
    } else if (conn.apiKeyEnc) {
      const apiKey = decryptSocial(conn.apiKeyEnc)
      vids = await youtubeClient.listPlaylistVideosWithApiKey(apiKey, playlistId, 1)
    } else {
      return res.status(400).json({ message: 'YouTube not configured (missing key/token)' })
    }

    res.json({ ok: true, sample: vids[0] || null })
  } catch (e: any) {
    console.error('YouTube Test Error:', e?.response?.data || e?.message || e)
    res.status(400).json({ message: 'Test failed: ' + (e?.response?.data?.error?.message || e?.message) })
  }
})

router.post('/youtube/sync', authorize('owner', 'admin'), async (req, res) => {
  const { mode } = req.body || {}
  const result = await socialSyncService.syncProvider('youtube', mode === 'preview' ? 'preview' : 'run')
  res.json(result)
})

router.get('/youtube/status', authorize('owner', 'admin'), async (req, res) => {
  const conn = await SocialConnection.findOne({ provider: 'youtube' })

  if (!conn) {
    return res.json({
      ok: true,
      data: { configured: false, enabled: false, settings: {}, mode: 'api_key', connected: false },
    })
  }

  res.json({
    ok: true,
    data: {
      mode: conn.mode || 'api_key',
      // ✅ FIX: configured should be true for api key OR oauth token
      configured: !!conn.apiKeyEnc || !!conn.accessTokenEnc,
      connected: !!conn.accessTokenEnc,
      channelName: conn.accountName || '',
      enabled: !!conn.isActive,
      lastSyncAt: conn.lastSyncAt || null,
      lastError: conn.lastError || '',
      settings: conn.settings || {},
    },
  })
})

// Instagram logs
router.get('/instagram/logs', authorize('owner', 'admin'), async (req, res) => {
  // Stub for logs
  res.json({ success: true, data: [] })
})

// Instagram connect start (protected)
router.post('/instagram/connect/start', authorize('owner', 'admin'), async (req: any, res) => {
  const missing = getMissingIgEnvVars()
  if (missing.length > 0) {
    return res.status(400).json({ message: `Instagram integration not configured. Missing: ${missing.join(', ')}`, missing })
  }

  const { redirectUrl } = req.body
  
  const nonce = crypto.randomBytes(16).toString('hex')
  res.cookie('oauth_csrf', nonce, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 10 * 60 * 1000 })

  const state = encodeState({ u: String(req.user._id), ts: Date.now(), r: redirectUrl, n: nonce })
  const url = instagramClient.getAuthUrl(env.IG_CLIENT_ID, env.IG_REDIRECT_URI, state)

  res.json({ success: true, url })
})

// 1. GET Status
router.get('/status', authorize('owner', 'admin'), async (req: any, res) => {
  try {
    const provider = (req.query.provider as string) || 'instagram'
    const conn = await SocialConnection.findOne({ provider })
    const settings = await Settings.findOne({})
    const missingEnv = getMissingIgEnvVars()

    let health = 'ok'
    if (missingEnv.length > 0) health = 'error'
    else if (conn) {
      if (conn.status === 'expired') health = 'expired'
      else if (conn.refreshError) health = 'warning'

      if (conn.tokenExpiresAt) {
        const daysLeft = (new Date(conn.tokenExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        if (daysLeft <= 7 && health === 'ok') health = 'warning'
      }
    }

    res.json({
      success: true,
      data: {
        configured: missingEnv.length === 0,
        missingEnv,
        connected: !!conn && conn.status === 'connected',
        accountName: conn?.accountName,
        accountUsername: conn?.accountUsername,
        lastSyncAt: conn?.lastSyncAt,
        lastError: conn?.lastError,
        tokenExpiresAt: conn?.tokenExpiresAt,
        lastTokenRefreshAt: conn?.lastTokenRefreshAt,
        refreshError: conn?.refreshError,
        health,
        settings: settings?.instagram || {
          enabled: false,
          autoImport: true,
          autoPublish: false,
          autoPublishHashtag: '#rationsapproved',
          filterHashtag: '',
          filterKeyword: '',
          maxPerRun: 10,
          syncIntervalMinutes: 30,
        },
      },
    })
  } catch (error) {
    console.error('Social status error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// PATCH Instagram settings
router.patch('/instagram/settings', authorize('owner', 'admin'), async (req: any, res) => {
  try {
    const { enabled, autoImport, autoPublish, autoPublishHashtag, filterHashtag, filterKeyword, maxPerRun, syncIntervalMinutes } = req.body

    const update: any = {}
    if (typeof enabled === 'boolean') update['instagram.enabled'] = enabled
    if (typeof autoImport === 'boolean') update['instagram.autoImport'] = autoImport
    if (typeof autoPublish === 'boolean') update['instagram.autoPublish'] = autoPublish
    if (autoPublishHashtag !== undefined) {
      if (autoPublishHashtag && !autoPublishHashtag.startsWith('#')) {
        return res.status(400).json({ message: 'Hashtag must start with #' })
      }
      update['instagram.autoPublishHashtag'] = autoPublishHashtag
    }
    if (filterHashtag !== undefined) update['instagram.filterHashtag'] = filterHashtag
    if (filterKeyword !== undefined) update['instagram.filterKeyword'] = filterKeyword
    if (maxPerRun) update['instagram.maxPerRun'] = maxPerRun
    if (syncIntervalMinutes) update['instagram.syncIntervalMinutes'] = syncIntervalMinutes

    const settings = await Settings.findOneAndUpdate({}, { $set: update }, { new: true, upsert: true })
    res.json({ success: true, data: settings.instagram })
  } catch (error) {
    console.error('Update social settings error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Instagram disconnect
router.post('/instagram/disconnect', authorize('owner', 'admin'), async (req: any, res) => {
  await SocialConnection.findOneAndDelete({ provider: 'instagram' })
  res.json({ success: true, message: 'Disconnected successfully' })
})

// Disconnect (legacy)
router.post('/disconnect', authorize('owner', 'admin'), async (req: any, res) => {
  const { provider } = req.body
  if (provider !== 'instagram') return res.status(400).json({ message: 'Invalid provider' })
  await SocialConnection.findOneAndDelete({ provider })
  res.json({ success: true, message: 'Disconnected successfully' })
})

// Instagram sync
router.post('/instagram/sync', authorize('owner', 'admin'), async (req: any, res) => {
  const missing = getMissingIgEnvVars()
  if (missing.length > 0) return res.status(400).json({ message: `Instagram integration not configured. Missing: ${missing.join(', ')}`, missing })

  const { mode } = req.body
  if (!['preview', 'import', 'run'].includes(mode)) return res.status(400).json({ message: 'Invalid mode' })

  const conn = await SocialConnection.findOne({ provider: 'instagram', status: 'connected' })
  if (!conn) return res.status(400).json({ message: 'Instagram not connected. Please connect first.' })

  const settings = await Settings.findOne({})
  const options = {
    autoPublish: settings?.instagram?.autoPublish,
    autoPublishHashtag: settings?.instagram?.autoPublishHashtag,
    filterHashtag: settings?.instagram?.filterHashtag || undefined,
    filterKeyword: settings?.instagram?.filterKeyword || undefined,
    maxPerRun: 20,
  }

  const serviceMode = (mode === 'import' || mode === 'run') ? 'run' : 'preview'
  const result = await socialSyncService.syncInstagram(serviceMode, options)

  if (!result.success) return res.status(400).json({ message: result.error || 'Sync failed' })
  res.json(result)
})

// Imports
router.get('/imports', authorize('owner', 'admin', 'manager'), async (req: any, res) => {
  try {
    const { status } = req.query
    const query: any = {}

    if (status === 'pending') query.status = 'pending'
    else if (status) query.status = status
    else query.status = 'pending'

    query['source.provider'] = { $exists: true }

    const posts = await CommunityPost.find(query).sort({ createdAt: -1 })
    res.json({ success: true, data: posts })
  } catch (error) {
    console.error('List imports error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Patch post
router.patch('/posts/:id', authorize('owner', 'admin', 'manager'), async (req: any, res) => {
  try {
    const { status, title, content, tag } = req.body
    const update: any = {}
    if (status) update.status = status
    if (title) update.title = title
    if (content) update.content = content
    if (tag) update.tag = tag

    const post = await CommunityPost.findOneAndUpdate({ _id: req.params.id }, update, { new: true })
    if (!post) return res.status(404).json({ message: 'Post not found' })
    res.json({ success: true, data: post })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete post
router.delete('/posts/:id', authorize('owner', 'admin', 'manager'), async (req: any, res) => {
  try {
    const post = await CommunityPost.findOneAndDelete({ _id: req.params.id })
    if (!post) return res.status(404).json({ message: 'Post not found' })
    res.json({ success: true, message: 'Post deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Logs
router.get('/:provider/logs', authorize('owner', 'admin'), async (req: any, res) => {
  try {
    const provider = req.params.provider
    if (!['instagram'].includes(provider)) return res.status(400).json({ message: 'Invalid provider' })

    const IntegrationLog = (await import('../models/IntegrationLog')).default
    const limit = Math.min(Number(req.query.limit || 50), 200)

    const logs = await IntegrationLog.find({ provider }).sort({ createdAt: -1 }).limit(limit)
    res.json({ success: true, data: logs })
  } catch (error) {
    console.error('Fetch logs error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
