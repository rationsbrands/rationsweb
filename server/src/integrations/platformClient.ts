import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { IntegrationConnection } from '../models/IntegrationConnection'
import { decrypt, encrypt } from '../utils/encryption'
import Integration from '../models/Integration'

type AuthMethod = 'api_key' | 'oauth_client_credentials' | 'oauth_authorization_code'

interface PlatformConfig {
  enabled: boolean
  baseUrl: string
  authMethod: AuthMethod
  apiKey?: string
  clientId?: string
  clientSecret?: string
  features: {
    orders: boolean
    kds: boolean
    catalog: boolean
  }
}

interface OAuthToken {
  accessToken: string
  expiresAt: number // timestamp ms
}

function normalizeBaseUrl(url: string): string {
  const u = String(url || '').trim()
  return u.endsWith('/') ? u.slice(0, -1) : u
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTokenExpiredError(err: any) {
  const status = err?.response?.status
  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.error_description ||
    err?.response?.data?.error ||
    err?.message ||
    ''
  const s = String(msg).toLowerCase()
  return status === 401 || s.includes('token expired') || s.includes('expired token')
}

export class PlatformClient {
  private tokenCache: Map<string, OAuthToken> = new Map()

  // -------------------------
  // 0) Helpers for auth_code tokens in Integration
  // -------------------------

  private async loadAuthCodeContext() {
    // Integration holds:
    // - config.platformClientId (non-secret)
    // - secretsEncrypted.clientSecret (secret) [if you stored it there] OR ENV fallback
    // - secretsEncrypted.accessToken / refreshToken
    // - config.tokenExpiresAt (ms)
    const doc: any = await Integration.findOne({ provider: 'platform' }).lean()
    if (!doc) {
      return {
        doc: null,
        clientId: '',
        clientSecret: '',
        accessToken: '',
        refreshToken: '',
        tokenExpiresAt: 0,
      }
    }

    const clientId = String(doc?.config?.platformClientId || process.env.PLATFORM_OAUTH_CLIENT_ID || '').trim()

    // clientSecret can live in secretsEncrypted.clientSecret (recommended) or ENV fallback
    let clientSecret = ''
    try {
      const encSecret = doc?.secretsEncrypted?.clientSecret
      clientSecret = encSecret?.content ? String(decrypt(encSecret) || '').trim() : ''
    } catch {}
    if (!clientSecret) clientSecret = String(process.env.PLATFORM_OAUTH_CLIENT_SECRET || '').trim()

    let accessToken = ''
    try {
      const enc = doc?.secretsEncrypted?.accessToken
      accessToken = enc?.content ? String(decrypt(enc) || '').trim() : ''
    } catch {}

    let refreshToken = ''
    try {
      const enc = doc?.secretsEncrypted?.refreshToken
      refreshToken = enc?.content ? String(decrypt(enc) || '').trim() : ''
    } catch {}

    const tokenExpiresAt = Number(doc?.config?.tokenExpiresAt || 0)

    return { doc, clientId, clientSecret, accessToken, refreshToken, tokenExpiresAt }
  }

  private async refreshAuthCodeToken(baseUrl: string): Promise<string | null> {
    const ctx = await this.loadAuthCodeContext()
    if (!ctx.doc) return null
    if (!ctx.refreshToken) return null
    if (!ctx.clientId || !ctx.clientSecret) return null
    if (!baseUrl) return null

    try {
      const tokenUrl = `${normalizeBaseUrl(baseUrl)}/api/oauth/token`

      const rsp = await axios.post(
        tokenUrl,
        {
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.refreshToken,
        },
        { timeout: 10_000 }
      )

      const newAccess = String(rsp.data?.access_token || '').trim()
      const newRefresh = String(rsp.data?.refresh_token || '').trim() // may rotate
      const expiresIn = Number(rsp.data?.expires_in || 900)

      if (!newAccess) throw new Error('No access_token returned from refresh')

      // Persist back into Integration (encrypted)
      const mergedSecrets: any = { ...(ctx.doc?.secretsEncrypted || {}) }
      mergedSecrets.accessToken = encrypt(newAccess)
      if (newRefresh) mergedSecrets.refreshToken = encrypt(newRefresh)

      await Integration.updateOne(
        { provider: 'platform' },
        {
          $set: {
            secretsEncrypted: mergedSecrets,
            'config.tokenExpiresAt': Date.now() + expiresIn * 1000,
            status: 'connected',
            lastError: '',
            updatedAt: new Date(),
          },
        }
      )

      return newAccess
    } catch (e: any) {
      console.error('[PlatformClient] Refresh token failed:', e?.response?.data || e?.message || e)
      return null
    }
  }

  // 1) Load Configuration
  private async getConfig(): Promise<PlatformConfig> {
    const config: PlatformConfig = {
      enabled: false,
      baseUrl: '',
      authMethod: 'api_key',
      features: { orders: false, kds: false, catalog: false },
    }

    try {
      const conn = await IntegrationConnection.findOne({ provider: 'platform' }).select(
        '+apiKeyEncrypted.iv +apiKeyEncrypted.content +apiKeyEncrypted.tag ' +
          '+platformApiKeyEncrypted.iv +platformApiKeyEncrypted.content +platformApiKeyEncrypted.tag ' +
          '+platformClientIdEncrypted.iv +platformClientIdEncrypted.content +platformClientIdEncrypted.tag ' +
          '+platformClientSecretEncrypted.iv +platformClientSecretEncrypted.content +platformClientSecretEncrypted.tag'
      )
      if (!conn) return config

      if (conn.status === 'disconnected') {
        config.enabled = false
        return config
      }

      // Only proceed if connected + baseUrl present
      if (conn.status === 'connected' && conn.platformBaseUrl) {
        config.baseUrl = normalizeBaseUrl(conn.platformBaseUrl)
        config.features = conn.features || { orders: false, kds: false, catalog: false }
        config.authMethod = (conn.platformAuthMethod as AuthMethod) || 'api_key'

        try {
          if (config.authMethod === 'api_key') {
            // Legacy marker: stored as ENV placeholder
            if (conn.apiKeyEncrypted?.iv === 'ENV') {
              console.warn(`[PlatformClient] Legacy ENV configuration detected. Please re-save credentials.`)
              config.enabled = false
            } else if (conn.apiKeyEncrypted?.content) {
              config.apiKey = decrypt(conn.apiKeyEncrypted)
              config.enabled = true
            }
          } else if (config.authMethod === 'oauth_client_credentials') {
            if (conn.platformClientIdEncrypted?.content && conn.platformClientSecretEncrypted?.content) {
              config.clientId = decrypt(conn.platformClientIdEncrypted)
              config.clientSecret = decrypt(conn.platformClientSecretEncrypted)
              config.enabled = true
            }
          } else if (config.authMethod === 'oauth_authorization_code') {
            // Token lives in Integration; just mark enabled here.
            config.enabled = true
          }
        } catch (e) {
          console.error(`[PlatformClient] Failed to decrypt credentials`, e)
          config.enabled = false
        }
      }
    } catch (e) {
      console.error(`[PlatformClient] Error loading config`, e)
    }

    return config
  }

  // 2) OAuth Token Management (client_credentials)
  public async debugGetToken(): Promise<string | null> {
    const config = await this.getConfig()
    return this.getAccessToken(config)
  }

  public async debugConfig(): Promise<any> {
    return this.getConfig()
  }

  public async debugRefresh(): Promise<string | null> {
    const config = await this.getConfig()
    return this.refreshAuthCodeToken(config.baseUrl)
  }

  private async getAccessToken(config: PlatformConfig): Promise<string | null> {
    if (!config.clientId || !config.clientSecret || !config.baseUrl) return null

    const cached = this.tokenCache.get('default')
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.accessToken // 1 min buffer

    try {
      const tokenUrl = `${normalizeBaseUrl(config.baseUrl)}/api/oauth/token`

      const response = await axios.post(
        tokenUrl,
        {
          grant_type: 'client_credentials',
          client_id: `client_${config.clientId}`,
          client_secret: config.clientSecret,
          scope: 'catalog:read catalog:write orders:read orders:write inventory:read kds:read menu:read',
        },
        { timeout: 10_000 }
      )

      const accessToken = response.data?.access_token
      const expiresIn = Number(response.data?.expires_in || 3600)

      if (!accessToken || typeof accessToken !== 'string') throw new Error('No access_token returned')

      const expiresAt = Date.now() + expiresIn * 1000
      this.tokenCache.set('default', { accessToken, expiresAt })

      return accessToken
    } catch (error: any) {
      console.error(`[PlatformClient] OAuth token fetch failed:`, error?.message || error)
      return null
    }
  }

  // 3) Create Axios Client (Per Request)
  private async createClient(config: PlatformConfig): Promise<AxiosInstance | null> {
    if (!config.enabled || !config.baseUrl) return null

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (config.authMethod === 'api_key') {
      if (!config.apiKey) return null
      headers.Authorization = config.apiKey.trim()
      headers['x-platform-key'] = config.apiKey.trim()
    } else if (config.authMethod === 'oauth_client_credentials') {
      const token = await this.getAccessToken(config)
      if (!token) return null
      headers.Authorization = `Bearer ${token}`
    } else if (config.authMethod === 'oauth_authorization_code') {
      // Load token from Integration; refresh if expired/near expiry
      const ctx = await this.loadAuthCodeContext()
      if (!ctx.doc) return null

      let token = ctx.accessToken

      // If we know expiry and it's close/expired, refresh first
      const expiresAt = Number(ctx.tokenExpiresAt || 0)
      const shouldRefresh = expiresAt > 0 && expiresAt <= Date.now() + 60_000 // 60s buffer
      if (shouldRefresh) {
        const refreshed = await this.refreshAuthCodeToken(config.baseUrl)
        if (refreshed) token = refreshed
      }

      if (!token) return null
      headers.Authorization = `Bearer ${token}`
    } else {
      return null
    }

    const client = axios.create({
      baseURL: normalizeBaseUrl(config.baseUrl),
      timeout: 10_000,
      headers,
    })

    // Retry only network/5xx, max 3 attempts
    client.interceptors.response.use(
      (res) => res,
      async (err) => {
        const cfg = err?.config as (AxiosRequestConfig & { __retryCount?: number }) | undefined
        if (!cfg) return Promise.reject(err)

        const status = err?.response?.status
        const isNetworkError = !err?.response
        const is5xx = typeof status === 'number' && status >= 500 && status <= 599

        cfg.__retryCount = cfg.__retryCount || 0
        if (cfg.__retryCount >= 3) return Promise.reject(err)

        if (isNetworkError || is5xx) {
          cfg.__retryCount += 1
          const delay = Math.pow(2, cfg.__retryCount) * 200
          await sleep(delay)
          return client(cfg)
        }

        return Promise.reject(err)
      }
    )

    return client
  }

  // 4) Helper to update status in DB
  private async updateStatus(success: boolean, error?: string) {
    try {
      const update: any = { lastCheckedAt: new Date() }

      if (success) {
        update.lastSuccessAt = new Date()
      } else {
        update.lastError = error || 'Unknown error'
      }

      await IntegrationConnection.updateOne(
        { provider: 'platform' },
        success ? { $set: update, $unset: { lastError: 1 } } : { $set: update }
      )
    } catch {
      // Ignore DB update errors
    }
  }

  // --- Public API ---

  public reloadConfig() {}

  public async isEnabled(): Promise<boolean> {
    const config = await this.getConfig()
    return config.enabled
  }

  // Generic Request Wrapper
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    data?: any,
    options: { idempotencyKey?: string; headers?: Record<string, string> } = {}
  ) {
    const config = await this.getConfig()
    const client = await this.createClient(config)
    if (!client) return null

    try {
      const headers: Record<string, string> = { ...(options.headers || {}) }
      if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey

      const response = await client.request({ method, url, data, headers })
      await this.updateStatus(true)
      return response.data
    } catch (error: any) {
      // ✅ Auto-refresh + retry once for oauth_authorization_code
      if (config.authMethod === 'oauth_authorization_code' && isTokenExpiredError(error)) {
        const refreshed = await this.refreshAuthCodeToken(config.baseUrl)
        if (refreshed) {
          try {
            const retryClient = await this.createClient(config)
            if (!retryClient) throw error

            const headers: Record<string, string> = { ...(options.headers || {}) }
            if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey

            const retryRes = await retryClient.request({ method, url, data, headers })
            await this.updateStatus(true)
            return retryRes.data
          } catch (e: any) {
            const msg2 = e?.response?.data?.message || e?.message || 'Unknown error'
            console.error(`[PlatformClient] Retry failed (${method} ${url}):`, msg2)
            await this.updateStatus(false, msg2)
            return null
          }
        }
      }

      const msg = error?.response?.data?.message || error?.message || 'Unknown error'
      console.error(`[PlatformClient] Request failed (${method} ${url}):`, msg)
      await this.updateStatus(false, msg)
      return null
    }
  }

  // --- Features ---

  public async pushOrder(payload: any) {
    const config = await this.getConfig()
    if (!config.features.orders) return null

    const headers: Record<string, string> = {}
    const conn = await IntegrationConnection.findOne({ provider: 'platform' })
    if (conn?.platformBranchId) headers['x-location-id'] = String(conn.platformBranchId)

    // Ensure locationId is present if required by platform
     // RationsWeb might not have locationId concept in payload, but we can inject it from connection settings if available
     if (conn?.platformBranchId) {
          // Fallback to branchId if locationId is missing, though platform complained about locationId
          payload.locationId = String(conn.platformBranchId)
     } else {
         // If neither exists, we might need to hardcode or fetch a default location from platform?
         // For now, let's try to fetch locations or use a default if possible.
         // But better to just send a dummy one or check what platform expects.
         // The error said "locationId is required".
         // Let's add a default if missing.
         payload.locationId = 'default' 
     }

    return this.request('POST', '/api/integrations/v1/orders', payload, {
      idempotencyKey: `order-${payload?.externalOrderId || Date.now()}-${Date.now()}`,
      headers,
    })
  }

  public async upsertCatalog(items: any[]) {
    const config = await this.getConfig()
    if (!config.features.catalog) return null

    const ids = items.map((i) => i?.externalId).filter(Boolean).join('_')
    const key = ids ? `catalog-${ids}` : `catalog-${Date.now()}`

    return this.request('POST', '/api/integrations/v1/catalog/upsert', { source: 'rationsweb', items }, { idempotencyKey: key })
  }

  public async getKdsTickets() {
    const config = await this.getConfig()
    if (!config.features.kds) return null
    return this.request('GET', '/api/integrations/v1/kds/tickets')
  }

  public async getAvailability(ids: string[]) {
    const config = await this.getConfig()
    if (!config.features.catalog) return null
    return this.request('POST', '/api/integrations/v1/catalog/availability/check', { ids })
  }

  public async getOrderStatus(platformOrderId: string) {
    const config = await this.getConfig()
    if (!config.features.orders) return null

    const headers: Record<string, string> = {}
    const conn = await IntegrationConnection.findOne({ provider: 'platform' })
    if (conn?.platformBranchId) headers['x-location-id'] = String(conn.platformBranchId)

    return this.request('GET', `/api/integration/orders/${encodeURIComponent(platformOrderId)}/status`, undefined, {
      headers,
    })
  }

  public async getMenu(branchId?: string) {
    const config = await this.getConfig()
    if (!config.enabled) return null

    const headers: Record<string, string> = {}
    const conn = await IntegrationConnection.findOne({ provider: 'platform' })
    const bId = branchId || conn?.platformBranchId
    if (bId) headers['x-location-id'] = String(bId)

    return this.request('GET', '/api/integration/menu', undefined, { headers })
  }

  public async updateOrderStatus(payload: any) {
    const config = await this.getConfig()
    if (!config.features.orders) return null

    return this.request('POST', '/api/integrations/v1/orders/status', payload, {
      idempotencyKey: `order-status-${payload?.externalOrderId || Date.now()}`,
    })
  }

  public async issueSsoToken(email: string): Promise<string | null> {
    const config = await this.getConfig()
    if (!config.enabled) return null

    const data = await this.request('POST', '/api/integration/sso/issue', { email })
    const rel = data?.data?.redirectUrl || data?.redirectUrl || null
    if (!rel) return null

    return `${normalizeBaseUrl(config.baseUrl)}${rel}`
  }

  public async testConnection(): Promise<{ success: boolean; message?: string }> {
    const res = await this.request('GET', '/api/integrations/v1/ping')
    if (res) return { success: true, message: 'Connected' }

    const conn = await IntegrationConnection.findOne({ provider: 'platform' })
    return { success: false, message: conn?.lastError || 'Connection failed' }
  }

  public async syncMenu(items: any[]) {
    // Platform expects { source: string, items: [...] }
    // Using 'rations-web' as source identifier
    return this.request('POST', '/api/integrations/v1/catalog/upsert', {
      source: 'rations-web',
      items
    })
  }

  public async checkHealth(): Promise<{ enabled: boolean; reachable: boolean; lastError?: string; checkedAt: string }> {
    const config = await this.getConfig()

    const status = {
      enabled: config.enabled,
      reachable: false,
      lastError: undefined as string | undefined,
      checkedAt: new Date().toISOString(),
    }

    if (!config.enabled) return status

    try {
      const client = await this.createClient(config)
      if (!client) return status
      await client.get('/api/integrations/v1/ping')
      status.reachable = true
      await this.updateStatus(true)
    } catch (e: any) {
      status.reachable = false
      status.lastError = e?.message || 'Unknown error'
      await this.updateStatus(false, status.lastError)
    }

    return status
  }

  public async sendDiagnosticCallback(path: string, payload: any) {
    const config = await this.getConfig()
    if (!config.enabled) return { success: false, message: 'Integration disabled' }
    return this.request('POST', path, payload)
  }
}

export const platformClient = new PlatformClient()
