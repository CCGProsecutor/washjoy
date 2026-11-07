import { test, expect } from '@playwright/test'

test('注册表单按 API 规则校验并可切换登录', async ({ page }) => {
  await page.goto('/washjoy/account/', { waitUntil: 'domcontentloaded' })
  const mode = page.getByRole('group', { name: '登录或注册' })
  await mode.getByRole('button', { name: '注册' }).click()
  await expect(page.getByRole('heading', { name: '创建账户' })).toBeVisible()
  await expect(page.getByPlaceholder('10–128 个字符')).toHaveAttribute('minlength', '10')
  await mode.getByRole('button', { name: '登录' }).click()
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
})

test('游客打开收藏页和后台显示正确的访问入口', async ({ page }) => {
  await page.goto('/washjoy/mine/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('登录后查看你的收藏和评价')).toBeVisible()
  await page.goto('/washjoy/admin/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('请先登录管理员账号')).toBeVisible()
  await expect(page.getByRole('link', { name: '前往登录' })).toHaveAttribute('href', '/washjoy/account/')
})
