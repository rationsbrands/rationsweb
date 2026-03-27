import type { Request } from 'express'
import AuditLog from '../models/AuditLog'

export async function logAudit(req: Request | any, params: {
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, any>
  outcome?: 'SUCCESS' | 'DENIED' | 'ERROR'
}) {
  try {
    const user = (req as any)?.user
    const actorType: 'USER' | 'INTEGRATION' | 'SYSTEM' = user ? 'USER' : 'SYSTEM'
    const actorEmail = user?.email ?? null
    const actorId = user?._id ?? user?.id ?? null

    const ipAddress = (req as any)?.ip
    const userAgent = String((req as any)?.headers?.['user-agent'] || '')
    const requestId = (req as any)?.id

    const safeMetadata = redactMetadata(params.metadata || {})

    await AuditLog.create({
      actorType,
      actorUserId: actorType === 'USER' ? (actorId as any) : null,
      actorId,
      actorEmail,
      actorRole: user?.role || '',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: safeMetadata,
      ipAddress,
      userAgent,
      outcome: params.outcome || 'SUCCESS',
      requestId,
      // Back-compat mirror
      entity: params.entityType,
      performedBy: actorType === 'USER' ? (actorId as any) : undefined,
    } as any)
  } catch (err) {
    // swallow to avoid breaking user flows
    console.error('Audit log failure (RationsWeb)', err)
  }
}

function redactMetadata(obj: Record<string, any>) {
  const SENSITIVE_KEYS = ['password', 'token', 'secret', 'clientSecret', 'keyHash', 'apiKey', 'accessToken', 'refreshToken']
  const clone: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj || {})) {
    if (SENSITIVE_KEYS.some(s => s.toLowerCase() === k.toLowerCase())) {
      clone[k] = '[REDACTED]'
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      clone[k] = redactMetadata(v as any)
    } else {
      clone[k] = v
    }
  }
  return clone
}

