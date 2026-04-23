/** @jest-environment jsdom */
// Regression test pinning the client-side language-detector config.
//
// Background: `i18next-browser-languagedetector`'s path lookup uses the
// regex `window.location.pathname.match(/\/([a-zA-Z-]*)/g)`, which returns
// WITH-LEADING-SLASH matches. For `/sr/admin/login` it returns
// `['/sr', '/admin', '/login']` — NOT a bare split that includes an empty
// first entry. So `lookupFromPathIndex: 0` correctly resolves to "sr".
//
// If someone changes this to 1 the detector picks up the second segment —
// commonly "admin" or "guest" — as the language, which triggers a visible
// `i18next: languageChanged admin` event in dev tools and a brief flash
// of fallback rendering during navigation between /sr/admin/login and
// /sr/admin/register.

Object.defineProperty(window, 'location', {
  value: new URL('http://localhost/sr/admin/login'),
  writable: true,
});

import i18n from '@/lib/i18n/i18n';

describe('i18n client detection config', () => {
  it('lookupFromPathIndex must be 0 — the library returns `/sr` at index 0 (with leading slash stripped)', () => {
    const detector = (i18n as unknown as {
      services: {
        languageDetector: { options: { lookupFromPathIndex: number; order: string[] } };
      };
    }).services.languageDetector;
    expect(detector.options.lookupFromPathIndex).toBe(0);
  });

  it('path is the first detection source so URL locale beats cookie', () => {
    const detector = (i18n as unknown as {
      services: {
        languageDetector: { options: { lookupFromPathIndex: number; order: string[] } };
      };
    }).services.languageDetector;
    expect(detector.options.order[0]).toBe('path');
  });
});
