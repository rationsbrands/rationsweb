import '../bootstrapEnv'
import mongoose from 'mongoose'
import User from '../models/User'

async function run() {
  const uri = process.env.MONGODB_URI as string
  const conn = await mongoose.connect(uri)
  console.log(`Connected: ${conn.connection.name}`)

  const indexes = await User.collection.indexes()
  console.log('Indexes:', JSON.stringify(indexes, null, 2))
  
  await mongoose.disconnect()
}

run().catch(console.error)
