import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/api'
import MediaRenderer, { parseMediaUrl } from '../components/MediaRenderer'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import React from 'react'
import { Heart, Share } from 'lucide-react'

/* ------------------------------
   Linkify helper (same as card)
--------------------------------*/
const URL_REGEX =
  /((https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?))/g

const linkify = (text: string) => {
  if (!text) return text

  const parts: React.ReactNode[] = []
  let lastIndex = 0

  for (const match of text.matchAll(URL_REGEX)) {
    const index = match.index ?? 0
    const raw = match[0]

    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index))
    }

    const href =
      raw.startsWith('http://') || raw.startsWith('https://')
        ? raw
        : `https://${raw}`

    parts.push(
      <a
        key={`${index}-${raw}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-ration-green hover:underline break-words"
      >
        {raw}
      </a>
    )

    lastIndex = index + raw.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

export default function CommunityPostPage() {
  const { id } = useParams()
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [likes, setLikes] = useState(0)
  const [isLiked, setIsLiked] = useState(false)

  useEffect(() => {
    api.get(`/public/community/${id}`)
      .then(res => {
        setPost(res.data.data)
        setLikes(res.data.data.likes || 0)
        try {
          const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]')
          if (likedPosts.includes(res.data.data._id)) setIsLiked(true)
        } catch {}
      })
      .catch(() => setError('Failed to load post.'))
      .finally(() => setLoading(false))
  }, [id])

  const report = async () => {
    setActionMsg('')
    setActionLoading(true)
    try {
      await api.post(`/public/community/${id}/report`)
      setActionMsg('Thanks for your report. Our team will review this post.')
    } catch (err: any) {
      setActionMsg(err.response?.data?.message || 'Unable to report this post')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLike = async () => {
    try {
      if (isLiked) {
        setIsLiked(false)
        setLikes(l => Math.max(0, l - 1))
        await api.post(`/public/community/${post._id}/unlike`)
        const liked = JSON.parse(localStorage.getItem('likedPosts') || '[]')
        localStorage.setItem('likedPosts', JSON.stringify(liked.filter((pid: string) => pid !== post._id)))
      } else {
        setIsLiked(true)
        setLikes(l => l + 1)
        await api.post(`/public/community/${post._id}/like`)
        const liked = JSON.parse(localStorage.getItem('likedPosts') || '[]')
        localStorage.setItem('likedPosts', JSON.stringify([...liked, post._id]))
      }
    } catch (err) {
      // Revert optimism if failed
      setIsLiked(!isLiked)
      setLikes(l => isLiked ? l + 1 : Math.max(0, l - 1))
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: `Check out this post: ${post.title}`,
          url
        })
      } catch (err) {
        // user cancelled or failed
      }
    } else {
      navigator.clipboard.writeText(url)
      alert('Link copied to clipboard!')
    }
  }

  if (loading) return <Loading message="Loading post..." />
  if (error) return <ErrorState title="Failed to load post" message={error} />
  if (!post) return <EmptyState title="Post not found" text="The post you're looking for may have been removed." />

  const author = post.createdBy?.name || post.author || 'Rations Community'
  const postDate = new Date(post.publishedAt || post.createdAt)
  const dateString = postDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

  const contentUrls = ((post.content || '').match(URL_REGEX) || [])
    .map((u: string) => u.startsWith('http') ? u : `https://${u}`)
    .filter((u: string) => parseMediaUrl(u).type !== 'link' && parseMediaUrl(u).type !== 'none')

  const mediaList: { url: string; isPrimary: boolean }[] = []
  if (post.mediaUrl || post.imageUrl) {
    mediaList.push({ url: post.mediaUrl || post.imageUrl || '', isPrimary: true })
  }
  contentUrls.forEach((u: string) => {
    if (!mediaList.some(m => m.url === u)) mediaList.push({ url: u, isPrimary: false })
  })

  const featuredMedia = mediaList.length > 0 ? mediaList[0] : null
  const otherMedia = mediaList.slice(1)

  return (
    <article className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 pb-12">
      
      {/* Featured Media (Immersive Full Bleed Theater Mode) */}
      {featuredMedia && (
        <div className="w-full bg-black border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto">
            <MediaRenderer
              url={featuredMedia.url}
              title={featuredMedia.isPrimary ? (post.mediaTitle || post.title) : post.title}
              variant="detail"
              imageFallback={featuredMedia.isPrimary ? post.imageUrl : ''}
              hideFallbackLink={!featuredMedia.isPrimary}
            />
          </div>
        </div>
      )}

      {/* Post Content Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        
        {/* Tags */}
        <div className="flex items-center gap-2 mb-6">
          {post.tag && (
            <span className="px-3 py-1 bg-ration-green text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
              {post.tag}
            </span>
          )}
          {post.source?.provider === 'instagram' && (
            <span className="text-pink-600 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-pink-100 dark:bg-pink-500/20 px-3 py-1 rounded-full">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/>
              </svg>
              Instagram
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0C1E22] dark:text-white mb-8 leading-tight tracking-tight">
          {post.title}
        </h1>

        {/* Author & Actions Bar (YouTube Style) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-200 dark:border-slate-800">
          
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-ration-yellow flex items-center justify-center text-ration-dark font-extrabold text-lg shadow-sm">
                {author.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-[#0C1E22] dark:text-white leading-tight">{author}</span>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                <span>{dateString}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleLike}
              className={`flex items-center gap-2.5 transition-colors px-5 py-2.5 rounded-full font-bold text-[15px] shadow-sm ${isLiked ? 'bg-pink-600 text-white hover:bg-pink-700' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current text-white' : 'text-slate-500 dark:text-slate-400'}`} />
              <span>{likes > 0 ? likes : 'Like'}</span>
            </button>

            <button 
              onClick={handleShare}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-full font-bold text-[15px] shadow-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Share className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none text-[18px] sm:text-[19px] leading-[1.8] text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words mb-12">
          {linkify(post.content || '')}
        </div>

        {/* Other Media Grid (if any) */}
        {otherMedia.length > 0 && (
          <div className="mb-12 space-y-6">
            <h3 className="text-xl font-bold text-[#0C1E22] dark:text-white mb-4">More Media</h3>
            {otherMedia.map((media, idx) => (
              <div key={idx} className="rounded-2xl overflow-hidden shadow-sm bg-black">
                <MediaRenderer
                  url={media.url}
                  title={post.title}
                  variant="detail"
                  hideFallbackLink={true}
                />
              </div>
            ))}
          </div>
        )}

        {/* External Link Callout */}
        {post.externalLinkUrl && (
          <div className="mb-12 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-[#0C1E22] dark:text-white mb-2">Related Resource</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Check out the link attached to this post for more information.</p>
            </div>
            <a 
              href={post.externalLinkUrl.startsWith('http') ? post.externalLinkUrl : `https://${post.externalLinkUrl}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#0C1E22] dark:bg-ration-yellow text-white dark:text-[#0C1E22] hover:bg-slate-800 dark:hover:bg-[#e6a100] rounded-full transition-colors text-[16px] font-bold w-full sm:w-auto shadow-md shrink-0"
            >
              <span className="truncate max-w-[200px]">{post.externalLinkTitle || 'Visit Link'}</span>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}

      </div>
    </article>
  )
}
