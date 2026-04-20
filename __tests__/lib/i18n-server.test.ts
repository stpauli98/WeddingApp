import { getServerT } from '@/lib/i18n/server';

describe('lib/i18n/server — per-locale sync t factory', () => {
  it('returns Serbian string for sr locale', () => {
    const t = getServerT('sr');
    const result = t('hero.titleLine1');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('hero.titleLine1');
  });

  it('returns English string for en locale', () => {
    const t = getServerT('en');
    const result = t('hero.titleLine1');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('hero.titleLine1');
  });

  it('sr and en return different strings for same key (locale isolation)', () => {
    const tSr = getServerT('sr');
    const tEn = getServerT('en');
    expect(tSr('hero.titleLine1')).not.toBe(tEn('hero.titleLine1'));
  });

  it('supports interpolation', () => {
    const t = getServerT('sr');
    const result = t('pricing.labels.daysStored', { count: 30 });
    expect(result).toContain('30');
  });

  it('does not share state across calls (concurrent safety)', () => {
    const tSr1 = getServerT('sr');
    const tEn = getServerT('en');
    const tSr2 = getServerT('sr');
    expect(tSr1('hero.titleLine1')).toBe(tSr2('hero.titleLine1'));
    expect(tEn('hero.titleLine1')).not.toBe(tSr1('hero.titleLine1'));
  });
});
