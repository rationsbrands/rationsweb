import { useEffect, useState } from 'react'
import api from '../../api/api'
import PageHeader from '@shared/ui/PageHeader'
import Card from '@shared/ui/Card'

export default function Analytics() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/overview')
      .then(res => setStats(res.data?.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-3">
      <PageHeader title="Analytics" subtitle="Sales and orders overview" />
      {loading && <div className="text-sm text-slate-500">Loading...</div>}
      {stats && (
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <Card header={<div className="font-semibold">Sales (total)</div>}>
            <div className="text-lg font-semibold">₦{Number(stats.totalRevenue||0).toLocaleString()}</div>
          </Card>
          <Card header={<div className="font-semibold">Orders</div>}>
            <div className="text-lg font-semibold">{stats.ordersCount}</div>
          </Card>
          <Card header={<div className="font-semibold">Active menu</div>}>
            <div className="text-lg font-semibold">{stats.activeMenuCount}</div>
          </Card>
        </div>
      )}
    </div>
  )
}
