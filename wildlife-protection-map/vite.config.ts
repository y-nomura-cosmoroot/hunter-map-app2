import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  assetsInclude: ['**/*.pdf'],
  define: {
    global: 'globalThis',
  },
  worker: {
    format: 'es'
  }
})
