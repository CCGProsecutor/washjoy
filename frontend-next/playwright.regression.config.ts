import { defineConfig } from '@playwright/test'

const reviewDir = process.env.WASHJOY_RELEASE_DIR || '/root/scratch/washjoy-release-check'

export default defineConfig({
  testDir: './tests',
  testMatch: 'production-regression.spec.ts',
  timeout: 30_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3789',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'PORT=3789 node scripts/server.mjs',
    cwd: reviewDir,
    url: 'http://127.0.0.1:3789/washjoy/',
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: 'narrow', use: { viewport: { width: 320, height: 740 }, reducedMotion: 'reduce' } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 960 } } },
  ],
})
