import { defineConfig } from '@playwright/test'
import annotations from './playwright.annotation.config'

export default defineConfig({
  ...annotations,
  testMatch: ['detail-content.spec.ts'],
  outputDir: '/root/scratch/washjoy-detail-20261107/test-results',
})
