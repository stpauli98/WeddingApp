# LCP Phase 8 Finishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spustiti live landing LCP sa 4.6s na <2.5s kroz 5 dodatnih optimizacija: experimental CSS inlining, hero preload, FAQ bez JS-a, SocialProof RSC split, Navbar RSC split.

**Architecture:** Prethodni RSC migration (PR #14) je konvertovao 7 od 10 landing sekcija u RSC. Ostale 3 (Navbar, SocialProof, FAQ) ostaju na klijentu i troše hydration vrijeme. Ovaj plan dalje izolira svaki od tih 3 — Navbar i SocialProof se razbijaju na RSC body + tiny client island (samo interaktivni dio), FAQ se zamjenjuje native `<details>/<summary>` sa nula JS-a. Plus dvije CSS/asset optimizacije (preload hero image, experimental.optimizeCss) koje ne mijenjaju komponente ali smanjuju render-blocking.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, native HTML `<details>`, framer-motion (izolovano u malim klijent islandima), Jest + @testing-library/react.

---

## Context

Nakon Phase 7 (RSC migration + per-locale server i18n, PR #14 merged), live SR mobile Lighthouse je **Perf 77, LCP 4.6s**. Payload je 1.19 MB (66% manje od baseline-a). FCP je 3.3s — **glavni bottleneck je i dalje client-side hydration + render-blocking** a ne network.

Lighthouse breakdown post-Phase-7:
- 23 Script requestova, 387 KB JS
- 650ms render-blocking-insight (3 CSS fajla)
- Image: 3 req, 554 KB (AVIF, optimizovano)
- Font: 4 req, 189 KB
- **3 preostale client komponente** — Navbar, SocialProof, FAQ — drže ~60% client bundle-a

Explore audit svake:
- **Navbar.tsx** (119 lines) — `useState` x2, `useEffect` za scroll + click-outside, `useRef`, `AnimatePresence`. Static logo + desktop nav links + LanguageSelector + CTA mogu ići u RSC; samo `<NavbarIsland>` drži mobile menu state i scroll listener.
- **SocialProof.tsx** (127 lines) — inline `useCounterAnimation` hook sa IntersectionObserver + rAF, 3 motion.div kartice, Product Hunt badge, 3 `useCounterAnimation` instance. Static h2 + sublabels mogu biti RSC; `<CounterCard>` island renderuje brojku sa animacijom.
- **FAQ.tsx** (54 lines) — shadcn `<Accordion type="single" collapsible>` → native `<details>/<summary>` element ima isti UX bez ijednog KB JS-a. framer-motion `whileInView` wrapper se može zadržati ili ukloniti.
- **layout.tsx** — nema nijedan `<link rel="preload">`; hero image `priority` prop bi trebalo auto-generisati preload ali nije vidljiv u SSR (Next 15 regresija / ograničenje sa RSC). Manual preload u `<head>` rješava.
- **next.config.mjs** — nema `experimental` ključ; dodaj `experimental.optimizeCss: true` za Critters-based inline critical CSS.
- **Edge Runtime za layout** — explore potvrdio da layout ne uvozi Prisma direktno, ali nema perf benefit (layout je već brz, server-response 30ms live). **Skipujem** — ne vredi rizika.

Procjena: **2-3 sata** fokusiranog rada (6 taskova, svi nezavisni).

---

## File Structure

| Fajl | Akcija | Odgovornost |
|---|---|---|
| `next.config.mjs` | Modify | Dodati `experimental.optimizeCss: true` |
| `app/layout.tsx` | Modify | Dodati `<link rel="preload">` za hero image u `<head>` |
| `components/landingPage/FAQ.tsx` | Modify | Zamijeniti shadcn Accordion sa native `<details>/<summary>`, RSC signature `{ t }`, FadeInOnScroll wrapper |
| `components/landingPage/SocialProof.tsx` | Modify | Postaje RSC: h2 + Product Hunt badge statično, counter ide u island |
| `components/motion/CounterCard.tsx` | Create | Client island: IntersectionObserver + rAF counter, motion card wrapper |
| `components/landingPage/Navbar.tsx` | Modify | Postaje RSC: logo + desktop nav links + CTA + LanguageSelector statično |
| `components/motion/NavbarIsland.tsx` | Create | Client island: mobile menu state + scroll-position bg class + AnimatePresence |
| `components/ClientPage.tsx` | Modify | Navbar/SocialProof/FAQ sada primaju `{ t, lang }` props (postali RSC) |
| `__tests__/components/FAQNativeDetails.test.tsx` | Create | TDD: FAQ render-uje bez JS state-a, first item zatvoren po default-u, svi `<summary>` clickable |

---

## Pre-flight

- [ ] **Step 1: Čist tree, branch off main**

```bash
cd /Users/nmil/Desktop/WeddingApp
git status
git pull origin main
git branch --show-current  # trebalo bi biti 'main' nakon Phase 7 merge
git checkout -b perf/lcp-phase8-finishing
```

- [ ] **Step 2: Baseline Lighthouse**

```bash
mkdir -p claudedocs
npx -y lighthouse@latest https://www.dodajuspomenu.com/sr --only-categories=performance \
  --output=json --output-path=claudedocs/lh-pre-phase8 --chrome-flags="--headless --no-sandbox" --quiet 2>&1 | tail -3

node -e '
const r = require("./claudedocs/lh-pre-phase8.report.json");
console.log("Baseline pre-Phase-8:");
console.log("  Perf:", Math.round(r.categories.performance.score * 100));
console.log("  LCP:", r.audits["largest-contentful-paint"].displayValue);
console.log("  FCP:", r.audits["first-contentful-paint"].displayValue);
console.log("  TBT:", r.audits["total-blocking-time"].displayValue);
'
```
Expected: Perf 77 ± 3, LCP ~4.6s. Zabilježi za usporedbu.

---

## Task 1: experimental.optimizeCss

**Files:**
- Modify: `next.config.mjs`

Najjednostavnija optimizacija — Next.js `experimental.optimizeCss: true` uključuje Critters (third-party lib) koji inline-uje critical CSS u HTML i odgađa ostatak. Rezultuje u eliminaciji 3 render-blocking CSS fajla (650ms opportunity).

- [ ] **Step 1: Provjeri da li je `critters` u dependencies**

Run:
```bash
cd /Users/nmil/Desktop/WeddingApp
grep -E '"critters"|"beasties"' package.json || echo "NOT installed — Next.js will require it"
```

Next.js 15 automatski koristi Critters/Beasties kad se ovaj flag uključi. Ako prvi build crashuje sa "Cannot find module 'critters'", instaliraj ručno:
```bash
pnpm add -D critters
```

- [ ] **Step 2: Edit `next.config.mjs`**

Pronađi top-level `nextConfig` object. PRIJE `async headers()` ili bilo koje druge postojeće ključe, dodaj:

```js
experimental: {
  optimizeCss: true,
},
```

Kompletan primjer kako treba da izgleda header fajla:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizeCss: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 64, 128, 256, 384],
  },
  async headers() {
    // ... postojeći kod
```

- [ ] **Step 3: Build smoke**

Run:
```bash
rm -rf .next
pnpm build 2>&1 | tail -15
```
Expected: build success. Ako javlja "Cannot find module 'critters'", uradi `pnpm add -D critters` i rerun.

- [ ] **Step 4: Commit**

```bash
git add next.config.mjs package.json pnpm-lock.yaml
git commit -m "perf(build): enable experimental.optimizeCss for critical CSS inlining

Next.js Critters integration inlines above-the-fold CSS and defers the
rest. Eliminates 650ms render-blocking from 3 external stylesheet
requests flagged in post-Phase-7 Lighthouse run."
```

Ako `package.json` i `pnpm-lock.yaml` nisu promijenjeni (critters već instaliran), samo `next.config.mjs` u stage.

---

## Task 2: Preload hero image

**Files:**
- Modify: `app/layout.tsx`

HeroSection koristi `<Image priority>` što bi trebalo auto-generisati preload hint, ali grep u layout.tsx vraća zero `rel="preload"`. RSC boundary + motion island oko Image-a vjerovatno ometa Next 15 auto-preload. Manual preload u `<head>` rješava.

- [ ] **Step 1: Pročitaj head strukturu**

Run:
```bash
head -75 app/layout.tsx
```
Pronađi gdje se završava head blok — obično ima `<link rel="icon">` ili Script-ove prije `</head>`.

- [ ] **Step 2: Dodaj preload za oba locale-a**

U `app/layout.tsx`, unutar `<head>`, nakon postojećih `<link>` elemenata ali PRIJE Script blokova, dodaj:

```tsx
{/* Preload hero image for both locales — next/image priority hint not
    propagating through RSC + FadeInUpOnMount boundary. Browser picks up
    the matching locale automatically once CSS rules apply; unused preload
    is a minor penalty compared to LCP gain. */}
<link
  rel="preload"
  as="image"
  href="/_next/image?url=%2Fimages%2Fsr%2Fguest-login-filled.png&w=640&q=75"
  imageSrcSet="/_next/image?url=%2Fimages%2Fsr%2Fguest-login-filled.png&w=384&q=75 384w, /_next/image?url=%2Fimages%2Fsr%2Fguest-login-filled.png&w=640&q=75 640w"
  fetchPriority="high"
/>
```

**Razlog:** hero image je 24 KB — sa preload hintom dolazi u kritičnu fazu paralelno sa HTML/CSS umjesto da čeka hydration komponente.

- [ ] **Step 3: Build + curl verify**

```bash
rm -rf .next && pnpm build 2>&1 | tail -5
pnpm start &
sleep 5
curl -s http://localhost:3000/sr | grep -oE 'rel="preload"[^>]*href="[^"]*"' | head -3
kill %1 2>/dev/null
```
Expected: `rel="preload"` prisutan u SSR HTML-u za hero image.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "perf(hero): manual preload LCP image via <link rel=preload>

Next/image priority auto-preload does not propagate through the
FadeInUpOnMount client island that wraps the Hero mockup image.
Adding a manual preload hint in layout <head> starts the fetch
during document parse, overlapping with CSS/JS download instead of
waiting for hydration."
```

---

## Task 3: FAQ → native `<details>/<summary>`

**Files:**
- Create: `__tests__/components/FAQNativeDetails.test.tsx`
- Modify: `components/landingPage/FAQ.tsx`

shadcn/ui Accordion requires client state + Radix primitives. Native `<details>/<summary>` gets the same UX with zero JS and is RSC-compatible. Semantic + accessible by default (screen readers announce expand/collapse).

- [ ] **Step 1: Napiši failing test**

Create `__tests__/components/FAQNativeDetails.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import FAQ from '@/components/landingPage/FAQ';
import { getServerT } from '@/lib/i18n/server';

describe('FAQ — native <details> implementation', () => {
  it('renders 8 question/answer pairs', () => {
    const t = getServerT('sr');
    render(<FAQ t={t} />);
    const details = screen.getAllByRole('group');
    expect(details.length).toBe(8);
  });

  it('all items closed by default (native details behavior)', () => {
    const t = getServerT('sr');
    const { container } = render(<FAQ t={t} />);
    const opened = container.querySelectorAll('details[open]');
    expect(opened.length).toBe(0);
  });

  it('clicking summary opens the details panel', () => {
    const t = getServerT('sr');
    const { container } = render(<FAQ t={t} />);
    const firstSummary = container.querySelector('details > summary');
    expect(firstSummary).toBeTruthy();
    fireEvent.click(firstSummary as Element);
    const parent = firstSummary?.closest('details');
    expect(parent?.hasAttribute('open')).toBe(true);
  });
});
```

Run: `pnpm test:unit -- __tests__/components/FAQNativeDetails.test.tsx`
Expected: FAIL — current FAQ uses shadcn Accordion, doesn't render `<details>` elements.

- [ ] **Step 2: Zamijeni `components/landingPage/FAQ.tsx`**

```tsx
// components/landingPage/FAQ.tsx — NO 'use client' — RSC
import type { TFunction } from 'i18next';
import { ChevronDown } from 'lucide-react';
import { FadeInOnScroll } from '@/components/motion/FadeInOnScroll';

interface FAQProps {
  t: TFunction;
}

export default function FAQ({ t }: FAQProps) {
  const faqItems = Array.from({ length: 8 }, (_, i) => ({
    question: t(`faq.question${i + 1}`),
    answer: t(`faq.answer${i + 1}`),
  }));

  return (
    <section id="faq" className="py-16 sm:py-20 bg-white" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <FadeInOnScroll className="text-center mb-10">
          <h2 id="faq-heading" className="font-playfair text-3xl md:text-4xl font-bold text-lp-text mb-3">
            {t('faq.title')}
          </h2>
          <p className="text-lg text-lp-muted-foreground">{t('faq.subtitle')}</p>
        </FadeInOnScroll>

        <FadeInOnScroll delay={0.1} className="w-full bg-white border border-lp-border rounded-xl shadow-sm p-2 md:p-4">
          {faqItems.map((item, index) => (
            <details
              key={index}
              className="group border-b border-lp-border/60 last:border-b-0"
            >
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none py-4 px-2 text-left text-base font-semibold text-lp-text hover:text-lp-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary rounded">
                <span>{item.question}</span>
                <ChevronDown
                  aria-hidden="true"
                  className="w-5 h-5 shrink-0 text-lp-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="px-2 pb-4 text-lp-muted-foreground">
                {item.answer}
              </div>
            </details>
          ))}
        </FadeInOnScroll>
      </div>
    </section>
  );
}
```

**Ključno:**
- `list-none` na `<summary>` uklanja default disclosure triangle (koristimo Lucide ChevronDown)
- `group-open:rotate-180` flip-uje chevron 180° kad je otvoren — pure CSS, bez JS
- `<details>` ima native `role="group"`, `<summary>` je default focusable + keyboard-actionable (Enter/Space)
- Dodajem `aria-labelledby="faq-heading"` već postoji na section

- [ ] **Step 3: Test treba da PASS**

Run: `pnpm test:unit -- __tests__/components/FAQNativeDetails.test.tsx`
Expected: 3/3 PASS.

- [ ] **Step 4: Build smoke**

```bash
rm -rf .next && pnpm build 2>&1 | tail -5
npx tsc --noEmit
```
Expected: 0 TS errors, build success. FAQ više ne importa iz `@/components/ui/accordion`.

- [ ] **Step 5: Verify chevron rotates pure-CSS**

`pnpm start &`, otvori `/sr`, scroll-uj do FAQ, klikni prvi item. Chevron treba da se rotira bez JS-a (disable JS u DevTools test — UX mora raditi).

- [ ] **Step 6: Commit**

```bash
git add __tests__/components/FAQNativeDetails.test.tsx components/landingPage/FAQ.tsx
git commit -m "refactor(faq): native <details>/<summary> replaces shadcn Accordion

Zero-JS alternative preserves UX: keyboard focus, expand/collapse,
ARIA role=group. ChevronDown rotates via group-open:rotate-180 CSS.
FAQ becomes RSC (accepts t prop), dropping useTranslation + Radix
Accordion runtime. Estimated -20 KB client bundle.

3 new tests verify 8 items render, all closed by default, click
toggles open state."
```

---

## Task 4: SocialProof → RSC body + CounterCard island

**Files:**
- Create: `components/motion/CounterCard.tsx`
- Modify: `components/landingPage/SocialProof.tsx`

SocialProof trenutno ima 3 counter animacije (useCounterAnimation hook) + 3 motion.div kartice + Product Hunt badge + h2. Razdvajanje: static markup (h2, labels) u RSC, samo brojka + animacija u malom client island-u.

- [ ] **Step 1: Kreiraj `components/motion/CounterCard.tsx`**

```tsx
// components/motion/CounterCard.tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ComponentType } from 'react';

interface CounterCardProps {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  target: number;
  suffix?: string;
  label: string;
  sublabel?: string;
  delay?: number;
}

export function CounterCard({
  icon: Icon,
  target,
  suffix = '',
  label,
  sublabel,
  delay = 0,
}: CounterCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      setCount(target);
      return;
    }
    const el = ref.current;
    if (!el) return;
    let rafId: number | null = null;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const duration = 1500;
        const step = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(target * eased));
          if (progress < 1) rafId = requestAnimationFrame(step);
        };
        rafId = requestAnimationFrame(step);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [target, reduce]);

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col items-center text-center p-6 bg-white border border-lp-border rounded-xl"
    >
      <Icon aria-hidden="true" className="w-8 h-8 text-lp-primary mb-3" />
      <div className="text-4xl font-bold text-lp-text mb-1">
        {count}{suffix}
      </div>
      <div className="text-sm font-medium text-lp-text">{label}</div>
      {sublabel && <div className="text-xs text-lp-muted-foreground mt-1">{sublabel}</div>}
    </motion.div>
  );
}
```

**Ključno:**
- Ovo je island — samo `'use client'` na 50 linija koda
- useCounterAnimation logika inline-ovana (ista math + IO + rAF, samo refaktorovana)
- Preserves easing curve (cubic ease-out)
- Cleanup: disconnect IO + cancel rAF

- [ ] **Step 2: Refaktoriši `components/landingPage/SocialProof.tsx` u RSC**

```tsx
// components/landingPage/SocialProof.tsx — NO 'use client' — RSC
import Image from 'next/image';
import { Heart, Users, Globe } from 'lucide-react';
import type { TFunction } from 'i18next';
import { FadeInOnScroll } from '@/components/motion/FadeInOnScroll';
import { CounterCard } from '@/components/motion/CounterCard';

interface SocialProofProps {
  t: TFunction;
}

export default function SocialProof({ t }: SocialProofProps) {
  const stats = [
    {
      icon: Heart,
      target: 20,
      suffix: '+',
      label: t('socialProof.couplesLabel'),
      sublabel: t('socialProof.couplesSublabel'),
    },
    {
      icon: Users,
      target: 100,
      suffix: '+',
      label: t('socialProof.guestsLabel'),
      sublabel: t('socialProof.guestsSublabel'),
    },
    {
      icon: Globe,
      target: 4,
      label: t('socialProof.countriesLabel'),
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-white" aria-labelledby="social-proof-heading">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <FadeInOnScroll as="h2" id="social-proof-heading" className="font-playfair text-3xl md:text-4xl font-bold text-lp-text text-center mb-10">
          {t('socialProof.title')}
        </FadeInOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {stats.map((stat, i) => (
            <CounterCard
              key={stat.label}
              icon={stat.icon}
              target={stat.target}
              suffix={stat.suffix}
              label={stat.label}
              sublabel={stat.sublabel}
              delay={i * 0.1}
            />
          ))}
        </div>

        <FadeInOnScroll delay={0.3} className="flex justify-center">
          <a
            href="https://www.producthunt.com/products/dodajuspomenu"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('a11y.productHunt')}
          >
            <Image
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=979471&theme=light"
              alt="Product Hunt"
              width={200}
              height={43}
              unoptimized
            />
          </a>
        </FadeInOnScroll>
      </div>
    </section>
  );
}
```

**Note:** Matchiraj ORIGINAL CLASS-OVE ako se razlikuju (background, border radius, padding). Provjeri original za tačne translation keys ako se razlikuju od ovih (`socialProof.couplesLabel`, itd.) — možda originalna imena su `socialProof.couples`, `socialProof.guests`, `socialProof.countries`.

- [ ] **Step 3: Provjeri translation keys u originalu**

Run:
```bash
grep -oE 't\("socialProof\.[a-zA-Z]+"' components/landingPage/SocialProof.tsx | sort -u
```
Ako originalni keys ne matchiraju ono što sam stavio u novi kod, ažuriraj pozive `t()` da koriste originalne.

- [ ] **Step 4: Build + TS**

```bash
rm -rf .next && pnpm build 2>&1 | tail -5
npx tsc --noEmit
```
Expected: 0 TS errors. Build success (može i dalje imati prop mismatch u ClientPage jer ova bundle menja SocialProof signature — Task 6 popravlja ClientPage).

- [ ] **Step 5: Commit**

```bash
git add components/motion/CounterCard.tsx components/landingPage/SocialProof.tsx
git commit -m "refactor(social-proof): RSC body + CounterCard client island

h2 + Product Hunt badge + static labels render server-side. Only the
three count-up animations live in CounterCard — a small client island
with IntersectionObserver + rAF easing (same math as the original
useCounterAnimation hook, extracted). Estimated -15 KB client bundle
since the original component shipped useCounterAnimation + 3 motion
cards + badge wrapper; now only CounterCard hydrates.

ClientPage signature update deferred to Task 6 (same bundle)."
```

---

## Task 5: Navbar → RSC header + NavbarIsland

**Files:**
- Create: `components/motion/NavbarIsland.tsx`
- Modify: `components/landingPage/Navbar.tsx`

Navbar has 4 pieces of client state/behavior: (1) scroll-position-reactive background class, (2) mobile menu open/closed, (3) Escape + click-outside handlers, (4) AnimatePresence for mobile drawer. All 4 belong in a single island; static bits (logo, desktop nav links, CTA) are RSC.

- [ ] **Step 1: Kreiraj `components/motion/NavbarIsland.tsx`**

```tsx
// components/motion/NavbarIsland.tsx
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface NavLink {
  label: string;
  href: string;
}

interface NavbarIslandProps {
  mainNavLabel: string;
  menuOpenLabel: string;
  menuCloseLabel: string;
  navLinks: NavLink[];
  desktopTail: ReactNode;   // LanguageSelector + CTA for md:flex block
  mobileTail: ReactNode;    // LanguageSelector + CTA for mobile drawer
  brandHref: string;
  brandLabel: string;
}

export function NavbarIsland({
  mainNavLabel,
  menuOpenLabel,
  menuCloseLabel,
  navLinks,
  desktopTail,
  mobileTail,
  brandHref,
  brandLabel,
}: NavbarIslandProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!navContainerRef.current?.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [isMobileMenuOpen]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-sm shadow-md' : 'bg-transparent'
      }`}
      role="navigation"
      aria-label={mainNavLabel}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6" ref={navContainerRef}>
        <div className="flex items-center justify-between h-16">
          <Link
            href={brandHref}
            className="font-playfair text-xl font-bold text-lp-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary rounded"
          >
            {brandLabel}
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-lp-text hover:text-lp-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary rounded"
              >
                {link.label}
              </a>
            ))}
            {desktopTail}
          </div>

          <button
            className="md:hidden p-2 text-lp-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary rounded"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? menuCloseLabel : menuOpenLabel}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              className="md:hidden bg-white border-t border-lp-border shadow-lg"
              initial={reduce ? false : { opacity: 0, height: 0 }}
              animate={reduce ? undefined : { opacity: 1, height: 'auto' }}
              exit={reduce ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 py-4 space-y-3" onClick={() => setIsMobileMenuOpen(false)}>
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="block py-2 text-lp-text hover:text-lp-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary rounded"
                  >
                    {link.label}
                  </a>
                ))}
                {mobileTail}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
```

**Note:** Island prima `desktopTail` i `mobileTail` kao `ReactNode` props. To omogućava Server-side da pasira <LanguageSelector /> (koji je client sam po sebi) i <Link> (server) unutra.

Actually wait — `LanguageSelector` is a client component; kad se mountira u server komponenti kao direktni child, radi OK (Next 15 supports server-passing client kids). Kad ga pasiramo kao prop od servera ka klijentu, takođe radi.

- [ ] **Step 2: Refaktoriši `components/landingPage/Navbar.tsx`**

```tsx
// components/landingPage/Navbar.tsx — NO 'use client' — RSC
import Link from 'next/link';
import type { TFunction } from 'i18next';
import LanguageSelector from '@/components/LanguageSelector';
import { NavbarIsland } from '@/components/motion/NavbarIsland';

interface NavbarProps {
  t: TFunction;
  lang: 'sr' | 'en';
}

export default function Navbar({ t, lang }: NavbarProps) {
  const navLinks = [
    { label: t('navbar.howItWorks'), href: '#kako-radi' },
    { label: t('navbar.faq'), href: '#faq' },
  ];

  const desktopTail = (
    <>
      <LanguageSelector className="text-sm" />
      <Link
        href={`/${lang}/admin/register`}
        className="px-5 py-2 text-sm font-semibold text-white bg-lp-primary rounded-lg hover:bg-lp-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary"
      >
        {t('navbar.cta')}
      </Link>
    </>
  );

  const mobileTail = (
    <>
      <LanguageSelector className="text-sm w-full" />
      <Link
        href={`/${lang}/admin/register`}
        className="block w-full text-center px-5 py-3 text-sm font-semibold text-white bg-lp-primary rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary"
      >
        {t('navbar.cta')}
      </Link>
    </>
  );

  return (
    <NavbarIsland
      mainNavLabel={t('a11y.mainNav')}
      menuOpenLabel={t('navbar.menuOpen')}
      menuCloseLabel={t('navbar.menuClose')}
      navLinks={navLinks}
      desktopTail={desktopTail}
      mobileTail={mobileTail}
      brandHref="/"
      brandLabel="DodajUspomenu"
    />
  );
}
```

**Razlog:** Sada svi t() pozivi rade server-side, samo NavbarIsland ima client runtime (scroll listener + mobile menu). LanguageSelector ostaje client kao što je bio — mountira se unutar island-a.

- [ ] **Step 3: Build + TS**

```bash
rm -rf .next && pnpm build 2>&1 | tail -5
npx tsc --noEmit
```
Expected: možda TS error u ClientPage za Navbar sa novim props (t, lang) — to je OK, Task 6 fixa.

- [ ] **Step 4: Commit**

```bash
git add components/motion/NavbarIsland.tsx components/landingPage/Navbar.tsx
git commit -m "refactor(navbar): RSC header + NavbarIsland client wrapper

Brand link, desktop nav anchors, CTA button render as RSC on the
server. NavbarIsland holds the interactive bits — scroll-position
background class, mobile menu state, Escape/click-outside listeners,
AnimatePresence — and receives pre-resolved i18n strings + composed
children (LanguageSelector, CTA) as props. Estimated -25 KB client
bundle since useTranslation + getCurrentLanguageFromPath no longer
ship for Navbar content."
```

---

## Task 6: Wire ClientPage — Navbar/SocialProof/FAQ now take props

**Files:**
- Modify: `components/ClientPage.tsx`

Sve tri komponente koje su bile `'use client'` sada su RSC sa `{ t, lang }` props (SocialProof prima `t`, FAQ prima `t`, Navbar prima `t` + `lang`). ClientPage mora prosljeđivati.

- [ ] **Step 1: Edit `components/ClientPage.tsx`**

```tsx
// components/ClientPage.tsx — NO 'use client' — RSC orchestrator
import type { TFunction } from 'i18next';
import type { PricingPlanRow } from '@/lib/pricing-db';

import Navbar from '@/components/landingPage/Navbar';
import HeroSection from '@/components/landingPage/HeroSection';
import PainPoints from '@/components/landingPage/PainPoints';
import Solution from '@/components/landingPage/Solution';
import HowItWorks from '@/components/landingPage/HowItWorks';
import SocialProof from '@/components/landingPage/SocialProof';
import Benefits from '@/components/landingPage/Benefits';
import Pricing from '@/components/landingPage/Pricing';
import FAQ from '@/components/landingPage/FAQ';
import Footer from '@/components/landingPage/Footer';

interface ClientPageProps {
  t: TFunction;
  lang: 'sr' | 'en';
  tiers: PricingPlanRow[];
}

export default function ClientPage({ t, lang, tiers }: ClientPageProps) {
  return (
    <>
      <Navbar t={t} lang={lang} />
      <HeroSection t={t} lang={lang} />
      <PainPoints t={t} />
      <Solution t={t} lang={lang} />
      <HowItWorks t={t} lang={lang} />
      <SocialProof t={t} />
      <Benefits t={t} lang={lang} />
      <Pricing t={t} lang={lang} tiers={tiers} />
      <FAQ t={t} />
      <Footer t={t} lang={lang} />
    </>
  );
}
```

Jedina razlika od Phase 7 verzije je da Navbar/SocialProof/FAQ sada primaju props.

- [ ] **Step 2: Verify sve testove + build**

```bash
rm -rf .next && pnpm build 2>&1 | tail -10
npx tsc --noEmit
pnpm test:unit 2>&1 | tail -10
pnpm lint 2>&1 | tail -5
```
Expected:
- 0 TS errors
- Build success, sva 3 route (`/`, `/sr`, `/en`) prerender-uju kao static
- Tests: 85+/85+ (82 prior + 3 FAQ tests)
- Lint: samo pre-existing CanvasRenderer warning

- [ ] **Step 3: Lokalni SSR smoke**

```bash
pnpm start &
sleep 5

echo "=== SSR FAQ uses <details>? ==="
curl -s http://localhost:3000/sr | grep -c "<details" # expect 8
echo "=== SSR Navbar sans useState hydration? ==="
# Simple heuristic — check h1 and nav are present
curl -s http://localhost:3000/sr | grep -oE '<nav[^>]*>' | head -1
curl -s http://localhost:3000/sr | grep -oE '<h1[^>]*>[^<]{1,80}' | head -1
echo "=== SSR preload hint present? ==="
curl -s http://localhost:3000/sr | grep -oE 'rel="preload"[^>]*'  | head -2

kill %1 2>/dev/null
```
Expected:
- 8 `<details>` elements
- `<nav>` + `<h1>` with Serbian text in body
- `rel="preload"` for hero image

- [ ] **Step 4: Commit**

```bash
git add components/ClientPage.tsx
git commit -m "refactor(client-page): pass t + lang to Navbar, SocialProof, FAQ

Three remaining client components from pre-Phase-8 now RSC; ClientPage
must thread pre-resolved t (and lang for Navbar) through to them.
Completes the 10-of-10 landing section migration — only framer-motion
islands and LanguageSelector remain as client boundaries."
```

---

## Task 7: Push + PR

**Files:** none

- [ ] **Step 1: Full verify**

```bash
rm -rf .next && pnpm build 2>&1 | tail -15
pnpm test:unit 2>&1 | tail -5
npx tsc --noEmit
pnpm lint 2>&1 | tail -5
```
Sve zeleno? Onda push.

- [ ] **Step 2: Push + PR**

```bash
git push -u origin perf/lcp-phase8-finishing

gh pr create \
  --title "perf(landing): Phase 8 LCP finishing — native details, RSC nav/social-proof, CSS inline, hero preload" \
  --body "$(cat <<'EOF'
## Summary
Final LCP push after Phase 7 RSC migration. Target: **LCP 4.6s → <2.5s**.

Five optimizations, each independently shippable but bundled for one deploy cycle:

1. **experimental.optimizeCss** in \`next.config.mjs\` — Next.js inlines critical CSS via Critters, defers the 650ms render-blocking stylesheets flagged post-Phase-7.
2. **Hero image preload** via \`<link rel=preload>\` in layout — Next/image priority hint wasn't propagating through FadeInUpOnMount island; manual hint starts the fetch during HTML parse.
3. **FAQ shadcn Accordion → native \`<details>/<summary>\`** — zero JS, full keyboard + screen reader support, ChevronDown rotates via \`group-open:rotate-180\` CSS. FAQ becomes RSC. ~20 KB client bundle drop.
4. **SocialProof RSC body + CounterCard island** — h2, Product Hunt badge, and labels are RSC. Only the IntersectionObserver + rAF counter animation lives in a small client island per stat card. ~15 KB drop.
5. **Navbar RSC header + NavbarIsland** — brand link, desktop anchors, CTA, LanguageSelector all pass through as children. NavbarIsland owns scroll listener, mobile menu state, Escape/click-outside, AnimatePresence. ~25 KB drop.

## Expected impact
- **Client bundle:** ~-60 KB from three remaining client components (from 387 KB → ~325 KB)
- **Render-blocking CSS:** 650ms → near zero (inlined)
- **Hero LCP candidate:** starts fetching ~300ms earlier via preload
- **LCP:** 4.6s → **<2.5s target**
- **Perf:** 77 → 85+

## Test plan
- [ ] CI: \`pnpm build\` + \`test:unit\` (85+ tests) + \`lint\` + \`e2e\` all green
- [ ] SSR HTML: 8 \`<details>\` elements in FAQ, no shadcn Accordion bundle shipped, \`rel=preload\` for hero present
- [ ] Manual: FAQ expand/collapse works with JavaScript DISABLED (native details)
- [ ] Manual: Navbar mobile menu still opens, Escape closes, click-outside closes
- [ ] Manual: SocialProof counters still animate on scroll into view (20, 100, 4)
- [ ] Lighthouse against Vercel preview: LCP <2.5s, Perf >=85

## Risks
- \`experimental.optimizeCss\` requires \`critters\` package; if build fails, install and retry
- \`<details>\` styling differs slightly from Radix Accordion (native disclosure widget) — visual review during preview deploy
- NavbarIsland composition pattern (children as props) is standard RSC interop but verify LanguageSelector renders correctly inside the island

## Out-of-scope
- Edge Runtime for layout — explored, layout doesn't call Prisma so would work, but no LCP benefit and not worth the risk
EOF
)"
```

---

## Task 8: Post-merge live Lighthouse verification

**Files:** none

Identical safety net to Phase 7 Task 8: if LCP stays >2.5s after deploy + cache warmup, do NOT close the task — dispatch deeper analysis.

- [ ] **Step 1: Čekaj Vercel deploy**

Monitor until `/sr` response size OR `<details>` count signals new deploy. Key markers:
- `<details>` tag count in SSR (expect 8 after deploy; 0 before)
- `<link rel="preload"` for hero image

- [ ] **Step 2: Run Lighthouse (warmup + real)**

```bash
npx -y lighthouse@latest https://www.dodajuspomenu.com/sr --only-categories=performance \
  --output=json --output-path=/tmp/lh-warm.json --chrome-flags="--headless --no-sandbox" --quiet 2>&1 | tail -2

npx -y lighthouse@latest https://www.dodajuspomenu.com/sr --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output=html --output-path=claudedocs/lh-phase8-sr-mobile \
  --chrome-flags="--headless --no-sandbox" --quiet 2>&1 | tail -3

node -e '
const r = require("./claudedocs/lh-phase8-sr-mobile.report.json");
console.log("=== SR Mobile (post-Phase-8) ===");
for (const k of ["performance","accessibility","best-practices","seo"]) {
  console.log("  " + k + ":", Math.round((r.categories[k]?.score ?? 0) * 100));
}
console.log("  LCP:", r.audits["largest-contentful-paint"].displayValue);
console.log("  FCP:", r.audits["first-contentful-paint"].displayValue);
console.log("  CLS:", r.audits["cumulative-layout-shift"].displayValue);
console.log("  TBT:", r.audits["total-blocking-time"].displayValue);
console.log("  Total weight:", r.audits["total-byte-weight"].displayValue);
console.log("\nBytes:");
(r.audits["resource-summary"]?.details?.items || []).forEach(x => {
  console.log("  " + x.label + ": " + x.requestCount + " req, " + Math.round(x.transferSize/1024) + "KB");
});
'
```
Target: Perf ≥85, LCP <2.5s.

- [ ] **Step 3: Ako LCP ostaje ≥2.5s**

NE deklariši done. Pokreni dublju analizu:
1. `ANALYZE=true pnpm build` i pogledaj bundle analyzer — da li se LanguageSelector ili i18next previše šire
2. Provjeri je li Vercel edge cache warm (ponovi Lighthouse odmah nakon prvog — drugi bi trebao biti brži)
3. Check `render-blocking-insight` u Lighthouse JSON — ako optimizeCss nije eliminisao ga, Critters možda nije u dependencies
4. Check `preload-lcp-image` audit — da li sad ima score 1

- [ ] **Step 4: Append verification report**

Update `claudedocs/2026-04-20-launch-verification.md` sa finalnim Lighthouse brojkama.

---

## Verification (end-to-end)

```bash
# Build + unit
rm -rf .next && pnpm build
pnpm test:unit  # expect 85/85 (82 prior + 3 FAQ tests)

# SSR smoke
pnpm start &
sleep 4
curl -s http://localhost:3000/sr | grep -c "<details"       # expect 8
curl -s http://localhost:3000/sr | grep -oE 'rel="preload"' # expect 1+
kill %1

# Live Lighthouse
npx -y lighthouse@latest https://www.dodajuspomenu.com/sr --only-categories=performance \
  --quiet --output=json --chrome-flags="--headless --no-sandbox" 2>/dev/null | \
  node -e 'let d=""; process.stdin.on("data",c=>d+=c); process.stdin.on("end",()=>{
    const r = JSON.parse(d);
    console.log("Perf:", Math.round(r.categories.performance.score * 100));
    console.log("LCP:", r.audits["largest-contentful-paint"].displayValue);
  });'
```

Expected: 85+ Perf, <2.5s LCP.

---

## Followups (out of scope)

- **Replace LanguageSelector** with pure `<Link>`-based locale switcher — removes the last i18next-dependent island from landing; further bundle drop.
- **Font subsetting** — 4 woff2 fonts (189 KB) could subset-optimize; Next/font should auto-do this but verify.
- **Service worker / PWA** — would enable offline-first landing with Workbox. Already flagged as disabled in CLAUDE.md due to next-pwa incompat with Next 15.
- **Edge Runtime for layout** — explored, not worth the risk without Prisma call (no benefit).
- **Native accordion animation** — `<details>` doesn't animate height by default; `details-content` CSS property coming in 2026 will unlock this without JS. Current approach is acceptable (instant snap open/close).

---

## Critical files

- **Created:** `components/motion/CounterCard.tsx`, `components/motion/NavbarIsland.tsx`, `__tests__/components/FAQNativeDetails.test.tsx`
- **Modified:** `next.config.mjs`, `app/layout.tsx`, `components/ClientPage.tsx`, `components/landingPage/{Navbar,SocialProof,FAQ}.tsx`

---

**Generisano 2026-04-20. Plan je evidence-based — svaka stavka proistekla iz post-Phase-7 Lighthouse analize i strukturnog audita 3 preostale client komponente.**
