import { SITE } from '../../config/site'
import { Link } from 'react-router-dom'

export default function SupportTab() {
  const email = SITE.contacts.email
  const phone = SITE.contacts.phone
  const whatsapp = SITE.contacts.whatsapp

  const openWhatsapp = () => {
    const url = `${whatsapp}?text=${encodeURIComponent('Hello, I need help with my order')}`
    window.open(url, '_blank')
  }

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-3">
      <h2 className="text-lg font-semibold">Support</h2>

      <div className="rounded border border-slate-200 p-3 text-sm space-y-2">
        <div className="font-semibold">Contact</div>
        <div>
          Email: <a href={`mailto:${email}`} className="underline">{email}</a>
        </div>
        <div>
          Phone: <a href={`tel:${phone}`} className="underline">{phone}</a>
        </div>
        <div>
          WhatsApp: <a href={whatsapp} target="_blank" rel="noreferrer" className="underline">Chat on WhatsApp</a>
        </div>
        <div>
          <Link to="/contact" className="underline">Full contact details</Link>
        </div>
      </div>

      <button className="px-3 py-2 rounded-full bg-ration-green-hover text-white text-sm" onClick={openWhatsapp}>Contact via WhatsApp</button>
      <div>
        <Link to="/community" className="text-sm underline">Visit Community / FAQs</Link>
      </div>
    </div>
  )
}
