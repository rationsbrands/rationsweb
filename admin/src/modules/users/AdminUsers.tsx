import { useEffect, useState } from 'react'
import api from '../../api/api'
import PageHeader from '@shared/ui/PageHeader'
import Card from '@shared/ui/Card'
import SelectInput from '@shared/ui/SelectInput'
import TextInput from '@shared/ui/TextInput'
import AppButton from '@shared/ui/AppButton'
import { useAuth } from '../../context/AuthContext'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [savingId, setSavingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', role: '' })
  const [notice, setNotice] = useState('')
  const { user: currentUser } = useAuth()

  const load = () => {
    setLoading(true)
    api.get('/admin/users')
      .then(res => setUsers(res.data.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const [roleOptions, setRoleOptions] = useState<string[]>([])
  useEffect(() => {
    setLoading(true)
    api.get('/admin/roles/options').then(res => {
      setRoleOptions(res.data.data?.roles || [])
    }).catch(() => setRoleOptions([]))
      .finally(() => setLoading(false))
  }, [])
  const changeRole = async (id: string, role: string) => {
    setSavingId(id)
    try {
      await api.patch(`/admin/users/${id}/role`, { role })
      load()
    } finally {
      setSavingId(null)
    }
  }

  const handleCreate = async (e: any) => {
    e.preventDefault()
    setNotice('')
    try {
      const payload = { name: form.name.trim(), email: form.email.trim(), role: form.role }
      await api.post('/admin/users/invite', payload)
      setForm({ name: '', email: '', role: '' })
      setNotice('User invited')
      load()
    } catch (err) {
      setNotice(err.response?.data?.message || 'Unable to create user')
    }
  }

  return (
    <>
      <PageHeader title="Staff & Roles" />
      {notice && <p className="text-xs text-green-600 mt-1">{notice}</p>}
      {(currentUser?.role==='owner' || currentUser?.role==='ADMIN' || currentUser?.role==='SUPERADMIN') && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-100 rounded-xl p-3 grid grid-cols-1 md:grid-cols-4 gap-3 mt-2 text-sm">
          <TextInput label="Full name" value={form.name} onChange={(e)=>setForm(f=>({ ...f, name: e.target.value }))} />
          <TextInput label="Email" value={form.email} onChange={(e)=>setForm(f=>({ ...f, email: e.target.value }))} />
          <SelectInput label="Role" value={form.role} onChange={(e)=>setForm(f=>({ ...f, role: e.target.value }))} options={[{label:'Select role', value:''}, ...roleOptions.map(r=>({label:r, value:r}))]} />
          <div className="flex items-end">
            <AppButton type="submit" className="w-full justify-center min-h-[44px]">Invite</AppButton>
          </div>
        </form>
      )}
      {loading && <p className="text-slate-500">Loading...</p>}
      <div className="overflow-x-auto mt-2 bg-white border border-slate-100 rounded-xl">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-700 font-medium">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Name</th>
              <th className="px-4 py-3 whitespace-nowrap">Email</th>
              <th className="px-4 py-3 whitespace-nowrap">Role</th>
              <th className="px-4 py-3 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 whitespace-nowrap">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">{u.name}</td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">{u.email}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <select
                    value={String(u.role || 'USER')}
                    onChange={(e)=>changeRole(u._id, e.target.value)}
                    className="border rounded-lg px-3 py-2 min-h-[44px] bg-white focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                    disabled={savingId===u._id || (String(u.role)==='owner' && currentUser?.role!=='SUPERADMIN')}
                  >
                    {roleOptions
                      .filter(r => roleOptions.includes(r) || r===u.role)
                      .map(r => (<option key={r} value={r}>{r}</option>))}
                  </select>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${u.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {u.status || 'active'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
