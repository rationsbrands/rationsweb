import jwt, { type Secret, type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env'

export function signAccess(user: { _id: any, role?: string, email?: string }) {
  const secret: Secret = env.JWT_ACCESS_SECRET
  const options: SignOptions = { expiresIn: env.ACCESS_TOKEN_TTL as any }
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role || 'user',
      email: user.email || undefined,
    },
    secret,
    options
  )
}

export function verifyAccess(token: string): { sub: string, role: string, email?: string } {
  const secret: Secret = env.JWT_ACCESS_SECRET
  return jwt.verify(token, secret) as any
}
