import React from 'react'
import { cn } from '../../utils/cn'

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  isLoading?: boolean
}

export default function AppButton({ children, variant = 'primary', isLoading, className, ...props }: AppButtonProps) {
  const base = "px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800",
    danger: "bg-red-600 text-white hover:bg-red-700"
  }
  
  return (
    <button className={cn(base, variants[variant], className)} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? 'Loading...' : children}
    </button>
  )
}
