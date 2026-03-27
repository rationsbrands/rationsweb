import express from 'express'
import crypto from 'crypto'
import Order from '../models/Order'
import IntegrationLog from '../models/IntegrationLog'
import { platformClient } from '../integrations/platformClient'
import MenuItem from '../models/MenuItem'

const router = express.Router()

function normalizeSignature(sig: string) {
  const s = String(sig || '').trim()
  return s.toLowerCase().startsWith('sha256=') ? s.slice(7) : s
}

function isHex(s: string) {
  return /^[0-9a-fA-F]+$/.test(s)
}

const verifyHmac = (req: any, res: any, next: any) => {
  const signatureRaw =
    req.headers['x-platform-signature'] ||
    req.headers['x-webhook-signature'] ||
    req.headers['x-hook-signature']

  const timestampRaw =
    req.headers['x-platform-timestamp'] ||
    req.headers['x-webhook-timestamp'] ||
    req.headers['x-hook-timestamp']

  const secret = String(process.env.PLATFORM_WEBHOOK_SECRET || '').trim()
  if (!secret) {
    console.error('[Webhook] Secret not configured')
    return res.status(500).json({ message: 'Webhook secret not configured' })
  }

  if (!signatureRaw || !timestampRaw) {
    console.error('[Webhook] Missing signature or timestamp')
    IntegrationLog.create({
      provider: 'platform',
      action: 'WEBHOOK_AUTH_FAIL',
      direction: 'inbound',
      status: 'failed',
      error: 'Missing signature or timestamp'
    }).catch(()=>{})
    return res.status(401).json({ message: 'Missing signature or timestamp' })
  }

  const timestampStr = String(timestampRaw).trim()
  let timestampNum = Number(timestampStr)

  if (!Number.isFinite(timestampNum) || timestampNum <= 0) {
    console.error('[Webhook] Invalid timestamp', timestampStr)
    return res.status(401).json({ message: 'Invalid timestamp' })
  }

  if (timestampNum < 1e12) timestampNum *= 1000

  // if (Math.abs(Date.now() - timestampNum) > 5 * 60 * 1000) {
    // console.error('[Webhook] Timestamp expired', timestampNum, Date.now())
    // return res.status(401).json({ message: 'Timestamp expired' })
  // }

  const rawBody = req.rawBody
  if (!rawBody || typeof rawBody !== 'string') {
    console.error('[Webhook] Missing raw body')
    IntegrationLog.create({
      provider: 'platform',
      action: 'WEBHOOK_AUTH_FAIL',
      direction: 'inbound',
      status: 'failed',
      error: 'Missing raw body'
    }).catch(()=>{})
    return res.status(400).json({ message: 'Missing raw body' })
  }

  const payloadToSign = `${timestampStr}.${rawBody}`
  const expectedHex = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex')
  const signatureHex = normalizeSignature(String(signatureRaw))

  if (!isHex(signatureHex)) {
    console.error('[Webhook] Invalid signature format')
    return res.status(401).json({ message: 'Invalid signature format' })
  }

  try {
    const sigBuf = Buffer.from(signatureHex, 'hex')
    const expBuf = Buffer.from(expectedHex, 'hex')

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.error('[Webhook] Invalid signature')
      console.error('Received:', signatureHex)
      console.error('Expected:', expectedHex)
      console.error('Secret (first 5):', secret.slice(0, 5))
      console.error('Raw Body:', rawBody)
      
      IntegrationLog.create({
        provider: 'platform',
        action: 'WEBHOOK_AUTH_FAIL',
        direction: 'inbound',
        status: 'failed',
        error: `Invalid signature. Exp: ${expectedHex}, Rec: ${signatureHex}`,
        request: { rawBody, timestampStr }
      }).catch(()=>{})

      return res.status(401).json({ message: 'Invalid signature' })
    }
  } catch {
    return res.status(401).json({ message: 'Invalid signature' })
  }

  next()
}

// POST /api/webhooks/platform
router.post('/platform', verifyHmac, async (req: any, res) => {
  const event = req.body

  // Log receipt FIRST
  try {
    await IntegrationLog.create({
      provider: 'platform',
      action: event?.type === 'menu.updated' ? 'MENU_WEBHOOK' : 'ORDER_WEBHOOK',
      direction: 'inbound',
      status: 'success',
      request: event,
    })
  } catch (e) {
    console.warn('Failed to log inbound webhook')
  }

  try {
    // 1) Ping
    if (event?.type === 'ping') {
      return res.json({ received: true, message: 'pong' })
    }

    // 2) Menu Updated -> Trigger Sync
    if (event?.type === 'menu.updated') {
      res.json({ received: true, action: 'menu_sync_started' })

      // Process in background to avoid timeout
      setImmediate(async () => {
        try {
          console.log('[Webhook] Handling menu.updated in background...')
          const menuRes: any = await platformClient.getMenu()
          const items = menuRes?.data || []
          
          if (Array.isArray(items)) {
            let synced = 0
            for (const item of items) {
              // Sync by externalId (Platform ID)
              if (!item._id) continue
              await MenuItem.findOneAndUpdate(
                { externalId: item._id },
                {
                  name: item.name,
                  description: item.description,
                  price: item.price,
                  category: item.category,
                  imageUrl: item.imageUrl,
                  isAvailable: item.isAvailable,
                  externalId: item._id,
                  archived: item.archived || false
                },
                { upsert: true, new: true }
              )
              synced++
            }
            console.log(`[Webhook] Synced ${synced} menu items from Platform`)
            
            try {
                await IntegrationLog.create({
                  provider: 'platform',
                  action: 'MENU_SYNC',
                  direction: 'inbound',
                  status: 'success',
                  request: event,
                  response: { synced }
                })
            } catch {}
          }
        } catch (err) {
          console.error('[Webhook] Background sync failed:', err)
        }
      })
      return
    }

    // 3) Order Status Changed
    if (event?.type === 'order.status_changed') {
      const { externalOrderId, platformOrderId, orderId, status } = event.data || {}

      const pOrderId = platformOrderId || orderId

      if (!externalOrderId && !pOrderId) {
        return res.status(400).json({ message: 'Missing order identifiers' })
      }

      const order = await Order.findOne({
        $or: [
          externalOrderId ? { _id: externalOrderId } : undefined,
          pOrderId ? { platformOrderId: pOrderId } : undefined,
        ].filter(Boolean) as any,
      })

      if (!order) {
        console.warn('Webhook order not found')
        return res.json({ received: true })
      }

      let localStatus = String(status || '').toUpperCase()
      if (localStatus === 'CONFIRMED') localStatus = 'ACCEPTED'
      if (localStatus === 'PREPARING') localStatus = 'IN_PREP'
      if (localStatus === 'DELIVERED') localStatus = 'COMPLETED'

      const allowed = ['CREATED', 'ACCEPTED', 'IN_PREP', 'READY', 'COMPLETED', 'CANCELLED']
      if (!allowed.includes(localStatus)) {
        return res.json({ received: true })
      }

      order.status = localStatus as any
      order.platformStatus = 'SYNCED'
      await order.save()
    }

    return res.json({ received: true })
  } catch (error: any) {
    try {
      await IntegrationLog.create({
        provider: 'platform',
        action: 'ORDER_WEBHOOK',
        direction: 'inbound',
        status: 'failed',
        request: event,
        error: error.message,
      })
    } catch {}

    console.error('Webhook processing error:', error)
    return res.status(500).json({ message: 'Server error' })
  }
})

export default router
