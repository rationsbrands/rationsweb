import '../bootstrapEnv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User'

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string)
    console.log(`Rationsweb Seed DB Connected: ${conn.connection.name}`)
  } catch (error: any) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

const seedUsers = async () => {
  // PROD GUARD
  if (process.env.NODE_ENV === 'production') {
    console.log('Production mode detected. Skipping user seed.')
    return
  }

  await connectDB()

  const password = 'password123'
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)

  // 2. Define Users to Seed
  const users = [
    {
      name: 'Rations Owner',
      email: 'rations.ng@gmail.com',
      role: 'owner',
      status: 'active',
      isDisabled: false
    },
    {
      name: 'Rations Admin',
      email: 'admin@rations.ng',
      role: 'admin',
      status: 'active',
      isDisabled: false
    },
    {
      name: 'Rations Manager',
      email: 'manager@rations.ng',
      role: 'manager',
      status: 'active',
      isDisabled: false
    },
    {
      name: 'Rations Staff',
      email: 'staff@rations.ng',
      role: 'staff',
      status: 'active',
      isDisabled: false
    },
    {
      name: 'Suspended User',
      email: 'suspended@rations.ng',
      role: 'user',
      status: 'suspended',
      isDisabled: true
    }
  ]

  console.log('Seeding users...')

  for (const u of users) {
    let user = await User.findOne({ email: u.email })
    if (user) {
        console.log(`Updating existing user: ${u.email}`)
        user.password = hashedPassword
        user.role = u.role as any
        user.status = u.status as any
        user.isDisabled = u.isDisabled
        await user.save()
    } else {
        console.log(`Creating new user: ${u.email}`)
        await User.create({
            name: u.name,
            email: u.email,
            password: hashedPassword,
            role: u.role as any,
            status: u.status as any,
            isDisabled: u.isDisabled,
            phone: `+234${Math.floor(1000000000 + Math.random() * 9000000000)}` // Random phone
        })
    }
  }

  console.log('User seeding completed.')
  process.exit(0)
}

seedUsers()
