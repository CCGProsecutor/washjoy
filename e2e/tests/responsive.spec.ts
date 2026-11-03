import { test, expect } from '@playwright/test';
import { gotoAndSettle, horizontalOverflow } from './helpers';

const PAGES = ['/washjoy/', '/washjoy/account', '/washjoy/admin', '/washjoy/mine'];
const WIDTHS = [1440, 1024, 768, 390, 320];

for (const width of WIDTHS) {
  test(`批量响应式检查 @ ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of PAGES) {
      await gotoAndSettle(page, path);
      const overflow = await horizontalOverflow(page);
      expect(overflow, `${path} overflow at ${width}px`).toBeLessThanOrEqual(1);
    }
  });
}
