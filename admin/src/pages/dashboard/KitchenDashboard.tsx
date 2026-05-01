import { useEffect, useState } from 'react'
import api from '../../api/api'
import EmptyState from '@shared/ui/EmptyState'
import Tag from '@shared/ui/Tag'

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/orders')
      .then(res => setOrders(res.data.data || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold">Kitchen dashboard</div>
      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>}
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o._id} className="bg-white dark:bg-slate-900 border rounded-xl p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium">Order #{o._id.slice(-6)}</div>
              <Tag value={o.status} />
            </div>
            <div className="text-slate-600 dark:text-slate-300">{o.items?.map((i:any)=>i.menuItem?.name).join(', ')}</div>
          </div>
        ))}
        {!loading && orders.length===0 && (
          <EmptyState title="No active orders" text="Kitchen is clear for now" />
        )}
      </div>
    </div>
  )
}
