import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
// Default key for dev if not provided (DO NOT USE IN PROD)
const DEFAULT_KEY = '0000000000000000000000000000000000000000000000000000000000000000'; 

function getKey(): Buffer {
  const keyHex = process.env.INTEGRATION_ENCRYPTION_KEY || DEFAULT_KEY;
  if (keyHex.length !== 64) {
     // If user provided a 32-byte string instead of hex, we can use it directly if length is 32
     if (keyHex.length === 32) return Buffer.from(keyHex);
     // If it's hex, it must be 64 chars (32 bytes)
     throw new Error('INTEGRATION_ENCRYPTION_KEY must be a 32-byte hex string (64 chars) or 32 raw bytes.');
  }
  return Buffer.from(keyHex, 'hex');
}

export interface EncryptedData {
  iv: string;
  content: string;
  tag: string;
}

export function encrypt(text: string): EncryptedData {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    iv: iv.toString('hex'),
    content: encrypted,
    tag: cipher.getAuthTag().toString('hex')
  };
}

export function decrypt(data: EncryptedData): string {
  const key = getKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    key, 
    Buffer.from(data.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(data.tag, 'hex'));
  
  let decrypted = decipher.update(data.content, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
