import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, installAMapSdk, installApiMock, places, watchBrowserIntegrity } from './fixtures'

const description = '后台填写的门店介绍\n保留第二行：<script>window.__unsafeDetail=true</script>'
const services = ['泡汤', '汗蒸', '搓背', '24 小时', '可过夜']

test.beforeEach(async ({ page }) => {
  await installAMapSdk(page)
  await page.route('https://images.invalid/**', route => route.abort('failed'))
  await installApiMock(page, { onApiRequest: async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/public-data')) {
      await route.fulfill({ json: { pois: [
        { ...places[0], description, services: '泡汤|汗蒸，搓背;泡汤\n24 小时', tel: '025-12345678', openTime: '全天营业', address: '南京市' + '很长的街道地址'.repeat(12), tags: ['汗蒸', '可过夜'] },
        { ...places[1], description: '', services: '', service_summary: '', tags: [] },
      ] } })
      return true
    }
    if (url.pathname.endsWith('/reviews') && route.request().method() === 'GET') {
      await route.fulfill({ json: { reviews: [{ id: 1, placeId: url.searchParams.get('placeId'), rating: 4, author: '体验用户', text: '这是用户评价，保持在评价区', created: 1730000000 }] } })
      return true
    }
    return false
  } })
})

test('后台介绍与特色服务显示在门店资料，真实用户评价独立计数', async ({ page }) => {
  const integrity = watchBrowserIntegrity(page)
  await page.goto('/washjoy/')
  await page.getByRole('button', { name: '查看栖霞云汤泉详情' }).click()
  const detail = page.getByRole('dialog', { name: '栖霞云汤泉', exact: true })
  const intro = detail.getByRole('region', { name: '门店介绍', exact: true })
  await expect(intro.locator('p')).toHaveText(description)
  await expect(detail.getByRole('list', { name: '服务标签' }).getByRole('listitem')).toHaveText(services)
  await expect(detail.getByRole('link', { name: '025-12345678' })).toHaveAttribute('href', 'tel:025-12345678')
  const reviews = detail.getByRole('region', { name: /用户评价/ })
  await expect(reviews.locator('.wj-count')).toHaveText('1')
  await expect(reviews.getByText('这是用户评价，保持在评价区')).toBeVisible()
  await expect(reviews.getByText('站长点评')).toHaveCount(0)
  await expect(reviews.getByText(description)).toHaveCount(0)
  expect(await page.evaluate(() => (window as Window & { __unsafeDetail?: boolean }).__unsafeDetail)).toBeUndefined()
  await expectNoHorizontalOverflow(page)
  await integrity.expectClean()
})

test('详情图标尺寸相同，长地址不压缩，动作图标与文字居中', async ({ page }) => {
  await page.goto('/washjoy/')
  await page.getByRole('button', { name: '查看栖霞云汤泉详情' }).click()
  const detail = page.getByRole('dialog', { name: '栖霞云汤泉', exact: true })
  await expect(detail).toBeVisible()
  const geometry = await detail.evaluate(el => {
    const rect = (node: Element) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, center: r.y + r.height / 2 } }
    return {
      icons: [...el.querySelectorAll('svg')].map(rect),
      actions: [...el.querySelectorAll('.wj-actions>.wj-btn')].map(button => ({ button: rect(button), icon: rect(button.querySelector('svg')!) })),
      info: [...el.querySelectorAll('.wj-info-list li')].map(li => ({ icon: rect(li.querySelector('svg')!), text: rect(li.querySelector('span,a')!) })),
    }
  })
  expect(geometry.icons.length).toBeGreaterThan(10)
  for (const icon of geometry.icons) { expect(icon.width).toBe(18); expect(icon.height).toBe(18) }
  for (const action of geometry.actions) expect(Math.abs(action.icon.center - action.button.center)).toBeLessThanOrEqual(1)
  expect(Math.max(...geometry.actions.map(row => row.button.width)) - Math.min(...geometry.actions.map(row => row.button.width))).toBeLessThanOrEqual(1)
  expect(new Set(geometry.actions.map(row => row.button.y)).size).toBe(1)
  expect(new Set(geometry.info.map(row => row.icon.x)).size).toBe(1)
  for (const row of geometry.info) expect(Math.abs(row.icon.y - row.text.y)).toBeLessThanOrEqual(1)
  await expectNoHorizontalOverflow(page)
})

test('切换到没有后台资料的门店，不残留介绍或服务标签，关闭恢复焦点', async ({ page }) => {
  await page.goto('/washjoy/')
  await page.getByRole('button', { name: '查看栖霞云汤泉详情' }).click()
  await expect(page.getByRole('heading', { name: '门店介绍', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  const trigger = page.getByRole('button', { name: '查看静安私汤详情' })
  await trigger.click()
  const detail = page.getByRole('dialog', { name: '静安私汤', exact: true })
  await expect(detail).toBeVisible()
  await expect(detail.getByRole('heading', { name: '门店介绍', exact: true })).toHaveCount(0)
  await expect(detail.getByRole('list', { name: '服务标签' })).toHaveCount(0)
  await expect(detail.getByText(description)).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})
