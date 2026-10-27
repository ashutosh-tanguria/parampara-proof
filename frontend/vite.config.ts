/// <reference types="vitest/config" />
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 127.0.0.1 (not "localhost") avoids IPv6/IPv4 mismatches on Windows.
const API = process.env.VITE_API_TARGET || 'http://127.0.0.1:8000'

const proxyEntry = {
  target: API,
  changeOrigin: true,
  configure: (proxy: { on: (ev: 'error', fn: (err: Error, req: IncomingMessage, res: ServerResponse) => void) => void }) => {
    // When the backend is not running, answer with a clear JSON error instead of an empty 500.
    proxy.on('error', (_err, _req, res) => {
      if (res.headersSent) return
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          error: { code: 'backend_unreachable', message: 'The server is not running. Start the backend (see the README) and try again.' },
        }),
      )
    })
  },
}

const proxy = { '/api': proxyEntry, '/uploads': proxyEntry, '/media': proxyEntry }

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
  build: { sourcemap: false, chunkSizeWarningLimit: 600 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
