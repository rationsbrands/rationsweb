// Role and permission helpers for rationsweb-admin
export const ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  KITCHEN: 'kitchen',
  STAFF: 'staff',
  USER: 'user',
} as const

export const PERMISSIONS = {
  MANAGE_USERS: [ROLE.OWNER, ROLE.ADMIN],
  VIEW_USERS: [ROLE.OWNER, ROLE.ADMIN, ROLE.MANAGER],
  MANAGE_MENU: [ROLE.OWNER, ROLE.ADMIN, ROLE.MANAGER],
  MANAGE_ORDERS: [ROLE.OWNER, ROLE.ADMIN, ROLE.MANAGER, ROLE.CASHIER],
  KITCHEN_ORDERS: [ROLE.OWNER, ROLE.ADMIN, ROLE.MANAGER, ROLE.KITCHEN],
  VIEW_REPORTS: [ROLE.OWNER, ROLE.ADMIN, ROLE.MANAGER],
  TENANT_SETTINGS: [ROLE.OWNER],
  BILLING: [ROLE.OWNER],
} as const

export function hasRole(user: any, roles: readonly string[]) {
  const r = String(user?.role || '').toLowerCase()
  const allowed = Array.from(roles).map((x) => String(x).toLowerCase())
  if (!r) return false
  return allowed.includes(r)
}

export function hasPermission(user: any, key: keyof typeof PERMISSIONS) {
  const roles = PERMISSIONS[key] || []
  return hasRole(user, roles)
}
