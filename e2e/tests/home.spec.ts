import { test, expect } from '@playwright/test';
import { gotoAndSettle, horizontalOverflow } from './helpers';

test('首页渲染门店列表', async ({ page }) => {
  await gotoAndSettle(page, '/washjoy/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('想洗个舒服澡');
  await expect(page.getByText('测试温泉会所').first()).toBeVisible();
  await expect(page.getByText('测试足道馆').first()).toBeVisible();
});

test('首页无横向溢出', async ({ page }) => {
  await gotoAndSettle(page, '/washjoy/');
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
});

test('分类筛选可切换且不报错', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await gotoAndSettle(page, '/washjoy/');
  await page.getByRole('button', { name: '洗浴中心' }).first().click();
  await expect(page.getByText('测试温泉会所').first()).toBeVisible();
  expect(errors).toEqual([]);
});
