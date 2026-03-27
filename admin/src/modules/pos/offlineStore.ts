import type { MenuItem } from '@shared/types'

const DB_NAME = 'pos-store'
const DB_VERSION = 1
const MENU_STORE = 'menus'
const ORDER_STORE = 'orders'

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(MENU_STORE)) db.createObjectStore(MENU_STORE)
        if (!db.objectStoreNames.contains(ORDER_STORE)) db.createObjectStore(ORDER_STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export async function initStorage(): Promise<void> {
  await openDb()
}

function menuKey(): string {
  const k = localStorage.getItem('pos:lastKey') || 'default'
  return `menu:${k}`
}

export async function cacheMenu(menuItems: MenuItem[]): Promise<void> {
  const db = await openDb()
  const key = menuKey()
  const json = JSON.stringify(menuItems || [])
  if (db) {
    try {
      const tx = db.transaction(MENU_STORE, 'readwrite')
      tx.objectStore(MENU_STORE).put(json, key)
    } catch {}
  } else {
    try { localStorage.setItem(key, json) } catch {}
  }
}

export async function getCachedMenu(branchId?: string): Promise<MenuItem[]> {
  const db = await openDb()
  const key = `menu:${branchId || 'default'}`
  if (db) {
    try {
      return await new Promise<MenuItem[]>((resolve) => {
        const tx = db.transaction(MENU_STORE, 'readonly')
        const req = tx.objectStore(MENU_STORE).get(key)
        req.onsuccess = () => {
          const raw = req.result
          try { resolve(raw ? JSON.parse(String(raw)) : []) } catch { resolve([]) }
        }
        req.onerror = () => resolve([])
      })
    } catch {
      return []
    }
  }
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function queueOrder(draft: { branchId?: string; items: any[]; total: number; createdAt: string }): Promise<{ localId: string }> {
  const db = await openDb()
  const localId = `ord:${Date.now()}:${Math.random().toString(36).slice(2,8)}`
  const val = JSON.stringify({ localId, draft })
  if (db) {
    try {
      const tx = db.transaction(ORDER_STORE, 'readwrite')
      tx.objectStore(ORDER_STORE).put(val, localId)
    } catch {}
  } else {
    try { localStorage.setItem(localId, val) } catch {}
  }
  return { localId }
}

export async function getPendingOrders(): Promise<{ localId: string; draft: any }[]> {
  const db = await openDb()
  const out: { localId: string; draft: any }[] = []
  if (db) {
    try {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(ORDER_STORE, 'readonly')
        const store = tx.objectStore(ORDER_STORE)
        const req = store.getAllKeys()
        req.onsuccess = () => {
          const keys = (req.result || []) as IDBValidKey[]
          const g = store.getAll(keys)
          g.onsuccess = () => {
            const list = (g.result || []) as string[]
            list.forEach(s => {
              try {
                const p = JSON.parse(s)
                out.push(p)
              } catch {}
            })
            resolve()
          }
          g.onerror = () => resolve()
        }
        req.onerror = () => resolve()
      })
      return out
    } catch {
      return []
    }
  }
  // Fallback
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('ord:')) {
      try {
        const v = localStorage.getItem(k)
        if (v) out.push(JSON.parse(v))
      } catch {}
    }
  }
  return out
}

export async function markOrderSynced(localId: string, serverId: string): Promise<void> {
  const db = await openDb()
  if (db) {
    try {
      const tx = db.transaction(ORDER_STORE, 'readwrite')
      tx.objectStore(ORDER_STORE).delete(localId)
    } catch {}
  } else {
    try { localStorage.removeItem(localId) } catch {}
  }
}
