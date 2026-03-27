import '../bootstrapEnv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import User from '../models/User'

const DOCS_PATH = path.join(__dirname, '../../../docs/RWEB_TEST_USERS.md')

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string)
    console.log(`Rationsweb DB Connected: ${conn.connection.name}`)
    console.log(`Host: ${conn.connection.host}`)
    return conn
  } catch (error: any) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

const generatePassword = () => {
  return crypto.randomBytes(8).toString('hex') + 'A1!' // Ensure complexity
}

const isTestUser = (user: any) => {
  const email = user.email.toLowerCase()
  const name = user.name.toLowerCase()
  
  // 1. Strict Domains
  if (email.endsWith('@local.test') || email.endsWith('@example.com') || email.endsWith('@test.com')) return true
  
  // 2. Keywords in email/name
  const keywords = ['test', 'demo', 'seed', 'dummy']
  if (keywords.some(k => email.includes(k) || name.includes(k))) return true
  
  return false
}

const setupTestUsers = async () => {
  console.log('--- STARTING TEST USER SETUP ---')
  
  // 1. Determine Env
  const isProd = process.env.NODE_ENV === 'production'
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  
  if (isProd) {
    console.error('CRITICAL: PRODUCTION DETECTED. SKIPPING DESTRUCTIVE ACTIONS.')
    console.error('Please manually verify users if needed.')
    process.exit(0)
  }

  await connectDB()

  // 2. Find and Clean Test Users
  console.log('\n--- CLEANING TEST USERS ---')
  const allUsers = await User.find({})
  const testUsers = allUsers.filter(isTestUser)
  
  console.log(`Found ${testUsers.length} test user candidates.`)
  
  for (const user of testUsers) {
    console.log(`Deleting test user: ${user.email} (${user._id})`)
    await User.findByIdAndDelete(user._id)
  }

  // 3. Create New Test Users
  console.log('\n--- CREATING NEW TEST USERS ---')
  
  const testAccounts = [
    { role: 'user', email: 'customer1@local.test', name: 'Test Customer' },
    { role: 'admin', email: 'admin1@local.test', name: 'Test Admin' }, // Admin/Owner mapped to admin for simplicity
    { role: 'staff', email: 'staff1@local.test', name: 'Test Staff' }
  ]

  const credentials: string[] = []
  credentials.push('# RationsWeb Test Users (NON-PROD ONLY)')
  credentials.push(`Generated: ${new Date().toISOString()}`)
  credentials.push('')
  credentials.push('| Role | Email | Password | Name |')
  credentials.push('|---|---|---|---|')

  for (const acc of testAccounts) {
    const rawPassword = generatePassword()
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(rawPassword, salt)

    const user = await User.create({
      name: acc.name,
      email: acc.email,
      password: hashedPassword,
      role: acc.role,
      status: 'active',
      isVerified: true,
      emailVerified: true
    })
    
    console.log(`Created ${acc.role}: ${acc.email}`)
    credentials.push(`| ${acc.role} | ${acc.email} | \`${rawPassword}\` | ${acc.name} |`)
  }

  // 5. Write Credentials to File
  fs.writeFileSync(DOCS_PATH, credentials.join('\n'))
  console.log(`\n✅ Credentials written to ${DOCS_PATH}`)
  console.log('⚠️  DO NOT COMMIT THIS FILE ⚠️')

  console.log('\n--- DONE ---')
  process.exit(0)
}

setupTestUsers()
