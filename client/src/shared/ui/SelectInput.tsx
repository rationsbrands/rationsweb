import React from 'react'

interface Option {
  label: string
  value: string | number
}

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: Option[]
}

export default function SelectInput({ label, options, className = '', ...props }: SelectInputProps) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</label>}
      <select
        className="w-full rounded-lg border-slate-300 dark:border-slate-600 text-sm px-3 py-2 focus:border-slate-500 focus:ring-slate-500 bg-white dark:bg-slate-900"
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
