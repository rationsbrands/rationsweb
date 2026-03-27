import { z } from 'zod'

// Shared base types
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId')

// 1. User Schemas
export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().email('Invalid email').toLowerCase().trim(),
  role: z.enum(['owner', 'admin', 'manager', 'cashier', 'kitchen', 'staff', 'user']).optional(),
  phone: z.string().optional(),
})

export const updateUserSchema = z.object({
  name: z.string().trim().optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  phone: z.string().optional(),
})

// 2. Menu Schemas
export const createMenuItemSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  category: z.string().min(1, 'Category is required'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isAvailable: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  isSpicy: z.boolean().optional(),
  allergens: z.array(z.string()).optional(),
  trackStock: z.boolean().optional(),
  stockQuantity: z.number().min(0).optional(),
  lowStockThreshold: z.number().min(0).optional(),
}).strict()

export const updateMenuItemSchema = createMenuItemSchema.partial().strict()

// 3. Community Post Schemas
export const createCommunityPostSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  content: z.string().min(1, 'Content is required').trim(),
  author: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  tag: z.string().optional(),
  mediaUrl: z.string().optional(),
  mediaTitle: z.string().optional(),
  externalLinkUrl: z.string().optional(),
  externalLinkTitle: z.string().optional(),
  alertEnabled: z.boolean().optional(),
  alertStart: z.string().datetime().optional().or(z.date().optional()),
  alertEnd: z.string().datetime().optional().or(z.date().optional()),
}).strict()

export const updateCommunityPostSchema = createCommunityPostSchema.partial().strict()

// 4. Order Schemas
export const createPosOrderSchema = z.object({
  items: z.array(z.object({
    productId: objectId,
    qty: z.number().min(1),
    price: z.number().min(0),
  })).min(1, 'Order must contain at least one item'),
  total: z.number().min(0),
  branchId: z.string().optional(),
  channel: z.string().optional(),
}).strict()

export const createPublicOrderSchema = z.object({
  user: z.object({ _id: objectId }).optional().nullable(),
  items: z.array(z.object({
    menuItem: z.object({
      _id: objectId,
      price: z.number().min(0).optional() // We ignore this but client sends it
    }),
    quantity: z.number().min(1),
    sauce: z.string().optional(),
    options: z.record(z.string()).optional()
  })).min(1, 'Order must contain at least one item'),
  totalAmount: z.number().optional(), // We ignore this and recalculate it server-side
  orderType: z.enum(['pickup', 'delivery', 'dine-in']),
  deliveryAddress: z.string().optional(),
  customerNote: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'POS', 'ONLINE']),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(['CREATED', 'ACCEPTED', 'IN_PREP', 'READY', 'COMPLETED', 'CANCELLED'])
}).strict()

export const updateOrderPaymentSchema = z.object({
  paymentStatus: z.enum(['UNPAID', 'PENDING_CONFIRMATION', 'PAID', 'REFUNDED', 'FAILED', 'pending', 'paid', 'failed', 'refunded']).optional(),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'POS', 'ONLINE']).optional(),
  paymentRef: z.string().optional(),
  paymentNotes: z.string().optional(),
}).strict()

// 5. User Roles and Invitation
export const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'manager', 'cashier', 'kitchen', 'staff', 'user']).optional()
}).strict()

export const updateUserRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'manager', 'cashier', 'kitchen', 'staff', 'user'])
}).strict()

// 6. Tenant Settings
export const updateSettingsSchema = z.object({
  payments: z.any().optional(),
  messaging: z.any().optional(),
  logistics: z.any().optional(),
}).strict()
