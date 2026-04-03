import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy ESP32 API calls to avoid CORS issues during dev.
    // Change the target to ESP32's IP address.
    proxy: {
      '/api': {
        target: 'http://172.31.78.204', // <-- set your ESP32 IP here
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
