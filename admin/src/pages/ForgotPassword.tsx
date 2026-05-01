import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!isEmailValid) return
    setLoading(true)
    setMessage('')
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() })
      setMessage('If an account exists, a reset link has been sent')
    } catch {
      setMessage('If an account exists, a reset link has been sent')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
      <h1 className="text-xl font-semibold mb-4">Forgot Password</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative w-full">
          <label className="block text-sm mb-1 text-slate-700 dark:text-slate-200">Email</label>
          <input
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-ration-yellow focus:outline-none"
            required
          />
          {!isEmailValid && email.length > 0 && (
            <p className="mt-1 text-xs text-red-500">Enter a valid email.</p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !isEmailValid}
          className="w-full px-4 py-2 min-h-[44px] rounded-full bg-ration-dark text-white hover:bg-ration-dark-hover disabled:opacity-60 font-medium"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
        {message && <p className="text-xs text-slate-600 dark:text-slate-300">{message}</p>}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span>or</span>
          <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 text-center">
          Remembered your password? <Link to="/admin/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  )
}