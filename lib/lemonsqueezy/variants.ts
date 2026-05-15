import type { PricingTier } from '@/lib/pricing-tiers';

export type CheckoutTarget =
  | { purpose: 'initial_purchase'; tier: Exclude<PricingTier, 'free'> }
  | { purpose: 'upgrade'; fromTier: PricingTier; toTier: Exclude<PricingTier, 'free'> }
  | { purpose: 'retention_extension' };

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function resolveVariantId(target: CheckoutTarget): string {
  if (target.purpose === 'initial_purchase') {
    if ((target.tier as PricingTier) === 'free') {
      throw new Error('free tier has no LS variant');
    }
    if (target.tier === 'basic') return requireEnv('LS_VARIANT_BASIC');
    if (target.tier === 'premium') return requireEnv('LS_VARIANT_PREMIUM');
    throw new Error(`Unknown tier: ${(target as any).tier}`);
  }
  if (target.purpose === 'upgrade') {
    if (target.fromTier === 'basic' && target.toTier === 'premium') {
      return requireEnv('LS_VARIANT_UPGRADE_BASIC_TO_PREMIUM');
    }
    if (target.fromTier === 'free' && target.toTier === 'basic') {
      return requireEnv('LS_VARIANT_BASIC');
    }
    if (target.fromTier === 'free' && target.toTier === 'premium') {
      return requireEnv('LS_VARIANT_PREMIUM');
    }
    throw new Error(`Unsupported upgrade path: ${target.fromTier} → ${target.toTier}`);
  }
  if (target.purpose === 'retention_extension') {
    return requireEnv('LS_VARIANT_RETENTION_30');
  }
  throw new Error('Unreachable');
}
