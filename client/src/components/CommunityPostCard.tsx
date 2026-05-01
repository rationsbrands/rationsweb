import { Link } from 'react-router-dom'
import MediaRenderer from './MediaRenderer'
import React from 'react'

const formatRelativeTime = (d: string | Date) => {
  try {
    const now = Date.now()
    const ts = new Date(d).getTime()
    const diff = Math.max(0, Math.floor((now - ts) / 1000))
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`
    const days = Math.floor(diff / 86400)
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months} mo ago`
    const years = Math.floor(months / 12)
    return `${years} yr${years > 1 ? 's' : ''} ago`
  } catch {
    return ''
  }
}

/* ------------------------------
   Linkify helper (NO UI change)
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
        className="underline break-words"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
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

interface CommunityPostCardProps {
  post: any // TODO: Define strict interface
}

export default function CommunityPostCard({ post }: CommunityPostCardProps) {
  const author = post.createdBy?.name || post.author || 'Rations Community'
  const when = formatRelativeTime(post.publishedAt || post.createdAt)
  const bodyText = post.content || post.excerpt || ''

  return (
    <Link
      to={`/community/${post._id}`}
      aria-label={`Open post: ${post.title}`}
      className="group block"
    >
      <article className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl sm:rounded-xl shadow-sm sm:shadow-sm hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FDCD2F]/60 h-full flex flex-col">
        <div className="p-4 sm:p-4 flex-1">
          <div className="flex items-center gap-3 mb-3 sm:mb-3">
            <div className="h-10 w-10 sm:h-auto sm:w-auto rounded-full bg-ration-yellow/20 flex items-center justify-center text-ration-dark font-bold text-sm sm:hidden">
              {author.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-base sm:text-sm font-semibold text-[#0C1E22] leading-tight">{author}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{when}</div>
            </div>
            {post.tag && (
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                {post.tag}
              </div>
            )}
            {post.source?.provider === 'instagram' && (
              <span className="text-pink-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/>
                </svg>
              </span>
            )}
          </div>

          <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed max-w-[70ch]">
            <h3 className="text-base sm:text-lg font-bold text-[#0C1E22] mb-1">
              {post.title}
            </h3>

            <p className="text-slate-600 dark:text-slate-300 line-clamp-3 break-words leading-relaxed">
              {linkify(bodyText)}
            </p>
          </div>
        </div>

        <MediaRenderer
          url={post.mediaUrl}
          title={post.mediaTitle || post.title}
          variant="list"
          imageFallback={post.imageUrl}
        />

        {post.mediaUrl && post.mediaTitle && (
          <div className="px-4 sm:px-4 py-3 sm:py-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-50">
            {post.mediaTitle}
          </div>
        )}
      </article>
    </Link>
  )
}
