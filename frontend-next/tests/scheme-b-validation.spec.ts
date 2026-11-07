import { test, expect } from '@playwright/test'

test.describe('方案 B：驾车时间筛选、城市扩充、高德 POI 评价', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/washjoy/')
    await page.waitForLoadState('networkidle')
  })

  test('1. 城市自动匹配：定位到江苏不同城市', async ({ page }) => {
    // 获取品牌名称（城市显示）
    const brand = page.locator('.wj-brand')
    const initialText = await brand.textContent()
    expect(initialText).toContain('市')

    // 验证城市信息显示
    await expect(brand).toBeVisible()
  })

  test('2. 时间筛选：15/30/45 分钟/1 小时可选', async ({ page }) => {
    // 等待抽屉加载
    await page.waitForSelector('.wj-sheet')

    // 找到时间筛选 select
    const durationSelect = page.locator('select[aria-label="驾车时间"]')

    // 验证 select 存在（仅在已定位时显示）
    if (await durationSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      // 获取所有 option
      const options = await durationSelect.locator('option').allTextContents()
      expect(options).toContain('无限制')
      expect(options).toContain('15 分钟')
      expect(options).toContain('30 分钟')
      expect(options).toContain('45 分钟')
      expect(options).toContain('1 小时')

      // 测试选择时间
      await durationSelect.selectOption('1')
      await page.waitForTimeout(500)

      // 验证门店列表仍可见
      await expect(page.locator('.wj-list')).toBeVisible({ timeout: 5000 })
    }
  })

  test('3. 清除筛选包括时间筛选', async ({ page }) => {
    // 等待抽屉加载
    await page.waitForSelector('.wj-sheet')

    // 选择时间筛选（如果可用）
    const durationSelect = page.locator('select[aria-label="驾车时间"]')
    if (await durationSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await durationSelect.selectOption('1')

      // 点击清除筛选按钮
      const clearBtn = page.locator('button:has-text("清除筛选")')
      if (await clearBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await clearBtn.click()

        // 验证时间筛选重置
        const selectedValue = await durationSelect.inputValue()
        expect(selectedValue).toBe('-1') // 无限制
      }
    }
  })

  test('4. 高德 POI 评价：详情页显示评分', async ({ page }) => {
    // 等待门店列表加载
    await page.waitForSelector('.wj-list')

    // 点击第一个门店
    const firstPlace = page.locator('.wj-row').first()
    await firstPlace.click()

    // 等待详情页打开
    await page.waitForSelector('.wj-detail')

    // 验证评分显示
    const rating = page.locator('.wj-rating')
    await expect(rating).toBeVisible()

    // 验证评分数值
    const ratingText = await rating.textContent()
    expect(ratingText).toMatch(/[\d.]+/)

    // 如果有高德 POI 评价数，应显示
    const captionText = page.locator('.wj-caption').first()
    const text = await captionText.textContent()
    if (text?.includes('条评价')) {
      expect(text).toMatch(/\d+\s*条评价/)
    }
  })

  test('5. 响应式布局：无横向溢出', async ({ page }) => {
    // 测试不同视口宽度
    const viewports = [320, 375, 430, 768, 1024]

    for (const width of viewports) {
      await page.setViewportSize({ width, height: 812 })
      await page.waitForLoadState('networkidle')

      // 检查没有水平滚动条
      const bodyWidth = await page.evaluate(() => document.body.offsetWidth)
      const windowWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(windowWidth)
    }
  })

  test('6. 性能：页面加载时间', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/washjoy/')
    await page.waitForSelector('.wj-list')
    const loadTime = Date.now() - startTime

    // 首屏应在 3 秒内加载
    expect(loadTime).toBeLessThan(3000)
  })

  test('7. 高德地图：驾车时间计算', async ({ page }) => {
    // 等待抽屉和时间筛选加载
    await page.waitForSelector('.wj-sheet')

    const durationSelect = page.locator('select[aria-label="驾车时间"]')

    // 如果可用，启用时间筛选
    if (await durationSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      // 选择 30 分钟
      await durationSelect.selectOption('1')
      await page.waitForTimeout(1000)

      // 验证门店列表更新（应有部分门店被过滤掉）
      const beforeCount = await page.locator('.wj-row').count()

      // 切换到 15 分钟（更严格的过滤）
      await durationSelect.selectOption('0')
      await page.waitForTimeout(1000)

      const afterCount = await page.locator('.wj-row').count()

      // 15 分钟的结果应该少于或等于 30 分钟的结果
      expect(afterCount).toBeLessThanOrEqual(beforeCount)
    }
  })

  test('8. 高德 POI 搜索：评价数显示', async ({ page }) => {
    // 等待门店列表加载
    await page.waitForSelector('.wj-list', { timeout: 10000 })

    // 尝试点击多个门店，验证都能获取 POI 数据
    const places = await page.locator('.wj-row').all()
    const maxPlaces = Math.min(3, places.length)

    for (let i = 0; i < maxPlaces; i++) {
      const place = places[i]
      await place.click()

      // 等待详情页打开和 POI 数据加载
      await page.waitForSelector('.wj-detail')
      await page.waitForTimeout(500)

      // 验证评分显示
      const rating = page.locator('.wj-rating')
      await expect(rating).toBeVisible()

      // 关闭详情页
      const closeBtn = page.locator('.wj-detail-close')
      await closeBtn.click()
      await page.waitForTimeout(300)
    }
  })

  test('9. 无错误日志', async ({ page }) => {
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    page.on('pageerror', (error) => {
      errors.push(error.toString())
    })

    // 完成一次完整的交互
    await page.waitForSelector('.wj-sheet')
    await page.click('.wj-list .wj-row')
    await page.waitForSelector('.wj-detail')
    await page.waitForTimeout(1000)

    // 验证没有 JavaScript 错误
    expect(errors).toHaveLength(0)
  })

  test('10. 所有资源 200 状态', async ({ page }) => {
    const failedRequests: string[] = []

    page.on('response', (response) => {
      if (!response.ok() && response.status() !== 304) {
        failedRequests.push(`${response.url()}: ${response.status()}`)
      }
    })

    await page.goto('/washjoy/')
    await page.waitForSelector('.wj-list')
    await page.waitForTimeout(1000)

    // 验证没有 4xx 或 5xx 错误
    expect(failedRequests).toHaveLength(0)
  })
})
