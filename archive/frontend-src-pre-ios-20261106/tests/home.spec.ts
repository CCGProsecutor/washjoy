import { test, expect } from '@playwright/test'

test('地图首页与详情抽屉', async ({ page }) => {
  const runtimeErrors: string[] = []
  const unauthorized: string[] = []
  const missingScripts: string[] = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('response', (response) => { if (response.status() === 401) unauthorized.push(response.url()) })
  page.on('response', (response) => { if (response.status() === 404 && response.request().resourceType() === 'script' && response.url().startsWith('http://127.0.0.1:3780/')) missingScripts.push(response.url()) })
  await page.goto('/washjoy/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /附近推荐/ })).toBeVisible()
  await expect(page.locator('.map-stage')).toBeVisible()
  await expect(page.getByPlaceholder('搜店名、区域或体验')).toBeVisible()
  await expect(page.locator('.place-card').first()).toBeVisible()
  await page.getByRole('button', { name: /站长推荐/ }).click()
  await expect(page.getByRole('button', { name: /站长推荐/ })).toHaveAttribute('aria-pressed', 'true')
  const card = page.locator('.place-card').first()
  if (await card.count()) {
    await card.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: '关闭门店详情' }).click()
  }
  expect(unauthorized.every((url) => url.endsWith('/auth/me'))).toBe(true)
  expect(missingScripts).toEqual([])
  expect(runtimeErrors).toEqual([])
})

test('移动端无横向溢出与账号路由', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto('/washjoy/', { waitUntil: 'domcontentloaded' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.goto('/washjoy/account/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
  await context.close()
})
