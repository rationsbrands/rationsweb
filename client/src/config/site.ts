import { FaInstagram, FaFacebook, FaTiktok, FaYoutube, FaTwitter, FaWhatsapp } from 'react-icons/fa'

export const SITE = {
  name: 'Rations',
  tagline: 'Real food. Real community.',
  description: 'Rations is a community-first food brand focused on honest sourcing, nutritious meals, and neighborhood impact.',
  socials: [
    { name: 'TikTok', url: 'https://www.tiktok.com/@rations.food', icon: FaTiktok, hoverColor: '#ff0050' },
    { name: 'Instagram', url: 'https://instagram.com/rations.food', icon: FaInstagram, hoverColor: '#E4405F' },
    { name: 'Facebook', url: 'https://facebook.com/rations.food', icon: FaFacebook, hoverColor: '#1877F2' },
    { name: 'YouTube', url: 'https://youtube.com/@rationsfood', icon: FaYoutube, hoverColor: '#FF0000' },
    { name: 'X', url: 'https://x.com/rationsfood', icon: FaTwitter, hoverColor: '#1d9bf0 ' },
    { name: 'WhatsApp', url: 'https://wa.me/2349122058888', icon: FaWhatsapp, hoverColor: '#25D366' },
  ],
  contacts: {
    email: 'info@rationsfood.com',
    phone: '+2349122058888',
    whatsapp: 'https://wa.me/2349122058888',
    location: 'Rations, Plot 123, Railway junction, Idu Industrial District, Abuja 900001, Federal Capital Territory',
  },
  bank: {
    name: 'Rations Bank',
    accountName: 'Rations Food Ltd',
    accountNumber: '1234567890',
  },
  promoMessage: '',
  promoStart: null,
  promoEnd: null,
  eventMessage: '',
  eventDate: null,
  eventStart: null,
  eventEnd: null,
  visitorAlertEnabled: false,
}

export const buildWhatsappOrderMessage = (items: any[], totals: { subtotal: number; total: number }, options: { orderType?: string } = {}) => {
  const lines = items.map(i => {
    const lineTotal = i.menuItem.price * i.quantity
    const saucePart = i.sauce ? ` • Sauce: ${i.sauce}` : ''
    return `- ${i.menuItem.name} x${i.quantity} (₦${lineTotal.toLocaleString()})${saucePart}`
  })
  const header = options.orderType ? `Order Type: ${options.orderType}\n` : ''
  const body = lines.join('\n')
  const summary = `\nSubtotal: ₦${totals.subtotal.toLocaleString()}\nTotal: ₦${totals.total.toLocaleString()}`
  const greeting = 'Hi, I want to place an order'
  return `${greeting}\n\n${header}${body}${summary}`
}