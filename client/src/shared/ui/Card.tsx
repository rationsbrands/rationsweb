import React from 'react'
import { cn } from '../../utils/cn'

interface CardProps {
  children: React.ReactNode
  header?: React.ReactNode
  className?: string
}

export default function Card({ children, header, className }: CardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4", className)}>
      {header && <div className="mb-3 pb-3 border-b border-slate-100">{header}</div>}
      {children}
    </div>
  )
}
