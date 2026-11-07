import { defineConfig } from '@playwright/test'

// Requires the main agent's disposable build at WASHJOY_TEST_BASE_URL.
export default defineConfig({
  testDir: './tests',
  testMatch: 'motion-performance.spec.ts',
  outputDir: '/root/scratch/washjoy-motion-performance/test-results',
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.WASHJOY_TEST_BASE_URL ?? 'http://127.0.0.1:3793',
    browserName: 'chromium',
    serviceWorkers: 'block',
    trace: 'off',
    screenshot: 'off',
    viewport: { width: 390, height: 844 },
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    hasTouch: true,
  },
})
