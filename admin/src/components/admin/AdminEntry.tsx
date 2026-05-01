import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { resolveAdminAccess } from '../../auth/resolveAdminAccess'

export default function AdminEntry() {
  const { user, loading } = useAuth()
  
  if (loading) return <div className="p-10 text-center text-slate-500 dark:text-slate-400">Loading...</div>
  
  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  const perms = resolveAdminAccess(user.role)
  
  if (!perms.canAccessAdmin) {
    return <Navigate to="/admin/login" replace />
  }

  // Smart routing based on role/permissions
  if (perms.canManageMenu) return <Navigate to="/admin/menu" replace />
  if (perms.canManageOrders) return <Navigate to="/admin/orders" replace />
  if (perms.canViewReports) return <Navigate to="/admin/analytics" replace />
  
  return <Navigate to="/admin/login" replace />
}
