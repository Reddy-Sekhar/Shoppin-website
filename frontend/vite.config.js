import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/ - Updated for Tailwind v4
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = (env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/').replace(/\/$/, '')

  return {
    // For GitHub Pages deployment, use repository name as base path
    // Set VITE_BASE_PATH env var to '/' for custom domain or local development
    base: env.VITE_BASE_PATH || '/Shoppin-website/',
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
