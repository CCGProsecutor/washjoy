import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, expectTouchTarget, installAMapSdk, installApiMock, watchBrowserIntegrity } from './fixtures'

test.describe('发布候选：发现与详情', () => {
  test.beforeEach(async ({ page }) => {
    await installApiMock(page)
    await installAMapSdk(page)
  })

  test('首页保留搜索、类型、推荐、30 条分页和可关闭详情', async ({ page }) => {
    const integrity = watchBrowserIntegrity(page)
    await page.goto('/washjoy/', { waitUntil: 'domcontentloaded' })
    const search = page.getByRole('searchbox', { name: '搜索门店' })
    await expect(search).toBeVisible()
    await expect(page.getByText('发现你的放松时刻')).toBeVisible()
    await expect(page.locator('.wj-row')).toHaveCount(30)
    await expect(page.getByRole('button', { name: /再看 4 家/ })).toBeVisible()

    await search.fill('静安私汤')
    await expect(page.locator('.wj-row')).toHaveCount(1)
    await page.getByRole('button', { name: '清除搜索' }).click()

    await page.getByRole('button', { name: '私汤', exact: true }).click()
    await expect(page.locator('.wj-row')).toHaveCount(1)
    await page.getByRole('button', { name: '全部', exact: true }).click()
    await page.getByRole('button', { name: '搜索范围' }).click()
    const radius = page.getByRole('dialog', { name: '搜索范围' })
    await radius.getByRole('button', { name: /5 公里/ }).click()
    await expect(page.getByRole('button', { name: '搜索范围' })).toContainText('5 公里')
    await page.getByRole('button', { name: '站长推荐' }).click()
    await expect(page.getByRole('button', { name: '站长推荐' })).toHaveAttribute('aria-pressed', 'true')

    const row = page.locator('.wj-row').first()
    await row.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText('栖霞云汤泉')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(row).toBeFocused()
    await expectNoHorizontalOverflow(page)
    await integrity.expectClean()
  })

  test('驾车筛选、图片失败、评价接口错误都保留可恢复界面', async ({ page }) => {
    await installApiMock(page, { reviewStatus: 503 })
    await installAMapSdk(page)
    await page.route('https://images.invalid/**', route => route.abort('failed'))
    await page.goto('/washjoy/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('combobox', { name: '驾车时间' }).selectOption('0')
    await expect(page.locator('.wj-row').first()).toBeVisible()
    await page.locator('.wj-row').first().click()
    await expect(page.getByRole('img', { name: '栖霞云汤泉' })).toBeVisible()
    await page.getByRole('button', { name: '写评价' }).click()
    await page.getByRole('textbox', { name: '评价内容' }).fill('服务很稳定')
    await page.getByRole('button', { name: '发布评价' }).click()
    await expect(page.getByRole('alert')).toContainText(/评价服务暂不可用|评价提交失败/)
  })

  test('地图脚本失败时仍展示列表', async ({ page }) => {
    await installApiMock(page)
    await installAMapSdk(page, { failSdk: true })
    await page.goto('/washjoy/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.wj-row').first()).toBeVisible()
    await expect(page.getByText('地图服务暂不可用')).toBeVisible({ timeout: 8000 })
  })
})

test('定位失败后由城市级位置降级，列表仍可用', async ({ page }) => {
  await installApiMock(page)
  await installAMapSdk(page, { failGeolocation: true })
  await page.goto('/washjoy/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('大致位置，点定位按钮重试')).toBeVisible()
  await expect(page.locator('.wj-row').first()).toBeVisible()
})

test.describe('发布候选：账户、收藏和权限', () => {
  test('账户表单保留登录/注册切换及后端错误', async ({ page }) => {
    await installApiMock(page)
    await page.goto('/washjoy/account/', { waitUntil: 'domcontentloaded' })
    const mode = page.getByRole('group', { name: '登录或注册' })
    await expect(mode).toBeVisible()
    await mode.getByRole('button', { name: '注册', exact: true }).click()
    await expect(page.getByRole('heading', { name: '创建账户' })).toBeVisible()
    const password = page.getByPlaceholder('10–128 个字符')
    await expect(password).toHaveAttribute('minlength', '10')
    await mode.getByRole('button', { name: '登录', exact: true }).click()
    await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('收藏只读取当前帐号隔离键，游客和后台拒绝越权', async ({ page }) => {
    await installApiMock(page, { session: { phone: '13800000000', role: 'user', profile: { displayName: '测试用户' }, createdAt: 1 } })
    await page.addInitScript(() => {
      localStorage.setItem('washjoy:saved:13800000000', JSON.stringify(['place-1']))
      localStorage.setItem('washjoy:saved:13900000000', JSON.stringify(['place-2']))
    })
    await page.goto('/washjoy/mine/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('栖霞云汤泉')).toBeVisible()
    await expect(page.getByText('静安私汤')).toBeHidden()
    await page.getByRole('button', { name: '取消收藏 栖霞云汤泉' }).click()
    await expect(page.getByText('栖霞云汤泉')).toBeHidden()

    await installApiMock(page)
    await page.goto('/washjoy/admin/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('请先登录管理员账号')).toBeVisible()
    await expect(page.getByRole('link', { name: '前往登录' })).toHaveAttribute('href', '/washjoy/account/')
  })

  test('管理员保存失败时输入不丢失', async ({ page }) => {
    await installApiMock(page, { session: { phone: '13000000000', role: 'admin', profile: { displayName: '测试站长' }, createdAt: 1 }, saveStatus: 503 })
    await page.goto('/washjoy/admin/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('栖霞云汤泉').first()).toBeVisible()
    await page.getByText('栖霞云汤泉').first().click()
    const name = page.getByLabel('门店名称')
    await name.fill('保存失败仍保留的门店名')
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByRole('alert')).toContainText(/保存失败/)
    await expect(name).toHaveValue('保存失败仍保留的门店名')
  })
})

test.describe('发布候选：视觉与输入设备边界', () => {
  test('深色模式、减少动态和窄屏没有横向溢出，关键触点足够大', async ({ page }) => {
    await installApiMock(page)
    await installAMapSdk(page)
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
    await page.goto('/washjoy/', { waitUntil: 'domcontentloaded' })
    await expectNoHorizontalOverflow(page)
    await expectTouchTarget(page.getByRole('button', { name: '站长推荐' }))
    await expectTouchTarget(page.getByRole('button', { name: '展开筛选' }))
    await expectTouchTarget(page.getByRole('button', { name: '定位到当前位置' }))
    await expect(page.locator('html')).toHaveCSS('color-scheme', /dark/)
  })
})
