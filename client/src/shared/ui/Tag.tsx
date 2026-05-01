import React from 'react'

interface TagProps {
  value: string
  color?: string
}

export default function Tag({ value, color }: TagProps) {
  let bg = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
  const v = value?.toLowerCase() || ''
  
  if (v === 'pending') bg = 'bg-yellow-100 text-yellow-700'
  else if (v === 'preparing') bg = 'bg-blue-100 text-blue-700'
  else if (v === 'ready') bg = 'bg-indigo-100 text-indigo-700'
  else if (v === 'completed' || v === 'paid' || v === 'active') bg = 'bg-green-100 text-green-700'
  else if (v === 'cancelled' || v === 'failed' || v === 'archived') bg = 'bg-red-100 text-red-700'
  else if (v === 'pickup') bg = 'bg-purple-100 text-purple-700'
  else if (v === 'delivery') bg = 'bg-orange-100 text-orange-700'
  
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium uppercase tracking-wide ${bg}`}>
      {value}
    </span>
  )
}
