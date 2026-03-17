// Pricing Tiers Configuration
// Reads from database (PricingPlan table) with hardcoded fallback

import { PricingTier as PrismaPricingTier } from '@prisma/client';

export type PricingTier = 'free' | 'basic' | 'premium' | 'unlimited';

export interface TierFeature {
  sr: string;
  en: string;
}

export interface TierConfig {
  name: {
    sr: string;
    en: string;
  };
  imageLimit: number;
  price: number; // in cents (0 for free)
  features: TierFeature[];
  recommended?: boolean;
}

// Hardcoded fallback — used during build and as default if DB is unavailable
export const PRICING_TIERS: Record<PricingTier, TierConfig> = {
  free: {
    name: { sr: 'Besplatno', en: 'Free' },
    imageLimit: 10,
    price: 0,
    features: [
      { sr: 'Do 10 slika po gostu', en: 'Up to 10 images per guest' },
      { sr: 'QR kod za pristup', en: 'QR code access' },
      { sr: 'Galerija fotografija', en: 'Photo gallery' },
      { sr: 'Preuzimanje svih slika', en: 'Download all images' },
    ],
  },
  basic: {
    name: { sr: 'Osnovno', en: 'Basic' },
    imageLimit: 25,
    price: 1999,
    features: [
      { sr: 'Do 25 slika po gostu', en: 'Up to 25 images per guest' },
      { sr: 'Prilagođen QR kod', en: 'Custom QR code' },
      { sr: 'Galerija fotografija', en: 'Photo gallery' },
      { sr: 'Preuzimanje svih slika', en: 'Download all images' },
      { sr: 'Prioritetna podrška', en: 'Priority support' },
    ],
    recommended: false,
  },
  premium: {
    name: { sr: 'Premium', en: 'Premium' },
    imageLimit: 50,
    price: 3999,
    features: [
      { sr: 'Do 50 slika po gostu', en: 'Up to 50 images per guest' },
      { sr: 'Prilagođen brending', en: 'Custom branding' },
      { sr: 'Napredni QR kod', en: 'Advanced QR code' },
      { sr: 'Galerija fotografija', en: 'Photo gallery' },
      { sr: 'Preuzimanje svih slika', en: 'Download all images' },
      { sr: 'Prioritetna podrška', en: 'Priority support' },
      { sr: 'Prilagođene poruke', en: 'Custom messages' },
    ],
    recommended: true,
  },
  unlimited: {
    name: { sr: 'Neograničeno', en: 'Unlimited' },
    imageLimit: 999,
    price: 5999,
    features: [
      { sr: 'Neograničeno slika po gostu', en: 'Unlimited images per guest' },
      { sr: 'Potpuna prilagodljivost', en: 'Full customization' },
      { sr: 'White-label opcija', en: 'White-label option' },
      { sr: 'Sve premium funkcije', en: 'All premium features' },
      { sr: 'Dedicirana podrška', en: 'Dedicated support' },
      { sr: 'Napredna analitika', en: 'Advanced analytics' },
    ],
    recommended: false,
  },
};

/**
 * Fetch pricing tiers from database
 * Falls back to hardcoded PRICING_TIERS if DB is unavailable
 */
export async function getPricingTiersFromDB(): Promise<Record<PricingTier, TierConfig>> {
  try {
    // Dynamic import to avoid issues during build
    const { prisma } = await import('@/lib/prisma');

    const plans = await prisma.pricingPlan.findMany({
      where: { active: true },
      include: { features: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });

    if (plans.length === 0) return PRICING_TIERS;

    const result: Record<string, TierConfig> = {};
    for (const plan of plans) {
      result[plan.tier] = {
        name: { sr: plan.nameSr, en: plan.nameEn },
        imageLimit: plan.imageLimit,
        price: plan.price,
        features: plan.features.map((f: { textSr: string; textEn: string }) => ({ sr: f.textSr, en: f.textEn })),
        recommended: plan.recommended,
      };
    }

    return result as Record<PricingTier, TierConfig>;
  } catch {
    // Fallback to hardcoded if DB is unavailable (build time, etc.)
    return PRICING_TIERS;
  }
}

/**
 * Get pricing tier configuration by tier name
 */
export function getPricingTier(tier: string): TierConfig {
  return PRICING_TIERS[tier as PricingTier] || PRICING_TIERS.free;
}

/**
 * Get all available tier options for selection
 */
export function getTierOptions(): { value: PricingTier; label: string }[] {
  return Object.keys(PRICING_TIERS).map((key) => ({
    value: key as PricingTier,
    label: key,
  }));
}

/**
 * Get tier name in specified language
 */
export function getTierName(tier: PricingTier, language: 'sr' | 'en' = 'sr'): string {
  const config = PRICING_TIERS[tier];
  return config ? config.name[language] : PRICING_TIERS.free.name[language];
}

/**
 * Get tier features in specified language
 */
export function getTierFeatures(tier: PricingTier, language: 'sr' | 'en' = 'sr'): string[] {
  const config = PRICING_TIERS[tier];
  return config ? config.features.map((f) => f[language]) : [];
}

/**
 * Format price for display
 */
export function formatPrice(priceInCents: number, currency: string = 'EUR'): string {
  if (priceInCents === 0) return 'Free';
  const amount = (priceInCents / 100).toFixed(2);
  return `${amount} ${currency}`;
}

/**
 * Validate if tier is valid
 */
export function isValidTier(tier: string): tier is PricingTier {
  return tier in PRICING_TIERS;
}
