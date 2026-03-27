import React from 'react'

interface Action {
  label: string
  onClick: () => void
  primary?: boolean
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: Action[]
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex gap-2">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                action.primary
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
