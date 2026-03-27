
import dotenv from 'dotenv'
import '../bootstrapEnv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import path from 'path'
import User from '../models/User'

const createAdmin = async () => {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME || 'System Admin'

  if (!email || !password) {
    console.error('Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run create-admin')
    process.exit(1)
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI as string)
    console.log(`Connected to DB: ${mongoose.connection.name}`)

    const exists = await User.findOne({ email: email.toLowerCase() })
    if (exists) {
      console.log(`User ${email} already exists. Updating role to admin...`)
      exists.role = 'admin'
      await exists.save()
      console.log('Role updated.')
    } else {
      console.log(`Creating new admin: ${email}`)
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(password, salt)
      
      await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        emailVerified: true
      })
      console.log('Admin user created successfully.')
    }
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

createAdmin()
