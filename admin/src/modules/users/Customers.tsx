import { useEffect, useMemo, useState } from 'react'
import api from '../../api/api'
import PageHeader from '@shared/ui/PageHeader'
import Card from '@shared/ui/Card'
import TextInput from '@shared/ui/TextInput'

export default function Customers() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/admin/orders')
      .then(res => setOrders(res.data?.data || []))
      .finally(() => setLoading(false))
  }, [])

  const customers = useMemo(() => {
    const map = new Map<string, any>()
    for (const o of orders) {
      const id = o.user?._id || o.customer?.phone || ''
      if (!id) continue
      const prev = map.get(id) || { id, name: o.user?.name || o.customer?.name || '—', phone: o.user?.phone || o.customer?.phone || '—', email: o.user?.email || '—', totalOrders: 0, lastOrderAt: '' }
      prev.totalOrders += 1
      prev.lastOrderAt = o.createdAt
      map.set(id, prev)
    }
    let list = Array.from(map.values())
    const qq = q.trim().toLowerCase()
    if (qq) list = list.filter(c => String(c.name||'').toLowerCase().includes(qq) || String(c.phone||'').toLowerCase().includes(qq))
    return list
  }, [orders, q])

  return (
    <div className="space-y-3">
      <PageHeader title="Customers" subtitle="CRM overview" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <TextInput label="Search" placeholder="Search name or phone" value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>
      {loading && <div className="text-sm text-slate-500 dark:text-slate-400">Loading...</div>}
      <div className="grid md:grid-cols-2 gap-2">
        {customers.map((c)=> (
          <Card key={c.id} className="text-sm" header={<div className="flex items-center justify-between"><div className="font-semibold">{c.name}</div><div className="text-xs text-slate-600 dark:text-slate-300">{c.phone}</div></div>}>
            <div className="text-xs">Email: {c.email || '—'}</div>
            <div className="text-xs">Total orders: {c.totalOrders}</div>
            <div className="text-xs">Last order: {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleString() : '—'}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
