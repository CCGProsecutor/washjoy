import { test, expect } from '@playwright/test';
import { gotoAndSettle, horizontalOverflow } from './helpers';

test('账户页展示登录表单', async ({ page }) => {
  await gotoAndSettle(page, '/washjoy/account');
  await expect(page.getByPlaceholder('中国大陆手机号')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await page.getByRole('button', { name: '注册' }).first().click();
  await expect(page.getByPlaceholder('昵称（选填）')).toBeVisible();
});

test('后台页可加载（未登录时给出登录提示）', async ({ page }) => {
  await gotoAndSettle(page, '/washjoy/admin');
  await expect(page.locator('body')).toContainText(/管理员|登录/);
});

test('我的页面可加载', async ({ page }) => {
  await gotoAndSettle(page, '/washjoy/mine');
  await expect(page.locator('body')).not.toBeEmpty();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
});
