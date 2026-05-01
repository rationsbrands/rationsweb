import { cn } from '../../utils/cn'

export default function FormInput({ label, className, ...props }: any) {
  return (
    <label className="block text-sm mb-3">
      <span className="block mb-1 text-slate-700 dark:text-slate-200 font-medium">{label}</span>
      <input
        className={cn(
          "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent",
          className
        )}
        {...props}
      />
    </label>
  )
}
