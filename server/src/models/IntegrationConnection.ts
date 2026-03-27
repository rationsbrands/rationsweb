import { Document, Schema, model } from 'mongoose';

export interface IIntegrationConnection extends Document {
  provider: string; // 'platform'
  status: 'connected' | 'disconnected';
  platformBaseUrl: string;
  platformBranchId?: string;
  platformAuthMethod: 'api_key' | 'oauth_client_credentials' | 'oauth_authorization_code';
  // Legacy field, prefer platformApiKeyEncrypted if platformAuthMethod is 'api_key'
  apiKeyEncrypted: {
    iv: string;
    content: string;
    tag: string;
  };
  platformApiKeyEncrypted?: {
    iv: string;
    content: string;
    tag: string;
  };
  platformClientIdEncrypted?: {
    iv: string;
    content: string;
    tag: string;
  };
  platformClientSecretEncrypted?: {
    iv: string;
    content: string;
    tag: string;
  };
  scopes: string[];
  features: {
    orders: boolean;
    kds: boolean;
    catalog: boolean;
  };
  connectedAt?: Date;
  lastCheckedAt?: Date;
  lastSuccessAt?: Date;
  lastError?: string;
  createdByAdminUserId?: string;
  updatedAt: Date;
}

const IntegrationConnectionSchema = new Schema<IIntegrationConnection>({
  provider: { type: String, required: true, default: 'platform' },
  status: { type: String, enum: ['connected', 'disconnected'], default: 'disconnected' },
  platformBaseUrl: { type: String, default: '' },
  platformBranchId: { type: String, default: '' },
  platformAuthMethod: { type: String, enum: ['api_key', 'oauth_client_credentials', 'oauth_authorization_code'], default: 'api_key' },
  apiKeyEncrypted: {
    iv: { type: String, select: false },
    content: { type: String, select: false },
    tag: { type: String, select: false }
  },
  platformApiKeyEncrypted: {
    iv: { type: String, select: false },
    content: { type: String, select: false },
    tag: { type: String, select: false }
  },
  platformClientIdEncrypted: {
    iv: { type: String, select: false },
    content: { type: String, select: false },
    tag: { type: String, select: false }
  },
  platformClientSecretEncrypted: {
    iv: { type: String, select: false },
    content: { type: String, select: false },
    tag: { type: String, select: false }
  },
  scopes: { type: [String], default: [] },
  features: {
    orders: { type: Boolean, default: false },
    kds: { type: Boolean, default: false },
    catalog: { type: Boolean, default: false }
  },
  connectedAt: { type: Date },
  lastCheckedAt: { type: Date },
  lastSuccessAt: { type: Date },
  lastError: { type: String },
  createdByAdminUserId: { type: String },
}, { timestamps: true });

IntegrationConnectionSchema.index({ provider: 1 }, { unique: true });

export const IntegrationConnection = model<IIntegrationConnection>('IntegrationConnection', IntegrationConnectionSchema);
