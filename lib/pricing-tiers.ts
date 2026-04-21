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
    imageLimit: 3,
    guestLimit: 20,
    storageDays: 30,
    price: 0,
    clientResizeMaxWidth: 1280,
    clientQuality: 0.85,
    storeOriginal: false,
    features: [
      { sr: 'Standardni QR kod', en: 'Standard QR code' },
      { sr: 'Galerija fotografija', en: 'Photo gallery' },
      { sr: 'Preuzimanje svih slika', en: 'Download all images' },
    ],
  },
  basic: {
    name: { sr: 'Osnovno', en: 'Basic' },
    imageLimit: 7,
    guestLimit: 100,
    storageDays: 30,
    price: 2500, // €25
    clientResizeMaxWidth: 1600,
    clientQuality: 0.9,
    storeOriginal: false,
    features: [
      { sr: 'Prilagođen QR kod', en: 'Custom QR code' },
      { sr: 'Prioritetna podrška', en: 'Priority support' },
    ],
    recommended: true,
  },
  premium: {
    name: { sr: 'Premium', en: 'Premium' },
    imageLimit: 25,
    guestLimit: 300,
    storageDays: 30,
    price: 7500, // €75
    clientResizeMaxWidth: 2560,
    clientQuality: 0.95,
    storeOriginal: true,
    features: [
      { sr: 'Napredni QR kod', en: 'Advanced QR code' },
      { sr: 'Prilagođen brending', en: 'Custom branding' },
      { sr: 'Prilagođene poruke', en: 'Custom messages' },
      { sr: 'Dedicirana podrška', en: 'Dedicated support' },
    ],
    recommended: false,
  },
  // DEPRECATED 2026-04-20: konzolidacija 4→3 tiera. PricingPlan row postaje
  // active:false u DB-u (seed radi Step 2 niže). Config entry zadržan radi
  // Prisma enum compatibility + back-compat sa postojećim event-ima na
  // 'unlimited' tier-u (oni su grandfather-ovani u Task 2). NE pojavljuje
  // se na landing-u ili admin selector-u jer /api/pricing filtrira po active:true.
  unlimited: {
    name: { sr: 'Neograničeno (deprecated)', en: 'Unlimited (deprecated)' },
    imageLimit: 25, // matches premium — legacy events get treated as premium for new features
    guestLimit: 300,
    storageDays: 30,
    price: 7500,
    clientResizeMaxWidth: 2560,
    clientQuality: 0.95,
    storeOriginal: true,
    features: [],
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
  const entry = labels[tier] ?? labels.free;
  return entry[language] ?? entry.sr;
}
