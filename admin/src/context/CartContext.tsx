import { createContext, useContext, useState, useEffect } from 'react'
import type { CartItem, MenuItem, Sauce } from '@shared/types'

interface CartContextValue {
  items: CartItem[]
  addToCart: (menuItem: MenuItem, quantity?: number, sauce?: Sauce) => void
  updateQuantity: (id: string, quantity: number, sauce?: Sauce) => void
  updateSauce: (id: string, sauce: Sauce) => void
  removeFromCart: (id: string, sauce?: Sauce) => void
  clearCart: () => void
  total: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem('cart')
      const parsed = raw ? JSON.parse(raw) : null
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  const addToCart = (menuItem: MenuItem, quantity = 1, sauce?: Sauce) => {
    const isWings = String(menuItem.category || '').toLowerCase() === 'wings'
    const sauceVal = isWings ? (sauce || 'Buffalo') : undefined
    setItems(prev => {
      const existing = prev.find(i => i.menuItem._id === menuItem._id && (!isWings || i.sauce === sauceVal))
      if (existing) {
        return prev.map(i =>
          i.menuItem._id === menuItem._id && (!isWings || i.sauce === sauceVal)
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      }
      return [...prev, { menuItem, quantity, sauce: sauceVal }]
    })
  }

  const updateQuantity = (id: string, quantity: number, sauce?: Sauce) => {
    setItems(prev =>
      prev.map(i => {
        const isWings = String(i.menuItem.category || '').toLowerCase() === 'wings'
        const match = i.menuItem._id === id && (!isWings || i.sauce === (sauce ?? i.sauce))
        return match ? { ...i, quantity } : i
      }),
    )
  }

  const updateSauce = (id: string, sauce: Sauce) => {
    setItems(prev => prev.map(i => {
      const isWings = String(i.menuItem.category || '').toLowerCase() === 'wings'
      if (i.menuItem._id === id && isWings) {
        return { ...i, sauce }
      }
      return i
    }))
  }

  const removeFromCart = (id: string, sauce?: Sauce) => {
    setItems(prev => prev.filter(i => {
      const isWings = String(i.menuItem.category || '').toLowerCase() === 'wings'
      return !(i.menuItem._id === id && (!isWings || i.sauce === (sauce ?? i.sauce)))
    }))
  }

  const clearCart = () => setItems([])

  const total = items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0)

  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(items))
    } catch {}
  }, [items])

  const value: CartContextValue = { items, addToCart, updateQuantity, updateSauce, removeFromCart, clearCart, total }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
