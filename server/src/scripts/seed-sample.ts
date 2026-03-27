import '../bootstrapEnv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User'
import MenuItem from '../models/MenuItem'
import Order from '../models/Order'
import CommunityPost from '../models/CommunityPost'

async function connectDB() {
  const uri = process.env.MONGODB_URI as string
  const conn = await mongoose.connect(uri)
  console.log(`Rationsweb Seed DB Connected: ${conn.connection.name}`)
}

async function run() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Production mode detected. Skipping sample seed.')
    return
  }
  await connectDB()


  // Fix indexes if needed
  try {
    const indexes = await User.collection.indexes()
    const emailIndex = indexes.find((i: any) => i.name === 'email_1')
    if (emailIndex) {
      console.log('Dropping legacy unique index on email...')
      await User.collection.dropIndex('email_1')
      console.log('Dropped email_1 index')
    }
  } catch (e) {
    console.log('Index check skipped or failed', e)
  }

  const password = 'password123'
  const hashed = await bcrypt.hash(password, 10)

  const sampleUsers = [
    { name: 'Sample Customer', email: 'customer@rations.ng', role: 'user' },
    { name: 'Sample Admin', email: 'admin@rations.ng', role: 'admin' },
    // Multi-tenant user
    { name: 'Multi Admin', email: 'multi@rations.ng', role: 'admin' },
  ]
  for (const u of sampleUsers) {
    let user = await User.findOne({ email: u.email })
    if (!user) {
      user = await User.create({ name: u.name, email: u.email, password: hashed, role: u.role as any })
      console.log(`Created user ${u.email}`)
    }
  }

  const menu = [
    { name: 'Suya Plate', price: 2500, category: 'Main' },
    { name: 'Palm Wine', price: 1200, category: 'Drinks' },
    { name: 'Pepper Soup', price: 2000, category: 'Starters' },
  ]
  for (const m of menu) {
    const exists = await MenuItem.findOne({ name: m.name })
    if (!exists) {
      await MenuItem.create({ name: m.name, price: m.price, category: m.category })
      console.log(`Created menu item ${m.name}`)
    }
  }

  const customer = await User.findOne({ email: 'customer@rations.ng' })
  const suya = await MenuItem.findOne({ name: 'Suya Plate' })
  const palmWine = await MenuItem.findOne({ name: 'Palm Wine' })
  if (customer && suya && palmWine) {
    const existing = await Order.findOne({ user: customer._id })
    if (!existing) {
      const total = (suya.price || 0) + (palmWine.price || 0)
      await Order.create({
        user: customer._id,
        items: [
          { menuItem: suya._id, quantity: 1, priceAtOrderTime: suya.price },
          { menuItem: palmWine._id, quantity: 1, priceAtOrderTime: palmWine.price },
        ],
        totalAmount: total,
        status: 'CREATED',
        paymentStatus: 'pending',
        orderType: 'pickup',
        customerNote: 'Please add extra pepper',
      } as any)
      console.log('Created sample order')
    }
  }

  const posts = [
    { title: 'Welcome to Rations Community', content: 'Share your food moments with us!', author: 'Rations Team' },
    { title: 'Weekend Specials', content: 'Try our Suya Plate and Palm Wine combo.', author: 'Rations Team' }
  ]
  for (const p of posts) {
    const exists = await CommunityPost.findOne({ title: p.title, deleted: false })
    if (!exists) {
      await CommunityPost.create({ title: p.title, content: p.content, author: p.author, status: 'published' })
      console.log(`Created post: ${p.title}`)
    }
  }

  console.log('Sample seed completed.')
  process.exit(0)
}

run().catch((err) => {
  console.error('Seed error', err)
  process.exit(1)
})
