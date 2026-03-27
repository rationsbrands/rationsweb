import { Schema, model } from 'mongoose'

const IntegrationLogSchema = new Schema({
  provider: { type: String, required: true, default: 'platform', index: true },
  action: { type: String, required: true }, // e.g., 'push_order', 'order_status'
  direction: { type: String, enum: ['outbound', 'inbound'], default: 'outbound' },
  status: { type: String, enum: ['success', 'failed'], required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  platformOrderId: { type: String },
  request: { type: Schema.Types.Mixed },
  response: { type: Schema.Types.Mixed },
  error: { type: String },
}, { timestamps: true })

IntegrationLogSchema.index({ provider: 1, createdAt: -1 })

export default model('IntegrationLog', IntegrationLogSchema)
