/** @jest-environment jsdom */
// Regression test pinning the client-side language-detector config.
//
// Background: `pathname.split('/')` of `/sr/guest/dashboard` yields
// `['', 'sr', 'guest', 'dashboard']`. If `lookupFromPathIndex` is 0 the
// detector reads the empty segment, silently falls through to the cookie,
// and causes a hydration mismatch on every /sr/ or /en/ URL when the cookie
// holds a different value. Correct value is 1.
//
// This test only checks the config — we don't assert `i18n.language` here
// because the detector's language resolution is part of the module-level
// singleton that leaks across Jest test files in the same worker. Config
// validation is enough to prevent a silent revert of the one-line fix.

// jsdom default URL is `about:blank`; give the detector a realistic path
// so any assertion that inspects the resolved state still has the right
// input available if extended later.
Object.defineProperty(window, 'location', {
  value: new URL('http://localhost/sr/guest/dashboard'),
  writable: true,
});

import i18n from '@/lib/i18n/i18n';

describe('i18n client detection config', () => {
  it('lookupFromPathIndex must be 1 — index 0 is empty string for "/sr/..."', () => {
    const detector = (i18n as unknown as {
      services: {
        languageDetector: { options: { lookupFromPathIndex: number; order: string[] } };
      };
    }).services.languageDetector;

    expect(detector.options.lookupFromPathIndex).toBe(1);
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
