export interface AdminPermissions {
  canAccessAdmin: boolean
  canManageSettings: boolean
  canManageMenu: boolean
  canManageOrders: boolean
  canManageUsers: boolean
  canViewReports: boolean
}

export function resolveAdminAccess(role?: string): AdminPermissions {
  const r = (role || '').toLowerCase()

  // Defaults
  const perms: AdminPermissions = {
    canAccessAdmin: false,
    canManageSettings: false,
    canManageMenu: false,
    canManageOrders: false,
    canManageUsers: false,
    canViewReports: false,
  }

  switch (r) {
    case 'owner':
    case 'admin':
      perms.canAccessAdmin = true
      perms.canManageSettings = true
      perms.canManageMenu = true
      perms.canManageOrders = true
      perms.canManageUsers = true
      perms.canViewReports = true
      break

    case 'manager':
      perms.canAccessAdmin = true
      perms.canManageSettings = false
      perms.canManageMenu = true
      perms.canManageOrders = true
      perms.canManageUsers = false
      perms.canViewReports = true
      break

    case 'cashier':
      perms.canAccessAdmin = true
      perms.canManageSettings = false
      perms.canManageMenu = false
      perms.canManageOrders = true
      perms.canManageUsers = false
      perms.canViewReports = false
      break

    case 'kitchen':
    case 'staff':
    case 'user':
    default:
      // No admin access
      perms.canAccessAdmin = false
      break
  }

  return perms
}
