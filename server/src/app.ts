import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import { env } from './config/env'

// Routes
import publicRoutes from './routes/public'
import adminRoutes from './routes/admin'
import authRoutes from './routes/auth'
import userRoutes from './routes/user'
import webhookRoutes from './routes/webhooks'
import socialRoutes from './routes/social'
import addressRoutes from './routes/addresses'
import integrationsHubRoutes from './routes/integrationsHub'
import integrationDiagnosticsRouter from './routes/integrationDiagnostics'

const app = express()

// Security & Middleware
app.disable('x-powered-by')
app.use(helmet())
app.use(cookieParser())

// Logging
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// CORS
const allowlist = env.CLIENT_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
const isDev = env.NODE_ENV !== 'production'
const devAllow = new Set([
  'http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000',
  'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:3000', 
  'https://rationsfood-client.vercel.app', 'https://rationsfood-admin.vercel.app',
  'https://rationsfood.vercel.app', 'https://www.rationsfood.com', 
  'https://rationsfood.com', 'https://admin.rationsfood.com',
  'https://api.rationsfood.com', 
])

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (isDev && devAllow.has(origin)) return cb(null, true)
    if (allowlist.length === 0 || allowlist.includes('*')) return cb(null, true)
    if (allowlist.includes(origin)) return cb(null, true)
    return cb(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Platform-Key', 'x-platform-key', 'x-api-key'],
}))

// Webhooks - Raw Body Handling
app.use('/api/webhooks', express.raw({ type: '*/*' }))
app.use('/api/webhooks', (req: any, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    req.rawBody = req.body.toString('utf8')
    try { req.body = JSON.parse(req.rawBody) } catch { req.body = {} }
  } else {
    req.rawBody = ''
  }
  next()
})

// Standard JSON Parsing
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf?.toString('utf8') || ''
  }
}))

// Rate Limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200, // Higher limit for general API
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', limiter)

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // Strict for auth
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/auth', authLimiter)

// Health Checks
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'rationsfood-api', timestamp: new Date() }))
app.get('/ready', (_req, res) => {
  // We need to import mongoose to check state, or pass it in? 
  // Importing mongoose here is fine.
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState
  res.status(dbState === 1 ? 200 : 503).json({ 
    status: dbState === 1 ? 'ready' : 'not_ready',
    dbState 
  })
})

// API Routes
app.use('/api/public', publicRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/social', socialRoutes)
app.use('/api/addresses', addressRoutes)
app.use('/api/integrations', integrationsHubRoutes)
app.use('/api/diagnostics', integrationDiagnosticsRouter)

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }))

// Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  ;(res as any).status(err.status || 500).json({
    error: env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  })
})

export default app
