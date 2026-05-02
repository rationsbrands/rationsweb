import { Schema, model } from 'mongoose'

const communityPostSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, default: 'Rations Team' }, // Or link to User
    imageUrl: { type: String },
    
    // Additional fields
    tag: { type: String },
    mediaUrl: { type: String },
    mediaTitle: { type: String },
    externalLinkUrl: { type: String },
    externalLinkTitle: { type: String },

    // Call to Action
    ctaEnabled: { type: Boolean, default: false },
    ctaLink: { type: String },
    ctaText: { type: String },
    
    alertEnabled: { type: Boolean, default: false },
    alertStart: { type: Date },
    alertEnd: { type: Date },

    // status: 'pending' added for imported posts requiring moderation
    status: { type: String, enum: ['draft', 'published', 'pending'], default: 'published' },
    deleted: { type: Boolean, default: false },
    likes: { type: Number, default: 0 },
    reportsCount: { type: Number, default: 0 },
    
    // Optional source tracking for imported content
    source: {
provider: { type: String, enum: ['instagram', 'youtube'] },
      externalId: { type: String },
      permalink: { type: String },
      mediaType: { type: String }
    }
  },
  { timestamps: true }
)

// Ensure unique imports per provider to prevent duplicates
communityPostSchema.index({ 'source.provider': 1, 'source.externalId': 1 }, { unique: true, partialFilterExpression: { 'source.provider': { $exists: true } } })

export default model('CommunityPost', communityPostSchema)
