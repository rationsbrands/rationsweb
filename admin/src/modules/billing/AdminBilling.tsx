import { useEffect, useState } from 'react'
import api from '../../api/api'

export default function AdminBilling() {
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<any>(null)
  const [ents, setEnts] = useState<any[]>([])
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/admin/billing/summary').catch(()=>({ data: { data: { subscriptions: [], plans: [] } } })),
      api.get('/admin/billing/entitlements').catch(()=>({ data: { data: [] } }))
    ]).then(([p, e]) => {
      setPlan(p?.data?.data || null)
      setEnts(Array.isArray(e?.data?.data) ? e.data.data : [])
    }).finally(() => setLoading(false))
  }, [])

  const markPaid = async () => {
    setNotice('')
    try {
      const id = plan?.subscriptions?.[0]?._id
      if (!id) return
      await api.post(`/admin/billing/subscriptions/${id}/mark-paid`)
      setNotice('Marked as paid')
    } catch {
      setNotice('Failed to mark as paid')
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold">Billing & Plan</div>
      {loading && <div className="text-sm text-slate-500">Loading...</div>}
      {notice && <div className="text-sm">{notice}</div>}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="p-3 border rounded">
          <div className="font-medium mb-2">Current Plan</div>
          <pre className="text-xs overflow-auto">{JSON.stringify(plan, null, 2)}</pre>
          <button onClick={markPaid} className="mt-2 text-sm px-4 py-2 min-h-[44px] rounded border bg-white hover:bg-slate-50 transition-colors">Mark as Paid</button>
        </div>
        <div className="p-3 border rounded">
          <div className="font-medium mb-2">Entitlements</div>
          <ul className="text-sm space-y-2">
            {ents.map((e)=>(
              <li key={e._id}>{e.feature} — {e.enabled ? 'enabled' : 'disabled'}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

