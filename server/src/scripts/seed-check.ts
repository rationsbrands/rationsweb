import '../bootstrapEnv'
import mongoose from 'mongoose'
import { connectDB } from '../db'
import bcrypt from 'bcryptjs'
import User from '../models/User'
import MenuItem from '../models/MenuItem'
import { IntegrationConnection } from '../models/IntegrationConnection'

const seedCheck = async () => {
  // PROD GUARD: Never run auto-seed in production
  if (process.env.NODE_ENV === 'production') {
    console.log('Production mode detected. Skipping auto-seed.')
    return
  }

  await connectDB()

  const email = 'rations.ng@gmail.com'
  const password = 'password123'
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)

  let user = await User.findOne({ email })

  if (user) {
    console.log(`User ${email} found. Updating password...`)
    user.password = hashedPassword
    user.role = 'owner'
    user.isDisabled = false
    user.status = 'active'
    await user.save()
    console.log('Password updated to: password123')
    
    // Verify immediately
    const isMatch = await bcrypt.compare(password, user.password)
    console.log('Immediate verification:', isMatch ? 'SUCCESS' : 'FAILED')
  } else {
    console.log(`User ${email} not found. Creating...`)
    user = await User.create({
      name: 'Rations Admin',
      email,
      password: hashedPassword,
      role: 'owner',
      phone: '+2349122058888'
    })
    console.log('User created with password: password123')
  }

  // Seed Menu Items
  const menuItems = [
    {
      name: 'Jollof Rice',
      description: 'Classic Nigerian smoky jollof rice',
      price: 2500,
      category: 'Rice',
      isAvailable: true,
      externalId: 'PLATFORM_ITEM_001'
    },
    {
      name: 'Fried Plantain',
      description: 'Sweet fried dodo',
      price: 1000,
      category: 'Sides',
      isAvailable: true,
      externalId: 'PLATFORM_ITEM_002'
    },
    {
      name: 'Grilled Chicken',
      description: 'Spicy peppered chicken leg',
      price: 3500,
      category: 'Protein',
      isAvailable: true,
      externalId: 'PLATFORM_ITEM_003'
    }
  ]

  console.log('Seeding menu items...')
  for (const item of menuItems) {
    const exists = await MenuItem.findOne({ name: item.name })
    if (!exists) {
      await MenuItem.create(item)
      console.log(`Created menu item: ${item.name}`)
    } else {
      // Update externalId if missing
      if (!exists.externalId) {
        exists.externalId = item.externalId
        await exists.save()
        console.log(`Updated menu item externalId: ${item.name}`)
      } else {
        console.log(`Menu item exists: ${item.name}`)
      }
    }
  }

  // Seed Platform Integration (Sync with ENV) - REMOVED
  // We no longer support ENV-based integration. Use UI to connect.
  /*
  if (process.env.PLATFORM_API_KEY && process.env.PLATFORM_BASE_URL) {
    console.log('Seeding Platform Integration from ENV...')
    await IntegrationConnection.findOneAndUpdate(
      { provider: 'platform' },
      {
        status: 'connected',
        platformBaseUrl: process.env.PLATFORM_BASE_URL,
        apiKeyEncrypted: { iv: 'ENV', content: 'MANAGED_BY_ENV', tag: 'ENV' },
        connectedAt: new Date(),
        updatedAt: new Date()
      },
      { upsert: true }
    )
    console.log('Platform Integration seeded as CONNECTED (Source: ENV)')
  }
  */

  console.log('Seed check complete')
  process.exit(0)
}

seedCheck()
