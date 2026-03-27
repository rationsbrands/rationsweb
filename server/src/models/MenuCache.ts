import { Schema, model } from 'mongoose'

const MenuCacheSchema = new Schema({
  source: { type: String, enum: ['LOCAL', 'PLATFORM'], default: 'LOCAL' },
  items: { type: [Schema.Types.Mixed], default: [] },
  lastSyncAt: { type: Date, default: null },
  lastError: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true })

export default model('MenuCache', MenuCacheSchema)
