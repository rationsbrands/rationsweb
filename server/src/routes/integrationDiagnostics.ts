import express from 'express'
import crypto from 'crypto'
import IntegrationDiagnosticEvent from '../models/IntegrationDiagnosticEvent'
import { platformClient } from '../integrations/platformClient'
import { protect, authorize } from '../middleware/auth'

const router = express.Router()

// Mount: /api/integrations/diagnostics

// 1. Outbound Test Trigger (RW -> Platform)
router.post(
  '/platform/outbound/test',
  protect,
  authorize('admin', 'owner'),
  async (req, res) => {
    const correlationId = crypto.randomUUID()
    const results: any = { correlationId }

    try {
      // A) PING
      const pingStart = Date.now()
      const pingRes = await platformClient.checkHealth()
      await IntegrationDiagnosticEvent.create({
        direction: 'outbound',
        provider: 'platform',
        event: 'PING',
        status: pingRes.reachable ? 'success' : 'failed',
        correlationId,
        response: pingRes,
        error: pingRes.lastError,
      })
      results.pingResult = pingRes

      // B) ORDER PUSH
      const orderPayload = {
        externalOrderId: correlationId,
        channel: 'DIAG',
        fulfillmentType: 'delivery',
        paymentMethod: 'card',
        items: [{ externalItemId: 'diag_item_1', quantity: 1, notes: 'diagnostic' }],
        customer: { name: 'Diagnostic' },
        address: 'N/A',
        notes: 'diagnostic',
      }
      
      let orderPushRes: any = null
      let orderError: string | undefined
      try {
        orderPushRes = await platformClient.pushOrder(orderPayload)
        await IntegrationDiagnosticEvent.create({
          direction: 'outbound',
          provider: 'platform',
          event: 'ORDER_PUSH',
          status: 'success',
          correlationId,
          payload: orderPayload,
          response: orderPushRes,
        })
      } catch (err: any) {
        orderError = err.message
        await IntegrationDiagnosticEvent.create({
          direction: 'outbound',
          provider: 'platform',
          event: 'ORDER_PUSH',
          status: 'failed',
          correlationId,
          payload: orderPayload,
          error: orderError,
        })
      }
      results.orderPushResult = orderPushRes || { error: orderError }

      // C) PLATFORM CALLBACK
      if (!orderError) {
        const callbackPayload = {
          correlationId,
          from: 'rationsweb',
          at: new Date().toISOString(),
        }
        let callbackRes: any = null
        let callbackError: string | undefined
        
        try {
          // Uses the helper we added to platformClient
          callbackRes = await platformClient.sendDiagnosticCallback(
            '/api/integrations/diagnostics/from-rationsweb/callback',
            callbackPayload
          )
          
          await IntegrationDiagnosticEvent.create({
            direction: 'outbound',
            provider: 'platform',
            event: 'PLATFORM_CALLBACK',
            status: 'success',
            correlationId,
            payload: callbackPayload,
            response: callbackRes,
          })
        } catch (err: any) {
          callbackError = err.message
          await IntegrationDiagnosticEvent.create({
            direction: 'outbound',
            provider: 'platform',
            event: 'PLATFORM_CALLBACK',
            status: 'failed',
            correlationId,
            payload: callbackPayload,
            error: callbackError,
          })
        }
        results.callbackResult = callbackRes || { error: callbackError }
      }

      res.json({ ok: true, ...results })
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message, correlationId })
    }
  }
)

router.post('/platform/inbound/receive', async (req, res) => {
  const { correlationId, from, at } = req.body
  
  try {
    await IntegrationDiagnosticEvent.create({
      direction: 'inbound',
      provider: 'platform',
      event: 'PLATFORM_CALLBACK',
      status: 'success',
      correlationId,
      payload: req.body,
    })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// 3. List Events
router.get(
  '/platform/events',
  protect,
  authorize('admin', 'owner'),
  async (req, res) => {
    try {
      const { correlationId } = req.query
      const query: any = {}
      if (correlationId) query.correlationId = correlationId

      const events = await IntegrationDiagnosticEvent.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
      
      res.json(events)
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  }
)

export default router
