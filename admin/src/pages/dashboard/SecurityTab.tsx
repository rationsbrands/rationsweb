import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function SecurityTab() {
  const { changePassword } = useAuth()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
  const [errors, setErrors] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const validate = () => {
    const e = { currentPassword: '', newPassword: '', confirmNewPassword: '' }
    if (!form.currentPassword) e.currentPassword = 'Current password is required'
    if (form.newPassword.length < 8 || !/\d/.test(form.newPassword)) {
      e.newPassword = 'Min 8 characters and at least 1 number'
    }
    if (form.confirmNewPassword !== form.newPassword) {
      e.confirmNewPassword = 'Passwords do not match'
    }
    setErrors(e)
    return !(e.currentPassword || e.newPassword || e.confirmNewPassword)
  }

  const submit = async () => {
    if (!validate()) { setMsg('Fix the errors above.'); return }
    setSaving(true); setMsg('')
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      setMsg('Password updated')
      setForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
    } catch (err) {
      setMsg(err?.response?.data?.message || 'Unable to update password')
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-3">
      <h2 className="text-lg font-semibold">Security</h2>
      <div>
        <label className="block text-xs text-slate-600 mb-1">Current Password</label>
        <input type="password" value={form.currentPassword} onChange={(e)=>setForm(f=>({ ...f, currentPassword: e.target.value }))} className={`w-full rounded-lg px-3 py-2 text-sm border ${errors.currentPassword?'border-red-500':'border-slate-300'}`} />
        {errors.currentPassword && <p className="text-xs text-red-600 mt-1">{errors.currentPassword}</p>}
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">New Password</label>
        <input type="password" value={form.newPassword} onChange={(e)=>setForm(f=>({ ...f, newPassword: e.target.value }))} className={`w-full rounded-lg px-3 py-2 text-sm border ${errors.newPassword?'border-red-500':'border-slate-300'}`} />
        {errors.newPassword && <p className="text-xs text-red-600 mt-1">{errors.newPassword}</p>}
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">Confirm New Password</label>
        <input type="password" value={form.confirmNewPassword} onChange={(e)=>setForm(f=>({ ...f, confirmNewPassword: e.target.value }))} className={`w-full rounded-lg px-3 py-2 text-sm border ${errors.confirmNewPassword?'border-red-500':'border-slate-300'}`} />
        {errors.confirmNewPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmNewPassword}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button className="px-3 py-2 rounded-full bg-ration-dark text-ration-yellow text-sm" onClick={submit} disabled={saving}>{saving?'Updating...':'Update Password'}</button>
      </div>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </div>
  )
}
