import { Schema, model } from 'mongoose'

export enum OrderStatus {
  CREATED = 'CREATED',
  ACCEPTED = 'ACCEPTED',
  IN_PREP = 'IN_PREP',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  POS = 'POS',
  ONLINE = 'ONLINE',
}

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // Optional (guest checkout?)
    items: [
      {
        menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
        quantity: { type: Number, required: true },
        priceAtOrderTime: { type: Number, required: true },
        sauce: { type: String },
        options: { type: Map, of: String }, // For future flexibility
      }
    ],
    totalAmount: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ['CREATED', 'ACCEPTED', 'IN_PREP', 'READY', 'COMPLETED', 'CANCELLED'], 
      default: 'CREATED',
      index: true
    },
    
    // Updated Payment Fields
    paymentMethod: { 
      type: String, 
      enum: ['CASH', 'TRANSFER', 'POS', 'ONLINE'],
      default: 'CASH' // Default for RationsWeb might be Cash/Transfer if not online
    },
    paymentStatus: { 
      type: String, 
      enum: ['UNPAID', 'PENDING_CONFIRMATION', 'PAID', 'REFUNDED', 'FAILED', 'pending', 'paid', 'failed', 'refunded'], 
      default: 'UNPAID' 
    },
    paymentRef: { type: String },
    paidAt: { type: Date },
    paymentNotes: { type: String },

    orderType: { 
      type: String, 
      enum: ['pickup', 'delivery', 'dine-in'], 
      default: 'pickup' 
    },
    deliveryAddress: { type: String },
    customerNote: { type: String },
    platformOrderId: { type: String }, // ID from Platform integration
    platformStatus: { type: String, default: 'PENDING' }, // PENDING, SYNCED, FAILED
    opsSource: { type: String, enum: ['LOCAL', 'PLATFORM'], default: 'LOCAL', index: true },
    lastOpsSyncAt: { type: Date },
    opsStatus: { type: String }, // cached platform status
    opsSyncError: { type: String },
    opsSyncAttempts: { type: Number, default: 0 },
  },
  { timestamps: true }
)

orderSchema.index({ createdAt: -1 })
orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ paymentStatus: 1 })

export default model('Order', orderSchema)
