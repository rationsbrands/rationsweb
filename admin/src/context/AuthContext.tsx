import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/api'
import { useNavigate } from 'react-router-dom'
import type { AuthUser, AuthResponse } from '@shared/types'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  error: Error | null
  login: (identifier: string, password: string) => Promise<AuthUser>
  register: (payload: Record<string, unknown>) => Promise<any>
  logout: () => void
  updateMe: (payload: Partial<AuthUser> & Record<string, unknown>) => Promise<AuthUser>
  sendOtp: (payload: { phone: string; password: string; name?: string; intent?: 'login' | 'register' }) => Promise<boolean>
  verifyOtp: (payload: { phone: string; otp: string; email?: string }) => Promise<AuthUser>
  completeOtpVerification: (data: AuthResponse) => void
  changePassword: (payload: { currentPassword: string; newPassword: string }) => Promise<boolean>
  setAuthState: (data: AuthResponse) => void
  refreshUser: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const navigate = useNavigate()

  const refreshUser = async () => {
    try {
      setError(null)
      const res = await api.get('/auth/me')
      const u = res.data?.data || res.data?.user
      setUser(u)
      return true // Resolved successfully
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("rations_admin_token");
        delete (api.defaults.headers as any).common?.Authorization;
        setUser(null);
        return true; // Resolved safely (logged out)
      }
      // Network/Server error: keep existing state (don't logout)
      // We set error state so UI can show a retry button, but we return false
      // to keep "loading" true (or handle it in UI) so we don't redirect to login.
      console.error('Auth hydration error:', error)
      setError(error);
      return false // Unsafe error
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("rations_admin_token");
    if (!token) {
      setLoading(false);
      return;
    }
    refreshUser().then((success) => {
      // If success is true, we are either authed or definitely logged out.
      // If success is false, we have a network error.
      // We should probably stop loading ONLY if success is true.
      if (success) {
        setLoading(false);
      } else {
        // Keep loading true? Or set it false but have error?
        // If we set loading false, AdminRoute sees user=null and redirects to login.
        // So we MUST keep loading=true (or use a separate 'hydrating' flag).
        // If we keep loading=true, AdminRoute shows "Loading...".
        // We can update AdminRoute to check for `error`.
      }
    })
  }, [])

const applyAuthResponse = (data: any) => {
  const token =
    data?.accessToken ||
    data?.token ||
    data?.data?.accessToken ||
    data?.data?.token;

  const user =
    data?.user ||
    data?.data?.user;

  if (token) {
    localStorage.setItem("rations_admin_token", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  if (user) {
    setUser(user);
  }
};

const login = async (identifier: string, password: string) => {
  const email = identifier.trim().toLowerCase();
  const res = await api.post('/auth/login', { email, password });

  // backend returns { ok, accessToken, user }
applyAuthResponse(res.data?.data ?? res.data)
  if (!res.data?.user) {
    throw new Error("Login failed: user missing");
  }

  return res.data.user;
};

  const register = async (payload: Record<string, unknown>) => {
    const res = await api.post('/auth/register', payload)
    return res.data.data
  }

  const logout = () => {
    localStorage.removeItem("rations_admin_token");
    delete (api.defaults.headers as any).common?.Authorization;
    setUser(null);
    navigate("/admin/login");
  }

const updateMe = async (payload) => {
  const res = await api.patch('/user/me', payload);
  setUser(res.data.data);
  return res.data.data;
};

  const sendOtp = async ({ phone, password, name, intent = 'login' }: { phone: string; password: string; name?: string; intent?: 'login' | 'register' }) => {
    await api.post('/auth/send-otp', { phone, password, name, intent })
    return true
  }

  const verifyOtp = async ({ phone, otp, email }: { phone: string; otp: string; email?: string }) => {
    const res = await api.post('/auth/verify-otp', { phone, otp, email })
    applyAuthResponse(res.data.data)
    return res.data.data.user
  }

  const completeOtpVerification = (data: AuthResponse) => {
    applyAuthResponse(data)
  }

  const setAuthState = (data: AuthResponse) => {
    applyAuthResponse(data)
  }

  const changePassword = async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
    const res = await api.put('/auth/change-password', { currentPassword, newPassword })
    applyAuthResponse(res.data.data)
    return true
  }

  const value: AuthContextValue = { user, loading, error, login, register, logout, updateMe, sendOtp, verifyOtp, completeOtpVerification, changePassword, setAuthState, refreshUser }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
