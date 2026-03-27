import express from 'express'
import Address from '../models/Address'
import { protect } from '../middleware/auth'

const router = express.Router()

router.get('/', protect, async (req: any, res) => {
  try {
    const userId = req.user._id
    const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 })
    res.json({ success: true, data: addresses })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/', protect, async (req: any, res) => {
  try {
    const userId = req.user._id
    const payload = {
      userId,
      label: req.body.label,
      recipientName: req.body.recipientName,
      phone: req.body.phone,
      line1: req.body.line1,
      line2: req.body.line2,
      city: req.body.city,
      state: req.body.state,
      postalCode: req.body.postalCode,
      country: req.body.country,
      deliveryInstructions: req.body.deliveryInstructions,
      isDefault: Boolean(req.body.isDefault),
    }

    if (!payload.line1) {
      return res.status(400).json({ success: false, message: 'Address line1 is required' })
    }

    if (payload.isDefault) {
      await Address.updateMany({ userId }, { $set: { isDefault: false } })
    }

    const created = await Address.create(payload)
    res.status(201).json({ success: true, data: created })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/:id', protect, async (req: any, res) => {
  try {
    const userId = req.user._id
    const id = req.params.id
    const address = await Address.findOne({ _id: id, userId })
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' })
    }

    const updates: any = {}
    ;['label','recipientName','phone','line1','line2','city','state','postalCode','country','deliveryInstructions'].forEach((k) => {
      if (typeof req.body[k] !== 'undefined') updates[k] = req.body[k]
    })

    if (typeof req.body.isDefault !== 'undefined') {
      updates.isDefault = Boolean(req.body.isDefault)
    }

    if (updates.isDefault === true) {
      await Address.updateMany({ userId, _id: { $ne: id } }, { $set: { isDefault: false } })
    }

    Object.assign(address, updates)
    await address.save()
    res.json({ success: true, data: address })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id', protect, async (req: any, res) => {
  try {
    const userId = req.user._id
    const id = req.params.id
    const deleted = await Address.findOneAndDelete({ _id: id, userId })
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Address not found' })
    }
    res.json({ success: true, data: { _id: deleted._id } })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
