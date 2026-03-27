import express from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import User from '../models/User'
import RefreshToken from '../models/RefreshToken'
import { signAccess, verifyAccess } from '../utils/jwt'
import { randomToken, sha256 } from '../utils/crypto'
import { protect } from '../middleware/auth'
import { env } from '../config/env'
import AuditLog from '../models/AuditLog'
import { logAudit } from '../utils/auditLogger'
import InviteToken from '../models/InviteToken'
import PasswordResetToken from '../models/PasswordResetToken'
// NOTE: using 'any' for req/res to avoid strict typing issues with Express

const router = express.Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many auth attempts. Try again later.' },
})

const cookieOptions = (days: number) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: days * 24 * 60 * 60 * 1000,
})

const normalizeEmail = (v: string) => v.trim().toLowerCase()
const normalizeIdentifier = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

router.get('/ping', (_req, res) => res.json({ ok: true }))

router.get('/me', async (req: any, res) => {
  const header = String(req.headers.authorization || '')
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json({ ok: false, message: 'Not authorized' })
  try {
    const payload: any = verifyAccess(token)
    const user: any = await User.findById(payload.sub).select('-password')
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' })
    return res.json({ ok: true, user: { id: user._id, name: user.name, email: user.email, role: user.role || 'user' } })
  } catch {
    return res.status(401).json({ ok: false, message: 'Invalid token' })
  }
})

const registerHandler = async (req: any, res: any) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const emailRaw = typeof req.body?.email === 'string' ? req.body.email : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  
  if (!name || !emailRaw || !password) return res.status(400).json({ ok: false, message: 'name, email, password are required' })
  if (password.length < 8) return res.status(400).json({ ok: false, message: 'Password must be at least 8 characters' })

  const email = normalizeEmail(emailRaw)
  const exists = await User.findOne({ email })
  if (exists) return res.status(409).json({ ok: false, message: 'Email already exists' })
  
  // First user is owner
  const isFirstUser = (await User.countDocuments({})) === 0
  const role = isFirstUser ? 'owner' : 'user'

  const hashed = await bcrypt.hash(password, 10)
  const user: any = await User.create({
    name,
    email,
    password: hashed,
    role,
  })

  return res.status(201).json({ ok: true, user: { id: user._id, name: user.name, email: user.email, role: user.role || 'user' } })
}

router.post('/register', authLimiter, registerHandler)
router.post('/signup', authLimiter, registerHandler)

router.post('/login', authLimiter, async (req, res) => {
  const emailRaw = typeof req.body?.email === 'string' ? req.body.email : (typeof req.body?.identifier === 'string' ? req.body.identifier : '')
  const email = normalizeEmail(emailRaw)
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!email || !password) return res.status(400).json({ ok: false, message: 'email and password are required' })
  
  // Single tenant: login by email only
  const user: any = await User.findOne({ email })
  if (!user) return res.status(401).json({ ok: false, message: 'Invalid credentials' })
  if (String(user.status || '').toLowerCase() !== 'active' || Boolean(user.isDisabled)) {
    return res.status(403).json({ ok: false, message: 'User inactive' })
  }
 
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ ok: false, message: 'Invalid credentials' })

  const accessToken = signAccess(user)
  const refreshToken = randomToken()
  const tokenHash = sha256(refreshToken)
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)

  await RefreshToken.create({ userId: user._id, tokenHash, expiresAt })
  ;(res as any).cookie('refreshToken', refreshToken, cookieOptions(env.REFRESH_TOKEN_TTL_DAYS))

  const responseUser = { id: user._id, name: user.name, email: user.email, role: user.role || 'user' }
  try {
    const action = ['owner','admin','manager'].includes(String(user.role || '').toLowerCase()) ? 'ADMIN_LOGIN' : 'USER_LOGIN'
    await logAudit(req as any, {
      action,
      entityType: 'user',
      entityId: String(user._id),
      metadata: { email: user.email }
    })
  } catch {}
  return res.json({ ok: true, accessToken, user: responseUser })
})

router.post('/accept-invite', authLimiter, async (req: any, res) => {
  try {
    const token = String(req.body?.token || '')
    const name = String(req.body?.name || '').trim()
    const password = String(req.body?.password || '')
    if (!token || !name || !password) return res.status(400).json({ ok: false, message: 'token, name, password are required' })
    if (password.length < 8) return res.status(400).json({ ok: false, message: 'Password must be at least 8 characters' })
    const h = sha256(token)
    const invite: any = await InviteToken.findOne({ tokenHash: h, usedAt: null, expiresAt: { $gt: new Date() } })
    if (!invite) return res.status(400).json({ ok: false, message: 'Invalid or expired invite token' })
    const existing = await User.findOne({ email: invite.email })
    if (existing) return res.status(409).json({ ok: false, message: 'Account already exists' })
    const hashed = await bcrypt.hash(password, 10)
    const user: any = await User.create({
      name,
      email: invite.email,
      password: hashed,
      role: invite.role || 'user',
      isVerified: true,
      emailVerified: true,
      status: 'active'
    })
    invite.usedAt = new Date()
    await invite.save()
    const accessToken = signAccess(user)
    const refreshToken = randomToken()
    const tokenHash = sha256(refreshToken)
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
    await RefreshToken.create({ userId: user._id, tokenHash, expiresAt })
    ;(res as any).cookie('refreshToken', refreshToken, cookieOptions(env.REFRESH_TOKEN_TTL_DAYS))
    return res.json({ ok: true, accessToken, user: { id: user._id, name: user.name, email: user.email, role: user.role || 'user' } })
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'Accept invite failed' })
  }
})

router.post('/forgot-password', authLimiter, async (req: any, res) => {
  try {
    const emailRaw = String(req.body?.email || '')
    const email = emailRaw.trim().toLowerCase()
    if (email) {
      const user = await User.findOne({ email })
      if (user) {
        const token = randomToken()
        const h = sha256(token)
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
        await PasswordResetToken.create({ userId: user._id, tokenHash: h, expiresAt })
        const host = String(req.headers.host || '')
        const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
        const link = `${proto}://${host}/reset-password?token=${encodeURIComponent(token)}`
        // Securely emit to email delivery service here.

      }
    }
  } catch {}
  return res.status(200).json({ ok: true, message: 'If an account exists, a reset link has been sent.' })
})

router.post('/reset-password', authLimiter, async (req: any, res) => {
  try {
    const token = String(req.body?.token || '')
    const newPassword = String(req.body?.newPassword || req.body?.password || '')
    if (!token || !newPassword) return res.status(400).json({ ok: false, message: 'token and newPassword are required' })
    if (newPassword.length < 8) return res.status(400).json({ ok: false, message: 'Password must be at least 8 characters' })
    const h = sha256(token)
    const rec: any = await PasswordResetToken.findOne({ tokenHash: h, usedAt: null, expiresAt: { $gt: new Date() } })
    if (!rec) return res.status(400).json({ ok: false, message: 'Invalid or expired reset token' })
    const user = await User.findById(rec.userId)
    if (!user) return res.status(400).json({ ok: false, message: 'Invalid reset token' })
    user.password = await bcrypt.hash(newPassword, 10)
    user.tokenVersion = Number(user.tokenVersion || 0) + 1
    await user.save()
    rec.usedAt = new Date()
    await rec.save()
    await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } })
    return res.json({ ok: true, message: 'Password reset successful' })
  } catch {
    return res.status(400).json({ ok: false, message: 'Unable to reset password' })
  }
})

router.post('/refresh', authLimiter, async (req: any, res) => {
  try {
    const token = String(req.cookies?.refreshToken || '')
    if (!token) return res.status(401).json({ ok: false, message: 'Missing refresh token' })
    const oldHash = sha256(token)
    const record: any = await RefreshToken.findOne({
      tokenHash: oldHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
    if (!record) return res.status(401).json({ ok: false, message: 'Invalid refresh token' })
    const user: any = await User.findById(record.userId)
    if (!user) return res.status(401).json({ ok: false, message: 'Invalid refresh token' })
    const newToken = randomToken()
    const newHash = sha256(newToken)
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
    await RefreshToken.create({ userId: user._id, tokenHash: newHash, expiresAt })
    record.revokedAt = new Date()
    record.replacedByHash = newHash
    await record.save()
    const accessToken = signAccess(user)
    ;(res as any).cookie('refreshToken', newToken, cookieOptions(env.REFRESH_TOKEN_TTL_DAYS))
    return res.json({ ok: true, accessToken })
  } catch {
    return res.status(401).json({ ok: false, message: 'Refresh failed' })
  }
})

router.post('/logout', authLimiter, async (req: any, res) => {
  try {
    const token = String(req.cookies?.refreshToken || '')
    if (token) {
      const h = sha256(token)
      await RefreshToken.updateOne({ tokenHash: h, revokedAt: null }, { $set: { revokedAt: new Date() } })
    }
    try {
      const header = String(req.headers.authorization || '')
      const jwt = header.startsWith('Bearer ') ? header.slice(7) : ''
      if (jwt) {
        const payload: any = verifyAccess(jwt)
        await logAudit(req, {
          action: 'USER_LOGOUT',
          entityType: 'user',
          entityId: String(payload.sub || ''),
          metadata: {},
        })
      }
    } catch {}
  } catch {}
  res.clearCookie('refreshToken', cookieOptions(env.REFRESH_TOKEN_TTL_DAYS))
  return res.json({ ok: true })
})

router.post('/mfa/setup', protect, async (req: any, res) => {
  return res.status(501).json({ success: false, message: 'MFA setup not yet implemented on server' })
})

router.post('/mfa/verify', protect, async (req: any, res) => {
  return res.status(501).json({ success: false, message: 'MFA verify not yet implemented on server' })
})

export default router
