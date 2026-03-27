import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const keyHex = process.env.SOCIAL_ENCRYPTION_KEY
  if (!keyHex) {
    throw new Error('SOCIAL_ENCRYPTION_KEY is not defined in environment variables')
  }
  
  if (keyHex.length !== 64) {
    // If user provided a 32-byte string instead of hex, we can use it directly if length is 32
    if (keyHex.length === 32) return Buffer.from(keyHex)
    // If it's hex, it must be 64 chars (32 bytes)
    throw new Error('SOCIAL_ENCRYPTION_KEY must be a 32-byte hex string (64 chars) or 32 raw bytes.')
  }
  return Buffer.from(keyHex, 'hex')
}

export interface EncryptedData {
  iv: string
  content: string
  tag: string
}

export function encryptSocial(text: string): EncryptedData {
  const iv = crypto.randomBytes(12)
  const key = getKey()
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return {
    iv: iv.toString('hex'),
    content: encrypted,
    tag: cipher.getAuthTag().toString('hex')
  }
}

export function decryptSocial(data: EncryptedData): string {
  const key = getKey()
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    key, 
    Buffer.from(data.iv, 'hex')
  )
  
  decipher.setAuthTag(Buffer.from(data.tag, 'hex'))
  
  let decrypted = decipher.update(data.content, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
