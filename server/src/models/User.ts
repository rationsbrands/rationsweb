import { Schema, model } from 'mongoose'

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, lowercase: true, unique: true },
    phone: { type: String },
    addressLine: { type: String },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'owner', 'admin', 'manager', 'cashier', 'kitchen', 'staff'], default: 'user' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    adminNote: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    otpCode: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    avatarUrl: { type: String, default: '' },
    invalidateBefore: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    isDisabled: { type: Boolean, default: false },
    disabledReason: { type: String },
    disabledAt: { type: Date },
    disabledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    tokenVersion: { type: Number, default: 0 },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    lastSensitiveAuthAt: { type: Date, default: null },
  },
  { timestamps: true },
)

userSchema.index({ phone: 1 }, { unique: true, sparse: true })

export default model('User', userSchema)
