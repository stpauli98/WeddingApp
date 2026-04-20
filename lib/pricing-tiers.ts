// Pricing Tiers Configuration
// Reads from database (PricingPlan table) with hardcoded fallback

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
  guestLimit: number;
  storageDays: number;
  price: number; // in cents (0 for free)
  /** Max width for client-side canvas resize. 0 = no resize. */
  clientResizeMaxWidth: number;
  /** Canvas.toBlob quality param (0.0–1.0). */
  clientQuality: number;
  /**
   * If true, Cloudinary upload runs WITHOUT transformation so the
   * original is stored. If false, upload applies q_auto+f_auto and
   * the stored asset is the compressed derivative.
   */
  storeOriginal: boolean;
  features: TierFeature[];
  limitations?: TierFeature[];
  recommended?: boolean;
}

// Hardcoded fallback — used during build and as default if DB is unavailable
export const PRICING_TIERS: Record<PricingTier, TierConfig> = {
  free: {
    name: { sr: 'Besplatno', en: 'Free' },
    imageLimit: 10,
    guestLimit: 20,
    storageDays: 10,
    price: 0,
    clientResizeMaxWidth: 1280,
    clientQuality: 0.85,
    storeOriginal: false,
    features: [
      { sr: 'Do 10 slika po gostu', en: 'Up to 10 images per guest' },
      { sr: 'Maksimalno 20 gostiju', en: 'Up to 20 guests' },
      { sr: 'Slike se čuvaju 10 dana', en: 'Photos stored for 10 days' },
      { sr: 'Standardni kvalitet (do 1280px)', en: 'Standard quality (up to 1280px)' },
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
    price: 1999,
    clientResizeMaxWidth: 1600,
    clientQuality: 0.9,
    storeOriginal: false,
    features: [
      { sr: 'Do 25 slika po gostu', en: 'Up to 25 images per guest' },
      { sr: 'Do 100 gostiju', en: 'Up to 100 guests' },
      { sr: 'Slike se čuvaju 30 dana', en: 'Photos stored for 30 days' },
      { sr: 'Visok kvalitet (do 1600px)', en: 'High quality (up to 1600px)' },
      { sr: 'Prilagođen QR kod', en: 'Custom QR code' },
      { sr: 'Prioritetna podrška', en: 'Priority support' },
    ],
    recommended: true,
  },
  premium: {
    name: { sr: 'Premium', en: 'Premium' },
    imageLimit: 50,
    guestLimit: 300,
    storageDays: 365,
    price: 3999,
    clientResizeMaxWidth: 2560,
    clientQuality: 0.95,
    storeOriginal: true,
    features: [
      { sr: 'Do 50 slika po gostu', en: 'Up to 50 images per guest' },
      { sr: 'Do 300 gostiju', en: 'Up to 300 guests' },
      { sr: 'Slike se čuvaju 1 godinu', en: 'Photos stored for 1 year' },
      { sr: 'Vrlo visok kvalitet (do 2560px, idealno za A4 štampu)', en: 'Very high quality (up to 2560px, great for A4 print)' },
      { sr: 'Napredni QR kod', en: 'Advanced QR code' },
      { sr: 'Prilagođen brending', en: 'Custom branding' },
      { sr: 'Prilagođene poruke', en: 'Custom messages' },
      { sr: 'Dedicirana podrška', en: 'Dedicated support' },
    ],
    recommended: false,
  },
  unlimited: {
    name: { sr: 'Neograničeno', en: 'Unlimited' },
    imageLimit: 999,
    guestLimit: 9999,
    storageDays: 365,
    price: 5999,
    clientResizeMaxWidth: 0,
    clientQuality: 1.0,
    storeOriginal: true,
    features: [
      { sr: 'Neograničen broj slika po gostu', en: 'Unlimited images per guest' },
      { sr: 'Neograničen broj gostiju', en: 'Unlimited guests' },
      { sr: 'Slike se čuvaju 1 godinu', en: 'Photos stored for 1 year' },
      { sr: 'Originalan kvalitet i rezolucija (arhiva, štampa do A3)', en: 'Original quality and resolution (archive, A3 print)' },
      { sr: 'Napredni QR kod', en: 'Advanced QR code' },
      { sr: 'Prilagođen brending', en: 'Custom branding' },
      { sr: 'Dedicirana podrška', en: 'Dedicated support' },
    ],
    recommended: false,
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

/**
 * Client-side resize params per tier. `maxWidth: 0` znači bez resize-a.
 */
export function getClientResizeParams(tier: PricingTier): {
  maxWidth: number;
  quality: number;
} {
  const config = PRICING_TIERS[tier] ?? PRICING_TIERS.free;
  return {
    maxWidth: config.clientResizeMaxWidth,
    quality: config.clientQuality,
  };
}

/**
 * Kombinovana fraza za quality+resolution (landing card + admin selector).
 */
export function getQualityLabel(tier: PricingTier, language: 'sr' | 'en' = 'sr'): string {
  const labels: Record<PricingTier, { sr: string; en: string }> = {
    free: {
      sr: 'Standard (do 1280px)',
      en: 'Standard (up to 1280px)',
    },
    basic: {
      sr: 'Visok kvalitet (do 1600px)',
      en: 'High quality (up to 1600px)',
    },
    premium: {
      sr: 'Vrlo visok (do 2560px)',
      en: 'Very high (up to 2560px)',
    },
    unlimited: {
      sr: 'Original (puna rezolucija)',
      en: 'Original (full resolution)',
    },
  };
  return (labels[tier] ?? labels.free)[language];
}
