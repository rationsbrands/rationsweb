import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import User from '../models/User'

export const protect = async (req: any, res: any, next: any) => {
  try {
    const header = String(req.headers.authorization || '')
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token', code: 'NO_TOKEN' })
    }

    const token = header.split(' ')[1]
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token', code: 'NO_TOKEN' })
    }

    const decoded: any = jwt.verify(token, env.JWT_ACCESS_SECRET)

    const userId = decoded?.sub || decoded?.id
    if (!userId) {
      return res.status(401).json({ message: 'Not authorized, token failed', code: 'INVALID_TOKEN' })
    }

    const userDoc: any = await User.findById(userId).select('-password')
    if (!userDoc) {
      return res.status(401).json({ message: 'Not authorized, user not found', code: 'USER_NOT_FOUND' })
    }

    const userObj = userDoc.toObject()

    // ✅ Normalize what the rest of the app expects (OAuth cookie/session, etc.)
    const normalizedUser = {
      ...userObj,
      id: String(userDoc._id),
      businessId: userObj.businessId ? String(userObj.businessId) : (decoded?.businessId ? String(decoded.businessId) : undefined),
      email: decoded?.email ?? userObj.email,
      role: decoded?.role ?? userObj.role,
    }

    req.user = normalizedUser

    // ✅ If you also use req.businessId elsewhere
    if (normalizedUser.businessId) req.businessId = normalizedUser.businessId

    return next()
  } catch (_error) {
    return res.status(401).json({ message: 'Not authorized, token failed', code: 'INVALID_TOKEN' })
  }
}

export const authorize = (...roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found', code: 'NO_USER' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`,
        code: 'FORBIDDEN',
      })
    }

    return next()
  }
}
