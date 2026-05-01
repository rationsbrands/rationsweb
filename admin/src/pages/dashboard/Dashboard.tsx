import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import api from '../../api/api'
import ProfileTab from './ProfileTab'
import OrdersTab from './OrdersTab'
import SupportTab from './SupportTab'
import SecurityTab from './SecurityTab'
import { getDashboardPathForUser } from '../../utils/routing'

export default function Dashboard() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [active, setActive] = useState('profile')
  const [me, setMe] = useState(user || null)
  const [orders, setOrders] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login', { replace: true })
      } else {
        // Optional: Redirect admins to their main dashboard if they land here
        // But allow them to stay if they explicitly want to view profile?
        // Current logic forced them out. Let's use the helper to enforce "Home" dashboard.
        // If we want admins to see this page, we should probably mount it at /admin/profile or similar.
        // For now, preserve existing behavior: Admins go to /admin.
        const target = getDashboardPathForUser(user)
        if (target !== '/dashboard' && target !== '/dashboard/profile') {
             // If the user's "home" is not here, redirect them.
             // But wait, what if they clicked "Profile"?
             // If this is the ONLY profile page, we must allow them.
             // The previous code kicked them out: `if (user.role === 'ADMIN') navigate('/admin')`
             // So I will maintain that behavior but use the helper to be safe.
             // Actually, the helper returns `/admin` for owner/admin.
             // So `target` will be `/admin`.
             if (location.pathname === '/dashboard') {
                navigate(target, { replace: true })
             }
        }
      }
    }
  }, [loading, user, navigate, location.pathname])

  const refresh = async () => {
    setRefreshing(true)
    try {
      const [meRes, ordersRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/user/orders')
      ])
      setMe(meRes.data?.data || null)
      setOrders(Array.isArray(ordersRes.data?.data) ? ordersRes.data.data : [])
    } catch {}
    setRefreshing(false)
  }

  useEffect(() => { if (!loading && user) { refresh() } }, [loading, user])

  useEffect(() => {
    const p = location.pathname || '/dashboard'
    if (p.endsWith('/orders')) setActive('orders')
    else if (p.endsWith('/security')) setActive('security')
    else setActive('profile')
  }, [location.pathname])

  if (loading) return <p className="text-sm text-slate-600 dark:text-slate-300">Loading dashboard...</p>
  if (!user) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Mobile card navigation */}
      <div className="md:hidden space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <Link to="/dashboard/profile" className="block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="font-semibold">Manage Profile</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Update your details</div>
          </Link>
          <Link to="/dashboard/orders" className="block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="font-semibold">My Orders</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">View your order history</div>
          </Link>
          <Link to="/dashboard/security" className="block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="font-semibold">Security</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Change your password</div>
          </Link>
        </div>
      </div>
      <aside className="hidden md:block md:col-span-1">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 space-y-2">
          <button className={`w-full text-left px-4 py-2 rounded-lg ${active==='profile'?'bg-slate-100 dark:bg-slate-800':''} min-h-[44px] transition-colors`} onClick={()=>navigate('/dashboard/profile')}>Profile</button>
          <button className={`w-full text-left px-4 py-2 rounded-lg ${active==='orders'?'bg-slate-100 dark:bg-slate-800':''} min-h-[44px] transition-colors`} onClick={()=>navigate('/dashboard/orders')}>Orders</button>
          <button className={`w-full text-left px-4 py-2 rounded-lg ${active==='security'?'bg-slate-100 dark:bg-slate-800':''} min-h-[44px] transition-colors`} onClick={()=>navigate('/dashboard/security')}>Security</button>
          <button className={`w-full text-left px-4 py-2 rounded-lg ${active==='support'?'bg-slate-100 dark:bg-slate-800':''} min-h-[44px] transition-colors`} onClick={()=>setActive('support')}>Support</button>
          <button className="w-full text-left px-4 py-2 rounded-lg bg-red-600 text-white min-h-[44px] hover:bg-red-700 transition-colors" onClick={logout}>Logout</button>
        </div>
      </aside>
      <section className="md:col-span-3">
        {active === 'profile' && <ProfileTab me={me} onUpdated={refresh} />}
        {active === 'orders' && <OrdersTab orders={orders} />}
        {active === 'security' && <SecurityTab />}
        {active === 'support' && <SupportTab />}
      </section>
    </div>
  )
}
