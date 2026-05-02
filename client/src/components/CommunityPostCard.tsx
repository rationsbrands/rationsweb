import { Link } from 'react-router-dom'
import MediaRenderer, { parseMediaUrl } from './MediaRenderer'
import React, { useState, useEffect } from 'react'
import { Heart, Share } from 'lucide-react'
import api from '../api/api'

const formatRelativeTime = (d: string | Date) => {
  try {
    const now = Date.now()
    const ts = new Date(d).getTime()
    const diff = Math.max(0, Math.floor((now - ts) / 1000))
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} min`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    const days = Math.floor(diff / 86400)
    if (days < 30) return `${days}d`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo`
    const years = Math.floor(months / 12)
    return `${years}y`
  } catch {
    return ''
  }
}

/* ------------------------------
   Linkify helper (NO UI change)
--------------------------------*/
const COMBINED_REGEX = /\[([^\]]+)\]\(([^)]+)\)|((?:https?:\/\/[^\s]+)|(?:www\.[^\s]+)|(?:[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?))/g;

const linkify = (text: string) => {
  if (!text) return text

  const parts: React.ReactNode[] = []
  let lastIndex = 0

  for (const match of text.matchAll(COMBINED_REGEX)) {
    const index = match.index ?? 0
    const raw = match[0]

    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index))
    }

    if (match[1] && match[2]) {
      // Markdown link
      const linkText = match[1]
      const rawHref = match[2]
      const href = rawHref.startsWith('http://') || rawHref.startsWith('https://') || rawHref.startsWith('mailto:') 
        ? rawHref : `https://${rawHref}`

      parts.push(
        <a
          key={`${index}-${rawHref}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ration-green hover:underline break-words font-semibold"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {linkText}
        </a>
      )
    } else {
      // Plain URL
      const href = raw.startsWith('http://') || raw.startsWith('https://')
        ? raw : `https://${raw}`

      parts.push(
        <a
          key={`${index}-${raw}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ration-green hover:underline break-words"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {raw}
        </a>
      )
    }

    lastIndex = index + raw.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

interface CommunityPostCardProps {
  post: any // TODO: Define strict interface
}

export default function CommunityPostCard({ post }: CommunityPostCardProps) {
  const author = post.createdBy?.name || post.author || 'Rations Community'
  const when = formatRelativeTime(post.publishedAt || post.createdAt)
  const bodyText = post.content || post.excerpt || ''
  
  const [likes, setLikes] = useState(post.likes || 0)
  const [isLiked, setIsLiked] = useState(false)

  useEffect(() => {
    try {
      const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]')
      if (likedPosts.includes(post._id)) setIsLiked(true)
    } catch {}
  }, [post._id])

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault() // prevent navigating
    e.stopPropagation()
    try {
      if (isLiked) {
        setIsLiked(false)
        setLikes((l: number) => Math.max(0, l - 1))
        await api.post(`/public/community/${post._id}/unlike`)
        const liked = JSON.parse(localStorage.getItem('likedPosts') || '[]')
        localStorage.setItem('likedPosts', JSON.stringify(liked.filter((id: string) => id !== post._id)))
      } else {
        setIsLiked(true)
        setLikes((l: number) => l + 1)
        await api.post(`/public/community/${post._id}/like`)
        const liked = JSON.parse(localStorage.getItem('likedPosts') || '[]')
        localStorage.setItem('likedPosts', JSON.stringify([...liked, post._id]))
      }
    } catch (err) {
      // Revert optimism if failed
      setIsLiked(!isLiked)
      setLikes((l: number) => isLiked ? l + 1 : Math.max(0, l - 1))
    }
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}/community/${post._id}`
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

  const contentUrls: string[] = []
  for (const match of (bodyText.matchAll(COMBINED_REGEX) || [])) {
    let url = match[2] || match[0]
    if (url) {
      if (!url.startsWith('http') && !url.startsWith('mailto:')) url = `https://${url}`
      if (parseMediaUrl(url).type !== 'link' && parseMediaUrl(url).type !== 'none') {
        contentUrls.push(url)
      }
    }
  }

  const mediaList: { url: string; isPrimary: boolean }[] = []
  if (post.mediaUrl || post.imageUrl) {
    mediaList.push({ url: post.mediaUrl || post.imageUrl || '', isPrimary: true })
  }
  contentUrls.forEach((u: string) => {
    if (!mediaList.some(m => m.url === u)) mediaList.push({ url: u, isPrimary: false })
  })

  // Only take the first media for the list view header to keep it clean.
  const featuredMedia = mediaList.length > 0 ? mediaList[0] : null
  const otherMedia = mediaList.slice(1)

  return (
    <Link
      to={`/community/${post._id}`}
      aria-label={`Open post: ${post.title}`}
      className="group block bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      {/* Featured Media (Top) */}
      {featuredMedia && (
        <div className="w-full bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
          <MediaRenderer
            url={featuredMedia.url}
            title={featuredMedia.isPrimary ? (post.mediaTitle || post.title) : post.title}
            variant="list"
            imageFallback={featuredMedia.isPrimary ? post.imageUrl : ''}
            hideFallbackLink={!featuredMedia.isPrimary}
          />
        </div>
      )}

      {/* Card Body */}
      <div className="p-4 sm:p-6">
        
        {/* Tags & Badges */}
        <div className="flex items-center gap-2 mb-3">
          {post.tag && (
            <span className="px-2.5 py-1 bg-ration-green/10 text-ration-green dark:text-ration-green dark:bg-ration-green/20 rounded-lg text-[11px] font-bold uppercase tracking-wider">
              {post.tag}
            </span>
          )}
          {post.source?.provider === 'instagram' && (
            <span className="text-pink-600 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-pink-50 dark:bg-pink-500/10 px-2.5 py-1 rounded-lg">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/>
              </svg>
              Instagram
            </span>
          )}
        </div>

        {/* Title & Content */}
        <h2 className="text-lg sm:text-xl font-bold text-[#0C1E22] dark:text-white mb-2 leading-snug group-hover:text-ration-green transition-colors">
          {post.title}
        </h2>
        
        <p className="text-[15px] text-slate-600 dark:text-slate-300 line-clamp-3 mb-4 leading-relaxed whitespace-pre-line">
          {linkify(bodyText)}
        </p>

        {/* Other Media (if any) */}
        {otherMedia.length > 0 && (
          <div className="mb-4 space-y-3">
            {otherMedia.map((media, idx) => (
              <div key={idx} className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <MediaRenderer
                  url={media.url}
                  title={post.title}
                  variant="list"
                  hideFallbackLink={true}
                />
              </div>
            ))}
          </div>
        )}

        {/* External Link */}
        {post.externalLinkUrl && (
          <div className="mb-4">
            <a 
              href={post.externalLinkUrl.startsWith('http') ? post.externalLinkUrl : `https://${post.externalLinkUrl}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl transition-colors text-[13px] font-medium border border-slate-200 dark:border-slate-700 max-w-full group/link"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4 shrink-0 text-slate-400 group-hover/link:text-slate-600 dark:group-hover/link:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="truncate">{post.externalLinkTitle || post.externalLinkUrl.replace(/^https?:\/\//, '')}</span>
            </a>
          </div>
        )}

        {/* Call to Action Button */}
        {post.ctaEnabled && post.ctaLink && (
          <div className="mb-4">
            <a
              href={post.ctaLink.startsWith('http') ? post.ctaLink : `https://${post.ctaLink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-ration-green hover:bg-ration-green/90 text-white rounded-xl transition-colors text-[14px] font-bold shadow-sm"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {post.ctaText || 'Learn More'}
            </a>
          </div>
        )}

        {/* Footer: Author & Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
          {/* Author */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-ration-yellow/20 flex items-center justify-center text-ration-dark font-bold text-xs shrink-0">
              {author.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-[#0C1E22] dark:text-white leading-none">{author}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <button 
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-pink-600' : 'hover:text-pink-600'}`}
              aria-label={isLiked ? "Unlike" : "Like"}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-[13px] font-medium">{likes > 0 ? likes : ''}</span>
            </button>

            <button 
              onClick={handleShare}
              className="flex items-center gap-1.5 hover:text-blue-500 transition-colors"
              aria-label="Share post"
            >
              <Share className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
