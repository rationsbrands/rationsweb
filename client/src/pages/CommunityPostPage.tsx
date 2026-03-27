import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/api'
import MediaRenderer from '../components/MediaRenderer'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import React from 'react'

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
        className="underline break-words"
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

  useEffect(() => {
    api.get(`/public/community/${id}`)
      .then(res => setPost(res.data.data))
      .catch(() => setError('Failed to load post.'))
      .finally(() => setLoading(false))
  }, [id])

  // Edit functionality removed (client is public only)

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

  if (loading) return <Loading message="Loading post..." />
  if (error) return <ErrorState title="Failed to load post" message={error} />
  if (!post) return <EmptyState title="Post not found" text="The post you're looking for may have been removed." />

  return (
    <article className="space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="text-sm font-semibold text-[#0C1E22]">
            {post.createdBy?.name || 'Rations Community'}
          </div>
          <div className="text-xs text-slate-500">
            {new Date(post.publishedAt || post.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-wide text-slate-500">{post.tag}</div>
      </div>

      <h1 className="text-xl sm:text-3xl font-bold text-[#0C1E22]">{post.title}</h1>

      <MediaRenderer
        url={post.mediaUrl}
        title={post.mediaTitle || post.title}
        variant="detail"
        imageFallback={post.imageUrl}
      />

      {post.mediaUrl && post.mediaTitle && (
        <div className="text-xs text-slate-500 mt-1">{post.mediaTitle}</div>
      )}

      {/* ✅ LINKIFIED CONTENT */}
      <div className="text-sm sm:text-base leading-relaxed text-slate-800 whitespace-pre-line">
        {linkify(post.content || '')}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <button className="text-sm font-medium px-4 py-2 min-h-[44px] rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors" onClick={report} disabled={actionLoading}>
          {actionLoading ? 'Reporting...' : 'Report'}
        </button>

        {actionMsg && <span className="text-xs text-slate-600 ml-2">{actionMsg}</span>}
      </div>
    </article>
  )
}
