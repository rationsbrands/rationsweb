import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useState, useEffect } from 'react'
import { ShoppingCart } from 'lucide-react'
import CartDrawer from './CartDrawer'
import logo from '../assets/logo.png'
import logoDark from '../assets/logo-dark.png'
import api from '../api/api'
import { SITE } from '../config/site'

const navLinkClasses = ({ isActive }: any) =>
  `px-3 py-1 text-sm font-medium rounded-full transition-colors ${
    isActive ? ' text-[#12343A] text-xl dark:text-ration-yellow' : 'text-slate-700 dark:text-slate-200 hover:text-xl dark:text-slate-200'
  }`

export default function Navbar() {
  const { items } = useCart()
  const [open, setOpen] = useState(false)        // mobile menu
  const [cartOpen, setCartOpen] = useState(false) // cart drawer
  const navigate = useNavigate()
  
  // Calculate banner from SITE (hydrated by App)
  const banner = (() => {
    const s = SITE
    const now = Date.now()
    const start = s.promoStart ? new Date(s.promoStart).getTime() : null
    const end = s.promoEnd ? new Date(s.promoEnd).getTime() : null
    const promoActive = Boolean(s.promoMessage && start && end && now >= start && now <= end)
    const eventUpcoming = Boolean(s.eventMessage && s.eventDate && new Date(s.eventDate).getTime() > now)
    if (promoActive) return { type: 'promo', message: s.promoMessage, end: s.promoEnd }
    if (eventUpcoming) return { type: 'event', message: s.eventMessage, date: s.eventDate }
    return null
  })()

  // Admin dashboard removed from public site; user dashboard available
  const handleOpenCart = () => {
    setCartOpen(true)
    window.dispatchEvent(new CustomEvent('cart-opened'))
  }
  const handleCloseCart = () => {
    setCartOpen(false)
    window.dispatchEvent(new CustomEvent('cart-closed'))
  }

  useEffect(() => {
    const open = () => handleOpenCart()
    window.addEventListener('open-cart', open)
    return () => window.removeEventListener('open-cart', open)
  }, [])

  // count of all items in cart
  const cartCount = items.reduce((sum, item) => sum + (item.quantity > 0 ? item.quantity : 0), 0)
  const hasCart = cartCount > 0

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-[#FDCD2F] shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <nav className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Rations Logo" className="h-7 w-7 sm:h-8 sm:w-8 object-contain dark:hidden" />
            <img src={logoDark} alt="Rations Logo Dark" className="hidden h-7 w-7 sm:h-8 sm:w-8 object-contain dark:block" />
            <span className="font-semibold text-base sm:text-lg dark:text-white">{SITE.name}</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-4">
            <NavLink to="/" className={navLinkClasses}>Home</NavLink>
            <NavLink to="/menu" className={navLinkClasses}>Menu</NavLink>
            <NavLink to="/community" className={navLinkClasses}>Community</NavLink>
            <NavLink to="/about" className={navLinkClasses}>About</NavLink>
            <NavLink to="/contact" className={navLinkClasses}>Contact</NavLink>
          </div>

          {/* Right side actions (cart + auth + hamburger) */}
          <div className="flex items-center gap-3">
            
            <Link 
              to="/menu"
              className="hidden md:block px-5 py-2 rounded-full bg-[#0C1E22] dark:bg-white text-white dark:text-[#0C1E22] text-sm font-semibold hover:shadow-lg transition-all active:scale-95"
            >
              Order Now
            </Link>

            {/* Cart button - visible on all screen sizes */}
            {hasCart && (
              <button
                type="button"
                onClick={handleOpenCart}
                className="relative p-2 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Open cart"
              >
                <ShoppingCart className="w-5 h-5 text-[#0C1E22] dark:text-white" />
                {hasCart && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Desktop auth buttons - REMOVED */}
            
            {/* Mobile hamburger - separate from cart */}
            <button
              className="md:hidden p-2 rounded-md border text-[#0C1E22] dark:text-white dark:border-slate-700"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
          </div>
        </nav>

        {banner && (
          <div className="border-t bg-white dark:bg-slate-900/95">
            <div className="max-w-6xl mx-auto px-4 py-2 text-xs flex items-center gap-2">
              <span className={banner.type==='promo' ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-[#0C1E22] dark:text-white font-semibold'}>
                {banner.type === 'promo' ? 'Promo' : 'Event'}
              </span>
              <span className="text-slate-700 dark:text-slate-200">{banner.message}</span>
              {banner.type === 'promo' && banner.end && (
                <span className="ml-auto text-slate-500 dark:text-slate-400">Ends: {new Date(banner.end).toLocaleString()}</span>
              )}
              {banner.type === 'event' && banner.date && (
                <span className="ml-auto text-slate-500 dark:text-slate-400">Date: {new Date(banner.date).toLocaleString()}</span>
              )}
            </div>
          </div>
        )}
        {/* Mobile dropdown menu */}
        {open && (
          <div className="md:hidden border-t bg-white dark:bg-slate-900 px-4 py-3 flex flex-col gap-2">
            <NavLink to="/" onClick={() => setOpen(false)} className={navLinkClasses}>Home</NavLink>
            <NavLink to="/menu" onClick={() => setOpen(false)} className={navLinkClasses}>Menu</NavLink>
            <NavLink to="/community" onClick={() => setOpen(false)} className={navLinkClasses}>Community</NavLink>
            <NavLink to="/about" onClick={() => setOpen(false)} className={navLinkClasses}>About</NavLink>
            <NavLink to="/contact" onClick={() => setOpen(false)} className={navLinkClasses}>Contact</NavLink>
          </div>
        )}
      </header>

      {/* Cart drawer hooked up */}
      <CartDrawer
        open={cartOpen}
        onClose={handleCloseCart}
        items={items}
      />
    </>
  )
}
