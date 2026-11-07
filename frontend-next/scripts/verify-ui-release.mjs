import { chromium, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

// Read-only smoke against an already running release. No fixtures, login or writes.
const origin = process.env.WASHJOY_SMOKE_ORIGIN || 'http://127.0.0.1:3792'
const output = process.env.WASHJOY_SMOKE_OUTPUT || '/root/scratch/washjoy-b-verify'
const browser = await chromium.launch({ headless: true })
const errors = []
const mapScripts = []
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 693 }, colorScheme: 'light', reducedMotion: 'reduce', geolocation: { latitude: 32.0603, longitude: 118.7969 }, permissions: ['geolocation'] })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push((error.stack || error.message).replace(/(key|jscode)=[^&\s]+/gi, '$1=[redacted]').slice(0, 900)))
  page.on('response', response => {
    const u = new URL(response.url())
    if (u.hostname.endsWith('amap.com') && response.request().resourceType() === 'script') mapScripts.push({ host: u.hostname, status: response.status() })
  })
  await page.goto(`${origin}/washjoy/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await expect(page.getByRole('heading', { name: '附近，放松一下' })).toBeVisible()
  await expect(page.locator('.wj-venue-card').first()).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('button', { name: '定位到当前位置', exact: true })).toBeEnabled({ timeout: 25000 })
  await expect.poll(() => page.locator('.wj-venue-card').first().evaluate(card => {
    const image = card.querySelector('img')
    return !image || image.complete
  }), { timeout: 20000 }).toBe(true)
  const visibleCards = await page.locator('.wj-venue-card').count()
  const firstImage = await page.locator('.wj-venue-card').first().evaluate(card => {
    const image = card.querySelector('img')
    return { present: Boolean(image), loaded: Boolean(image?.complete && image.naturalWidth > 0) }
  })
  await page.screenshot({ path: `${output}/release-real-directory.png` })
  await page.getByRole('button', { name: '查看地图', exact: true }).click()
  await expect(page.locator('#washjoy-map .amap-layers')).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('地图服务暂不可用，门店列表仍可浏览')).toHaveCount(0)
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${output}/release-real-map.png` })
  await page.getByRole('button', { name: '查看列表', exact: true }).click()
  await expect(page.locator('.wj-venue-card').first()).toBeVisible()
  await page.getByRole('button', { name: '查看地图', exact: true }).click()
  await expect(page.locator('#washjoy-map .amap-layers')).toBeVisible()
  await page.getByRole('button', { name: '查看列表', exact: true }).click()
  await page.goto(`${origin}/washjoy/account/`)
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
  await page.waitForTimeout(500)
  expect(errors).toEqual([])
  expect(mapScripts.length).toBeGreaterThan(0)
  expect(mapScripts.every(item => item.status === 200)).toBe(true)
  const result = { origin, realApi: true, realMapSdk: true, cards: visibleCards, mapScriptResponses: mapScripts.length, firstImage, browserErrors: errors }
  await writeFile(`${output}/real-smoke.json`, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
} finally {
  await browser.close()
}
