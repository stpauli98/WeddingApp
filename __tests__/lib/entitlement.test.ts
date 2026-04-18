/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    payment: { findMany: jest.fn() },
  },
}));

import {
  getEffectiveTier,
  hasRetentionExtension,
  maxRetentionOverrideDays,
  isGrandfathered,
  TIER_ORDER,
} from '@/lib/entitlement';
import { prisma } from '@/lib/prisma';

const findMany = prisma.payment.findMany as jest.MockedFunction<any>;

beforeEach(() => jest.clearAllMocks());

describe('getEffectiveTier', () => {
  it('returns free when no payments', async () => {
    findMany.mockResolvedValue([]);
    expect(await getEffectiveTier('e1')).toBe('free');
  });

  it('returns basic with single paid basic', async () => {
    findMany.mockResolvedValue([
      { tier: 'basic', amountCents: 1999, refundedAmountCents: 0 },
    ]);
    expect(await getEffectiveTier('e1')).toBe('basic');
  });

  it('returns highest tier across payments', async () => {
    findMany.mockResolvedValue([
      { tier: 'basic', amountCents: 1999, refundedAmountCents: 0 },
      { tier: 'premium', amountCents: 2000, refundedAmountCents: 0 },
    ]);
    expect(await getEffectiveTier('e1')).toBe('premium');
  });

  it('returns free when premium fully refunded', async () => {
    findMany.mockResolvedValue([
      { tier: 'premium', amountCents: 3999, refundedAmountCents: 3999 },
    ]);
    expect(await getEffectiveTier('e1')).toBe('free');
  });

  it('returns premium when partial refund (>0 remaining)', async () => {
    findMany.mockResolvedValue([
      { tier: 'premium', amountCents: 3999, refundedAmountCents: 1000 },
    ]);
    expect(await getEffectiveTier('e1')).toBe('premium');
  });
});

describe('hasRetentionExtension', () => {
  it('is false for free', async () => {
    findMany.mockResolvedValue([]);
    expect(await hasRetentionExtension('e1')).toBe(false);
  });

  it('is false for basic', async () => {
    findMany.mockResolvedValue([
      { tier: 'basic', amountCents: 1999, refundedAmountCents: 0 },
    ]);
    expect(await hasRetentionExtension('e1')).toBe(false);
  });

  it('is true for premium', async () => {
    findMany.mockResolvedValue([
      { tier: 'premium', amountCents: 3999, refundedAmountCents: 0 },
    ]);
    expect(await hasRetentionExtension('e1')).toBe(true);
  });
});

describe('maxRetentionOverrideDays', () => {
  it('returns 0 for free/basic', () => {
    expect(maxRetentionOverrideDays('free')).toBe(0);
    expect(maxRetentionOverrideDays('basic')).toBe(0);
  });

  it('returns 180 for premium', () => {
    expect(maxRetentionOverrideDays('premium')).toBe(180);
  });

  it('returns 365 for unlimited', () => {
    expect(maxRetentionOverrideDays('unlimited')).toBe(365);
  });
});

describe('isGrandfathered', () => {
  it('returns true when legacyGrandfathered=true', () => {
    expect(isGrandfathered({ legacyGrandfathered: true })).toBe(true);
  });

  it('returns false otherwise', () => {
    expect(isGrandfathered({ legacyGrandfathered: false })).toBe(false);
  });
});

describe('TIER_ORDER', () => {
  it('ranks tiers correctly', () => {
    expect(TIER_ORDER.free).toBeLessThan(TIER_ORDER.basic);
    expect(TIER_ORDER.basic).toBeLessThan(TIER_ORDER.premium);
    expect(TIER_ORDER.premium).toBeLessThan(TIER_ORDER.unlimited);
  });
});
