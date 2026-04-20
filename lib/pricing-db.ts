import { prisma } from '@/lib/prisma';
import { PRICING_TIERS, PricingTier, TierConfig } from '@/lib/pricing-tiers';

/**
 * Shape returned by the pricing DB helper. Closer to PricingPlan row shape
 * than TierConfig so components can reason about DB values directly.
 */
export type PricingPlanRow = {
  tier: PricingTier;
  name: { sr: string; en: string };
  imageLimit: number;
  guestLimit: number;
  storageDays: number;
  price: number;
  recommended: boolean;
  clientResizeMaxWidth: number;
  clientQuality: number;
  storeOriginal: boolean;
  /** Tier-specific non-numeric features (e.g. "Priority support"). */
  features: Array<{ sr: string; en: string }>;
};

/**
 * Read pricing plans from the DB with a hardcoded fallback.
 * Call site: landing page server component + admin APIs that need
 * fresh data without the HTTP roundtrip of /api/pricing.
 */
export async function getPricingPlansFromDb(): Promise<PricingPlanRow[]> {
  try {
    const plans = await prisma.pricingPlan.findMany({
      where: { active: true },
      include: { features: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
    return plans.map((plan: any) => ({
      tier: plan.tier as PricingTier,
      name: { sr: plan.nameSr, en: plan.nameEn },
      imageLimit: plan.imageLimit,
      // guestLimit + storageDays are not on PricingPlan yet — derive from config.
      // TODO: next phase, add these as DB columns. For now, stitch.
      guestLimit: PRICING_TIERS[plan.tier as PricingTier]?.guestLimit ?? 0,
      storageDays: PRICING_TIERS[plan.tier as PricingTier]?.storageDays ?? 0,
      price: plan.price,
      recommended: plan.recommended,
      clientResizeMaxWidth: plan.clientResizeMaxWidth,
      clientQuality: plan.clientQuality,
      storeOriginal: plan.storeOriginal,
      features: plan.features.map((f: any) => ({ sr: f.textSr, en: f.textEn })),
    }));
  } catch (err) {
    console.error('[pricing-db] fallback to hardcoded config:', err);
    return hardcodedFallback();
  }
}

function hardcodedFallback(): PricingPlanRow[] {
  return (Object.entries(PRICING_TIERS) as [PricingTier, TierConfig][]).map(
    ([tier, config]) => ({
      tier,
      name: config.name,
      imageLimit: config.imageLimit,
      guestLimit: config.guestLimit,
      storageDays: config.storageDays,
      price: config.price,
      recommended: config.recommended ?? false,
      clientResizeMaxWidth: config.clientResizeMaxWidth,
      clientQuality: config.clientQuality,
      storeOriginal: config.storeOriginal,
      features: config.features,
    })
  );
}
