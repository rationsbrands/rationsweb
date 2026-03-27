import express from 'express'
import axios from 'axios'
import crypto from 'crypto'
import Integration from '../models/Integration'
import IntegrationLog from '../models/IntegrationLog'
import { IntegrationConnection } from '../models/IntegrationConnection'
import { authorize, protect } from '../middleware/auth'
import { encrypt, EncryptedData, decrypt } from '../utils/encryption'
import { logAudit } from '../utils/auditLogger'

const router = express.Router()

const PROVIDERS = ['platform', 'instagram', 'x', 'youtube'] as const
type Provider = typeof PROVIDERS[number]

type PlatformAuthMethod = 'api_key' | 'oauth_client_credentials' | 'oauth_authorization_code'

function normalizeBaseUrl(baseUrl: string) {
  const b = String(baseUrl || '').trim()
  return b.replace(/\/+$/, '')
}

function isPlatformApiKeyLike(v: string) {
  // Expected: iak_<keyId>.<secret>
  return /^iak_[A-Za-z0-9]+?\.[A-Za-z0-9\-_]+$/.test(v)
}

function getSensitiveKeys(provider: Provider): string[] {
  switch (provider) {
    case 'platform':
      // stored encrypted in secretsEncrypted (never in config)
      return ['apiKey', 'clientSecret', 'webhookSecret', 'accessToken', 'refreshToken']
    case 'instagram':
      return ['accessToken', 'clientSecret']
    case 'x':
      return ['apiKey', 'apiSecret', 'accessToken', 'accessTokenSecret']
    case 'youtube':
      return ['apiKey', 'clientSecret']
    default:
      return []
  }
}

function redactConfig(provider: Provider, cfg: any, secretsEncrypted: Record<string, EncryptedData>) {
  const redacted: any = { ...(cfg || {}) }
  const secretKeys = getSensitiveKeys(provider)

  // If any secret accidentally found inside config, redact it
  secretKeys.forEach((k) => {
    if (k in redacted) redacted[k] = undefined
  })

  const flags: any = {}
  Object.keys(secretsEncrypted || {}).forEach((k) => {
    flags[`has_${k}`] = true
  })

  return { config: redacted, flags }
}

function maybeEncryptSecrets(provider: Provider, cfg: any): { config: any; secretsEncrypted: Record<string, EncryptedData> } {
  const secretKeys = getSensitiveKeys(provider)
  const secretsEncrypted: Record<string, EncryptedData> = {}
  const out: any = { ...(cfg || {}) }

  secretKeys.forEach((k) => {
    if (out[k]) {
      secretsEncrypted[k] = encrypt(String(out[k]))
      delete out[k]
    }
  })

  return { config: out, secretsEncrypted }
}

function decryptSecret(doc: any, key: string): string {
  try {
    const enc = doc?.secretsEncrypted?.[key]
    if (enc?.content) return String(decrypt(enc) || '').trim()
  } catch {}
  return ''
}

async function resolvePlatformApiKey(doc: any) {
  // Priority: DB stored encrypted key, then ENV
  const k = decryptSecret(doc, 'apiKey')
  if (k) return k
  return String(process.env.PLATFORM_API_KEY || '').trim()
}

async function resolvePlatformClientId(doc: any) {
  // clientId is not a secret; keep in config/env
  return String(doc?.config?.platformClientId || process.env.PLATFORM_OAUTH_CLIENT_ID || '').trim()
}

async function resolvePlatformClientSecret(doc: any) {
  // secret should be encrypted (or fallback to env)
  const v = decryptSecret(doc, 'clientSecret')
  if (v) return v
  return String(process.env.PLATFORM_OAUTH_CLIENT_SECRET || '').trim()
}

function getPlatformAuthMethod(doc: any): PlatformAuthMethod {
  const m = String(doc?.config?.platformAuthMethod || '').trim()
  if (m === 'oauth_client_credentials') return 'oauth_client_credentials'
  if (m === 'oauth_authorization_code') return 'oauth_authorization_code'
  return 'api_key'
}

/**
 * PLATFORM OAUTH (Authorization Code)
 *
 * Assumes PLATFORM exposes:
 * - Authorize:  GET  {baseUrl}/api/oauth/authorize
 * - Token:      POST {baseUrl}/api/oauth/token
 *
 * NOTE:
 * This file only handles *RationsWeb side* (generate authorize URL + handle callback).
 */

// ✅ PUBLIC callback MUST NOT be behind protect
// Full URL (because router is mounted at /api):  GET /api/integrations/platform/oauth/callback
router.get('/integrations/platform/oauth/callback', async (req, res) => {
  try {
    const code = String((req.query as any)?.code || '')
    const state = String((req.query as any)?.state || '')
    if (!code) return res.status(400).json({ ok: false, message: 'Missing code' })

    const doc: any = await Integration.findOne({ provider: 'platform' })
    if (!doc) return res.status(404).json({ ok: false, message: 'Platform integration not configured' })

    const baseUrlRaw = doc.config?.platformBaseUrl || process.env.PLATFORM_BASE_URL
    const baseUrl = normalizeBaseUrl(baseUrlRaw)
    if (!baseUrl) return res.status(400).json({ ok: false, message: 'Missing platformBaseUrl' })

    const clientId = await resolvePlatformClientId(doc)
    const clientSecret = await resolvePlatformClientSecret(doc)

    // IMPORTANT: this must exactly match a redirectUri registered on PLATFORM OAuth client
    let redirectUri = String(doc.config?.platformRedirectUri || process.env.PLATFORM_OAUTH_REDIRECT_URI || '').trim()

    // If not set, infer from this request (handles varying local ports + reverse proxies)
    if (!redirectUri) {
      const xfProto = String((req.headers as any)['x-forwarded-proto'] || '').split(',')[0].trim()
      const xfHost = String((req.headers as any)['x-forwarded-host'] || '').split(',')[0].trim()
      const proto = xfProto || req.protocol
      const host = xfHost || req.get('host')
      if (host) redirectUri = `${proto}://${host}/api/integrations/platform/oauth/callback`
    }

    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(400).json({ ok: false, message: 'Missing OAuth client_id/client_secret/redirect_uri' })
    }

    // Persist inferred redirectUri so future OAuth starts match exactly
    if (!doc.config?.platformRedirectUri && redirectUri) {
      await Integration.updateOne(
        { provider: 'platform' },
        { $set: { 'config.platformRedirectUri': redirectUri, updatedAt: new Date() } }
      ).catch(() => {})
    }

    // Exchange code → token
    const tokenUrl = `${baseUrl}/api/oauth/token`
    const rsp = await axios.post(
      tokenUrl,
      {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      },
      { timeout: 10_000 }
    )

    const accessToken = String(rsp.data?.access_token || '').trim()
    const refreshToken = String(rsp.data?.refresh_token || '').trim()
    const expiresIn = Number(rsp.data?.expires_in || 3600)

    if (!accessToken) return res.status(400).json({ ok: false, message: 'No access_token returned' })

    // Merge + store encrypted tokens safely
    const mergedSecrets: Record<string, EncryptedData> = { ...(doc.secretsEncrypted || {}) }
    mergedSecrets.accessToken = encrypt(accessToken)
    if (refreshToken) mergedSecrets.refreshToken = encrypt(refreshToken)

    await Integration.updateOne(
      { provider: 'platform' },
      {
        $set: {
          enabled: true,
          status: 'connected',
          lastError: '',
          'config.platformAuthMethod': 'oauth_authorization_code',
          'config.tokenExpiresAt': Date.now() + expiresIn * 1000,
          secretsEncrypted: mergedSecrets,
          updatedAt: new Date(),
        },
      }
    )

    // Sync to IntegrationConnection (legacy) so admin status API works
    await IntegrationConnection.findOneAndUpdate(
      { provider: 'platform' },
      {
        $set: {
          status: 'connected',
          platformBaseUrl: baseUrl,
          platformAuthMethod: 'oauth_authorization_code',
          connectedAt: new Date(),
          lastCheckedAt: new Date(),
          lastSuccessAt: new Date(),
          updatedAt: new Date(),
        },
        $unset: { lastError: 1 },
      },
      { upsert: true }
    )

    await IntegrationLog.create({
      provider: 'platform',
      action: 'OAUTH_CALLBACK',
      status: 'success',
      message: 'OAuth connected',
      meta: { state, at: new Date().toISOString() },
    })

    // Redirect back to Admin UI (best practice: use env)
    let targetOrigin = process.env.ADMIN_APP_URL || ''

    // Try to extract returnUrl from state (to support dynamic ports/dev envs)
    try {
      if (state) {
        // Handle both raw strings (legacy) and base64 JSON
        const decodedStr = Buffer.from(state, 'base64').toString('utf-8')
        if (decodedStr.startsWith('{') && decodedStr.endsWith('}')) {
          const json = JSON.parse(decodedStr)
          if (json && json.returnUrl) {
            targetOrigin = json.returnUrl
          }
        }
      }
    } catch (e) {
      // Ignore parsing errors, fallback to env
    }

    const adminUrl = String(targetOrigin || '').replace(/\/+$/, '')
    if (adminUrl) return res.redirect(`${adminUrl}/admin/integrations?platform=connected`)

    // Fallback: relative
    return res.redirect('/admin/integrations?platform=connected')
} catch (e: any) {
  const status = e?.response?.status || 400
  const data = e?.response?.data || null

  const message =
    data?.error_description ||
    data?.message ||
    data?.error ||
    e?.message ||
    'OAuth callback failed'

  // Log locally so you see it in terminal
  console.error('[OAUTH_CALLBACK_ERROR]', { status, data, message })

  try {
    await IntegrationLog.create({
      provider: 'platform',
      action: 'OAUTH_CALLBACK',
      status: 'failed',
      message,
      meta: { at: new Date().toISOString(), status, data },
    })
  } catch {}

  // Return the real error payload (no secrets here)
  return res.status(status).json({ ok: false, status, message, data })
}
})

/**
 * ✅ Everything under /admin/* MUST be protected
 */
// Instagram OAuth callback proxy (public)
// This forwards /api/integrations/instagram/callback to /api/social/instagram/callback

router.get('/instagram/callback', async (req, res) => {
  const qs = new URLSearchParams(req.query as any).toString()
  const target = `${process.env.API_BASE_URL || ''}/api/social/instagram/callback?${qs}`
  return res.redirect(target)
})

router.get('/social/instagram', (_req, res) => {
  res.redirect(`${process.env.ADMIN_APP_URL}/admin/integrations/social?social_success=instagram`)
})


router.get('/platform/status', async (_req, res) => {
  const conn = await IntegrationConnection.findOne({ provider: 'platform' })

  if (!conn) {
    return res.json({
      success: true,
      data: {
        connected: false,
        configured: false,
      },
    })
  }

  return res.json({
    success: true,
    data: {
      connected: conn.status === 'connected',
      configured: true,
      lastSuccessAt: conn.lastSuccessAt || null,
      lastError: conn.lastError || '',
    },
  })
})

router.use(protect)



/**
 * ✅ Save Platform webhook secret from the Admin UI.
 * Endpoint expected by UI:
 *   POST /admin/integrations/platform/webhook/secret
 * Body:
 *   { secret: string }
 */
router.post('/admin/integrations/platform/webhook/secret', authorize('owner', 'admin'), async (req, res) => {
  try {
    const secret = String(req.body?.secret || '').trim()
    const webhookUrl = String(req.body?.webhookUrl || '').trim()

    if (!secret && !webhookUrl) {
      return res.status(400).json({ success: false, message: 'Webhook secret or URL is required' })
    }

    // Single-tenant: one Integration doc per provider
    const integration =
      (await Integration.findOne({ provider: 'platform' })) || (await Integration.create({ provider: 'platform' }))

    if (secret) {
      integration.secretsEncrypted = {
        ...(integration.secretsEncrypted || {}),
        webhookSecret: encrypt(secret),
      }
    }

    if (webhookUrl) {
      integration.config = integration.config || {}
      integration.config.platformWebhookUrl = webhookUrl
    }

    // If your Integration schema supports it, great. If not, remove these 2 lines.
    ;(integration as any).webhookConfiguredAt = new Date()

    await integration.save()

    await IntegrationLog.create({
      provider: 'platform',
      action: 'WEBHOOK_SECRET_SAVED',
      status: 'success',
      message: 'Webhook secret saved',
      meta: { at: new Date().toISOString() },
    })

    return res.json({ success: true, message: 'Webhook secret saved' })
  } catch (err: any) {
    console.error('Failed to save webhook secret', err)
    try {
      await IntegrationLog.create({
        provider: 'platform',
        action: 'WEBHOOK_SECRET_SAVED',
        status: 'failed',
        message: 'Failed to save webhook secret',
        meta: { at: new Date().toISOString(), error: String(err?.message || err) },
      })
    } catch {}
    return res.status(500).json({ success: false, message: 'Failed to save webhook secret' })
  }
})

// Admin: list integrations
router.get('/admin/integrations', authorize('owner', 'admin'), async (req, res) => {
  try {
    const list = await Integration.find({})
    const data = list.map((i: any) => {
      const { config, flags } = redactConfig(i.provider, i.config || {}, i.secretsEncrypted || {})
      return {
        provider: i.provider,
        enabled: i.enabled,
        status: i.status,
        scopes: i.scopes || [],
        lastSyncAt: i.lastSyncAt,
        lastError: i.lastError,
        config,
        ...flags,
        updatedAt: i.updatedAt,
        createdAt: i.createdAt,
      }
    })
    return res.json({ success: true, data })
  } catch {
    return res.status(500).json({ message: 'Server error' })
  }
})

// Admin: update integration settings + secrets (encrypted)
router.put('/admin/integrations/:provider', authorize('owner', 'admin'), async (req, res) => {
  try {
    const raw = String(req.params.provider || '').toLowerCase()
    if (!PROVIDERS.includes(raw as Provider)) {
      return res.status(400).json({ message: 'Invalid provider' })
    }
    const provider = raw as Provider
    const enabled = !!req.body?.enabled
    const scopes = Array.isArray(req.body?.scopes) ? req.body.scopes : []
    const cfg = typeof req.body?.config === 'object' && req.body.config ? req.body.config : {}

    const existing: any = await Integration.findOne({ provider })

    const enc = maybeEncryptSecrets(provider, cfg)

    // Merge secrets instead of overwriting
    const mergedSecrets: Record<string, EncryptedData> = {
      ...((existing?.secretsEncrypted as any) || {}),
      ...(enc.secretsEncrypted || {}),
    }

    const update: any = {
      enabled,
      status: enabled ? 'connected' : 'disconnected',
      scopes,
      config: enc.config,
      lastError: '',
      updatedAt: new Date(),
      ...(Object.keys(enc.secretsEncrypted || {}).length > 0 ? { secretsEncrypted: mergedSecrets } : {}),
    }

    const doc = await Integration.findOneAndUpdate({ provider }, update, { upsert: true, new: true })

    const { config, flags } = redactConfig(provider, doc.config || {}, doc.secretsEncrypted || {})

    try {
      await logAudit(req as any, {
        action: 'INTEGRATION_UPDATE',
        entityType: 'integration',
        entityId: String(doc._id || ''),
        metadata: { provider, enabled, scopes },
      })
    } catch {}

    return res.json({
      success: true,
      data: {
        provider: doc.provider,
        enabled: doc.enabled,
        status: doc.status,
        scopes: doc.scopes || [],
        config,
        ...flags,
      },
    })
  } catch {
    return res.status(500).json({ message: 'Server error' })
  }
})

// Admin: Platform OAuth start (generates authorize URL)
router.post('/admin/integrations/platform/oauth/start', authorize('owner', 'admin'), async (req, res) => {
  try {
    const doc: any = await Integration.findOne({ provider: 'platform' })
    if (!doc) return res.status(404).json({ message: 'Integration not found' })

    // Allow UI to pass the Platform API host so we can store it (dev-friendly)
    const incomingBaseUrl = String(req.body?.platformBaseUrl || '').trim()
    if (incomingBaseUrl) {
      doc.config = doc.config || {}
      doc.config.platformBaseUrl = incomingBaseUrl
      await doc.save().catch(() => {})
    }

    const incomingClientUrl = String(req.body?.platformClientUrl || '').trim()
    if (incomingClientUrl) {
      doc.config = doc.config || {}
      doc.config.platformClientUrl = incomingClientUrl
      await doc.save().catch(() => {})
    }

    const baseUrlRaw = doc.config?.platformBaseUrl || process.env.PLATFORM_BASE_URL
    const baseUrl = normalizeBaseUrl(baseUrlRaw)
    if (!baseUrl) return res.status(400).json({ message: 'Missing platformBaseUrl' })

    const platformClientUrlRaw = doc.config?.platformClientUrl || process.env.PLATFORM_CLIENT_URL || baseUrl
    const platformClientUrl = normalizeBaseUrl(platformClientUrlRaw)
    if (!platformClientUrl) return res.status(400).json({ message: 'Missing platformClientUrl' })

    const clientId = await resolvePlatformClientId(doc)

    // Build redirect_uri dynamically from the request host if not configured.
    // This avoids hardcoding localhost:6002 and survives port changes / reverse proxies.
    const proto = String((req.headers['x-forwarded-proto'] as any) || req.protocol || 'http')
    const host = String((req.headers['x-forwarded-host'] as any) || req.get('host') || '')
    const inferredOrigin = host ? `${proto}://${host}` : ''
    const inferredRedirect = inferredOrigin ? `${inferredOrigin}/api/integrations/platform/oauth/callback` : ''

    // Priority: ENV -> DB -> Inferred
let redirectUri = String(process.env.PLATFORM_OAUTH_REDIRECT_URI || doc.config?.platformRedirectUri || '').trim()

if (!redirectUri && inferredRedirect) {
  redirectUri = inferredRedirect
  doc.config.platformRedirectUri = redirectUri
  await doc.save().catch(() => {})
}

    if (!clientId || !redirectUri) return res.status(400).json({ message: 'Missing clientId or redirectUri' })

    let state = String(req.body?.state || crypto.randomUUID())

    // ROBUSTNESS FIX: Auto-upgrade state to include returnUrl if missing
    // This handles cases where user hasn't refreshed the frontend to get the new code
    try {
      const isBase64Json = state.length > 20 && /^[a-zA-Z0-9+/]*={0,2}$/.test(state)
      let isJsonStruct = false
      if (isBase64Json) {
        const decoded = Buffer.from(state, 'base64').toString('utf-8')
        if (decoded.trim().startsWith('{')) isJsonStruct = true
      }

      if (!isJsonStruct) {
        const originRaw = req.headers.origin || req.headers.referer
        if (originRaw) {
          const u = new URL(String(originRaw))
          const returnUrl = u.origin
          // Wrap the original state (UUID) in our new structure
          const newState = { nonce: state, returnUrl }
          state = Buffer.from(JSON.stringify(newState)).toString('base64')
        }
      }
    } catch (e) {
      // If URL parsing fails or other issues, fall back to original state
    }

    // UI can pass scopes; otherwise use saved doc.scopes, else a safe default.
    const incomingScopes = Array.isArray(req.body?.scopes) ? req.body.scopes : null
    const scopes =
      incomingScopes && incomingScopes.length > 0
        ? incomingScopes.map((s: any) => String(s || '').trim()).filter(Boolean).join(' ')
        : Array.isArray(doc.scopes) && doc.scopes.length > 0
          ? doc.scopes.join(' ')
          : 'catalog:read orders:read orders:write inventory:read kds:read'

    const authorizeUrl =
      `${platformClientUrl}/oauth/connect` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${encodeURIComponent(state)}`

    return res.json({ success: true, data: { authorizeUrl, clientId, redirectUri } })
  } catch {
    return res.status(500).json({ message: 'Server error' })
  }
})

// Admin: test integrations
router.post('/admin/integrations/:provider/test', authorize('owner', 'admin'), async (req, res) => {
  try {
    const raw = String(req.params.provider || '').toLowerCase()
    if (!PROVIDERS.includes(raw as Provider)) {
      return res.status(400).json({ message: 'Invalid provider' })
    }
    const provider = raw as Provider
    const doc: any = await Integration.findOne({ provider })
    if (!doc) return res.status(404).json({ message: 'Integration not found' })

    let ok = false
    let message = 'Unknown'

    if (provider === 'platform') {
      const baseUrlRaw = doc.config?.platformBaseUrl || process.env.PLATFORM_BASE_URL
      const baseUrl = normalizeBaseUrl(baseUrlRaw)

      const method = getPlatformAuthMethod(doc)

      if (!baseUrl) {
        ok = false
        message = 'Missing platformBaseUrl'
      } else {
        try {
          const url = `${baseUrl}/api/integrations/v1/ping`

          if (method === 'api_key') {
            const apiKey = await resolvePlatformApiKey(doc)
            if (!apiKey) {
              ok = false
              message = 'Missing API key'
            } else if (!isPlatformApiKeyLike(apiKey)) {
              ok = false
              message = 'Invalid API key format. Expected iak_<keyId>.<secret>'
            } else {
              // ✅ Platform integration v1 expects API key in x-platform-key (NOT Authorization)
              const rsp = await axios.get(url, {
                timeout: 5000,
                headers: {
                  'x-platform-key': apiKey,
                  'Content-Type': 'application/json',
                },
              })
              ok = rsp.status >= 200 && rsp.status < 300
              message = ok ? 'Connection ok (api key)' : 'Ping failed'
            }
          } else if (method === 'oauth_client_credentials') {
            const clientId = await resolvePlatformClientId(doc)
            const clientSecret = await resolvePlatformClientSecret(doc)
            if (!clientId || !clientSecret) {
              ok = false
              message = 'Missing OAuth client_id/client_secret'
            } else {
              const tokenRsp = await axios.post(
                `${baseUrl}/api/oauth/token`,
                {
                  grant_type: 'client_credentials',
                  client_id: clientId,
                  client_secret: clientSecret,
                  scope: 'catalog:read orders:read orders:write inventory:read kds:read',
                },
                { timeout: 8000 }
              )
              const token = String(tokenRsp.data?.access_token || '').trim()
              if (!token) {
                ok = false
                message = 'OAuth token failed'
              } else {
                const rsp = await axios.get(url, {
                  timeout: 5000,
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                })
                ok = rsp.status >= 200 && rsp.status < 300
                message = ok ? 'Connection ok (oauth client_credentials)' : 'Ping failed'
              }
            }
          } else if (method === 'oauth_authorization_code') {
            const accessToken = decryptSecret(doc, 'accessToken')
            if (!accessToken) {
              ok = false
              message = 'Missing OAuth access token. Connect OAuth first.'
            } else {
              const rsp = await axios.get(url, {
                timeout: 5000,
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              })
              ok = rsp.status >= 200 && rsp.status < 300
              message = ok ? 'Connection ok (oauth authorization_code)' : 'Ping failed'
            }
          } else {
            ok = false
            message = 'Unknown platformAuthMethod'
          }
        } catch (e: any) {
          ok = false
          message = e?.response?.data?.message || e?.message || 'Platform ping failed'
        }
      }
    } else if (provider === 'instagram') {
      const hasToken = !!doc.secretsEncrypted?.accessToken
      ok = hasToken
      message = hasToken ? 'Token present' : 'Missing access token'
    } else if (provider === 'x') {
      const hasKeys = !!doc.secretsEncrypted?.apiKey && !!doc.secretsEncrypted?.apiSecret
      ok = hasKeys
      message = hasKeys ? 'Keys present' : 'Missing API key/secret'
    } else if (provider === 'youtube') {
      const hasKey = !!doc.secretsEncrypted?.apiKey
      ok = hasKey
      message = hasKey ? 'API key present' : 'Missing API key'
    }

    await IntegrationLog.create({
      provider,
      action: 'TEST',
      status: ok ? 'success' : 'failed',
      message,
      meta: { at: new Date().toISOString() },
    })

    if (!ok) {
      try {
        await logAudit(req as any, {
          action: 'INTEGRATION_TEST',
          entityType: 'integration',
          entityId: String(doc?._id || ''),
          metadata: { provider, message },
          outcome: 'ERROR',
        })
      } catch {}
      await Integration.updateOne({ provider }, { $set: { status: 'error', lastError: message } })
      return res.status(400).json({ message })
    }

    try {
      await logAudit(req as any, {
        action: 'INTEGRATION_TEST',
        entityType: 'integration',
        entityId: String(doc?._id || ''),
        metadata: { provider, message },
        outcome: 'SUCCESS',
      })
    } catch {}
    await Integration.updateOne({ provider }, { $set: { status: 'connected', lastError: '' } })
    return res.json({ success: true, message })
  } catch {
    return res.status(500).json({ message: 'Server error' })
  }
})

router.get('/admin/integrations/:provider/logs', authorize('owner', 'admin'), async (req, res) => {
  try {
    const raw = String(req.params.provider || '').toLowerCase()
    if (!PROVIDERS.includes(raw as Provider)) {
      return res.status(400).json({ message: 'Invalid provider' })
    }
    const limit = Math.min(Number((req.query as any)?.limit || 50), 200)
    const logs = await IntegrationLog.find({ provider: raw }).sort({ createdAt: -1 }).limit(limit)
    return res.json({ success: true, data: logs })
  } catch {
    return res.status(500).json({ message: 'Server error' })
  }
})

export default router
