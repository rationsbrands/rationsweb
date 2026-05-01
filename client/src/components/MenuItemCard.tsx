import Button from '../shared/ui/Button'
import { useCart } from '../context/CartContext'
import { useState } from 'react'

export default function MenuItemCard({ item }: any) {
  const { items, addToCart, updateQuantity, removeFromCart, updateSauce } = useCart()
  const isWings = String(item.category || '').toLowerCase() === 'wings'
  const [sauce, setSauce] = useState('Buffalo')

  // Find existing cart entry for this menu item
  const cartEntry = items.find(i => i.menuItem._id === item._id)
  const quantity = cartEntry?.quantity ?? 0

  // Current sauce for this wings item (fallback to local state)
  const currentSauce = isWings ? (cartEntry?.sauce || sauce) : undefined

  const effectivePrice = item.effectivePrice ?? item.price
  const itemForCart = { ...item, price: effectivePrice }

  const handleAdd = () => {
    if (!cartEntry) {
      // First time adding – for wings, attach sauce, otherwise leave undefined
      addToCart(itemForCart, 1, isWings ? (sauce as any) : undefined)
    } else {
      // Increment quantity, keep existing sauce if any
      updateQuantity(item._id, quantity + 1, isWings ? (currentSauce as any) : undefined)
    }
  }

  const handleMinus = () => {
    if (!cartEntry) return
    const newQty = quantity - 1

    if (newQty <= 0) {
      // Remove from cart completely (including sauce)
      removeFromCart(item._id, isWings ? (currentSauce as any) : undefined)
    } else {
      // Decrement quantity, keep same sauce
      updateQuantity(item._id, newQty, isWings ? (currentSauce as any) : undefined)
    }
  }

  const handleSauceChange = (e) => {
    const newSauce = e.target.value
    setSauce(newSauce)

    // If item is already in cart, update its sauce without changing quantity
    if (isWings && cartEntry && quantity > 0) {
      updateQuantity(item._id, quantity, newSauce)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col animate-fade-in">
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="h-28 sm:h-40 w-full object-cover"
        />
      )}

      <div className="p-2 sm:p-4 flex flex-col gap-1 sm:gap-2 flex-1">
        <div className="flex justify-between items-start gap-1 sm:gap-2">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight break-words">{item.name}</h3>
            <p className="text-[10px] sm:text-xs text-red-700 truncate">{item.category}</p>
          </div>
          <div className="flex flex-col items-end shrink-0 ml-1">
            {item.promoActive && item.effectivePrice !== undefined && item.effectivePrice !== item.price ? (
              <>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-0 sm:gap-1.5">
                  <span className="text-[10px] sm:text-xs text-slate-400 line-through whitespace-nowrap">
                    ₦{item.price.toLocaleString()}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-ration-green whitespace-nowrap">
                    ₦{effectivePrice.toLocaleString()}
                  </span>
                </div>
                <div className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-700 mt-0.5 inline-block whitespace-nowrap">
                  PROMO
                </div>
              </>
            ) : (
              <span className="text-xs sm:text-sm font-semibold text-ration-green whitespace-nowrap">
                ₦{effectivePrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-snug">{item.description}</p>

        {/* Sauce selector: ONLY for wings, and ONLY after item is in cart */}
        {isWings && quantity > 0 && (
          <div className="mt-2 flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
            <span className="text-slate-600 dark:text-slate-300">Sauce:</span>
          <select
              value={currentSauce}
              onChange={(e) => updateSauce(item._id, (e.target as HTMLSelectElement).value as any)}
              className="border rounded-lg px-1 sm:px-2 py-1 text-[10px] sm:text-xs focus:ring-2 focus:ring-ration-yellow focus:outline-none"
            >
              <option value="Buffalo">Buffalo</option>
              <option value="Barbecue">Barbecue</option>
            </select>
          </div>
        )}

        <div className="mt-auto pt-2">
          {quantity === 0 ? (
            <Button
              disabled={!item.isAvailable}
              className="w-full bg-ration-dark text-white text-xs py-1.5 sm:text-sm sm:py-2"
              onClick={handleAdd}
            >
              {item.isAvailable ? 'Add' : 'Out'}
            </Button>
          ) : (
            <div className="flex items-center justify-between gap-1 sm:gap-3">
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={handleMinus}
                  className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold"
                >
                  -
                </button>
                <span className="min-w-4 sm:min-w-6 text-center text-xs sm:text-base font-bold">{quantity}</span>
                <button
                  onClick={handleAdd}
                  className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold"
                >
                  +
                </button>
              </div>

              <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                ₦{(effectivePrice * quantity).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
