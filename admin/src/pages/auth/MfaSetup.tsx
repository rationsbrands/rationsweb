import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/api'
import AppButton from '@shared/ui/AppButton'
import TextInput from '@shared/ui/TextInput'
import { AlertTriangle, CheckCircle, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function MfaSetup() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [step, setStep] = useState<'init' | 'verify' | 'success'>('init')
  const [secret, setSecret] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  const startSetup = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/mfa/setup')
      if (res.data?.success) {
        setSecret(res.data.data.secret)
        setQrCode(res.data.data.qrCode)
        setStep('verify')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start MFA setup')
    } finally {
      setLoading(false)
    }
  }

  const verifySetup = async () => {
    if (!code || code.length !== 6) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/mfa/verify', { token: code })
      if (res.data?.success) {
        setBackupCodes(res.data.data.backupCodes || [])
        setStep('success')
        await refreshUser()
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (step === 'init') startSetup()
  }, [])

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">MFA Enabled</h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2">Your account is now secured with two-factor authentication.</p>
          </div>
          
          {backupCodes.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-left">
              <div className="font-semibold text-sm mb-2">Backup Codes</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">Save these codes in a secure place. You can use them to log in if you lose access to your device.</div>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((c, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 border rounded px-2 py-1 text-center">{c}</div>
                ))}
              </div>
            </div>
          )}

          <AppButton className="w-full" onClick={() => navigate('/dashboard')}>
            Continue to Dashboard
          </AppButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Setup MFA</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm">Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {loading && !qrCode ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <div className="text-sm text-slate-500 dark:text-slate-400">Generating secret...</div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center">
              {qrCode && <img src={qrCode} alt="MFA QR Code" className="w-48 h-48 border rounded-lg" />}
            </div>
            
            <div className="text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Or enter this code manually:</div>
              <div className="font-mono bg-slate-100 dark:bg-slate-800 py-2 px-4 rounded text-sm select-all cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" onClick={() => navigator.clipboard.writeText(secret)}>
                {secret}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <TextInput
                label="Enter 6-digit code"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-widest font-mono"
              />
            </div>

            <div className="flex gap-3">
              <AppButton variant="secondary" className="w-full" onClick={() => navigate(-1)}>
                Cancel
              </AppButton>
              <AppButton className="w-full" onClick={verifySetup} disabled={code.length !== 6 || loading}>
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </AppButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
