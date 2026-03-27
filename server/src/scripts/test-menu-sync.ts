import '../bootstrapEnv'
import mongoose from 'mongoose'
import MenuItem from '../models/MenuItem'
import { platformClient } from '../integrations/platformClient'
import { env } from '../config/env'

async function testSync() {
  await mongoose.connect(env.MONGODB_URI)
  console.log('Connected to DB')

  // Reload config to ensure we have latest connection details
  platformClient.reloadConfig()
  
  // Wait a bit for reload
  await new Promise(r => setTimeout(r, 1000))

  const items = await MenuItem.find({ archived: { $ne: true } })
  console.log(`Found ${items.length} menu items to sync.`)

  if (items.length === 0) {
    console.log('No items to sync. Creating a test item...')
    const testItem = await MenuItem.create({
      name: 'Sync Test Burger',
      description: 'Created by test script',
      price: 1500,
      category: 'Burgers',
      isAvailable: true,
      imageUrl: 'https://via.placeholder.com/150'
    })
    items.push(testItem)
  }

  const payload = items.map((item: any) => ({
    externalId: item._id.toString(),
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    imageUrl: item.imageUrl,
    isAvailable: item.isAvailable,
  }))

  console.log('Sending payload to Platform...')
  try {
    const result = await platformClient.syncMenu(payload)
    console.log('Sync Result:', JSON.stringify(result, null, 2))
  } catch (err: any) {
    console.error('Sync Failed:', err.message)
    if (err.response) {
      console.error('Response Status:', err.response.status)
      console.error('Response Data:', JSON.stringify(err.response.data, null, 2))
    }
  }

  await mongoose.disconnect()
}

testSync().catch(console.error)
