import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      include: /\.(jsx|js)$/,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts')) return 'charts'
          if (id.includes('node_modules/react-router')) return 'router'
          if (id.includes('node_modules/@radix-ui')) return 'ui'
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor'
        },
      },
    },
  },

})
