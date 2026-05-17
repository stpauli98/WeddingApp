import { getLocalizedProductCopy } from '@/lib/lemonsqueezy/product-copy';

describe('getLocalizedProductCopy', () => {
  describe('initial_purchase', () => {
    it('returns SR copy for basic tier', () => {
      const copy = getLocalizedProductCopy({ purpose: 'initial_purchase', tier: 'basic' }, 'sr');
      expect(copy.name).toBe('Svadbeni paket — Basic');
      expect(copy.description).toMatch(/7 slika/);
    });
    it('returns EN copy for basic tier', () => {
      const copy = getLocalizedProductCopy({ purpose: 'initial_purchase', tier: 'basic' }, 'en');
      expect(copy.name).toBe('Wedding Package — Basic');
      expect(copy.description).toMatch(/7 photos/);
    });
    it('returns SR copy for premium tier', () => {
      const copy = getLocalizedProductCopy({ purpose: 'initial_purchase', tier: 'premium' }, 'sr');
      expect(copy.name).toBe('Svadbeni paket — Premium');
      expect(copy.description).toMatch(/25 slika/);
    });
    it('returns EN copy for premium tier', () => {
      const copy = getLocalizedProductCopy({ purpose: 'initial_purchase', tier: 'premium' }, 'en');
      expect(copy.name).toBe('Wedding Package — Premium');
      expect(copy.description).toMatch(/25 photos/);
    });
  });

  describe('upgrade', () => {
    it('returns SR copy for free→basic', () => {
      const copy = getLocalizedProductCopy({ purpose: 'upgrade', fromTier: 'free', toTier: 'basic' }, 'sr');
      expect(copy.name).toBe('Nadogradnja na Basic');
      expect(copy.description).toMatch(/Basic paket/);
    });
    it('returns EN copy for free→premium', () => {
      const copy = getLocalizedProductCopy({ purpose: 'upgrade', fromTier: 'free', toTier: 'premium' }, 'en');
      expect(copy.name).toBe('Upgrade to Premium');
      expect(copy.description).toMatch(/Premium package/);
    });
    it('returns SR copy for basic→premium', () => {
      const copy = getLocalizedProductCopy({ purpose: 'upgrade', fromTier: 'basic', toTier: 'premium' }, 'sr');
      expect(copy.name).toBe('Nadogradnja Basic → Premium');
      expect(copy.description).toMatch(/razlik/);
    });
    it('returns EN copy for basic→premium', () => {
      const copy = getLocalizedProductCopy({ purpose: 'upgrade', fromTier: 'basic', toTier: 'premium' }, 'en');
      expect(copy.name).toBe('Upgrade Basic → Premium');
      expect(copy.description).toMatch(/difference/);
    });
  });

  describe('retention_extension', () => {
    it('returns SR copy', () => {
      const copy = getLocalizedProductCopy({ purpose: 'retention_extension' }, 'sr');
      expect(copy.name).toBe('Produženje čuvanja — 30 dana');
      expect(copy.description).toMatch(/30 dana/);
    });
    it('returns EN copy', () => {
      const copy = getLocalizedProductCopy({ purpose: 'retention_extension' }, 'en');
      expect(copy.name).toBe('Retention Extension — 30 days');
      expect(copy.description).toMatch(/30 days/);
    });
  });

  describe('locale fallback', () => {
    it('falls back to SR when locale is undefined', () => {
      const copy = getLocalizedProductCopy({ purpose: 'initial_purchase', tier: 'basic' }, undefined as any);
      expect(copy.name).toBe('Svadbeni paket — Basic');
    });
    it('falls back to SR when locale is unknown string', () => {
      const copy = getLocalizedProductCopy({ purpose: 'initial_purchase', tier: 'basic' }, 'fr' as any);
      expect(copy.name).toBe('Svadbeni paket — Basic');
    });
  });
});
