import { useEffect, useMemo, useState } from 'react'
import { useOfflineMenu, usePosCart, useSyncPendingOrders } from '../../modules/pos/hooks'
import { queueOrder } from '../../modules/pos/offlineStore'
import api from '../../api/api'
import { useAuth } from '../../context/AuthContext'

export default function PosHome() {
  const { user } = useAuth()
  const branchId = ''
  const { menu, loading, error, refresh } = useOfflineMenu(branchId)
  const { items, total, addItem, removeItem, setQuantity, clear } = usePosCart()
  const sync = useSyncPendingOrders()
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (menu || []).filter(m => !q || String(m.name||'').toLowerCase().includes(q))
  }, [menu, query])
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setNotice('') }, [items.length])

  const placeOrder = async () => {
    setSaving(true)
    setNotice('')
    try {
      if (navigator.onLine) {
        const payload = {
          items: items.map(i => ({ productId: i.product._id, qty: i.quantity, price: i.product.price })),
          total: total,
          branchId: branchId,
          channel: 'POS'
        }
        await api.post('/admin/pos/orders', payload)
        clear()
        setNotice('Order placed')
      } else {
        const draft = { branchId, items, total, createdAt: new Date().toISOString() }
        await queueOrder(draft as any)
        clear()
        setNotice('Saved offline; will sync when online')
      }
    } catch (err) {
      setNotice(err?.response?.data?.message || 'Failed to place order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white border rounded-xl p-3">
        <div className="flex items-center gap-2 mb-4">
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search products" className="border rounded-lg px-3 py-2 text-sm flex-1 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-slate-500" />
          <button className="text-sm px-4 py-2 min-h-[44px] rounded-lg border hover:bg-slate-50 transition-colors" onClick={refresh}>Refresh</button>
        </div>
        {loading && <div className="text-sm text-slate-600">Loading...</div>}
        {error && <div className="text-xs text-red-600">{error}</div>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {filtered.map(p => (
            <button key={p._id} className="border rounded-xl px-3 py-3 text-left hover:border-slate-400 transition-colors flex flex-col justify-between min-h-[80px]" onClick={()=>addItem(p)}>
              <div className="font-semibold line-clamp-2">{p.name}</div>
              <div className="text-xs text-slate-600 mt-1">₦{p.price}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white border rounded-xl p-3">
        <div className="font-semibold mb-2">Cart</div>
        <div className="space-y-2 text-sm">
          {items.map(i => (
            <div key={i.product._id} className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 border rounded-lg p-2">
              <div className="flex-1 min-w-[120px]">
                <div className="font-medium">{i.product.name}</div>
                <div className="text-xs text-slate-600">₦{i.product.price}</div>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min={1} value={i.quantity} onChange={(e)=>setQuantity(i.product._id, Number(e.target.value||1))} className="w-20 border rounded-lg px-2 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-slate-500" />
                <button className="text-sm px-3 py-2 min-h-[44px] rounded-lg border hover:bg-red-50 text-red-600 transition-colors" onClick={()=>removeItem(i.product._id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-base font-semibold">Total: ₦{total}</div>
          <div className="flex items-center gap-2">
            <button className="text-sm px-4 py-2 min-h-[44px] rounded-lg border hover:bg-slate-50 transition-colors" onClick={clear}>Clear</button>
            <button className="text-sm px-4 py-2 min-h-[44px] rounded-lg border bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={placeOrder} disabled={saving || items.length===0}>Place order</button>
          </div>
        </div>
        {notice && <div className="text-xs mt-2">{notice}</div>}
        <div className="text-[11px] text-slate-500 mt-2">
          {sync.syncing ? 'Syncing...' : sync.lastSyncAt ? `Last sync: ${new Date(sync.lastSyncAt).toLocaleString()}` : ''}
        </div>
      </div>
    </div>
  )
}
