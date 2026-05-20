import { test, expect } from '@playwright/test';

test.describe('SEO routing', () => {
  test('/en serves a 200 HTML response, not a redirect loop', async ({ page }) => {
    const response = await page.goto('http://localhost:3000/en', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1#hero-heading')).toBeVisible();
  });

  test('/sr also serves 200', async ({ page }) => {
    const response = await page.goto('http://localhost:3000/sr', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBe(200);
  });

  test('/en does not redirect more than once', async ({ request }) => {
    const res = await request.get('http://localhost:3000/en', { maxRedirects: 0 });
    expect([200, 308]).toContain(res.status());
  });
});
