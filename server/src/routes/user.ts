import express from 'express'
import User from '../models/User'
import Order from '../models/Order'
import { protect, authorize } from '../middleware/auth'
import bcrypt from 'bcryptjs'
import { validateRequest } from '../middleware/validate'
import { createUserSchema, updateUserSchema } from '../schemas'

const router = express.Router()

router.get('/orders', protect, async (req: any, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 })
    res.json({ success: true, data: orders })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/', protect, authorize('owner', 'admin'), validateRequest(createUserSchema), async (req: any, res) => {
  try {
    const { name, email, role } = req.body

    const userExists = await User.findOne({ email: email.toLowerCase() })
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const salt = await bcrypt.genSalt(10)
    // Default password for invited users
    const hashedPassword = await bcrypt.hash('password123', salt)

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'user'
    })

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.patch('/me', protect, validateRequest(updateUserSchema), async (req: any, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const { name, email, phone } = req.body
    
    if (name) user.name = name
    if (email) user.email = email
    if (phone) user.phone = phone

    await user.save()

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
