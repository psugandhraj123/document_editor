import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom'],
    esbuildOptions: {
      jsx: 'automatic',
      jsxImportSource: 'react'
    }
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
    
  }
})
