import { Schema, model } from 'mongoose'

const PasswordResetTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  usedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } })

PasswordResetTokenSchema.index({ userId: 1, expiresAt: -1 })

export default model('PasswordResetToken', PasswordResetTokenSchema)
