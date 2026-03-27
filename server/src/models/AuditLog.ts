import { Schema, model } from 'mongoose'

const auditLogSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    actorType: { type: String, enum: ['USER','INTEGRATION','SYSTEM'], default: 'USER' },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorId: { type: Schema.Types.Mixed, default: null },
    actorEmail: { type: String, default: null },
    actorRole: { type: String, default: '' },
    action: { type: String, required: true },
    entityType: { type: String, enum: ['user','order','menu','integration','policy','domain'], default: undefined },
    entityId: { type: Schema.Types.ObjectId, default: null },
    // Back-compat fields
    entity: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    outcome: { type: String, enum: ['SUCCESS','DENIED','ERROR'], default: 'SUCCESS' },
    requestId: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

auditLogSchema.index({ createdAt: -1 })
auditLogSchema.index({ branchId: 1, createdAt: -1 })
auditLogSchema.index({ actorUserId: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 })
auditLogSchema.index({ entity: 1, createdAt: -1 })
auditLogSchema.index({ performedBy: 1, createdAt: -1 })

const ttlDays = Number(process.env.AUDITLOG_TTL_DAYS || 0)
if (ttlDays > 0) {
  auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: ttlDays * 24 * 60 * 60 })
}

export default model('AuditLog', auditLogSchema)
