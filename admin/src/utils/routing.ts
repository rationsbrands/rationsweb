import { AuthUser } from '../shared/types'
import { ROLE } from '../auth/roles'

/**
 * Returns the primary dashboard path for a given user based on their role.
 * This is the single source of truth for post-login redirects and home page routing.
 */
export function getDashboardPathForUser(user: AuthUser | null): string {
  if (!user || !user.role) return '/login'

  const role = String(user.role).toLowerCase()

  switch (role) {
    case ROLE.OWNER:
    case ROLE.ADMIN:
      // We prefer /admin as the cleaner route, assuming it renders AdminDashboard
      return '/admin'
    
    case ROLE.MANAGER:
      return '/dashboard/manager'
    
    case ROLE.CASHIER:
      return '/dashboard/cashier'
    
    case ROLE.KITCHEN:
      return '/dashboard/kitchen'
    
    case ROLE.STAFF:
    case ROLE.USER:
    default:
      // Staff and regular users go to the generic user dashboard (Profile/Orders)
      return '/dashboard'
  }
}
