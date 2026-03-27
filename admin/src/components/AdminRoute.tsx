import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { resolveAdminAccess } from '../auth/resolveAdminAccess'

export default function AdminRoute({ children }: any) {
  const { user, loading, error } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="text-center py-10 text-sm text-slate-500">Loading...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-red-600 mb-2">Network error. Please check your connection.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300 text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  const { canAccessAdmin } = resolveAdminAccess(user.role)

  if (!canAccessAdmin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return children as any
}
