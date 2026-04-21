import i18n from '@/lib/i18n/i18n';

describe('lib/i18n — synchronous initialization', () => {
  it('is initialized at module load (isInitialized === true)', () => {
    expect(i18n.isInitialized).toBe(true);
  });

  it('resolves a real Serbian key without async wait', () => {
    const result = i18n.t('hero.titleLine1');
    expect(result).toBeTruthy();
    expect(result).not.toBe('hero.titleLine1');
  });

  it('switches language to en synchronously and resolves a key', async () => {
    await i18n.changeLanguage('en');
    const result = i18n.t('hero.titleLine1');
    expect(result).toBeTruthy();
    expect(result).not.toBe('hero.titleLine1');
    await i18n.changeLanguage('sr');
  });
});
