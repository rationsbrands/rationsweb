import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { resolveAdminAccess } from '../auth/resolveAdminAccess'

interface Props {
  children: any
  requiredPermission?: 'canAccessAdmin' | 'canManageSettings' | 'canManageMenu' | 'canManageOrders' | 'canManageUsers' | 'canViewReports'
  // Keep allowed for legacy routes I might not catch, but prefer requiredPermission
  allowed?: string[] 
}

export default function ProtectedRoute({ children, requiredPermission, allowed }: Props) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="text-center py-10 text-sm text-slate-500">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  const perms = resolveAdminAccess(user.role)

  if (requiredPermission) {
    if (!perms[requiredPermission]) {
      return <Navigate to="/admin/login" replace />
    }
  } else if (allowed && allowed.length > 0) {
    // Legacy fallback: strict role match
    if (!allowed.includes(user.role || '')) {
       return <Navigate to="/admin/login" replace />
    }
  }

  return children
}
