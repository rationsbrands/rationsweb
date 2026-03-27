import OrderSyncQueue from '../models/OrderSyncQueue'
import Order from '../models/Order'
import IntegrationLog from '../models/IntegrationLog'
import { platformClient } from '../integrations/platformClient'

const BACKOFF_BASE_MS = 10_000 // 10s
const BACKOFF_MAX_MS = 10 * 60_000 // 10m
const SYNC_INTERVAL_MS = Number(process.env.ORDER_SYNC_INTERVAL_MS || 30_000) // 30s default
const BATCH_SIZE = Number(process.env.ORDER_SYNC_BATCH_SIZE || 10)

function computeBackoff(attempts: number) {
  const delay = Math.min(Math.pow(2, attempts) * BACKOFF_BASE_MS, BACKOFF_MAX_MS)
  return delay
}

export async function processJob(job: any) {
  const { orderId, action } = job
  const order = await Order.findById(orderId)
  if (!order) {
    await OrderSyncQueue.findByIdAndUpdate(job._id, { status: 'ERROR', lastError: 'Order not found' })
    return
  }

  if (!(await platformClient.isEnabled())) {
    await OrderSyncQueue.findByIdAndUpdate(job._id, { status: 'ERROR', lastError: 'Platform disabled' })
    return
  }

if (action === 'PUSH') {
  const payload = {
    externalOrderId: String(order._id),
    source: 'rationsweb',
    type: order.orderType === 'delivery' ? 'delivery' : 'pickup',
    items: order.items.map((i: any) => ({
      externalId: (i as any).menuItem?.externalId || `rweb_menu_${(i as any).menuItem}`,
      qty: i.quantity,
      unitPrice: (i as any).priceAtOrderTime || 0,
      sauce: i.sauce || undefined
    })),
    customer: {
        name: 'Guest',
        phone: ''
    },
    notes: order.customerNote,
    totals: {
        total: order.totalAmount
    }
  }
    try {
      const res = await platformClient.pushOrder(payload)
      
      if (!res) {
        throw new Error('Request failed (null response)')
      }

      const platformOrderId = res.id || res.orderId || res.platformOrderId
      
      if (platformOrderId) {
        order.platformOrderId = platformOrderId
        order.opsSource = 'PLATFORM'
        order.platformStatus = 'SYNCED'
        order.opsStatus = res.status || order.opsStatus
        order.lastOpsSyncAt = new Date()
        order.opsSyncError = ''
        await order.save()
        await OrderSyncQueue.findByIdAndUpdate(job._id, { status: 'SUCCESS' })
        await OrderSyncQueue.create({
          orderId: order._id,
          platformOrderId,
          action: 'SYNC',
          status: 'PENDING',
          nextRunAt: new Date(Date.now() + SYNC_INTERVAL_MS)
        })
        try {
          await IntegrationLog.create({
            provider: 'platform',
            action: 'ORDER_PUSH',
            direction: 'outbound',
            status: 'success',
            orderId: order._id,
            platformOrderId,
            response: res
          })
        } catch {}
      } else {
        throw new Error('No platform order id in response: ' + JSON.stringify(res))
      }
    } catch (e: any) {
      const attempts = (job.attempts || 0) + 1
      const delay = computeBackoff(attempts)
      await OrderSyncQueue.findByIdAndUpdate(job._id, { 
        status: 'PENDING',
        attempts,
        nextRunAt: new Date(Date.now() + delay),
        lastError: e?.message || 'Push failed'
      })
      order.opsSyncAttempts = (order.opsSyncAttempts || 0) + 1
      order.opsSyncError = e?.message || 'Push failed'
      await order.save()
      try {
        await IntegrationLog.create({
          provider: 'platform',
          action: 'ORDER_PUSH',
          direction: 'outbound',
          status: 'failed',
          orderId: order._id,
          error: e?.message || 'Push failed'
        })
      } catch {}
    }
  } else if (action === 'SYNC') {
    const platformOrderId = job.platformOrderId || order.platformOrderId
    if (!platformOrderId) {
      await OrderSyncQueue.findByIdAndUpdate(job._id, { status: 'ERROR', lastError: 'Missing platformOrderId' })
      return
    }
    try {
      const status = await platformClient.getOrderStatus(platformOrderId)
      if (status) {
        order.opsStatus = status.status || String(status)
        order.lastOpsSyncAt = new Date()
        await order.save()
        await OrderSyncQueue.findByIdAndUpdate(job._id, { status: 'SUCCESS' })
        try {
          await IntegrationLog.create({
            provider: 'platform',
            action: 'ORDER_STATUS_SYNC',
            direction: 'outbound',
            status: 'success',
            orderId: order._id,
            platformOrderId,
            response: status
          })
        } catch {}
        const terminal = ['COMPLETED','CANCELLED'].includes(order.opsStatus || '')
        if (!terminal) {
          await OrderSyncQueue.create({
            orderId: order._id,
            platformOrderId,
            action: 'SYNC',
            status: 'PENDING',
            nextRunAt: new Date(Date.now() + SYNC_INTERVAL_MS)
          })
        }
      } else {
        throw new Error('Status fetch failed')
      }
    } catch (e: any) {
      const attempts = (job.attempts || 0) + 1
      const delay = computeBackoff(attempts)
      await OrderSyncQueue.findByIdAndUpdate(job._id, { 
        status: 'PENDING',
        attempts,
        nextRunAt: new Date(Date.now() + delay),
        lastError: e?.message || 'Sync failed'
      })
      order.opsSyncAttempts = (order.opsSyncAttempts || 0) + 1
      order.opsSyncError = e?.message || 'Sync failed'
      await order.save()
      try {
        await IntegrationLog.create({
          provider: 'platform',
          action: 'ORDER_STATUS_SYNC',
          direction: 'outbound',
          status: 'failed',
          orderId: order._id,
          platformOrderId,
          error: e?.message || 'Sync failed'
        })
      } catch {}
    }
  } else if (action === 'CANCEL') {
    // Stub: enqueue cancel; future implementation to call platform cancel endpoint
    await OrderSyncQueue.findByIdAndUpdate(job._id, { status: 'SUCCESS' })
  }
}



export function startOrderSyncWorker() {
  if (process.env.ENABLE_JOBS === 'false') {
    console.log('Order Sync Worker disabled (ENABLE_JOBS=false)')
    return
  }
  setInterval(async () => {
    try {
      const now = new Date()
      // Claim jobs atomically one by one up to batch size
      for (let i = 0; i < BATCH_SIZE; i++) {
        const job = await OrderSyncQueue.findOneAndUpdate(
          { status: 'PENDING', nextRunAt: { $lte: now } },
          { $set: { status: 'RUNNING' } },
          { sort: { nextRunAt: 1 }, new: true }
        )
        if (!job) break
        await processJob(job)
      }
    } catch (e) {
      console.error('Order Sync Worker error:', e)
    }
  }, Number(process.env.ORDER_WORKER_INTERVAL_MS || 10_000)) // default 10s tick
}
