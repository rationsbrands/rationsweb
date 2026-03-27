import { Schema, model } from 'mongoose'

const EncSchema = new Schema({
  iv: { type: String, required: true },
  content: { type: String, required: true },
  tag: { type: String, required: true }
}, { _id: false })

const SocialConnectionSchema = new Schema({
  provider: {
    type: String,
    enum: ['instagram', 'youtube'],
    required: true,
    unique: true
  },

  mode: {
    type: String,
    enum: ['oauth', 'api_key'],
    required: true
  },

  accountId: String,
  accountName: String,
  accountUsername: String,

  accessTokenEnc: EncSchema,
  refreshTokenEnc: EncSchema,
  tokenExpiresAt: Date,
  lastTokenRefreshAt: Date,
  tokenType: String,
  connectedByUserId: String,
  refreshError: String,
  lastCursor: String,

  status: {
    type: String,
    enum: ['connected', 'expired', 'error'],
    default: 'connected'
  },

  apiKeyEnc: EncSchema,

  settings: {
    type: Schema.Types.Mixed,
    default: {}
  },

  isActive: { type: Boolean, default: true },
  lastSyncAt: Date,
  lastError: { type: String, default: '' }
}, { timestamps: true })

export default model('SocialConnection', SocialConnectionSchema)
