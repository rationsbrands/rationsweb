import { useEffect, useState } from 'react'
import { useCart } from '../context/CartContext'
import api from '../api/api'
import { SITE, buildWhatsappOrderMessage } from '../config/site'
import { useNavigate, useLocation } from 'react-router-dom'
import SEO from '../components/SEO'

export default function CheckoutPage() {
  const { items, updateQuantity, removeFromCart, updateSauce, total, clearCart } = useCart()
  
  const navigate = useNavigate()
  const location = useLocation()

  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const [orderType, setOrderType] = useState('pickup')
  const [notes, setNotes] = useState('')

  const [pickupLocation, setPickupLocation] = useState('Main Kitchen')

  const [deliveryInfo, setDeliveryInfo] = useState({
    name: '',
    phone: '',
    addressLine: '',
    instructions: ''
  })
  const [editingInfo, setEditingInfo] = useState(false)
  const [savingDelivery, setSavingDelivery] = useState(false)
  const [deliverySaveMessage, setDeliverySaveMessage] = useState('')
  const [errors, setErrors] = useState({ name: '', phone: '', addressLine: '' })
  const [infoSaved, setInfoSaved] = useState(false)

  // Remove user effects
  useEffect(() => {
    // No user syncing
  }, [])

  const handleSaveDeliveryInfo = async () => {
    const name = deliveryInfo.name.trim()
    const phone = deliveryInfo.phone.trim()
    const addressLine = deliveryInfo.addressLine.trim()
    const phoneValid = /^\+234\d{10}$/.test(phone) || /^\d{11}$/.test(phone)
    const needsAddress = orderType === 'delivery'

    const newErrors = { name: '', phone: '', addressLine: '' }
    if (!name || name.length < 2) newErrors.name = 'Name is required'
    if (!phoneValid) newErrors.phone = 'Enter a valid phone number'
    if (needsAddress) {
      if (!addressLine) newErrors.addressLine = 'Address line is required'
    }

    if (newErrors.name || newErrors.phone || newErrors.addressLine) {
      setErrors(newErrors)
      setDeliverySaveMessage('Please fix the errors before continuing.')
      return
    }

    setSavingDelivery(true)
    setDeliverySaveMessage('')
    // Just save locally
    setInfoSaved(true)
    setEditingInfo(false)
    setDeliverySaveMessage('Delivery information updated')
    setSavingDelivery(false)
  }

  const handleWhatsappCheckout = () => {
    // Validate current input values
    const name = deliveryInfo.name.trim()
    const phone = deliveryInfo.phone.trim()
    const addressLine = deliveryInfo.addressLine?.trim() || ''
    const phoneValid = /^\+234\d{10}$/.test(phone) || /^\d{11}$/.test(phone)
    const needsAddress = orderType === 'delivery'

    const newErrors = { name: '', phone: '', addressLine: '' }
    if (!name || name.length < 2) newErrors.name = 'Name is required'
    if (!phoneValid) newErrors.phone = 'Enter a valid phone number'
    if (needsAddress && !addressLine) newErrors.addressLine = 'Address line is required'

    if (newErrors.name || newErrors.phone || newErrors.addressLine) {
      setErrors(newErrors)
      setMessage('Please fill in all required details.')
      setEditingInfo(true)
      return
    }

    // Save info locally (implicitly)
    setInfoSaved(true)
    setEditingInfo(false)

    const subtotal = total
    const grandTotal = subtotal
    let msg = buildWhatsappOrderMessage(items, { subtotal, total: grandTotal }, { orderType })
    const contactLines = [
      `Name: ${name}`,
      `Phone: ${phone}`,
    ]
    if (orderType === 'delivery') {
      contactLines.push(`Address: ${addressLine}`)
      if (deliveryInfo.instructions?.trim()) {
        contactLines.push(`Instructions: ${deliveryInfo.instructions.trim()}`)
      }
    }
    msg = `${msg}\n\n${contactLines.join('\n')}`
    const url = `${SITE.contacts.whatsapp}?text=${encodeURIComponent(msg)}`
    setMessage('Thank you! Your order details have been sent via WhatsApp.')
    window.open(url, '_blank')
    clearCart()
  }

  if (items.length === 0) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Your order is empty. Add items from the menu.</p>
  }


  const subtotal = total
  const grandTotal = subtotal
  const canPlace = orderType === 'pickup'
    ? (deliveryInfo.name.trim().length > 0 && deliveryInfo.phone.trim().length > 0 && pickupLocation.trim().length > 0)
    : (deliveryInfo.name.trim().length > 0 && deliveryInfo.phone.trim().length > 0 && deliveryInfo.addressLine.trim().length > 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SEO 
        title="Checkout" 
        description="Checkout your Rations order securely."
        canonicalUrl="/checkout"
      />
      <div className="space-y-4">
        <h1 className="text-lg sm:text-xl font-semibold">Checkout</h1>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 sm:p-4 space-y-3">
          { (errors.name || errors.phone || errors.addressLine) && (
            <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-xs p-2">Please fill in all required details.</div>
          ) }
          {deliverySaveMessage && (
            <div className="text-xs text-red-600">{deliverySaveMessage}</div>
          )}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm sm:text-base">
            <label className="flex items-center gap-3 p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg -ml-2">
              <input type="radio" className="w-4 h-4 sm:w-5 sm:h-5" name="orderType" value="pickup" checked={orderType==='pickup'} onChange={(e)=>{ setOrderType(e.target.value); setInfoSaved(false) }} /> 
              <span>Pickup</span>
            </label>
            <label className="flex items-center gap-3 p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg -ml-2">
              <input type="radio" className="w-4 h-4 sm:w-5 sm:h-5" name="orderType" value="delivery" checked={orderType==='delivery'} onChange={(e)=>{ setOrderType(e.target.value); setInfoSaved(false) }} /> 
              <span>Delivery</span>
            </label>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300">Order type: {orderType === 'pickup' ? 'Pickup' : 'Delivery'}</div>

          {(!infoSaved || editingInfo) ? (
            <form onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Name *</label>
                <input
                  value={deliveryInfo.name}
                  onChange={(e)=>{ setDeliveryInfo(prev=>({ ...prev, name: e.target.value })); setErrors(prev=>({ ...prev, name: '' })); setInfoSaved(false) }}
                  className={`w-full rounded-lg px-2 py-2 sm:px-3 sm:py-3 text-sm sm:text-base border ${errors.name ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-1">Phone *</label>
                  <input
                    value={deliveryInfo.phone}
                    onChange={(e)=>{ setDeliveryInfo(prev=>({ ...prev, phone: e.target.value })); setErrors(prev=>({ ...prev, phone: '' })); setInfoSaved(false) }}
                    className={`w-full rounded-lg px-2 py-2 sm:px-3 sm:py-3 text-sm sm:text-base border ${errors.phone ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                  />
                  {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                </div>
                {orderType === 'pickup' && null}
              </div>
            </form>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-xs sm:text-sm">
              <div className="font-semibold mb-1">Contact Details</div>
              <div className="text-slate-700 dark:text-slate-200">{deliveryInfo.name}</div>
              <div className="text-slate-700 dark:text-slate-200">{deliveryInfo.phone}</div>
              <button type="button" onClick={()=>setEditingInfo(true)} className="mt-3 text-xs sm:text-sm font-medium px-3 py-1.5 sm:px-4 sm:py-2 min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800">Edit info</button>
            </div>
          )}
          {orderType === 'pickup' && (!infoSaved || editingInfo) && (
            <div className="mt-4">
              <button type="button" onClick={handleSaveDeliveryInfo} className="text-xs sm:text-sm font-medium px-3 py-1.5 sm:px-4 sm:py-2 min-h-[44px] rounded-lg bg-slate-900 text-white hover:bg-slate-800">Save info</button>
            </div>
          )}

          {orderType === 'delivery' && (
            (!infoSaved || editingInfo) ? (
              <>
                <div className="mt-3">
                  <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-1">Address Line *</label>
                  <input
                    value={deliveryInfo.addressLine}
                    onChange={(e)=>{ setDeliveryInfo(prev=>({ ...prev, addressLine: e.target.value })); setErrors(prev=>({ ...prev, addressLine: '' })); setInfoSaved(false) }}
                    className={`w-full rounded-lg px-2 py-2 sm:px-3 sm:py-3 text-sm sm:text-base border ${errors.addressLine ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                  />
                  {errors.addressLine && <p className="text-xs text-red-600 mt-1">{errors.addressLine}</p>}
                </div>

                <div className="mt-3">
                  <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Delivery Instructions (optional)</label>
                  <textarea
                    value={deliveryInfo.instructions}
                    onChange={(e)=>setDeliveryInfo(prev=>({ ...prev, instructions: e.target.value }))}
                    className="w-full border rounded-lg px-2 py-2 sm:px-3 text-xs sm:text-sm"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" onClick={handleSaveDeliveryInfo} className="text-xs px-3 py-1 rounded-full border border-slate-300 dark:border-slate-600 min-h-[44px]">Save</button>
                  <button type="button" onClick={()=>setEditingInfo(false)} className="text-xs px-3 py-1 rounded-full border border-slate-300 dark:border-slate-600 min-h-[44px]">Cancel</button>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-xs sm:text-sm">
                <div className="font-semibold mb-1">Delivery Details</div>
                <div className="text-slate-700 dark:text-slate-200">{deliveryInfo.name}</div>
                <div className="text-slate-700 dark:text-slate-200">{deliveryInfo.phone}</div>
                <div className="text-slate-700 dark:text-slate-200">{deliveryInfo.addressLine}</div>
                <button type="button" onClick={()=>setEditingInfo(true)} className="mt-2 text-xs px-3 py-1 rounded-full border border-slate-300 dark:border-slate-600 min-h-[44px]">Edit delivery info</button>
              </div>
            )
          )}

          <div className="mt-3">
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e)=>setNotes(e.target.value)}
              className="w-full border rounded-lg px-2 py-2 sm:px-3 text-xs sm:text-sm"
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs sm:text-sm font-semibold">
            <span>Subtotal</span>
            <span>₦{subtotal.toLocaleString()}</span>
          </div>
          {orderType === 'delivery' && (
            <div className="mt-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-300">Delivery fee is paid to the rider upon delivery.</div>
          )}
          <div className="mt-1 flex items-center justify-between text-xs sm:text-sm font-semibold">
            <span>Total</span>
            <span>₦{grandTotal.toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-1 gap-2 mt-6">
            <button
              className="w-full px-4 py-2.5 sm:py-3 min-h-[44px] rounded-xl bg-ration-green-hover text-white border border-slate-300 dark:border-slate-600 text-sm sm:text-base font-bold shadow-sm active:scale-[0.98] transition-transform"
              onClick={handleWhatsappCheckout}
            >
              Checkout via WhatsApp
            </button>
          </div>

          {message && <p className="text-xs text-slate-600 dark:text-slate-300">{message}</p>}
        </div>
      </div>

      <div className="space-y-4"></div>
    </div>
  )
}
