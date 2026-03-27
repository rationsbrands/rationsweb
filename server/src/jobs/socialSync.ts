import cron from 'node-cron'
import SocialConnection from '../models/SocialConnection'
import Settings from '../models/Settings'
import { socialSyncService } from '../services/socialSyncService'

export const startSocialSyncJob = () => {
  // Run every minute to check per-tenant schedules
  cron.schedule('* * * * *', async () => {
    // Fail-safe: Check env var
    if (process.env.SOCIAL_SYNC_ENABLED !== 'true') {
      return
    }
    
    try {
      // Find all connected Instagram accounts
      const connections = await SocialConnection.find({ 
        provider: 'instagram', 
        status: 'connected' 
      })

      for (const conn of connections) {
        try {
          // 1. Check Settings
          const settings = await Settings.findOne()
          
          // Must be enabled and auto-import turned on
          if (!settings?.instagram?.enabled || !settings?.instagram?.autoImport) {
            continue
          }

          // 2. Check Interval
          const lastSync = conn.lastSyncAt ? new Date(conn.lastSyncAt).getTime() : 0
          const intervalMinutes = settings.instagram.syncIntervalMinutes || 30
          const now = Date.now()
          
          // If synced recently, skip
          if (now < lastSync + (intervalMinutes * 60 * 1000)) {
            continue
          }

          // Acquire lock to avoid concurrent runs in multiple regions
          const lockMs = 10 * 60 * 1000
          const claimed = await SocialConnection.findOneAndUpdate(
            { _id: conn._id, $or: [{ syncLockUntil: { $lt: new Date() } }, { syncLockUntil: { $exists: false } }] },
            { $set: { syncLockUntil: new Date(Date.now() + lockMs) } },
            { new: true }
          )
          if (!claimed) {
            continue
          }

          console.log(`[SocialSync] Syncing...`)
          
          // 3. Run Sync with Options
          const result = await socialSyncService.syncInstagram(
            'run', 
            {
              autoPublish: settings.instagram.autoPublish,
              autoPublishHashtag: settings.instagram.autoPublishHashtag,
              filterHashtag: settings.instagram.filterHashtag || undefined,
              filterKeyword: settings.instagram.filterKeyword || undefined,
              maxPerRun: settings.instagram.maxPerRun
            }
          )
          
          console.log(`[SocialSync] Result: Imported ${result.imported}, Failed ${result.failed}`)
          await SocialConnection.updateOne({ _id: conn._id }, { $set: { lastSyncAt: new Date(), syncLockUntil: new Date() } })
          
        } catch (err: any) {
          console.error(`[SocialSync] Failed to sync Instagram:`, err.message)
          await SocialConnection.updateOne({ _id: conn._id }, { $set: { syncLockUntil: new Date() } })
        }
      }

      // --- YouTube Synchronization ---
      const ytConnections = await SocialConnection.find({ 
        provider: 'youtube', 
        isActive: true 
      })

      for (const yt of ytConnections) {
        try {
          const ytSettings = yt.settings || {}
          
          const ytLastSync = yt.lastSyncAt ? new Date(yt.lastSyncAt).getTime() : 0
          const ytIntervalMinutes = ytSettings.syncIntervalMinutes || 30
          const nowTs = Date.now()
          
          if (nowTs < ytLastSync + (ytIntervalMinutes * 60 * 1000)) continue

          const lockMs = 10 * 60 * 1000
          const ytClaimed = await SocialConnection.findOneAndUpdate(
            { _id: yt._id, $or: [{ syncLockUntil: { $lt: new Date() } }, { syncLockUntil: { $exists: false } }] },
            { $set: { syncLockUntil: new Date(Date.now() + lockMs) } },
            { new: true }
          )
          if (!ytClaimed) continue

          console.log(`[SocialSync] Syncing YouTube...`)
          const ytResult = await socialSyncService.syncYouTube('run')
          console.log(`[SocialSync] YouTube Result: Imported ${ytResult.imported}, Failed ${ytResult.failed}`)
          
          await SocialConnection.updateOne({ _id: yt._id }, { $set: { syncLockUntil: new Date() } })
        } catch (err: any) {
          console.error(`[SocialSync] Failed to sync YouTube:`, err.message)
          await SocialConnection.updateOne({ _id: yt._id }, { $set: { syncLockUntil: new Date() } })
        }
      }

    } catch (error) {
      console.error('[SocialSync] Job failed:', error)
    }
  })

  console.log('[SocialSync] Job scheduled: "* * * * *" (Checks every minute)')
}
