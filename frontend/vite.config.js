import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // ── Auth via API Gateway (4004) ───────────────────────────────────────
      '/auth': {
        target: 'http://localhost:4004',
        changeOrigin: true,
        secure: false,
      },
      // ── Inmate + Cell + Prison via API Gateway (4004) ─────────────────────
      '/api/inmates': {
        target: 'http://localhost:4004',
        changeOrigin: true,
        secure: false,
      },
      '/api/prisons': {
        target: 'http://localhost:4004',
        changeOrigin: true,
        secure: false,
      },
      // ── Direct inmate-service (4007) for services that call directly ───────
      '/inmates': {
        target: 'http://localhost:4007',
        changeOrigin: true,
        secure: false,
      },
      '/cells': {
        target: 'http://localhost:4007',
        changeOrigin: true,
        secure: false,
      },
      '/prisons': {
        target: 'http://localhost:4007',
        changeOrigin: true,
        secure: false,
      },
      // ── Rehabilitation Service (4006) ─────────────────────────────────────
      '/rehabilitation': {
        target: 'http://localhost:4006',
        changeOrigin: true,
        secure: false,
        bypass(req) {
          // Browser page navigations → serve the React SPA (React Router handles it)
          if (req.headers.accept?.includes('text/html')) {
            return req.url;
          }
        },
      },
      // ── Rehabilitation AI (8001) via /ai-api prefix ───────────────────────
      '/ai-api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ai-api/, ''),
      },
      // ── Violation Service (8003) — specific paths before generic /api/v1 ──
      '/api/v1/cameras': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        secure: false,
      },
      '/api/v1/incidents': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        secure: false,
      },
      '/api/v1/reports': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        secure: false,
      },
      '/api/v1/ws': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/api/v1/start-stream': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        secure: false,
      },
      '/api/v1/video_feed': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        secure: false,
      },
      '/static/incidents': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        secure: false,
      },
      // ── Rehabilitation AI (8001) via /api/v1 direct ───────────────────────
      '/api/v1': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      // ── Overcrowding AI (8002) ────────────────────────────────────────────
      '/overcrowding': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        secure: false,
      },
    }
  },
})


