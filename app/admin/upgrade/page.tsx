'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TierOption {
  tier: 'basic' | 'premium';
  name: string;
  priceLabel: string;
  priceSubtitle: string;
  features: string[];
  highlighted?: boolean;
}

export default function UpgradePage() {
  const router = useRouter();
  const pathname = usePathname();
  const langPrefix = pathname?.startsWith('/en') ? '/en' : '/sr';
  const { t } = useTranslation();

  const OPTIONS_FROM_FREE: TierOption[] = [
    {
      tier: 'basic',
      name: 'Basic',
      priceLabel: '€25',
      priceSubtitle: t('admin.upgrade.oneTime'),
      features: [
        t('admin.upgrade.basicFeature1'),
        t('admin.upgrade.basicFeature2'),
        t('admin.upgrade.basicFeature3'),
        t('admin.upgrade.basicFeature4'),
      ],
    },
    {
      tier: 'premium',
      name: 'Premium',
      priceLabel: '€75',
      priceSubtitle: t('admin.upgrade.oneTime'),
      features: [
        t('admin.upgrade.premiumFeature1'),
        t('admin.upgrade.premiumFeature2'),
        t('admin.upgrade.premiumFeature3'),
        t('admin.upgrade.premiumFeature4'),
        t('admin.upgrade.premiumFeature5'),
      ],
      highlighted: true,
    },
  ];

  const OPTIONS_FROM_BASIC: TierOption[] = [
    {
      tier: 'premium',
      name: 'Premium',
      priceLabel: '€50',
      priceSubtitle: t('admin.upgrade.diffFromBasic'),
      features: [
        t('admin.upgrade.basicToPremiumFeature1'),
        t('admin.upgrade.basicToPremiumFeature2'),
        t('admin.upgrade.basicToPremiumFeature3'),
        t('admin.upgrade.basicToPremiumFeature4'),
      ],
      highlighted: true,
    },
  ];

  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d?.event) {
          router.replace(`${langPrefix}/admin/event`);
          return;
        }
        if (d.event.pricingTier === 'premium') {
          router.replace(`${langPrefix}/admin/dashboard/${d.event.id}`);
          return;
        }
        if (!d.event.activatedAt) {
          router.replace(`${langPrefix}/admin/event/pending`);
          return;
        }
        setCurrentTier(d.event.pricingTier);
        setEventId(d.event.id);
      })
      .catch(() => setError(t('admin.upgrade.errorLoading')));
  }, [router, langPrefix, t]);

  async function buy(toTier: 'basic' | 'premium') {
    setLoading(toTier);
    setError(null);
    try {
      const csrfRes = await fetch('/api/admin/events/upgrade');
      const { csrfToken } = await csrfRes.json();
      const res = await fetch('/api/admin/events/upgrade', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ toTier }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setError(data.error || t('admin.upgrade.error'));
      setLoading(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.upgrade.networkError'));
      setLoading(null);
    }
  }

  if (error && !currentTier) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[hsl(var(--lp-bg))]">
        <p className="text-[hsl(var(--lp-destructive))] text-center font-playfair italic">{error}</p>
      </div>
    );
  }

  if (!currentTier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--lp-bg))]">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--lp-accent))]" />
      </div>
    );
  }

  const options = currentTier === 'free' ? OPTIONS_FROM_FREE : OPTIONS_FROM_BASIC;
  const isSingleCard = options.length === 1;

  return (
    <div className="min-h-screen bg-[hsl(var(--lp-bg))] relative overflow-hidden">
      {/* Decorative background — soft champagne gradient + blurred rose halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-[hsl(var(--lp-secondary))]/40 via-[hsl(var(--lp-bg))] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-[hsl(var(--lp-primary))]/8 blur-3xl"
      />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Back link */}
        {eventId && (
          <Link
            href={`${langPrefix}/admin/dashboard/${eventId}`}
            className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--lp-muted-foreground))] hover:text-[hsl(var(--lp-accent))] transition-colors mb-6 sm:mb-8 min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('admin.upgrade.backToDashboard')}
          </Link>
        )}

        {/* Hero */}
        <header className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-[hsl(var(--lp-accent))] mb-3 font-medium">
            ✦ {t('admin.upgrade.title')} ✦
          </p>
          <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl text-[hsl(var(--lp-text))] mb-3 sm:mb-4 leading-tight">
            {t('admin.upgrade.heroLine1')}
            <br />
            <span className="italic bg-gradient-to-r from-[hsl(var(--lp-primary))] via-[hsl(var(--lp-accent))] to-[hsl(var(--lp-primary))] bg-clip-text text-transparent">
              {t('admin.upgrade.heroLine2')}
            </span>
          </h1>
          <p className="text-sm sm:text-base text-[hsl(var(--lp-muted-foreground))] max-w-md mx-auto">
            {currentTier === 'free'
              ? t('admin.upgrade.subFromFree')
              : t('admin.upgrade.subFromBasic')}
          </p>
        </header>

        {error && (
          <div className="mb-6 mx-auto max-w-md rounded-md border border-[hsl(var(--lp-destructive))]/30 bg-[hsl(var(--lp-destructive))]/5 px-4 py-3 text-sm text-[hsl(var(--lp-destructive))] text-center">
            {error}
          </div>
        )}

        {/* Tier cards */}
        <div
          className={`grid gap-5 sm:gap-6 ${
            isSingleCard ? 'max-w-md mx-auto' : 'grid-cols-1 md:grid-cols-2'
          }`}
        >
          {options.map((opt) => (
            <TierCard
              key={opt.tier}
              option={opt}
              loading={loading === opt.tier}
              disabled={loading !== null}
              onSelect={() => buy(opt.tier)}
            />
          ))}
        </div>

        {/* Refund footer */}
        <footer className="mt-10 sm:mt-14 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-[hsl(var(--lp-muted-foreground))]">
            <span aria-hidden>♡</span>
            <span>{t('admin.upgrade.refundFooter')}</span>
            <span aria-hidden>♡</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

interface TierCardProps {
  option: TierOption;
  loading: boolean;
  disabled: boolean;
  onSelect: () => void;
}

function TierCard({ option, loading, disabled, onSelect }: TierCardProps) {
  const { t } = useTranslation();
  const { name, priceLabel, priceSubtitle, features, highlighted } = option;
  return (
    <div
      className={`relative rounded-2xl border bg-white p-6 sm:p-8 transition-all flex flex-col ${
        highlighted
          ? 'border-[hsl(var(--lp-accent))]/40 shadow-[0_4px_24px_-8px_hsl(var(--lp-accent)/0.25)]'
          : 'border-[hsl(var(--lp-border))]/60 shadow-sm'
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[hsl(var(--lp-accent))] to-[hsl(var(--lp-primary))] px-3 py-1 text-[10px] sm:text-xs uppercase tracking-wider text-white font-medium shadow-sm whitespace-nowrap">
          {t('admin.upgrade.recommended')}
        </span>
      )}

      {/* Name + Price */}
      <div className="mb-5 sm:mb-6">
        <h2 className="font-playfair italic text-2xl sm:text-3xl text-[hsl(var(--lp-text))] mb-1">
          {name}
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="font-playfair text-3xl sm:text-4xl text-[hsl(var(--lp-text))] font-semibold">
            {priceLabel}
          </span>
          <span className="text-xs text-[hsl(var(--lp-muted-foreground))]">{priceSubtitle}</span>
        </div>
      </div>

      {/* Decorative divider */}
      <div className="mb-5 sm:mb-6 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[hsl(var(--lp-accent))]/40 to-transparent" />
        <span className="text-[hsl(var(--lp-accent))]/60 text-xs">✦</span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[hsl(var(--lp-accent))]/40 to-transparent" />
      </div>

      {/* Features */}
      <ul className="space-y-2.5 mb-6 sm:mb-8 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-[hsl(var(--lp-text))]">
            <Check className="h-4 w-4 mt-0.5 shrink-0 text-[hsl(var(--lp-accent))]" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA — min 48px touch target */}
      <button
        onClick={onSelect}
        disabled={disabled}
        className={`w-full min-h-[48px] rounded-full px-5 py-3 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lp-accent))]/40 focus-visible:ring-offset-2 ${
          highlighted
            ? 'bg-gradient-to-r from-[hsl(var(--lp-accent))] to-[hsl(var(--lp-primary))] text-white hover:shadow-md hover:scale-[1.01] active:scale-[0.99]'
            : 'bg-[hsl(var(--lp-text))] text-white hover:bg-[hsl(var(--lp-text))]/90 active:scale-[0.99]'
        }`}
      >
        {loading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('admin.upgrade.redirecting')}
          </span>
        ) : (
          <>{t('admin.upgrade.pay', { price: priceLabel })}</>
        )}
      </button>
    </div>
  );
}
