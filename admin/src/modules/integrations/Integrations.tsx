import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/api'
import AppButton from '@shared/ui/AppButton'
import PageHeader from '@shared/ui/PageHeader'
import SelectInput from '@shared/ui/SelectInput'
import FormInput from '@shared/ui/FormInput'
import Button from '@shared/ui/Button'
import {
  CheckCircle2,
  XCircle,
  Shield,
  AlertTriangle,
  RefreshCw,
  Key,
  Lock,
  Webhook,
  Link2,
} from 'lucide-react'

type AuthMethod = 'api_key' | 'oauth'

export default function Integrations() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [retesting, setRetesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Third-party services
  const [form, setForm] = useState({ payments: '', messaging: '', logistics: '' })

  // Platform status
  const [platformStatus, setPlatformStatus] = useState<any>(null)
  const [platformHealth, setPlatformHealth] = useState<any>(null)

  // Platform config
  const [baseUrl, setBaseUrl] = useState('')
  const [branchId, setBranchId] = useState('')

  // auth method
  const [authMethod, setAuthMethod] = useState<AuthMethod>('oauth')

  // API key
  const [apiKey, setApiKey] = useState('')
  const [scopes, setScopes] = useState('')

  // Webhook secret (INPUT FORM)
  const [webhookSecret, setWebhookSecret] = useState('')
  const [savingWebhook, setSavingWebhook] = useState(false)

  // Feature toggles
  const [features, setFeatures] = useState({ orders: false, kds: false, catalog: false })

  // Logs / jobs
  const [platformLogs, setPlatformLogs] = useState<any[]>([])
  const [showPlatformLogs, setShowPlatformLogs] = useState(false)
  const [showJobs, setShowJobs] = useState(false)
  const [jobs, setJobs] = useState<any[]>([])

  const isConnected = platformStatus?.status === 'connected' || platformStatus?.status === 'CONNECTED'

  const [webhookUrl, setWebhookUrl] = useState('')

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const b = (origin || '').replace(/\/+$/, '')
    setWebhookUrl(`${b}/api/webhooks/platform`)
  }, [])

  const safeAuthRedirectState = () => {
    try {
      if (typeof window !== 'undefined' && window.crypto?.randomUUID) return window.crypto.randomUUID()
    } catch {}
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`
  }

  const guardAuth = (e: any) => {
    if (e?.response?.status === 401 || e?.response?.status === 403) {
      navigate('/admin/login')
      return true
    }
    return false
  }

  const loadTenantSettings = async () => {
    try {
      const res = await api.get('/admin/settings')
      const data = res.data?.data || res.data
      const payments = data?.payments?.provider || ''
      const messaging = data?.messaging?.provider || ''
      const logistics = data?.logistics?.provider || ''
      setForm({
        payments: payments === 'none' ? '' : payments,
        messaging: messaging === 'none' ? '' : messaging,
        logistics: logistics === 'none' ? '' : logistics,
      })
    } catch (e: any) {
      guardAuth(e)
    }
  }

  const refreshPlatformStatus = async () => {
    try {
      const res = await api.get('/admin/integrations/platform')
      if (res.data?.success) {
        const data = res.data?.data || {}
        setPlatformStatus(data)

        setBaseUrl(String(data.platformBaseUrl || '').trim())
        setBranchId(String(data.platformBranchId || '').trim())

        const m = String(data.authMethod || data.platformAuthMethod || '').toLowerCase()
        if (m === 'api_key') setAuthMethod('api_key')
        else if (m.includes('oauth')) setAuthMethod('oauth')

        if (data.features && typeof data.features === 'object') {
          setFeatures((prev) => ({ ...prev, ...data.features }))
        }

        if (Array.isArray(data.scopes)) setScopes(data.scopes.join(', '))

        setApiKey('')
        setWebhookSecret('')
      } else {
        setPlatformStatus({ status: 'disconnected' })
      }
    } catch (e: any) {
      if (guardAuth(e)) return
      setPlatformStatus({ status: 'disconnected' })
    }
  }

  const loadHealth = async () => {
    try {
      const res = await api.get('/admin/integrations/platform/health')
      setPlatformHealth(res.data?.data || null)
    } catch {}
  }

  const loadJobs = async () => {
    try {
      const res = await api.get('/admin/integrations/platform/jobs?limit=100')
      setJobs(res.data?.data || [])
    } catch {}
  }

  const loadIntegrationsConfig = async () => {
    try {
      const res = await api.get('/admin/integrations')
      const list = res.data?.data || []
      const platform = list.find((i: any) => i.provider === 'platform')
      if (platform?.config?.platformWebhookUrl) {
        setWebhookUrl(platform.config.platformWebhookUrl)
      }
    } catch {}
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      await Promise.all([refreshPlatformStatus(), loadTenantSettings(), loadHealth(), loadIntegrationsConfig()])
    } catch (e: any) {
      if (guardAuth(e)) return
      setError('Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveTenantSettings = async () => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        payments: { provider: form.payments || 'none' },
        messaging: { provider: form.messaging || 'none' },
        logistics: { provider: form.logistics || 'none' },
      }
      await api.patch('/admin/settings', payload)
      setNotice('Settings updated')
    } catch (e: any) {
      if (guardAuth(e)) return
      setError(e?.response?.data?.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleApiKeyConnect = async (e?: any) => {
    if (e) e.preventDefault()
    setConnecting(true)
    setError('')
    setNotice('')
    try {
      const payload: any = {
        platformBaseUrl: baseUrl,
        platformBranchId: branchId,
        authMethod: 'api_key',
        features,
        scopes: scopes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }
      if (apiKey) payload.apiKey = apiKey

      await api.post('/admin/integrations/platform/connect', payload)
      setNotice('Platform connected (API Key).')
      await refreshPlatformStatus()
      await loadHealth()
    } catch (e: any) {
      if (guardAuth(e)) return
      setError(e?.response?.data?.message || 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }

// ✅ OAuth connect (Authorization Code)
// ✅ OAuth connect (Authorization Code) — server-driven (NO guessing)
const handleOauthConnect = async () => {
  setConnecting(true)
  setError('')
  setNotice('')

  try {
    const apiHost = String(baseUrl || '').trim().replace(/\/+$/, '')
    if (!apiHost) {
      setError('Platform Base URL is required (e.g. http://localhost:6006)')
      return
    }

    // Prevent user from entering the Admin URL as the Platform URL
    let adminBackend = ''
    try {
      if (api.defaults.baseURL) {
        adminBackend = new URL(api.defaults.baseURL).origin
      }
    } catch {}

    const isSelf =
      (window.location.origin && apiHost.includes(window.location.host)) || (adminBackend && apiHost.includes(adminBackend))

    if (isSelf) {
      setError(
        'You cannot use the Admin URL as the Platform URL. Please enter the address where the Platform is running (e.g. http://localhost:6006).'
      )
      return
    }

    const nonce = safeAuthRedirectState()
    const stateObj = {
      nonce,
      returnUrl: window.location.origin,
    }
    const state = btoa(JSON.stringify(stateObj))

    // ask rationsweb backend to generate the authorize URL correctly
    const res = await api.post('/admin/integrations/platform/oauth/start', {
      platformBaseUrl: apiHost,
      scopes: scopes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      state,
    })

    const authorizeUrl = String(res.data?.data?.authorizeUrl || '')
    if (!authorizeUrl) {
      setError('OAuth start failed: missing authorizeUrl')
      return
    }

    window.location.href = authorizeUrl
  } catch (e: any) {
    setError(e?.response?.data?.message || 'Failed to start OAuth')
  } finally {
    setConnecting(false)
  }
}

  // ✅ Webhook secret input/save
  const handleSaveWebhookSecret = async () => {
    setSavingWebhook(true)
    setError('')
    setNotice('')
    try {
      const secret = String(webhookSecret || '').trim()
      if (!secret) {
        setError('Webhook secret cannot be empty.')
        return
      }

      // If you truly want “no-code”, ignore this and just set PLATFORM_WEBHOOK_SECRET in env.
      await api.post('/admin/integrations/platform/webhook/secret', {
        secret,
        webhookUrl: String(webhookUrl || '').trim(),
      })

      setNotice('Webhook settings saved.')
      setWebhookSecret('')
      await refreshPlatformStatus()
      await loadHealth()
    } catch (e: any) {
      if (guardAuth(e)) return
      if (e?.response?.status === 404) {
        setError(
          'Backend endpoint not found: POST /admin/integrations/platform/webhook/secret. ' +
            'If you want “no-code env only”, set PLATFORM_WEBHOOK_SECRET in .env instead.'
        )
        return
      }
      setError(e?.response?.data?.message || 'Failed to save webhook secret')
    } finally {
      setSavingWebhook(false)
    }
  }

  const handleRetest = async () => {
    setRetesting(true)
    setError('')
    setNotice('')
    try {
      const res = await api.post('/admin/integrations/platform/retest')
      if (res.data?.success) setNotice('Connection verified successfully!')
      else setError(res.data?.message || 'Retest failed')
      await refreshPlatformStatus()
      await loadHealth()
    } catch (e: any) {
      if (guardAuth(e)) return
      setError(e?.response?.data?.message || 'Retest failed')
      await refreshPlatformStatus()
      await loadHealth()
    } finally {
      setRetesting(false)
    }
  }

  const handleSyncMenu = async () => {
    setSyncing(true)
    setError('')
    setNotice('')
    try {
      const res = await api.post('/admin/menu/sync')
      if (res.data?.success) {
        const count = res.data?.data?.count || 0
        setNotice(`Synced ${count} menu items from Platform`)
      } else {
        setError(res.data?.message || 'Sync failed')
      }
    } catch (e: any) {
      if (guardAuth(e)) return
      setError(e?.response?.data?.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect? Integration features will stop working.')) return
    setConnecting(true)
    setError('')
    setNotice('')
    try {
      await api.post('/admin/integrations/platform/disconnect', {})
      setNotice('Platform disconnected')
      await refreshPlatformStatus()
      await loadHealth()
    } catch (e: any) {
      if (guardAuth(e)) return
      setError(e?.response?.data?.message || 'Disconnect failed')
    } finally {
      setConnecting(false)
    }
  }

  const authBadge = useMemo(() => {
    const hasApiKey = !!platformStatus?.hasApiKey
    const hasOauth = !!(platformStatus?.hasAccessToken || platformStatus?.hasOauth)
    const hasWebhook = !!(platformStatus?.hasWebhookSecret || platformHealth?.webhookConfigured)
    return { hasApiKey, hasOauth, hasWebhook }
  }, [platformStatus, platformHealth])

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <PageHeader title="Integrations" subtitle="Manage external services and platform connection" />

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>}

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {notice && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      {!loading && (
        <>
          {/* PLATFORM */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Shield className="text-slate-400" size={24} />
                <div>
                  <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">Platform Integration</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">OAuth + Webhooks + API Key fallback.</p>
                </div>
              </div>

              <div
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  isConnected ? 'bg-green-100 text-green-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {isConnected ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </div>
            </div>

            {/* Shared Base */}
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormInput
                  label="Platform Base URL"
                  value={baseUrl}
                  onChange={(e: any) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:6006"
                  required
                />
                <FormInput
                  label="Platform Branch ID (optional)"
                  value={branchId}
                  onChange={(e: any) => setBranchId(e.target.value)}
                  placeholder="branch id from Platform"
                />
              </div>

              {/* Feature Toggles */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg space-y-3 border border-slate-100 dark:border-slate-800">
                <span className="text-sm font-medium text-slate-900 dark:text-white block">Feature Toggles</span>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-slate-900 dark:text-white rounded"
                    checked={features.orders}
                    onChange={(e) => setFeatures((prev) => ({ ...prev, orders: e.target.checked }))}
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">Orders (Sync orders)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-slate-900 dark:text-white rounded"
                    checked={features.kds}
                    onChange={(e) => setFeatures((prev) => ({ ...prev, kds: e.target.checked }))}
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">KDS (Tickets / kitchen)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-slate-900 dark:text-white rounded"
                    checked={features.catalog}
                    onChange={(e) => setFeatures((prev) => ({ ...prev, catalog: e.target.checked }))}
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">Catalog (Menu sync)</span>
                </label>
              </div>

              {/* OAuth */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Lock size={18} className="text-slate-500 dark:text-slate-400" />
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">OAuth (Recommended)</h4>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Secure connection with per-user permissions. Clicking connect opens Platform login.
                    </p>
                  </div>

                  <Button variant="primary" onClick={handleOauthConnect} disabled={connecting} className="whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      <Link2 size={16} />
                      {connecting ? 'Opening...' : 'Connect OAuth'}
                    </span>
                  </Button>
                </div>

                <div className="mt-3">
                  <FormInput
                    label="Scopes (comma separated)"
                    value={scopes}
                    onChange={(e: any) => setScopes(e.target.value)}
                    placeholder="catalog:read, orders:read, orders:write"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    If OAuth start returns 404, your backend endpoint isn’t implemented yet.
                  </p>
                </div>
              </div>

              {/* Webhooks (URL + INPUT FORM) */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Webhook size={18} className="text-slate-500 dark:text-slate-400" />
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">Webhooks (Real-time)</h4>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Platform pushes events instantly (order status, inventory alerts, etc).
                    </p>
                  </div>
                </div>

                <div className="mt-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg p-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">Webhook URL</span>
                    <span className="font-mono text-xs break-all text-slate-700 dark:text-slate-200">{webhookUrl}</span>
                  </div>

                  <div className="flex justify-between gap-4 mt-2">
                    <span className="text-slate-500 dark:text-slate-400">Configured</span>
                    <span className="text-slate-700 dark:text-slate-200">
                      {authBadge.hasWebhook ? (
                        <span className="text-green-600 font-medium">Yes</span>
                      ) : (
                        <span className="text-amber-600 font-medium">No</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Webhook secret input */}
                <div className="mt-3 space-y-3">
                  <FormInput
                    label="Webhook URL"
                    type="text"
                    value={webhookUrl}
                    onChange={(e: any) => setWebhookUrl(e.target.value)}
                    placeholder="https://.../api/webhooks/platform"
                  />
                  <FormInput
                    label="Webhook Secret"
                    type="password"
                    value={webhookSecret}
                    onChange={(e: any) => setWebhookSecret(e.target.value)}
                    placeholder={authBadge.hasWebhook ? '••••••••••••••••' : 'enter secret from Platform'}
                  />
                  <div className="flex items-center gap-2">
                    <Button variant="outline" type="button" onClick={handleSaveWebhookSecret} disabled={savingWebhook}>
                      {savingWebhook ? 'Saving...' : 'Save Settings'}
                    </Button>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      If backend endpoint isn’t implemented, use env-only: <span className="font-mono">PLATFORM_WEBHOOK_SECRET</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* API Key block */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Key size={18} className="text-slate-500 dark:text-slate-400" />
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">API Key (Fallback)</h4>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Use this if OAuth isn’t ready. Leave blank to keep the existing key.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleApiKeyConnect} className="mt-3 space-y-3">
                  <FormInput
                    label="API Key"
                    type="password"
                    value={apiKey}
                    onChange={(e: any) => setApiKey(e.target.value)}
                    placeholder={platformStatus?.hasApiKey ? '••••••••••••••••' : 'iak_<id>.<secret>'}
                  />
                  {platformStatus?.hasApiKey && !apiKey && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">Leave blank to keep existing key.</p>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <Button variant="outline" type="submit" disabled={connecting}>
                      {connecting ? 'Saving...' : 'Save API Key'}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-3">
                <Button variant="outline" onClick={handleRetest} disabled={retesting || connecting}>
                  <span className="flex items-center gap-2">
                    <RefreshCw size={16} className={retesting ? 'animate-spin' : ''} />
                    {retesting ? 'Testing...' : 'Re-test'}
                  </span>
                </Button>

                {isConnected && (
                  <>
                    <Button variant="outline" onClick={handleSyncMenu} disabled={syncing || connecting}>
                      <span className="flex items-center gap-2">
                        <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Syncing...' : 'Sync Data'}
                      </span>
                    </Button>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await api.get('/admin/integrations/platform/logs')
                          setPlatformLogs(res.data?.data?.slice(0, 50) || [])
                          setShowPlatformLogs(true)
                        } catch (e: any) {
                          if (guardAuth(e)) return
                          setError(e?.response?.data?.message || 'Failed to fetch Platform logs')
                        }
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      View Logs
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await loadJobs()
                        setShowJobs(true)
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      View Jobs
                    </button>

                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={connecting}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors ml-auto"
                    >
                      Disconnect
                    </button>
                  </>
                )}
              </div>

              {showPlatformLogs && (
                <div className="mt-3 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Last 50 Logs</span>
                    <button className="text-slate-500 dark:text-slate-400 text-xs" onClick={() => setShowPlatformLogs(false)}>
                      Hide
                    </button>
                  </div>
                  <div className="max-h-64 overflow-auto text-xs">
                    {platformLogs.length === 0 ? (
                      <div className="p-3 text-slate-400">No logs</div>
                    ) : (
                      platformLogs.map((l: any, idx: number) => (
                        <div key={idx} className="p-3 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-300">{l.message || l.event || 'Event'}</span>
                            <span className="text-slate-400">
                              {l.createdAt ? new Date(l.createdAt).toLocaleString() : ''}
                            </span>
                          </div>
                          {l.error && <div className="text-red-600 mt-1">{l.error}</div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* THIRD-PARTY SERVICES */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">Third-Party Services</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Payments, messaging and logistics providers.</p>

            <div className="grid md:grid-cols-2 gap-4">
              <SelectInput
                label="Payment Gateway"
                value={form.payments}
                onChange={(e) => setForm((f) => ({ ...f, payments: e.target.value }))}
                options={[
                  { label: 'None', value: '' },
                  { label: 'Paystack', value: 'paystack' },
                  { label: 'Paga', value: 'paga' },
                  { label: 'Flutterwave', value: 'flutterwave' },
                ]}
              />
              <SelectInput
                label="Messaging Provider"
                value={form.messaging}
                onChange={(e) => setForm((f) => ({ ...f, messaging: e.target.value }))}
                options={[
                  { label: 'None', value: '' },
                  { label: 'Basic (Email only)', value: 'basic' },
                ]}
              />
              <SelectInput
                label="Logistics Provider"
                value={form.logistics}
                onChange={(e) => setForm((f) => ({ ...f, logistics: e.target.value }))}
                options={[
                  { label: 'None', value: '' },
                  { label: 'Dummy / Manual', value: 'dummy' },
                ]}
              />
            </div>

            <div className="flex justify-end pt-2">
              <AppButton onClick={saveTenantSettings} isLoading={saving} variant="secondary">
                Save Service Settings
              </AppButton>
            </div>
          </div>
        </>
      )}

      {/* Jobs drawer */}
      {showJobs && (
        <div className="fixed inset-0 bg-black/20 flex items-end">
          <div className="w-full md:w-[720px] bg-white dark:bg-slate-900 rounded-t-xl border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="px-4 py-3 border-b flex justify-between items-center">
              <div className="font-semibold">Sync Jobs</div>
              <button className="text-sm text-slate-600 dark:text-slate-300" onClick={() => setShowJobs(false)}>
                Close
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-auto text-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400 text-xs">
                    <th className="text-left p-2">Order</th>
                    <th className="text-left p-2">Action</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Attempts</th>
                    <th className="text-left p-2">Next Run</th>
                    <th className="text-left p-2">Last Error</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 ? (
                    <tr>
                      <td className="p-3 text-slate-400" colSpan={7}>
                        No jobs
                      </td>
                    </tr>
                  ) : (
                    jobs.map((j: any) => (
                      <tr key={j._id} className="border-t">
                        <td className="p-2 font-mono text-xs">{j.orderId}</td>
                        <td className="p-2">{j.action}</td>
                        <td className="p-2">{j.status}</td>
                        <td className="p-2">{j.attempts}</td>
                        <td className="p-2">{j.nextRunAt ? new Date(j.nextRunAt).toLocaleString() : '-'}</td>
                        <td className="p-2 text-rose-600">{j.lastError || ''}</td>
                        <td className="p-2">
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                await api.post(`/admin/orders/${j.orderId}/resync`)
                                await loadJobs()
                              } catch {}
                            }}
                          >
                            Retry now
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
