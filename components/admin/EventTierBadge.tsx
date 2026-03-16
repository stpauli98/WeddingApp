"use client";

import { PRICING_TIERS, PricingTier, getTierName, getTierFeatures } from '@/lib/pricing-tiers';
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
  const config = PRICING_TIERS[tier];
  const tierName = getTierName(tier, language);
  const features = getTierFeatures(tier, language);

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
          {config.price > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold">{(config.price / 100).toFixed(2)} EUR</div>
              <div className="text-xs text-muted-foreground">
                {language === 'sr' ? 'po događaju' : 'per event'}
              </div>
            </div>
          )}
          {config.price === 0 && (
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
