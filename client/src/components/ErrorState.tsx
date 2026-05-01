import React from "react"

type Props = {
  title: string
  message?: string
  onRetry?: () => void
}

export default function ErrorState({ title, message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50 rounded-xl border border-dashed border-red-200">
      <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 19a7 7 0 100-14 7 7 0 000 14z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-red-700">{title}</h3>
      {message && <p className="text-xs text-red-600 mt-1 max-w-xs">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-white dark:bg-slate-900 border border-red-300 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50"
        >
          Retry
        </button>
      )}
    </div>
  )
}

