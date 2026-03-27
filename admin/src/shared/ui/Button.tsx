export default function Button({ children, className = '', ...props }: any) {
  return (
    <button
      className={`inline-flex items-center justify-center px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
