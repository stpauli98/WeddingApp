import type { TFunction } from 'i18next';
import type { PricingPlanRow } from '@/lib/pricing-db';
import { getQualityLabel } from '@/lib/pricing-tiers';

/**
 * Compose a feature bullet list for a tier by combining dynamic
 * template-rendered bullets (with numbers drawn from DB fields) and
 * the tier-specific non-numeric bullets stored in PricingFeature.
 *
 * Order: numeric bullets first (image limit, guest limit, storage, quality),
 * then DB feature rows.
 */
export function buildDynamicFeatures(
  plan: PricingPlanRow,
  lang: 'sr' | 'en',
  t: TFunction
): string[] {
  const out: string[] = [];

  // 1. Images per guest.
  out.push(
    t('pricing.feature.imagesPerGuest', {
      count: plan.imageLimit,
      defaultValue: lang === 'sr'
        ? `Do ${plan.imageLimit} slika po gostu`
        : `Up to ${plan.imageLimit} images per guest`,
    }) as string
  );

  // 2. Guest limit.
  out.push(
    t('pricing.feature.upToGuests', {
      count: plan.guestLimit,
      defaultValue: lang === 'sr'
        ? `Do ${plan.guestLimit} gostiju`
        : `Up to ${plan.guestLimit} guests`,
    }) as string
  );

  // 3. Storage days (or year).
  if (plan.storageDays >= 365) {
    out.push(
      t('pricing.feature.storageYear', {
        defaultValue: lang === 'sr' ? 'Slike se čuvaju 1 godinu' : 'Photos stored for 1 year',
      }) as string
    );
  } else {
    out.push(
      t('pricing.feature.storageDays', {
        count: plan.storageDays,
        defaultValue: lang === 'sr'
          ? `Slike se čuvaju ${plan.storageDays} dana`
          : `Photos stored for ${plan.storageDays} days`,
      }) as string
    );
  }

  // 4. Image quality (already a combined label from helper).
  out.push(getQualityLabel(plan.tier, lang));

  // 5. Tier-specific non-numeric features (e.g. "Priority support").
  for (const f of plan.features) {
    out.push(f[lang]);
  }

  return out;
}
