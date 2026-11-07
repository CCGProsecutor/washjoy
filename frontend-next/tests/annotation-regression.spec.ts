import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow, installAMapSdk, installApiMock, watchBrowserIntegrity } from './fixtures'

type SdkState = { mapsCreated: number; mapsDestroyed: number; calls: { transit: number; bike: number; car: number }; setVisibleCount(count: number, event?: string): void }
const state = (page: Page) => page.evaluate(() => (window as unknown as { __amapTest: SdkState }).__amapTest)
const cards = (page: Page) => page.getByRole('button', { name: /^查看.+详情$/ })
const openFilters = (page: Page) => page.getByRole('button', { name: '可达时间筛选', exact: true }).click()

test.beforeEach(async ({ page }) => {
  await installApiMock(page)
  await page.route('https://images.invalid/**', route => route.abort('failed'))
  // A missed SDK interception must fail locally rather than reach a paid provider.
  await page.route(/https:\/\/[^/]*amap\.com\//, route => route.abort('blockedbyclient'))
})

test('默认全城30分钟，首批30个公交候选，继续查找后推荐仍二次筛选', async ({ page }) => {
  await installAMapSdk(page)
  const integrity = watchBrowserIntegrity(page)
  await page.goto('/washjoy/')
  await expect(cards(page)).toHaveCount(30)
  expect((await state(page)).calls.transit).toBe(30)
  await openFilters(page)
  await expect(page.getByRole('combobox', { name: '搜索范围' }).locator('option:checked')).toHaveText('全城')
  await expect(page.getByRole('combobox', { name: '可达时间', exact: true }).locator('option:checked')).toHaveText('30 分钟')
  await expect(page.getByRole('button', { name: '公交地铁', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '完成筛选' }).click()
  await page.getByRole('button', { name: '继续查找可达门店', exact: true }).click()
  await expect.poll(async () => (await state(page)).calls.transit).toBe(34)
  await expect(page.getByRole('button', { name: '继续查找可达门店', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '再看 4 家', exact: true }).click()
  await expect(cards(page)).toHaveCount(34)
  await page.getByRole('button', { name: '推荐', exact: true }).click()
  await expect(cards(page)).toHaveCount(17)
  await expect(page.getByRole('button', { name: '查看静安私汤详情', exact: true })).toHaveCount(0)
  await integrity.expectClean()
})

test('切换公交骑行驾车使用各自真实time字段，非驾车结果也影响筛选', async ({ page }) => {
  await installAMapSdk(page, { routeTimes: { transit: 600, bike: 2400, car: 1200 } })
  await page.goto('/washjoy/')
  await expect(cards(page)).toHaveCount(30)
  await openFilters(page)
  const modes = page.getByRole('group', { name: '出行方式' })
  await modes.getByRole('button', { name: '骑行', exact: true }).click()
  await page.getByRole('button', { name: '完成筛选' }).click()
  await expect.poll(async () => (await state(page)).calls.bike).toBeGreaterThanOrEqual(30)
  await expect(cards(page)).toHaveCount(0)
  await openFilters(page)
  await modes.getByRole('button', { name: '驾车', exact: true }).click()
  await page.getByRole('button', { name: '完成筛选' }).click()
  await expect(cards(page)).toHaveCount(30)
  expect((await state(page)).calls.car).toBeGreaterThanOrEqual(30)
})

test('搜索推荐时间同一行，六分类和三模式素材在窄屏深浅主题完整可用', async ({ page }) => {
  await installAMapSdk(page)
  await page.goto('/washjoy/')
  await expect(cards(page)).toHaveCount(30)
  const search = await page.getByRole('searchbox', { name: '搜索门店' }).boundingBox()
  for (const name of ['推荐', '可达时间筛选']) {
    const control = await page.getByRole('button', { name, exact: true }).boundingBox()
    expect(control).not.toBeNull()
    expect(Math.abs(control!.y + control!.height / 2 - (search!.y + search!.height / 2))).toBeLessThanOrEqual(2)
  }
  const categories = page.getByRole('group', { name: '门店类型' })
  await expect(categories.getByRole('button')).toHaveText(['全部', '洗浴', '足疗', '澡堂', '街边', '私汤'])
  const categoryBoxes = await categories.getByRole('button').evaluateAll(nodes => nodes.map(node => ({ top: node.getBoundingClientRect().top, width: node.getBoundingClientRect().width })))
  expect(Math.max(...categoryBoxes.map(box => box.top)) - Math.min(...categoryBoxes.map(box => box.top))).toBeLessThanOrEqual(1)
  expect(Math.max(...categoryBoxes.map(box => box.width)) - Math.min(...categoryBoxes.map(box => box.width))).toBeLessThanOrEqual(1)
  await expectNoHorizontalOverflow(page)
  await openFilters(page)
  const modes = page.getByRole('group', { name: '出行方式' })
  await expect(modes.locator('img')).toHaveCount(3)
  for (const image of await modes.locator('img').all()) {
    const box = await image.boundingBox()
    expect(box?.width).toBe(48)
    expect(box?.height).toBe(48)
    await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true)
  }
  for (const name of ['骑行', '驾车', '公交地铁']) {
    await modes.getByRole('button', { name, exact: true }).click()
    await expect(modes.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true')
  }
  await expectNoHorizontalOverflow(page)
  await page.getByRole('button', { name: '完成筛选' }).click()
  const dock = page.locator('.wj-view-toggle-dock')
  await expect(dock).toHaveCount(1)
  const dockBox = await dock.boundingBox()
  expect(dockBox!.x).toBe(0)
  expect(dockBox!.width).toBe(page.viewportSize()!.width)
  for (const mode of ['查看地图', '查看列表']) {
    const button = page.getByRole('button', { name: mode, exact: true })
    const box = await button.boundingBox()
    expect(Math.abs(box!.x + box!.width / 2 - page.viewportSize()!.width / 2)).toBeLessThanOrEqual(1)
    await button.click()
  }
})

test('地图类别图标无序号，bounds九家显示名称十家隐藏，事件后更新且实例保留', async ({ page }) => {
  await installAMapSdk(page)
  await page.goto('/washjoy/')
  await expect(cards(page)).toHaveCount(30)
  await page.getByRole('button', { name: '查看地图', exact: true }).click()
  const pins = page.locator('#washjoy-map .wj-pin')
  await expect(pins).toHaveCount(30)
  await expect(pins.locator('svg')).toHaveCount(30)
  expect(await pins.evaluateAll(nodes => nodes.some(node => /^\d+$/.test(node.textContent?.trim() ?? '')))).toBe(false)
  await page.evaluate(() => (window as unknown as { __amapTest: SdkState }).__amapTest.setVisibleCount(9, 'moveend'))
  await expect(page.locator('#washjoy-map .wj-pin.has-name')).toHaveCount(9)
  await page.evaluate(() => (window as unknown as { __amapTest: SdkState }).__amapTest.setVisibleCount(10, 'zoomend'))
  await expect(page.locator('#washjoy-map .wj-pin.has-name')).toHaveCount(0)
  await page.evaluate(() => (window as unknown as { __amapTest: SdkState }).__amapTest.setVisibleCount(9, 'moveend'))
  await expect(page.locator('#washjoy-map .wj-pin.has-name')).toHaveCount(9)
  const created = (await state(page)).mapsCreated
  await page.getByRole('button', { name: '查看列表', exact: true }).click()
  await page.getByRole('button', { name: '查看地图', exact: true }).click()
  expect((await state(page)).mapsCreated).toBe(created)
  expect((await state(page)).mapsDestroyed).toBe(0)
  await expect(pins).toHaveCount(30)
})

test('三模式选中短动画素材切换，减少动态时回到静态素材', async ({ page }) => {
  await installAMapSdk(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/washjoy/')
  await openFilters(page)
  const modes = page.getByRole('group', { name: '出行方式' })
  for (const [name, mode] of [['骑行', 'bike'], ['驾车', 'car'], ['公交地铁', 'transit']]) {
    const selected = modes.getByRole('button', { name, exact: true })
    await selected.click()
    await expect(selected.locator('img')).toHaveAttribute('src', `/washjoy/assets/transport/${mode}-selected.webp`)
    await expect.poll(() => selected.locator('img').evaluate(node => (node as HTMLImageElement).currentSrc)).toContain(`${mode}-selected.webp`)
    await expect.poll(() => modes.locator('img[src$="-selected.webp"]').count()).toBe(1)
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(() => modes.getByRole('button', { name: '公交地铁', exact: true }).locator('img').evaluate(node => (node as HTMLImageElement).currentSrc)).toContain('/transit.webp')
})
