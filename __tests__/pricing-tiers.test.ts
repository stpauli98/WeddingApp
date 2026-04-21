/**
 * @jest-environment node
 */
import {
  getClientResizeParams,
  getQualityLabel,
  PRICING_TIERS,
} from '@/lib/pricing-tiers';

describe('getClientResizeParams', () => {
  it('returns 1280/0.85 for free', () => {
    expect(getClientResizeParams('free')).toEqual({ maxWidth: 1280, quality: 0.85 });
  });

  it('returns 1600/0.9 for basic', () => {
    expect(getClientResizeParams('basic')).toEqual({ maxWidth: 1600, quality: 0.9 });
  });

  it('returns 2560/0.95 for premium', () => {
    expect(getClientResizeParams('premium')).toEqual({ maxWidth: 2560, quality: 0.95 });
  });

  it('returns 2560/0.95 for unlimited (deprecated, mirrors premium)', () => {
    expect(getClientResizeParams('unlimited')).toEqual({ maxWidth: 2560, quality: 0.95 });
  });
});

describe('getQualityLabel', () => {
  it('returns Serbian label for each tier', () => {
    expect(getQualityLabel('free', 'sr')).toBe('Standard (do 1280px)');
    expect(getQualityLabel('basic', 'sr')).toBe('Visok kvalitet (do 1600px)');
    expect(getQualityLabel('premium', 'sr')).toBe('Vrlo visok (do 2560px)');
    expect(getQualityLabel('unlimited', 'sr')).toBe('Original (puna rezolucija)');
  });

  it('returns English label for each tier', () => {
    expect(getQualityLabel('free', 'en')).toBe('Standard (up to 1280px)');
    expect(getQualityLabel('basic', 'en')).toBe('High quality (up to 1600px)');
    expect(getQualityLabel('premium', 'en')).toBe('Very high (up to 2560px)');
    expect(getQualityLabel('unlimited', 'en')).toBe('Original (full resolution)');
  });
});

describe('PRICING_TIERS storeOriginal flag', () => {
  it('free and basic do NOT store originals (compressed pipeline)', () => {
    expect(PRICING_TIERS.free.storeOriginal).toBe(false);
    expect(PRICING_TIERS.basic.storeOriginal).toBe(false);
  });

  it('premium and unlimited store originals', () => {
    expect(PRICING_TIERS.premium.storeOriginal).toBe(true);
    expect(PRICING_TIERS.unlimited.storeOriginal).toBe(true);
  });
});
