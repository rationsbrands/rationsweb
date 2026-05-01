import { Schema, model } from 'mongoose'

const menuItemSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: String, required: true }, // e.g., 'Starters', 'Main', 'Drinks'
    imageUrl: { type: String },
    isAvailable: { type: Boolean, default: true },
    isVegetarian: { type: Boolean, default: false },
    isSpicy: { type: Boolean, default: false },
    allergens: [{ type: String }],
    popularity: { type: Number, default: 0 },
    trackStock: { type: Boolean, default: false },
    stockQuantity: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    promoActive: { type: Boolean, default: false },
    promoType: { type: String, enum: ['percentage', 'fixed_price'], default: null },
    promoValue: { type: Number, default: null },
    promoStart: { type: Date, default: null },
    promoEnd: { type: Date, default: null },
    promoLabel: { type: String, default: null },
    archived: { type: Boolean, default: false },
    externalId: { type: String, sparse: true }, // Platform ID
  },
  { timestamps: true }
)

menuItemSchema.index({ name: 'text', description: 'text' })
menuItemSchema.index({ isAvailable: 1, archived: 1 })
menuItemSchema.index({ category: 1 })

export default model('MenuItem', menuItemSchema)
