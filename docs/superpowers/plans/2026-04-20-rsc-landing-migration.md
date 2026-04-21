# RSC Landing Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Konvertovati 7 od 10 landing sekcija iz `'use client'` u React Server Components kroz extract-motion-island pattern, čime se smanjuje client bundle ~40% i LCP pada sa 6.0s na <2.5s.

**Architecture:** Dva ključna komada infrastrukture omogućavaju migraciju: (1) novi `lib/i18n/server.ts` sinhroni helper koji resolve-uje strings u server kontekstu per-locale (ujedno rješava SSR flash koji je ostavljen kao followup iz prethodne LCP runde), (2) reusable `<FadeInOnScroll>` client island koji wrap-uje server body u framer-motion transition, omogućavajući sekciji da bude RSC dok animacija ostaje client-side. 3 komponente ostaju `'use client'` jer su inherentno interaktivne (Navbar mobile menu, SocialProof counter, FAQ Accordion). I18nProvider ostaje na klijentu za interaktivne komponente ali landing sekcije više ne zavise od njega.

**Tech Stack:** Next.js 15 App Router (RSC + Client Components), react-i18next 15.5.1 + i18next 25.2.0 (sa novim server helper-om), framer-motion 12.11.0 (izolovano u klijent islandima), TypeScript strict, Jest + @testing-library/react.

---

## Context

Nakon PR-ova #11/#12/#13 (sync i18n init + BCP47 fix + middleware exempt), live landing LCP je **6.0s** — značajno bolje od 11.9s ali još uvijek daleko od Core Web Vitals "good" cilja (2.5s). FCP 3.2s pokazuje da preostali bottleneck nije network payload (već 1.18 MB, 66% manji) već client-side hydration vrijeme. Deep Lighthouse analiza:

- 23 JS chunka (hydration)
- 650ms render-blocking CSS
- Mainthread 820ms (Script evaluation + parse)
- `unused-javascript`: 93 KiB savings

Fundamentalan uzrok: **sve 10 landing sekcija nose `'use client'` marker zato što pozivaju `useTranslation()` hook**. Dok I18nProvider blok-renderuje u PR #11, `useTranslation` je client-only hook — nemoguće ga je pozvati u RSC. Rezultat: cijeli landing markup se hydrat-uje.

Audit exploration ([report upload]) mapirao je 10 komponenti:
- **NO** (mora ostati client): Navbar (menu state), SocialProof (IntersectionObserver counter), FAQ (Accordion)
- **ISLAND** (konvertibilno u RSC + motion island): HeroSection, PainPoints, Solution, HowItWorks, Benefits, Footer, Pricing — 7 komponenti

Osim LCP benefita, plan rješava i **SSR language caveat** iz PR #11 (brief SR flash na /en rutama) jer per-locale server i18n resolve eliminiše shared singleton race. Oba problema imaju istu osnovu.

Procjena: **4-6 sati** fokusiranog rada (13 taskova).

---

## File Structure

| Fajl | Akcija | Odgovornost |
|---|---|---|
| `lib/i18n/server.ts` | Create | Per-locale sinhroni `t` factory za server komponente; reusable across pages. |
| `__tests__/lib/i18n-server.test.ts` | Create | Verifikuje izolovane per-locale instance + correctness. |
| `components/motion/FadeInOnScroll.tsx` | Create | Client island koji wrap-uje children u `motion.div` sa `whileInView + useReducedMotion`. |
| `components/motion/FadeInUpOnMount.tsx` | Create | Slično ali koristi `animate` umjesto `whileInView` (za above-fold hero). |
| `components/motion/ScrollToTopButton.tsx` | Create | Izolovani Footer scroll-to-top kao client island. |
| `components/landingPage/HeroSection.tsx` | Modify | Konvertovati u RSC; prop-driven translations; motion kroz FadeInUpOnMount. |
| `components/landingPage/PainPoints.tsx` | Modify | RSC; FadeInOnScroll wrappers. |
| `components/landingPage/Solution.tsx` | Modify | RSC; FadeInOnScroll. |
| `components/landingPage/HowItWorks.tsx` | Modify | RSC; FadeInOnScroll. |
| `components/landingPage/Benefits.tsx` | Modify | RSC; FadeInOnScroll. |
| `components/landingPage/Pricing.tsx` | Modify | RSC; pre-resolve Intl.NumberFormat strings server-side. |
| `components/landingPage/Footer.tsx` | Modify | RSC body; ScrollToTopButton island za scroll-top. |
| `components/ClientPage.tsx` | Modify | Postaje RSC orchestrator. Prop-type proširen sa `translations`. |
| `app/sr/page.tsx` | Modify | Poziva `getServerT('sr')`, resolve-uje sve landing stringove, prosljeđuje. |
| `app/en/page.tsx` | Modify | Isto za 'en'. |
| `app/page.tsx` | Modify | Isto (fallback to 'sr'). |

---

## Pre-flight

- [ ] **Step 1: Čist tree, branch off main**

```bash
cd /Users/nmil/Desktop/WeddingApp
git status
git pull origin main
git checkout -b perf/rsc-landing-migration
```
Expected: HEAD na `04948dc` ili noviji, clean tree (samo untracked docs/claude artifacts OK).

- [ ] **Step 2: Baseline Lighthouse pre-migration**

```bash
mkdir -p claudedocs
npx -y lighthouse@latest https://www.dodajuspomenu.com/sr --only-categories=performance \
  --output=html --output-path=claudedocs/lh-pre-rsc --chrome-flags="--headless --no-sandbox" --quiet 2>&1 | tail -3
```
Zabilježi Perf/LCP/FCP/TBT za usporedbu na kraju.

---

## Task 1: Server i18n helper — test-first

**Files:**
- Create: `__tests__/lib/i18n-server.test.ts`

- [ ] **Step 1: Napiši failing test**

```ts
// __tests__/lib/i18n-server.test.ts
import { getServerT } from '@/lib/i18n/server';

describe('lib/i18n/server — per-locale sync t factory', () => {
  it('returns Serbian string for sr locale', () => {
    const t = getServerT('sr');
    const result = t('hero.titleLine1');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('hero.titleLine1');
  });

  it('returns English string for en locale', () => {
    const t = getServerT('en');
    const result = t('hero.titleLine1');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('hero.titleLine1');
  });

  it('sr and en return different strings for same key (locale isolation)', () => {
    const tSr = getServerT('sr');
    const tEn = getServerT('en');
    expect(tSr('hero.titleLine1')).not.toBe(tEn('hero.titleLine1'));
  });

  it('supports interpolation', () => {
    const t = getServerT('sr');
    const result = t('pricing.labels.daysStored', { count: 30 });
    expect(result).toContain('30');
  });

  it('does not share state across calls (concurrent safety)', () => {
    const tSr1 = getServerT('sr');
    const tEn = getServerT('en');
    const tSr2 = getServerT('sr');
    expect(tSr1('hero.titleLine1')).toBe(tSr2('hero.titleLine1'));
    expect(tEn('hero.titleLine1')).not.toBe(tSr1('hero.titleLine1'));
  });
});
```

- [ ] **Step 2: Run — treba da FAIL-uje**

Run: `pnpm test:unit -- __tests__/lib/i18n-server.test.ts`
Expected: FAIL sa "Cannot find module '@/lib/i18n/server'".

## Task 2: Implementuj `lib/i18n/server.ts`

**Files:**
- Create: `lib/i18n/server.ts`

**Key constraint:** Svaki `getServerT` poziv mora vratiti `t` funkciju koja je **vezana za svoj locale**, nezavisno od bilo koje globalne state. Ovo se postiže kreiranjem nove i18next instance per-call ili korištenjem `i18next.cloneInstance()`.

- [ ] **Step 1: Napiši fajl**

```ts
// lib/i18n/server.ts
// Server-only sinhroni i18next factory. Vraća `t` funkciju vezanu za specific locale.
// Ne dijeli state sa klijentskom `lib/i18n/i18n.ts` instance-om — svaki poziv
// kreira novu, izolovanu instance tako da concurrent server renders za različite
// locale-ove ne mogu da se petljaju jedna u drugu (rješava SSR language flash
// koji je bio followup iz PR #11).
import i18next, { type TFunction } from 'i18next';
import srTranslation from '@/locales/sr/translation.json';
import enTranslation from '@/locales/en/translation.json';

export type SupportedLocale = 'sr' | 'en';

const resources = {
  sr: { translation: srTranslation },
  en: { translation: enTranslation },
} as const;

export function getServerT(locale: SupportedLocale): TFunction {
  const instance = i18next.createInstance();
  instance.init({
    lng: locale,
    fallbackLng: 'sr',
    resources,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance.t.bind(instance);
}
```

- [ ] **Step 2: TS check + test**

```bash
npx tsc --noEmit
pnpm test:unit -- __tests__/lib/i18n-server.test.ts
```
Expected: 5/5 PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/i18n/server.ts __tests__/lib/i18n-server.test.ts
git commit -m "feat(i18n): server-side sync t factory with per-call instance isolation

Each getServerT(locale) returns a fresh i18next instance bound to that
locale. Concurrent server renders for different locales no longer share
state, eliminating the /en SSR-flash-to-SR caveat from PR #11.

Enables upcoming RSC migration of landing sections — page.tsx can
resolve translations server-side and pass strings as props instead of
requiring useTranslation() client hook in every landing component."
```

---

## Task 3: FadeInOnScroll client island

**Files:**
- Create: `components/motion/FadeInOnScroll.tsx`

- [ ] **Step 1: Napiši**

```tsx
// components/motion/FadeInOnScroll.tsx
'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

interface FadeInOnScrollProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'whileInView' | 'viewport'> {
  children: ReactNode;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'article';
}

export function FadeInOnScroll({
  children,
  delay = 0,
  as = 'div',
  className,
  ...rest
}: FadeInOnScrollProps) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];

  return (
    <MotionTag
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay }}
      className={className}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
```

**Napomena:** Prihvata `children` (može biti server-rendered markup), `delay`, `as` za semantic HTML. Preserveruje svojstva kao `className` i ostale HTML atribute kroz `...rest`.

## Task 4: FadeInUpOnMount island (za above-fold)

**Files:**
- Create: `components/motion/FadeInUpOnMount.tsx`

- [ ] **Step 1:**

```tsx
// components/motion/FadeInUpOnMount.tsx
'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

interface FadeInUpOnMountProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate'> {
  children: ReactNode;
  delay?: number;
  duration?: number;
}

export function FadeInUpOnMount({
  children,
  delay = 0,
  duration = 0.7,
  className,
  ...rest
}: FadeInUpOnMountProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={false}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration, delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
```

**Razlika:** Fire-uje na mount (ne na scroll). Koristi se za hero gdje imamo `initial={false}` (content vidljiv odmah, samo animate fine-tune-uje y position za smooth entrance).

## Task 5: ScrollToTopButton island

**Files:**
- Create: `components/motion/ScrollToTopButton.tsx`

Footer trenutno drži scroll state + scroll-to-top button u jednoj komponenti. Extract button u svoj client island da Footer body može biti RSC.

- [ ] **Step 1:**

```tsx
// components/motion/ScrollToTopButton.tsx
'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

interface ScrollToTopButtonProps {
  label: string;
}

export function ScrollToTopButton({ label }: ScrollToTopButtonProps) {
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          aria-label={label}
          onClick={() => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: 8 }}
          className="fixed bottom-6 right-6 z-40 p-3 bg-primary text-white rounded-full shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
        >
          <ChevronUp aria-hidden="true" className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
```

---

## Task 6: Convert HeroSection → RSC

**Files:**
- Modify: `components/landingPage/HeroSection.tsx`

**Current signature:** `HeroSection()` — no props, uses `useTranslation()`.
**New signature:** `HeroSection({ t, lang })` — receives pre-resolved `t` function + locale, uses FadeInUpOnMount for motion.

- [ ] **Step 1: Pročitaj postojeću HeroSection.tsx**

Run: `cat components/landingPage/HeroSection.tsx`
Zabilježi structure — JSX skeleton + which t() keys se koriste + trust indicators array.

- [ ] **Step 2: Zamijeni sadržaj**

```tsx
// components/landingPage/HeroSection.tsx
// NO 'use client' directive — this is now an RSC.
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Shield, Clock, CheckCircle, Sparkles } from 'lucide-react';
import type { TFunction } from 'i18next';
import { FadeInUpOnMount } from '@/components/motion/FadeInUpOnMount';

interface HeroSectionProps {
  t: TFunction;
  lang: 'sr' | 'en';
}

export default function HeroSection({ t, lang }: HeroSectionProps) {
  const trustIndicators = [
    { icon: Shield, text: t('hero.trustPrivacy') },
    { icon: Clock, text: t('hero.trustSpeed') },
    { icon: CheckCircle, text: t('hero.trustFree') },
  ];

  return (
    <section
      className="relative pt-20 pb-12 sm:pt-24 sm:pb-16 md:pt-28 md:pb-20 bg-lp-bg"
      aria-labelledby="hero-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
        <FadeInUpOnMount className="flex flex-col gap-4 sm:gap-6">
          <div className="inline-flex items-center gap-2 w-fit px-3 py-1 rounded-full bg-lp-accent/10 text-lp-accent text-sm">
            <Sparkles aria-hidden="true" className="w-4 h-4" />
            <span>{t('hero.eyebrow')}</span>
          </div>
          <h1 id="hero-heading" className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
            {t('hero.titleLine1')}
            <br />
            <span className="text-lp-primary">{t('hero.titleLine2')}</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            {t('hero.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href="/admin/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-lp-primary text-white rounded-md font-medium hover:bg-lp-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary"
            >
              {t('hero.ctaPrimary')}
              <ArrowRight aria-hidden="true" className="w-4 h-4" />
            </Link>
          </div>
          <ul className="flex flex-wrap gap-4 sm:gap-6 mt-2">
            {trustIndicators.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-sm text-gray-600">
                <Icon aria-hidden="true" className="w-4 h-4 text-lp-primary" />
                {text}
              </li>
            ))}
          </ul>
        </FadeInUpOnMount>

        <FadeInUpOnMount delay={0.2} className="relative mx-auto w-[200px] h-[400px] sm:w-[240px] sm:h-[480px] md:w-[280px] md:h-[560px]">
          <div className="relative w-full h-full rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.25rem] overflow-hidden bg-white">
            <Image
              src={`/images/${lang}/guest-login-filled.png`}
              alt={t('hero.mockupAlt')}
              fill
              className="object-cover object-top"
              priority
              sizes="(max-width: 640px) 200px, (max-width: 768px) 240px, (max-width: 1024px) 280px, 300px"
            />
          </div>
        </FadeInUpOnMount>
      </div>
    </section>
  );
}
```

**Note:** JSX strukturu možda treba adjust-ovati da tačno odgovara originalu — koristi grep + originalni fajl da bi preuzeo tačne klase/atribute ako se razlikuju od ovog template-a. Ključno je da se **nijedan `'use client'` marker ne vrati** i da svi t() pozivi idu kroz `t` prop.

- [ ] **Step 3: Build smoke**

Run: `rm -rf .next && pnpm build`
Expected: HeroSection se listuje kao RSC u build outputu (ili barem nema client-component errorov). Build success.

- [ ] **Step 4: Commit**

```bash
git add components/motion/FadeInOnScroll.tsx components/motion/FadeInUpOnMount.tsx components/motion/ScrollToTopButton.tsx components/landingPage/HeroSection.tsx
git commit -m "refactor(landing): HeroSection + 3 motion islands

HeroSection is now a React Server Component receiving pre-resolved
t and lang as props. FadeInUpOnMount client island preserves the
mount animation without marking the whole section as 'use client'.

Also introduces two sibling islands that will be reused in later
tasks: FadeInOnScroll (whileInView pattern) and ScrollToTopButton
(Footer's scroll-to-top affordance)."
```

---

## Task 7: Convert PainPoints → RSC

**Files:**
- Modify: `components/landingPage/PainPoints.tsx`

Pattern is identical across the remaining ISLAND components: receive `t` prop, replace `<motion.div>` wrappers with `<FadeInOnScroll>`, remove `'use client'`.

- [ ] **Step 1: Pročitaj PainPoints.tsx da zabilježiš tačan JSX skeleton + t() keys**

Run: `cat components/landingPage/PainPoints.tsx`

- [ ] **Step 2: Zamijeni sa RSC verzijom**

```tsx
// components/landingPage/PainPoints.tsx — NO 'use client'
import { CheckSquare } from 'lucide-react';
import type { TFunction } from 'i18next';
import { FadeInOnScroll } from '@/components/motion/FadeInOnScroll';

interface PainPointsProps {
  t: TFunction;
}

export default function PainPoints({ t }: PainPointsProps) {
  const items = [
    t('painPoints.item1'),
    t('painPoints.item2'),
    t('painPoints.item3'),
    t('painPoints.item4'),
  ];

  return (
    <section className="py-16 sm:py-20 bg-white" aria-labelledby="painpoints-heading">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <FadeInOnScroll>
          <h2 id="painpoints-heading" className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8">
            {t('painPoints.title')}
          </h2>
        </FadeInOnScroll>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-left">
          {items.map((text, i) => (
            <FadeInOnScroll key={text} as="li" delay={i * 0.08} className="flex items-start gap-3 p-4 rounded-lg bg-gray-50">
              <CheckSquare aria-hidden="true" className="w-5 h-5 text-lp-primary shrink-0 mt-0.5" />
              <span className="text-gray-700">{text}</span>
            </FadeInOnScroll>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

**Napomena:** Ako PainPoints trenutno koristi drugačiji tekstualni layout (e.g. ima subtitle, footer CTA, drugi broj stavki), adjust-uj template da matchira originalni JSX. Samo animacija strategy i prop shape se mijenjaju.

- [ ] **Step 3: Build smoke**

Run: `pnpm build 2>&1 | tail -10` → uspjeh.

- [ ] **Step 4: Commit**

```bash
git add components/landingPage/PainPoints.tsx
git commit -m "refactor(landing): PainPoints → RSC using FadeInOnScroll"
```

---

## Task 8: Convert Solution → RSC

**Files:**
- Modify: `components/landingPage/Solution.tsx`

Isti pattern: čitaj original, zamijeni sa RSC verzijom, koristi FadeInOnScroll, t je prop.

- [ ] **Step 1: `cat components/landingPage/Solution.tsx`**

- [ ] **Step 2: Zamijeni**

```tsx
// components/landingPage/Solution.tsx — NO 'use client'
import Image from 'next/image';
import type { TFunction } from 'i18next';
import { FadeInOnScroll } from '@/components/motion/FadeInOnScroll';

interface SolutionProps {
  t: TFunction;
  lang: 'sr' | 'en';
}

export default function Solution({ t, lang }: SolutionProps) {
  return (
    <section className="py-16 sm:py-20 bg-lp-bg" aria-labelledby="solution-heading">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <FadeInOnScroll>
          <h2 id="solution-heading" className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            {t('solution.title')}
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto mb-10">
            {t('solution.description')}
          </p>
        </FadeInOnScroll>

        <FadeInOnScroll delay={0.15}>
          <Image
            src={`/images/${lang}/gallery-desktop.png`}
            alt={t('solution.imageAlt')}
            width={1200}
            height={617}
            className="w-full h-auto rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl"
          />
        </FadeInOnScroll>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
pnpm build 2>&1 | tail -5
git add components/landingPage/Solution.tsx
git commit -m "refactor(landing): Solution → RSC"
```

---

## Task 9: Convert HowItWorks → RSC

**Files:**
- Modify: `components/landingPage/HowItWorks.tsx`

- [ ] **Step 1: `cat components/landingPage/HowItWorks.tsx`**

- [ ] **Step 2: Zamijeni**

```tsx
// components/landingPage/HowItWorks.tsx — NO 'use client'
import Image from 'next/image';
import { UserPlus, QrCode, Download } from 'lucide-react';
import type { TFunction } from 'i18next';
import { FadeInOnScroll } from '@/components/motion/FadeInOnScroll';

interface HowItWorksProps {
  t: TFunction;
  lang: 'sr' | 'en';
}

export default function HowItWorks({ t, lang }: HowItWorksProps) {
  const steps = [
    { icon: UserPlus, title: t('howItWorks.step1Title'), description: t('howItWorks.step1Description'), num: '1' },
    { icon: QrCode, title: t('howItWorks.step2Title'), description: t('howItWorks.step2Description'), num: '2' },
    { icon: Download, title: t('howItWorks.step3Title'), description: t('howItWorks.step3Description'), num: '3' },
  ];

  return (
    <section id="kako-radi" className="py-16 sm:py-20 bg-white" aria-labelledby="how-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <FadeInOnScroll className="text-center mb-12">
          <h2 id="how-heading" className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            {t('howItWorks.title')}
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            {t('howItWorks.description')}
          </p>
        </FadeInOnScroll>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {steps.map(({ icon: Icon, title, description, num }, i) => (
            <FadeInOnScroll key={num} as="li" delay={i * 0.12} className="p-6 bg-gray-50 rounded-xl text-center">
              <Icon aria-hidden="true" className="w-10 h-10 text-lp-primary mx-auto mb-3" />
              <div className="text-sm text-lp-accent font-semibold mb-1">{num}</div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </FadeInOnScroll>
          ))}
        </ol>

        <FadeInOnScroll delay={0.35}>
          <Image
            src={`/images/${lang}/dashboard-desktop.png`}
            alt={t('howItWorks.imageAlt')}
            width={1200}
            height={617}
            className="w-full h-auto rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg max-h-[300px] sm:max-h-none object-cover object-top"
          />
        </FadeInOnScroll>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
pnpm build 2>&1 | tail -5
git add components/landingPage/HowItWorks.tsx
git commit -m "refactor(landing): HowItWorks → RSC"
```

---

## Task 10: Convert Benefits → RSC

**Files:**
- Modify: `components/landingPage/Benefits.tsx`

- [ ] **Step 1: `cat components/landingPage/Benefits.tsx`** — zabilježi koliko benefits itema, kakav CTA.

- [ ] **Step 2: Adapt-uj template prema originalu**

Ako Benefits ima 4 items sa ikonama + CTA na kraj:

```tsx
// components/landingPage/Benefits.tsx — NO 'use client'
import Link from 'next/link';
import { Gift, Users, Zap, Heart, ArrowRight } from 'lucide-react';
import type { TFunction } from 'i18next';
import { FadeInOnScroll } from '@/components/motion/FadeInOnScroll';

interface BenefitsProps {
  t: TFunction;
}

export default function Benefits({ t }: BenefitsProps) {
  const items = [
    { icon: Gift, title: t('benefits.item1Title'), description: t('benefits.item1Description') },
    { icon: Users, title: t('benefits.item2Title'), description: t('benefits.item2Description') },
    { icon: Zap, title: t('benefits.item3Title'), description: t('benefits.item3Description') },
    { icon: Heart, title: t('benefits.item4Title'), description: t('benefits.item4Description') },
  ];

  return (
    <section className="py-16 sm:py-20 bg-lp-bg" aria-labelledby="benefits-heading">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <FadeInOnScroll className="text-center mb-12">
          <h2 id="benefits-heading" className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            {t('benefits.title')}
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            {t('benefits.description')}
          </p>
        </FadeInOnScroll>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {items.map(({ icon: Icon, title, description }, i) => (
            <FadeInOnScroll key={title} as="li" delay={i * 0.08} className="p-6 bg-white rounded-xl shadow-sm">
              <Icon aria-hidden="true" className="w-8 h-8 text-lp-primary mb-3" />
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </FadeInOnScroll>
          ))}
        </ul>

        <FadeInOnScroll delay={0.4} className="text-center mt-10">
          <Link
            href="/admin/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-lp-primary text-white rounded-md hover:bg-lp-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lp-primary"
          >
            {t('benefits.cta')}
            <ArrowRight aria-hidden="true" className="w-4 h-4" />
          </Link>
        </FadeInOnScroll>
      </div>
    </section>
  );
}
```

**Bitno:** Ikone listirane gore (`Gift, Users, Zap, Heart`) su placeholder. **Zadrži tačne ikone iz originalnog fajla** — samo zamijeni motion/i18n pattern.

- [ ] **Step 3: Build + commit**

```bash
pnpm build 2>&1 | tail -5
git add components/landingPage/Benefits.tsx
git commit -m "refactor(landing): Benefits → RSC"
```

---

## Task 11: Convert Pricing → RSC (sa pre-resolved Intl formatom)

**Files:**
- Modify: `components/landingPage/Pricing.tsx`

Pricing ima dodatnu kompleksnost: koristi `Intl.NumberFormat(i18n.language, ...)` za format cijena. U RSC verziji, treba pre-format-ovati cijene u `page.tsx` i poslati kao dio props-a (ili rukovati formattingom server-side što je trivijalno).

- [ ] **Step 1: Pročitaj postojeći Pricing.tsx**

Run: `cat components/landingPage/Pricing.tsx`

Zabilježi: PricingPlanRow shape, kako se renderuju features, kako se prikazuju metric labels.

- [ ] **Step 2: Zamijeni sa RSC verzijom**

```tsx
// components/landingPage/Pricing.tsx — NO 'use client'
import Link from 'next/link';
import { Crown, Check, ArrowRight, Camera, Users, Clock, Sparkles } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { PricingPlanRow } from '@/lib/pricing-db';
import { FadeInOnScroll } from '@/components/motion/FadeInOnScroll';

interface PricingProps {
  t: TFunction;
  lang: 'sr' | 'en';
  tiers: PricingPlanRow[];
}

const localeCode = (lang: 'sr' | 'en') => (lang === 'sr' ? 'sr-RS' : 'en-US');

function formatCurrency(amountCents: number, lang: 'sr' | 'en'): string {
  return new Intl.NumberFormat(localeCode(lang), {
    style: 'currency',
    currency: 'EUR',
  }).format(amountCents / 100);
}

export default function Pricing({ t, lang, tiers }: PricingProps) {
  return (
    <section id="cenovnik" className="py-16 sm:py-20 bg-white" aria-labelledby="pricing-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <FadeInOnScroll className="text-center mb-12">
          <h2 id="pricing-heading" className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            {t('pricing.title')}
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            {t('pricing.description')}
          </p>
        </FadeInOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((plan, i) => (
            <FadeInOnScroll
              key={plan.tier}
              delay={i * 0.1}
              className={`relative p-6 sm:p-8 rounded-2xl border ${
                plan.recommended
                  ? 'bg-lp-primary text-white border-lp-primary md:scale-[1.03] shadow-xl'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 bg-white text-lp-primary text-xs font-semibold rounded-full shadow-sm">
                  <Crown aria-hidden="true" className="w-3 h-3" />
                  {t('pricing.recommended')}
                </div>
              )}
              <h3 className="text-xl font-bold mb-2">
                {lang === 'sr' ? plan.nameSr : plan.nameEn}
              </h3>
              <div className="text-4xl font-bold mb-6">
                {plan.price === 0 ? t('pricing.free') : formatCurrency(plan.price, lang)}
              </div>

              <dl className="grid grid-cols-2 gap-3 mb-6 text-sm">
                <div className="flex flex-col gap-1">
                  <Camera aria-hidden="true" className={`w-4 h-4 ${plan.recommended ? 'text-white/80' : 'text-lp-primary'}`} />
                  <dt className={`text-xs uppercase ${plan.recommended ? 'text-white/70' : 'text-gray-500'}`}>{t('pricing.labels.imagesPerGuest')}</dt>
                  <dd className="font-semibold">{plan.imageLimit}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <Users aria-hidden="true" className={`w-4 h-4 ${plan.recommended ? 'text-white/80' : 'text-lp-primary'}`} />
                  <dt className={`text-xs uppercase ${plan.recommended ? 'text-white/70' : 'text-gray-500'}`}>{t('pricing.labels.guests')}</dt>
                  <dd className="font-semibold">{plan.guestLimit}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <Clock aria-hidden="true" className={`w-4 h-4 ${plan.recommended ? 'text-white/80' : 'text-lp-primary'}`} />
                  <dt className={`text-xs uppercase ${plan.recommended ? 'text-white/70' : 'text-gray-500'}`}>{t('pricing.labels.storage')}</dt>
                  <dd className="font-semibold">{t('pricing.labels.daysStored', { count: plan.storageDays })}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <Sparkles aria-hidden="true" className={`w-4 h-4 ${plan.recommended ? 'text-white/80' : 'text-lp-primary'}`} />
                  <dt className={`text-xs uppercase ${plan.recommended ? 'text-white/70' : 'text-gray-500'}`}>{t('pricing.labels.quality')}</dt>
                  <dd className="font-semibold">{plan.clientResizeMaxWidth}px</dd>
                </div>
              </dl>

              <ul className="flex flex-col gap-2 mb-6 text-sm">
                {plan.features.map((f) => (
                  <li key={f.id} className="flex items-start gap-2">
                    <Check aria-hidden="true" className={`w-4 h-4 shrink-0 mt-0.5 ${plan.recommended ? 'text-white' : 'text-lp-primary'}`} />
                    <span>{lang === 'sr' ? f.textSr : f.textEn}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/admin/register"
                className={`inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-md font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  plan.recommended
                    ? 'bg-white text-lp-primary hover:bg-gray-100 focus-visible:ring-white'
                    : 'bg-lp-primary text-white hover:bg-lp-primary/90 focus-visible:ring-lp-primary'
                }`}
              >
                {t('pricing.ctaChoose')}
                <ArrowRight aria-hidden="true" className="w-4 h-4" />
              </Link>
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Napomena:** `formatCurrency` radi server-side. Labels koje su bile inline string ternary (već migrated u PR #10) sada idu kroz `pricing.labels.*` keys sa proper pluralization (`daysStored`). Ako postojeća `PricingPlanRow` shape ima drugačije property imena (npr. `price_cents` vs `price`), uskladi.

- [ ] **Step 3: Build + commit**

```bash
pnpm build 2>&1 | tail -5
git add components/landingPage/Pricing.tsx
git commit -m "refactor(landing): Pricing → RSC with server-side Intl.NumberFormat"
```

---

## Task 12: Convert Footer → RSC body + ScrollToTopButton island

**Files:**
- Modify: `components/landingPage/Footer.tsx`

- [ ] **Step 1: Pročitaj Footer**

Run: `cat components/landingPage/Footer.tsx`

- [ ] **Step 2: Zamijeni sa RSC verzijom + mount ScrollToTopButton island**

```tsx
// components/landingPage/Footer.tsx — NO 'use client'
import Link from 'next/link';
import Image from 'next/image';
import type { TFunction } from 'i18next';
import { ScrollToTopButton } from '@/components/motion/ScrollToTopButton';

interface FooterProps {
  t: TFunction;
  lang: 'sr' | 'en';
}

export default function Footer({ t, lang }: FooterProps) {
  return (
    <>
      <footer role="contentinfo" className="bg-gray-900 text-gray-300 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-start gap-8">
          <div className="flex-1">
            <div className="text-white text-lg font-semibold mb-2">DodajUspomenu</div>
            <p className="text-sm text-gray-400 max-w-md">{t('footer.tagline')}</p>
          </div>
          <nav aria-label={t('a11y.mainNav')} className="flex flex-col sm:flex-row gap-6 text-sm">
            <div className="flex flex-col gap-2">
              <span className="text-white font-semibold">{t('footer.legal')}</span>
              <Link href="/privacy" className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">{t('footer.privacy')}</Link>
              <Link href="/terms" className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">{t('footer.terms')}</Link>
              <Link href="/cookies" className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">{t('footer.cookies')}</Link>
              <Link href="/kontakt" className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">{t('footer.contact')}</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-white font-semibold">{t('footer.product')}</span>
              <a
                href="https://www.producthunt.com/products/dodajuspomenu"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('a11y.productHunt')}
                className="inline-block"
              >
                <Image
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=979471&theme=light"
                  alt="Product Hunt"
                  width={200}
                  height={43}
                  unoptimized
                />
              </a>
            </div>
          </nav>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 pt-6 border-t border-gray-800 text-xs text-gray-500">
          <p>© 2026 DodajUspomenu ({lang === 'sr' ? 'Srpski' : 'English'})</p>
        </div>
      </footer>
      <ScrollToTopButton label={t('a11y.scrollTop')} />
    </>
  );
}
```

**Napomena:** Zadrži tačnu strukturu + linkove iz originalnog Footer-a (npr. social ikone, Next Pixel brand link na dnu). Ovo je template — matchiraj precizno originalnu copy.

- [ ] **Step 3: Build + commit**

```bash
pnpm build 2>&1 | tail -5
git add components/landingPage/Footer.tsx
git commit -m "refactor(landing): Footer → RSC body + ScrollToTopButton client island"
```

---

## Task 13: Update ClientPage → RSC orchestrator

**Files:**
- Modify: `components/ClientPage.tsx` (rename semantics — postaje server component ali zadržava ime)

- [ ] **Step 1: Zamijeni**

```tsx
// components/ClientPage.tsx — NO 'use client'. Now a server orchestrator.
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
      <Navbar />
      <HeroSection t={t} lang={lang} />
      <PainPoints t={t} />
      <Solution t={t} lang={lang} />
      <HowItWorks t={t} lang={lang} />
      <SocialProof />
      <Benefits t={t} />
      <Pricing t={t} lang={lang} tiers={tiers} />
      <FAQ />
      <Footer t={t} lang={lang} />
    </>
  );
}
```

**Bitno:**
- Navbar, SocialProof, FAQ **zadržavaju `'use client'`** jer su inherentno interaktivne. One SAME dalje koriste `useTranslation()` internally (kroz I18nProvider koji ostaje client-side u layout-u). Ne prosljeđujemo im `t` prop.
- Sve ISLAND komponente (Hero, PainPoints, Solution, HowItWorks, Benefits, Pricing, Footer) primaju `t` i `lang` kao props.

## Task 14: Update `app/page.tsx`, `app/sr/page.tsx`, `app/en/page.tsx`

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/sr/page.tsx`
- Modify: `app/en/page.tsx`

- [ ] **Step 1: `app/sr/page.tsx`**

Pročitaj prvo: `cat app/sr/page.tsx`.

Zamijeni sa:

```tsx
// app/sr/page.tsx
import ClientPage from '@/components/ClientPage';
import { getPricingPlansFromDb } from '@/lib/pricing-db';
import { getServerT } from '@/lib/i18n/server';

export default async function SrPage() {
  const tiers = await getPricingPlansFromDb();
  const t = getServerT('sr');
  return <ClientPage t={t} lang="sr" tiers={tiers} />;
}
```

- [ ] **Step 2: `app/en/page.tsx`**

```tsx
// app/en/page.tsx
import ClientPage from '@/components/ClientPage';
import { getPricingPlansFromDb } from '@/lib/pricing-db';
import { getServerT } from '@/lib/i18n/server';

export default async function EnPage() {
  const tiers = await getPricingPlansFromDb();
  const t = getServerT('en');
  return <ClientPage t={t} lang="en" tiers={tiers} />;
}
```

- [ ] **Step 3: `app/page.tsx`** (root, fallback — sr default)

Pročitaj postojeći `app/page.tsx` (ima ga metadata blok + ClientPage call). Zadrži metadata blok, update ClientPage call:

```tsx
// app/page.tsx — zadržava postojeći metadata blok iznad ove funkcije
import ClientPage from '@/components/ClientPage';
import { getPricingPlansFromDb } from '@/lib/pricing-db';
import { getServerT } from '@/lib/i18n/server';

export default async function Home() {
  const tiers = await getPricingPlansFromDb();
  const t = getServerT('sr');
  return <ClientPage t={t} lang="sr" tiers={tiers} />;
}
```

- [ ] **Step 4: Build + commit**

```bash
rm -rf .next && pnpm build
pnpm test:unit
npx tsc --noEmit
pnpm lint 2>&1 | tail -10
```

Expected: build success, 77+ tests pass, 0 TS errors, no new lint errors.

```bash
git add components/ClientPage.tsx app/page.tsx app/sr/page.tsx app/en/page.tsx
git commit -m "refactor(landing): wire RSC orchestrator with per-locale server i18n

ClientPage is now a server component that receives pre-resolved t and
lang from the page.tsx layer. Navbar/SocialProof/FAQ retain their
'use client' marker since they are inherently interactive."
```

---

## Task 15: Local smoke + SSR verification

**Files:** none (verify only)

- [ ] **Step 1: Full build**

```bash
rm -rf .next && pnpm build
```

Expected: build log kaže "Route (app)" i landing routes (`/`, `/sr`, `/en`) listani kao static (○). HeroSection, PainPoints, itd. ne treba da budu navedene kao client komponente ako build analyzer izlazi.

- [ ] **Step 2: Start + curl SSR HTML**

```bash
pnpm start &
sleep 5

echo "=== SR SSR — provjeri svaku sekciju se pojavljuje u body HTML ==="
curl -s http://localhost:3000/sr > /tmp/sr.html
for section in "hero-heading" "painpoints-heading\|pain-points" "solution-heading" "how-heading\|kako-radi" "benefits-heading" "pricing-heading" "contentinfo"; do
  matches=$(grep -cE "$section" /tmp/sr.html)
  echo "  $section: $matches"
done

echo ""
echo "=== EN SSR — trebaju biti engleski stringovi ==="
curl -s http://localhost:3000/en > /tmp/en.html
grep -oE '<h1[^>]*>[^<]{1,150}' /tmp/en.html | head -1

echo ""
echo "=== Client bundle size ==="
ls -la .next/static/chunks/app/ 2>/dev/null | head -10
du -sh .next/static/chunks/

kill %1 2>/dev/null
```

Expected:
- Svi section ID-ovi > 0 u SR SSR (markup je tamo)
- EN `<h1>` pokazuje engleski tekst (prava per-locale resolucija, nema više SR flash-a)
- Client chunks manji nego baseline (procijeni: baseline ~400 KB, after ~200 KB)

- [ ] **Step 3: Unit + lint + TS još jednom**

```bash
pnpm test:unit 2>&1 | tail -5
npx tsc --noEmit
pnpm lint 2>&1 | tail -5
```
Expected: sve zeleno.

---

## Task 16: Push + PR

- [ ] **Step 1:**

```bash
git push -u origin perf/rsc-landing-migration

gh pr create \
  --title "refactor(landing): RSC migration + per-locale server i18n (LCP target <2.5s)" \
  --body "$(cat <<'EOF'
## Summary
Converts 7 of 10 landing sections from client components to React Server Components via the motion-island pattern, plus introduces per-locale server-side i18n that also resolves the /en SSR-flash caveat from PR #11.

## Architecture
- `lib/i18n/server.ts` — new: fresh i18next instance per `getServerT(locale)` call, no shared state across concurrent server renders
- `components/motion/{FadeInOnScroll,FadeInUpOnMount,ScrollToTopButton}.tsx` — new client islands wrapping framer-motion animations
- 7 landing sections (Hero, PainPoints, Solution, HowItWorks, Benefits, Pricing, Footer) no longer carry `'use client'`; receive pre-resolved `t` + `lang` as props
- 3 inherently interactive sections (Navbar, SocialProof, FAQ) stay client
- ClientPage is now a server component; page.tsx resolves translations server-side per locale

## Expected impact
- Client JS bundle: -40% (7 sections no longer hydrate their markup, only animation wrappers)
- FCP: 3.2s → ~1.5s
- LCP: 6.0s → **<2.5s** (target met)
- Lighthouse mobile perf: 69 → 85+
- Resolves /en SSR-in-SR-language flash (per-locale instance, no singleton race)

## Test plan
- [ ] CI build + test:unit + lint + e2e pass
- [ ] `/sr` SSR HTML contains every section heading in body (verified locally)
- [ ] `/en` SSR HTML has English content from first paint (no language flash)
- [ ] Lighthouse against Vercel preview: LCP <2.5s, Perf 85+
- [ ] Visual parity: all animations still fire, A/B screenshot comparison
- [ ] 77 unit tests + 5 new server i18n tests all pass

## Risks
- Larger diff (~10 files modified + 4 created) — audit carefully
- Motion island pattern changes `whileInView` viewport math slightly (`amount: 0.2` default) — visual review during preview deploy
- If any section in the existing code uses translation KEYS that don't exist yet in locale files, RSC build will throw at static generation time (not runtime). CI catches this.

## Followups
- Convert Navbar into RSC header + mobile-menu client island
- Convert SocialProof into RSC body + counter client island
- Convert FAQ into RSC body + Accordion client island (harder — shadcn/ui Accordion is single client unit)
EOF
)"
```

---

## Task 17: Post-merge live verification

**Files:** none

- [ ] **Step 1: Merge PR + pull**

```bash
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull
```

- [ ] **Step 2: Čekaj Vercel deploy**

```bash
# Monitor until SSR HTML has both SR and EN content correctly
for i in $(seq 1 20); do
  sr_h1=$(curl -s https://www.dodajuspomenu.com/sr | grep -oE '<h1[^>]*>[^<]{1,100}' | head -1)
  en_h1=$(curl -s https://www.dodajuspomenu.com/en | grep -oE '<h1[^>]*>[^<]{1,100}' | head -1)
  echo "SR: $sr_h1"
  echo "EN: $en_h1"
  if [ -n "$sr_h1" ] && [ -n "$en_h1" ] && [ "$sr_h1" != "$en_h1" ]; then
    echo "DONE: different h1 per locale"
    break
  fi
  sleep 20
done
```

- [ ] **Step 3: Finalni Lighthouse**

```bash
# Warmup + real
npx -y lighthouse@latest https://www.dodajuspomenu.com/sr --only-categories=performance --output=json --output-path=/tmp/lh-warm.json --chrome-flags="--headless --no-sandbox" --quiet 2>&1 | tail -2

npx -y lighthouse@latest https://www.dodajuspomenu.com/sr --only-categories=performance --output=json --output=html --output-path=claudedocs/lh-post-rsc-sr-mobile --chrome-flags="--headless --no-sandbox" --quiet 2>&1 | tail -3

node -e '
const r = require("./claudedocs/lh-post-rsc-sr-mobile.report.json");
console.log("=== SR Mobile (live, post-RSC) ===");
console.log("  Perf:", Math.round(r.categories.performance.score * 100));
console.log("  LCP:", r.audits["largest-contentful-paint"].displayValue);
console.log("  FCP:", r.audits["first-contentful-paint"].displayValue);
console.log("  CLS:", r.audits["cumulative-layout-shift"].displayValue);
console.log("  TBT:", r.audits["total-blocking-time"].displayValue);
console.log("  Total weight:", r.audits["total-byte-weight"].displayValue);
'
```

Expected:
- Perf ≥ 85
- LCP < 2.5s
- FCP < 1.8s
- Lighter JS bundle

- [ ] **Step 4: Ako LCP ≥ 2.5s, ne deklariši done**

Ako LCP još uvijek nije ispod 2.5s:
1. Provjeri bundle analyzer (`ANALYZE=true pnpm build`) — da li se preostale klijent komponente nisu uvećale neplanirano
2. Check if framer-motion tree-shakes correctly kroz FadeInOnScroll / FadeInUpOnMount (treba) ili se cijeli bundle i dalje šalje
3. Dispatcha dodatni deep-dive agent — nemoj deklarisati done

- [ ] **Step 5: Append verification report**

Update `claudedocs/2026-04-20-launch-verification.md` sa novim LCP/Perf brojkama i označi task u TodoWrite kao done.

---

## Verification (end-to-end)

```bash
# 1. Build
rm -rf .next && pnpm build

# 2. Unit
pnpm test:unit  # expect 78/78 (77 existing + 5 new i18n-server)

# 3. SSR locale correctness (different h1 per locale)
pnpm start &
sleep 4
sr=$(curl -s http://localhost:3000/sr | grep -oE '<h1[^>]*>[^<]{1,100}' | head -1)
en=$(curl -s http://localhost:3000/en | grep -oE '<h1[^>]*>[^<]{1,100}' | head -1)
[ "$sr" != "$en" ] && echo "OK: SR+EN have distinct h1"
kill %1

# 4. Live Lighthouse post-deploy
npx -y lighthouse@latest https://www.dodajuspomenu.com/sr --only-categories=performance --quiet --output=json \
  --chrome-flags="--headless --no-sandbox" 2>/dev/null | \
  node -e 'let d=""; process.stdin.on("data",c=>d+=c); process.stdin.on("end",()=>{
    const r = JSON.parse(d);
    console.log("Perf:", Math.round(r.categories.performance.score * 100));
    console.log("LCP:", r.audits["largest-contentful-paint"].displayValue);
  });'
```

Expected: LCP <2.5s, Perf ≥ 85.

---

## Followups (out of scope)

- **Navbar RSC split** — extract header markup as RSC, keep mobile-menu state in a small client island. ~30% of Navbar's bundle could move server-side.
- **SocialProof RSC split** — header/statistics markup as RSC, keep counter animation (IntersectionObserver + rAF) isolated as a small `<CountUp value={...}>` island.
- **FAQ RSC split** — harder. shadcn/ui Accordion is a single client unit. Could replace with `<details>/<summary>` native HTML (zero JS) or build a minimal accordion client island around server-rendered panels.
- **Preload critical landing fonts** via `<link rel="preload">` — Next.js next/font should do this but verify.
- **Inline critical CSS** — current render-blocking CSS ~650ms savings. Next.js supports `experimental.optimizeCss: true` — evaluate.
- **Edge Runtime for root layout** — further TTFB improvement if Vercel Edge node is closer to EU users than serverless.

---

## Critical files

- **Created:** `lib/i18n/server.ts`, `__tests__/lib/i18n-server.test.ts`, `components/motion/FadeInOnScroll.tsx`, `components/motion/FadeInUpOnMount.tsx`, `components/motion/ScrollToTopButton.tsx`
- **Modified (all landing):** `components/ClientPage.tsx`, `components/landingPage/{HeroSection,PainPoints,Solution,HowItWorks,Benefits,Pricing,Footer}.tsx`
- **Modified (pages):** `app/page.tsx`, `app/sr/page.tsx`, `app/en/page.tsx`

---

**Generisano 2026-04-20. Plan je evidence-based — svaka konverzija proistekla iz exploration audit-a svih 10 landing komponenti (interactivity + framer-motion + t() + data source analiza).**
