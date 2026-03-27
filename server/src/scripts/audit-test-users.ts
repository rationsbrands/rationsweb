
import '../bootstrapEnv'
import mongoose from 'mongoose'
import User from '../models/User'

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string)
    console.log(`Connected to: ${conn.connection.name}`)
  } catch (error: any) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

const auditUsers = async () => {
  await connectDB()

  try {
    const allUsers = await User.find({})
    const testUsers = []

    const testDomains = ['local.test', 'example.com', 'test.com']
    const testKeywords = ['test', 'demo', 'seed', 'dev']
    const knownSeeds = ['rations.ng@gmail.com']

    for (const user of allUsers) {
      const email = user.email || ''
      const lowerEmail = email.toLowerCase()
      let reasons: string[] = []

      // Check Domains
      if (testDomains.some(d => lowerEmail.endsWith('@' + d))) {
        reasons.push('Test Domain Match')
      }

      // Check Keywords
      if (testKeywords.some(k => lowerEmail.includes(k))) {
        reasons.push(`Keyword Match: ${testKeywords.find(k => lowerEmail.includes(k))}`)
      }

      // Check Known Seeds
      if (knownSeeds.includes(lowerEmail)) {
        reasons.push('Known Seed Account')
      }

      if (reasons.length > 0) {
        testUsers.push({
          _id: user._id,
          email: user.email,
          role: user.role,
          reasons
        })
      }
    }

    console.log(JSON.stringify(testUsers, null, 2))
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

auditUsers()
