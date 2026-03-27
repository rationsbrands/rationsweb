import '../bootstrapEnv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { connectDB } from '../db'
import User from '../models/User'
import { env, isProd } from '../config/env'

const createDevUsers = async () => {
  if (isProd) {
    console.error('❌  ABORTING: This script is for DEVELOPMENT only.')
    process.exit(1)
  }

  console.log('🔧  Starting DEV user provisioning...')
  await connectDB()

  // Safe defaults for DEV only
  const users = [
    {
      role: 'admin',
      name: 'Dev Admin',
      email: process.env.DEV_ADMIN_EMAIL || 'admin@example.com',
      password: process.env.DEV_ADMIN_PASSWORD || 'password123'
    },
    {
      role: 'user',
      name: 'Dev Customer',
      email: process.env.DEV_USER_EMAIL || 'user@example.com',
      password: process.env.DEV_USER_PASSWORD || 'password123'
    }
  ]

  for (const u of users) {
    const existing = await User.findOne({ email: u.email })
    if (existing) {
      console.log(`ℹ️   User exists: ${u.email} (${u.role}) - Skipping`)
      continue
    }

    const hashed = await bcrypt.hash(u.password, 10)
    await User.create({
      name: u.name,
      email: u.email,
      password: hashed,
      role: u.role,
      status: 'active',
      isVerified: true,
      emailVerified: true
    })
    console.log(`✅  Created: ${u.email} (${u.role})`)
  }

  console.log('✨  Done')
  await mongoose.disconnect()
}

createDevUsers().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
