import express from 'express'
import MenuItem from '../models/MenuItem'
import CommunityPost from '../models/CommunityPost'
import Settings from '../models/Settings'
import Order from '../models/Order'
import { platformClient } from '../integrations/platformClient'
import IntegrationLog from '../models/IntegrationLog'
import MenuCache from '../models/MenuCache'
import OrderSyncQueue from '../models/OrderSyncQueue'
import { logAudit } from '../utils/auditLogger'
import { validateRequest } from '../middleware/validate'
import { createPublicOrderSchema } from '../schemas'
import mongoose from 'mongoose'

const router = express.Router()

router.get(['/settings', '/settings/public'], async (req, res) => {
  try {
    const settings = await Settings.findOne({})
    res.json({
      success: true,
      data: {
        // Core Identity
        name: settings?.siteName || 'Rations',
        siteName: settings?.siteName,
        tagline: settings?.tagline || '',
        description: settings?.description || '',
        primaryColor: settings?.primaryColor || '#FDCD2F',
        
        // Contacts & Socials
        contacts: settings?.contacts || {},
        socials: settings?.socials || [],
        
        // Banking
        bank: settings?.bank || {},
        bankAccounts: settings?.bankAccounts || [],
        
        // Promos & Events (Flat for client compatibility)
        promoMessage: settings?.promoMessage,
        promoStart: settings?.promoStart,
        promoEnd: settings?.promoEnd,
        
        eventMessage: settings?.eventMessage,
        eventDate: settings?.eventDate,
        eventStart: settings?.eventStart,
        eventEnd: settings?.eventEnd,
        
        visitorAlertEnabled: settings?.visitorAlertEnabled,

        // Legacy/Computed
        logoUrl: '', 
        isRations: true,
        features: {
           hasCommunity: settings?.features?.communityEnabled ?? true,
           hasMenuSync: settings?.platform?.syncMenu ?? false,
           hasPOS: true,
           hasPublicWebsiteIntegration: true
        },
        modules: ['rationsweb_admin'],
        
        // Nested settings object for legacy clients if any
        settings: {
          primaryColor: settings?.primaryColor || '#FDCD2F'
        }
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/menu', async (req, res) => {
  try {
    const query: any = { isAvailable: true, archived: false }

    const TTL_MS = 10 * 60 * 1000
    // Check global platform setting or default to false
    const platformEnabled = false // TODO: Check global settings

    if (platformEnabled) {
      const start = Date.now()
      let cache = null
      try {
        const menu = await platformClient.getMenu()
        if (menu && Array.isArray(menu.items || menu)) {
          const items = Array.isArray(menu.items) ? menu.items : menu
          try {
            await IntegrationLog.create({
              provider: 'platform',
              action: 'MENU_SYNC',
              direction: 'outbound',
              status: 'success',
              request: {},
              response: { count: items.length, durationMs: Date.now() - start }
            })
          } catch {}
          return res.json({ success: true, data: items })
        } else {
          throw new Error('Invalid menu response')
        }
      } catch (err: any) {
        try {
          await IntegrationLog.create({
            provider: 'platform',
            action: 'MENU_SYNC',
            direction: 'outbound',
            status: 'failed',
            request: {},
            error: err?.message || 'Sync failed'
          })
        } catch {}
        return res.status(503).json({ message: 'Menu temporarily unavailable' })
      }
    } else {
      const items = await MenuItem.find(query).sort({ popularity: -1, createdAt: -1 }).lean()
      const settings = await Settings.findOne({}).lean()
      const promoPricingEnabled = Boolean(settings?.features?.promoPricingEnabled)
      
      const now = new Date()
      function getEffectivePrice(item: any) {
        if (!promoPricingEnabled) return item.price
        const isActive = item.promoActive &&
          (!item.promoStart || item.promoStart <= now) &&
          (!item.promoEnd || item.promoEnd >= now)
        if (!isActive) return item.price
        if (item.promoType === 'fixed_price') return item.promoValue
        if (item.promoType === 'percentage') return Math.round(item.price * (1 - item.promoValue / 100))
        return item.price
      }

      const mappedItems = items.map((item: any) => ({
        ...item,
        effectivePrice: getEffectivePrice(item)
      }))

      return res.json({ success: true, data: mappedItems })
    }
  } catch (error) {
    console.error('GET /menu error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/community', async (req, res) => {
  try {
    const posts = await CommunityPost.find({ status: 'published', deleted: false }).sort({ createdAt: -1 })
    res.json({ success: true, data: posts })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/community/:id', async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.id, status: 'published', deleted: false })
    if (!post) return res.status(404).json({ message: 'Post not found' })
    res.json({ success: true, data: post })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/community/:id/report', async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.id, deleted: false })
    if (!post) return res.status(404).json({ message: 'Post not found' })
    post.reportsCount = (post.reportsCount || 0) + 1
    await post.save()
    res.status(201).json({ success: true, data: { reportsCount: post.reportsCount } })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/community/:id/like', async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.id, deleted: false })
    if (!post) return res.status(404).json({ message: 'Post not found' })
    post.likes = (post.likes || 0) + 1
    await post.save()
    res.status(200).json({ success: true, data: { likes: post.likes } })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/community/:id/unlike', async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.id, deleted: false })
    if (!post) return res.status(404).json({ message: 'Post not found' })
    post.likes = Math.max(0, (post.likes || 0) - 1)
    await post.save()
    res.status(200).json({ success: true, data: { likes: post.likes } })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/content', async (req, res) => {
  try {
    // Placeholder for content/banners if not using Settings
    res.json({ success: true, data: { banners: [] } }) 
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/settings', async (req, res) => {
  try {
    const settings = await Settings.findOne()
    res.json({ success: true, data: settings })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Public Order Creation (Guest/User)
router.post('/orders', validateRequest(createPublicOrderSchema), async (req, res) => {
  try {
    const { items, orderType, deliveryAddress, customerNote, user, paymentMethod } = req.body

    // 1. Recalculate prices and total securely on the server
    const itemIds = items.map((i: any) => new mongoose.Types.ObjectId(i.menuItem._id))
    const menuItems = await MenuItem.find({ _id: { $in: itemIds } })
    
    const menuItemMap = new Map(menuItems.map(m => [m._id.toString(), m]))
    
    let totalAmount = 0
    const validatedItems = []

    for (const i of items) {
      const dbItem = menuItemMap.get(i.menuItem._id.toString())
      if (!dbItem) {
        return res.status(400).json({ message: `Menu item not found: ${i.menuItem._id}` })
      }
      if (!dbItem.isAvailable || dbItem.archived) {
        return res.status(400).json({ message: `Item ${dbItem.name} is currently unavailable` })
      }

      const price = dbItem.price
      totalAmount += price * i.quantity
      
      validatedItems.push({
        menuItem: dbItem._id,
        quantity: i.quantity,
        priceAtOrderTime: price,
        sauce: i.sauce,
        options: i.options
      })
    }

    // 2. Create Order in RationsWeb DB
    const order = await Order.create({
      user: user?._id || undefined, // Optional user ID
      items: validatedItems,
      totalAmount,
      paymentMethod,
      orderType,
      deliveryAddress,
      customerNote,
      status: 'CREATED',
      paymentStatus: 'UNPAID' // Always UNPAID until callback
    })

    // 3. If Platform integration enabled: enqueue push to Platform
    const settings = await Settings.findOne()
    let warning: any = null
    // TODO: Check global platform enabled setting
    if (settings?.platform?.syncOrders) {
      await OrderSyncQueue.create({
        orderId: order._id,
        action: 'PUSH',
        status: 'PENDING',
        attempts: 0,
        nextRunAt: new Date()
      })
      order.opsSource = 'LOCAL'
      order.platformStatus = 'PENDING'
      await order.save()
      warning = { opsSync: 'PENDING' }
    } else {
      order.opsSource = 'LOCAL'
      await order.save()
    }

    res.status(201).json({ success: true, data: order, warning })
    try {
      await logAudit(req as any, {
        action: 'ORDER_CREATE',
        entityType: 'order',
        entityId: String(order._id),
        metadata: { totalAmount, orderType, paymentMethod, itemsCount: validatedItems.length }
      })
    } catch {}
  } catch (error) {
    console.error('Order creation failed:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Order status endpoint (merged with platform status when connected)
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    
    let platformStatus: any = null
    if (order.opsSource === 'PLATFORM' && order.platformOrderId) {
      try {
        platformStatus = await platformClient.getOrderStatus(order.platformOrderId)
        order.lastOpsSyncAt = new Date()
        await order.save()
        try {
          await IntegrationLog.create({
            provider: 'platform',
            action: 'order_status',
            direction: 'outbound',
            status: platformStatus ? 'success' : 'failed',
            orderId: order._id,
            platformOrderId: order.platformOrderId,
            response: platformStatus
          })
        } catch {}
      } catch (e) {
        try {
          await IntegrationLog.create({
            provider: 'platform',
            action: 'order_status',
            direction: 'outbound',
            status: 'failed',
            orderId: order._id,
            platformOrderId: order.platformOrderId,
            error: (e as any)?.message || 'Status fetch failed'
          })
        } catch {}
      }
    }
    res.json({ success: true, data: { order, platformStatus } })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
