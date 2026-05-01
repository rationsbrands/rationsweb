import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/api'
import PageHeader from '@shared/ui/PageHeader'
import Button from '@shared/ui/Button'
import { CheckCircle, AlertTriangle, Save, Download, ExternalLink, ShieldAlert, FileText, Loader2 } from 'lucide-react'

export default function SocialIntegrations() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<any>(null)
  
  // YouTube State
  const [ytMode, setYtMode] = useState<'api_key' | 'oauth'>('api_key')
  const [ytApiKey, setYtApiKey] = useState('')
  const [ytPlaylistId, setYtPlaylistId] = useState('')
  const [ytEnabled, setYtEnabled] = useState(false)
  const [ytAutoPublish, setYtAutoPublish] = useState(true)
  const [ytFilterKeyword, setYtFilterKeyword] = useState('')
  const [ytMaxPerRun, setYtMaxPerRun] = useState(10)
  const [ytSyncInterval, setYtSyncInterval] = useState(30)
  const [ytConnected, setYtConnected] = useState(false)
  const [ytConfigured, setYtConfigured] = useState(false)
  const [ytChannelName, setYtChannelName] = useState('')

  // Instagram State
  const [igConfigured, setIgConfigured] = useState(false)
  const [igConnectedName, setIgConnectedName] = useState('')
  const [igEnabled, setIgEnabled] = useState(false)
  const [igAutoPublish, setIgAutoPublish] = useState(true)
  const [igHashtag, setIgHashtag] = useState('')
  const [igAutoPublishHashtag, setIgAutoPublishHashtag] = useState('')
  const [igMaxPerRun, setIgMaxPerRun] = useState(10)
  const [igSyncInterval, setIgSyncInterval] = useState(30)

  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [logs, setLogs] = useState<any[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [logsLoading, setLogsLoading] = useState(false)

  // Define loadStatus first so it can be used in useEffect
  const loadStatus = async () => {
    setLoading(true)
    try {
      const res = await api.get('/social/status')
      setStatus(res.data.data)
      const ig = res.data?.data
      if (ig) {
        setIgConfigured(!!ig.connected && !!ig.configured)
        setIgConnectedName(ig.accountName || '')
        setIgEnabled(!!ig.settings?.enabled)
        setIgAutoPublish(!!ig.settings?.autoPublish)
        setIgHashtag(ig.settings?.filterHashtag || '')
        setIgAutoPublishHashtag(ig.settings?.autoPublishHashtag || '')
        setIgMaxPerRun(Number(ig.settings?.maxPerRun || 10))
        setIgSyncInterval(Number(ig.settings?.syncIntervalMinutes || 30))
      }

      // Load YouTube Status
      try {
        const yt = await api.get('/social/youtube/status')
        const yts = yt.data?.data
        if (yts) {
          setYtEnabled(!!yts.enabled)
          setYtConnected(!!yts.connected)
          setYtConfigured(!!yts.configured)
          setYtChannelName(yts.channelName || '')
          // Infer mode from response or default to api_key if key exists, else oauth if connected
          // If the backend doesn't return mode explicitly, we can guess or default.
          // For now let's assume if there's no API key but it's connected, it's OAuth.
          // But since we can't see the key (masked), we rely on settings.
          
          // Ideally backend should return 'mode'. Assuming it might in 'settings' or root.
          // If not available, default to api_key for now.
          const mode = yts.mode || yts.settings?.mode || (yts.connected && !yts.configured ? 'oauth' : 'api_key')
          setYtMode(mode)

          if (yts.settings) {
            setYtAutoPublish(!!yts.settings.autoPublish)
            setYtPlaylistId(yts.settings.playlistId || '')
            setYtFilterKeyword(yts.settings.filterKeyword || '')
            setYtMaxPerRun(Number(yts.settings.maxPerRun || 10))
            setYtSyncInterval(Number(yts.settings.syncIntervalMinutes || 30))
            // If api key was stored, we don't get it back in clear text usually, 
            // but we might want to keep the field empty or placeholder.
          }
        }
      } catch (e) {
        // don’t block the whole page if youtube isn't configured yet
      }
    } catch (e: any) {
      if (e?.response?.status === 401 || e?.response?.status === 403) { navigate('/admin/login'); return }
      console.error(e)
      setError('Failed to load status')
    } finally {
      setLoading(false)
    }
  }

  // Check URL params for callbacks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const successParam = params.get('social_success')
    if (successParam) {
      // 'instagram', 'youtube', or legacy 'true' (defaults to instagram for backward compat)
      const provider = successParam === 'youtube' ? 'YouTube' : 'Instagram'
      setNotice(`${provider} connected successfully!`)
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('social_error')) {
      setError('Connection failed: ' + params.get('social_error'))
      window.history.replaceState({}, '', window.location.pathname)
    }
    loadStatus()
  }, [])

  async function saveYouTube() {
    setError(''); setNotice('')
    await api.post('/social/youtube/config', {
      mode: ytMode,
      apiKey: ytMode === 'api_key' ? ytApiKey : undefined,
      playlistId: ytPlaylistId,
      enabled: ytEnabled,
      autoPublish: ytAutoPublish,
      filterKeyword: ytFilterKeyword,
      maxPerRun: ytMaxPerRun,
      syncIntervalMinutes: ytSyncInterval
    })
    setNotice('YouTube settings saved!')
  }

  async function connectYouTubeOAuth() {
    setError(''); setNotice('')
    try {
      const r = await api.post('/social/youtube/connect/start', {})
      const url = r.data?.url
      if (!url) throw new Error('Missing auth url')
      window.location.href = url
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to start YouTube connection')
    }
  }

  async function disconnectYouTube() {
    if (!window.confirm('Are you sure? This will disconnect YouTube.')) return
    try {
      await api.post('/social/youtube/disconnect')
      setNotice('YouTube disconnected')
      loadStatus()
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to disconnect')
    }
  }

  async function testYouTube() {
    setError(''); setNotice('')
    const r = await api.post('/social/youtube/test', {})
    setNotice(r.data?.sample ? `YouTube OK: ${r.data.sample.title}` : 'YouTube OK')
  }

  async function syncYouTube(preview = false) {
    setError(''); setNotice('')
    const r = await api.post('/social/youtube/sync', { mode: preview ? 'preview' : 'run' })
    setNotice(preview ? `Preview found ${r.data.totalFound}` : `Imported ${r.data.imported}, failed ${r.data.failed}`)
  }

  async function connectInstagram() {
    setError(''); setNotice('')
    const r = await api.post('/social/instagram/connect/start', {
      redirectUrl: window.location.origin
    })
    const url = r.data?.url
    if (!url) throw new Error('Missing auth url')
    window.location.href = url
  }

  async function syncInstagram(preview = false) {
    setError(''); setNotice('')
    setSyncing(true)
    try {
      const r = await api.post('/social/instagram/sync', {
        mode: preview ? 'preview' : 'run'
      })
      setNotice(
        preview
          ? `Preview found ${r.data.totalFound || 0}`
          : `Imported ${r.data.imported || 0}, failed ${r.data.failed || 0}`
      )
    } catch (e: any) {
      setError(e.response?.data?.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure? This will stop automatic syncing.')) return
    try {
      await api.post('/social/instagram/disconnect')
      setIgEnabled(false)
      setIgConfigured(false)
    } catch (e: any) {
      if (e?.response?.status === 401 || e?.response?.status === 403) { navigate('/admin/login'); return }
      setError(e.response?.data?.message || 'Failed to disconnect')
    }
  }

  const handleViewLogs = async () => {
    if (showLogs) {
      setShowLogs(false)
      return
    }
    
    setShowLogs(true)
    setLogsLoading(true)
    try {
      const res = await api.get('/social/instagram/logs')
      setLogs(res.data.data)
    } catch (e: any) {
      console.error(e)
      setError('Failed to fetch logs')
    } finally {
      setLogsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (igHashtag && !igHashtag.startsWith('#')) {
      setError('Hashtag filter must start with #')
      return
    }

    if (igAutoPublishHashtag && !igAutoPublishHashtag.startsWith('#')) {
      setError('Auto-publish hashtag must start with #')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.patch('/social/instagram/settings', {
        enabled: igEnabled,
        autoPublish: igAutoPublish,
        filterHashtag: igHashtag,
        autoPublishHashtag: igAutoPublishHashtag,
        maxPerRun: igMaxPerRun,
        syncIntervalMinutes: igSyncInterval
      })
      setNotice('Settings saved successfully.')
    } catch (e: any) {
      if (e?.response?.status === 401 || e?.response?.status === 403) { navigate('/admin/login'); return }
      setError(e.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const getTokenHealthBadge = () => {
    if (!status?.connected) return null
    
    if (status.health === 'expired') {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-medium">
          <ShieldAlert size={12} />
          Token Expired
        </div>
      )
    }

    if (status.health === 'warning') {
       // Calc days
       const days = status.tokenExpiresAt ? Math.ceil((new Date(status.tokenExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0
       return (
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded font-medium">
          <AlertTriangle size={12} />
          Expires in {days} days
        </div>
      )
    }

    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 text-xs rounded font-medium">
        <CheckCircle size={12} />
        Token Healthy
      </div>
    )
  }

  if (loading && !status) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading social settings...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <PageHeader 
        title="Social Integrations" 
        subtitle="Connect social accounts to automatically import content" 
        actions={[
          { label: "Back to Integrations", onClick: () => navigate('/admin/integrations'), primary: false }
        ]}
      />

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">{error}</div>}
      {notice && <div className="bg-green-50 text-green-600 p-4 rounded-lg border border-green-100">{notice}</div>}


      {/* -------------------- Instagram -------------------- */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Instagram</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Connect a Business/Creator account and auto-publish posts into Community.
            </p>

            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <span>Status:</span>
              {igConfigured ? (
                <span className="font-medium text-emerald-700">
                  Connected {igConnectedName ? `(${igConnectedName})` : ''}
                </span>
              ) : (
                <span className="font-medium text-slate-700 dark:text-slate-200">Not connected</span>
              )}
              {getTokenHealthBadge()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-700 dark:text-slate-200">Enabled</label>
            <input
              type="checkbox"
              checked={igEnabled}
              onChange={(e) => setIgEnabled(e.target.checked)}
              className="h-4 w-4"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Hashtag filter (optional)</label>
            <input
              value={igHashtag}
              onChange={(e) => setIgHashtag(e.target.value)}
              placeholder="#rationscommunity"
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Only import posts whose caption contains this hashtag.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Auto-publish hashtag (optional)</label>
            <input
              value={igAutoPublishHashtag}
              onChange={(e) => setIgAutoPublishHashtag(e.target.value)}
              placeholder="#rationsapproved (leave blank to publish all)"
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              When auto-publish is on, posts are published only if they contain this hashtag. Leave blank to publish everything you import.
            </p>
          </div>


          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Max per sync</label>
              <input
                value={igMaxPerRun}
                onChange={(e) => setIgMaxPerRun(Number(e.target.value || 0))}
                type="number"
                min={1}
                max={50}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Sync interval (mins)</label>
              <input
                value={igSyncInterval}
                onChange={(e) => setIgSyncInterval(Number(e.target.value || 0))}
                type="number"
                min={5}
                max={1440}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <input
              id="igAutoPublish"
              type="checkbox"
              checked={igAutoPublish}
              onChange={(e) => setIgAutoPublish(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="igAutoPublish" className="text-sm text-slate-700 dark:text-slate-200">
              Auto-publish to Community
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {!igConfigured ? (
              <Button
                variant="primary"
                onClick={connectInstagram}
              >
                Connect Instagram
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleSaveSettings}
              disabled={saving}
            >
              {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>

            <Button
              variant="outline"
              onClick={() => syncInstagram(false)}
              disabled={syncing || !igConfigured}
            >
              {syncing ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Sync now
            </Button>

            <Button
              variant="ghost"
              onClick={handleViewLogs}
            >
              <FileText className="h-4 w-4 mr-2" />
              {showLogs ? 'Hide Logs' : 'Logs'}
            </Button>
          </div>
        </div>

        {showLogs && (
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">Sync Logs</h4>
            {logsLoading ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">No logs found.</div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {logs.map((log: any, i: number) => (
                  <div key={i} className="text-xs border-b border-slate-50 pb-1 last:border-0">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                      <span className={log.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                        {log.status}
                      </span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-200 mt-1">{log.message}</div>
                    {log.details && <pre className="mt-1 text-[10px] bg-slate-50 dark:bg-slate-950 p-1 rounded overflow-x-auto">{JSON.stringify(log.details, null, 2)}</pre>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* -------------------- YouTube -------------------- */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">YouTube</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Pull videos from a playlist and auto-publish them into Community.
            </p>
            
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <span>Status:</span>
              {(ytMode === 'oauth' ? ytConnected : ytConfigured) ? (
                <span className="font-medium text-emerald-700">
                  {ytMode === 'oauth' ? `Connected ${ytChannelName ? `(${ytChannelName})` : ''}` : 'Connected (API Key)'}
                </span>
              ) : (
                <span className="font-medium text-slate-700 dark:text-slate-200">Not connected</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-700 dark:text-slate-200">Enabled</label>
            <input
              type="checkbox"
              checked={ytEnabled}
              onChange={(e) => setYtEnabled(e.target.checked)}
              className="h-4 w-4"
            />
          </div>
        </div>

        <div className="mt-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200 block mb-2">Authentication Method</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="ytMode"
                checked={ytMode === 'api_key'}
                onChange={() => setYtMode('api_key')}
                className="text-slate-900 dark:text-white focus:ring-slate-500"
              />
              <span>API Key (Manual)</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="ytMode"
                checked={ytMode === 'oauth'}
                onChange={() => setYtMode('oauth')}
                className="text-slate-900 dark:text-white focus:ring-slate-500"
              />
              <span>OAuth (Connect Account)</span>
            </label>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {ytMode === 'api_key' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">API Key</label>
              <div className="flex gap-2 mt-1">
                <input
                  value={ytApiKey}
                  onChange={(e) => setYtApiKey(e.target.value)}
                  placeholder={ytConfigured ? "••••••••••••••••" : "AIzaSy..."}
                  type="password"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
                />
                {ytConfigured && (
                  <Button variant="outline" onClick={disconnectYouTube} size="sm">
                    Disconnect
                  </Button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Stored securely. Required for fetching public playlists.
              </p>
            </div>
          ) : (
             <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Account</label>
              <div className="mt-1">
                {!ytConnected ? (
                  <Button variant="primary" onClick={connectYouTubeOAuth} size="sm">
                    Connect YouTube
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                     <div className="text-sm text-slate-900 dark:text-white border px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 flex-1">
                        {ytChannelName || 'Connected'}
                     </div>
                     <Button variant="outline" onClick={disconnectYouTube} size="sm">
                       Disconnect
                     </Button>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Connect your Google account to access private playlists or uploads.
              </p>
             </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Playlist ID</label>
            <input
              value={ytPlaylistId}
              onChange={(e) => setYtPlaylistId(e.target.value)}
              placeholder="PLxxxxxxxxxxxxxxxx"
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tip: Use your channel’s “Uploads” playlist ID.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Filter keyword (optional)</label>
            <input
              value={ytFilterKeyword}
              onChange={(e) => setYtFilterKeyword(e.target.value)}
              placeholder="e.g. rations"
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Only import videos whose title/description contains this text.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Max per sync</label>
              <input
                value={ytMaxPerRun}
                onChange={(e) => setYtMaxPerRun(Number(e.target.value || 0))}
                type="number"
                min={1}
                max={50}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Sync interval (mins)</label>
              <input
                value={ytSyncInterval}
                onChange={(e) => setYtSyncInterval(Number(e.target.value || 0))}
                type="number"
                min={5}
                max={1440}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <input
              id="ytAutoPublish"
              type="checkbox"
              checked={ytAutoPublish}
              onChange={(e) => setYtAutoPublish(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="ytAutoPublish" className="text-sm text-slate-700 dark:text-slate-200">
              Auto-publish to Community
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => saveYouTube()}>
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>

            <Button variant="outline" onClick={() => testYouTube()}>
              Test
            </Button>

            <Button variant="outline" onClick={() => syncYouTube(true)}>
              <ExternalLink className="h-4 w-4 mr-2" /> Preview
            </Button>

            <Button variant="outline" onClick={() => syncYouTube(false)}>
              <Download className="h-4 w-4 mr-2" /> Sync now
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}