import { useEffect, useMemo, useRef, useState } from 'react'

export const parseMediaUrl = (url: string) => {
  const u = String(url || '').trim()
  if (!u) return { type: 'none', url: '' }
  try {
    const obj = new URL(u)
    const host = obj.hostname.toLowerCase()
    const path = obj.pathname.toLowerCase()
    const ext = path.split('.').pop()

    if (host.includes('youtu.be')) {
      return { type: 'youtube', id: obj.pathname.replace('/', '') }
    }
    if (host.includes('youtube.com')) {
      return { type: 'youtube', id: obj.searchParams.get('v') }
    }
    if (host.includes('instagram.com')) {
      return { type: 'instagram', url: u }
    }
    if (host.includes('twitter.com') || host.includes('x.com')) {
      return { type: 'x', url: u }
    }
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) {
      return { type: 'image', url: u }
    }
    if (['mp4', 'webm', 'ogg', 'm4v'].includes(ext || '')) {
      return { type: 'video', url: u }
    }
    return { type: 'link', url: u }
  } catch {
    return { type: 'link', url: String(url || '').trim() }
  }
}

export default function MediaRenderer({ url, title = '', variant = 'list', imageFallback = '', hideFallbackLink = false }: any) {
  const parsed = useMemo(() => parseMediaUrl(url), [url])

  const igRef = useRef<HTMLDivElement | null>(null)
  const xRef = useRef<HTMLDivElement | null>(null)

  const [igFallback, setIgFallback] = useState(false)
  const [xFallback, setXFallback] = useState(false)

  /* -------------------------------------------
     AUTO PiP helpers (browser-safe)
  --------------------------------------------*/
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const userPlayedRef = useRef(false)

  useEffect(() => {
    if (parsed.type !== 'video') return
    const video = videoRef.current
    const wrapper = wrapperRef.current
    if (!video || !wrapper) return
    if (!('pictureInPictureEnabled' in document)) return

    const onPlay = () => {
      userPlayedRef.current = true
    }

    video.addEventListener('play', onPlay)

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!userPlayedRef.current) return
        if (video.paused) return

        if (!entry.isIntersecting && !document.pictureInPictureElement) {
          try {
            await (video as any).requestPictureInPicture()
          } catch {}
        }

        if (entry.isIntersecting && document.pictureInPictureElement === video) {
          try {
            await document.exitPictureInPicture()
          } catch {}
        }
      },
      { threshold: 0.25 }
    )

    observer.observe(wrapper)

    return () => {
      video.removeEventListener('play', onPlay)
      observer.disconnect()
    }
  }, [parsed.type])

  /* -------------------------------------------
     External embed loaders
  --------------------------------------------*/
  useEffect(() => {
    if (parsed.type === 'instagram') {
      const src = 'https://www.instagram.com/embed.js'
      if (![...document.scripts].some(s => s.src === src)) {
        const s = document.createElement('script')
        s.async = true
        s.src = src
        document.body.appendChild(s)
      }
      setTimeout(() => {
        try {
          ;(window as any).instgrm?.Embeds?.process()
        } catch {
          setIgFallback(true)
        }
      }, 300)
    }

    if (parsed.type === 'x') {
      const src = 'https://platform.twitter.com/widgets.js'
      if (![...document.scripts].some(s => s.src === src)) {
        const s = document.createElement('script')
        s.async = true
        s.src = src
        document.body.appendChild(s)
      }
      setTimeout(() => {
        try {
          ;(window as any).twttr?.widgets?.load()
        } catch {
          setXFallback(true)
        }
      }, 300)
    }
  }, [parsed.type])

  const isList = variant === 'list'
  
  // Blog format styling: Show FULL media without cropping, bounded by max-height.
  const maxHClass = isList ? 'max-h-[400px]' : 'max-h-[75vh]'
  const mediaClasses = `w-full h-auto ${maxHClass} object-contain transition-transform duration-500`

  /* -------------------------------------------
     RENDER
  --------------------------------------------*/
  if (parsed.type === 'none') {
    if (imageFallback) {
      return (
        <div className="w-full overflow-hidden bg-slate-100 dark:bg-[#0C1E22] flex items-center justify-center">
          <img 
            src={imageFallback} 
            alt={title} 
            className={mediaClasses}
            loading="lazy"
          />
        </div>
      )
    }
    return null
  }

  /* YouTube (PiP via iframe) */
  if (parsed.type === 'youtube' && parsed.id) {
    return (
      <div className="relative w-full overflow-hidden bg-black" style={{ paddingTop: '56.25%' }}>
        <iframe
          src={`https://www.youtube.com/embed/${parsed.id}`}
          title={title || 'YouTube video'}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  /* Instagram */
  if (parsed.type === 'instagram') {
    return (
      <div ref={igRef} className="w-full flex justify-center bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <blockquote
          className="instagram-media"
          data-instgrm-permalink={parsed.url}
          data-instgrm-version="14"
          style={{ margin: 0, minWidth: '100%' }}
        />
        {igFallback && !hideFallbackLink && (
          <a href={parsed.url} target="_blank" rel="noopener noreferrer" className="block px-4 py-3 text-sm underline">
            Open on Instagram
          </a>
        )}
      </div>
    )
  }

  /* Image */
  if (parsed.type === 'image') {
    return (
      <div className="w-full overflow-hidden bg-slate-100 dark:bg-[#0C1E22] flex items-center justify-center">
        <img 
          src={parsed.url} 
          alt={title} 
          className={mediaClasses}
          loading="lazy"
        />
      </div>
    )
  }

  /* VIDEO — native PiP + auto on scroll */
  if (parsed.type === 'video') {
    return (
      <div ref={wrapperRef} className="relative w-full bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          controls
          playsInline
          className={mediaClasses}
        >
          <source src={parsed.url} />
        </video>
      </div>
    )
  }

  /* X / Twitter */
  if (parsed.type === 'x') {
    return (
      <div ref={xRef} className="w-full flex justify-center overflow-hidden rounded-xl bg-white dark:bg-slate-900">
        <blockquote className="twitter-tweet">
          <a href={parsed.url}>View on X</a>
        </blockquote>
        {xFallback && !hideFallbackLink && (
          <a href={parsed.url} target="_blank" rel="noopener noreferrer" className="block px-4 py-3 text-sm underline">
            Open on X
          </a>
        )}
      </div>
    )
  }

  /* Fallback link (always clickable) */
  if (hideFallbackLink) return null
  return (
    <a href={parsed.url} target="_blank" rel="noopener noreferrer" className="block px-4 py-3 text-sm underline">
      {parsed.url}
    </a>
  )
}
