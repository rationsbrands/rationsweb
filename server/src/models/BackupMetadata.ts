import { Schema, model } from 'mongoose'

const BackupMetadataSchema = new Schema({
  type: { type: String, enum: ['AUTOMATED','MANUAL'], required: true },
  provider: { type: String, default: 'ATLAS' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: true, updatedAt: false } })

BackupMetadataSchema.index({ createdAt: -1 })

export default model('BackupMetadata', BackupMetadataSchema)
