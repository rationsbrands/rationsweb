export default function FormInput({ label, type = 'text', name, value, onChange, required = false }: any) {
  return (
    <label className="block text-sm mb-3">
      <span className="block mb-1 text-slate-700">{label}</span>
      <input
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
      />
    </label>
  )
}

