import { useEffect, useState } from 'react'
import api from '../api/api'
import Button from '@shared/ui/Button'
import { useNavigate } from 'react-router-dom'

export default function Setup() {
  const [status, setStatus] = useState<{ loading: boolean, canSetup: boolean, reason?: string }>({ loading: true, canSetup: false })
  const [form, setForm] = useState({ tenantName: '', ownerName: '', ownerEmail: '', ownerPassword: '', bootstrapToken: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    ;(async () => {
      try {
        const res = await api.get('/admin/setup/status')
        setStatus({ loading: false, canSetup: !!res.data?.canSetup, reason: res.data?.reason })
      } catch (err: any) {
        setStatus({ loading: false, canSetup: false, reason: err.message || 'Network error' })
      }
    })()
  }, [])

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  const isValid =
    form.tenantName.trim().length > 0 &&
    form.ownerName.trim().length > 0 &&
    form.ownerEmail.trim().length > 0 &&
    form.ownerPassword.length >= 8

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!isValid || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const headers: any = {}
      const bt = form.bootstrapToken.trim()
      if (bt) headers['X-Bootstrap-Token'] = bt
      const payload = {
        tenantName: form.tenantName.trim(),
        ownerName: form.ownerName.trim(),
        ownerEmail: form.ownerEmail.trim().toLowerCase(),
        ownerPassword: form.ownerPassword,
      }
      const res = await api.post('/admin/setup', payload, { headers })
      const accessToken = res.data?.accessToken
      if (accessToken) localStorage.setItem("rations_admin_token", accessToken);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Setup failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (status.loading) {
    return <div className="max-w-md mx-auto p-8">Loading...</div>
  }

  if (!status.canSetup) {
    return <div className="max-w-md mx-auto p-8">
      <div className="text-sm">Setup is not available. {status.reason || ''}</div>
      <div className="mt-4">
        <a className="underline text-sm" href="/admin/login">Go to Login</a>
      </div>
    </div>
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bootstrap Setup</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create tenant and owner</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1 text-slate-700 dark:text-slate-200">Tenant Name</label>
          <input name="tenantName" type="text" value={form.tenantName} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-ration-yellow focus:outline-none" required />
        </div>
        <div>
          <label className="block text-sm mb-1 text-slate-700 dark:text-slate-200">Owner Name</label>
          <input name="ownerName" type="text" value={form.ownerName} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-ration-yellow focus:outline-none" required />
        </div>
        <div>
          <label className="block text-sm mb-1 text-slate-700 dark:text-slate-200">Owner Email</label>
          <input name="ownerEmail" type="email" value={form.ownerEmail} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-ration-yellow focus:outline-none" required />
        </div>
        <div>
          <label className="block text-sm mb-1 text-slate-700 dark:text-slate-200">Owner Password</label>
          <input name="ownerPassword" type="password" value={form.ownerPassword} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-ration-yellow focus:outline-none" required />
        </div>
        <div>
          <label className="block text-sm mb-1 text-slate-700 dark:text-slate-200">Bootstrap Token (optional)</label>
          <input name="bootstrapToken" type="text" value={form.bootstrapToken} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-ration-yellow focus:outline-none" />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <Button className="w-full" type="submit" disabled={!isValid || submitting}>
          {submitting ? 'Setting up...' : 'Setup'}
        </Button>
      </form>
    </div>
  )
}
