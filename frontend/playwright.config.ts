import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 8000)
const PYTHON = process.env.PYTHON ?? 'python'

// The backend serves the built frontend (frontend/dist), so one server covers the whole app.
// Run `npm run build` first. The server only accepts connections after the model has loaded.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  webServer: {
    command: `${PYTHON} -m uvicorn backend.main:app --port ${PORT}`,
    cwd: '..',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: true,
    timeout: 240_000,
    env: { RATE_LIMIT_PER_MIN: '0', LOG_LEVEL: 'WARNING' },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } } },
  ],
})
