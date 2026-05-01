import { useState, useEffect } from 'react'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'
import { useTenant } from '../../context/TenantContext'
import api from '../../api/api'

export default function AdminLayout({ children }: any) {
  const [open, setOpen] = useState(false)
  const { branding } = useTenant()
  const [platformError, setPlatformError] = useState<string | null>(null)
  const [connectedMode, setConnectedMode] = useState<boolean>(false)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.get('/integrations/platform/status')
        const data = res.data.data
        if (data.status === 'connected' && data.lastError) {
          setPlatformError(data.lastError)
        } else {
          setPlatformError(null)
        }
        setConnectedMode(data.status === 'connected')
      } catch (e) {
        // quiet
      }
    }
    
    checkStatus()
    const interval = setInterval(checkStatus, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 md:min-h-[calc(100vh-2rem)] md:m-4 md:border md:rounded-xl overflow-hidden flex flex-col">
      <div className="flex relative flex-1">
        <div className={`hidden md:block border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 w-64`}>
          <AdminSidebar onLinkClick={() => setOpen(false)} />
        </div>
        {open && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={()=>setOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 border-r z-50">
              <AdminSidebar onLinkClick={() => setOpen(false)} />
            </div>
          </div>
        )}
        <div className="flex-1">
          <div style={{ borderTopColor: branding.primaryColor || undefined }}>
            <AdminTopbar onToggleSidebar={() => setOpen(v=>!v)} />
          </div>
          {platformError && (
             <div className="bg-red-50 text-red-700 px-4 py-2 text-sm text-center border-b border-red-100 flex justify-between items-center">
               <span><strong>Platform Sync Error:</strong> {platformError}</span>
               <button onClick={() => setPlatformError(null)} className="text-red-500 hover:text-red-800 text-xs">&times;</button>
             </div>
          )}
          <div className="p-4 max-w-6xl mx-auto">{children}</div>
        </div>
      </div>
    </div>
  )
}
