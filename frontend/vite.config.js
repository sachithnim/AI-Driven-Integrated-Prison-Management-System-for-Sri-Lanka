import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl(),   // Self-signed HTTPS cert — required for GPS on phone
  ],
  server: {
    host: '0.0.0.0',   // Allow access from phone on same WiFi
    port: 5173,
    https: true,        // Enable HTTPS
    proxy: {
      // API Gateway (auth, inmates via /api/*, rehabilitation via /api/rehabilitation/*)
      '/api': { target: 'http://localhost:4004', changeOrigin: true, secure: false },
      '/auth': { target: 'http://localhost:4004', changeOrigin: true, secure: false },

      // Direct inmate-service paths (used by inmateService, prisonService, cellService)
      // bypass: page refreshes on React routes (/inmates/:id etc.) serve index.html instead
      '/inmates':  { target: 'http://localhost:4007', changeOrigin: true, secure: false, bypass: (req) => { if (req.headers.accept?.includes('text/html')) return '/index.html'; } },
      '/prisons':  { target: 'http://localhost:4007', changeOrigin: true, secure: false, bypass: (req) => { if (req.headers.accept?.includes('text/html')) return '/index.html'; } },
      '/cells':    { target: 'http://localhost:4007', changeOrigin: true, secure: false, bypass: (req) => { if (req.headers.accept?.includes('text/html')) return '/index.html'; } },

      // Direct rehabilitation-service paths (used by backendRehabService)
      // bypass: React routes under /rehabilitation/* serve index.html on page refresh
      '/rehabilitation': { target: 'http://localhost:4006', changeOrigin: true, secure: false, bypass: (req) => { if (req.headers.accept?.includes('text/html')) return '/index.html'; } },

      // home-leave is only a React route — always serve index.html
      '/home-leave': { target: 'http://localhost:4006', changeOrigin: true, secure: false, bypass: () => '/index.html' },

      // AI rehab module (port 8001) — prefix stripped on the way through
      '/ai-api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ai-api/, ''),
      },

      // Violation service WebSocket + REST (port 8003) — prefix stripped on the way through
      '/violation-ws': {
        target: 'ws://localhost:8003',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/violation-ws/, ''),
      },
    },
  },
})
