import { useEffect, useState } from 'react'
import api from '../api/api'
import Setup from './Setup'
import Login from './Login'

export default function SetupGate() {
  const [state, setState] = useState<{ loading: boolean, canSetup: boolean }>({ loading: true, canSetup: false })

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api.get('/admin/setup/status')
        if (!alive) return
        setState({ loading: false, canSetup: !!res.data?.canSetup })
      } catch {
        if (!alive) return
        setState({ loading: false, canSetup: false })
      }
    })()
    return () => { alive = false }
  }, [])

  if (state.loading) return <div className="p-8">Loading...</div>
  return state.canSetup ? <Setup /> : <Login />
}
