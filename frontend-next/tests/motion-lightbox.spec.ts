import { expect, test, type Locator, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow, installAMapSdk, installApiMock, places, watchBrowserIntegrity } from './fixtures'

const session = { phone: '13800000000', role: 'user', profile: { displayName: '动效测试账户' }, createdAt: 1 }
const photos = [1, 2, 3].map(i => `https://images.invalid/motion-${i}.svg`)

async function installHome(page: Page) {
  await installAMapSdk(page)
  await page.route('https://images.invalid/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#635840"/></svg>' }))
  await installApiMock(page, { session, onApiRequest: async route => {
    if (!route.request().url().includes('/public-data')) return false
    await route.fulfill({ json: { pois: [{ ...places[0], photos }, ...places.slice(1)] } })
    return true
  } })
}
async function openLightbox(page: Page) {
  await page.goto('/washjoy/')
  await page.getByRole('button', { name: '查看栖霞云汤泉详情' }).click()
  const pause = page.getByRole('button', { name: '暂停图片轮播' })
  if (await pause.count()) await pause.click()
  const trigger = page.getByRole('button', { name: '放大查看 栖霞云汤泉 图片 1，共 3 张' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: '栖霞云汤泉 图片预览', exact: true })
  await expect(dialog).toBeVisible()
  return { trigger, dialog }
}
async function expectFullSubmit(button: Locator) {
  await expect.poll(async () => button.evaluate(el => {
    const form = el.closest('form')!
    const style = getComputedStyle(form)
    const width = form.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    const box = el.getBoundingClientRect()
    return box.width / width
  })).toBeGreaterThanOrEqual(.95)
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48)
}

for (const mode of ['login', 'register'] as const) test(`${mode}提交按钮整宽，忙碌禁用，失败后可重试成功`, async ({ page }) => {
  let attempts = 0
  let release: (() => void) | undefined
  const responseGate = new Promise<void>(resolve => { release = resolve })
  await installApiMock(page, { onApiRequest: async route => {
    if (!route.request().url().endsWith(`/auth/${mode}`)) return false
    attempts++
    if (attempts === 1) {
      await responseGate
      await route.fulfill({ status: 503, json: { error: '模拟认证失败，请重试' } })
    } else await route.fulfill({ json: { user: session } })
    return true
  } })
  const integrity = watchBrowserIntegrity(page)
  await page.goto('/washjoy/account/')
  if (mode === 'register') {
    await page.getByRole('group', { name: '登录或注册' }).getByRole('button', { name: '注册' }).click()
    await page.getByPlaceholder('最多 40 个字符').fill('动效测试账户')
  }
  await page.getByPlaceholder('请输入手机号').fill(session.phone)
  await page.locator('input[type=password]').fill('test-password-123')
  const submit = page.locator('.wj-auth-submit')
  await expectFullSubmit(submit)
  await submit.click()
  await expect(submit).toBeDisabled()
  await expect(submit).toHaveText('正在处理…')
  await expectFullSubmit(submit)
  await submit.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0 })
  await expect(submit).not.toHaveAttribute('data-wj-pointer-pressed', 'true')
  release!()
  await expect(page.getByRole('alert')).toHaveText('模拟认证失败，请重试')
  await expect(submit).toBeEnabled()
  await expectFullSubmit(submit)
  await expect(page.getByPlaceholder('请输入手机号')).toHaveValue(session.phone)
  await submit.click()
  await expect(page.getByRole('heading', { name: '动效测试账户' })).toBeVisible()
  expect(attempts).toBe(2)
  await expectNoHorizontalOverflow(page)
  await integrity.expectClean()
})

test('灯箱覆盖视口、contain、计数/切图/键盘和关闭焦点', async ({ page }) => {
  await installHome(page)
  const integrity = watchBrowserIntegrity(page)
  const { trigger, dialog } = await openLightbox(page)
  await expect.poll(async () => dialog.evaluate(el => {
    const r = el.getBoundingClientRect()
    return Math.max(Math.abs(r.x), Math.abs(r.y), Math.abs(r.width - innerWidth), Math.abs(r.height - innerHeight))
  })).toBeLessThanOrEqual(1)
  const bg = await dialog.evaluate(el => getComputedStyle(el).backgroundColor)
  const channels = bg.match(/[\d.]+/g)!.slice(0, 3).map(Number)
  expect(Math.max(...channels)).toBeLessThanOrEqual(35)
  await expect(dialog.locator('img')).toHaveCSS('object-fit', 'contain')
  await expect(dialog).toContainText('1 / 3')
  await dialog.getByRole('button', { name: '下一张图片' }).click()
  await expect(dialog.locator('img')).toHaveAttribute('alt', '栖霞云汤泉 图片 2')
  await page.keyboard.press('ArrowRight')
  await expect(dialog).toContainText('3 / 3')
  await page.keyboard.press('ArrowLeft')
  await expect(dialog).toContainText('2 / 3')
  await dialog.getByRole('button', { name: '上一张图片' }).click()
  await expect(dialog).toContainText('1 / 3')
  await page.keyboard.press('Tab')
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await integrity.expectClean()
})

test('双击缩放、还原、切图复位和快速开关保持可操作', async ({ page }) => {
  await installHome(page)
  const integrity = watchBrowserIntegrity(page)
  const { trigger, dialog } = await openLightbox(page)
  const image = dialog.locator('.wj-photo-pan')
  await expect.poll(() => dialog.locator('.wj-photo-entry').evaluate(el => el.getAnimations().filter(a => a.playState === 'running').length)).toBe(0)
  const original = await image.boundingBox()
  await image.dblclick()
  await expect.poll(async () => (await image.boundingBox())!.width).toBeGreaterThan(original!.width * 1.2)
  await dialog.getByRole('button', { name: '还原图片' }).click()
  await expect.poll(async () => Math.abs((await image.boundingBox())!.width - original!.width)).toBeLessThanOrEqual(2.5)
  await image.dblclick()
  await dialog.getByRole('button', { name: '下一张图片' }).click()
  await expect(dialog).toContainText('2 / 3')
  await expect.poll(async () => Math.abs((await image.boundingBox())!.width - original!.width)).toBeLessThanOrEqual(1)
  for (let i = 0; i < 3; i++) {
    await dialog.getByRole('button', { name: '关闭图片预览' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await trigger.click()
    await expect(dialog).toBeVisible()
  }
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await integrity.expectClean()
})

test('触摸横滑切图，放大后拖动受边界约束；减少动态仍可手动缩放', async ({ page }, testInfo) => {
  await installHome(page)
  const { dialog } = await openLightbox(page)
  const stage = dialog.locator('.wj-photo-pan')
  await expect(stage).toBeVisible()
  const box = (await stage.boundingBox())!
  const dispatchTouchDrag = async (fromX: number, toX: number, fromY = box.y + box.height / 2, toY = fromY) => {
    const init = (type: string, x: number, y: number) => ({ bubbles: true, pointerId: 5, pointerType: 'touch', isPrimary: true, button: 0, clientX: x, clientY: y, screenX: x, screenY: y, buttons: type === 'pointerup' ? 0 : 1 })
    await stage.dispatchEvent('pointerdown', init('pointerdown', fromX, fromY))
    await stage.dispatchEvent('pointermove', init('pointermove', toX, toY))
    await stage.dispatchEvent('pointerup', init('pointerup', toX, toY))
  }
  if (testInfo.project.name.startsWith('1440')) await dialog.getByRole('button', { name: '下一张图片' }).click()
  else await dispatchTouchDrag(box.x + box.width * .8, box.x + box.width * .2)
  await expect(dialog).toContainText('2 / 3')
  await dialog.getByRole('button', { name: '放大图片' }).click()
  const image = dialog.locator('img')
  await expect.poll(async () => (await image.boundingBox())!.width).toBeGreaterThan(box.width * .5)
  const before = (await image.boundingBox())!
  await dispatchTouchDrag(box.x + box.width * .8, box.x + box.width * .1)
  await expect(dialog).toContainText('2 / 3')
  const after = (await image.boundingBox())!
  expect(Math.abs(after.x - before.x)).toBeLessThan(after.width * .6)
  await dispatchTouchDrag(box.x + box.width * .5, box.x - 100)
  const boundary = (await image.boundingBox())!
  expect(boundary.x).toBeGreaterThanOrEqual(box.x + box.width - boundary.width - 2)
  if (testInfo.project.use.reducedMotion === 'reduce') {
    await expect(dialog.getByRole('button', { name: '还原图片' })).toBeVisible()
    await dialog.getByRole('button', { name: '还原图片' }).click()
    await expect.poll(async () => Math.abs((await image.boundingBox())!.width - box.width)).toBeLessThanOrEqual(1)
  }
})

test('按压可取消、键盘不残留，地图按钮中心与分类几何稳定', async ({ page }, testInfo) => {
  await installHome(page)
  await page.goto('/washjoy/')
  const toggle = page.getByRole('button', { name: '查看地图', exact: true })
  const before = (await toggle.boundingBox())!
  const centerX = before.x + before.width / 2
  expect(Math.abs(centerX - testInfo.project.use.viewport!.width / 2)).toBeLessThanOrEqual(1)
  await page.mouse.move(centerX, before.y + before.height / 2)
  await page.mouse.down()
  await expect(toggle).toHaveAttribute('data-wj-pointer-pressed', 'true')
  if (testInfo.project.use.reducedMotion === 'reduce') expect(await toggle.evaluate(el => getComputedStyle(el).scale)).toMatch(/^(1|none)$/)
  const during = (await toggle.boundingBox())!
  expect(Math.abs(during.x + during.width / 2 - centerX)).toBeLessThanOrEqual(1)
  await page.mouse.move(centerX, before.y - 30)
  await page.mouse.up()
  await expect(page.locator('.wj-view-toggle')).not.toHaveAttribute('data-wj-pointer-pressed', 'true')
  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: '查看列表', exact: true })).toBeVisible()
  await expect(page.locator('.wj-view-toggle')).not.toHaveAttribute('data-wj-pointer-pressed', 'true')
  await page.getByRole('button', { name: '查看列表', exact: true }).click()
  const categories = page.getByRole('group', { name: '门店类型' })
  expect(await categories.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  await expect(categories.getByRole('button')).toHaveCount(6)
  await expectNoHorizontalOverflow(page)
})

test('收藏反馈不会改变快速切换的最终状态和持久结果', async ({ page }) => {
  await installHome(page)
  await page.goto('/washjoy/')
  const favorite = page.locator('.wj-venue-heart').first()
  await expect(favorite).toHaveAttribute('aria-pressed', 'false')
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'false')
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(page.locator('.wj-venue-heart').first()).toHaveAttribute('aria-pressed', 'true')
})
