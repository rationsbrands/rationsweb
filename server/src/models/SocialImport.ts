import { Schema, model } from 'mongoose'

const SocialImportSchema = new Schema({
  provider: {
    type: String,
    enum: ['instagram', 'youtube'],
    index: true
  },

  externalPostId: { type: String, required: true },

  communityPostId: { type: Schema.Types.ObjectId, ref: 'CommunityPost' },

  status: {
    type: String,
    enum: ['imported', 'published', 'failed'],
    default: 'imported'
  },

  raw: Schema.Types.Mixed,

  normalized: {
    title: String,
    caption: String,
    mediaUrl: String,
    thumbnailUrl: String,
    mediaType: String,
    timestamp: Date,
    permalink: String
  }
}, { timestamps: true })

SocialImportSchema.index({ provider: 1, externalPostId: 1 }, { unique: true })

export default model('SocialImport', SocialImportSchema)
