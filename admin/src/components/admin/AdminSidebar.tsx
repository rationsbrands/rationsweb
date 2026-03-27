import { useTenant } from '../../context/TenantContext'
import { useAuth } from '../../context/AuthContext'
import { resolveAdminAccess } from '../../auth/resolveAdminAccess'
import ProtectedNavItem from './ProtectedNavItem'

export default function AdminSidebar({ onLinkClick }: any) {
  const { hasFeature } = useTenant()
  const { user } = useAuth()
  const perms = resolveAdminAccess(user?.role)

  return (
    <aside className="w-64 shrink-0 border-r bg-white dark:bg-slate-900 dark:border-slate-800 h-full min-h-screen">
      <div className="p-4">
        <div className="text-lg font-bold mb-3 dark:text-white">Admin</div>
        <nav className="space-y-1">
          <ProtectedNavItem to="/admin/orders" label="Orders" allowed={perms.canManageOrders} onClick={onLinkClick} />
          <ProtectedNavItem to="/admin/pos" label="POS" allowed={perms.canManageOrders} onClick={onLinkClick} />
          <ProtectedNavItem to="/admin/menu" label="Menu" allowed={perms.canManageMenu} onClick={onLinkClick} />
          <ProtectedNavItem to="/admin/customers" label="Customers" allowed={perms.canManageOrders} onClick={onLinkClick} />
          <ProtectedNavItem to="/admin/users" label="Staff & Roles" allowed={perms.canManageUsers} onClick={onLinkClick} />
          {hasFeature('hasCommunity') && <ProtectedNavItem to="/admin/community" label="Community" allowed={perms.canViewReports} onClick={onLinkClick} />}
          <ProtectedNavItem to="/admin/analytics" label="Analytics" allowed={perms.canViewReports} onClick={onLinkClick} />
          <ProtectedNavItem to="/admin/settings" label="Settings" allowed={perms.canManageSettings} onClick={onLinkClick} />
          <ProtectedNavItem to="/admin/integrations/social" label="Social Media" allowed={perms.canManageSettings} onClick={onLinkClick} />
          <ProtectedNavItem to="/admin/integrations" label="All Integrations" allowed={perms.canManageSettings} onClick={onLinkClick} />
        </nav>
      </div>
    </aside>
  )
}
