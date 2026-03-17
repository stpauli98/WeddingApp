// Pricing Tiers Configuration
// Reads from database (PricingPlan table) with hardcoded fallback

export type PricingTier = 'free' | 'basic' | 'premium';

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
  guestLimit: number;
  storageDays: number;
  price: number; // in cents (0 for free)
  features: TierFeature[];
  limitations?: TierFeature[];
  recommended?: boolean;
}

// Hardcoded fallback — used during build and as default if DB is unavailable
export const PRICING_TIERS: Record<PricingTier, TierConfig> = {
  free: {
    name: { sr: 'Besplatno', en: 'Free' },
    imageLimit: 3,
    guestLimit: 20,
    storageDays: 10,
    price: 0,
    features: [
      { sr: 'Do 3 slike po gostu', en: 'Up to 3 images per guest' },
      { sr: 'Maksimalno 20 gostiju', en: 'Up to 20 guests' },
      { sr: 'Slike se čuvaju 10 dana', en: 'Photos stored for 10 days' },
      { sr: 'Standardni QR kod', en: 'Standard QR code' },
      { sr: 'Galerija fotografija', en: 'Photo gallery' },
      { sr: 'Preuzimanje svih slika', en: 'Download all images' },
    ],
  },
  basic: {
    name: { sr: 'Osnovno', en: 'Basic' },
    imageLimit: 25,
    guestLimit: 100,
    storageDays: 30,
    price: 1499,
    features: [
      { sr: 'Do 25 slika po gostu', en: 'Up to 25 images per guest' },
      { sr: 'Do 100 gostiju', en: 'Up to 100 guests' },
      { sr: 'Slike se čuvaju 30 dana', en: 'Photos stored for 30 days' },
      { sr: 'Prilagođen QR kod', en: 'Custom QR code' },
      { sr: 'Prioritetna podrška', en: 'Priority support' },
    ],
    recommended: false,
  },
  premium: {
    name: { sr: 'Premium', en: 'Premium' },
    imageLimit: 50,
    guestLimit: 300,
    storageDays: 365,
    price: 3999,
    features: [
      { sr: 'Do 50 slika po gostu', en: 'Up to 50 images per guest' },
      { sr: 'Do 300 gostiju', en: 'Up to 300 guests' },
      { sr: 'Slike se čuvaju 1 godinu', en: 'Photos stored for 1 year' },
      { sr: 'Napredni QR kod', en: 'Advanced QR code' },
      { sr: 'Prilagođen brending', en: 'Custom branding' },
      { sr: 'Prilagođene poruke', en: 'Custom messages' },
      { sr: 'Dedicirana podrška', en: 'Dedicated support' },
    ],
    recommended: true,
  },
};

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
