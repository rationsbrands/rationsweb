import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/api'

type Features = { hasCommunity?: boolean; hasPublicWebsiteIntegration?: boolean; hasMenuSync?: boolean; hasPOS?: boolean }
type Branding = { name?: string; logoUrl?: string; primaryColor?: string }

interface TenantCtxValue {
  isRations: boolean
  features: Features
  modules: string[]
  hasFeature: (key: keyof Features) => boolean
  hasModule: (module: string) => boolean
  branding: Branding
}

const TenantContext = createContext<TenantCtxValue | null>(null)

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [isRations, setIsRations] = useState(false)
  const [features, setFeatures] = useState<Features>({})
  const [modules, setModules] = useState<string[]>([])
  const [branding, setBranding] = useState<Branding>({})

  useEffect(() => {
    const token = localStorage.getItem("rations_admin_token");
    if (!token) return
    api.get('/public/settings')
      .then(res => {
        const data = res.data?.data || {}
        setIsRations(true)
        setFeatures(data.features || {})
        setModules(data.modules || [])
        const s = data.settings || {}
        setBranding({ name: data.name || '', logoUrl: data.logoUrl || '', primaryColor: s?.primaryColor || '' })
      })
      .catch(() => {})
  }, [])

  const value: TenantCtxValue = {
    isRations,
    features,
    modules,
    hasFeature: (key: keyof Features) => Boolean((features as any)[key]),
    hasModule: (mod: string) => modules.includes(mod),
    branding,
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within TenantProvider')
  return ctx
}
