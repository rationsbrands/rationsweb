import { z } from 'zod'
import dotenv from 'dotenv'
import path from 'path'

// Load env from root or local
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(6002),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  CLIENT_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174,http://localhost:3000,https://rationsweb.vercel.app,https://rationsweb-client.vercel.app,https://rationsweb-admin.vercel.app,https://www.rationsweb.com,https://rationsweb.com,https://admin.rationsweb.com,https://api.rationsweb.com'),
  
  // Integration vars
  IG_APP_ID: z.string().optional(),
  IG_APP_SECRET: z.string().optional(),
  IG_REDIRECT_URI: z.string().optional(),
  IG_CLIENT_ID: z.string().optional(),
  IG_CLIENT_SECRET: z.string().optional(),
  
  YT_CLIENT_ID: z.string().optional(),
  YT_CLIENT_SECRET: z.string().optional(),
  YT_REDIRECT_URI: z.string().optional(),
  
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  
  PLATFORM_API_URL: z.string().optional(),
  SOCIAL_SYNC_ENABLED: z.string().optional(),
})

// Validate and export
const _env = envSchema.safeParse(process.env)

if (!_env.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(_env.error.format(), null, 4))
  process.exit(1)
}

export const env = _env.data
export const isDev = env.NODE_ENV === 'development'
export const isProd = env.NODE_ENV === 'production'
