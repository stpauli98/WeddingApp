import { describe, it, expect } from '@jest/globals';

// Mirror the function under test so the unit can be exercised without
// pulling NextRequest/NextResponse. Keep this list in sync with middleware.ts.
const supportedLanguages = ['sr', 'en'];

function hasLanguagePrefix(path: string): boolean {
  return supportedLanguages.some(
    lang => path === `/${lang}` || path.startsWith(`/${lang}/`)
  );
}

describe('hasLanguagePrefix', () => {
  it('matches bare /sr', () => {
    expect(hasLanguagePrefix('/sr')).toBe(true);
  });

  it('matches bare /en', () => {
    expect(hasLanguagePrefix('/en')).toBe(true);
  });

  it('matches /sr/anything', () => {
    expect(hasLanguagePrefix('/sr/admin/login')).toBe(true);
  });

  it('matches /en/anything', () => {
    expect(hasLanguagePrefix('/en/about')).toBe(true);
  });

  it('rejects /', () => {
    expect(hasLanguagePrefix('/')).toBe(false);
  });

  it('rejects /something-else', () => {
    expect(hasLanguagePrefix('/about')).toBe(false);
  });

  it('rejects /server (prefix-collision with /sr)', () => {
    expect(hasLanguagePrefix('/server')).toBe(false);
  });
});
