export type Role = 'user' | 'owner' | 'admin' | 'manager' | 'cashier' | 'kitchen' | 'staff'
export type Sauce = 'Buffalo' | 'Barbecue'

export interface MenuItem {
  _id: string
  name: string
  description?: string
  price: number
  category?: string
  imageUrl?: string
  isAvailable?: boolean
  popularity?: number
  archived?: boolean
}

export interface CartItem {
  menuItem: MenuItem
  quantity: number
  sauce?: Sauce
}

export interface AuthUser {
  _id: string
  name: string
  email?: string
  phone?: string
  role: Role
  phoneVerified?: boolean
  emailVerified?: boolean
  addressLine?: string
  address?: string
}

export interface AuthResponse {
  user: AuthUser
  token: string
}

export interface CommunityPost {
  _id: string
  title: string
  content: string
  imageUrl?: string
  tag?: string
  publishedAt?: string | Date
  slug?: string
  excerpt?: string
  coverImageUrl?: string
  tags?: string[]
  status?: 'draft' | 'published'
  deleted?: boolean
  mediaUrl?: string
  mediaType?: string
  mediaTitle?: string
  externalLinkUrl?: string
  externalLinkTitle?: string
  authorAvatarUrl?: string
  alertEnabled?: boolean
  alertStart?: string | Date | null
  alertEnd?: string | Date | null
  createdBy?: { _id: string; name?: string }
  createdAt?: string | Date
}

export interface OrderItem {
  menuItem: MenuItem
  quantity: number
  priceAtOrderTime?: number
  sauce?: Sauce
}

export interface Order {
  _id: string
  user?: { _id: string; name?: string; email?: string; phone?: string }
  items: OrderItem[]
  orderType: 'pickup' | 'delivery'
  subtotal?: number
  totalAmount: number
  paymentMethod?: 'whatsapp' | 'bank_transfer'
  paymentStatus: 'pending' | 'paid' | 'failed'
  status: 'CREATED' | 'ACCEPTED' | 'IN_PREP' | 'READY' | 'COMPLETED' | 'CANCELLED'
  createdAt?: string | Date
}

export interface SettingsSocial { name: string; url: string }

export interface Settings {
  contacts?: { email?: string; phone?: string; whatsapp?: string; location?: string }
  bank?: { name?: string; accountName?: string; accountNumber?: string }
  socials?: SettingsSocial[]
  promoMessage?: string
  promoStart?: string | Date | null
  promoEnd?: string | Date | null
  eventMessage?: string
  eventDate?: string | Date | null
  eventStart?: string | Date | null
  eventEnd?: string | Date | null
  visitorAlertEnabled?: boolean
}
