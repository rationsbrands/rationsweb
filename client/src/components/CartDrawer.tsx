import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaMinus, FaPlus, FaTrash } from 'react-icons/fa'
import { useCart } from '../context/CartContext'
import { SITE, buildWhatsappOrderMessage } from '../config/site'

export default function CartDrawer({ open, onClose, items = [] }: any) {
  const { updateQuantity, removeFromCart, clearCart, updateSauce } = useCart()
  const navigate = useNavigate()
  const total = items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0)

  // 🔥 Auto-close when cart becomes empty
  useEffect(() => {
    if (open && items.length === 0) {
      onClose()
    }
  }, [open, items.length, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div
        className="absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl p-3 sm:p-6 flex flex-col border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold">Your Cart</h2>
          <button className="text-xs sm:text-sm text-slate-600" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Your cart is empty.
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto pr-1">
              {items.map((i) => (
                <div
                  key={`${i.menuItem._id}:${i.sauce || ''}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 border-b py-2 sm:py-3 last:border-0"
                >
                  <div className="flex gap-3">
                    {i.menuItem.imageUrl && (
                      <img
                        src={i.menuItem.imageUrl}
                        alt={i.menuItem.name}
                        className="h-10 w-10 sm:h-14 sm:w-14 object-cover rounded shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm sm:text-base leading-tight">{i.menuItem.name}</div>
                      <div className="text-[10px] sm:text-sm font-semibold text-gray-700 mt-0.5">
                        ₦{(i.menuItem.price * i.quantity).toLocaleString()}
                      </div>
                      {i.sauce && (
                        <div className="mt-1 text-[10px] text-slate-600 flex items-center gap-1 sm:gap-2">
                          <span>Sauce:</span>
                          <select
                            value={i.sauce}
                            onChange={(e) => updateSauce(i.menuItem._id, (e.target as HTMLSelectElement).value as any)}
                            className="border rounded px-1 py-0.5 text-[10px]"
                          >
                            <option>Buffalo</option>
                            <option>Barbecue</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pl-[52px] sm:pl-0 mt-1 sm:mt-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newQty = i.quantity - 1
                          if (newQty <= 0) {
                            removeFromCart(i.menuItem._id, i.sauce)
                          } else {
                            updateQuantity(i.menuItem._id, newQty, i.sauce)
                          }
                        }}
                        className="p-1 rounded bg-gray-100 hover:bg-gray-200 h-6 w-6 sm:h-auto sm:w-auto flex items-center justify-center"
                      >
                        <FaMinus size={10} />
                      </button>
                      <span className="px-1 font-bold text-sm">{i.quantity}</span>
                      <button
                        onClick={() =>
                          updateQuantity(i.menuItem._id, i.quantity + 1, i.sauce)
                        }
                        className="p-1 rounded bg-gray-100 hover:bg-gray-200 h-6 w-6 sm:h-auto sm:w-auto flex items-center justify-center"
                      >
                        <FaPlus size={10} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(i.menuItem._id, i.sauce)}
                      className="text-red-500 hover:text-red-700 p-1 sm:p-2"
                    >
                      <FaTrash size={12} className="sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Clear cart button */}
            <div className="mt-3 flex justify-between">
              <button
                className="py-2 px-4 rounded bg-gray-200 hover:bg-gray-300 text-xs font-semibold"
                onClick={clearCart}
              >
                Clear Cart
              </button>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-4 border-t pt-4">
          <div className="flex justify-between text-sm font-semibold mb-3">
            <span>Total</span>
            <span>₦{total.toLocaleString()}</span>
          </div>



          <div className="mt-2 grid grid-cols-1 gap-2">
            <button
              className="w-full px-4 py-3 sm:py-2 rounded-full bg-green-600 text-white hover:bg-green-700 text-base sm:text-sm font-semibold"
              onClick={() => {
                if (items.length === 0) return
                onClose()
                navigate('/checkout')
              }}
            >
              Checkout via WhatsApp
            </button>
          </div>
          <div className="mt-3 ">
            <Link to="/cart" onClick={onClose} className="text-xs text-slate-700">Go to cart</Link>
          </div>
                    <div className="flex gap-2 py-2">
            {/* <Link
              to="/order"
              onClick={onClose}
              className="flex-1 text-center px-4 py-2 rounded-full bg-ration-dark text-white hover:bg-ration-dark-hover text-sm font-semibold"
            >
              Checkout
            </Link> */}
            <button
              className="px-4 py-3 sm:py-2 rounded-full border border-slate-300 text-base sm:text-sm"
              onClick={onClose}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
