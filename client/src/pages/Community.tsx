import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useEmblaCarousel from 'embla-carousel-react'
import api from '../api/api'
import { SITE } from '../config/site'
import CommunityPostCard from '../components/CommunityPostCard'

export default function Community({ embed = false }) {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' })

  useEffect(() => {
    if (embed && emblaApi) {
      const interval = setInterval(() => {
        if (emblaApi.canScrollNext()) {
          emblaApi.scrollNext()
        } else {
          emblaApi.scrollTo(0)
        }
      }, 5000) // Slightly slower for reading posts
      return () => clearInterval(interval)
    }
  }, [embed, emblaApi])

  useEffect(() => {
    api.get('/public/community')
      .then(res => setPosts(res.data.data))
      .catch(() => setError('Failed to load community posts.'))
      .finally(() => setLoading(false))
  }, [])

  if (embed) {
    return (
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-4 py-4">
          {posts.slice(0, 6).map((post, index) => (
            <div 
              key={post._id} 
              className="flex-[0_0_85%] sm:flex-[0_0_50%] lg:flex-[0_0_33.33%] min-w-0 pl-4"
            >
              <div className="h-full animate-slide-up" style={{ animationDelay: `${index * 150}ms` }}>
                <CommunityPostCard key={post._id} post={post} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
    <section className="relative overflow-hidden bg-gradient-to-b from-white dark:from-slate-900 to-gray-50 dark:to-slate-950 py-8 sm:py-20">
      <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[#FDCD2F]/20 blur-3xl -z-10" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#0C1E22]/10 blur-3xl -z-10" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-medium text-[#0C1E22]/70 dark:text-white/70">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#FDCD2F]" />
          Our People • Our Stories
        </span>

        <h1 className="mt-4 text-2xl sm:text-5xl font-extrabold text-[#0C1E22] dark:text-white tracking-tight">
          Join the <span className="text-[#FDCD2F]">Rations</span> Community
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-lg text-gray-700 dark:text-gray-300">
          Rations isn’t just about food, it’s about people. From shared meals to
          online conversations, our community is where stories are told and moments
          are shared.
        </p>

        <div className="mt-8 sm:mt-12 flex justify-center">
          <div className="grid max-w-2xl grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 md:grid-cols-6">
            {SITE.socials.filter(s => !!s.url).map((social) => {
              const Icon = social.icon
              return (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="group relative flex items-center justify-center rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 p-2 sm:p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FDCD2F]/60 text-[#0C1E22] dark:text-white"
                  onMouseEnter={(e) => (e.currentTarget.style.color = social.hoverColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                >
                  <Icon size={24} className="transition-transform group-hover:scale-110 sm:w-7 sm:h-7" />
                  <span className="sr-only">{social.name}</span>
                  <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-[#FDCD2F]/0 to-[#FDCD2F]/0 opacity-0 transition group-hover:opacity-100 group-hover:from-[#FDCD2F]/10" />
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </section>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400 text-center">Loading...</p>}
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">Community Posts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-4">
          {posts.map((post) => (
            <CommunityPostCard key={post._id} post={post} />
          ))}
        </div>
      </section>
    </div>
  )
}
