import { test, expect } from '@playwright/test'

test('地图首页、站长推荐与详情卡片', async ({ page }) => {
  const runtimeErrors: string[] = []
  const unauthorized: string[] = []
  const missingScripts: string[] = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('response', (response) => { if (response.status() === 401) unauthorized.push(response.url()) })
  page.on('response', (response) => { if (response.status() === 404 && response.request().resourceType() === 'script') missingScripts.push(response.url()) })
  await page.goto('/washjoy/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /附近推荐/ })).toBeVisible()
  await expect(page.locator('#washjoy-map')).toBeVisible()
  const search = page.getByPlaceholder('搜店名、区域或体验')
  await expect(search).toBeVisible()
  await search.click() // 手机上聚焦搜索框会把抽屉拉到高档，列表才可点击
  await expect(page.locator('.wj-row').first()).toBeVisible()
  await page.getByRole('button', { name: /站长推荐/ }).click()
  await expect(page.getByRole('button', { name: /站长推荐/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /站长推荐/ }).click()
  const row = page.locator('.wj-row').first()
  await row.click()
  const detail = page.locator('.wj-detail')
  await expect(detail).toBeVisible()
  await expect(detail.getByRole('heading', { level: 2 })).toBeVisible()
  await page.getByRole('button', { name: '关闭门店详情' }).click()
  await expect(detail).toBeHidden()
  await expect(row).toBeFocused() // 关闭后焦点回到触发的门店行
  expect(unauthorized.every((url) => url.endsWith('/auth/me'))).toBe(true)
  expect(missingScripts).toEqual([])
  expect(runtimeErrors).toEqual([])
})

test('分类标签筛选并回到全部', async ({ page }) => {
  await page.goto('/washjoy/', { waitUntil: 'domcontentloaded' })
  const count = page.locator('.wj-sheet h1')
  await expect(count).toContainText('附近推荐')
  const chips = page.getByRole('group', { name: '门店类型' })
  await expect(chips.getByRole('button')).toHaveText(['全部', '洗浴中心', '大众澡堂', '足疗会所', '街边店', '私汤'])
  const all = (await count.textContent()) ?? ''
  await chips.getByRole('button', { name: '私汤' }).click()
  await expect(chips.getByRole('button', { name: '私汤' })).toHaveAttribute('aria-pressed', 'true')
  await expect(count).not.toHaveText(all)
  await chips.getByRole('button', { name: '全部' }).click()
  await expect(count).toHaveText(all)
})
