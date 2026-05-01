import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../api/api'
import PageHeader from '@shared/ui/PageHeader'
import Card from '@shared/ui/Card'
import Tag from '@shared/ui/Tag'

export default function AdminOrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get(`/admin/orders/${id}`)
      .then(res => setOrder(res.data.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const updateOrder = async (payload: any) => {
    await api.patch(`/admin/orders/${id}`, payload)
    load()
  }

  return (
    <>
      <PageHeader title="Order detail" />
      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>}
      {order && (
        <div className="grid md:grid-cols-2 gap-4 mt-2 text-sm">
          <Card header={<div className="flex items-center justify-between"><div className="font-semibold">Order #{order._id.slice(-6)}</div><Tag value={order.status} /></div>}>
            <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(order.createdAt).toLocaleString()}</div>
            <div className="mt-2">Customer: {order.user?.name} • {order.user?.phone}</div>
            <div>Type: {order.orderType}</div>
            <div>Payment: {order.paymentStatus}</div>
            <div>Total: ₦{Number(order.totalAmount||0).toLocaleString()}</div>
            <div className="mt-3">
              <div className="font-semibold">Items</div>
              <ul className="text-xs list-disc list-inside">
                {order.items.map(i => (
                  <li key={i._id}>
                    {i.quantity} x {i.menuItem?.name || 'Item'} – ₦{Number(i.priceAtOrderTime||0).toLocaleString()}
                    {i.sauce && <> • Sauce: {i.sauce}</>}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
          <Card header={<div className="font-semibold">Status & actions</div>}>
            <div className="flex items-center gap-2">
              <select
                className="text-xs border rounded px-2 py-1"
                value={order.status}
                onChange={(e)=>updateOrder({ status: e.target.value })}
              >
                {['CREATED','ACCEPTED','IN_PREP','READY','COMPLETED','CANCELLED'].map(s=> (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {order.paymentStatus !== 'paid' && (
                <button onClick={()=>updateOrder({ paymentStatus: 'paid' })} className="text-xs px-3 py-1 rounded-full border">Mark paid</button>
              )}
            </div>
            <div className="mt-3">
              <div className="font-semibold mb-1">Timeline</div>
              <ul className="text-xs space-y-1">
                <li>Created • {new Date(order.createdAt).toLocaleString()}</li>
                {order.paymentStatus==='paid' && <li>Paid</li>}
                <li>Current status • {String(order.status||'').toUpperCase()}</li>
              </ul>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
