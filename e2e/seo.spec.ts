import { test, expect } from '@playwright/test';

test.describe('SEO routing', () => {
  test('/en serves a 200 HTML response, not a redirect loop', async ({ page }) => {
    const response = await page.goto('/en', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1#hero-heading')).toBeVisible();
  });

  test('/sr also serves 200', async ({ page }) => {
    const response = await page.goto('/sr', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBe(200);
  });

  test('/en does not redirect more than once', async ({ request }) => {
    const res = await request.get('/en', { maxRedirects: 0 });
    expect([200, 308]).toContain(res.status());
  });

  test('/sr/about renders without 404 and contains expected SR heading', async ({ page }) => {
    const res = await page.goto('/sr/about', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1', { hasText: 'Šta je DodajUspomenu' })).toBeVisible();
  });

  test('/en/about renders without 404 and contains expected EN heading', async ({ page }) => {
    const res = await page.goto('/en/about', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1', { hasText: 'What is AddMemories' })).toBeVisible();
  });

  test('legacy /about does NOT serve stale mojasvadbaa.com URL', async ({ request }) => {
    const res = await request.get('/about');
    const body = res.status() === 200 ? await res.text() : '';
    expect(body).not.toContain('mojasvadbaa');
  });

  test('/ redirects exactly once to /sr', async ({ request }) => {
    const res = await request.get('/', { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()['location']).toBe('/sr');
  });

  test('/sr exposes Serbian FAQ JSON-LD', async ({ page }) => {
    await page.goto('/sr', { waitUntil: 'domcontentloaded' });
    const ld = await page.locator('script#jsonld-faq').textContent();
    expect(ld).toBeTruthy();
    const data = JSON.parse(ld!);
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity[0].name).toMatch(/Kako funkcioniše DodajUspomenu/);
  });

  test('/en exposes English FAQ JSON-LD', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    const ld = await page.locator('script#jsonld-faq').textContent();
    expect(ld).toBeTruthy();
    const data = JSON.parse(ld!);
    expect(data['@type']).toBe('FAQPage');
    // EN faq.question1 in locales/en/translation.json is exactly: "How does AddMemories work?"
    expect(data.mainEntity[0].name).toMatch(/How does AddMemories work/);
  });
});
