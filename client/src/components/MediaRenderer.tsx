import { useEffect, useMemo, useRef, useState } from 'react'

export default function MediaRenderer({ url, title = '', variant = 'list', imageFallback = '' }) {
  const parsed = useMemo(() => {
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
      if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
        return { type: 'image', url: u }
      }
      if (['mp4', 'webm', 'ogg', 'm4v'].includes(ext || '')) {
        return { type: 'video', url: u }
      }
      return { type: 'link', url: u }
    } catch {
      return { type: 'link', url: String(url || '').trim() }
    }
  }, [url])

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

        // scroll away → enter PiP
        if (!entry.isIntersecting && !document.pictureInPictureElement) {
          try {
            await (video as any).requestPictureInPicture()
          } catch {}
        }

        // scroll back → exit PiP
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

  const ratioClass = variant === 'detail' ? 'rounded-xl' : 'rounded-b-xl'
  const wrapPad = '56.25%'
  const imageClasses =
    variant === 'detail'
      ? 'w-full h-auto rounded-xl object-cover'
      : 'absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]'
  const cardPadClasses = variant === 'detail' ? '' : 'w-full'

  /* -------------------------------------------
     RENDER
  --------------------------------------------*/
  if (parsed.type === 'none') {
    if (imageFallback) {
      return (
        <div className={`relative overflow-hidden ${ratioClass}`}>
          <div className={cardPadClasses} style={{ paddingTop: '75%' }}>
            <img src={imageFallback} alt={title} className={imageClasses} />
          </div>
        </div>
      )
    }
    return null
  }

  /* YouTube (PiP via iframe) */
  if (parsed.type === 'youtube' && parsed.id) {
    return (
      <div className={`relative w-full overflow-hidden ${ratioClass}`} style={{ paddingTop: wrapPad }}>
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
      <div ref={igRef}>
        <blockquote
          className="instagram-media"
          data-instgrm-permalink={parsed.url}
          data-instgrm-version="14"
        />
        {igFallback && (
          <a href={parsed.url} target="_blank" rel="noopener noreferrer" className="block px-4 py-3 text-sm underline">
            Open on Instagram
          </a>
        )}
      </div>
    )
  }

  /* Image */
  if (parsed.type === 'image') {
    return <img src={parsed.url} alt={title} className="w-full object-cover rounded-b-xl" />
  }

  /* VIDEO — native PiP + auto on scroll */
  if (parsed.type === 'video') {
    return (
      <div ref={wrapperRef} className={`relative w-full overflow-hidden ${ratioClass}`} style={{ paddingTop: wrapPad }}>
        <video
          ref={videoRef}
          controls
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={parsed.url} />
        </video>
      </div>
    )
  }

  /* X / Twitter */
  if (parsed.type === 'x') {
    return (
      <div ref={xRef}>
        <blockquote className="twitter-tweet">
          <a href={parsed.url}>View on X</a>
        </blockquote>
        {xFallback && (
          <a href={parsed.url} target="_blank" rel="noopener noreferrer" className="block px-4 py-3 text-sm underline">
            Open on X
          </a>
        )}
      </div>
    )
  }

  /* Fallback link (always clickable) */
  return (
    <a href={parsed.url} target="_blank" rel="noopener noreferrer" className="block px-4 py-3 text-sm underline">
      {parsed.url}
    </a>
  )
}
