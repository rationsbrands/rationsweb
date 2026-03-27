import { useEffect, useState } from 'react'
import api from '../../api/api'
import PageHeader from '@shared/ui/PageHeader'
import Button from '@shared/ui/Button'
import { Check, X, ExternalLink, Instagram, Edit2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function CommunityImports() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/social/imports?status=pending')
      setPosts(res.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handlePublish = async (id: string) => {
    if (!confirm('Publish this post to the community feed?')) return
    setActioning(id)
    try {
      await api.patch(`/social/posts/${id}`, { status: 'published' })
      setNotice('Post published successfully')
      setPosts(prev => prev.filter((p: any) => p._id !== id))
    } catch (e) {
      alert('Failed to publish')
    } finally {
      setActioning(null)
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject/delete this import?')) return
    setActioning(id)
    try {
      await api.delete(`/social/posts/${id}`)
      setNotice('Post rejected')
      setPosts(prev => prev.filter((p: any) => p._id !== id))
    } catch (e) {
      alert('Failed to reject')
    } finally {
      setActioning(null)
    }
  }

  const handleEdit = (post: any) => {
    navigate('/admin/community', { state: { editPost: post } })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <PageHeader 
        title="Moderation Queue" 
        subtitle="Review and publish imported social posts" 
        actions={[
            {
                label: "Manage Integrations",
                onClick: () => navigate('/integrations'),
                primary: false
            }
        ]}
      />

      {notice && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">{notice}</div>}

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading pending posts...</div>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Check size={32} />
          </div>
          <h3 className="text-lg font-medium text-slate-800">All caught up!</h3>
          <p className="text-slate-500 mt-1">No pending imports in the queue.</p>
          <div className="mt-6">
            <Button variant="outline" onClick={() => navigate('/integrations/social')}>
              Sync more posts
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {posts.map((post: any) => (
            <div key={post._id} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 items-start hover:shadow-sm transition-shadow">
              {/* Thumbnail */}
              <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                {post.imageUrl ? (
                    <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">No Img</div>
                )}
                <div className="absolute bottom-1 right-1 bg-black/60 text-white p-1 rounded-full">
                    <Instagram size={12} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <h3 className="font-medium text-slate-900 truncate pr-4">{post.title || 'Untitled Post'}</h3>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{post.content}</p>
                
                <div className="mt-3 flex items-center gap-3 text-xs">
                    {post.source?.permalink && (
                        <a href={post.source.permalink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                            <ExternalLink size={12} /> View on Instagram
                        </a>
                    )}
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Pending</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 border-l border-slate-100 pl-4 ml-2">
                <Button 
                    size="sm" 
                    variant="primary" 
                    onClick={() => handlePublish(post._id)}
                    disabled={actioning === post._id}
                    className="w-full justify-center bg-green-600 hover:bg-green-700 text-white"
                >
                    <Check size={14} className="mr-1" /> Publish
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleEdit(post)} disabled={actioning === post._id} className="w-full justify-center">
                    <Edit2 size={14} className="mr-1" /> Edit
                </Button>
                <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleReject(post._id)}
                    disabled={actioning === post._id}
                    className="w-full justify-center text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                    <X size={14} className="mr-1" /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
