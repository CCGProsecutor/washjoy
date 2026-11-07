import { defineConfig } from '@playwright/test'
// Build the isolated review directory as documented in docs/STATUS.md first.
export default defineConfig({
  testDir: './ui-tests', workers: 1, timeout: 25000, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3788', headless: true },
  webServer: {
    cwd: process.env.WASHJOY_REVIEW_DIR || '/root/scratch/washjoy-ui-review',
    command: 'PORT=3788 node scripts/server.mjs',
    url: 'http://127.0.0.1:3788/washjoy/ui-playground', reuseExistingServer: false, timeout: 60000,
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 960 } } },
  ],
})
