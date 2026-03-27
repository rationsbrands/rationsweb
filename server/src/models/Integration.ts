import { Schema, model } from 'mongoose'

const integrationSchema = new Schema(
  {
    provider: { type: String, enum: ['platform', 'instagram', 'x', 'youtube'], required: true },
    enabled: { type: Boolean, default: false },
    status: { type: String, enum: ['connected', 'disconnected', 'error'], default: 'disconnected' },
    config: { type: Object, default: {} },
    secretsEncrypted: { type: Object, default: {} }, // map of key -> { iv, content, tag }
    scopes: { type: [String], default: [] },
    lastSyncAt: { type: Date, default: null },
    lastError: { type: String, default: '' },
    webhookConfiguredAt: { type: Date, default: null },
lastWebhookAt: { type: Date, default: null },

  },
  { timestamps: true }
)

integrationSchema.index({ provider: 1 }, { unique: true })

export default model('Integration', integrationSchema)
