import { Navigate, Outlet } from 'react-router-dom'
import { useTenant } from '../context/TenantContext'
import { useAuth } from '../context/AuthContext'

interface ModuleGuardProps {
  module: string
  redirectTo?: string
  children?: React.ReactNode
}

export default function ModuleGuard({ module, redirectTo = '/dashboard/admin', children }: ModuleGuardProps) {
  const { hasModule, isRations } = useTenant()
  const { user } = useAuth()
  
  // Rations tenant should effectively have this module, but better to rely on hasModule.
  // We added a fallback in migration to add the module to the rations tenant.
  
  if (!hasModule(module)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">404</h1>
        <p className="text-lg text-slate-600">Page not found or you do not have access to this module.</p>
        <a href="/" className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
          Go Home
        </a>
      </div>
    )
  }

  return children ? <>{children}</> : <Outlet />
}
