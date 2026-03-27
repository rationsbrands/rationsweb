import express from 'express'
import axios from 'axios'

const router = express.Router()

router.get('/admin/billing/summary', async (req: any, res) => {
  try {
    // Single tenant mode: billing disabled or simplified
    res.json({ success: true, data: { subscriptions: [], plans: [] } })
  } catch {
    res.json({ success: true, data: { subscriptions: [], plans: [] } })
  }
})

router.get('/admin/billing/entitlements', async (req: any, res) => {
  try {
    // Single tenant mode: billing disabled or simplified
    res.json({ success: true, data: [] })
  } catch {
    res.json({ success: true, data: [] })
  }
})

export default router

