import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import ThemeToggle from '../ThemeToggle'
import api from '../../api/api'
import { useEffect, useState } from 'react'

export default function AdminTopbar({ onToggleSidebar }: any) {
  const { user, logout } = useAuth()
  const { branding } = useTenant()
  const [platformEnabled, setPlatformEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.get('/admin/integrations/platform').then((res) => {
      const ok = res?.data?.success !== false
      const status = res?.data?.data?.status || (ok ? 'connected' : 'disconnected')
      if (!cancelled) setPlatformEnabled(String(status) === 'connected')
    }).catch(() => {
      if (!cancelled) setPlatformEnabled(false)
    })
    return () => { cancelled = true }
  }, [])

  const openPlatform = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await api.post('/admin/sso/issue', {})
      const url = res?.data?.data?.redirectUrl
      if (url) {
        window.location.href = url
        return
      }
      alert('SSO failed')
    } catch (e: any) {
      alert('SSO not available')
    } finally {
      setBusy(false)
    }
  }
  return (
    <header className="h-14 border-b bg-white dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <button className="md:hidden px-3 py-2 min-h-[44px] rounded-lg border dark:border-slate-700 dark:text-white" onClick={onToggleSidebar}>Menu</button>
        <div className="flex items-center gap-2">
          {branding.logoUrl && (<img src={branding.logoUrl} alt="logo" className="w-8 h-8 rounded" />)}
          <div className="text-sm font-semibold dark:text-white">{branding.name || 'Platform'}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="hidden sm:block text-xs text-slate-600 dark:text-slate-400">{String(user?.role||'').toUpperCase()} • {user?.name || ''}</div>
        {platformEnabled && (
          <button
            onClick={openPlatform}
            disabled={busy}
            className="text-xs px-3 py-2 min-h-[44px] rounded-full border dark:border-slate-700 dark:text-white transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {busy ? 'Opening…' : 'Open Platform'}
          </button>
        )}
        <button onClick={logout} className="text-xs px-3 py-2 min-h-[44px] rounded-full border dark:border-slate-700 dark:text-white transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">Logout</button>
      </div>
    </header>
  )
}
