import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '@shared/ui/Button'
import { getDashboardPathForUser } from '../utils/routing'
import { resolveAdminAccess } from '../auth/resolveAdminAccess'
import api from '../api/api'

export default function Login() {
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const { setAuthState, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const isFormValid = form.identifier.trim().length > 0 && form.password.length > 0

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const email = form.identifier.trim().toLowerCase()
      
      const res = await api.post('/auth/login', { email, password: form.password })
      const accessToken = res.data?.accessToken || res.data?.data?.token || ''
      const user = res.data?.user || res.data?.data?.user || null

      if (accessToken && user) {
        localStorage.setItem("rations_admin_token", accessToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

        setAuthState({ user, token: accessToken, success: true });
        
        const { canAccessAdmin } = resolveAdminAccess(user.role);
        if (!canAccessAdmin) {
          logout();
          setError('Access denied. You do not have administrative privileges.');
          return;
        }

        if (from && from !== '/' && !from.includes('/login')) {
          navigate(from, { replace: true });
        } else {
          const dashboard = getDashboardPathForUser(user);
          navigate(dashboard, { replace: true });
        }
      } else {
        setError('Login failed');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Admin Sign in</h1>
        <p className="text-sm text-slate-500 mt-1">Manage menu, orders, and content</p>
      </div>

      <div className="mb-6 bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div className="text-sm text-amber-800">
          <p className="mt-0.5">Please sign in with your administrator credentials.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email or Phone</label>
          <input
            type="text"
            name="identifier"
            value={form.identifier}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-base"
            placeholder="email"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <div className="relative">
            <input
              type={passwordVisible ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all pr-10 text-base"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setPasswordVisible(!passwordVisible)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-2 min-h-[44px] flex items-center justify-center"
            >
              {passwordVisible ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={loading}
          disabled={!isFormValid || loading}
        >
          Sign in
        </Button>
      </form>
    </div>
  )
}
