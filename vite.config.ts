import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const isCI = process.env.GITHUB_ACTIONS === 'true'
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'cosmos-portfolio'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: isCI ? `/${repo}/` : '/',
})
