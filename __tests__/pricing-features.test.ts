/**
 * @jest-environment node
 */
import { buildDynamicFeatures } from '@/lib/pricing-features';
import type { PricingPlanRow } from '@/lib/pricing-db';
import type { TFunction } from 'i18next';

// Stub i18n: koristi defaultValue argumenta t()
const mockT = ((key: string, opts?: any) => opts?.defaultValue ?? key) as unknown as TFunction;

function makePlan(overrides: Partial<PricingPlanRow> = {}): PricingPlanRow {
  return {
    tier: 'basic',
    name: { sr: 'Osnovno', en: 'Basic' },
    imageLimit: 25,
    guestLimit: 100,
    storageDays: 30,
    price: 1999,
    recommended: true,
    clientResizeMaxWidth: 1600,
    clientQuality: 0.9,
    storeOriginal: false,
    features: [{ sr: 'Prilagođen QR kod', en: 'Custom QR code' }],
    ...overrides,
  };
}

describe('buildDynamicFeatures', () => {
  it('starts with numeric bullets then appends DB features', () => {
    const plan = makePlan();
    const features = buildDynamicFeatures(plan, 'sr', mockT);
    expect(features[0]).toBe('Do 25 slika po gostu');
    expect(features[1]).toBe('Do 100 gostiju');
    expect(features[2]).toBe('Slike se čuvaju 30 dana');
    expect(features[3]).toContain('Visok kvalitet');
    expect(features[4]).toBe('Prilagođen QR kod');
  });

  it('uses storageYear when storageDays >= 365', () => {
    const plan = makePlan({ storageDays: 365 });
    const features = buildDynamicFeatures(plan, 'sr', mockT);
    expect(features[2]).toBe('Slike se čuvaju 1 godinu');
  });

  it('renders English when lang=en', () => {
    const plan = makePlan();
    const features = buildDynamicFeatures(plan, 'en', mockT);
    expect(features[0]).toBe('Up to 25 images per guest');
    expect(features[1]).toBe('Up to 100 guests');
    expect(features[2]).toBe('Photos stored for 30 days');
    expect(features[3]).toContain('High quality');
    expect(features[4]).toBe('Custom QR code');
  });

  it('handles empty DB features array gracefully', () => {
    const plan = makePlan({ features: [] });
    const features = buildDynamicFeatures(plan, 'sr', mockT);
    expect(features.length).toBe(4); // 4 numeric bullets, no DB tail
  });
});
