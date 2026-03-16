"use client";

import { useTranslation } from 'react-i18next';
import { PRICING_TIERS, PricingTier, getTierName } from '@/lib/pricing-tiers';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, ImageIcon } from 'lucide-react';

interface PricingTierSelectorProps {
  selectedTier: PricingTier;
  onTierChange: (tier: PricingTier) => void;
  language?: 'sr' | 'en';
}

export function PricingTierSelector({ selectedTier, onTierChange, language = 'sr' }: PricingTierSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-base font-medium text-[hsl(var(--lp-text))]">
          {t('admin.event.pricing.title', 'Izaberite plan')}
        </Label>
        <p className="text-sm text-[hsl(var(--lp-muted-foreground))] mt-1">
          {t('admin.event.pricing.description', 'Odaberite koliko slika po gostu želite da dozvolite')}
        </p>
      </div>

      <RadioGroup
        value={selectedTier}
        onValueChange={(value) => onTierChange(value as PricingTier)}
        className="grid gap-3"
      >
        {(Object.keys(PRICING_TIERS) as PricingTier[]).map((tier) => {
          const config = PRICING_TIERS[tier];
          const isSelected = selectedTier === tier;
          const isRecommended = config.recommended;

          return (
            <div key={tier} className="relative">
              <RadioGroupItem
                value={tier}
                id={`tier-${tier}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`tier-${tier}`}
                className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[hsl(var(--lp-primary))] bg-[hsl(var(--lp-primary))]/10 shadow-sm'
                    : 'border-[hsl(var(--lp-border))] bg-[hsl(var(--lp-card))] hover:border-[hsl(var(--lp-accent))] hover:bg-[hsl(var(--lp-muted))]/30'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                    isSelected
                      ? 'bg-[hsl(var(--lp-primary))] text-[hsl(var(--lp-primary-foreground))]'
                      : 'bg-[hsl(var(--lp-muted))] text-[hsl(var(--lp-accent))]'
                  }`}>
                    <ImageIcon className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[hsl(var(--lp-text))]">
                        {getTierName(tier, language)}
                      </span>
                      {isRecommended && (
                        <span className="text-xs bg-[hsl(var(--lp-accent))]/20 text-[hsl(var(--lp-accent))] px-2 py-0.5 rounded-full font-medium border border-[hsl(var(--lp-accent))]/30">
                          {t('admin.event.pricing.recommended', 'Preporučeno')}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-[hsl(var(--lp-muted-foreground))] mt-0.5">
                      {t('admin.event.pricing.imagesPerGuest', '{{count}} slika po gostu', { count: config.imageLimit })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      {config.price === 0 ? (
                        <span className="text-[hsl(var(--lp-success))]">
                          {t('admin.event.pricing.free', 'Besplatno')}
                        </span>
                      ) : (
                        <span className="text-[hsl(var(--lp-text))]">
                          {(config.price / 100).toFixed(2)} EUR
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                    isSelected
                      ? 'border-[hsl(var(--lp-primary))] bg-[hsl(var(--lp-primary))]'
                      : 'border-[hsl(var(--lp-accent))]/40'
                  }`}>
                    {isSelected && (
                      <Check className="h-3 w-3 text-[hsl(var(--lp-primary-foreground))]" />
                    )}
                  </div>
                </div>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
