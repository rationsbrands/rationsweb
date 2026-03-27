import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared/ui': path.resolve(__dirname, './src/shared/ui'),
      '@shared/types': path.resolve(__dirname, './src/shared/types'),
      '@shared/hooks': path.resolve(__dirname, './src/shared/hooks'),
    },
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  }
})