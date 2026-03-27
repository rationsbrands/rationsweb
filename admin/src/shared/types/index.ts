export interface MenuItem {
  _id: string
  name: string
  description?: string
  price: number
  category?: string
  imageUrl?: string
  isAvailable: boolean
  popularity?: number
  archived?: boolean
  createdAt?: string
  updatedAt?: string
}

export type Sauce = string

export interface CartItem {
  menuItem: MenuItem
  quantity: number
  sauce?: Sauce
  options?: Record<string, string>
}

export interface AuthUser {
  _id: string
  name: string
  email?: string
  phone?: string
  role: string
  avatarUrl?: string
  isVerified?: boolean
  createdAt?: string
  updatedAt?: string
  status?: string
  address?: string
  addressLine?: string
}

export interface AuthResponse {
  success: boolean
  token: string
  user: AuthUser
}

export interface OrderItem {
  menuItem: MenuItem
  quantity: number
  priceAtOrderTime: number
  sauce?: string
  options?: Record<string, string>
}

export interface Order {
  _id: string
  user?: AuthUser
  items: OrderItem[]
  totalAmount: number
  status: 'CREATED' | 'ACCEPTED' | 'IN_PREP' | 'READY' | 'COMPLETED' | 'CANCELLED'
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  orderType: 'pickup' | 'delivery' | 'dine-in'
  deliveryAddress?: string
  customerNote?: string
  createdAt: string
  updatedAt: string
}
