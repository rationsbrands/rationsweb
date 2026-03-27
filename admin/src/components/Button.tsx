export default function Button({ children, className = '', ...props }: any) {
  return (
    <button
      className={`inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium bg-primary-500 text-ration-dark hover:bg-ration-dark-hover hover:text-white disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

