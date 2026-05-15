import { resolveVariantId, type CheckoutTarget } from '@/lib/lemonsqueezy/variants';

describe('resolveVariantId', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      LS_VARIANT_BASIC: 'var_basic_123',
      LS_VARIANT_PREMIUM: 'var_premium_456',
      LS_VARIANT_UPGRADE_BASIC_TO_PREMIUM: 'var_upgrade_789',
      LS_VARIANT_RETENTION_30: 'var_retention_321',
    };
  });
  afterEach(() => { process.env = originalEnv; });

  it('returns basic variant for initial_purchase + basic tier', () => {
    const target: CheckoutTarget = { purpose: 'initial_purchase', tier: 'basic' };
    expect(resolveVariantId(target)).toBe('var_basic_123');
  });

  it('returns premium variant for initial_purchase + premium tier', () => {
    expect(resolveVariantId({ purpose: 'initial_purchase', tier: 'premium' })).toBe('var_premium_456');
  });

  it('returns upgrade variant for basic→premium upgrade', () => {
    expect(resolveVariantId({ purpose: 'upgrade', fromTier: 'basic', toTier: 'premium' }))
      .toBe('var_upgrade_789');
  });

  it('returns basic variant for free→basic upgrade', () => {
    expect(resolveVariantId({ purpose: 'upgrade', fromTier: 'free', toTier: 'basic' }))
      .toBe('var_basic_123');
  });

  it('returns premium variant for free→premium upgrade', () => {
    expect(resolveVariantId({ purpose: 'upgrade', fromTier: 'free', toTier: 'premium' }))
      .toBe('var_premium_456');
  });

  it('returns retention variant', () => {
    expect(resolveVariantId({ purpose: 'retention_extension' })).toBe('var_retention_321');
  });

  it('throws if env var missing', () => {
    delete process.env.LS_VARIANT_BASIC;
    expect(() => resolveVariantId({ purpose: 'initial_purchase', tier: 'basic' }))
      .toThrow(/LS_VARIANT_BASIC/);
  });

  it('rejects free as initial_purchase target (free has no payment)', () => {
    expect(() => resolveVariantId({ purpose: 'initial_purchase', tier: 'free' as any }))
      .toThrow(/free tier has no LS variant/i);
  });
});
