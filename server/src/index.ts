import './bootstrapEnv'
import mongoose from 'mongoose'
import { connectDB } from './db'
import { env } from './config/env'
import app from './app'

// Integrations & Jobs
import { platformClient } from './integrations/platformClient'
import { startSocialSyncJob } from './jobs/socialSync'
import { startOrderSyncWorker } from './jobs/orderSyncWorker'

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('FATAL: UNCAUGHT EXCEPTION:', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('FATAL: UNHANDLED REJECTION:', reason)
})

const startServer = async () => {
  await connectDB()

  // Initialize Clients
  platformClient.reloadConfig()

  // Background Jobs
  const socialEnabled = env.SOCIAL_SYNC_ENABLED === 'true' || 
    (env.NODE_ENV !== 'production' && env.SOCIAL_SYNC_ENABLED !== 'false')

  if (socialEnabled) {
    startSocialSyncJob()
  } else {
    console.log('Social Sync Job disabled')
  }
  startOrderSyncWorker()

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 RationsWeb Server running on port ${env.PORT} in ${env.NODE_ENV} mode`)
  })

  // Graceful Shutdown
  const shutdown = () => {
    console.log('SIGTERM received, shutting down gracefully...')
    server.close(() => {
      console.log('HTTP server closed')
      mongoose.connection.close(false).then(() => {
        console.log('MongoDB connection closed')
        process.exit(0)
      })
    })
    
    // Force close after 10s
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down')
      process.exit(1)
    }, 10000)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

startServer()
