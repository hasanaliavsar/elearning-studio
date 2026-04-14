import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/eg-proxy': {
        target: 'https://elearning-package.easygenerator.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/eg-proxy/, ''),
        secure: true,
      },
    },
  },
})
