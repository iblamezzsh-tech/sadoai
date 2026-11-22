import { defineConfig, devices } from '@playwright/test'

const url = 'http://localhost:3100'
export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: url,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
  },
  webServer: { command: 'npm run start -- --port 3100', url, timeout: 30000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 800 } } },
  ],
})
