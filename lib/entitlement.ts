import { prisma } from '@/lib/prisma';
import type { PricingTier } from '@prisma/client';

export const TIER_ORDER: Record<PricingTier, number> = {
  free: 0,
  basic: 1,
  premium: 2,
  unlimited: 3,
};

/**
 * Effective tier derived from successful Payment rows.
 * Filters out fully-refunded payments. Returns 'free' if no qualifying payments.
 * THIS is the source of truth for entitlement — never trust Event.pricingTier
 * for security-critical decisions.
 */
export async function getEffectiveTier(eventId: string): Promise<PricingTier> {
  const payments = await prisma.payment.findMany({
    where: { eventId, status: { in: ['paid', 'partial'] } },
    select: { tier: true, amountCents: true, refundedAmountCents: true },
  });
  return payments
    .filter((p) => p.amountCents - p.refundedAmountCents > 0)
    .reduce<PricingTier>(
      (max, p) => (TIER_ORDER[p.tier] > TIER_ORDER[max] ? p.tier : max),
      'free'
    );
}

export async function hasRetentionExtension(eventId: string): Promise<boolean> {
  const tier = await getEffectiveTier(eventId);
  return TIER_ORDER[tier] >= TIER_ORDER.premium;
}

/**
 * Max retention override admin may set, per tier.
 * Server-side validated in /api/admin/events/extend-retention.
 */
export function maxRetentionOverrideDays(tier: PricingTier): number {
  const caps: Record<PricingTier, number> = {
    free: 0,
    basic: 0,
    premium: 180,
    unlimited: 365,
  };
  return caps[tier] ?? 0;
}

/**
 * Grandfather exception for events created before payment infrastructure.
 * Exempts from retention cap + audit-drift "paid tier without Payment" check.
 */
export function isGrandfathered(event: { legacyGrandfathered: boolean }): boolean {
  return event.legacyGrandfathered === true;
}
