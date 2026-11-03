import type { Page } from '@playwright/test';
import publicData from '../fixtures/public-data.json';

/** Route every API call to deterministic fixtures and block third-party requests. */
export async function mockBackend(page: Page) {
  await page.route('**/washjoy/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/public-data')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(publicData) });
    }
    if (url.includes('/auth/me')) {
      return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: '请先登录' }) });
    }
    if (url.includes('/reviews')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reviews: [] }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  // AMap SDK and OSS images are not needed for layout assertions; drop them for stable runs.
  await page.route('**://*.amap.com/**', (route) => route.abort());
  await page.route('**://fehd.oss-cn-shanghai.aliyuncs.com/**', (route) => route.abort());
}

export async function gotoAndSettle(page: Page, path: string) {
  await mockBackend(page);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
}

export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
}
