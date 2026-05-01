import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/api'
import FormInput from '@shared/ui/FormInput'
import Button from '@shared/ui/Button'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpPhase, setOtpPhase] = useState(false)
  const [code, setCode] = useState('')
  const [userId, setUserId] = useState(null)
  const [channel, setChannel] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const navigate = useNavigate()
  const { completeOtpVerification } = useAuth()

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const name = form.name.trim()
      const email = form.email.trim()
      const password = form.password
      const payload = { name, email, password }
      const res = await api.post('/auth/register', payload)
      setUserId(res.data?.data?.userId)
      setChannel(res.data?.data?.channel || '')
      setOtpPhase(true)
      setCooldown(60)
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: any) => {
    e.preventDefault()
    if (!otpPhase || !userId) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/verify-otp', { userId, code: code.trim() })
      completeOtpVerification(res.data.data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!userId || cooldown > 0) return
    setError('')
    try {
      await api.post('/auth/resend-otp', { userId })
      setCooldown(60)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to resend code')
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
      <h1 className="text-xl font-semibold mb-4">Create account</h1>
      <form onSubmit={otpPhase ? handleVerify : handleSubmit} className="space-y-3">
        <FormInput
          label="Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />
        {!otpPhase && (
          <>
            <FormInput
              label="Email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <FormInput
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </>
        )}
        {otpPhase && (
          <div>
            <label className="block text-sm mb-1">Enter verification code sent to your {channel?.toUpperCase()}</label>
            <input
              value={code}
              onChange={(e)=>setCode(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-base"
              placeholder="6-digit code"
            />
            <div className="mt-2 flex items-center gap-2">
              <button type="button" onClick={handleResend} disabled={cooldown>0} className="text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-60 min-h-[44px]">Resend Code</button>
              <span className="text-xs text-slate-600 dark:text-slate-300">Resend available in: {cooldown}s</span>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? (otpPhase ? 'Verifying...' : 'Creating account...') : (otpPhase ? 'Verify Code' : 'Sign up')}
        </Button>
      </form>
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-600 font-medium">Login</Link>
      </p>
    </div>
  )
}
