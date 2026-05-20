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

  for (const slug of ['privacy', 'terms', 'cookies', 'kontakt'] as const) {
    for (const lang of ['sr', 'en'] as const) {
      test(`/${lang}/${slug} returns 200`, async ({ request }) => {
        const res = await request.get(`/${lang}/${slug}`);
        expect(res.status()).toBe(200);
      });
    }
  }

  test('/sr exposes Product JSON-LD with three EUR offers', async ({ page }) => {
    await page.goto('/sr', { waitUntil: 'domcontentloaded' });
    const ld = await page.locator('script#jsonld-product-sr').textContent();
    expect(ld).toBeTruthy();
    const data = JSON.parse(ld!);
    expect(data['@type']).toBe('Product');
    expect(data.offers).toHaveLength(3);
    expect(data.offers.every((o: any) => o.priceCurrency === 'EUR')).toBe(true);
  });

  test('/sr exposes LocalBusiness JSON-LD with BiH address', async ({ page }) => {
    await page.goto('/sr', { waitUntil: 'domcontentloaded' });
    const ld = await page.locator('script#jsonld-localbusiness').textContent();
    expect(ld).toBeTruthy();
    const data = JSON.parse(ld!);
    expect(data['@type']).toBe('LocalBusiness');
    expect(data.address.addressCountry).toBe('BA');
    expect(data.taxID).toBe('4513996760008');
  });

  test('/sr exposes SoftwareApplication JSON-LD with lowest tier price', async ({ page }) => {
    await page.goto('/sr', { waitUntil: 'domcontentloaded' });
    const ld = await page.locator('script#jsonld-software-sr').textContent();
    expect(ld).toBeTruthy();
    const data = JSON.parse(ld!);
    expect(data['@type']).toBe('SoftwareApplication');
    expect(data.applicationCategory).toBe('MultimediaApplication');
    expect(data.offers.priceCurrency).toBe('EUR');
  });

  for (const path of ['/sr/about', '/en/about', '/sr/privacy', '/en/privacy', '/sr/terms', '/en/terms', '/sr/cookies', '/en/cookies', '/sr/kontakt', '/en/kontakt'] as const) {
    test(`${path} exposes BreadcrumbList JSON-LD`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const ld = await page.locator('script[id^="breadcrumb-"]').textContent();
      expect(ld).toBeTruthy();
      const data = JSON.parse(ld!);
      expect(data['@type']).toBe('BreadcrumbList');
      expect(data.itemListElement.length).toBeGreaterThanOrEqual(2);
    });
  }
});
