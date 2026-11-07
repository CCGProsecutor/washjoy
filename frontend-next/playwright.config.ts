import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 60_000, // 首页含高德地图，小 VPS 上单次点击常要数秒
  use: { baseURL: process.env.WASHJOY_TEST_BASE_URL ?? 'http://127.0.0.1:3780', trace: 'retain-on-failure', screenshot: 'only-on-failure', ...devices['Desktop Chrome'] },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 950 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
