import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/ - Updated for Tailwind v4
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = (env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/').replace(/\/$/, '')
  
  // For GitHub Pages deployment, set VITE_BASE_PATH to your repository name (e.g., '/Shoppin-website/')
  // For local development or custom domains, set to '/' or leave unset
  const basePath = mode === 'production' 
    ? (env.VITE_BASE_PATH || '/Shoppin-website/')
    : '/'

  return {
    base: basePath,
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
