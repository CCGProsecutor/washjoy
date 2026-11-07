import { defineConfig } from '@playwright/test'

// The main agent starts an isolated test build. Never boot the production tree.
export default defineConfig({
  testDir: './tests',
  testMatch: ['annotation-regression.spec.ts', 'warm-directory.spec.ts'],
  outputDir: '/root/scratch/washjoy-annotation-check/test-results',
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.WASHJOY_TEST_BASE_URL ?? 'http://127.0.0.1:3792',
    browserName: 'chromium',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [320, 390, 768, 1440].flatMap(width => (['light', 'dark'] as const).map(colorScheme => ({
    name: `${width}-${colorScheme}`,
    use: {
      viewport: { width, height: width === 1440 ? 1000 : 844 },
      colorScheme,
      reducedMotion: 'reduce' as const,
      hasTouch: width < 500,
    },
  }))),
})
