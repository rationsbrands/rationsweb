import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SEO from '../components/SEO'
import useEmblaCarousel from 'embla-carousel-react'
import api from '../api/api'
import MenuItemCard from '../components/MenuItemCard'
import { useCart } from '../context/CartContext'

export default function Menu({ embed = false }: any) {
  // Menu data from backend
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' })

  useEffect(() => {
    if (embed && emblaApi) {
      const interval = setInterval(() => {
        if (emblaApi.canScrollNext()) {
          emblaApi.scrollNext()
        } else {
          emblaApi.scrollTo(0)
        }
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [embed, emblaApi])

  const { items: cartItems } = useCart()
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    const opened = () => setCartDrawerOpen(true)
    const closed = () => setCartDrawerOpen(false)
    window.addEventListener('cart-opened', opened)
    window.addEventListener('cart-closed', closed)
    return () => {
      window.removeEventListener('cart-opened', opened)
      window.removeEventListener('cart-closed', closed)
    }
  }, [])
  const cartCount = cartItems.reduce((sum, i) => sum + (i.quantity > 0 ? i.quantity : 0), 0)

  useEffect(() => {
    api.get('/public/menu')
      .then(res => setMenuItems(res.data.data || []))
      .catch(() => setError('Failed to load menu.'))
      .finally(() => setLoading(false))
  }, [])

  // EMBED MODE (e.g. home page preview)
  if (embed) {
    return (
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-4 py-4">
          {menuItems.slice(0, 8).map((item: any, index) => (
            <div 
              key={item._id} 
              className="flex-[0_0_85%] sm:flex-[0_0_50%] lg:flex-[0_0_33.33%] min-w-0 pl-4"
            >
              <div className="h-full animate-slide-up" style={{ animationDelay: `${index * 150}ms` }}>
                <MenuItemCard item={item} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // FULL MENU PAGE
  return (
    <div>
      <SEO 
        title="Menu" 
        description="Explore the Rations menu. Delicious, affordable, and fresh fast food."
        canonicalUrl="/menu"
      />
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Menu</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search items"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-ration-yellow focus:outline-none"
            />
          </div>

          {/* Category filter */}
          <div className="relative w-full sm:w-64">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-ration-yellow focus:outline-none"
            >
              <option value="All">All Categories</option>
              {Array.from(new Set(menuItems.map(i => i.category || 'General')))
                .sort()
                .map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading menu...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (() => {
        const q = query.trim().toLowerCase()

        const filtered = menuItems.filter((item) => {
          const cat = item.category || 'General'
          const inCat = categoryFilter === 'All' || cat === categoryFilter
          const text = `${item.name || ''} ${item.description || ''}`.toLowerCase()
          const matches = q === '' || text.includes(q)
          return inCat && matches
        })

        if (filtered.length === 0) {
          return <p className="text-sm text-slate-500 dark:text-slate-400">No items found.</p>
        }

        const grouped = filtered.reduce((acc, item) => {
          const cat = item.category || 'General'
          acc[cat] = acc[cat] || []
          acc[cat].push(item)
          return acc
        }, {})

        return Object.keys(grouped).sort().map((category) => (
          <section key={category} className="mb-8">
            <h2 className="text-2xl text-ration-green-hover font-bold mb-4">{category}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
              {grouped[category].map((item) => (
                <MenuItemCard key={item._id} item={item} />
              ))}
            </div>
          </section>
        ))
      })()}

      {/* Bottom CTA – show only if there are items in cart */}
      {cartItems.length > 0 && !cartDrawerOpen && (
        <div className="fixed bottom-4 inset-x-0 flex gap-2 sm:gap-3 justify-center z-50">
          <button
            type="button"
            onClick={() => { setCartDrawerOpen(true); window.dispatchEvent(new CustomEvent('open-cart')) }}
            className="px-4 py-2 text-xs sm:px-5 sm:py-2 sm:text-sm md:px-6 md:py-3 md:text-sm rounded-full bg-ration-dark text-ration-yellow"
          >
            Open Cart
          </button>

          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="px-4 py-2 text-xs sm:px-6 sm:py-3 sm:text-sm md:px-7 md:py-3 md:text-sm rounded-full bg-ration-yellow text-ration-dark hover:bg-ration-dark-hover hover:text-ration-yellow shadow-md font-semibold"
          >
            {`Proceed to order ${cartCount} item${cartCount > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
