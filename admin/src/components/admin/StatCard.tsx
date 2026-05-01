export default function StatCard({ title, value, hint }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
      <div className="text-xs text-slate-500 dark:text-slate-400">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
      {hint && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{hint}</div>}
    </div>
  )
}