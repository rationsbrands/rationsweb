import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function ProfileTab({ me, onUpdated }: any) {
  const { updateMe } = useAuth()
  const [form, setForm] = useState({ name: '', phone: '', email: '', addressLine: '' })
  const [editing, setEditing] = useState(false)
  const [msg, setMsg] = useState('')
  const [errors, setErrors] = useState({ name: '', phone: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm({ name: me?.name || '', phone: me?.phone || '', email: me?.email || '', addressLine: me?.addressLine || me?.address || '' })
  }, [me])

  const validate = () => {
    const e = { name: '', phone: '' }
    if (!form.name || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters'
    const phoneValid = /^\+234\d{10}$/.test(form.phone) || /^\d{11}$/.test(form.phone)
    if (!phoneValid) e.phone = 'Phone must be +234xxxxxxxxxx or 11 digits'
    setErrors(e)
    return !(e.name || e.phone)
  }

  const save = async () => {
    if (!validate()) { setMsg('Fix the errors above.'); return }
    setSaving(true); setMsg('')
    try {
      await updateMe({ name: form.name.trim(), phone: form.phone.trim(), email: form.email?.trim() || undefined, addressLine: form.addressLine?.trim() || undefined })
      setEditing(false)
      setMsg('Profile updated successfully')
      onUpdated?.()
    } catch {
      setMsg('Failed to update profile')
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-3">
      <h2 className="text-lg font-semibold">Profile</h2>
      <div>
        <label className="block text-xs text-slate-600 mb-1">Name *</label>
        <input disabled={!editing} value={form.name} onChange={(e)=>setForm(f=>({ ...f, name: e.target.value }))} className={`w-full rounded-lg px-3 py-2 text-sm border ${errors.name?'border-red-500':'border-slate-300'}`} />
        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">Phone *</label>
        <input disabled={!editing} value={form.phone} onChange={(e)=>setForm(f=>({ ...f, phone: e.target.value }))} className={`w-full rounded-lg px-3 py-2 text-sm border ${errors.phone?'border-red-500':'border-slate-300'}`} />
        {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">Email</label>
        <input disabled={!editing} value={form.email} onChange={(e)=>setForm(f=>({ ...f, email: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm border border-slate-300" />
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">Address Line</label>
        <input disabled={!editing} value={form.addressLine} onChange={(e)=>setForm(f=>({ ...f, addressLine: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm border border-slate-300" />
      </div>
      <div className="flex items-center gap-2">
        {!editing ? (
          <button className="px-3 py-2 rounded-full border border-slate-300 text-sm" onClick={()=>setEditing(true)}>Edit</button>
        ) : (
          <>
            <button className="px-3 py-2 rounded-full bg-ration-dark text-ration-yellow text-sm" onClick={save} disabled={saving}>{saving?'Saving...':'Save Changes'}</button>
            <button className="px-3 py-2 rounded-full border border-slate-300 text-sm" onClick={()=>{ setEditing(false); setErrors({ name:'', phone:'' }) }}>Cancel</button>
          </>
        )}
      </div>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </div>
  )
}