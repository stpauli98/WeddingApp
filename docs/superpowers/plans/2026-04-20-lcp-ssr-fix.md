# LCP SSR Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Smanjiti live mobile LCP sa 11.9s na <2.5s eliminisanjem blocking async i18n init-a i opacity:0 animacija iznad fold-a.

**Architecture:** i18next se već snabdijeva statički-importovanim JSON resource-ima (nema HTTP backend-a), pa async `i18n.init()` u `useEffect`-u nije potreban. Fix ima dva dijela: (1) pomjeriti `i18n.init()` na module-level synchronous call tako da `i18next.isInitialized === true` prije prvog React render-a, uklanjajući `isMounted`/`isReady` guard u `I18nProvider` koji trenutno vraća `null` u SSR; (2) ukloniti `initial={{opacity:0, y:20}}` na hero above-fold motion divovima tako da se prvi paint desava odmah sa vidljivim sadržajem, bez čekanja animacije. Već postojeći `HtmlLangSync` (Phase 3) vrši client-side lang switch za `/en` route-ove u slučaju da SSR default fallback-uje na SR.

**Tech Stack:** Next.js 15 App Router, react-i18next 15.5.1, i18next 25.2.0, framer-motion 12.11.0, TypeScript strict, Jest + @testing-library/react (jsdom).

---

## Context

Phase 6 verification pokazao je live mobile Lighthouse **perf score 62** sa **LCP 11.9s** (target <2.5s). Duboka analiza otkrila je da SSR HTML od 21KB ne sadrži nijedan tekst iznad fold-a — sav landing markup se render-uje tek posle async `i18n.init()` i React hydration.

Root cause u [components/I18nProvider.tsx:19-51](components/I18nProvider.tsx):
```tsx
useEffect(() => {
  setIsMounted(true);
  const initI18n = async () => {
    if (!isI18nInitialized && !i18n.isInitialized) {
      await i18n.init();  // ← async, blokira children
    }
    setIsReady(true);  // ← react renders children tek sada
  };
  initI18n();
}, []);
if (!isMounted || !isReady) {
  return null;  // ← prazan ekran dok ne prođe hydration + async init
}
```

LCP cascade: 0s SSR (prazan) → ~2s JS parse/hydrate → ~2.5s useEffect → ~3s i18n.init resolves → ~3.5s children mount → ~4s framer-motion initial opacity:0 → 0.7s transition → **~4.7s** minimum hero paint. Real measurement na live: 11.9s (dodatne latencije od Vercel cold cache + render blocking).

i18next init JE mogao biti sinhron cijelo vrijeme. Translations su bundle-ovani kroz ES imports u [lib/i18n/i18n.ts](lib/i18n/i18n.ts):
```ts
import srTranslation from '@/locales/sr/translation.json';
import enTranslation from '@/locales/en/translation.json';
// ... .init({ resources: { sr: {...}, en: {...} } })
```
Nema HTTP backend-a, nema async resource load-a. `initAsync: true` je cargo-cult opcija.

SSR language handling: sharing single i18n instance kroz Next.js server means da će se `/en` render-ovati sa `fallbackLng: 'sr'` tokom SSR. Client-side `HtmlLangSync` (postoji iz Phase 3) promijeni jezik odmah posle hydration-a. Kratak SR flash na /en ruti je prihvatljiv tradeoff — bez njega LCP ostaje 12s. Pravi per-request i18n instance refactor je followup.

Očekivan LCP posle fix-a: **<2.5s** (SSR HTML direktno sadrži Serbian hero tekst, slika ima `priority`, nema opacity:0 gate).

---

## File Structure

| Fajl | Akcija | Odgovornost |
|---|---|---|
| `lib/i18n/i18n.ts` | Modify | Sync init na module load, ukloni `initAsync: true`, export-uje već-inicijalizovan instance |
| `components/I18nProvider.tsx` | Modify | Ukloni `isMounted`/`isReady` guard; render `<I18nextProvider>` odmah |
| `components/landingPage/HeroSection.tsx` | Modify | Ukloni `initial={{opacity:0, y:20}}` na hero text + image (above-fold) |
| `__tests__/lib/i18n.test.ts` | Create | Test: i18n je inicijalizovan sinhronizovano, t() rezolvira pravi string bez await |
| `__tests__/components/I18nProvider.test.tsx` | Create | Test: djeca se render-uju na prvi render (ne null) |

---

## Pre-flight

- [ ] **Step 1: Provjeri čist tree + pull main**

Run:
```bash
cd /Users/nmil/Desktop/WeddingApp
git status
git branch --show-current
git pull origin main
```
Expected: `main`, HEAD je `00052e4` ili noviji, untracked fajlovi samo `.claude/` + Lighthouse artifacts.

- [ ] **Step 2: Kreiraj feature branch**

Run:
```bash
git checkout -b fix/lcp-ssr-i18n
```

---

## Task 1: Test za sinhronu i18n inicijalizaciju

**Files:**
- Create: `__tests__/lib/i18n.test.ts`

- [ ] **Step 1: Napiši failing test**

Sadržaj `__tests__/lib/i18n.test.ts`:
```ts
import i18n from '@/lib/i18n/i18n';

describe('lib/i18n — synchronous initialization', () => {
  it('is initialized at module load (isInitialized === true)', () => {
    expect(i18n.isInitialized).toBe(true);
  });

  it('resolves a real Serbian key without async wait', () => {
    const result = i18n.t('hero.titleLine1');
    expect(result).toBeTruthy();
    expect(result).not.toBe('hero.titleLine1');
  });

  it('switches language to en synchronously and resolves English key', async () => {
    await i18n.changeLanguage('en');
    const result = i18n.t('hero.titleLine1');
    expect(result).toBeTruthy();
    expect(result).not.toBe('hero.titleLine1');
    await i18n.changeLanguage('sr');
  });
});
```

- [ ] **Step 2: Pokreni test — treba da FAIL-uje**

Run: `pnpm test:unit -- __tests__/lib/i18n.test.ts`
Expected: prvi test FAIL sa `isInitialized === false` jer trenutno `lib/i18n/i18n.ts` radi `.init()` sa `initAsync: true` + ne await-uje, pa modulski load ne završi inicijalizaciju.

---

## Task 2: Sync init u `lib/i18n/i18n.ts`

**Files:**
- Modify: `lib/i18n/i18n.ts`

- [ ] **Step 1: Pročitaj postojeći fajl**

Run: `cat lib/i18n/i18n.ts`
Expected: vidiš `.use(LanguageDetector)` + `.init({ ... initAsync: true, ... })` chain.

- [ ] **Step 2: Ukloni `initAsync: true` i await-uj init-u da bude sinhrona**

Zamijeni cijeli sadržaj `lib/i18n/i18n.ts` sa:

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import srTranslation from '@/locales/sr/translation.json';
import enTranslation from '@/locales/en/translation.json';

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      debug: process.env.NODE_ENV === 'development',
      fallbackLng: 'sr',
      resources: {
        sr: { translation: srTranslation },
        en: { translation: enTranslation },
      },
      detection: {
        order: ['path', 'cookie', 'localStorage', 'navigator'],
        lookupFromPathIndex: 0,
        lookupCookie: 'i18nextLng',
        caches: ['cookie', 'localStorage'],
      },
      react: { useSuspense: false },
      interpolation: { escapeValue: false },
    });
}

export default i18n;
```

**Ključne promjene:**
- Uklonjen `initAsync: true` — defaultno `false` znači da `.init()` vraća kada su resources spremni, što je odmah jer su bundle-ovani
- `if (!i18n.isInitialized)` guard spriječava dupli init na HMR-u i na ponovnim module load-ovima

**Napomena o SSR:** `LanguageDetector` je browser-only (koristi `window`/`document`). U Node SSR kontekstu njegov `detect()` vraća `undefined`, pa i18next pada nazad na `fallbackLng: 'sr'`. To je očekivano ponašanje — server render-uje u SR, klijent odmah switch-uje ako je path `/en` (kroz `HtmlLangSync`, postoji iz Phase 3).

- [ ] **Step 3: Pokreni test iz Task 1 — treba sve 3 da PASS-uju**

Run: `pnpm test:unit -- __tests__/lib/i18n.test.ts`
Expected: 3/3 PASS.

- [ ] **Step 4: TS check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add lib/i18n/i18n.ts __tests__/lib/i18n.test.ts
git commit -m "fix(i18n): synchronous initialization at module load

Bundled resources (sr + en translation JSON) allowed sync init all
along; initAsync: true was cargo-cult. Now i18n.isInitialized === true
by the time any React component mounts, unblocking SSR content.

Tests verify sync readiness and cross-language resolution."
```

---

## Task 3: Test za I18nProvider immediate render

**Files:**
- Create: `__tests__/components/I18nProvider.test.tsx`

- [ ] **Step 1: Napiši failing test**

Sadržaj `__tests__/components/I18nProvider.test.tsx`:
```tsx
import { render } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import I18nProvider from '@/components/I18nProvider';

function Probe() {
  const { t } = useTranslation();
  return <span data-testid="probe">{t('hero.titleLine1')}</span>;
}

describe('I18nProvider — renders children immediately', () => {
  it('does not return null on first render', () => {
    const { getByTestId } = render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );
    const el = getByTestId('probe');
    expect(el.textContent).toBeTruthy();
    expect(el.textContent).not.toBe('hero.titleLine1');
  });
});
```

- [ ] **Step 2: Pokreni test — treba da FAIL-uje**

Run: `pnpm test:unit -- __tests__/components/I18nProvider.test.tsx`
Expected: FAIL — `getByTestId` baca "Unable to find element" jer trenutni `I18nProvider` vraća `null` prije `useEffect` firing-a (u jsdom-u hook setMounted/setReady ne ažurira u istom mikrotasku, prvi render je null). Error poruka će biti "Unable to find an element by: [data-testid='probe']".

---

## Task 4: Refaktoriši `I18nProvider` da render-uje odmah

**Files:**
- Modify: `components/I18nProvider.tsx`

- [ ] **Step 1: Pročitaj postojeći fajl**

Run: `cat components/I18nProvider.tsx`
Expected: vidiš `isMounted`/`isReady` state, async init u useEffect-u, `return null` guard.

- [ ] **Step 2: Zamijeni sa simple pass-through provider-om**

Zamijeni cijeli sadržaj `components/I18nProvider.tsx` sa:

```tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n/i18n';
import { getCurrentLanguageFromPath } from '@/lib/utils/language';

interface I18nProviderProps {
  children: ReactNode;
}

export default function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const langFromPath = getCurrentLanguageFromPath();
    if (i18n.language !== langFromPath) {
      i18n.changeLanguage(langFromPath);
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
```

**Ključne promjene:**
- Uklonjeni `isMounted`, `isReady` state, async init logic, `return null` guard
- `i18n` je već inicijalizovan (Task 2) — možemo odmah wrap-ovati children
- useEffect samo synhronizuje path→language na mount (ne blokira render)
- `HtmlLangSync` komponenta (iz Phase 3) nastavlja da radi isto, kao dodatni redundancy na pathname promjene

- [ ] **Step 3: Pokreni I18nProvider test — treba da PASS**

Run: `pnpm test:unit -- __tests__/components/I18nProvider.test.tsx`
Expected: 1/1 PASS.

- [ ] **Step 4: Pokreni sve unit testove da provjeriš regresije**

Run: `pnpm test:unit`
Expected: svi postojeći testovi PASS + 4 nova (3 iz Task 1 + 1 iz Task 3).

- [ ] **Step 5: TS check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add components/I18nProvider.tsx __tests__/components/I18nProvider.test.tsx
git commit -m "fix(i18n): render children immediately, no async gate

Removes isMounted/isReady state and null-return. With Task 1's sync
init, I18nextProvider can wrap children on first render, letting
Next.js SSR ship visible HTML instead of 21KB of empty shell.

Path→language sync is retained via useEffect on mount and via
HtmlLangSync (Phase 3), both run after paint without blocking it."
```

---

## Task 5: Ukloni `initial={opacity:0}` na HeroSection above-fold

**Files:**
- Modify: `components/landingPage/HeroSection.tsx`

- [ ] **Step 1: Pročitaj postojeći hero motion blokove**

Run: `grep -n "motion\." components/landingPage/HeroSection.tsx`
Expected: 2 `<motion.div>` wrappera (text column oko linije 26, phone mockup oko linije 77), oba sa `initial={reduce ? false : { opacity: 0, y: 20 }}`.

- [ ] **Step 2: Zamijeni `initial` sa `false` za both wrappere**

U `components/landingPage/HeroSection.tsx`, pronađi oba blocka:
```tsx
initial={reduce ? false : { opacity: 0, y: 20 }}
animate={reduce ? undefined : { opacity: 1, y: 0 }}
transition={{ duration: 0.7 }}
```
(drugi ima `delay: 0.2`)

Zamijeni OBA blocka (za text column + phone mockup) sa:
```tsx
initial={false}
animate={reduce ? undefined : { opacity: 1, y: 0 }}
transition={{ duration: 0.7 }}
```
(drugi zadržava `delay: 0.2`)

**Razlog:** `initial={false}` govori framer-motion-u da koristi CSS-default state (nema transformacije, puna opacity). Above-fold sadržaj je vidljiv odmah u SSR paint-u. `animate` i dalje fire-uje na mount — ali je no-op ako je start state identičan end state-u (opacity 1, y 0). Drugim riječima, ne animiramo hero iznad fold-a. Below-fold sekcije (`PainPoints`, `Solution`, etc.) zadržavaju svoje ulazne animacije nepromijenjene.

- [ ] **Step 3: Smoke build**

Run: `rm -rf .next && pnpm build`
Expected: build uspjeh.

- [ ] **Step 4: Lokalni SSR smoke test**

Run:
```bash
pnpm start &
sleep 4
# Provjeri da SSR HTML sada sadrži hero tekst:
curl -s http://localhost:3000/sr | grep -c "main-content"  # expect: 1
curl -s http://localhost:3000/sr | grep -oE '<h1[^>]*>' | head -1  # expect: h1 tag prisutan
curl -s http://localhost:3000/sr | grep -oE "Sačuvajte|Uspomene|uspomene" | sort -u | head -5  # expect: hero copy
kill %1 2>/dev/null
```
Expected: HeroSection tekst (`Sačuvajte ... uspomene` ili slično) sada je u prvoj-pass SSR HTML-u, ne samo u `<title>` tagu.

- [ ] **Step 5: Commit**

```bash
git add components/landingPage/HeroSection.tsx
git commit -m "perf(hero): skip opacity:0 initial on above-fold motion divs

Hero text + image were painting at t=hydrate+700ms due to
initial={{opacity:0}} → animate:{opacity:1} transition. With SSR
content now shipping (Tasks 1-2), LCP candidate needs to be visible
at first paint. initial={false} starts motion.div at CSS-default
(opacity:1) and animate becomes a no-op on mount.

Below-fold sections keep their whileInView fade-ins."
```

---

## Task 6: Local verification — SSR content + unit tests

**Files:** none (verification only)

- [ ] **Step 1: Potvrdi da SSR HTML ima hero copy**

Run:
```bash
rm -rf .next && pnpm build
pnpm start &
sleep 4
curl -s http://localhost:3000/sr > /tmp/sr-ssr.html
curl -s http://localhost:3000/en > /tmp/en-ssr.html

echo "=== SR SSR hero present? ==="
grep -c "HeroSection\|hero\|Sačuvajte\|Uspomene" /tmp/sr-ssr.html
grep -oE '<h1[^>]*>[^<]{1,150}' /tmp/sr-ssr.html | head -2

echo "=== EN SSR (expect: SR fallback + HtmlLangSync will switch client-side) ==="
grep -oE '<h1[^>]*>[^<]{1,150}' /tmp/en-ssr.html | head -2

kill %1 2>/dev/null
```
Expected:
- SR: `<h1>` sa Serbian tekstom prisutan u SSR output-u
- EN: identičan kao SR (fallback) — client će switchovati posle hydration-a kroz HtmlLangSync

- [ ] **Step 2: Full unit suite**

Run: `pnpm test:unit 2>&1 | tail -15`
Expected: svi testovi prolaze (73 pre-existing + 4 novih = 77/77).

- [ ] **Step 3: Lint + TS**

Run: `pnpm lint 2>&1 | tail -5 && npx tsc --noEmit`
Expected: nema novih lint errors; 0 TS errors.

---

## Task 7: Push + PR + CI

- [ ] **Step 1: Push branch**

Run:
```bash
git push -u origin fix/lcp-ssr-i18n
```

- [ ] **Step 2: Open PR**

Run:
```bash
gh pr create \
  --title "fix(perf): synchronous i18n init + SSR-visible hero content (LCP fix)" \
  --body "$(cat <<'EOF'
## Summary
Fixes live mobile LCP 11.9s on landing (`/sr`, `/en`) → target <2.5s.

## Root cause
`components/I18nProvider.tsx` returned `null` during SSR and first client-render frames while `i18n.init()` resolved asynchronously in `useEffect`. This shipped 21KB of empty HTML shell; content only painted after hydration + async init + framer-motion opacity:0→1 transition.

## Fix
- **Task 1-2:** Synchronous i18n initialization at module load (`lib/i18n/i18n.ts`). Bundled JSON resources allowed sync all along; `initAsync: true` was removed.
- **Task 3-4:** `I18nProvider` now renders `<I18nextProvider>` immediately, no isReady/isMounted gates. Path→language sync moved to a non-blocking `useEffect` (and `HtmlLangSync` from Phase 3 continues to handle pathname changes).
- **Task 5:** Removed `initial={{opacity:0, y:20}}` on HeroSection above-fold motion divs. `initial={false}` paints hero at CSS-default state; `animate` on mount becomes a no-op.
- **4 new tests:** i18n sync init + cross-lang resolution, I18nProvider immediate render.

## SSR language caveat
Single shared i18n instance means `/en` SSR renders with `fallbackLng: 'sr'`. `HtmlLangSync` (client) switches language immediately post-hydration. Brief SR→EN flash on `/en` is accepted tradeoff — full per-request instance is a followup.

## Expected outcome
- SSR HTML now contains hero `<h1>` + visible copy
- LCP drops from 11.9s → <2.5s (target met)
- Lighthouse mobile perf score: 62 → 85+

## Test plan
- [ ] CI: pnpm build + test:unit + lint + e2e pass
- [ ] Manual: `curl -s https://<preview>/sr | grep '<h1'` shows hero
- [ ] Lighthouse against Vercel preview: LCP <2.5s
- [ ] Post-merge Lighthouse against live `www.dodajuspomenu.com/sr`
EOF
)"
```

- [ ] **Step 3: Čekaj CI**

Monitor `gh pr checks <PR#>` dok svih 5 checks ne pokaže pass. E2e flake (Prisma CDN) može da ponovi — koristi `gh run rerun <run-id> --failed` u tom slučaju.

---

## Task 8: Post-merge live verification

**Files:** none

- [ ] **Step 1: Merge PR**

```bash
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull
```

- [ ] **Step 2: Sačekaj Vercel deploy**

Run: `gh run watch` ili provjeri https://vercel.com/<project> dok deployment status ne bude "Ready".

- [ ] **Step 3: Live curl SSR smoke**

Run:
```bash
curl -s https://www.dodajuspomenu.com/sr | grep -c "HeroSection\|main-content"
curl -s https://www.dodajuspomenu.com/sr | grep -oE '<h1[^>]*>[^<]{1,150}' | head -2
```
Expected: `<h1>` sa hero tekstom prisutan u response-u.

- [ ] **Step 4: Live Lighthouse**

Run:
```bash
mkdir -p claudedocs
npx -y lighthouse@latest https://www.dodajuspomenu.com/sr \
  --only-categories=performance \
  --output=json --output=html \
  --output-path=claudedocs/lh-post-lcp-fix \
  --chrome-flags="--headless --no-sandbox" --quiet 2>&1 | tail -5

node -e '
const r = require("./claudedocs/lh-post-lcp-fix.report.json");
console.log("Perf:", Math.round(r.categories.performance.score * 100));
console.log("LCP:", r.audits["largest-contentful-paint"].displayValue);
console.log("FCP:", r.audits["first-contentful-paint"].displayValue);
console.log("CLS:", r.audits["cumulative-layout-shift"].displayValue);
console.log("TBT:", r.audits["total-blocking-time"].displayValue);
'
```
Expected:
- Perf ≥ 85
- LCP < 2.5s
- FCP < 1.8s
- CLS < 0.1
- TBT < 200ms

- [ ] **Step 5: Ako LCP ostaje > 2.5s, ne zatvaraj task**

Ako LCP > 3s uprkos SSR content-u:
1. Verifikuj da Vercel Edge Cache je warm: `curl -sI https://www.dodajuspomenu.com/sr | grep x-vercel-cache` → prva poziva `MISS`, druga `HIT`. Ponovi lighthouse ako je bio MISS.
2. Provjeri da `next/image` servira AVIF za hero: `curl -sI -H "Accept: image/avif" "https://www.dodajuspomenu.com/_next/image?url=%2Fimages%2Fsr%2Fguest-login-filled.png&w=1200&q=75" | grep -i content-type`
3. Izmjeri dodatni input u `claudedocs/lh-post-lcp-fix.report.html` — search za "opportunity" ili "diagnostic" section u HTML-u, pronađi top 3.
4. Ako uzrok nije jasan, dispatch-uj dodatni deep-dive agent — nemoj deklarisati fix done.

- [ ] **Step 6: Ako LCP < 2.5s, zatvori task + javi user-u**

Append `claudedocs/2026-04-20-launch-verification.md` sa post-fix brojevima i označi LCP tiket zatvorenim u TodoWrite.

---

## Verification (end-to-end)

```bash
# Unit + build
pnpm test:unit  # 77/77 (73 existing + 4 new)
npx tsc --noEmit
rm -rf .next && pnpm build

# SSR content (local)
pnpm start &
sleep 4
curl -s http://localhost:3000/sr | grep -oE '<h1[^>]*>[^<]{1,150}' | head -1
kill %1

# Live Lighthouse
npx -y lighthouse@latest https://www.dodajuspomenu.com/sr \
  --only-categories=performance --quiet --output=json \
  --chrome-flags="--headless --no-sandbox" 2>/dev/null | \
  node -e 'let d=""; process.stdin.on("data",c=>d+=c); process.stdin.on("end",()=>{
    const r = JSON.parse(d);
    console.log("Perf:", Math.round(r.categories.performance.score * 100));
    console.log("LCP:", r.audits["largest-contentful-paint"].displayValue);
  });'
```

Expected: Perf ≥ 85, LCP < 2.5s.

---

## Followups (out of scope)

- **Per-request i18n instance** — eliminise SR-flash na `/en` SSR output-u. Potrebno je ili thread-ovanje Next.js request-scoped instance-a ili migracija na `next-intl`/`next-i18n-router`.
- **True RSC migration landing sekcija** — trenutno sav landing je `'use client'`. Konverzija statičnih sekcija (Solution, HowItWorks, Benefits, FAQ) u server komponente smanjila bi bundle za 150-250 KB gzipped.
- **Preload hero image** — dodati `<link rel="preload" as="image">` u `app/sr/layout.tsx` za `/images/sr/guest-login-filled.png` (Next 15 ima `priority` prop na `next/image`, provjeri da li je već aktivan).
- **Nonce-based strict CSP** — Phase 2 ostavio `'unsafe-inline'` i `'unsafe-eval'` u CSP script-src. Nonce bi dignuo Mozilla Observatory grade.
- **Edge Runtime za root layout** — ako LCP ostane limited by server-response time, migracija na Vercel Edge Runtime može pomoći.

---

## Critical files

- **Modified:** `lib/i18n/i18n.ts`, `components/I18nProvider.tsx`, `components/landingPage/HeroSection.tsx`
- **Created:** `__tests__/lib/i18n.test.ts`, `__tests__/components/I18nProvider.test.tsx`

---

**Generisano 2026-04-20. Plan je evidence-based — root cause traced kroz live curl + Lighthouse JSON + čitanjem I18nProvider + i18n.ts + HeroSection source-a.**
