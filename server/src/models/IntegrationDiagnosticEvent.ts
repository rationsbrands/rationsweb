import { Schema, model } from 'mongoose'

const integrationDiagnosticEventSchema = new Schema(
  {
    direction: { type: String, enum: ['outbound', 'inbound'], required: true },
    provider: { type: String, default: 'platform' },
    event: { type: String, enum: ['PING', 'ORDER_PUSH', 'PLATFORM_CALLBACK'], required: true },
    status: { type: String, enum: ['success', 'failed'], required: true },
    correlationId: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed },
    response: { type: Schema.Types.Mixed },
    error: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true } // adds updatedAt too, but createdAt is explicit in reqs
)

export default model('IntegrationDiagnosticEvent', integrationDiagnosticEventSchema)
