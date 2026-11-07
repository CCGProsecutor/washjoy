import { test, expect, type Page } from '@playwright/test'

const ICON_SIZES = [14, 18, 22]
const FONT_SIZES = [11, 12, 14, 15, 16, 20, 24] // 16 同时是标题 headline 与输入控件的字号

async function openHome(page: Page, { map = true } = {}) {
  await page.goto('/washjoy/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.wj-row').first()).toBeAttached()
  if (map) await expect(page.locator('#washjoy-map .wj-pin').first()).toBeAttached({ timeout: 30000 })
}

test('首页：地图铺满视口且页面不滚动', async ({ page }) => {
  await openHome(page)
  const box = await page.locator('#washjoy-map').boundingBox()
  const viewport = page.viewportSize()!
  expect(Math.round(box!.width)).toBe(viewport.width)
  expect(Math.round(box!.height)).toBe(viewport.height)
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true)
})

test('图标只有 14/18/22 三档，文字只用令牌字号', async ({ page }) => {
  await openHome(page)
  const { icons, fonts } = await page.evaluate(() => {
    const app = document.querySelector('.wj-app')!
    const icons = new Set<number>(), fonts = new Set<number>()
    app.querySelectorAll('svg').forEach((svg) => { if (!svg.closest('#washjoy-map')) { const w = parseFloat(getComputedStyle(svg).width); if (w) icons.add(Math.round(w)) } })
    const walker = document.createTreeWalker(app, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode as Text
      const el = node.parentElement!
      if (!node.textContent?.trim() || el.closest('#washjoy-map')) continue
      fonts.add(Math.round(parseFloat(getComputedStyle(el).fontSize)))
    }
    return { icons: [...icons], fonts: [...fonts] }
  })
  expect(icons.filter((size) => !ICON_SIZES.includes(size))).toEqual([])
  expect(fonts.filter((size) => !FONT_SIZES.includes(size))).toEqual([])
})

test('字体：Inter Variable 优先、只请求一次；输入框不小于 16px', async ({ page }) => {
  const fontRequests: string[] = []
  page.on('request', (request) => { if (/\.woff2?(\?|$)/.test(request.url())) fontRequests.push(request.url()) })
  await openHome(page)
  const family = await page.evaluate(() => getComputedStyle(document.querySelector('.wj-app')!).fontFamily)
  expect(family.startsWith('"Inter Variable"')).toBe(true)
  await page.evaluate(() => document.fonts.ready)
  expect(fontRequests.filter((url) => url.includes('inter-latin-wght'))).toHaveLength(1)
  const searchSize = await page.locator('.wj-search-input').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(searchSize).toBeGreaterThanOrEqual(16)
})

test('点击区域不小于 44px（分类标签通过伪元素扩展，地图标记除外）', async ({ page }) => {
  await openHome(page)
  const small = await page.evaluate(() => [...document.querySelectorAll('.wj-app button, .wj-app a, .wj-app input')]
    .filter((el) => !el.closest('#washjoy-map') && !el.classList.contains('wj-chip'))
    .map((el) => { const r = el.getBoundingClientRect(); return { name: `${el.tagName}.${(el as HTMLElement).className}`.slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) } })
    .filter((item) => item.w > 0 && (item.w < 44 || item.h < 44) && !/wj-row-thumb/.test(item.name)))
  expect(small).toEqual([])
  const chip = await page.locator('.wj-chip').first().evaluate((el) => { const after = getComputedStyle(el, '::after'); return { top: after.top, bottom: after.bottom, h: el.getBoundingClientRect().height } })
  expect(chip.h + Math.abs(parseFloat(chip.top)) + Math.abs(parseFloat(chip.bottom))).toBeGreaterThanOrEqual(44)
})

test('点击门店行打开详情，Esc 关闭后焦点回到该行', async ({ page }) => {
  await openHome(page)
  await page.getByPlaceholder('搜店名、区域或体验').click()
  const row = page.locator('.wj-row').first()
  await row.click()
  await expect(page.locator('.wj-detail')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.wj-detail')).toBeHidden()
  await expect(row).toBeFocused()
})

test('点击地图标记打开详情并高亮该标记', async ({ page }) => {
  await openHome(page) // 不聚焦搜索框，抽屉保持低档，地图可见
  const viewport = page.viewportSize()!
  const target = await page.evaluate(({ width, height }) => {
    const desktop = width >= 900
    const sheetTop = (document.querySelector('.wj-sheet') as HTMLElement).getBoundingClientRect().top
    // 手机：抽屉从底部升起，标记须在抽屉上沿以上；桌面：抽屉是左侧 432px 面板，标记须在其右侧、标签栏以上。
    const box = desktop ? { left: 432 + 40, right: width - 70, top: 110, bottom: height - 100 } : { left: 40, right: width - 70, top: 110, bottom: Math.min(sheetTop, height) - 40 }
    return [...document.querySelectorAll('#washjoy-map .wj-pin')].map((pin) => { const r = pin.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
      .find((p) => p.x > box.left && p.x < box.right && p.y > box.top && p.y < box.bottom) ?? null
  }, viewport)
  expect(target, '可见区域内应有地图标记').not.toBeNull()
  await page.mouse.click(target!.x, target!.y)
  await expect(page.locator('.wj-detail')).toBeVisible()
  await expect(page.locator('.wj-pin.is-selected')).toHaveCount(1)
})

test('标签栏切换与当前项高亮', async ({ page }) => {
  await openHome(page, { map: false })
  const tabs = page.getByRole('navigation', { name: '主导航' })
  await expect(tabs.getByRole('link', { name: '附近' })).toHaveAttribute('aria-current', 'page')
  await tabs.getByRole('link', { name: '收藏' }).click()
  await expect(page.getByRole('heading', { level: 1, name: '收藏' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '收藏' })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '我的' }).click()
  await expect(page.getByRole('heading', { level: 1, name: '欢迎回来' })).toBeVisible()
})

for (const width of [320, 375, 430]) {
  test(`${width}px 宽度下首页、收藏、我的无横向溢出`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 800 } })
    const page = await context.newPage()
    for (const path of ['/washjoy/', '/washjoy/mine/', '/washjoy/account/']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(800)
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBe(width)
    }
    await context.close()
  })
}

test('手机抽屉三档：触摸拖动可在低、中、高档之间切换', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', '触摸手势只在手机项目验证')
  await openHome(page)
  const sheet = page.locator('.wj-sheet')
  const top = () => sheet.evaluate((el) => Math.round(el.getBoundingClientRect().top))
  const drag = (dy: number) => page.evaluate(async (distance) => {
    const grabber = document.querySelector('.wj-grabber')!
    const y0 = Math.round(grabber.getBoundingClientRect().top + 3)
    const touch = (y: number) => new Touch({ identifier: 1, target: grabber, clientX: 195, clientY: y, pageX: 195, pageY: y, screenX: 195, screenY: y })
    const fire = (type: string, y: number) => { const t = touch(y); grabber.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, composed: true, touches: type === 'touchend' ? [] : [t], targetTouches: type === 'touchend' ? [] : [t], changedTouches: [t] })) }
    const steps = 24
    fire('touchstart', y0)
    for (let i = 1; i <= steps; i++) { fire('touchmove', y0 + (distance * i) / steps); await new Promise((r) => setTimeout(r, 30)) }
    await new Promise((r) => setTimeout(r, 200)) // 松手前停住，速度接近 0，按距离吸附
    fire('touchend', y0 + distance)
  }, dy)
  const low = await top()
  await drag(-200); await page.waitForTimeout(900)
  const mid = await top()
  expect(mid).toBeLessThan(low - 100)
  await drag(-260); await page.waitForTimeout(900)
  const high = await top()
  expect(high).toBeLessThan(mid - 100)
  await drag(300); await page.waitForTimeout(900)
  expect(await top()).toBeGreaterThan(high + 100)
})
