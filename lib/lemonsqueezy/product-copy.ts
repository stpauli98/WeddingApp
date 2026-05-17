import type { CheckoutTarget } from '@/lib/lemonsqueezy/variants';

export type Locale = 'sr' | 'en';

export interface ProductCopy {
  name: string;
  description: string;
}

/**
 * Localized product name + description shown on the LemonSqueezy hosted checkout page.
 * LS variants are configured once in the LS dashboard; we override per-checkout via
 * productOptions to match the admin's locale.
 */
export function getLocalizedProductCopy(target: CheckoutTarget, locale: Locale): ProductCopy {
  const safeLocale: Locale = locale === 'en' ? 'en' : 'sr';

  if (target.purpose === 'initial_purchase') {
    if (target.tier === 'basic') {
      return safeLocale === 'sr'
        ? {
            name: 'Svadbeni paket — Basic',
            description: 'Digitalni svadbeni album: 7 slika po gostu, 30 dana čuvanja, standardni QR kod, optimizovan kvalitet.',
          }
        : {
            name: 'Wedding Package — Basic',
            description: 'Digital wedding album: 7 photos per guest, 30 days retention, standard QR code, optimized quality.',
          };
    }
    if (target.tier === 'premium') {
      return safeLocale === 'sr'
        ? {
            name: 'Svadbeni paket — Premium',
            description: 'Digitalni svadbeni album: 25 slika po gostu, 30 dana čuvanja, prilagođen QR kod, originali bez kompresije.',
          }
        : {
            name: 'Wedding Package — Premium',
            description: 'Digital wedding album: 25 photos per guest, 30 days retention, custom QR code, originals with no compression.',
          };
    }
  }

  if (target.purpose === 'upgrade') {
    if (target.fromTier === 'basic' && target.toTier === 'premium') {
      return safeLocale === 'sr'
        ? {
            name: 'Nadogradnja Basic → Premium',
            description: 'Nadogradnja na razlika cijene Premium paketa: 25 slika po gostu, originali bez kompresije, prilagođen QR kod.',
          }
        : {
            name: 'Upgrade Basic → Premium',
            description: 'Pay the difference for Premium: 25 photos per guest, originals, custom QR code.',
          };
    }
    if (target.fromTier === 'free' && target.toTier === 'basic') {
      return safeLocale === 'sr'
        ? {
            name: 'Nadogradnja na Basic',
            description: 'Otključaj Basic paket: 7 slika po gostu, 30 dana čuvanja, standardni QR kod.',
          }
        : {
            name: 'Upgrade to Basic',
            description: 'Unlock Basic package: 7 photos per guest, 30 days retention, standard QR code.',
          };
    }
    if (target.fromTier === 'free' && target.toTier === 'premium') {
      return safeLocale === 'sr'
        ? {
            name: 'Nadogradnja na Premium',
            description: 'Otključaj Premium paket: 25 slika po gostu, originali, prilagođen QR kod.',
          }
        : {
            name: 'Upgrade to Premium',
            description: 'Unlock Premium package: 25 photos per guest, originals, custom QR code.',
          };
    }
  }

  if (target.purpose === 'retention_extension') {
    return safeLocale === 'sr'
      ? {
          name: 'Produženje čuvanja — 30 dana',
          description: 'Produži čuvanje slika i poruka za dodatnih 30 dana.',
        }
      : {
          name: 'Retention Extension — 30 days',
          description: 'Extend storage of photos and messages for an additional 30 days.',
        };
  }

  // Unreachable for well-typed inputs; defensive default.
  return { name: 'WeddingApp', description: '' };
}
