import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const LEGACY_JS_PATHS = [
  '/bundle.js',
  '/main.js',
  '/static/js/bundle.js',
  '/static/js/main.js',
  '/static/js/main.chunk.js',
]

function legacyCacheRecovery(): Plugin {
  return {
    name: 'legacy-cache-recovery',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        const fullUrl = req.url ?? ''

        // Force fresh Trugo Sync HTML (skip stale Sai Mahes / CRA cache on localhost:3000)
        if (
          req.method === 'GET' &&
          (url === '/' || url === '/index.html') &&
          !fullUrl.includes('v=trugo')
        ) {
          res.statusCode = 302
          res.setHeader('Location', `/?v=trugo-${Date.now()}`)
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
          res.end()
          return
        }

        const isLegacyJs =
          LEGACY_JS_PATHS.some((path) => url === path || url.startsWith(`${path}?`)) ||
          /^\/static\/js\/main\.[a-f0-9]+\.js/.test(url)

        if (isLegacyJs) {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          // Never wipe SPA routes like /reset-password?token=...
          res.end(
            `if (location.pathname === '/' || location.pathname === '/index.html') { location.replace('/?v=trugo-' + Date.now()); }`,
          )
          return
        }

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), legacyCacheRecovery()],
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  },
})
