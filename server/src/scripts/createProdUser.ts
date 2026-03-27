import '../bootstrapEnv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { connectDB } from '../db'
import User from '../models/User'
import { isDev } from '../config/env'

const createProdUser = async () => {
  // Enforce production mode check if strictly required, but usually we allow 
  // manual "prod-like" creation in any env if variables are explicit.
  // However, the prompt says "Runs ONLY in PROD (abort if isDev)".
  if (isDev) {
    console.error('❌  ABORTING: This script is for PRODUCTION only (NODE_ENV=production).')
    process.exit(1)
  }

  const email = process.env.EMAIL
  const password = process.env.PASSWORD
  const role = process.env.ROLE
  const name = process.env.NAME || 'Admin User'

  if (!email || !password || !role) {
    console.error('❌  Missing required env vars: EMAIL, PASSWORD, ROLE')
    console.error('Usage: EMAIL=... PASSWORD=... ROLE=... npm run user:create:prod')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('❌  Password too short (min 8 chars)')
    process.exit(1)
  }

  const allowedRoles = ['user', 'owner', 'admin', 'manager', 'cashier', 'kitchen', 'staff']
  if (!allowedRoles.includes(role)) {
    console.error(`❌  Invalid role. Allowed: ${allowedRoles.join(', ')}`)
    process.exit(1)
  }

  console.log(`🔧  Creating PROD user: ${email} role=${role}`)
  await connectDB()

  const existing = await User.findOne({ email })
  if (existing) {
    console.log(`⚠️   User already exists: ${email} - Aborting to prevent overwrite`)
    await mongoose.disconnect()
    process.exit(0)
  }

  const hashed = await bcrypt.hash(password, 10)
  await User.create({
    name,
    email,
    password: hashed,
    role,
    status: 'active',
    isVerified: true,
    emailVerified: true
  })

  console.log(`✅  Successfully created user: ${email}`)
  await mongoose.disconnect()
}

createProdUser().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
