
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

const disableUsers = async () => {
  await connectDB()

  const targetIds = [
    "694188dee286f39433537c62", // test@example.com
    "69423ca8ef33cdf4dd186ec4"  // rations.ng@gmail.com
  ]

  try {
    const result = await User.updateMany(
      { _id: { $in: targetIds } },
      {
        $set: {
          isDisabled: true,
          status: 'suspended',
          disabledReason: 'Automated cleanup: identified as test/demo account',
          disabledAt: new Date()
        }
      }
    )

    console.log(`Matched: ${result.matchedCount}`)
    console.log(`Modified: ${result.modifiedCount}`)
    
    // Verification
    const updated = await User.find({ _id: { $in: targetIds } })
    console.log(JSON.stringify(updated.map(u => ({ 
      email: u.email, 
      isDisabled: u.isDisabled, 
      status: u.status 
    })), null, 2))

    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

disableUsers()
