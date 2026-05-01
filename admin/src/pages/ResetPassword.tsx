import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import api from '../api/api'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validLength = password.length >= 8
  const hasNumber = /\d/.test(password)
  const matches = password === confirm
  const isValid = validLength && hasNumber && matches

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setError('')
    try {
      await api.put(`/auth/reset-password/${token}`, { password })
      navigate('/admin/login?reset=success', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
      <h1 className="text-xl font-semibold mb-4">Reset Password</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative w-full">
          <label className="block text-sm mb-1 text-slate-700 dark:text-slate-200">New Password</label>
          <input
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-ration-yellow focus:outline-none"
            required
          />
          {!validLength && password.length > 0 && (
            <p className="mt-1 text-xs text-red-500">Minimum 8 characters.</p>
          )}
          {!hasNumber && password.length > 0 && (
            <p className="mt-1 text-xs text-red-500">Include at least one number.</p>
          )}
        </div>

        <div className="relative w-full">
          <label className="block text-sm mb-1 text-slate-700 dark:text-slate-200">Confirm Password</label>
          <input
            name="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-ration-yellow focus:outline-none"
            required
          />
          {!matches && confirm.length > 0 && (
            <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || !isValid}
          className="w-full px-4 py-2 rounded-full bg-ration-dark text-white hover:bg-ration-dark-hover disabled:opacity-60"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span>or</span>
          <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 text-center">
          Back to <Link to="/admin/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  )
}