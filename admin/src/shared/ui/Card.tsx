import React from 'react'

interface CardProps {
  children: React.ReactNode
  header?: React.ReactNode
  className?: string
}

export default function Card({ children, header, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 ${className}`}>
      {header && <div className="mb-3 pb-3 border-b border-slate-100">{header}</div>}
      {children}
    </div>
  )
}
