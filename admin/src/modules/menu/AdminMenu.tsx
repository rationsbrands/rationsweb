import { useEffect, useState } from 'react'
import api from '../../api/api'
import PageHeader from '@shared/ui/PageHeader'
import AppButton from '@shared/ui/AppButton'
import TextInput from '@shared/ui/TextInput'
import { X, Image as ImageIcon, Trash2, Archive, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react'

// Types
interface MenuItem {
  _id: string
  name: string
  description?: string
  price: number
  category?: string
  imageUrl?: string
  isAvailable: boolean
  popularity?: number
  archived?: boolean
  promoActive?: boolean
  promoType?: 'percentage' | 'fixed_price' | null
  promoValue?: number | null
  promoStart?: string | null
  promoEnd?: string | null
  promoLabel?: string | null
}

interface MenuForm {
  name: string
  description: string
  price: string | number
  category: string
  imageUrl: string
  isAvailable: boolean
  popularity: string | number
  promoActive?: boolean
  promoType?: 'percentage' | 'fixed_price' | null
  promoValue?: number | null
  promoStart?: string | null
  promoEnd?: string | null
  promoLabel?: string | null
}

const INITIAL_FORM: MenuForm = {
  name: '',
  description: '',
  price: '',
  category: '',
  imageUrl: '',
  isAvailable: true,
  popularity: 0,
}

export default function AdminMenu() {
  // State
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  
  // Filter State
  const [filter, setFilter] = useState({ category: 'all', availability: 'all' })
  
  // Edit/Create State
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [formData, setFormData] = useState<MenuForm>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  
  // Bulk Promo State
  const [isBulkPromoOpen, setIsBulkPromoOpen] = useState(false)
  const [bulkPromoData, setBulkPromoData] = useState({
    scope: 'all' as 'all' | 'category',
    category: '',
    promoType: 'percentage' as 'percentage' | 'fixed_price',
    promoValue: '',
    promoStart: '',
    promoEnd: '',
    promoLabel: ''
  })
  const [bulkSaving, setBulkSaving] = useState(false)

  // Load Menu
  const load = () => {
    setLoading(true)
    setError('')
    api.get('/admin/menu')
      .then(res => setItems(res.data.data || []))
      .catch(err => {
        console.error(err)
        setError('Failed to load menu. ' + (err.response?.data?.message || err.message))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  // Actions
  const openCreate = () => {
    setSelectedItemId(null)
    setFormData(INITIAL_FORM)
    setIsDrawerOpen(true)
  }

  const openEdit = (item: MenuItem) => {
    setSelectedItemId(item._id)
    setFormData({
      name: item.name || '',
      description: item.description || '',
      price: item.price || 0,
      category: item.category || '',
      imageUrl: item.imageUrl || '',
      isAvailable: !!item.isAvailable,
      popularity: item.popularity || 0,
      promoActive: item.promoActive || false,
      promoType: item.promoType || 'percentage',
      promoValue: item.promoValue || 0,
      promoStart: item.promoStart ? new Date(item.promoStart).toISOString().slice(0, 16) : '',
      promoEnd: item.promoEnd ? new Date(item.promoEnd).toISOString().slice(0, 16) : '',
      promoLabel: item.promoLabel || '',
    })
    setIsDrawerOpen(true)
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedItemId(null)
    setFormData(INITIAL_FORM)
    setNotice(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return

    setNotice(null)
    setSaving(true)

    try {
      const priceVal = Number(formData.price)
      const popVal = Number(formData.popularity)

      if (!formData.name.trim() || !formData.category.trim()) {
        throw new Error('Name and Category are required.')
      }

      if (isNaN(priceVal) || priceVal < 0) {
        throw new Error('Please enter a valid price.')
      }

      const payload = {
        ...formData,
        name: formData.name.trim(),
        price: priceVal,
        category: formData.category.trim(),
        imageUrl: formData.imageUrl.trim(),
        description: formData.description.trim(),
        popularity: isNaN(popVal) ? 0 : popVal,
      }

      if (formData.promoActive) {
        Object.assign(payload, {
          promoActive: true,
          promoType: formData.promoType,
          promoValue: Number(formData.promoValue),
          promoStart: formData.promoStart ? new Date(formData.promoStart) : null,
          promoEnd: formData.promoEnd ? new Date(formData.promoEnd) : null,
          promoLabel: formData.promoLabel || null,
        })
      } else {
        Object.assign(payload, {
          promoActive: false,
          promoType: null,
          promoValue: null,
          promoStart: null,
          promoEnd: null,
          promoLabel: null,
        })
      }

      let savedItem: MenuItem

      if (selectedItemId) {
        const res = await api.patch(`/admin/menu/${selectedItemId}`, payload)
        savedItem = res.data.data
        setNotice({ type: 'success', message: 'Item updated successfully' })
        
        // Optimistic update
        setItems(prev => prev.map(i => i._id === savedItem._id ? savedItem : i))
      } else {
        const res = await api.post('/admin/menu', payload)
        savedItem = res.data.data
        setNotice({ type: 'success', message: 'Item created successfully' })

        // Optimistic update
        setItems(prev => [savedItem, ...prev])
      }
      
      closeDrawer()
    } catch (err: any) {
      setNotice({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  const handleClearPromo = async () => {
    if (!selectedItemId || !confirm('Are you sure you want to clear promo pricing for this item?')) return
    setSaving(true)
    try {
      const res = await api.delete(`/admin/menu/${selectedItemId}/promo`)
      setNotice({ type: 'success', message: 'Promo cleared successfully' })
      setItems(prev => prev.map(i => i._id === res.data.data._id ? res.data.data : i))
      closeDrawer()
    } catch (err: any) {
      setNotice({ type: 'error', message: err.response?.data?.message || 'Failed to clear promo' })
    } finally {
      setSaving(false)
    }
  }

  const handleBulkPromoActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (bulkSaving) return
    setBulkSaving(true)
    try {
      const payload = {
        ...bulkPromoData,
        promoValue: Number(bulkPromoData.promoValue),
        promoStart: bulkPromoData.promoStart ? new Date(bulkPromoData.promoStart) : null,
        promoEnd: bulkPromoData.promoEnd ? new Date(bulkPromoData.promoEnd) : null,
      }
      await api.post('/admin/menu/promo/bulk', payload)
      setIsBulkPromoOpen(false)
      load() // Reload all items to reflect changes
    } catch (err: any) {
      alert(err.response?.data?.message || 'Bulk activation failed')
    } finally {
      setBulkSaving(false)
    }
  }

  const handleBulkPromoDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate promos for these items?')) return
    setBulkSaving(true)
    try {
      await api.delete('/admin/menu/promo/bulk', { data: { scope: bulkPromoData.scope, category: bulkPromoData.category } })
      setIsBulkPromoOpen(false)
      load() // Reload all items
    } catch (err: any) {
      alert(err.response?.data?.message || 'Bulk deactivation failed')
    } finally {
      setBulkSaving(false)
    }
  }

  const toggleAvailability = async (item: MenuItem) => {
    try {
      // Optimistic update
      setItems(prev => prev.map(i => i._id === item._id ? { ...i, isAvailable: !i.isAvailable } : i))
      await api.patch(`/admin/menu/${item._id}`, { isAvailable: !item.isAvailable })
    } catch (err) {
      // Revert on fail
      load()
      alert('Failed to update availability')
    }
  }

  const archiveItem = async (item: MenuItem) => {
    if (!confirm(`Remove ${item.name} from website? It can be restored later.`)) return
    try {
      await api.delete(`/menu/${item._id}`)
      load()
    } catch (err) {
      alert('Failed to archive item')
    }
  }

  const unarchiveItem = async (item: MenuItem) => {
    if (!confirm(`Restore ${item.name} to the menu?`)) return
    try {
      await api.patch(`/menu/${item._id}`, { archived: false })
      load()
    } catch (err) {
      alert('Failed to restore item')
    }
  }

  const deleteItemHard = async (item: MenuItem) => {
    if (!confirm(`Delete ${item.name} permanently? This CANNOT be undone.`)) return
    try {
      await api.delete(`/admin/menu/${item._id}/hard`)
      load()
    } catch (err) {
      alert('Failed to delete item')
    }
  }

  // Filtering
  const filteredItems = items.filter(i => {
    const catOk = filter.category === 'all' || String(i.category || '').toLowerCase() === filter.category.toLowerCase()
    const availOk = filter.availability === 'all' || (filter.availability === 'available' ? (i.isAvailable && !i.archived) : (!i.isAvailable || i.archived))
    return catOk && availOk
  })

  const categories = [...new Set(items.map(i => String(i.category || '').trim()))].filter(Boolean).sort()

  return (
    <>
      <PageHeader 
        title="Manage Menu" 
        actions={[
          { label: 'Bulk Promo', onClick: () => setIsBulkPromoOpen(true) },
          { label: 'Add New Item', onClick: openCreate }
        ]} 
      />

      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={load} className="underline font-medium">Retry</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-4 flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200 hidden sm:inline">Filters:</span>
        <select 
          value={filter.category} 
          onChange={(e) => setFilter(f => ({ ...f, category: e.target.value }))}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 min-h-[44px] sm:min-h-0 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none w-full sm:w-auto"
        >
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
        </select>

        <select 
          value={filter.availability} 
          onChange={(e) => setFilter(f => ({ ...f, availability: e.target.value }))}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 min-h-[44px] sm:min-h-0 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none w-full sm:w-auto"
        >
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        
        <div className="sm:ml-auto text-slate-500 dark:text-slate-400 text-xs text-center sm:text-right">
          Showing {filteredItems.length} items
        </div>
      </div>

      {/* Menu List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {loading && <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading menu items...</div>}
        
        {!loading && filteredItems.length === 0 && (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            No menu items found matching your filters.
          </div>
        )}

        {!loading && filteredItems.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {filteredItems.map(item => (
              <li key={item._id} className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedItemId === item._id ? 'bg-primary-50 hover:bg-primary-50' : ''}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  {/* Item Info */}
                  <div className="flex gap-3 flex-1 w-full">
                    <div className="w-16 h-16 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{item.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{item.category} • ₦{item.price.toLocaleString()}</div>
                      <div className="text-xs text-slate-400 line-clamp-1">{item.description}</div>
                      <div className="flex gap-2 items-center flex-wrap mt-1">
                        <div className={`text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${item.isAvailable ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {item.isAvailable ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </div>
                        {item.promoActive && (
                          <div className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 font-medium">
                            ★ PROMO {item.promoLabel ? `- ${item.promoLabel}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-2 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <AppButton variant="secondary" className="px-3 py-1 text-xs min-h-[44px] sm:min-h-[32px] sm:h-auto" onClick={() => openEdit(item)}>
                      Edit
                    </AppButton>
                    <div className="flex items-center gap-2 sm:gap-1">
                      <button 
                        onClick={() => toggleAvailability(item)}
                        title={item.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                        className={`p-1.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full border transition-colors ${item.isAvailable ? 'text-green-600 border-green-200 hover:bg-green-50' : 'text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        <CheckCircle size={18} className="sm:w-[14px] sm:h-[14px]" />
                      </button>
                      {item.archived ? (
                        <button 
                          onClick={() => unarchiveItem(item)}
                          title="Restore (Unarchive)"
                          className="p-1.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-colors"
                        >
                          <RotateCcw size={18} className="sm:w-[14px] sm:h-[14px]" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => archiveItem(item)}
                          title="Archive (Remove from website)"
                          className="p-1.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50 transition-colors"
                        >
                          <Archive size={18} className="sm:w-[14px] sm:h-[14px]" />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteItemHard(item)}
                        title="Delete Permanently"
                        className="p-1.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={18} className="sm:w-[14px] sm:h-[14px]" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Contextual Edit Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={closeDrawer} />
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-lg">{selectedItemId ? 'Edit Item' : 'New Menu Item'}</h3>
              <button onClick={closeDrawer} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {notice && (
                <div className={`p-3 mb-4 rounded-lg text-sm ${notice.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {notice.message}
                </div>
              )}

              <form id="menu-form" onSubmit={handleSave} className="space-y-4">
                <TextInput 
                  label="Name" 
                  name="name" 
                  value={formData.name} 
                  onChange={(e: any) => setFormData(p => ({ ...p, name: e.target.value }))} 
                  required 
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <TextInput 
                    label="Category" 
                    name="category" 
                    value={formData.category} 
                    onChange={(e: any) => setFormData(p => ({ ...p, category: e.target.value }))} 
                    required 
                  />
                  <TextInput 
                    label="Price (₦)" 
                    name="price" 
                    type="number" 
                    value={formData.price} 
                    onChange={(e: any) => setFormData(p => ({ ...p, price: e.target.value }))} 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1 text-slate-700 dark:text-slate-200 font-medium">Image URL</label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      name="imageUrl"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData(p => ({ ...p, imageUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="mt-2 h-32 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 border-dashed flex items-center justify-center overflow-hidden relative group">
                    {formData.imageUrl ? (
                      <>
                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e: any) => e.target.style.display = 'none'} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </>
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center gap-1">
                        <ImageIcon size={24} />
                        <span className="text-xs">No image preview</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Paste a direct image link (e.g. from Cloudinary, Imgur, or your website).
                  </p>
                </div>

                <div>
                  <label className="block text-sm mb-1 text-slate-700 dark:text-slate-200 font-medium">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2 border p-3 rounded-lg border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    id="isAvailable"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData(p => ({ ...p, isAvailable: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="isAvailable" className="text-sm font-medium text-slate-700 dark:text-slate-200">Available for ordering</label>
                </div>
                
                <TextInput 
                  label="Popularity Score (Optional)" 
                  name="popularity" 
                  type="number" 
                  value={formData.popularity} 
                  onChange={(e: any) => setFormData(p => ({ ...p, popularity: e.target.value }))} 
                />

                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-950 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="promoActive"
                      checked={formData.promoActive || false}
                      onChange={(e) => setFormData(p => ({ ...p, promoActive: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="promoActive" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Enable Promo Pricing</label>
                  </div>
                  
                  {formData.promoActive && (
                    <div className="space-y-3 pl-6 border-l-2 border-primary-200 ml-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">Discount Type</label>
                          <select
                            value={formData.promoType || 'percentage'}
                            onChange={(e) => setFormData(p => ({ ...p, promoType: e.target.value as any }))}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed_price">Fixed Price (₦)</option>
                          </select>
                        </div>
                        <TextInput 
                          label="Value" 
                          name="promoValue" 
                          type="number" 
                          value={formData.promoValue || ''} 
                          onChange={(e: any) => setFormData(p => ({ ...p, promoValue: e.target.value }))} 
                          required 
                        />
                      </div>
                      
                      <TextInput 
                        label="Promo Label (e.g. 'Weekend Deal')" 
                        name="promoLabel" 
                        value={formData.promoLabel || ''} 
                        onChange={(e: any) => setFormData(p => ({ ...p, promoLabel: e.target.value }))} 
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">Start Date/Time (Optional)</label>
                          <input
                            type="datetime-local"
                            value={formData.promoStart || ''}
                            onChange={(e) => setFormData(p => ({ ...p, promoStart: e.target.value }))}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">End Date/Time (Optional)</label>
                          <input
                            type="datetime-local"
                            value={formData.promoEnd || ''}
                            onChange={(e) => setFormData(p => ({ ...p, promoEnd: e.target.value }))}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>

                      {selectedItemId && (
                        <div className="pt-2">
                          <button type="button" onClick={handleClearPromo} className="text-sm text-red-600 font-medium hover:underline">
                            Clear Promo
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex gap-3">
              <AppButton 
                variant="primary" 
                className="flex-1 justify-center" 
                onClick={handleSave}
                isLoading={saving}
              >

                {selectedItemId ? 'Save Changes' : 'Create Item'}
              </AppButton>
              <AppButton 
                variant="secondary" 
                onClick={closeDrawer}
                disabled={saving}
              >
                Cancel
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Promo Modal */}
      {isBulkPromoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsBulkPromoOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-5 animate-fade-in">
            <h3 className="font-semibold text-lg mb-4 text-slate-800 dark:text-slate-100">Bulk Promo Pricing</h3>
            
            <form onSubmit={handleBulkPromoActivate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Scope</label>
                <select
                  value={bulkPromoData.scope}
                  onChange={(e) => setBulkPromoData(p => ({ ...p, scope: e.target.value as any }))}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All items</option>
                  <option value="category">By category</option>
                </select>
              </div>

              {bulkPromoData.scope === 'category' && (
                <TextInput
                  label="Category Name (case-insensitive)"
                  name="bulkCategory"
                  value={bulkPromoData.category}
                  onChange={(e: any) => setBulkPromoData(p => ({ ...p, category: e.target.value }))}
                  required
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Discount Type</label>
                  <select
                    value={bulkPromoData.promoType}
                    onChange={(e) => setBulkPromoData(p => ({ ...p, promoType: e.target.value as any }))}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_price">Fixed Price (₦)</option>
                  </select>
                </div>
                <TextInput
                  label="Value"
                  name="bulkValue"
                  type="number"
                  value={bulkPromoData.promoValue}
                  onChange={(e: any) => setBulkPromoData(p => ({ ...p, promoValue: e.target.value }))}
                  required
                />
              </div>

              <TextInput
                label="Promo Label (Optional)"
                name="bulkLabel"
                value={bulkPromoData.promoLabel}
                onChange={(e: any) => setBulkPromoData(p => ({ ...p, promoLabel: e.target.value }))}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">Start (Optional)</label>
                  <input
                    type="datetime-local"
                    value={bulkPromoData.promoStart}
                    onChange={(e) => setBulkPromoData(p => ({ ...p, promoStart: e.target.value }))}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">End (Optional)</label>
                  <input
                    type="datetime-local"
                    value={bulkPromoData.promoEnd}
                    onChange={(e) => setBulkPromoData(p => ({ ...p, promoEnd: e.target.value }))}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <AppButton variant="primary" type="submit" isLoading={bulkSaving} className="w-full justify-center">
                  Activate Bulk Promo
                </AppButton>
                <AppButton variant="secondary" type="button" onClick={handleBulkPromoDeactivate} disabled={bulkSaving} className="w-full justify-center bg-red-50 text-red-700 hover:bg-red-100 border-none">
                  Deactivate Bulk Promo
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
