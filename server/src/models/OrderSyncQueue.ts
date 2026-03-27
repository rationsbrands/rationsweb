import { Schema, model } from 'mongoose'

const OrderSyncQueueSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  platformOrderId: { type: String },
  action: { type: String, enum: ['PUSH', 'SYNC', 'CANCEL'], required: true, index: true },
  status: { type: String, enum: ['PENDING', 'RUNNING', 'SUCCESS', 'ERROR'], default: 'PENDING', index: true },
  attempts: { type: Number, default: 0 },
  nextRunAt: { type: Date, default: Date.now, index: true },
  lastError: { type: String },
}, { timestamps: true })

OrderSyncQueueSchema.index({ orderId: 1, action: 1, status: 1 })

export default model('OrderSyncQueue', OrderSyncQueueSchema)
