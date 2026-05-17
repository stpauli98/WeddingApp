"use client";

import { useEffect, useState } from 'react';
import { PRICING_TIERS, PricingTier, getTierName } from '@/lib/pricing-tiers';
import { buildDynamicFeatures } from '@/lib/pricing-features';
import type { PricingPlanRow } from '@/lib/pricing-db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ImageIcon, ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface EventTierBadgeProps {
  tier: PricingTier;
  imageLimit: number;
  language?: 'sr' | 'en';
  variant?: 'badge' | 'card';
}

export function EventTierBadge({ tier, imageLimit, language = 'sr', variant = 'badge' }: EventTierBadgeProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [plan, setPlan] = useState<PricingPlanRow | null>(null);
  const tierName = getTierName(tier, language);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/pricing')
      .then((r) => r.json())
      .then((data: PricingPlanRow[]) => {
        if (!cancelled) {
          const found = data.find((p) => p.tier === tier);
          setPlan(found ?? null);
        }
      })
      .catch((err) => console.error('[tier-badge] fetch failed:', err));
    return () => {
      cancelled = true;
    };
  }, [tier]);

  if (variant === 'badge') {
    const isUpgradable = tier !== 'premium' && tier !== 'unlimited';
    const langPrefix = pathname?.startsWith('/en') ? '/en' : '/sr';
    const upgradeHref = `${langPrefix}/admin/upgrade`;

    const badgeInner = (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--lp-accent))]/30 bg-[hsl(var(--lp-accent))]/10 px-2.5 py-1 text-xs font-medium text-[hsl(var(--lp-accent))] ${
          isUpgradable ? 'transition-all duration-200 group-hover:bg-[hsl(var(--lp-accent))]/20 group-hover:border-[hsl(var(--lp-accent))]/50' : ''
        }`}
      >
        {tierName}
        {isUpgradable && (
          <ArrowUpRight className="h-3 w-3 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        )}
      </span>
    );

    const meta = (
      <span className="text-sm text-[hsl(var(--lp-muted-foreground))] flex items-center gap-1">
        <ImageIcon className="h-4 w-4" />
        {t('admin.event.pricing.imagesPerGuest', '{{count}} slika po gostu', { count: imageLimit })}
      </span>
    );

    if (isUpgradable) {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={upgradeHref}
            className="group inline-flex items-center min-h-[44px] sm:min-h-0"
            aria-label={language === 'sr' ? `Nadogradi sa ${tierName}` : `Upgrade from ${tierName}`}
          >
            {badgeInner}
          </Link>
          {meta}
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-2">
        {badgeInner}
        {meta}
      </div>
    );
  }

  const features = plan
    ? buildDynamicFeatures(plan, language, t)
    : PRICING_TIERS[tier].features.map((f) => f[language]); // fallback

  const price = plan?.price ?? PRICING_TIERS[tier].price;

  return (
    <Card className="w-full border-[hsl(var(--lp-border))] bg-[hsl(var(--lp-card))]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-[hsl(var(--lp-text))]">{tierName}</CardTitle>
            <CardDescription className="text-[hsl(var(--lp-muted-foreground))]">
              {t('admin.event.pricing.imagesPerGuest', '{{count}} slika po gostu', { count: imageLimit })}
            </CardDescription>
          </div>
          {price > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-[hsl(var(--lp-text))]">{(price / 100).toFixed(2)} EUR</div>
              <div className="text-xs text-[hsl(var(--lp-muted-foreground))]">
                {language === 'sr' ? 'po događaju' : 'per event'}
              </div>
            </div>
          )}
          {price === 0 && (
            <span className="inline-flex items-center rounded-full border border-[hsl(var(--lp-success))]/30 bg-[hsl(var(--lp-success))]/10 px-4 py-2 text-lg font-medium text-[hsl(var(--lp-success))]">
              {t('admin.event.pricing.free', 'Besplatno')}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-[hsl(var(--lp-text))]">
              <Check className="h-4 w-4 text-[hsl(var(--lp-success))] mt-0.5 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
