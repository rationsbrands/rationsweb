import React from 'react'

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  isLoading?: boolean
}

export default function AppButton({ children, variant = 'primary', isLoading, className = '', ...props }: AppButtonProps) {
  const base = "px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700"
  }
  
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? 'Loading...' : children}
    </button>
  )
}
