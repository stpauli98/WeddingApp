/** @jest-environment node */
import { describe, it, expect } from '@jest/globals';
import { GET } from '@/app/sitemap.xml/route';

describe('sitemap.xml route', () => {
  it('emits localized URLs for every public page', async () => {
    const res = await GET();
    const body = await res.text();

    const required = [
      'https://www.dodajuspomenu.com/sr',
      'https://www.dodajuspomenu.com/en',
      'https://www.dodajuspomenu.com/sr/about',
      'https://www.dodajuspomenu.com/en/about',
      'https://www.dodajuspomenu.com/sr/privacy',
      'https://www.dodajuspomenu.com/en/privacy',
      'https://www.dodajuspomenu.com/sr/terms',
      'https://www.dodajuspomenu.com/en/terms',
      'https://www.dodajuspomenu.com/sr/cookies',
      'https://www.dodajuspomenu.com/en/cookies',
      'https://www.dodajuspomenu.com/sr/kontakt',
      'https://www.dodajuspomenu.com/en/kontakt',
    ];

    for (const url of required) {
      if (!body.includes(`<loc>${url}</loc>`)) {
        throw new Error(`sitemap missing ${url}`);
      }
      expect(body).toContain(`<loc>${url}</loc>`);
    }
  });

  it('uses a stable lastmod (does not flip between requests)', async () => {
    const a = await (await GET()).text();
    await new Promise(r => setTimeout(r, 1100));
    const b = await (await GET()).text();
    const mA = a.match(/<lastmod>([^<]+)<\/lastmod>/);
    const mB = b.match(/<lastmod>([^<]+)<\/lastmod>/);
    expect(mA?.[1]).toBe(mB?.[1]);
  });

  it('declares the image namespace', async () => {
    const body = await (await GET()).text();
    expect(body).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
  });

  it('emits exactly 12 <loc> entries', async () => {
    const body = await (await GET()).text();
    const matches = body.match(/<loc>/g) ?? [];
    expect(matches.length).toBe(12);
  });
});
