
import '../bootstrapEnv'
import mongoose from 'mongoose'
import Settings from '../models/Settings'
import { IntegrationConnection } from '../models/IntegrationConnection'
import MenuItem from '../models/MenuItem'
import { platformClient } from '../integrations/platformClient'
import Order from '../models/Order'
import OrderSyncQueue from '../models/OrderSyncQueue'
import { processJob } from '../jobs/orderSyncWorker'

import jwt from 'jsonwebtoken'

async function run() {
  const uri = process.env.MONGODB_URI as string
  await mongoose.connect(uri)
  console.log('Connected to DB')

  // 1. Check Integration Connection
  const conn = await IntegrationConnection.findOne({ provider: 'platform' })
  if (!conn) {
    console.log('❌ No platform integration connection found.')
    process.exit(0)
  }

  // FORCE UPDATE BASE URL TO 6006 (My fresh server)
  if (conn.platformBaseUrl !== 'http://localhost:6006') {
      console.log('🛠  Updating platformBaseUrl to http://localhost:6006...')
      conn.platformBaseUrl = 'http://localhost:6006'
      await conn.save()
  }

  console.log('Integration Connection:', {
    status: conn.status,
    features: conn.features,
    baseUrl: conn.platformBaseUrl
  })

  // FORCE ENABLE FEATURES for troubleshooting
  if (!conn.features.orders || !conn.features.catalog) {
      console.log('🛠  Force enabling integration features (orders, catalog)...')
      conn.features.orders = true
      conn.features.catalog = true
      await conn.save()
      console.log('✅ Integration features enabled.')
  }

  if (conn.status !== 'connected') {
    console.log('❌ Integration is not connected.')
    process.exit(0)
  }

  // 2. Check Global Settings
  let settings = await Settings.findOne({})
  if (!settings) {
    console.log('⚠️ No global settings found. Creating default...')
    settings = await Settings.create({})
  }

  console.log('Global Settings Platform Config:', settings.platform)

  // 3. Fix Settings Mismatch
  let settingsChanged = false
  if (conn.features.orders && !settings.platform?.syncOrders) {
    console.log('🛠  Enabling syncOrders in global settings to match integration connection...')
    if (!settings.platform) settings.platform = {} as any
    settings.platform!.syncOrders = true
    settingsChanged = true
  }
  if (conn.features.catalog && !settings.platform?.syncMenu) {
    console.log('🛠  Enabling syncMenu in global settings to match integration connection...')
    if (!settings.platform) settings.platform = {} as any
    settings.platform!.syncMenu = true
    settingsChanged = true
  }

  if (settingsChanged) {
    await settings.save()
    console.log('✅ Global settings updated.')
  } else {
    console.log('✅ Global settings match integration features.')
  }

  // DEBUG: Check Token
  console.log('🔍 Debugging Auth Token...')
  const config = await platformClient.debugConfig()
  console.log('Platform Config:', JSON.stringify({ ...config, apiKey: config.apiKey ? '***' : undefined, clientSecret: config.clientSecret ? '***' : undefined }, null, 2))

  if (config.authMethod === 'oauth_client_credentials') {
      // ... (existing code)
  } else if (config.authMethod === 'oauth_authorization_code') {
      console.log('Auth method is oauth_authorization_code. Attempting to refresh token...')
      const token = await platformClient.debugRefresh()
      if (token) {
        console.log('Token refreshed. Decoding...')
        const decoded = jwt.decode(token)
        console.log('Decoded Payload:', JSON.stringify(decoded, null, 2))

        // Verify with KNOWN Platform Secret (from platform/.env)
        const SECRET = 'c05261e4123df1e3827c4ac145e33ffe13f78ae6e1d5e4d8908802c23f181e18f6e965a801caed249193ce80bbb10af8284700be25ac634641177838296ed5a5'
        try {
            jwt.verify(token, SECRET)
            console.log('✅ Token signature is VALID using Platform JWT_SECRET.')
        } catch (e: any) {
            console.error('❌ Token signature verification FAILED with Platform JWT_SECRET:', e.message)
        }
      } else {
        console.error('❌ Failed to refresh token.')
      }
  } else {
      console.log(`Auth method is ${config.authMethod}, skipping OAuth token debug.`)
  }

  // 4. Force Menu Sync (Upsert all items)
  console.log('🔄 Starting full menu sync...')
  const menuItems = await MenuItem.find({ isDeleted: { $ne: true } })
  console.log(`Found ${menuItems.length} active menu items.`)

  const payload = menuItems.map(item => ({
    externalId: item.externalId || `rweb_menu_${item._id}`,
    name: item.name,
    category: item.category,
    price: item.price,
    // Validate imageUrl: must be absolute URL
    imageUrl: (item.imageUrl && item.imageUrl.startsWith('http')) ? item.imageUrl : undefined,
    isAvailable: item.isAvailable
  }))

  try {
      const res = await platformClient.upsertCatalog(payload)
      console.log('✅ Menu sync request sent successfully.')
      console.log('Response:', JSON.stringify(res, null, 2))
  } catch (e: any) {
      console.error('❌ Menu sync request FAILED:', e.message)
      if (e.response) {
          console.error('Status:', e.response.status)
          console.error('Data:', JSON.stringify(e.response.data, null, 2))
      }
  }

  // 5. Enqueue Pending Orders (Last 24 hours)
  console.log('🔄 Checking for unsynced orders (last 24h)...')
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const orders = await Order.find({
    createdAt: { $gte: yesterday },
    $or: [
        { platformStatus: 'PENDING' },
        { platformStatus: 'FAILED' },
        { platformStatus: { $exists: false } }
    ],
    status: { $ne: 'CANCELLED' }
  })

  console.log(`Found ${orders.length} orders to sync.`)

  for (const order of orders) {
    // Check if job exists
    let job = await OrderSyncQueue.findOne({ 
        orderId: order._id, 
        status: { $in: ['PENDING', 'RUNNING'] } 
    })
    
    if (!job) {
        job = await OrderSyncQueue.create({
            orderId: order._id,
            action: 'PUSH',
            status: 'PENDING',
            attempts: 0,
            nextRunAt: new Date()
        })
        console.log(`   + Enqueued order ${order._id}`)
    } else {
        console.log(`   . Order ${order._id} already has pending job`)
    }
    
    // Process Immediately
    if (job) {
        console.log(`   > Processing job for order ${order._id}...`)
        await processJob(job)
        
        // Reload job to check status
        const refreshedJob = await OrderSyncQueue.findById(job._id)
        console.log(`     Result: ${refreshedJob?.status} (${refreshedJob?.lastError || 'No Error'})`)
    }
  }

  console.log('Done.')
  
  // 6. Check Queue Status
  const queue = await OrderSyncQueue.find({ status: { $in: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'] } }).sort({ updatedAt: -1 }).limit(5)
  console.log('Recent Queue Items:')
  queue.forEach(q => console.log(` - Order ${q.orderId}: ${q.status} (Attempts: ${q.attempts}) Last error: ${q.lastError || 'none'}`))
  
  process.exit(0)
}

run().catch(console.error)
