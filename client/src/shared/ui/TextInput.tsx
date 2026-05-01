import React from 'react'

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function TextInput({ label, className = '', ...props }: TextInputProps) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</label>}
      <input
        className="w-full rounded-lg border-slate-300 dark:border-slate-600 text-sm px-3 py-2 focus:border-slate-500 focus:ring-slate-500"
        {...props}
      />
    </div>
  )
}
