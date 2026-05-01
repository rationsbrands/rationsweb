import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SITE } from '../../config/site'
import api from '../../api/api'
import Button from '@shared/ui/Button'
import { Trash2, Plus } from 'lucide-react'

interface Alert {
  _id: string;
  tag: string;
  title: string;
  alertEnabled: boolean;
  alertStart: string;
  alertEnd: string;
}

export default function AdminSettings() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingContacts, setEditingContacts] = useState(false)
  const [editingIdentity, setEditingIdentity] = useState(false)
  const [editingBank, setEditingBank] = useState(false)
  const [editingSocials, setEditingSocials] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api.get('/admin/settings').then(res => {
      const s = res.data.data
      // Ensure bankAccounts exists
      if (!s.bankAccounts || s.bankAccounts.length === 0) {
        if (s.bank && s.bank.name) {
          s.bankAccounts = [{
            bankName: s.bank.name,
            accountName: s.bank.accountName,
            accountNumber: s.bank.accountNumber
          }]
        } else {
          s.bankAccounts = []
        }
      }
      if (!s.additionalContacts) s.additionalContacts = []
      setSettings(s)
    }).catch(() => setError('Failed to load settings')).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const loadAlerts = async () => {
      setLoadingAlerts(true)
      try {
        const res = await api.get('/admin/community')
        const list = Array.isArray(res.data?.data) ? res.data.data : []
        const isTagMatch = (t) => {
          const x = String(t || '').toLowerCase()
          return x === 'promo' || x === 'promos' || x === 'event' || x === 'events' || x === 'announcement' || x === 'anouncement'
        }
        const enabled = list.filter(p => Boolean(p.alertEnabled) && isTagMatch(p.tag))
        setAlerts(enabled)
      } catch {
        setAlerts([])
      } finally {
        setLoadingAlerts(false)
      }
    }
    loadAlerts()
  }, [])

  const updateField = (path: string, value: any) => {
    setSettings(prev => {
      const next = { ...(prev || {}) }
      if (path.includes('.')) {
        const [group, key] = path.split('.')
        next[group] = { ...(next[group] || {}) , [key]: value }
      } else {
        next[path] = value
      }
      return next
    })
  }

  const updateSocial = (idx: number, field: 'name' | 'url', value: string) => {
    setSettings(prev => {
      const next = { ...(prev || {}), socials: [...(prev?.socials || [])] }
      next.socials[idx] = { ...(next.socials[idx] || {}), [field]: value }
      return next
    })
  }

  const addSocial = () => {
    setSettings(prev => {
      const next = { ...(prev || {}), socials: [...(prev?.socials || [])] }
      next.socials.push({ name: '', url: '' })
      return next
    })
  }

  const removeSocial = (idx: number) => {
    setSettings(prev => {
      const next = { ...(prev || {}), socials: [...(prev?.socials || [])] }
      next.socials.splice(idx, 1)
      return next
    })
  }

  const updateBankAccount = (idx: number, field: string, value: string) => {
    setSettings(prev => {
      const next = { ...(prev || {}), bankAccounts: [...(prev?.bankAccounts || [])] }
      next.bankAccounts[idx] = { ...(next.bankAccounts[idx] || {}), [field]: value }
      return next
    })
  }

  const addBankAccount = () => {
    setSettings(prev => {
      const next = { ...(prev || {}), bankAccounts: [...(prev?.bankAccounts || [])] }
      next.bankAccounts.push({ bankName: '', accountName: '', accountNumber: '' })
      return next
    })
  }

  const removeBankAccount = (idx: number) => {
    setSettings(prev => {
      const next = { ...(prev || {}), bankAccounts: [...(prev?.bankAccounts || [])] }
      next.bankAccounts.splice(idx, 1)
      return next
    })
  }

  const updateAdditionalContact = (idx: number, field: string, value: string) => {
    setSettings(prev => {
      const next = { ...(prev || {}), additionalContacts: [...(prev?.additionalContacts || [])] }
      next.additionalContacts[idx] = { ...(next.additionalContacts[idx] || {}), [field]: value }
      return next
    })
  }

  const addAdditionalContact = () => {
    setSettings(prev => {
      const next = { ...(prev || {}), additionalContacts: [...(prev?.additionalContacts || [])] }
      next.additionalContacts.push({ label: '', value: '', type: 'other' })
      return next
    })
  }

  const removeAdditionalContact = (idx: number) => {
    setSettings(prev => {
      const next = { ...(prev || {}), additionalContacts: [...(prev?.additionalContacts || [])] }
      next.additionalContacts.splice(idx, 1)
      return next
    })
  }

  const save = async () => {
    setError('')
    try {
      // Sync primary bank account for legacy clients
      const payload = { ...settings }
      if (payload.bankAccounts && payload.bankAccounts.length > 0) {
        const primary = payload.bankAccounts[0]
        payload.bank = {
          name: primary.bankName,
          accountName: primary.accountName,
          accountNumber: primary.accountNumber
        }
      }
      const res = await api.put('/admin/settings', payload)
      const s = res.data.data
      // Merge into SITE for immediate UI reflection
      if (s.contacts) SITE.contacts = { ...SITE.contacts, ...s.contacts }
      if (s.bank) SITE.bank = { ...SITE.bank, ...s.bank }
      if (Array.isArray(s.socials)) {
        const map = new Map(s.socials.map((x: any) => [x.name, x.url]))
        SITE.socials = (SITE.socials || []).map((entry) => ({ ...entry, url: String(map.get(entry.name) ?? entry.url) }))
      }
      SITE.promoMessage = s.promoMessage || ''
      SITE.promoStart = s.promoStart || null
      SITE.promoEnd = s.promoEnd || null
      SITE.eventMessage = s.eventMessage || ''
      SITE.eventDate = s.eventDate || null
      SITE.eventStart = s.eventStart || null
      SITE.eventEnd = s.eventEnd || null
      SITE.visitorAlertEnabled = Boolean(s.visitorAlertEnabled)
      setSettings(s)
      setEditingContacts(false)
      setEditingIdentity(false)
      setEditingBank(false)
      setEditingSocials(false)
      
    } catch (e) {
      setError('Failed to save settings')
    }
  }

  const reload = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/settings');
      const settings = res.data?.data ?? {};
      setSettings(settings);
      setAlerts(settings.alerts || []);
    } catch {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const updateAlertField = (idx: number, field: keyof Alert, value: any) => {
    setAlerts(prev => {
      const next = [...prev]
      next[idx] = { ...(next[idx] || {}), [field]: value }
      return next
    })
  }

  const saveAlert = async (idx: number) => {
    const a = alerts[idx]
    if (!a) return
    const payload = {
      alertEnabled: Boolean(a.alertEnabled),
      alertStart: a.alertStart ? new Date(a.alertStart).toISOString() : '',
      alertEnd: a.alertEnd ? new Date(a.alertEnd).toISOString() : '',
    }
    try {
      await api.put(`/admin/community/${a._id}`, payload)
      const res = await api.get('/admin/community')
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      const isTagMatch = (t) => {
        const x = String(t || '').toLowerCase()
        return x === 'promo' || x === 'promos' || x === 'event' || x === 'events' || x === 'announcement' || x === 'anouncement'
      }
      const enabled = list.filter(p => Boolean(p.alertEnabled) && isTagMatch(p.tag))
      setAlerts(enabled)
      setNotice('Alert updated')
    } catch {
      setNotice('Failed to update alert')
    }
  }

  const hideAlert = async (idx: number) => {
    const a = alerts[idx]
    if (!a) return
    try {
      await api.put(`/admin/community/${a._id}`, { alertEnabled: false })
      setAlerts(prev => prev.filter(x => x._id !== a._id))
      setNotice('Alert removed from website')
    } catch {
      setNotice('Failed to remove alert')
    }
  }

  const deleteAlert = async (idx: number) => {
    const a = alerts[idx]
    if (!a) return
    try {
      await api.delete(`/admin/community/${a._id}`)
      setAlerts(prev => prev.filter(x => x._id !== a._id))
      setNotice('Alert deleted permanently')
    } catch {
      setNotice('Failed to delete alert')
    }
  }

  if (loading) return (
    <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
  )

  if (!settings) return (
    <p className="text-sm text-red-500">{error || 'Unable to load settings'}</p>
  )

  const socials = settings.socials || []
  const contacts = settings.contacts || {}
  const additionalContacts = settings.additionalContacts || []
  const bankAccounts = settings.bankAccounts || []
  const visitorAlertEnabled = Boolean(settings?.visitorAlertEnabled)

  return (
    <>
      <h1 className="text-xl font-semibold">Settings</h1>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      {notice && <p className="text-xs text-green-600 mt-1">{notice}</p>}
      
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-sm mt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Site Identity & Theme</div>
          {!editingIdentity && (
            <button className="text-sm px-4 py-2 min-h-[44px] rounded-full border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={()=>setEditingIdentity(true)}>Edit</button>
          )}
        </div>
        {editingIdentity ? (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Site Name</span>
                <input value={settings.siteName || ''} onChange={(e)=>updateField('siteName', e.target.value)} className="w-full border rounded-lg px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Tagline</span>
                <input value={settings.tagline || ''} onChange={(e)=>updateField('tagline', e.target.value)} className="w-full border rounded-lg px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Description</span>
              <textarea value={settings.description || ''} onChange={(e)=>updateField('description', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 min-h-[80px]" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Primary Color</span>
              <div className="flex gap-2 items-center">
                <input type="color" value={settings.primaryColor || '#FDCD2F'} onChange={(e)=>updateField('primaryColor', e.target.value)} className="h-11 w-16 p-0 border-0 rounded cursor-pointer" />
                <input value={settings.primaryColor || '#FDCD2F'} onChange={(e)=>updateField('primaryColor', e.target.value)} className="border rounded-lg px-3 py-2 min-h-[44px] w-28 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
            </label>
            <div className="flex gap-3 mt-4">
              <Button onClick={save} className="min-h-[44px]">Save</Button>
              <Button onClick={()=>{ setEditingIdentity(false); reload() }} variant="secondary" className="min-h-[44px]">Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Site Name</div>
              <div className="font-medium">{settings.siteName || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Tagline</div>
              <div>{settings.tagline || '—'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Description</div>
              <div>{settings.description || '—'}</div>
            </div>
            <div>
               <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Primary Color</div>
               <div className="flex gap-2 items-center">
                 <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: settings.primaryColor || '#FDCD2F' }}></div>
                 <span>{settings.primaryColor || '#FDCD2F'}</span>
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Contacts</div>
            {!editingContacts && (
              <button className="text-sm px-4 py-2 min-h-[44px] rounded-full border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={()=>setEditingContacts(true)}>Edit</button>
            )}
          </div>
          {editingContacts ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="font-medium text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Primary Contacts</div>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Email</span>
                  <input value={contacts.email || ''} onChange={(e)=>updateField('contacts.email', e.target.value)} className="w-full border rounded-lg px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Phone</span>
                  <input value={contacts.phone || ''} onChange={(e)=>updateField('contacts.phone', e.target.value)} className="w-full border rounded-lg px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">WhatsApp</span>
                  <input value={contacts.whatsapp || ''} onChange={(e)=>updateField('contacts.whatsapp', e.target.value)} className="w-full border rounded-lg px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Location</span>
                  <input value={contacts.location || ''} onChange={(e)=>updateField('contacts.location', e.target.value)} className="w-full border rounded-lg px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </label>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="font-medium text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Additional Contacts</div>
                {additionalContacts.map((c, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-1">
                        <input 
                          placeholder="Label (e.g. Support)"
                          value={c.label || ''} 
                          onChange={(e)=>updateAdditionalContact(idx, 'label', e.target.value)} 
                          className="w-full border rounded-lg px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" 
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input 
                          placeholder="Value (e.g. +234...)"
                          value={c.value || ''} 
                          onChange={(e)=>updateAdditionalContact(idx, 'value', e.target.value)} 
                          className="w-full border rounded-lg px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" 
                        />
                      </div>
                    </div>
                    <button onClick={() => removeAdditionalContact(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <button onClick={addAdditionalContact} className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 min-h-[44px] px-2">
                  <Plus size={18} /> Add Contact
                </button>
              </div>

              <div className="flex gap-3 mt-4">
                <Button onClick={save} className="min-h-[44px]">Save</Button>
                <Button onClick={()=>{ setEditingContacts(false); reload() }} variant="secondary" className="min-h-[44px]">Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <div>Email: {contacts.email || '—'}</div>
                <div>Phone: {contacts.phone || '—'}</div>
                <div>WhatsApp: {contacts.whatsapp || '—'}</div>
                <div>Location: {contacts.location || '—'}</div>
              </div>
              {additionalContacts.length > 0 && (
                <div className="pt-2 border-t space-y-1">
                  {additionalContacts.map((c, idx) => (
                    <div key={idx} className="text-slate-600 dark:text-slate-300">
                      <span className="font-medium text-slate-900 dark:text-white">{c.label}:</span> {c.value}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Bank Accounts</div>
          {!editingBank && (
            <button className="text-sm px-4 py-2 min-h-[44px] rounded-full border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={()=>setEditingBank(true)}>Edit</button>
          )}
        </div>
        {editingBank ? (
          <div className="space-y-4">
            {bankAccounts.map((acc, idx) => (
              <div key={idx} className="space-y-3 border-b pb-4 last:border-0 last:pb-0 relative">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Account #{idx + 1}</div>
                  {bankAccounts.length > 1 && (
                    <button onClick={() => removeBankAccount(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Bank Name</span>
                  <input value={acc.bankName || ''} onChange={(e)=>updateBankAccount(idx, 'bankName', e.target.value)} className="w-full border rounded-lg px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Account Name</span>
                  <input value={acc.accountName || ''} onChange={(e)=>updateBankAccount(idx, 'accountName', e.target.value)} className="w-full border rounded-lg px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 block">Account Number</span>
                  <input value={acc.accountNumber || ''} onChange={(e)=>updateBankAccount(idx, 'accountNumber', e.target.value)} className="w-full border rounded-lg px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </label>
              </div>
            ))}
            
            <button onClick={addBankAccount} className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 min-h-[44px] px-2">
              <Plus size={18} /> Add Bank Account
            </button>

            <div className="flex gap-3 mt-4 pt-2 border-t">
              <Button onClick={save} className="min-h-[44px]">Save</Button>
              <Button onClick={()=>{ setEditingBank(false); reload() }} variant="secondary" className="min-h-[44px]">Cancel</Button>
            </div>
          </div>
        ) : (
            <div className="space-y-4">
              {bankAccounts.map((acc, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="font-medium text-slate-900 dark:text-white">{acc.bankName || '—'}</div>
                  <div>{acc.accountName || '—'}</div>
                  <div className="font-mono text-slate-600 dark:text-slate-300">{acc.accountNumber || '—'}</div>
                </div>
              ))}
              {bankAccounts.length === 0 && <div className="text-slate-500 dark:text-slate-400 italic">No bank accounts added</div>}
            </div>
          )}
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-sm mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Promos & Events</div>
        </div>
        
        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700">
           <div className="flex justify-between items-center">
             <div>
               <div className="font-medium text-slate-800 dark:text-slate-100">Global Promo Pricing</div>
               <div className="text-xs text-slate-500 dark:text-slate-400">Enable or disable all promotional prices on the website menu.</div>
             </div>
             <div className="flex items-center gap-3">
               <label className="flex items-center cursor-pointer relative min-h-[44px]">
                 <input 
                   type="checkbox" 
                   className="sr-only peer" 
                   checked={Boolean(settings?.features?.promoPricingEnabled)} 
                   onChange={(e) => updateField('features.promoPricingEnabled', e.target.checked)} 
                 />
                 <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
               </label>
               <Button onClick={save} className="min-h-[44px]">Save</Button>
             </div>
           </div>
        </div>
        
        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700">
           <div className="flex justify-between items-center">
             <div>
               <div className="font-medium text-slate-800 dark:text-slate-100">Visitor Alert Banner</div>
               <div className="text-xs text-slate-500 dark:text-slate-400">Show the active promo/event at the top of the site.</div>
             </div>
             <div className="flex items-center gap-3">
               <label className="flex items-center cursor-pointer relative min-h-[44px]">
                 <input 
                   type="checkbox" 
                   className="sr-only peer" 
                   checked={visitorAlertEnabled} 
                   onChange={(e) => updateField('visitorAlertEnabled', e.target.checked)} 
                 />
                 <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
               </label>
               <Button onClick={save} className="min-h-[44px]">Save</Button>
             </div>
           </div>
        </div>

        <div className="mt-2">
          <div className="font-semibold mb-2">Enabled alerts</div>
          {loadingAlerts ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">No enabled alerts</div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a, idx) => (
                <div key={a._id} className="border rounded-lg p-3">
                  <div className="text-xs uppercase text-slate-500 dark:text-slate-400">{a.tag}</div>
                  <div className="font-medium">{a.title}</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 items-end">
                    <label className="text-sm">
                      <span className="block mb-1">Enabled</span>
                      <div className="flex items-center min-h-[44px]">
                        <input type="checkbox" checked={Boolean(a.alertEnabled)} onChange={(e)=>updateAlertField(idx, 'alertEnabled', e.target.checked)} className="w-5 h-5 accent-primary-600" />
                      </div>
                    </label>
                    <label className="text-sm">
                      <span className="block mb-1">Start</span>
                      <input type="datetime-local" value={a.alertStart ? new Date(a.alertStart).toISOString().slice(0,16) : ''} onChange={(e)=>updateAlertField(idx, 'alertStart', e.target.value ? new Date(e.target.value).toISOString() : '')} className="w-full border rounded px-2 py-2 min-h-[44px]" />
                    </label>
                    <label className="text-sm">
                      <span className="block mb-1">End</span>
                      <input type="datetime-local" value={a.alertEnd ? new Date(a.alertEnd).toISOString().slice(0,16) : ''} onChange={(e)=>updateAlertField(idx, 'alertEnd', e.target.value ? new Date(e.target.value).toISOString() : '')} className="w-full border rounded px-2 py-2 min-h-[44px]" />
                    </label>
                  </div>
                  <div className="mt-2 flex flex-col sm:flex-row gap-2">
                    <Button onClick={()=>saveAlert(idx)} className="min-h-[44px]">Update</Button>
                    <Button onClick={()=>hideAlert(idx)} className="border min-h-[44px]">Remove from Website</Button>
                    <Button onClick={()=>deleteAlert(idx)} className="border text-red-600 min-h-[44px]">Delete Permanently</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-sm mt-4">
        <div className="font-semibold mb-2">Platform Integrations</div>
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="text-slate-500 dark:text-slate-400 text-xs">
            Manage connections to Instagram, payment gateways, and other external services.
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button onClick={() => navigate('/admin/integrations/social')} variant="outline" className="min-h-[44px]">
              Manage Social Settings
            </Button>
            <Button onClick={() => navigate('/admin/integrations')} variant="ghost" className="min-h-[44px]">
              View All Integrations
            </Button>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-sm mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Socials</div>
          {!editingSocials && (
            <button className="text-sm px-4 py-2 min-h-[44px] rounded-full border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={()=>setEditingSocials(true)}>Edit</button>
          )}
        </div>
        {editingSocials ? (
          <div className="space-y-3">
            {socials.map((s, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-1">
                    <input 
                      placeholder="Platform (e.g. Instagram)"
                      value={s.name || ''} 
                      onChange={(e)=>updateSocial(idx, 'name', e.target.value)} 
                      className="w-full border rounded-lg px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" 
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input 
                      placeholder="URL (https://...)"
                      value={s.url || ''} 
                      onChange={(e)=>updateSocial(idx, 'url', e.target.value)} 
                      className="w-full border rounded-lg px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" 
                    />
                  </div>
                </div>
                <button 
                  onClick={() => removeSocial(idx)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Remove"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            
            <button 
              onClick={addSocial}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 min-h-[44px] px-2"
            >
              <Plus size={18} /> Add Social Link
            </button>

            <div className="flex gap-3 mt-4 pt-2 border-t">
              <Button onClick={save} className="min-h-[44px]">Save</Button>
              <Button onClick={()=>{ setEditingSocials(false); reload() }} className="min-h-[44px]" variant="secondary">Cancel</Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-1">
            {socials.map(s => (
              <li key={s.name}>
                {s.name}: <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.url}</a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
