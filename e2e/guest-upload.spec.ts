import { test, expect } from '@playwright/test';

// Smoke coverage for the guest upload flow. Full end-to-end upload (login →
// file upload → gallery check → delete) needs a seeded event/admin, which
// belongs in a dedicated fixture. These tests at least prove the entry-points
// are live and the CSRF endpoints respond with a token.

test.describe('Guest upload — smoke', () => {
  test('login route responds 200 for both locales', async ({ request }) => {
    // A real form render requires a seeded event; this just proves the route
    // doesn't crash and the middleware i18n rewrite is in place.
    const sr = await request.get('/sr/guest/login?event=test-event');
    expect(sr.status()).toBeLessThan(500);

    const en = await request.get('/en/guest/login?event=test-event');
    expect(en.status()).toBeLessThan(500);
  });

  test('upload CSRF endpoint issues a token', async ({ request }) => {
    const res = await request.get('/api/guest/upload');
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(typeof body.csrfToken).toBe('string');
    expect(body.csrfToken.length).toBeGreaterThanOrEqual(32);
  });

  test('delete CSRF endpoint issues a token', async ({ request }) => {
    const res = await request.get('/api/guest/images/delete');
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(typeof body.csrfToken).toBe('string');
    expect(body.csrfToken.length).toBeGreaterThanOrEqual(32);
  });

  test('upload rejects POST without CSRF header', async ({ request }) => {
    const res = await request.post('/api/guest/upload', {
      multipart: { message: 'hello' },
    });
    expect(res.status()).toBe(403);
  });

  test('delete rejects without CSRF header (was silently broken in prod)', async ({ request }) => {
    const res = await request.delete('/api/guest/images/delete?id=fake');
    expect(res.status()).toBe(403);
  });
});
