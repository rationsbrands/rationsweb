import { Schema, model } from 'mongoose'

const addressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    label: { type: String, default: 'Home' },
    recipientName: { type: String },
    phone: { type: String },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String, default: 'Nigeria' },
    deliveryInstructions: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
)

addressSchema.index({ userId: 1, isDefault: 1 })

export default model('Address', addressSchema)
