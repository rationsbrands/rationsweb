import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../../api/api'
import FormInput from '@shared/ui/FormInput'
import Button from '@shared/ui/Button'
import InstagramCommunityFeed from '../../components/community/InstagramCommunityFeed'

export default function AdminCommunity() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tagOptions, setTagOptions] = useState(['Update', 'Announcement', 'Event', 'Promo'])
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState<any>({
    title: '',
    content: '',
    tag: '',
    imageUrl: '',
    mediaUrl: '',
    mediaTitle: '',
    externalLinkUrl: '',
    externalLinkTitle: '',
    alertEnabled: false,
    alertStart: '',
    alertEnd: '',
    isInstagram: false,
    __newTag: '',
  })
  const [errors, setErrors] = useState({ mediaUrl: '', externalLinkUrl: '' })
  const [editingId, setEditingId] = useState(null)
  const location = useLocation()

  const load = () => {
    setLoading(true)
    api.get('/admin/community')
      .then(res => {
        const list = res.data.data
        setPosts(list)
        const uniq = Array.from(new Set(list.map(p => p.tag).filter(Boolean)))
        setTagOptions((prev: string[]) => {
          const next = Array.from(new Set([...(prev || []), ...uniq])) as string[]
          try { localStorage.setItem('tagOptions', JSON.stringify(next)) } catch {}
          return next
        })
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('tagOptions')
      const parsed = JSON.parse(raw || '[]')
      if (Array.isArray(parsed) && parsed.length) setTagOptions(parsed)
    } catch {}
    load()
  }, [])

  const handleChange = (e: any) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(prev => ({ ...prev, [e.target.name]: val }))
  }

  const handleCreate = async (e: any) => {
    e.preventDefault()
    setErrors({ mediaUrl: '', externalLinkUrl: '' })
    if (form.mediaUrl) {
      try {
        const u = new URL(form.mediaUrl)
        if (!(u.protocol === 'http:' || u.protocol === 'https:')) throw new Error('bad')
      } catch {
        setErrors({ mediaUrl: 'Enter a valid http(s) URL', externalLinkUrl: '' })
        return
      }
    }
    if (form.externalLinkUrl) {
      try {
        const u = new URL(form.externalLinkUrl)
        if (!(u.protocol === 'http:' || u.protocol === 'https:')) throw new Error('bad')
      } catch {
        setErrors(prev => ({ ...prev, externalLinkUrl: 'Enter a valid http(s) URL' }))
        return
      }
    }
    const payload = { ...form }
    if (!payload.alertEnabled) {
      payload.alertStart = ''
      payload.alertEnd = ''
    }
    
    // Handle Instagram source manually for testing/admin creation
    if (payload.isInstagram) {
      payload.source = {
        provider: 'instagram',
        externalId: 'manual_' + Date.now(),
        permalink: payload.externalLinkUrl || '',
        mediaType: 'IMAGE'
      }
    } else {
      payload.source = null // Clear source if unchecked
    }
    delete payload.isInstagram

    if (editingId) {
      await api.put(`/admin/community/${editingId}`, payload)
      setNotice('Post updated successfully')
    } else {
      await api.post('/admin/community', payload)
      setNotice('Post created successfully')
    }
    setForm({ title: '', content: '', tag: '', imageUrl: '', mediaUrl: '', mediaTitle: '', externalLinkUrl: '', externalLinkTitle: '', alertEnabled: false, alertStart: '', alertEnd: '', isInstagram: false, __newTag: '' })
    setEditingId(null)
    load()
  }

  const startEdit = (post: any) => {
    setEditingId(post._id)
    setForm({
      title: post.title || '',
      content: post.content || '',
      tag: post.tag || '',
      imageUrl: post.imageUrl || '',
      mediaUrl: post.mediaUrl || '',
      mediaTitle: post.mediaTitle || '',
      externalLinkUrl: post.externalLinkUrl || '',
      externalLinkTitle: post.externalLinkTitle || '',
      alertEnabled: Boolean(post.alertEnabled),
      alertStart: post.alertStart ? new Date(post.alertStart).toISOString() : '',
      alertEnd: post.alertEnd ? new Date(post.alertEnd).toISOString() : '',
      isInstagram: post.source?.provider === 'instagram',
    })
    setErrors({ mediaUrl: '', externalLinkUrl: '' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({ title: '', content: '', tag: '', imageUrl: '', mediaUrl: '', mediaTitle: '', externalLinkUrl: '', externalLinkTitle: '', alertEnabled: false, alertStart: '', alertEnd: '', isInstagram: false, __newTag: '' })
    setErrors({ mediaUrl: '', externalLinkUrl: '' })
  }

  const handleDelete = async (id: string) => {
    const ok = window.confirm('Are you sure you want to delete this post?')
    if (!ok) return
    await api.delete(`/admin/community/${id}`)
    setNotice('Post deleted')
    load()
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Manage community posts</h1>
      {notice && <p className="text-xs text-green-600 mt-1">{notice}</p>}
      <form onSubmit={handleCreate} className="bg-white border border-slate-100 rounded-xl p-4 space-y-3">
        <FormInput label="Title" name="title" value={form.title} onChange={handleChange} required />
        <label className="text-sm">
          <span className="block mb-1 text-slate-700">Tag</span>
          <select
            name="tag"
            value={form.tag}
            onChange={handleChange}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select a tag</option>
            {tagOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <FormInput label="Add new tag option" name="__newTag" value={form.__newTag || ''} onChange={(e)=>setForm(prev=>({ ...prev, __newTag: e.target.value }))} />
          <Button type="button" onClick={() => {
            const val = String(form.__newTag || '').trim()
            if (!val) return
            setTagOptions(prev => {
              const next = Array.from(new Set([...(prev || []), val]))
              try { localStorage.setItem('tagOptions', JSON.stringify(next)) } catch {}
              return next
            })
            setForm(prev => ({ ...prev, tag: val, __newTag: '' }))
          }}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tagOptions.map((t) => (
            <div key={t} className="flex items-center gap-2 px-2 py-1 text-xs rounded-full border">
              <span>{t}</span>
              <button type="button" className="text-red-600" onClick={() => {
                setTagOptions(prev => {
                  const next = prev.filter(x => x !== t)
                  try { localStorage.setItem('tagOptions', JSON.stringify(next)) } catch {}
                  return next
                })
                setForm(prev => ({ ...prev, tag: prev.tag === t ? '' : prev.tag }))
              }}>✕</button>
            </div>
          ))}
        </div>
        {['promo','event','announcement','anouncement'].includes(String(form.tag||'').toLowerCase()) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block mb-1 text-slate-700">Enable visitor alert</span>
              <input type="checkbox" checked={Boolean(form.alertEnabled)} onChange={(e)=>setForm(prev=>({ ...prev, alertEnabled: e.target.checked }))} />
            </label>
            <label className="text-sm">
              <span className="block mb-1 text-slate-700">Alert start</span>
              <input type="datetime-local" value={form.alertStart ? new Date(form.alertStart).toISOString().slice(0,16) : ''} onChange={(e)=>setForm(prev=>({ ...prev, alertStart: e.target.value ? new Date(e.target.value).toISOString() : '' }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="block mb-1 text-slate-700">Alert end</span>
              <input type="datetime-local" value={form.alertEnd ? new Date(form.alertEnd).toISOString().slice(0,16) : ''} onChange={(e)=>setForm(prev=>({ ...prev, alertEnd: e.target.value ? new Date(e.target.value).toISOString() : '' }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
        )}
        <FormInput label="Image URL" name="imageUrl" value={form.imageUrl} onChange={handleChange} />
        <label className="text-sm">
          <span className="block mb-1 text-slate-700">Media URL (optional)</span>
          <input
            name="mediaUrl"
            value={form.mediaUrl}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.mediaUrl?'border-red-500':'border-slate-200'}`}
            placeholder="https://..."
          />
          {errors.mediaUrl && <span className="text-xs text-red-600 mt-1">{errors.mediaUrl}</span>}
          <span className="block mt-1 text-xs text-slate-500">Paste a YouTube link, audio, video, or image URL to embed media with this post.</span>
        </label>
        <FormInput label="Media title/caption (optional)" name="mediaTitle" value={form.mediaTitle} onChange={handleChange} />
        <label className="text-sm">
          <span className="block mb-1 text-slate-700">External link (optional)</span>
          <input
            name="externalLinkUrl"
            value={form.externalLinkUrl}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.externalLinkUrl?'border-red-500':'border-slate-200'}`}
            placeholder="https://..."
          />
          {errors.externalLinkUrl && <span className="text-xs text-red-600 mt-1">{errors.externalLinkUrl}</span>}
          <span className="block mt-1 text-xs text-slate-500">Add a social or external link related to this post.</span>
        </label>
        <FormInput label="External link title/caption (optional)" name="externalLinkTitle" value={form.externalLinkTitle} onChange={handleChange} />
        
        <label className="flex items-center gap-2 text-sm p-2 bg-pink-50 rounded border border-pink-100">
          <input type="checkbox" name="isInstagram" checked={Boolean(form.isInstagram)} onChange={handleChange} />
          <span className="text-pink-700 font-medium">Is Instagram Post?</span>
        </label>

        <label className="text-sm">
          <span className="block mb-1 text-slate-700">Content</span>
          <textarea
            name="content"
            value={form.content}
            onChange={handleChange}
            rows={3}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </label>
        <div className="flex items-center gap-2">
          <Button type="submit" className="">{editingId ? 'Update' : 'Publish'}</Button>
          {editingId && (
            <Button type="button" onClick={cancelEdit} className="border">Cancel</Button>
          )}
        </div>
      </form>

      <div>
        <h2 className="font-semibold mb-2">Existing posts</h2>
        {loading && <p className="text-slate-500">Loading...</p>}
        <div className="space-y-2">
          {posts.map(post => (
            <div key={post._id} className="bg-white border border-slate-100 rounded-xl p-3 flex justify-between items-start">
              <div>
                <div className="text-xs text-primary-600 uppercase">{post.tag}</div>
                <div className="font-semibold">{post.title}</div>
                <div className="text-xs text-slate-500 line-clamp-2 mt-1">{post.content}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(post)}
                  className="text-xs underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(post._id)}
                  className="text-xs text-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <InstagramCommunityFeed />
    </>
  )
}
