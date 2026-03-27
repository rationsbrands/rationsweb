export default function StatCard({ title, value, hint }: any) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
      {hint && <div className="text-[11px] text-slate-500 mt-1">{hint}</div>}
    </div>
  )
}