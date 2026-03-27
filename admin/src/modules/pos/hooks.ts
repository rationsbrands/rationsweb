import { useEffect, useMemo, useState } from 'react'
import api from '../../api/api'
import type { MenuItem } from '@shared/types'
import { initStorage, getCachedMenu, cacheMenu, getPendingOrders, markOrderSynced } from './offlineStore'

export function useOfflineMenu(branchId?: string) {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      localStorage.setItem("pos:lastKey", `${branchId || "default"}`);
      await initStorage();
      const cached = await getCachedMenu(branchId);
      setMenu(Array.isArray(cached) ? cached : []);
      // Attempt 1: Try public menu
      let list = [];
      try {
        const res = await api.get("/api/public/menu");
        list = Array.isArray(res.data?.data) ? res.data.data : [];
      } catch (e) {
        // Attempt 2: Try admin menu if public fails (e.g. auth required)
        try {
          const res = await api.get("/admin/menu");
          list = Array.isArray(res.data?.data) ? res.data.data : [];
        } catch (e2) {
          throw e; // Throw original error if both fail
        }
      }
      
      if (list.length > 0) {
        setMenu(list);
        await cacheMenu(list);
      } else if (cached.length === 0) {
         // If both empty, try one more time with a broader query or empty
         setMenu([]); 
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load menu");
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [branchId])

  return { menu, loading, error, refresh }
}

export function usePosCart() {
  const [items, setItems] = useState<{ product: MenuItem; quantity: number; notes?: string }[]>([])
  const total = useMemo(() => items.reduce((sum, i) => sum + Number(i.product?.price || 0) * i.quantity, 0), [items])
  const addItem = (product: MenuItem, qty = 1) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.product._id === product._id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty }
        return next
      }
      return [...prev, { product, quantity: qty }]
    })
  }
  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.product._id !== productId))
  }
  const setQuantity = (productId: string, qty: number) => {
    setItems(prev => prev.map(i => i.product._id === productId ? { ...i, quantity: qty } : i))
  }
  const clear = () => setItems([])
  return { items, total, addItem, removeItem, setQuantity, clear }
}

export function useSyncPendingOrders(enabled = true) {
  const [syncing, setSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [error, setError] = useState('')

  const run = async () => {
    if (!enabled) return
    if (!navigator.onLine) return
    setSyncing(true)
    setError('')
    try {
      await initStorage()
      const list = await getPendingOrders()
      for (const it of list) {
        try {
          const payload = {
            items: (it.draft?.items || []).map((d: any) => ({ productId: d.product?._id || d.productId, qty: d.quantity, price: d.product?.price || d.price })),
            total: Number(it.draft?.total || 0),
            branchId: it.draft?.branchId || '',
            channel: 'POS'
          }
          const res = await api.post('/admin/pos/orders', payload)
          const serverId = res.data?.data?._id || res.data?.data?.order?._id || ''
          if (serverId) await markOrderSynced(it.localId, serverId)
        } catch {}
      }
      setLastSyncAt(new Date().toISOString())
    } catch (err) {
      setError(err?.response?.data?.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => { run() }, [enabled])
  useEffect(() => {
    const h = () => run()
    window.addEventListener('online', h)
    return () => window.removeEventListener('online', h)
  }, [enabled])

  return { syncing, lastSyncAt, error }
}
