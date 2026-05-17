'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';

interface TierOption {
  tier: 'basic' | 'premium';
  name: string;
  priceLabel: string;
  priceSubtitle: string;
  features: string[];
  highlighted?: boolean;
}

const OPTIONS_FROM_FREE: TierOption[] = [
  {
    tier: 'basic',
    name: 'Basic',
    priceLabel: '€25',
    priceSubtitle: 'jednokratno',
    features: [
      '7 slika po gostu',
      '30 dana čuvanja',
      'Standardni QR kod',
      'Optimizovan kvalitet (1600px)',
    ],
  },
  {
    tier: 'premium',
    name: 'Premium',
    priceLabel: '€75',
    priceSubtitle: 'jednokratno',
    features: [
      '25 slika po gostu',
      '30 dana čuvanja',
      'Prilagođen QR kod sa brendiranjem',
      'Najveći kvalitet — originali (2560px)',
      'Prioritetna podrška',
    ],
    highlighted: true,
  },
];

const OPTIONS_FROM_BASIC: TierOption[] = [
  {
    tier: 'premium',
    name: 'Premium',
    priceLabel: '€50',
    priceSubtitle: 'razlika do Premium paketa',
    features: [
      '25 slika po gostu (umjesto 7)',
      'Originali bez kompresije',
      'Prilagođen QR kod',
      'Prioritetna podrška',
    ],
    highlighted: true,
  },
];

export default function UpgradePage() {
  const router = useRouter();
  const pathname = usePathname();
  const langPrefix = pathname?.startsWith('/en') ? '/en' : '/sr';

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
      .catch(() => setError('Greška pri učitavanju'));
  }, [router, langPrefix]);

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
      setError(data.error || 'Greška');
      setLoading(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mrežna greška');
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
            Nazad na dashboard
          </Link>
        )}

        {/* Hero */}
        <header className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-[hsl(var(--lp-accent))] mb-3 font-medium">
            ✦ Nadogradnja paketa ✦
          </p>
          <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl text-[hsl(var(--lp-text))] mb-3 sm:mb-4 leading-tight">
            Učinite svoj dan
            <br />
            <span className="italic bg-gradient-to-r from-[hsl(var(--lp-primary))] via-[hsl(var(--lp-accent))] to-[hsl(var(--lp-primary))] bg-clip-text text-transparent">
              još posebnijim
            </span>
          </h1>
          <p className="text-sm sm:text-base text-[hsl(var(--lp-muted-foreground))] max-w-md mx-auto">
            {currentTier === 'free'
              ? 'Otključajte više slika po gostu, najbolji kvalitet i dodatne mogućnosti.'
              : 'Pređite na Premium i dobijte originale, prilagođen QR kod i sve premium funkcije.'}
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
            <span>
              Refund u roku od 7 dana —{' '}
              <a
                href="mailto:support@dodajuspomenu.com"
                className="underline decoration-[hsl(var(--lp-accent))]/40 hover:decoration-[hsl(var(--lp-accent))] underline-offset-4 transition-colors"
              >
                support@dodajuspomenu.com
              </a>
            </span>
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
          Preporučeno
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
            Preusmjeravamo...
          </span>
        ) : (
          <>Plati {priceLabel}</>
        )}
      </button>
    </div>
  );
}
