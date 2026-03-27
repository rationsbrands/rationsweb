import '../bootstrapEnv'
import { connectDB } from '../db'
import mongoose from 'mongoose'
import MenuItem from '../models/MenuItem'
import Settings from '../models/Settings'

async function debugData() {
  await connectDB()
  
  console.log(`\n--- Debugging Data ---`)

  // 1. Single-store mode: branches removed

  // 2. Find Menu Items (Local)
  const menuItems = await MenuItem.find({})
  console.log(`\nLocal Menu Items: ${menuItems.length}`)
  menuItems.forEach(item => {
    console.log(`- ${item.name} (Avail: ${item.isAvailable}, Arch: ${item.archived})`)
  })

  // 3. Check Settings (Platform Integration)
  const settings: any = await Settings.findOne({})
  console.log('\nSettings:')
  if (settings) {
    console.log(`- Platform Integration Enabled: ${settings.platformIntegrationEnabled}`)
  } else {
    console.log('- No Settings document found.')
  }

  process.exit(0)
}

debugData().catch(console.error)
