import { useEffect, useState } from 'react'
import api from '../../api/api'
import PageHeader from '@shared/ui/PageHeader'
import Card from '@shared/ui/Card'
import TextInput from '@shared/ui/TextInput'
import SelectInput from '@shared/ui/SelectInput'
import Tag from '@shared/ui/Tag'

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState({ status: 'all', paymentStatus: 'all', orderType: 'all', search: '', from: '', to: '' })

  const load = () => {
    setLoading(true)
    setError('')
    const params: any = {}
    if (filter.status !== 'all') params.status = filter.status
    if (filter.paymentStatus !== 'all') params.paymentStatus = filter.paymentStatus
    if (filter.orderType !== 'all') params.orderType = filter.orderType
    if (filter.from) params.from = filter.from
    if (filter.to) params.to = filter.to
    api.get('/admin/orders', { params })
      .then(res => setOrders(res.data.data || []))
      .catch(err => {
        console.error(err)
        setError('Failed to load orders. ' + (err.response?.data?.message || err.message))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const updateOrder = async (id: string, payload: any) => {
    await api.patch(`/admin/orders/${id}`, payload)
    load()
  }

  return (
    <>
      <PageHeader title="Manage orders" />
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
        <SelectInput label="Status" value={filter.status} onChange={(e)=>setFilter(f=>({...f, status: e.target.value}))} options={[{label:'All status', value:'all'},...['CREATED','ACCEPTED','IN_PREP','READY','COMPLETED','CANCELLED'].map(s=>({label:s, value:s}))]} />
        <SelectInput label="Payment" value={filter.paymentStatus} onChange={(e)=>setFilter(f=>({...f, paymentStatus: e.target.value}))} options={[{label:'All payments', value:'all'},...['pending','paid'].map(s=>({label:s, value:s}))]} />
        <SelectInput label="Type" value={filter.orderType} onChange={(e)=>setFilter(f=>({...f, orderType: e.target.value}))} options={[{label:'All types', value:'all'},...['pickup','delivery'].map(s=>({label:s, value:s}))]} />
        <TextInput label="Search" placeholder="Search name / phone / #id" value={filter.search} onChange={(e)=>setFilter(f=>({...f, search: e.target.value}))} />
        <div className="grid grid-cols-2 gap-2">
          <TextInput label="From" type="date" value={filter.from} onChange={(e)=>setFilter(f=>({...f, from: e.target.value}))} />
          <TextInput label="To" type="date" value={filter.to} onChange={(e)=>setFilter(f=>({...f, to: e.target.value}))} />
        </div>
      </div>

      <div className="space-y-3 mt-3">
        {loading && <p className="text-slate-500">Loading...</p>}
        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {error} <button onClick={load} className="ml-2 underline">Retry</button>
          </div>
        )}
        {orders
          .filter(o => {
            const q = filter.search.trim().toLowerCase()
            if (!q) return true
            const idMatch = o._id?.toLowerCase().includes(q)
            const nameMatch = (o.user?.name||'').toLowerCase().includes(q)
            const phoneMatch = (o.user?.phone||o.customer?.phone||'').toLowerCase().includes(q)
            return idMatch || nameMatch || phoneMatch
          })
          .map(order => (
          <Card key={order._id} className="text-sm" header={
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <div className="font-semibold text-base">Order #{order._id.slice(-6)}</div>
                {order.platformOrderId && (
                  <div className="text-[10px] text-slate-400 font-mono">
                    Ext: {order.platformOrderId}
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-1">
                  {order.user?.name} • {new Date(order.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                <Tag value={order.status} />
                <select
                  className={`text-sm rounded-lg px-3 py-2 border min-h-[44px] bg-white focus:outline-none focus:ring-2 focus:ring-slate-500`}
                  value={order.status}
                  onChange={(e) => updateOrder(order._id, { status: e.target.value })}
                >
                  {['CREATED','ACCEPTED','IN_PREP','READY','COMPLETED','CANCELLED'].map(s=> (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {order.paymentStatus !== 'paid' && (
                  <button onClick={()=>updateOrder(order._id, { paymentStatus: 'paid' })} className="text-sm px-4 py-2 rounded-full border bg-white hover:bg-slate-50 min-h-[44px] transition-colors">Mark paid</button>
                )}
              </div>
            </div>
          }>
            <ul className="mt-2 text-xs text-slate-700 list-disc list-inside">
              {order.items.map(i => (
                <li key={i._id}>
                  {i.quantity} x {i.menuItem?.name || 'Item'} – ₦{i.priceAtOrderTime}
                  {i.sauce && <> • Sauce: {i.sauce}</>}
                </li>
              ))}
            </ul>
            <div className="mt-1 text-right text-xs font-semibold">
              Total: ₦{order.totalAmount}
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
