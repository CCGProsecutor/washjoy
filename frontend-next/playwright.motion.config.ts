import { defineConfig } from '@playwright/test'

// The main agent supplies an isolated build. No server or real API is started here.
export default defineConfig({
  testDir: './tests',
  testMatch: 'motion-lightbox.spec.ts',
  outputDir: '/root/scratch/washjoy-motion/test-results',
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: process.env.WASHJOY_TEST_BASE_URL ?? 'http://127.0.0.1:3793',
    browserName: 'chromium',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [320, 390, 768, 1440].flatMap(width => (['light', 'dark'] as const).flatMap(colorScheme => (['no-preference', 'reduce'] as const).map(reducedMotion => ({
    name: `${width}-${colorScheme}-${reducedMotion}`,
    use: { viewport: { width, height: width === 1440 ? 1000 : 844 }, colorScheme, reducedMotion, hasTouch: width < 500 },
  })))),
})
