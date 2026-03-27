import { Schema, model } from 'mongoose'

const InviteTokenSchema = new Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  role: { type: String, required: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  usedAt: { type: Date, default: null },
  createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

InviteTokenSchema.index({ email: 1, role: 1, expiresAt: -1 })

export default model('InviteToken', InviteTokenSchema)
