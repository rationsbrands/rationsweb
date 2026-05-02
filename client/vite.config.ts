import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'

import Sitemap from 'vite-plugin-sitemap'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_RATIONSWEB_API_URL || 'http://127.0.0.1:6002'
  return {
    plugins: [
      react(),
      Sitemap({
        hostname: 'https://rationsfood.com',
        dynamicRoutes: [
          '/',
          '/about',
          '/menu',
          '/contact',
          '/community',
          '/cart',
          '/checkout'
        ]
      })
    ],
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
  }
})
