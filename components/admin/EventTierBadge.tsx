"use client";

import { useEffect, useState } from 'react';
import { PRICING_TIERS, PricingTier, getTierName } from '@/lib/pricing-tiers';
import { buildDynamicFeatures } from '@/lib/pricing-features';
import type { PricingPlanRow } from '@/lib/pricing-db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EventTierBadgeProps {
  tier: PricingTier;
  imageLimit: number;
  language?: 'sr' | 'en';
  variant?: 'badge' | 'card';
}

export function EventTierBadge({ tier, imageLimit, language = 'sr', variant = 'badge' }: EventTierBadgeProps) {
  const { t } = useTranslation();
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
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant={tier === 'free' ? 'secondary' : 'default'}
          className="text-sm font-medium"
        >
          {tierName}
        </Badge>
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <ImageIcon className="h-4 w-4" />
          {t('admin.event.pricing.imagesPerGuest', '{{count}} slika po gostu', { count: imageLimit })}
        </span>
      </div>
    );
  }

  const features = plan
    ? buildDynamicFeatures(plan, language, t)
    : PRICING_TIERS[tier].features.map((f) => f[language]); // fallback

  const price = plan?.price ?? PRICING_TIERS[tier].price;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{tierName}</CardTitle>
            <CardDescription>
              {t('admin.event.pricing.imagesPerGuest', '{{count}} slika po gostu', { count: imageLimit })}
            </CardDescription>
          </div>
          {price > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold">{(price / 100).toFixed(2)} EUR</div>
              <div className="text-xs text-muted-foreground">
                {language === 'sr' ? 'po događaju' : 'per event'}
              </div>
            </div>
          )}
          {price === 0 && (
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {t('admin.event.pricing.free', 'Besplatno')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
