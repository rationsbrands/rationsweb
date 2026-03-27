import { Schema, model } from 'mongoose'

const SsoExchangeTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  source: { type: String, enum: ['RATIONSWEB', 'PLATFORM'], required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  usedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } })

SsoExchangeTokenSchema.index({ userId: 1, source: 1, expiresAt: -1 })

export default model('SsoExchangeToken', SsoExchangeTokenSchema)
