import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { SITE, buildWhatsappOrderMessage } from '../config/site'

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, updateSauce, total } = useCart()
  const navigate = useNavigate()

  const proceed = () => {
    if (items.length === 0) return
    navigate('/checkout')
  }

  return (
    <div className="space-y-2 sm:space-y-4">
      <h1 className="text-lg sm:text-xl font-semibold px-1">Your cart</h1>

      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-2 sm:p-4 text-xs sm:text-sm">
          <p className="text-slate-600 dark:text-slate-300">Your cart is empty. Add items from the menu.</p>
          <div className="mt-3">
            <button onClick={() => navigate('/menu')} className="px-4 py-2.5 sm:py-2 rounded-full bg-ration-dark text-white text-sm sm:text-sm min-h-[44px]">Back to Menu</button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-2 sm:p-4 text-xs sm:text-sm space-y-2 sm:space-y-2">
            {items.map((i) => (
              <div key={`${i.menuItem._id}:${i.sauce || ''}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-50 last:border-0 pb-2 last:pb-0 sm:border-0 sm:pb-0">
                <div className="flex-1">
                  <div className="font-medium text-sm sm:text-base">{i.menuItem.name}</div>
                  {String(i.menuItem.category || '').toLowerCase() === 'wings' && (
                    <div className="mt-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <span>Sauce:</span>
                      <select
                        value={i.sauce || 'Buffalo'}
                        onChange={(e)=>updateSauce(i.menuItem._id, (e.target as HTMLSelectElement).value as any)}
                        className="border rounded px-2 py-1 text-[10px] sm:text-xs"
                      >
                        <option>Buffalo</option>
                        <option>Barbecue</option>
                      </select>
                    </div>
                  )}
                  <div className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5">₦{(i.menuItem.price * i.quantity).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => {
                      const newQty = i.quantity - 1
                      if (newQty <= 0) {
                        removeFromCart(i.menuItem._id, i.sauce)
                      } else {
                        updateQuantity(i.menuItem._id, newQty, i.sauce)
                      }
                    }}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="min-w-5 sm:min-w-6 text-center font-bold text-sm">{i.quantity}</span>
                  <button
                    onClick={() => updateQuantity(i.menuItem._id, i.quantity + 1, i.sauce)}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeFromCart(i.menuItem._id, i.sauce)}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold ml-1"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs sm:text-sm font-semibold">
            <span>Subtotal</span>
            <span>₦{total.toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-1 gap-2 mt-2">
            <button
              onClick={() => {
                if (items.length === 0) return
                navigate('/checkout')
              }}
              className="w-full px-4 py-2.5 sm:py-2 rounded-full bg-ration-green-hover text-white border border-slate-300 dark:border-slate-600 text-sm sm:text-sm disabled:opacity-60"
              disabled={items.length === 0}
            >
              Checkout via WhatsApp
            </button>
          </div>
        </>
      )}
    </div>
  )
}
