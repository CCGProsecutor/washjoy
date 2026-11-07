import { defineConfig } from '@playwright/test'

// The main agent prepares this disposable build; never start the production tree.
const isolatedRoot = process.env.WASHJOY_UI_CHECK_DIR || '/root/scratch/washjoy-b-verify/frontend-next'

export default defineConfig({
  testDir: './tests',
  testMatch: 'warm-directory.spec.ts',
  outputDir: '/root/scratch/washjoy-b-verify/test-results',
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:3791',
    browserName: 'chromium',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [320, 390, 1440].flatMap(width => (['light', 'dark'] as const).map(colorScheme => ({
    name: `${width}-${colorScheme}`,
    use: {
      viewport: { width, height: width === 1440 ? 1000 : 844 },
      colorScheme,
      reducedMotion: 'reduce' as const,
      hasTouch: width < 500,
    },
  }))),
  webServer: {
    cwd: isolatedRoot,
    command: 'bun scripts/server.mjs',
    env: { HOST: '127.0.0.1', PORT: '3791' },
    url: 'http://127.0.0.1:3791/washjoy/',
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
