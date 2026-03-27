import { NavLink } from 'react-router-dom'

export default function ProtectedNavItem({ to, label, allowed = true, onClick }: { to: string; label: string; allowed?: boolean; onClick?: () => void }) {
  if (!allowed) return null
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }: any) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive 
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100' 
          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      {label}
    </NavLink>
  )
}
