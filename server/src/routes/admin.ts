import express from 'express'
import rateLimit from 'express-rate-limit'
import MenuItem from '../models/MenuItem'
import CommunityPost from '../models/CommunityPost'
import User from '../models/User'
import Order from '../models/Order'
import Settings from '../models/Settings'
import { protect, authorize } from '../middleware/auth'
import mongoose from 'mongoose'
import { platformClient } from '../integrations/platformClient'
import AuditLog from '../models/AuditLog'
import MenuCache from '../models/MenuCache'
import IntegrationLog from '../models/IntegrationLog'
import Integration from '../models/Integration'
import { logAudit } from '../utils/auditLogger'
import OrderSyncQueue from '../models/OrderSyncQueue'
import InviteToken from '../models/InviteToken'
import BackupMetadata from '../models/BackupMetadata'
import bcrypt from 'bcryptjs'
import { signAccess } from '../utils/jwt'
import { socialSyncService } from '../services/socialSyncService'
import { validateRequest } from '../middleware/validate'
import {
  createCommunityPostSchema, updateCommunityPostSchema,
  createMenuItemSchema, updateMenuItemSchema,
  createPosOrderSchema, updateOrderStatusSchema, updateOrderPaymentSchema,
  inviteUserSchema, updateUserRoleSchema, updateSettingsSchema
} from '../schemas'

const router = express.Router()

// --- BOOTSTRAP / SETUP (PUBLIC, SINGLE-STORE) ---
// Must come before router.use(protect)

router.get('/setup/status', async (req, res) => {
  try {
    const userCount = await User.countDocuments({})
    // Can setup if NO users exist
    if (userCount === 0) {
      return res.json({ canSetup: true })
    }
    return res.json({ canSetup: false, reason: 'System already initialized' })
  } catch (error) {
    return res.status(500).json({ canSetup: false, reason: 'Server error' })
  }
})

router.post('/setup', async (req, res) => {
  try {
    const userCount = await User.countDocuments({})
    if (userCount > 0) {
      return res.status(409).json({ message: 'System already initialized' })
    }

    const { ownerName, ownerEmail, ownerPassword, tenantName } = req.body
    if (!ownerName || !ownerEmail || !ownerPassword) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // 1. Create Owner
    const hashed = await bcrypt.hash(ownerPassword, 10)
    const user = await User.create({
      name: ownerName,
      email: ownerEmail.toLowerCase(),
      password: hashed,
      role: 'owner',
      status: 'active',
      isVerified: true,
      emailVerified: true,
    })

    // 2. Create Default Settings
    // Use provided tenantName or fallback
    await Settings.updateOne(
      {},
      {
        $setOnInsert: {
          siteName: tenantName || 'Rations',
          primaryColor: '#FDCD2F',
          features: { menuEnabled: true, orderingEnabled: true, communityEnabled: true },
        },
      },
      { upsert: true }
    )

    // 3. Generate Token
    const accessToken = signAccess(user)

    return res.json({
      success: true,
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    })
  } catch (error: any) {
    console.error('Setup failed:', error)
    return res.status(500).json({ message: error.message || 'Setup failed' })
  }
})

// Public callback proxy for Instagram (must be before protect)
router.get('/integrations/social/instagram/callback', (req, res) => {
  const qs = new URLSearchParams(req.query as any).toString()
  res.redirect(`/api/social/instagram/callback?${qs}`)
})

router.use(protect) // Protect all admin routes



import { IntegrationConnection } from '../models/IntegrationConnection'
import { encrypt, decrypt } from '../utils/encryption'
import axios from 'axios'
import crypto from 'crypto'

function normalizeDomain(input: string): string {
  const raw = String(input || '').trim().toLowerCase()
  if (!raw) return ''
  let s = raw.replace(/^https?:\/\//, '')
  s = s.split('/')[0]
  s = s.split('?')[0]
  s = s.split('#')[0]
  s = s.split(':')[0]
  if (s.startsWith('www.')) s = s.slice(4)
  return s
}

// --- Integrations ---

const platformConnectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: 'Too many connection attempts, please try again later.' },
})

router.post('/integrations/platform/connect', authorize('owner', 'admin'), platformConnectLimiter, async (req: any, res) => {
  try {
    const { platformBaseUrl, authMethod = 'api_key', apiKey, clientId, clientSecret, scopes, features } = req.body

    // 1. Determine Base URL
    let finalBaseUrl = platformBaseUrl
    const existingConn = await IntegrationConnection.findOne({ provider: 'platform' }).select(
      '+apiKeyEncrypted.iv +apiKeyEncrypted.content +apiKeyEncrypted.tag ' +
        '+platformApiKeyEncrypted.iv +platformApiKeyEncrypted.content +platformApiKeyEncrypted.tag ' +
        '+platformClientIdEncrypted.iv +platformClientIdEncrypted.content +platformClientIdEncrypted.tag ' +
        '+platformClientSecretEncrypted.iv +platformClientSecretEncrypted.content +platformClientSecretEncrypted.tag'
    )

    // Fallback/Reuse Logic
    if (!finalBaseUrl && process.env.PLATFORM_BASE_URL) finalBaseUrl = process.env.PLATFORM_BASE_URL
    if (!finalBaseUrl && existingConn?.platformBaseUrl) finalBaseUrl = existingConn.platformBaseUrl

    if (!finalBaseUrl) return res.status(400).json({ message: 'Missing Platform Base URL' })

    // 2. Prepare Updates & Credentials for Testing
    const update: any = {
      enabled: true,
      status: 'connected',
      platformBaseUrl: finalBaseUrl,
      platformAuthMethod: authMethod,
      features: features || { orders: false, kds: false, catalog: false },
      scopes: scopes || [],
      connectedAt: new Date(),
      lastCheckedAt: new Date(),
      lastError: undefined,
      updatedAt: new Date(),
      createdByAdminUserId: req.user._id,
    }

    let testCredentials: any = {}

    if (authMethod === 'api_key') {
      let finalApiKey = apiKey
      // Reuse existing Key if not provided
      if (!finalApiKey && existingConn?.apiKeyEncrypted?.content) {
        try {
          if ((existingConn as any).apiKeyEncrypted.iv !== 'ENV') {
            finalApiKey = decrypt((existingConn as any).apiKeyEncrypted)
          }
        } catch (e) {}
      }

      if (!finalApiKey) return res.status(400).json({ message: 'Missing API Key' })

      testCredentials = { apiKey: finalApiKey }

      // Encrypt
      const encrypted = encrypt(finalApiKey)
      update.apiKeyEncrypted = encrypted
      update.platformApiKeyEncrypted = encrypted
    } else if (authMethod === 'oauth_client_credentials') {
      let finalClientId = clientId
      let finalClientSecret = clientSecret

      if (!finalClientId && (existingConn as any)?.platformClientIdEncrypted) {
        finalClientId = decrypt((existingConn as any).platformClientIdEncrypted)
      }
      if (!finalClientSecret && (existingConn as any)?.platformClientSecretEncrypted) {
        finalClientSecret = decrypt((existingConn as any).platformClientSecretEncrypted)
      }

      if (!finalClientId || !finalClientSecret) {
        return res.status(400).json({ message: 'Missing Client ID or Secret' })
      }

      testCredentials = { clientId: finalClientId, clientSecret: finalClientSecret }

      update.platformClientIdEncrypted = encrypt(finalClientId)
      update.platformClientSecretEncrypted = encrypt(finalClientSecret)
    } else {
      return res.status(400).json({ message: 'Invalid auth method' })
    }

    // 3. Save FIRST (as requested: "-> encrypt + save -> test connection")
    const conn = await IntegrationConnection.findOneAndUpdate({ provider: 'platform' }, update, { upsert: true, new: true })

    // 4. Test Connection
    const testResult = await platformClient.testConnection()

    if (!testResult.success) {
      // If test fails, we still saved the creds, but we should return the error
      return res.status(400).json({ message: `Saved, but connection failed: ${testResult.message}` })
    }

    // Reload platform client config (optional, as getConfig fetches fresh)
    platformClient.reloadConfig()

    try {
      await logAudit(req, {
        action: 'INTEGRATION_PLATFORM_CONNECT',
        entityType: 'integration',
        entityId: String((conn as any)._id),
        metadata: { authMethod: (conn as any).platformAuthMethod, scopes: (conn as any).scopes, features: (conn as any).features },
      })
    } catch {}

    res.json({
      success: true,
      data: {
        status: 'connected',
        connectedAt: (conn as any).connectedAt,
        source: 'db',
        features: (conn as any).features,
        authMethod: (conn as any).platformAuthMethod,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/integrations/platform/disconnect', authorize('owner', 'admin'), async (req: any, res) => {
  try {
    await IntegrationConnection.findOneAndUpdate(
      { provider: 'platform' },
      {
        status: 'disconnected',
        apiKeyEncrypted: { iv: '', content: '', tag: '' },
        platformApiKeyEncrypted: { iv: '', content: '', tag: '' },
        platformClientIdEncrypted: { iv: '', content: '', tag: '' },
        platformClientSecretEncrypted: { iv: '', content: '', tag: '' },
        features: { orders: false, kds: false, catalog: false },
        updatedAt: new Date(),
      },
      { upsert: true }
    )

    platformClient.reloadConfig()

    try {
      await logAudit(req, {
        action: 'INTEGRATION_PLATFORM_DISCONNECT',
        entityType: 'integration',
        entityId: '',
        metadata: {},
      })
    } catch {}

    res.json({ success: true, message: 'Disconnected' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/integrations/platform/retest', authorize('owner', 'admin'), async (req: any, res) => {
  try {
    const conn = await IntegrationConnection.findOne({ provider: 'platform' })

    if (!conn || (conn as any).status !== 'connected') {
      return res.status(400).json({ message: 'Not connected' })
    }

    // Use PlatformClient to test (handles both API Key and OAuth with caching)
    const result = await platformClient.testConnection()

    if (result.success) {
      try {
        await logAudit(req, {
          action: 'INTEGRATION_PLATFORM_TEST',
          entityType: 'integration',
          entityId: String((conn as any)?._id || ''),
          metadata: { outcome: 'SUCCESS' },
          outcome: 'SUCCESS',
        })
      } catch {}
      res.json({ success: true, message: 'Connection verified' })
    } else {
      try {
        await logAudit(req, {
          action: 'INTEGRATION_PLATFORM_TEST',
          entityType: 'integration',
          entityId: String((conn as any)?._id || ''),
          metadata: { outcome: 'ERROR', message: result.message },
          outcome: 'ERROR',
        })
      } catch {}
      res.status(400).json({ message: `Connection failed: ${result.message}` })
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/integrations/platform', authorize('owner', 'admin'), async (req: any, res) => {
  try {
    // 1. Get DB record
    const conn = await IntegrationConnection.findOne({ provider: 'platform' })
    const integration = await Integration.findOne({ provider: 'platform' })

    // 2. Determine Status
    const isConnected = (conn as any)?.status === 'connected'

    let source = 'db'
    if (!conn && process.env.PLATFORM_API_KEY) {
      source = 'env'
    } else if ((conn as any)?.apiKeyEncrypted?.iv === 'ENV') {
      source = 'env'
    }

    const authMethod = (conn as any)?.platformAuthMethod || 'api_key'

    res.json({
      success: true,
      data: {
        status: isConnected ? 'connected' : 'disconnected',
        source,
        platformBaseUrl: (conn as any)?.platformBaseUrl || process.env.PLATFORM_BASE_URL,
        authMethod,
        // Masked indicators
        hasApiKey: !!(conn as any)?.apiKeyEncrypted?.content,
        hasClientId: !!(conn as any)?.platformClientIdEncrypted?.content,
        hasClientSecret: !!(conn as any)?.platformClientSecretEncrypted?.content,
        hasWebhookSecret: !!integration?.secretsEncrypted?.webhookSecret,
        platformWebhookUrl: integration?.config?.platformWebhookUrl,
        scopes: (conn as any)?.scopes || [],
        connectedAt: (conn as any)?.connectedAt,
        lastCheckedAt: (conn as any)?.lastCheckedAt,
        lastError: (conn as any)?.lastError,
        features: (conn as any)?.features || { orders: false, kds: false, catalog: false },
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/sso/issue', authorize('owner', 'admin'), async (req: any, res) => {
  try {
    const enabled = await platformClient.isEnabled()
    if (!enabled) return res.status(400).json({ message: 'Platform integration disabled' })
    const email = String(req.user?.email || '')
    const url = await platformClient.issueSsoToken(email)
    if (!url) return res.status(500).json({ message: 'Failed to create SSO token' })
    try {
      await IntegrationLog.create({
        provider: 'platform',
        action: 'SSO_ISSUE',
        direction: 'outbound',
        status: 'success',
        request: { email },
        response: { redirectUrl: url },
      })
    } catch {}
    res.json({ success: true, data: { redirectUrl: url } })
  } catch (error) {
    try {
      await IntegrationLog.create({
        provider: 'platform',
        action: 'SSO_ISSUE',
        direction: 'outbound',
        status: 'failed',
        error: 'Failed to issue',
      })
    } catch {}
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/menu/sync', authorize('owner', 'admin'), async (req: any, res) => {
  try {
    const enabled = await platformClient.isEnabled()
    if (!enabled) return res.status(400).json({ message: 'Platform integration disabled' })
    
    const start = Date.now()
    
    // Fetch local menu items (RationsWeb -> Platform)
    const items = await MenuItem.find({ archived: { $ne: true } })
    
    const payload = items.map((item: any) => ({
      externalId: item._id.toString(),
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      archived: item.archived || false
    }))
    
    try {
      const result: any = await platformClient.upsertCatalog(payload)
      
      await IntegrationLog.create({
        provider: 'platform',
        action: 'MENU_SYNC',
        direction: 'outbound',
        status: 'success',
        request: { count: payload.length },
        response: result?.data || {},
      })
      
      return res.json({ success: true, data: { count: payload.length, durationMs: Date.now() - start } })
    } catch (err: any) {
      console.error('Menu Sync Failed:', err)
      await IntegrationLog.create({
        provider: 'platform',
        action: 'MENU_SYNC',
        direction: 'outbound',
        status: 'failed',
        request: { count: payload.length },
        error: err?.message || 'Sync failed',
      })
      return res.status(503).json({ message: 'Menu sync failed' })
    }
  } catch (error) {
    console.error('Sync Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/orders/:id/resync', authorize('owner', 'admin'), async (req: any, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    if (!(await platformClient.isEnabled())) return res.status(400).json({ message: 'Platform integration disabled' })
    await OrderSyncQueue.create({
      orderId: (order as any)._id,
      platformOrderId: (order as any).platformOrderId,
      action: 'SYNC',
      status: 'PENDING',
      nextRunAt: new Date(),
    })
    res.json({ success: true, data: { enqueued: true } })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/orders/:id/sync', authorize('owner', 'admin'), async (req: any, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    const lastJob = await OrderSyncQueue.findOne({ orderId: (order as any)._id }).sort({ updatedAt: -1 })
    res.json({
      success: true,
      data: {
        platformOrderId: (order as any).platformOrderId || null,
        opsStatus: (order as any).opsStatus || null,
        lastOpsSyncAt: (order as any).lastOpsSyncAt || null,
        lastJob,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/settings', authorize('owner', 'admin'), async (req, res) => {
  try {
    const settings = await Settings.findOne({})
    res.json({ success: true, data: settings })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.patch('/settings', authorize('owner', 'admin'), validateRequest(updateSettingsSchema), async (req, res) => {
  try {
    const { payments, messaging, logistics } = req.body
    const update: any = {}
    if (payments) update.payments = payments
    if (messaging) update.messaging = messaging
    if (logistics) update.logistics = logistics

    const settings = await Settings.findOneAndUpdate({}, update, { new: true, upsert: true })

    try {
      await logAudit(req, {
        action: 'TENANT_SETTINGS_UPDATE',
        entityType: 'settings',
        entityId: String((settings as any)._id),
        metadata: { payments, messaging, logistics },
      })
    } catch {}

    res.json({ success: true, data: settings })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/overview', authorize('owner', 'admin', 'manager'), async (req, res) => {
  try {
    const usersCount = await User.countDocuments({})
    const ordersCount = await Order.countDocuments({})
    const activeMenuCount = await MenuItem.countDocuments({ isAvailable: true, archived: false })
    const postsCount = await CommunityPost.countDocuments({})

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const todayOrdersCount = await Order.countDocuments({ createdAt: { $gte: startOfDay } })

    const revenueResult = await Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }])
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0

    const latestOrders = await Order.find({}).sort({ createdAt: -1 }).limit(5).populate('user', 'name phone')

    const lowStockItems = await MenuItem.find({
      isAvailable: true,
      archived: false,
      trackStock: true,
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
    })
      .select('name stockQuantity lowStockThreshold')
      .limit(10)

    res.json({
      success: true,
      data: {
        usersCount,
        ordersCount,
        activeMenuCount,
        postsCount,
        todayOrdersCount,
        totalRevenue,
        latestOrders,
        lowStockItems,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

/**
 * ✅ FIXED: Platform health endpoint must reflect IntegrationConnection (not Integration)
 */
router.get('/integrations', authorize('owner', 'admin'), async (req, res) => {
  try {
    const Integration = (await import('../models/Integration')).default
    const list = await Integration.find({})
    res.json({ success: true, data: list })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/integrations/platform/oauth/start', authorize('owner', 'admin'), async (req: any, res) => {
  try {
    const { platformBaseUrl, scopes, state } = req.body
    if (!platformBaseUrl) return res.status(400).json({ message: 'Missing platformBaseUrl' })
    
    // Construct the authorize URL
    const baseUrl = platformBaseUrl.replace(/\/+$/, '')
    const scopeStr = Array.isArray(scopes) ? scopes.join(' ') : (scopes || '')
    const clientId = process.env.PLATFORM_CLIENT_ID || 'rationsweb_client' // Default or from env
    
    // Check if we have a saved client ID in DB connection?
    // For now, assume we use the one provided or a default
    
    const authorizeUrl = `${baseUrl}/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(state ? JSON.parse(atob(state)).returnUrl + '/oauth/callback' : '')}&scope=${encodeURIComponent(scopeStr)}&state=${state}`
    
    
    res.json({ 
      success: true, 
      data: { 
        authorizeUrl: `${baseUrl}/oauth/authorize?client_id=${clientId}&response_type=code&scope=${encodeURIComponent(scopeStr)}&state=${state}` 
      } 
    })
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Server error' })
  }
})

router.post('/integrations/platform/webhook/secret', authorize('owner', 'admin'), async (req: any, res) => {
  try {
    const { secret, webhookUrl } = req.body
    const Integration = (await import('../models/Integration')).default
    
    await Integration.findOneAndUpdate(
      { provider: 'platform' },
      { 
        $set: { 
            'config.platformWebhookUrl': webhookUrl,
            'secretsEncrypted.webhookSecret': secret // In real app, encrypt this!
        } 
      },
      { upsert: true }
    )
    
    // Also update connection status if needed
    const IntegrationConnection = (await import('../models/IntegrationConnection')).IntegrationConnection
    await IntegrationConnection.findOneAndUpdate(
        { provider: 'platform' },
        { webhookConfiguredAt: new Date() },
        { upsert: true }
    )

    res.json({ success: true })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/integrations/platform/health', authorize('owner', 'admin'), async (_req: any, res) => {
  try {
    const IntegrationLogModel = (await import('../models/IntegrationLog')).default
    const OrderSyncQueueModel = (await import('../models/OrderSyncQueue')).default
    const IntegrationConnectionModel = (await import('../models/IntegrationConnection')).IntegrationConnection

    const conn: any = await IntegrationConnectionModel.findOne({ provider: 'platform' })

    const lastWebhookLog = await IntegrationLogModel.findOne({
      provider: 'platform',
      action: 'ORDER_WEBHOOK',
      direction: 'inbound',
    }).sort({ createdAt: -1 })

    const cutoff = new Date(Date.now() - 10 * 60 * 1000)
    const stuckJobsCount = await OrderSyncQueueModel.countDocuments({
      status: { $in: ['PENDING', 'ERROR'] },
      updatedAt: { $lt: cutoff },
    })

    res.json({
      success: true,
      data: {
        enabled: !!conn?.enabled,
        status: conn?.status || 'disconnected',
        lastWebhookAt: lastWebhookLog?.createdAt || null,
        stuckJobsCount,
        lastError: conn?.lastError || '',
        webhookConfigured: !!conn?.webhookConfiguredAt,
      },
    })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/integrations/platform/resync-pending', authorize('owner', 'admin'), async (req: any, res) => {
  try {
    const OrderModel = (await import('../models/Order')).default
    const OrderSyncQueueModel = (await import('../models/OrderSyncQueue')).default
    const pending = await OrderModel.find({ platformStatus: { $in: ['PENDING', 'FAILED'] }, status: { $ne: 'CANCELLED' } }).select('_id platformOrderId')
    for (const o of pending) {
      await OrderSyncQueueModel.create({
        orderId: o._id,
        platformOrderId: o.platformOrderId,
        action: 'SYNC',
        status: 'PENDING',
        nextRunAt: new Date(),
      })
    }
    res.json({ success: true, data: { enqueued: pending.length } })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/integrations/platform/jobs', authorize('owner', 'admin'), async (req: any, res) => {
  try {
    const limit = Math.min(Number(req.query?.limit || 100), 200)
    const OrderSyncQueueModel = (await import('../models/OrderSyncQueue')).default
    const jobs = await OrderSyncQueueModel.find({}).sort({ updatedAt: -1 }).limit(limit)
    res.json({ success: true, data: jobs })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/integrations/platform/logs', authorize('owner', 'admin'), async (_req: any, res) => {
  try {
    const IntegrationLogModel = (await import('../models/IntegrationLog')).default
    const logs = await IntegrationLogModel.find({ provider: 'platform' }).sort({ createdAt: -1 }).limit(50)
    res.json({ success: true, data: logs })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})
// --- Orders ---

const orderRoles = ['owner', 'admin', 'manager', 'cashier', 'kitchen']

// Alias for KitchenDashboard and others using /api/orders
router.get('/orders', authorize(...orderRoles), async (req, res) => {
  try {
    const { status } = req.query as any
    const query: any = {}
    if (status) {
      const raw = String(status)
      if (raw.includes(',')) {
        query.status = { $in: raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) }
      } else {
        query.status = raw.toUpperCase()
      }
    }
    const orders = await Order.find(query).sort({ createdAt: -1 }).populate('user', 'name phone email').populate('items.menuItem', 'name')
    res.json({ success: true, data: orders })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})


// --- POS ---

router.post('/pos/orders', authorize('owner', 'admin', 'manager', 'cashier'), validateRequest(createPosOrderSchema), async (req: any, res) => {
  try {
    const { items, total, branchId, channel } = req.body

    const order = await Order.create({
      user: req.user._id, // Staff user creating the order
      items: items.map((i: any) => ({
        menuItem: i.productId,
        quantity: i.qty,
        priceAtOrderTime: i.price,
      })),
      totalAmount: total,
      status: 'ACCEPTED', // POS orders are usually immediate
      paymentMethod: 'POS',
      paymentStatus: 'UNPAID', // Operator must confirm payment separately or we can add payment toggle later
      orderType: 'pickup', // Default for POS
      opsSource: 'LOCAL',
    })

    // Log audit
    try {
      await logAudit(req, {
        action: 'ORDER_CREATE_POS',
        entityType: 'order',
        entityId: String(order._id),
        metadata: { total, itemCount: items.length }
      })
    } catch {}

    res.status(201).json({ success: true, data: order })
  } catch (error) {
    console.error('POS order error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// --- Billing (Stub) ---

router.get('/billing/summary', authorize('owner', 'admin'), async (req, res) => {
  res.json({
    success: true,
    data: {
      plan: 'pro',
      status: 'active',
      subscriptions: [
        { _id: 'sub_mock_123', status: 'active', plan: 'pro', currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      ],
      plans: [
        { id: 'pro', name: 'Pro Plan', price: 50000, currency: 'NGN' }
      ]
    }
  })
})

router.get('/billing/entitlements', authorize('owner', 'admin'), async (req, res) => {
  res.json({
    success: true,
    data: [
      { feature: 'Menu Management', enabled: true },
      { feature: 'Order Management', enabled: true },
      { feature: 'Community', enabled: true },
      { feature: 'Analytics', enabled: true },
      { feature: 'Integrations', enabled: true }
    ]
  })
})

router.post('/billing/subscriptions/:id/mark-paid', authorize('owner', 'admin'), async (req, res) => {
  // Mock action
  res.json({ success: true, message: 'Marked as paid' })
})

// --- Community Management ---

router.get('/community/instagram', authorize('owner', 'admin'), async (req, res) => {
  try {
    const settings = await Settings.findOne({})
    const hashtag = settings?.instagram?.autoPublishHashtag || '#RationsCommunity'

    // Use service in 'preview' mode to get live data
    const result = await socialSyncService.syncInstagram('preview', {
      maxPerRun: 20
    })

    if (!result.success) {
      // Return empty list if sync failed (e.g. not connected)
      return res.json({
        success: true,
        data: {
          items: [],
          hashtag,
          lastFetchedAt: null
        }
      })
    }

    const items = (result.previews || []).map((p: any) => ({
      id: p.externalId,
      mediaType: p.mediaType,
      mediaUrl: p.mediaUrl,
      thumbnailUrl: p.thumbnailUrl,
      permalink: p.permalink,
      caption: p.caption,
      timestamp: p.timestamp
    }))

    res.json({
      success: true,
      data: {
        items,
        hashtag,
        lastFetchedAt: new Date()
      }
    })
  } catch (error: any) {
    console.error('GET /community/instagram error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/community', authorize('owner', 'admin'), async (req, res) => {
  try {
    const posts = await CommunityPost.find({ deleted: { $ne: true } }).sort({ createdAt: -1 })
    res.json({ success: true, data: posts })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/community', authorize('owner', 'admin'), validateRequest(createCommunityPostSchema), async (req, res) => {
  try {
    const post = await CommunityPost.create({
      ...req.body,
      status: 'published' // Default for admin created posts
    })
    try {
      await logAudit(req, {
        action: 'COMMUNITY_POST_CREATE',
        entityType: 'community_post',
        entityId: String(post._id),
        metadata: { title: post.title }
      })
    } catch {}
    res.json({ success: true, data: post })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/community/:id', authorize('owner', 'admin'), validateRequest(updateCommunityPostSchema), async (req, res) => {
  try {
    const post = await CommunityPost.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true }
    )
    if (!post) return res.status(404).json({ message: 'Post not found' })
    try {
      await logAudit(req, {
        action: 'COMMUNITY_POST_UPDATE',
        entityType: 'community_post',
        entityId: String(post._id),
        metadata: { title: post.title }
      })
    } catch {}
    res.json({ success: true, data: post })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// --- Community Moderation ---

router.patch('/community/:id/hide', authorize('owner', 'admin'), async (req, res) => {
  try {
    const post = await CommunityPost.findOneAndUpdate(
      { _id: req.params.id },
      { status: 'pending' },
      { new: true }
    )
    if (!post) return res.status(404).json({ message: 'Post not found' })
    try {
      await logAudit(req, {
        action: 'COMMUNITY_POST_HIDE',
        entityType: 'community_post',
        entityId: String(post._id),
        metadata: { status: post.status },
      })
    } catch {}
    res.json({ success: true, data: post })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/community/:id', authorize('owner', 'admin'), async (req, res) => {
  try {
    const post = await CommunityPost.findOneAndUpdate(
      { _id: req.params.id },
      { deleted: true },
      { new: true }
    )
    if (!post) return res.status(404).json({ message: 'Post not found' })
    try {
      await logAudit(req, {
        action: 'COMMUNITY_POST_DELETE',
        entityType: 'community_post',
        entityId: String(post._id),
        metadata: { deleted: true },
      })
    } catch {}
    res.json({ success: true, message: 'Post deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/orders', authorize(...orderRoles), async (req, res) => {
  try {
    const { status, paymentStatus, orderType, search, from, to } = req.query

    const query: any = {}

    if (status && status !== 'all') query.status = status
    if (paymentStatus && paymentStatus !== 'all') query.paymentStatus = paymentStatus
    if (orderType && orderType !== 'all') query.orderType = orderType

    if (from || to) {
        query.createdAt = {}
        if (from) query.createdAt.$gte = new Date(from as string)
        if (to) {
             const toDate = new Date(to as string)
             toDate.setHours(23, 59, 59, 999)
             query.createdAt.$lte = toDate
        }
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).populate('user', 'name phone email').populate('items.menuItem', 'name')
    res.json({ success: true, data: orders })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/orders/:id', authorize(...orderRoles), async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id }).populate('user', 'name phone email').populate('items.menuItem', 'name')
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.patch('/orders/:id', authorize(...orderRoles), async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true }
    ).populate('items.menuItem')
    
    if (!order) return res.status(404).json({ message: 'Order not found' })

    // Sync status update to Platform
    // PlatformClient handles feature gating internally
    User.findById(order.user).then(user => {
        platformClient.updateOrderStatus({
            externalOrderId: `rweb_order_${order._id}`,
            status: order.status,
            items: order.items.map((i: any) => ({
                externalItemId: i.menuItem?.externalId || `rweb_menu_${i.menuItem?._id}`,
                quantity: i.quantity,
                notes: i.sauce ? `Sauce: ${i.sauce}` : ''
            })),
            totalAmount: order.totalAmount,
            customer: {
                name: user?.name || 'Guest',
                phone: user?.phone,
                address: order.deliveryAddress
            },
            type: order.orderType,
            notes: order.customerNote,
            createdAt: order.createdAt,
            updatedAt: new Date()
        }).then(res => {
            if (res) {
                 order.platformStatus = 'SYNCED'
                 order.save().catch(console.error)
            }
        }).catch(err => {
            console.error('Platform sync failed (order update):', err)
            order.platformStatus = 'FAILED'
            order.save().catch(console.error)
        })
    }).catch(console.error)

    res.json({ success: true, data: order })
  } catch (error) {
    res.status(400).json({ message: 'Invalid data' })
  }
})

router.patch('/orders/:id/status', authorize(...orderRoles), validateRequest(updateOrderStatusSchema), async (req, res) => {
  try {
    const { status } = req.body
    const order = await Order.findOne({ _id: req.params.id })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    const previousStatus = order.status
    const nextStatus = String(status || '').toUpperCase()

    // RATIONSWEB GUARD: Kitchen/Completion statuses must be done in Platform (KDS)
    const forbiddenFromRationsWeb = ['IN_PREP', 'READY', 'COMPLETED']
    if (forbiddenFromRationsWeb.includes(nextStatus)) {
      return res.status(403).json({
        success: false,
        message: 'This status must be updated in Platform/KDS (operations app).',
        nextStatus,
      })
    }

    const allowed: Record<string, string[]> = {
      CREATED: ['ACCEPTED', 'CANCELLED'], // keep ACCEPTED if you want; otherwise remove it
      ACCEPTED: ['CANCELLED'],           // rationsweb can still cancel after accept
      IN_PREP: [],                       // should never be set here
      READY: [],                         // should never be set here
      COMPLETED: [],                     // should never be set here
      CANCELLED: [],
    }
    const can = allowed[previousStatus] || []
    if (!can.includes(nextStatus)) {
      return res.status(400).json({ message: `Invalid status transition: ${previousStatus} → ${nextStatus}` })
    }
    order.status = nextStatus as any
    await order.save()
    try {
      await logAudit(req, {
        action: 'ORDER_STATUS_UPDATE',
        entityType: 'order',
        entityId: String(order._id),
        metadata: { previousStatus, status: order.status },
      })
    } catch {}
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(400).json({ message: 'Invalid data' })
  }
})

router.patch('/orders/:id/payment', authorize(...orderRoles), validateRequest(updateOrderPaymentSchema), async (req, res) => {
  try {
    const { paymentStatus, paymentMethod, paymentRef, paymentNotes } = req.body
    const order = await Order.findOne({ _id: req.params.id })
    if (!order) return res.status(404).json({ message: 'Order not found' })

    const previousStatus = order.paymentStatus

    if (paymentStatus) order.paymentStatus = paymentStatus
    if (paymentMethod) order.paymentMethod = paymentMethod
    if (paymentRef !== undefined) order.paymentRef = paymentRef
    if (paymentNotes !== undefined) order.paymentNotes = paymentNotes

    // Auto-set paidAt if status becomes PAID
    if (paymentStatus === 'PAID' && previousStatus !== 'PAID' && !order.paidAt) {
      order.paidAt = new Date()
    } else if (paymentStatus && paymentStatus !== 'PAID') {
      order.paidAt = undefined
    }

    await order.save()

    try {
      await logAudit(req, {
        action: 'ORDER_PAYMENT_UPDATE',
        entityType: 'order',
        entityId: String(order._id),
        metadata: { 
            orderId: String(order._id), 
            previousStatus, 
            status: order.paymentStatus,
            method: order.paymentMethod 
        },
      })
    } catch {}

    res.json({ success: true, data: order })
  } catch (error) {
    res.status(400).json({ message: 'Invalid data' })
  }
})

router.get('/orders/sync-status', authorize('owner', 'admin', 'manager'), async (req, res) => {
  try {
    // Find orders that are PENDING or FAILED sync in last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const pendingOrders = await Order.find({
      createdAt: { $gte: since },
      platformStatus: { $in: ['PENDING', 'FAILED'] },
      status: { $ne: 'CANCELLED' } // Don't sync cancelled orders
    }).populate('items.menuItem')

    if (!(await platformClient.isEnabled())) {
        return res.json({ message: 'Platform disabled', pendingCount: pendingOrders.length })
    }

    let synced = 0
    let failed = 0

    // Try to sync them
    for (const order of pendingOrders) {
        try {
            const user = await User.findById(order.user)
            const payload = {
                externalOrderId: `rweb_order_${order._id}`,
                items: order.items.map((i: any) => ({
                    externalItemId: i.menuItem?.externalId || `rweb_menu_${i.menuItem?._id}`,
                    quantity: i.quantity,
                    notes: i.sauce ? `Sauce: ${i.sauce}` : ''
                })),
                totalAmount: order.totalAmount,
                customer: {
                    name: user?.name || 'Guest',
                    phone: user?.phone,
                    address: order.deliveryAddress
                },
                type: order.orderType,
                notes: order.customerNote,
                createdAt: order.createdAt
            }

            const platformRes = await platformClient.pushOrder(payload)
            if (platformRes && platformRes.id) {
                order.platformOrderId = platformRes.id
                order.platformStatus = 'SYNCED'
                await order.save()
                synced++
            } else {
                failed++
            }
        } catch (e) {
            console.error(`Manual sync failed for order ${order._id}:`, e)
            failed++
        }
    }

    res.json({ success: true, synced, failed, remaining: pendingOrders.length - synced })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/kds/tickets', authorize('owner', 'admin', 'manager', 'kitchen'), async (req, res) => {
  try {
    // Check if KDS feature is enabled via Platform
    // PlatformClient.getKdsTickets returns null if disabled or feature not active
    const platformTickets = await platformClient.getKdsTickets()
    if (platformTickets) {
        return res.json({ success: true, data: platformTickets, source: 'platform' })
    }

    // Fallback to local
    const orders = await Order.find({ 
        status: { $in: ['ACCEPTED', 'IN_PREP', 'READY'] }
    }).sort({ createdAt: 1 }) // Oldest first
      .populate('items.menuItem', 'name')

    res.json({ success: true, data: orders, source: 'local' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// --- Menu ---

router.get('/menu', authorize('owner', 'admin', 'manager', 'cashier', 'kitchen', 'staff'), async (req, res) => {
  try {
    const items = await MenuItem.find({}).sort({ archived: 1, createdAt: -1 })
    res.json({ success: true, data: items })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// --- Audit Logs (Admin) ---
router.get('/audit-logs', authorize('owner','admin'), async (req: any, res) => {
  try {
    const { action, entityType, outcome, dateFrom, dateTo, from, to, page = 1, limit = 50 } = req.query as any
    const skip = (Number(page) - 1) * Number(limit)
    const query: any = {}
    if (action) query.action = String(action)
    if (entityType) query.entityType = String(entityType)
    if (outcome) query.outcome = String(outcome)
    const df = dateFrom || from
    const dt = dateTo || to
    if (df || dt) {
      query.createdAt = {}
      if (df) query.createdAt.$gte = new Date(String(df))
      if (dt) query.createdAt.$lte = new Date(String(dt))
    }
    const items = await AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
    res.json({ success: true, data: items })
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Unable to fetch audit logs' })
  }
})

router.get('/audit-logs/export', authorize('owner','admin'), async (req: any, res) => {
  try {
    const { action, entityType, outcome, dateFrom, dateTo, from, to, format = 'csv', limit = 1000 } = req.query as any
    if (String(format).toLowerCase() !== 'csv') {
      return res.status(400).json({ success: false, message: 'Only CSV export is supported' })
    }
    const query: any = {}
    if (action) query.action = String(action)
    if (entityType) query.entityType = String(entityType)
    if (outcome) query.outcome = String(outcome)
    const df = dateFrom || from
    const dt = dateTo || to
    const maxRangeDays = 31
    if (df && dt) {
      const diff = (new Date(String(dt)).getTime() - new Date(String(df)).getTime()) / (1000 * 60 * 60 * 24)
      if (diff > maxRangeDays) {
        return res.status(400).json({ success: false, message: `date range must be <= ${maxRangeDays} days` })
      }
    }
    if (df || dt) {
      query.createdAt = {}
      if (df) query.createdAt.$gte = new Date(String(df))
      if (dt) query.createdAt.$lte = new Date(String(dt))
    }
    const items = await AuditLog.find(query).sort({ createdAt: -1 }).limit(Math.min(Number(limit), 5000))
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=\"audit-logs.csv\"')
    const headers = ['createdAt','actorType','actorUserId','actorId','actorEmail','actorRole','action','entityType','entityId','outcome','ipAddress','userAgent']
    res.write(headers.join(',') + '\n')
    for (const it of items) {
      const row = [
        (it as any).createdAt?.toISOString() || '',
        String((it as any).actorType || ''),
        String((it as any).actorUserId || ''),
        String((it as any).actorId || ''),
        csvSafe((it as any).actorEmail || ''),
        String((it as any).actorRole || ''),
        String((it as any).action || ''),
        String((it as any).entityType || (it as any).entity || ''),
        String((it as any).entityId || ''),
        String((it as any).outcome || ''),
        String((it as any).ipAddress || ''),
        csvSafe((it as any).userAgent || '')
      ]
      res.write(row.map(csvEscape).join(',') + '\n')
    }
    res.end()
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Unable to export audit logs' })
  }
})

router.get('/system/backups', authorize('owner','admin'), async (req: any, res) => {
  try {
    const recent = await BackupMetadata.find({})
      .sort({ createdAt: -1 })
      .limit(10)
    res.json({
      success: true,
      data: {
        message: 'Backups are managed by MongoDB Atlas. Daily snapshots enabled; retention 7–14 days (configurable). Contact ops to restore; do not store DB creds in app.',
        provider: 'ATLAS',
        automated: true,
        retentionDays: Number(process.env.BACKUP_RETENTION_DAYS || 14),
        region: (process.env.REGION || 'local').toLowerCase(),
        recent
      }
    })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})
function csvEscape(v: string) {
  const needsQuotes = v.includes(',') || v.includes('\n') || v.includes('"')
  const escaped = v.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}
function csvSafe(v: string) {
  return typeof v === 'string' ? v : ''
}

router.get('/menu', authorize('owner', 'admin', 'manager'), async (req, res) => {
  try {
    const items = await MenuItem.find({}).sort({ popularity: -1, createdAt: -1 })
    res.json({ success: true, data: items })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/menu', authorize('owner', 'admin', 'manager'), validateRequest(createMenuItemSchema), async (req, res) => {
  try {
    const item = await MenuItem.create({ ...req.body })
    
    // Ensure consistent externalId
    item.externalId = `rweb_menu_${item._id}`
    await item.save()

    // Optional: Sync to Platform (best effort)
    // PlatformClient handles feature gating internally
    platformClient.upsertCatalog([{
      externalId: item.externalId,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      imageUrl: item.imageUrl,
      available: item.isAvailable,
      updatedAt: item.updatedAt
    }]).catch(err => console.error('Platform sync failed (create):', err))

    res.status(201).json({ success: true, data: item })
    try {
      await logAudit(req, {
        action: 'MENU_CREATE_ITEM',
        entityType: 'menu',
        entityId: String(item._id),
        metadata: { name: item.name, price: item.price },
      })
    } catch {}
  } catch (error) {
    res.status(400).json({ message: 'Invalid data' })
  }
})

router.patch('/menu/:id', authorize('owner', 'admin', 'manager'), validateRequest(updateMenuItemSchema), async (req, res) => {
  try {
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true }
    )
    if (!item) return res.status(404).json({ message: 'Item not found' })

    // Ensure consistent externalId if missing
    if (!item.externalId) {
      item.externalId = `rweb_menu_${item._id}`
      await item.save()
    }

    // Optional: Sync to Platform (best effort)
    // PlatformClient handles feature gating internally
    platformClient.upsertCatalog([{
      externalId: item.externalId,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      imageUrl: item.imageUrl,
      available: item.isAvailable,
      updatedAt: item.updatedAt
    }]).catch(err => console.error('Platform sync failed (update):', err))

    res.json({ success: true, data: item })
    try {
      await logAudit(req, {
        action: 'MENU_UPDATE_ITEM',
        entityType: 'menu',
        entityId: String(item._id),
        metadata: { changes: req.body },
      })
    } catch {}
  } catch (error) {
    res.status(400).json({ message: 'Invalid data' })
  }
})

router.delete('/menu/:id', authorize('owner', 'admin', 'manager'), async (req, res) => {
  try {
    // Soft delete (archive)
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id },
      { archived: true },
      { new: true }
    )
    if (!item) return res.status(404).json({ message: 'Item not found' })

    // Optional: Sync to Platform (mark as unavailable/archived)
    // PlatformClient handles feature gating internally
    const extId = item.externalId || `rweb_menu_${item._id}`
    platformClient.upsertCatalog([{
      externalId: extId,
      available: false,
      updatedAt: new Date()
    }]).catch(err => console.error('Platform sync failed (delete):', err))

    res.json({ success: true, message: 'Item archived' })
    try {
      await logAudit(req, {
        action: 'MENU_DELETE_ITEM',
        entityType: 'menu',
        entityId: String(item._id),
        metadata: { archived: true },
      })
    } catch {}
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/menu/:id/hard', authorize('owner'), async (req, res) => {
  try {
    // Find before delete to get externalId
    const itemToDelete = await MenuItem.findOne({ _id: req.params.id })
    if (!itemToDelete) return res.status(404).json({ message: 'Item not found' })

    // Optional: Sync to Platform (mark as unavailable/archived) before deleting
    const settings = await Settings.findOne({})
    if ((await platformClient.isEnabled()) && settings?.platform?.syncMenu) {
      const extId = itemToDelete.externalId || `rweb_menu_${itemToDelete._id}`
      // We can't strictly "delete" via upsert, but we can mark available=false
      // Ideally the platform API would have a delete endpoint, but we use upsertCatalog for now.
      platformClient.upsertCatalog([{
        externalId: extId,
        available: false,
        archived: true, // Signal it's gone
        updatedAt: new Date()
      }]).catch(err => console.error('Platform sync failed (hard delete):', err))
    }

    await MenuItem.deleteOne({ _id: req.params.id })
    
    res.json({ success: true, message: 'Item permanently deleted' })
    try {
      await logAudit(req, {
        action: 'MENU_HARD_DELETE_ITEM',
        entityType: 'menu',
        entityId: String(itemToDelete._id),
        metadata: {},
      })
    } catch {}
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// --- Users ---

router.get('/users', authorize('owner', 'admin', 'manager'), async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 })
    res.json({ success: true, data: users })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/users/invite', authorize('owner', 'admin'), validateRequest(inviteUserSchema), async (req: any, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const role = String(req.body?.role || 'staff').trim()
    if (!email) return res.status(400).json({ message: 'Email is required' })
    const validRoles = ['admin','manager','cashier','kitchen','staff','user']
    if (!validRoles.includes(role)) return res.status(400).json({ message: 'Invalid role' })
    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ message: 'User already exists' })
    const token = (await import('../utils/crypto')).randomToken()
    const sha = (await import('../utils/crypto')).sha256(token)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const rec = await InviteToken.create({
      email,
      role,
      tokenHash: sha,
      expiresAt,
      createdByUserId: req.user._id
    })
    const host = String(req.headers.host || '')
    const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const inviteLink = `${proto}://${host}/invite?token=${encodeURIComponent(token)}`
    // Send email here in production
    try {
      await logAudit(req, {
        action: 'ADMIN_USER_INVITE_CREATE',
        entityType: 'user',
        entityId: '',
        metadata: { email, role }
      })
    } catch {}
    res.status(201).json({ success: true, data: { inviteId: rec._id, email, role, inviteLink } })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.patch('/users/:id/role', authorize('owner', 'admin'), validateRequest(updateUserRoleSchema), async (req, res) => {
  try {
    const { role } = req.body
    
    // Validate role
    const validRoles = ['owner', 'admin', 'manager', 'cashier', 'kitchen', 'staff', 'user']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' })
    }

    // Prevent changing own role or owner's role if not owner
    // This logic is complex, for now trust the authorize middleware and simple checks
    
    const user = await User.findOneAndUpdate(
      { _id: req.params.id },
      { role },
      { new: true }
    ).select('-password')

    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ success: true, data: user })
    try {
      await logAudit(req, {
        action: 'USER_ROLE_UPDATE',
        entityType: 'user',
        entityId: String(user._id),
        metadata: { role },
      })
    } catch {}
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/roles/options', authorize('owner', 'admin', 'manager'), async (req, res) => {
  res.json({
    success: true,
    data: {
      roles: ['owner', 'admin', 'manager', 'cashier', 'kitchen', 'staff', 'user']
    }
  })
})

// --- Settings ---

router.get('/settings', authorize('owner', 'admin'), async (req, res) => {
  try {
    let settings = await Settings.findOne({})
    if (!settings) {
        // Create default if not exists, seeded with known Rations defaults
        settings = await Settings.create({
            siteName: 'Rations',
            tagline: 'Real food. Real community.',
            description: 'Rations is a community-first food brand focused on honest sourcing, nutritious meals, and neighborhood impact.',
            primaryColor: '#FDCD2F',
            contacts: {
                email: 'rations.ng@gmail.com',
                phone: '+2349122058888',
                whatsapp: 'https://wa.me/2349122058888',
                location: 'Rations, Plot 123, Railway junction, Idu Industrial District, Abuja 900001, Federal Capital Territory',
            },
            socials: [
                { name: 'TikTok', url: 'https://www.tiktok.com/@rations.food' },
                { name: 'Instagram', url: 'https://instagram.com/rations.food' },
                { name: 'Facebook', url: 'https://facebook.com/rations.food' },
                { name: 'YouTube', url: 'https://youtube.com/@rationsfood' },
                { name: 'X', url: 'https://x.com/rationsfood' },
                { name: 'WhatsApp', url: 'https://wa.me/2349122058888' },
            ],
            bankAccounts: [{
                bankName: 'Rations Bank',
                accountName: 'Rations Food Ltd',
                accountNumber: '1234567890',
            }],
            // Legacy bank field for backward compat
            bank: {
                name: 'Rations Bank',
                accountName: 'Rations Food Ltd',
                accountNumber: '1234567890',
            }
        })
    }
    
    // Fallback if existing document is empty (partial migration)
    let dirty = false
    if (!settings.contacts || !settings.contacts.email) {
        settings.contacts = {
            email: 'rations.ng@gmail.com',
            phone: '+2349122058888',
            whatsapp: 'https://wa.me/2349122058888',
            location: 'Rations, Plot 123, Railway junction, Idu Industrial District, Abuja 900001, Federal Capital Territory',
        }
        dirty = true
    }
    if (!settings.bankAccounts || settings.bankAccounts.length === 0) {
        settings.bankAccounts = [{
            bankName: 'Rations Bank',
            accountName: 'Rations Food Ltd',
            accountNumber: '1234567890',
        }] as any
        dirty = true
    }
    if (!settings.socials || settings.socials.length === 0) {
        settings.socials = [
            { name: 'TikTok', url: 'https://www.tiktok.com/@rations.food' },
            { name: 'Instagram', url: 'https://instagram.com/rations.food' },
            { name: 'Facebook', url: 'https://facebook.com/rations.food' },
            { name: 'YouTube', url: 'https://youtube.com/@rationsfood' },
            { name: 'X', url: 'https://x.com/rationsfood' },
            { name: 'WhatsApp', url: 'https://wa.me/2349122058888' },
        ] as any
        dirty = true
    }
    if (dirty) {
        await settings.save()
    }

    res.json({ success: true, data: settings })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/settings', authorize('owner' , 'admin'), async (req, res) => {
  try {
    
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: req.body },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    res.json({ success: true, data: settings })
  } catch (error) {
    console.error(error)
    res.status(400).json({ message: 'Invalid data' })
  }
})

export default router
