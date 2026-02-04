import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const isCI = process.env.GITHUB_ACTIONS === 'true'
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'cosmos-portfolio'

// Build-time overrides for CI variants
const explicitBase = process.env.BUILD_BASE
const outDir = process.env.BUILD_OUT_DIR

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: explicitBase ?? (isCI ? `/${repo}/` : '/'),
  build: {
    outDir: outDir ?? 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
