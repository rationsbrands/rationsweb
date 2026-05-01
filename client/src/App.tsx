// Top-level app routes and layout
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Menu from './pages/Menu'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import Contact from './pages/Contact'
import Community from './pages/Community'
import CommunityPostPage from './pages/CommunityPostPage'
import { useEffect, useState } from 'react'
import api from './api'
import { SITE } from './config/site'
import About from './pages/About'

function App() {
  // Community alert popup state
  const [visitorAlertPost, setVisitorAlertPost] = useState<any>(null)
  const [hideVisitorAlert, setHideVisitorAlert] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  useEffect(() => {
    // Fetch site settings and hydrate client-side constants
    api.get('/public/settings')
      .then(res => {
        const s = res.data?.data || {}
        
        // Identity
        if (s.name) SITE.name = s.name
        if (s.tagline) SITE.tagline = s.tagline
        if (s.description) SITE.description = s.description
        
        // Theme
        if (s.primaryColor) {
           document.documentElement.style.setProperty('--ration-yellow', s.primaryColor)
        }

        if (s.contacts) SITE.contacts = { ...SITE.contacts, ...s.contacts }
        if (s.bank) SITE.bank = { ...SITE.bank, ...s.bank }
        if (Array.isArray(s.socials)) {
          const map = new Map(s.socials.map((x: any) => [x.name, x.url]))
          SITE.socials = (SITE.socials || []).map((entry: any) => ({
            ...entry,
            url: String(map.get(entry.name) ?? entry.url),
          }))
        }
        
        SITE.promoMessage = s.promoMessage || SITE.promoMessage
        SITE.promoStart = s.promoStart || SITE.promoStart
        SITE.promoEnd = s.promoEnd || SITE.promoEnd
        SITE.eventMessage = s.eventMessage || SITE.eventMessage
        SITE.eventDate = s.eventDate || SITE.eventDate
        SITE.eventStart = s.eventStart || SITE.eventStart
        SITE.eventEnd = s.eventEnd || SITE.eventEnd
        
        if (typeof s.visitorAlertEnabled !== 'undefined') SITE.visitorAlertEnabled = s.visitorAlertEnabled

        try {
          const once = sessionStorage.getItem('hideVisitorAlert_v2') === '1'
          setHideVisitorAlert(once)
        } catch {}
        
        // Trigger re-render to reflect settings in UI
        setSettingsLoaded(true)
        
        // Optionally fetch a community post to show as a visitor alert
        if (!hideVisitorAlert && SITE.visitorAlertEnabled !== false) {
          api.get('/public/community')
            .then(r => {
              const list = Array.isArray(r.data?.data) ? r.data.data : []
              const nowTs = Date.now()
              const inWindow = (p: any) => {
                const start = p.alertStart ? new Date(p.alertStart).getTime() : null
                const end = p.alertEnd ? new Date(p.alertEnd).getTime() : null
                if (start && end) return nowTs >= start && nowTs <= end
                if (start && !end) return nowTs >= start
                if (!start && end) return nowTs <= end
                return true
              }
              const candidate = list.find((p: any) => Boolean(p.alertEnabled) && inWindow(p))
              if (candidate) setVisitorAlertPost(candidate)
            })
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [])
  const [showDelayedAlert, setShowDelayedAlert] = useState(false)

  useEffect(() => {
    if (visitorAlertPost && !hideVisitorAlert) {
      const timer = setTimeout(() => setShowDelayedAlert(true), 2500)
      return () => clearTimeout(timer)
    }
  }, [visitorAlertPost, hideVisitorAlert])

  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar />
      
      {/* Non-blocking Toast Alert */}
      {visitorAlertPost && !hideVisitorAlert && showDelayedAlert && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-[calc(100vw-2rem)] sm:w-80 overflow-hidden flex flex-col">
            
            {/* Header/Close */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ration-green dark:text-ration-green flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-ration-green animate-pulse"></span>
                {visitorAlertPost.tag || 'Alert'}
              </span>
              <button 
                onClick={() => { setHideVisitorAlert(true); try { sessionStorage.setItem('hideVisitorAlert_v2', '1') } catch {} }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 -mr-1"
                aria-label="Dismiss alert"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="text-base font-bold text-[#0C1E22] dark:text-white leading-tight mb-1.5 line-clamp-2">
                {visitorAlertPost.title}
              </h3>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                {visitorAlertPost.content}
              </p>
              <a 
                href={`/community/${visitorAlertPost._id}`} 
                className="flex items-center justify-center w-full px-4 py-2 bg-ration-yellow text-ration-dark hover:bg-[#e6a100] rounded-xl text-[13px] font-bold transition-colors shadow-sm"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 w-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<div className="max-w-6xl mx-auto px-4 py-6"><Menu /></div>} />
          <Route path="/cart" element={<div className="max-w-6xl mx-auto px-4 py-6"><CartPage /></div>} />
          <Route path="/checkout" element={<div className="max-w-6xl mx-auto px-4 py-6"><CheckoutPage /></div>} />
          <Route path="/contact" element={<div className="max-w-6xl mx-auto px-4 py-6"><Contact /></div>} />
          <Route path="/about" element={<div className="max-w-6xl mx-auto px-4 py-6"><About /></div>} />
          <Route path="/community" element={<div className="max-w-6xl mx-auto px-4 py-6"><Community /></div>} />
          <Route path="/community/:id" element={<div className="max-w-6xl mx-auto px-4 py-6"><CommunityPostPage /></div>} />
            
          {/* Catch all */}
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
      <Footer />
    </div>
  )
}

export default App
