import React from 'react'

interface EmptyStateProps {
  title: string
  text?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ title, text, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {text && <p className="text-xs text-slate-500 mt-1 max-w-xs">{text}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
