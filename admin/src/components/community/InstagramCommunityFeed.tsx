import { useEffect, useState } from 'react'
import api from '../../api/api'

type IgItem = {
  id: string
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | string
  mediaUrl: string
  thumbnailUrl?: string
  permalink: string
  caption?: string
  timestamp?: string
}

export default function InstagramCommunityFeed() {
  const [items, setItems] = useState<IgItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState<{ hashtag: string; lastFetchedAt?: string } | null>(null)

  useEffect(() => {
    setLoading(true)
    api.get('/admin/community/instagram')
      .then(res => {
        const data = res.data?.data || {}
        setItems(Array.isArray(data.items) ? data.items : [])
        setMeta({ hashtag: String(data.hashtag || '#RationsCommunity'), lastFetchedAt: data.lastFetchedAt })
      })
      .catch(() => setError('Failed to load Instagram posts'))
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (iso?: string) => {
    try {
      return iso ? new Date(iso).toLocaleString() : ''
    } catch {
      return ''
    }
  }
  const truncate = (s?: string, max = 120) => {
    const str = String(s || '')
    return str.length > max ? `${str.slice(0, max)}…` : str
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Instagram community posts</h3>
        {meta?.lastFetchedAt && <div className="text-xs text-slate-500 dark:text-slate-400">Updated {formatDate(meta.lastFetchedAt)}</div>}
      </div>
      {loading && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Loading Instagram posts…</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">No community posts found for {meta?.hashtag || '#RationsCommunity'}</p>
      )}
      {!loading && items.length > 0 && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((it) => (
            <a key={it.id} href={it.permalink} target="_blank" rel="noreferrer" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 flex gap-3">
              <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {it.mediaType === 'VIDEO' ? (
                  it.thumbnailUrl ? (
                    <img src={it.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center">
                      <div className="w-10 h-10 rounded-full bg-black/20 grid place-items-center">
                        <div className="w-0 h-0 border-l-8 border-y-4 border-y-transparent border-l-white translate-x-0.5" />
                      </div>
                    </div>
                  )
                ) : (
                  <img src={it.mediaUrl} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="text-sm">
                <div className="text-xs text-slate-500 dark:text-slate-400">{formatDate(it.timestamp)}</div>
                <div className="line-clamp-3">{truncate(it.caption, 160)}</div>
              </div>
            </a>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}

