# Landing Page Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dovesti landing page na launch-ready state za EU tržište, rješavajući 40+ nalaza iz audita (claudedocs/2026-04-20-landing-production-readiness.md).

**Architecture:** 6 nezavisnih faza, svaka jedan PR-cycle i shippable. Redoslijed je po kritičnosti: Legal/GDPR blokeri → Security headers → Strukturne a11y/SEO/i18n popravke → Performance → UX polish → Verifikacija. Sve promjene su na `main` branch kroz feature branch za svaku fazu, zbog project rule-a o feature branches.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Prisma 6 + PostgreSQL (Accelerate), Tailwind + Radix + shadcn/ui, i18next, @edge-csrf/core, Cloudinary, Vercel.

---

## Context

Tokom 2026-04-19/20 sesije izvršen je komprehensivan audit landing page-a kroz 6 paralelnih agenata (SEO, performance, a11y, security/GDPR, UX, i18n/mobile). Rezultat je `claudedocs/2026-04-20-landing-production-readiness.md` koji identifikuje:

- **8 legal/GDPR blokera** koji onemogućavaju legalno operisanje u EU
- **5 strukturnih a11y/SEO violations** (duplo `<main>`, hardkodiran `<html lang="sr">`, dupli I18nProvider, fake review u JSON-LD)
- **5 performance problema** (3.5MB PNG, `unoptimized: true`, nema cache na Prisma query-u, cijela landing je `'use client'`)
- **Desetak manjih UX i i18n problema**

Launch target je EU (Srbija/BiH + GDPR). Svaka faza ovog plana rješava kohezivan podskup koji donosi shippable increment: faza 1 je trenutno minimum za legalno operisanje, faze 2-3 uklanjaju kritične strukturne probleme, faza 4 daje mjerljivi perf boost, faza 5 polira, faza 6 verifikuje.

Procjena: **3.5-5 dana** fokusiranog rada.

---

## Global Pre-flight

- [ ] **Step 1: Provjeri clean tree na main**

Run:
```bash
cd /Users/nmil/Desktop/WeddingApp
git status
git branch --show-current
```
Expected: `main`, clean tree (samo `.claude/` untracked je OK).

- [ ] **Step 2: Copy plan u docs za durable reference**

Run:
```bash
mkdir -p docs/superpowers/plans
cp /Users/nmil/.claude/plans/napravi-plan-implementacije-greedy-tiger.md docs/superpowers/plans/2026-04-20-landing-production-readiness.md
```

---

# PHASE 1 — Legal / GDPR blokeri

**Branch:** `feat/legal-pages-gdpr`

**Cilj faze:** Kreirati 4 pravne stranice, dodati cookie consent banner, gejtovati Google Analytics iza consent-a, popraviti sve lažne/zastarjele tvrdnje u JSON-LD i FAQ tekstovima.

**Shippable increment:** Nakon ove faze EU korisnici mogu legalno koristiti site (svi GDPR Art. 13-14 zahtjevi ispunjeni, ePrivacy compliance, nema fake reviews, nema zastarjelih cijena).

**Files:**
- Create: `app/privacy/page.tsx`
- Create: `app/terms/page.tsx`
- Create: `app/cookies/page.tsx`
- Create: `app/kontakt/page.tsx`
- Create: `components/CookieConsent.tsx`
- Create: `hooks/useConsent.ts`
- Modify: `app/layout.tsx` (JSON-LD cleanup + consent-gated GA + CookieConsent mount)
- Modify: `locales/sr/translation.json` + `locales/en/translation.json` (FAQ + consent + a11y keys)
- Modify: `components/landingPage/Footer.tsx` (link `/contact` → `/kontakt`)
- Modify: `app/about/page.tsx` (ukloni lažnu tvrdnju o email verifikaciji)

---

## Task 1.0: Kreiraj feature branch

- [ ] **Step 1:** `git checkout main && git pull && git checkout -b feat/legal-pages-gdpr`

## Task 1.1: `hooks/useConsent.ts`

Hook persistuje user consent u `localStorage` i sinhronizuje sa Google Consent Mode v2 API-jem.

- [ ] **Step 1: Napiši hook**

```ts
// hooks/useConsent.ts
'use client';
import { useCallback, useEffect, useState } from 'react';

export type ConsentState = 'granted' | 'denied' | null;
const STORAGE_KEY = 'cookie_consent_v1';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

function pushConsent(state: 'granted' | 'denied') {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'consent_update',
    consent: { analytics_storage: state, ad_storage: state, ad_user_data: state, ad_personalization: state },
  });
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: state,
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
    });
  }
}

export function useConsent() {
  const [consent, setConsent] = useState<ConsentState>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'granted' || stored === 'denied') {
        setConsent(stored);
        pushConsent(stored);
      }
    } catch { /* private mode */ }
  }, []);

  const accept = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, 'granted'); } catch {}
    setConsent('granted');
    pushConsent('granted');
  }, []);

  const decline = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, 'denied'); } catch {}
    setConsent('denied');
    pushConsent('denied');
  }, []);

  return { consent, accept, decline };
}
```

- [ ] **Step 2: TS check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

## Task 1.2: `components/CookieConsent.tsx`

- [ ] **Step 1: Napiši komponentu**

```tsx
// components/CookieConsent.tsx
'use client';
import { useTranslation } from 'react-i18next';
import { useConsent } from '@/hooks/useConsent';
import Link from 'next/link';

export function CookieConsent() {
  const { consent, accept, decline } = useConsent();
  const { t, i18n } = useTranslation();

  if (consent !== null) return null;
  const lang = i18n.language === 'en' ? 'en' : 'sr';

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 shadow-lg p-4 md:p-6"
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <h2 id="cookie-consent-title" className="font-semibold mb-1">
            {t('consent.title')}
          </h2>
          <p id="cookie-consent-desc" className="text-sm text-gray-600">
            {t('consent.body')}{' '}
            <Link href={`/${lang}/cookies`} className="underline">
              {t('consent.readMore')}
            </Link>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={decline}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
          >
            {t('consent.decline')}
          </button>
          <button
            type="button"
            onClick={accept}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
          >
            {t('consent.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Task 1.3: i18n consent + a11y keys

- [ ] **Step 1: SR** — dodaj u `locales/sr/translation.json`:

```json
"consent": {
  "title": "Kolačići",
  "body": "Koristimo Google Analytics da razumijemo kako se sajt koristi. Nikakvi marketinški cookie-i se ne koriste. Možete prihvatiti ili odbiti.",
  "readMore": "Saznajte više",
  "accept": "Prihvatam",
  "decline": "Odbijam"
},
"a11y": {
  "mainNav": "Glavna navigacija",
  "scrollTop": "Povratak na vrh",
  "productHunt": "DodajUspomenu na Product Hunt-u",
  "skipToMain": "Preskoči na glavni sadržaj"
}
```

- [ ] **Step 2: EN** — dodaj u `locales/en/translation.json`:

```json
"consent": {
  "title": "Cookies",
  "body": "We use Google Analytics to understand how the site is used. No marketing cookies are set. You may accept or decline.",
  "readMore": "Learn more",
  "accept": "Accept",
  "decline": "Decline"
},
"a11y": {
  "mainNav": "Main navigation",
  "scrollTop": "Back to top",
  "productHunt": "DodajUspomenu on Product Hunt",
  "skipToMain": "Skip to main content"
}
```

## Task 1.4: Consent-gated GA u layout.tsx

- [ ] **Step 1: Zamijeni GA blok**

U `app/layout.tsx`, zamijeni postojeći GA `<Script>` blok (lines 69-81) sa:

```tsx
{/* Google Analytics sa Consent Mode v2 (denied by default) */}
<Script id="gtag-consent-default" strategy="beforeInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    gtag('js', new Date());
    gtag('config', 'G-Y5LM1PHT8H', { anonymize_ip: true });
  `}
</Script>
<Script
  strategy="afterInteractive"
  src="https://www.googletagmanager.com/gtag/js?id=G-Y5LM1PHT8H"
/>
```

- [ ] **Step 2: Dodaj `<CookieConsent />` u body**

U `app/layout.tsx`, unutar `<ThemeProvider>` pored `<Toaster />`:
```tsx
<CookieConsent />
```
I import na vrhu: `import { CookieConsent } from '@/components/CookieConsent';`

## Task 1.5: Ukloni fake Review JSON-LD

- [ ] **Step 1:** U `app/layout.tsx`, pronađi `{/* Example Review schema for homepage */}` + cijeli `<Script id="jsonld-review">` blok (lines 163-183) — obriši.

**Razlog:** "Ana M." review je izmišljen; EU Omnibus Directive (2019/2161) blacklisted practice, kazne do 4% prometa.

## Task 1.6: Ukloni Event JSON-LD

- [ ] **Step 1:** U `app/layout.tsx` obriši `<Script id="jsonld-event">` blok (lines 95-108). Zadrži WebSite blok.

**Razlog:** SaaS nije event; `startDate: "2025-05-04"` je u prošlosti.

## Task 1.7: Popravi FAQ JSON-LD

- [ ] **Step 1:** U `app/layout.tsx`, zamijeni `mainEntity` niz u `<Script id="jsonld-faq">` sa:

```json
"mainEntity": [
  {
    "@type": "Question",
    "name": "Zašto bih koristio ovu aplikaciju umesto društvenih mreža?",
    "acceptedAnswer": { "@type": "Answer", "text": "Za razliku od društvenih mreža, naša aplikacija omogućava privatno deljenje fotografija samo sa osobama kojima vi dozvolite pristup. Sve fotografije su organizovane na jednom mestu, u visokoj rezoluciji, i lako ih je preuzeti." }
  },
  {
    "@type": "Question",
    "name": "Koje su prednosti korišćenja ove aplikacije?",
    "acceptedAnswer": { "@type": "Answer", "text": "Jednostavnost korišćenja, privatnost, prikupljanje fotografija od svih gostiju na jednom mestu, bez instalacije aplikacije, i mogućnost preuzimanja svih slika odjednom." }
  },
  {
    "@type": "Question",
    "name": "Koliko košta korišćenje aplikacije?",
    "acceptedAnswer": { "@type": "Answer", "text": "Besplatan paket nudi do 3 slike po gostu za do 20 gostiju. Osnovni paket je €25 (7 slika po gostu, do 100 gostiju). Premium je €75 (25 slika po gostu, do 300 gostiju, originalni kvalitet)." }
  },
  {
    "@type": "Question",
    "name": "Da li gosti moraju da kreiraju naloge?",
    "acceptedAnswer": { "@type": "Answer", "text": "Ne. Gosti skeniraju QR kod i mogu odmah da otpremaju fotografije bez registracije i bez instalacije aplikacije." }
  },
  {
    "@type": "Question",
    "name": "Koliko dugo se čuvaju fotografije?",
    "acceptedAnswer": { "@type": "Answer", "text": "Slike se čuvaju 30 dana od datuma venčanja u svim paketima. Mladenci u tom roku preuzimaju ZIP sa svim fotografijama." }
  }
]
```

## Task 1.8: Popravi FAQ tekstove u translation fajlovima

- [ ] **Step 1: Provjeri trenutno**
```bash
grep -A 2 '"question3\|"answer3\|"question5\|"answer5' locales/sr/translation.json locales/en/translation.json
```

- [ ] **Step 2: Update EN** — u `locales/en/translation.json`, za bilo koji FAQ key koji spominje:
- "Premium keeps your photos for a full year" → "Photos are stored for 30 days across all plans."
- "Free plan stores photos for 10 days, Basic for 30 days, Premium 1 year" → "All plans store photos for 30 days."
- "Basic up to 25, Premium up to 50 photos per guest" → "Free: 3 per guest, Basic: 7 per guest, Premium: 25 per guest."
- Pricing mentions → €0 / €25 / €75

- [ ] **Step 3: Update SR** — isti concept za srpski tekstove.

## Task 1.9: Popravi about/page.tsx email verifikacioni code

- [ ] **Step 1:** U `app/about/page.tsx:47`, pronađi liniju koja kaže da gost dobija "verifikacioni kod" i zamijeni sa:
```
Gosti se prijavljuju kroz svoje ime i email — bez registracije, bez lozinki, bez aplikacije.
```

**Razlog:** Email verification je stub; tvrdnja je neistinita.

## Task 1.10: `app/privacy/page.tsx`

- [ ] **Step 1: Kreiraj**

```tsx
// app/privacy/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'Politika privatnosti | DodajUspomenu',
  description: 'Politika privatnosti platforme DodajUspomenu — kako obrađujemo lične podatke.',
  alternates: { canonical: 'https://www.dodajuspomenu.com/privacy' },
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <article className="prose prose-slate max-w-none">
        <h1>Politika privatnosti</h1>
        <p><strong>Poslednje ažurirano:</strong> 20. april 2026.</p>

        <h2>1. Ko je kontrolor podataka</h2>
        <p>DodajUspomenu je SaaS platforma. Kontakt: <a href="mailto:kontakt@dodajuspomenu.com">kontakt@dodajuspomenu.com</a>.</p>

        <h2>2. Koje podatke prikupljamo</h2>
        <ul>
          <li><strong>Mladenci (admin):</strong> email, ime, lozinka (hash), metapodaci venčanja.</li>
          <li><strong>Gosti:</strong> ime, email, fotografije, tekst čestitke.</li>
          <li><strong>Tehnički:</strong> IP adresa (za rate limiting), session token (httpOnly cookie).</li>
          <li><strong>Analitika:</strong> uz pristanak — Google Analytics 4 (anonimizovana IP).</li>
        </ul>

        <h2>3. Pravni osnov</h2>
        <ul>
          <li>Izvršenje ugovora (Art. 6(1)(b) GDPR).</li>
          <li>Legitimni interes (Art. 6(1)(f)) — sigurnost i rate-limiting.</li>
          <li>Pristanak (Art. 6(1)(a)) — za analitiku.</li>
        </ul>

        <h2>4. Retention</h2>
        <p>Fotografije i čestitke se brišu 30 dana nakon datuma venčanja. Admin metapodaci ostaju dok mladenci ne zatraže brisanje.</p>

        <h2>5. Sa kim delimo podatke</h2>
        <ul>
          <li><strong>Cloudinary</strong> — skladištenje fotografija.</li>
          <li><strong>Prisma Postgres</strong> — metapodaci.</li>
          <li><strong>Vercel</strong> — hosting.</li>
          <li><strong>Google Analytics</strong> — samo uz pristanak.</li>
        </ul>

        <h2>6. Vaša prava (GDPR Art. 15-22)</h2>
        <p>Pristup, ispravka, brisanje, prenosivost, prigovor, pritužba nadzornom organu. Pišite na <a href="mailto:kontakt@dodajuspomenu.com">kontakt@dodajuspomenu.com</a> — odgovaramo u 30 dana.</p>

        <h2>7. Sigurnost</h2>
        <p>CSRF, rate-limiting, httpOnly cookies, bcrypt, HTTPS.</p>

        <h2>8. Kolačići</h2>
        <p>Vidi <Link href="/cookies">Cookie politiku</Link>.</p>

        <p className="text-sm text-gray-500 mt-8"><Link href="/">← Povratak</Link></p>
      </article>
    </main>
  );
}
```

## Task 1.11: `app/terms/page.tsx`

- [ ] **Step 1: Kreiraj**

```tsx
// app/terms/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'Uslovi korišćenja | DodajUspomenu',
  description: 'Uslovi korišćenja platforme DodajUspomenu.',
  alternates: { canonical: 'https://www.dodajuspomenu.com/terms' },
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <article className="prose prose-slate max-w-none">
        <h1>Uslovi korišćenja</h1>
        <p><strong>Poslednje ažurirano:</strong> 20. april 2026.</p>

        <h2>1. Prihvatanje</h2>
        <p>Korišćenjem DodajUspomenu prihvatate ove uslove.</p>

        <h2>2. Opis usluge</h2>
        <p>Platforma za prikupljanje svadbenih fotografija putem QR koda.</p>

        <h2>3. Paketi i cena</h2>
        <ul>
          <li><strong>Besplatan:</strong> 3 slike po gostu × 20 gostiju, 30 dana.</li>
          <li><strong>Osnovni (€25):</strong> 7 slika po gostu × 100 gostiju, 30 dana.</li>
          <li><strong>Premium (€75):</strong> 25 slika po gostu × 300 gostiju, 30 dana, original.</li>
        </ul>
        <p>Refund moguć 14 dana ako nijedna slika nije otpremljena (Directive 2011/83/EU).</p>

        <h2>4. Obaveze korisnika</h2>
        <ul>
          <li>Nije dozvoljen sadržaj koji krši autorska prava ili je nezakonit.</li>
          <li>Mladenci obaveštavaju goste da se slike prikupljaju.</li>
          <li>Zabranjen automatizovan upload.</li>
        </ul>

        <h2>5. Intelektualna svojina</h2>
        <p>Korisnici zadržavaju autorska prava. Dajete ograničenu licencu za hosting/isporuku tokom retention-a.</p>

        <h2>6. Ograničenje odgovornosti</h2>
        <p>Usluga "kako jeste". Maksimalna odgovornost ograničena na cenu paketa.</p>

        <h2>7. Prekid</h2>
        <p>Nalog brišete iz admin panela ili emailom na <a href="mailto:kontakt@dodajuspomenu.com">kontakt@dodajuspomenu.com</a>.</p>

        <h2>8. Nadležno pravo</h2>
        <p>Srpsko pravo i sudovi u Beogradu, osim potrošačkih izuzetaka.</p>

        <p className="text-sm text-gray-500 mt-8"><Link href="/">← Povratak</Link></p>
      </article>
    </main>
  );
}
```

## Task 1.12: `app/cookies/page.tsx`

- [ ] **Step 1: Kreiraj**

```tsx
// app/cookies/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'Politika kolačića | DodajUspomenu',
  description: 'Kako koristimo kolačiće.',
  alternates: { canonical: 'https://www.dodajuspomenu.com/cookies' },
};

export default function CookiesPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <article className="prose prose-slate max-w-none">
        <h1>Politika kolačića</h1>
        <p><strong>Poslednje ažurirano:</strong> 20. april 2026.</p>

        <h2>Strogo neophodni (bez pristanka)</h2>
        <table>
          <thead><tr><th>Ime</th><th>Svrha</th><th>Trajanje</th></tr></thead>
          <tbody>
            <tr><td>admin_session</td><td>Autentikacija admina</td><td>7 dana</td></tr>
            <tr><td>guest_session</td><td>Autentikacija gosta</td><td>30 dana</td></tr>
            <tr><td>csrf_token_*</td><td>CSRF zaštita</td><td>30 min</td></tr>
            <tr><td>i18nextLng</td><td>Izbor jezika</td><td>1 godina</td></tr>
            <tr><td>cookie_consent_v1</td><td>Čuva vaš izbor</td><td>12 meseci</td></tr>
          </tbody>
        </table>

        <h2>Analitički (uz pristanak)</h2>
        <table>
          <thead><tr><th>Ime</th><th>Svrha</th><th>Trajanje</th></tr></thead>
          <tbody>
            <tr><td>_ga</td><td>Google Analytics — korisnik</td><td>2 godine</td></tr>
            <tr><td>_ga_*</td><td>Google Analytics — session</td><td>2 godine</td></tr>
          </tbody>
        </table>

        <h2>Kako upravljati</h2>
        <p>Brisanjem <code>cookie_consent_v1</code> iz browser storage-a banner se opet prikazuje.</p>

        <p>Vidi: <Link href="/privacy">Privatnost</Link>, <Link href="/terms">Uslovi</Link>.</p>
      </article>
    </main>
  );
}
```

## Task 1.13: `app/kontakt/page.tsx` sa Impressum-om

- [ ] **Step 1: Kreiraj**

```tsx
// app/kontakt/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'Kontakt | DodajUspomenu',
  description: 'Kontakt i Impressum.',
  alternates: { canonical: 'https://www.dodajuspomenu.com/kontakt' },
};

export default function KontaktPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <article className="prose prose-slate max-w-none">
        <h1>Kontakt</h1>
        <p>Pitanja, podrška, GDPR zahtevi: <a href="mailto:kontakt@dodajuspomenu.com">kontakt@dodajuspomenu.com</a></p>
        <p>Odgovaramo u 1-2 radna dana.</p>

        <h2>Impressum</h2>
        <p>
          <strong>Naziv:</strong> DodajUspomenu<br />
          <strong>Operater:</strong> [POPUNITI: pravno lice ili preduzetnik]<br />
          <strong>Adresa:</strong> [POPUNITI: ulica, broj, grad, poštanski broj, država]<br />
          <strong>Matični broj / PIB:</strong> [POPUNITI]<br />
          <strong>Email:</strong> kontakt@dodajuspomenu.com
        </p>
        <p className="text-sm text-gray-500">U skladu sa članom 5 Direktive 2000/31/EC.</p>

        <p className="text-sm text-gray-500 mt-8"><Link href="/">← Povratak</Link></p>
      </article>
    </main>
  );
}
```

- [ ] **Step 2: HUMAN GATE** — prije commit-a, pitaj user-a da popuni Impressum placeholder-e (pravno ime, adresa, PIB). Privremena vrijednost "Next Pixel" (postojeća marka) je OK dok se pravni entitet ne registruje.

## Task 1.14: Popravi Footer.tsx `/contact` → `/kontakt`

- [ ] **Step 1:** U `components/landingPage/Footer.tsx`, pronađi `href="/contact"` i zamijeni sa `href="/kontakt"`.

## Task 1.15: Dodaj middleware rewrite za legal pages ako treba

- [ ] **Step 1: Test trenutno**

```bash
pnpm dev &
sleep 4
for p in /privacy /sr/privacy /en/privacy /kontakt /sr/kontakt; do
  echo "$p: $(curl -o /dev/null -s -w '%{http_code}' http://localhost:3000$p)"
done
kill %1
```

- [ ] **Step 2: Ako `/sr/privacy` je 404, dodaj rewrites u next.config.mjs**

U `async rewrites()`, dodaj:
```js
{ source: '/:locale(sr|en)/privacy', destination: '/privacy' },
{ source: '/:locale(sr|en)/terms', destination: '/terms' },
{ source: '/:locale(sr|en)/cookies', destination: '/cookies' },
{ source: '/:locale(sr|en)/kontakt', destination: '/kontakt' },
```

## Task 1.16: Commit + merge Phase 1

- [ ] **Step 1:** `pnpm lint && npx tsc --noEmit && rm -rf .next && pnpm build` → sve zeleno

- [ ] **Step 2: Manual QA**: `/privacy`, `/terms`, `/cookies`, `/kontakt` + `/sr/*` + `/en/*` → 200; cookie banner se pojavljuje; prihvatanje/odbijanje persistira; GA ne set-uje `_ga` prije consent-a.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat(legal): GDPR legal pages + cookie consent + JSON-LD cleanup

- Add /privacy, /terms, /cookies, /kontakt (EU-compliant)
- useConsent hook + CookieConsent banner w/ Google Consent Mode v2
- GA defaults to analytics_storage: denied until user accepts
- Remove fake Ana M. review (EU Omnibus Directive violation)
- Remove misused Event schema
- Fix FAQ JSON-LD: correct tier prices + 30-day retention
- Update SR + EN FAQ translations to match product
- Remove about.tsx misleading email verification claim
- Remove generator: v0.dev + meta keywords
- Footer: /contact → /kontakt

Closes audit L1-L8. EU-launchable after merge.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push -u origin feat/legal-pages-gdpr
gh pr create --title "feat(legal): GDPR legal pages + cookie consent" --body "Phase 1 — closes L1-L8."
```

---

# PHASE 2 — Security headers

**Branch:** `feat/security-headers`

**Cilj:** CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Content-Type-Options.

**Files:** Modify: `next.config.mjs`

## Task 2.0: Branch

- [ ] `git checkout main && git pull && git checkout -b feat/security-headers`

## Task 2.1: Dodaj `async headers()` u next.config.mjs

- [ ] **Step 1: IZNAD `async rewrites()`, dodaj:**

```js
async headers() {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://vercel.live https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob: https://res.cloudinary.com https://api.producthunt.com https://www.google-analytics.com",
    "font-src 'self' data:",
    "connect-src 'self' https://www.google-analytics.com https://*.vercel-insights.com https://vitals.vercel-insights.com https://api.producthunt.com",
    "frame-src 'self' https://www.producthunt.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  return [{
    source: '/:path*',
    headers: [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
    ],
  }];
},
```

**Note:** `'unsafe-inline'` + `'unsafe-eval'` u script-src su potrebni za Next.js + GA + Vercel bootstrap. Strožija nonce-CSP = followup.

## Task 2.2: Verify

- [ ] **Step 1:** `rm -rf .next && pnpm build && pnpm start &` → `curl -I http://localhost:3000/ | grep -iE "content-security|strict-transport|x-frame|x-content|referrer|permissions"` → 6 headera prisutnih.

- [ ] **Step 2: Smoke test**: otvori browser → network tab → bez CSP violation errors u console. GA load uz consent.

## Task 2.3: Commit + PR

- [ ] **Step 1:**

```bash
git add next.config.mjs
git commit -m "feat(security): CSP + HSTS + security headers baseline

Closes audit S1-S5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push -u origin feat/security-headers
gh pr create --title "feat(security): baseline security headers" --body "Phase 2 — closes S1-S5."
```

---

# PHASE 3 — Strukturne popravke (a11y + i18n + SEO)

**Branch:** `feat/landing-structural-fixes`

**Files:**
- Modify: `app/page.tsx`, `app/sr/page.tsx`, `app/en/page.tsx`, `app/layout.tsx`, `app/sr/layout.tsx`, `app/en/layout.tsx`, `components/ClientPage.tsx`
- Create: `components/HtmlLangSync.tsx`, `components/SkipLink.tsx`
- Modify: `components/landingPage/{HeroSection,HowItWorks,Navbar,Footer,SocialProof}.tsx`
- Modify: `app/sitemap.xml/route.ts`
- Modify: `locales/{sr,en}/translation.json` (a11y + image alt keys)

## Task 3.0: Branch

- [ ] `git checkout main && git pull && git checkout -b feat/landing-structural-fixes`

## Task 3.1: Ukloni duplikat `<main>` iz page.tsx + sr/page.tsx + en/page.tsx

- [ ] **Step 1: `app/page.tsx`** — zamijeni:
```tsx
return (
  <main id="main-content" className={`min-h-screen bg-background ${inter.className}`}>
    <ClientPage tiers={tiers} />
  </main>
);
```
sa:
```tsx
return <ClientPage tiers={tiers} />;
```
Ukloni `const inter = Inter(...)` i Inter import (već u layout-u).

- [ ] **Step 2: Isto u `app/sr/page.tsx` i `app/en/page.tsx`** ako imaju wrapper.

## Task 3.2: Ukloni duplikat I18nProvider iz ClientPage

- [ ] **Step 1:** U `components/ClientPage.tsx`, ukloni `<I18nProvider>` wrapper i import. Vrati `<>...</>`.

## Task 3.3: Dinamički `<html lang>` — `HtmlLangSync`

- [ ] **Step 1: Create `components/HtmlLangSync.tsx`**

```tsx
'use client';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePathname } from 'next/navigation';

export function HtmlLangSync() {
  const { i18n } = useTranslation();
  const pathname = usePathname();

  useEffect(() => {
    const pathLang = pathname.startsWith('/en') ? 'en' : 'sr';
    if (document.documentElement.lang !== pathLang) {
      document.documentElement.lang = pathLang;
    }
    if (i18n.language !== pathLang) {
      i18n.changeLanguage(pathLang);
    }
  }, [pathname, i18n]);

  return null;
}
```

- [ ] **Step 2:** Mount u `app/layout.tsx` unutar `<I18nProvider>` prije `<ThemeProvider>`.

## Task 3.4: Per-locale metadata + hreflang

- [ ] **Step 1: `app/sr/layout.tsx`**

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DodajUspomenu – Digitalni svadbeni album',
  description: 'Gosti otpremaju slike preko QR koda — mladenci preuzimaju uspomene.',
  alternates: {
    canonical: 'https://www.dodajuspomenu.com/sr',
    languages: {
      'sr-RS': 'https://www.dodajuspomenu.com/sr',
      'en-US': 'https://www.dodajuspomenu.com/en',
      'x-default': 'https://www.dodajuspomenu.com/sr',
    },
  },
  openGraph: { locale: 'sr_RS', alternateLocale: ['en_US'] },
};

export default function SrLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 2: `app/en/layout.tsx`**

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AddMemories – Digital Wedding Album',
  description: 'Collect wedding photos from all guests via QR code.',
  alternates: {
    canonical: 'https://www.dodajuspomenu.com/en',
    languages: {
      'sr-RS': 'https://www.dodajuspomenu.com/sr',
      'en-US': 'https://www.dodajuspomenu.com/en',
      'x-default': 'https://www.dodajuspomenu.com/sr',
    },
  },
  openGraph: { locale: 'en_US', alternateLocale: ['sr_RS'], title: 'AddMemories – Digital Wedding Album', description: 'Collect wedding photos from all guests via QR code.' },
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

## Task 3.5: Canonical host fix (www)

- [ ] **Step 1: `app/layout.tsx:24`** — promijeni `dodajuspomenu.com` fallback u `www.dodajuspomenu.com`:
```ts
metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.dodajuspomenu.com"),
```

- [ ] **Step 2: Audit:** `grep -rn 'dodajuspomenu\.com' app/ | grep -v 'www\.'` → sve uskladi na www.

**Out-of-band:** konfiguriši Vercel redirect `dodajuspomenu.com → www.dodajuspomenu.com 301` (Phase 6 checklist).

## Task 3.6: Image alt fix

- [ ] **Step 1: `HeroSection.tsx:87`** — `alt={t("hero.titleLine1")}` → `alt={t("hero.mockupAlt")}`

- [ ] **Step 2: `HowItWorks.tsx:71`** — `alt={t("howItWorks.title")}` → `alt={t("howItWorks.imageAlt")}`

- [ ] **Step 3: Dodaj u locales/sr/translation.json:**
```json
"hero": { ..., "mockupAlt": "Prikaz ekrana prijave gosta na mobilnom uređaju" }
"howItWorks": { ..., "imageAlt": "Dashboard mladenaca sa galerijom fotografija" }
```

**En:**
```json
"hero": { ..., "mockupAlt": "Screenshot of guest login screen on mobile device" }
"howItWorks": { ..., "imageAlt": "Couple dashboard showing photo gallery" }
```

## Task 3.7: Prevedi hardkodirane aria-label-e

- [ ] **Step 1: Navbar.tsx:34** — `aria-label="Glavna navigacija"` → `aria-label={t("a11y.mainNav")}`
- [ ] **Step 2: Footer.tsx:66** — `aria-label="Povratak na vrh"` → `aria-label={t("a11y.scrollTop")}`
- [ ] **Step 3: Footer.tsx:55 + SocialProof.tsx:107** — Product Hunt aria → `aria-label={t("a11y.productHunt")}`

## Task 3.8: SkipLink komponenta

- [ ] **Step 1: Create `components/SkipLink.tsx`**

```tsx
'use client';
import { useTranslation } from 'react-i18next';
export function SkipLink() {
  const { t } = useTranslation();
  return (
    <a href="#main-content" className="sr-only focus:not-sr-only absolute top-2 left-2 bg-primary text-white px-4 py-2 rounded z-50">
      {t('a11y.skipToMain')}
    </a>
  );
}
```

- [ ] **Step 2:** U `app/layout.tsx`, zamijeni hardkodirani `<a href="#main-content"...>` (line 243) sa `<SkipLink />` + import.

## Task 3.9: Twitter handle konsistentnost

- [ ] **Step 1:** U `app/page.tsx:31` i `app/layout.tsx:49` — ostavi samo jedan handle (`@dodajuspomenu`), ukloni drugi ili uskladi.

## Task 3.10: Očisti sitemap.xml

- [ ] **Step 1: Edit `app/sitemap.xml/route.ts`**

```tsx
export async function GET() {
  const base = 'https://www.dodajuspomenu.com';
  const lastmod = new Date().toISOString();

  const urls = [
    { loc: `${base}/sr`, priority: '1.0', alternates: { sr: `${base}/sr`, en: `${base}/en` } },
    { loc: `${base}/en`, priority: '1.0', alternates: { sr: `${base}/sr`, en: `${base}/en` } },
    { loc: `${base}/privacy` },
    { loc: `${base}/terms` },
    { loc: `${base}/cookies` },
    { loc: `${base}/kontakt` },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${lastmod}</lastmod>${u.priority ? `
    <priority>${u.priority}</priority>` : ''}${u.alternates ? '\n    ' + Object.entries(u.alternates).map(([lang, href]) =>
      `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`).join('\n    ') : ''}
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
```

## Task 3.11: Ukloni BreadcrumbList na homepage-u

- [ ] **Step 1:** U `app/layout.tsx`, obriši `<Script id="jsonld-breadcrumb">` blok (lines 130-161).

**Razlog:** Homepage nema semantički breadcrumb; references /admin/dashboard i druge gated rute.

## Task 3.12: Build + PR

- [ ] **Step 1:** `rm -rf .next && pnpm build && pnpm lint && npx tsc --noEmit` → zeleno

- [ ] **Step 2: Manual QA:**
  - `/sr` → `<html lang="sr">` u dev tools
  - `/en` → nakon hydration `<html lang="en">`
  - View source: samo jedan `<main>`
  - React tree: samo jedan I18nProvider

- [ ] **Step 3:**

```bash
git add .
git commit -m "fix(landing): resolve duplicate main + dynamic html lang + hreflang

- Remove duplicate <main> from page variants (layout wraps)
- Remove duplicate I18nProvider from ClientPage
- HtmlLangSync syncs <html lang> with path
- Per-locale metadata + hreflang alternates in sr/en layouts
- SkipLink component translates first-focusable element
- Translate aria-labels (mainNav, scrollTop, productHunt)
- Fix Hero + HowItWorks image alt text
- Align canonicals on www. subdomain
- Clean sitemap.xml: remove gated/404 routes, add lastmod + hreflang
- Remove BreadcrumbList (wrong on homepage)

Closes audit A1-A8.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push -u origin feat/landing-structural-fixes
gh pr create --title "fix(landing): structural a11y + i18n + SEO" --body "Phase 3 — closes A1-A8."
```

---

# PHASE 4 — Performance

**Branch:** `feat/landing-performance`

**Files:**
- Modify: `next.config.mjs` (images)
- Delete: duplikati i orphan PNG iz `public/`
- Modify: `public/favicon.ico` (resize)
- Modify: `lib/pricing-db.ts` (unstable_cache)
- Modify: `public/manifest.json`
- Modify: `public/images/sr/gallery-desktop.png` (resize na source)

## Task 4.0: Branch

- [ ] `git checkout main && git pull && git checkout -b feat/landing-performance`

## Task 4.1: Audit orphan slika

- [ ] **Step 1:** `ls -lah public/*.png public/images/sr/*.png 2>/dev/null | sort -k5 -h`

- [ ] **Step 2: Verifikuj orphan status**

```bash
for f in slika.png no-image-uploaded.png images/sr/app-mockup.png images/sr/guest-dashboard-desktop.png images/sr/hero-mobile.png images/sr/hero.png images/sr/problems.png images/sr/register-mobile.png; do
  count=$(grep -rn "$(basename $f .png)" app/ components/ 2>/dev/null | grep -v node_modules | wc -l)
  echo "$f: $count refs"
done
```

- [ ] **Step 3: HUMAN GATE** — pokaži listu, pitaj za potvrdu brisanja.

- [ ] **Step 4: Nakon potvrde**

```bash
git rm public/slika.png public/no-image-uploaded.png  # primjer — tačnu listu po user potvrdi
# + druge orphan-e + root duplikate
```

## Task 4.2: Resize gallery-desktop.png (3.5 MB → ~500 KB)

- [ ] **Step 1:**

```bash
npx sharp-cli -i public/images/sr/gallery-desktop.png \
  -o /tmp/gallery-resized.png \
  --resize 2000 --format png --quality 85
mv /tmp/gallery-resized.png public/images/sr/gallery-desktop.png
# ponovi za /public/images/en/gallery-desktop.png ako postoji
du -h public/images/sr/gallery-desktop.png
```
Expected: ~400-600 KB.

## Task 4.3: Enable next/image optimization

- [ ] **Step 1: `next.config.mjs`** — zamijeni `images` blok:

```js
images: {
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  imageSizes: [16, 32, 64, 128, 256, 384],
},
```

## Task 4.4: Cache `getPricingPlansFromDb`

- [ ] **Step 1: `lib/pricing-db.ts`** — wrap:

```ts
import { unstable_cache } from 'next/cache';

const getPricingPlansCached = unstable_cache(
  async (): Promise<PricingPlanRow[]> => {
    // postojeće telo funkcije
    // ...
  },
  ['pricing-plans-landing'],
  { revalidate: 3600, tags: ['pricing'] }
);

export async function getPricingPlansFromDb(): Promise<PricingPlanRow[]> {
  return getPricingPlansCached();
}
```

- [ ] **Step 2:** `grep -rn "pricingPlan.update\|pricingPlan.upsert" app/` — ako postoji mutation endpoint, dodaj `revalidateTag('pricing')` nakon uspjeha. Ako je samo u seed-u, skip.

## Task 4.5: Popravi manifest.json

- [ ] **Step 1: Overwrite `public/manifest.json`:**

```json
{
  "name": "DodajUspomenu",
  "short_name": "Uspomene",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#7c3aed",
  "description": "Digitalni svadbeni album — gosti otpremaju slike preko QR koda.",
  "icons": [
    { "src": "/apple-touch-icon-180x180.png", "sizes": "180x180", "type": "image/png" },
    { "src": "/apple-touch-icon-167x167.png", "sizes": "167x167", "type": "image/png" },
    { "src": "/apple-touch-icon-152x152.png", "sizes": "152x152", "type": "image/png" },
    { "src": "/apple-touch-icon-120x120.png", "sizes": "120x120", "type": "image/png" }
  ]
}
```

## Task 4.6: Resize favicon.ico

- [ ] **Step 1:**

```bash
du -h public/favicon.ico  # expected ~1.1 MB
```

- [ ] **Step 2:** Koristi https://favicon.io/favicon-converter/ ili offline tool; upload-uj `apple-touch-icon-180x180.png` i preuzmi multi-size ICO. Target: < 50 KB.

- [ ] **Step 3:** Zamijeni `public/favicon.ico`. `du -h public/favicon.ico` → <50 KB.

## Task 4.7: Build + measure

- [ ] **Step 1:**

```bash
rm -rf .next
pnpm build
pnpm start &
sleep 4
npx lighthouse http://localhost:3000/sr --preset=mobile --only-categories=performance \
  --output=html --output-path=./claudedocs/lh-phase4.html --chrome-flags="--headless"
kill %1
```

Expected: Mobile Perf ≥ 85 (baseline ~60-70).

## Task 4.8: Commit + PR

- [ ] **Step 1:**

```bash
git add .
git commit -m "perf(landing): image optimization + SSR caching + manifest fix

- Remove images.unoptimized; enable AVIF + WebP
- Resize gallery-desktop.png 3.5MB → ~500KB
- Delete orphan + duplicate PNGs
- Cache getPricingPlansFromDb() with unstable_cache (revalidate 1h)
- Fix manifest.json start_url and icons
- Resize favicon 1.1MB → <50KB

Closes audit P1-P5. Expected mobile Lighthouse +20-30 points.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push -u origin feat/landing-performance
gh pr create --title "perf(landing): images + caching + manifest" --body "Phase 4 — closes P1-P5."
```

---

# PHASE 5 — UX polish

**Branch:** `feat/landing-ux-polish`

**Files:** 10 landing komponenti + oba translation fajla

## Task 5.0: Branch

- [ ] `git checkout main && git pull && git checkout -b feat/landing-ux-polish`

## Task 5.1: Social proof brojke — HUMAN GATE

- [ ] **Step 1:** Pitaj user-a: *"U `SocialProof.tsx:46-48` su placeholder brojke (20 parova, 100 gostiju, 4 zemlje). Stvarne? Ukloniti? Zamijeniti?"*

- [ ] **Step 2: Postupi po odgovoru** — ili ostavi, ili `<SocialProof />` izbaci iz ClientPage, ili update brojke.

## Task 5.2: "100% Free" badge

- [ ] **Step 1:** `grep -n "100" components/landingPage/Navbar.tsx locales/*/translation.json`

- [ ] **Step 2:** Zamijeni SR: "Besplatan paket dostupan"; EN: "Free plan available".

## Task 5.3: Product Hunt badge — HUMAN GATE

- [ ] **Step 1:** Pitaj user-a da li je ProductHunt launch stvaran. Ako NIJE, ukloni badge iz `SocialProof.tsx:110` i `Footer.tsx:56`.

## Task 5.4: Focus rings na CTA

- [ ] **Step 1:** `grep -n "hover:" components/landingPage/HeroSection.tsx components/landingPage/Pricing.tsx components/landingPage/Navbar.tsx`

- [ ] **Step 2:** Za svaki primary CTA (`<Link>`, `<button>` sa hover:), dodaj:
```tsx
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary
```

Primjerske linije:
- `HeroSection.tsx:49-53`
- `Pricing.tsx:133`
- `Navbar.tsx:40-46`

## Task 5.5: prefers-reduced-motion guard

- [ ] **Step 1:** Za svaku komponentu koja koristi `<motion.*>` dodaj na vrh:

```tsx
import { motion, useReducedMotion } from 'framer-motion';

export function Comp() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      // ... ostali props-i netaknuti
    >
    ...
```

Fajlovi: `PainPoints.tsx`, `Solution.tsx`, `HowItWorks.tsx`, `Benefits.tsx`, `Pricing.tsx`, `FAQ.tsx`, `HeroSection.tsx`.

- [ ] **Step 2: SocialProof counter**

U `SocialProof.tsx`, unutar `useEffect` koji radi rAF counter:
```tsx
const reduce = useReducedMotion();
useEffect(() => {
  if (reduce) { setCount(target); return; }
  // postojeći counter
}, [reduce /* + existing deps */]);
```

## Task 5.6: aria-hidden na dekorativne ikone

- [ ] **Step 1: Sweep**

Za svaku Lucide ikonu koja je UZ tekstom (dekorativna):
```tsx
<Crown aria-hidden="true" className="..." />
```

Fajlovi:
- `PainPoints.tsx:41` (CheckSquare)
- `HowItWorks.tsx:53`
- `Benefits.tsx:46`
- `Pricing.tsx:58,123,140,174`
- `HeroSection.tsx:32,52,67`
- `Footer.tsx:40,43,73`

## Task 5.7: Mobile menu Escape + click-outside

- [ ] **Step 1: `Navbar.tsx`** — dodaj hook-ove:

```tsx
const menuRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!menuOpen) return;
  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
  const onClick = (e: MouseEvent) => {
    if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
  };
  window.addEventListener('keydown', onKey);
  document.addEventListener('click', onClick);
  return () => {
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('click', onClick);
  };
}, [menuOpen]);
```

Dodaj `ref={menuRef}` na wrapper mobile menu-a.

## Task 5.8: Pricing inline strings → translation.json

- [ ] **Step 1: `Pricing.tsx:101-113`** — zamijeni ternary-je sa `t()`:

```tsx
t("pricing.labels.guests")
t("pricing.labels.storage")
t("pricing.labels.quality")
t("pricing.labels.daysStored", { count: plan.storageDays })
```

- [ ] **Step 2: SR u `locales/sr/translation.json` pricing.labels:**
```json
"labels": {
  "guests": "gostiju",
  "storage": "čuvanje",
  "quality": "kvalitet",
  "daysStored_one": "{{count}} dan",
  "daysStored_few": "{{count}} dana",
  "daysStored_other": "{{count}} dana"
}
```

- [ ] **Step 3: EN:**
```json
"labels": {
  "guests": "guests",
  "storage": "storage",
  "quality": "quality",
  "daysStored_one": "{{count}} day",
  "daysStored_other": "{{count}} days"
}
```

## Task 5.9: Intl.NumberFormat za cijenu

- [ ] **Step 1: `Pricing.tsx:75-79`** — zamijeni:
```tsx
{(plan.price / 100).toFixed(2)} EUR
```
sa:
```tsx
{new Intl.NumberFormat(i18n.language === 'sr' ? 'sr-RS' : 'en-US', {
  style: 'currency',
  currency: 'EUR',
}).format(plan.price / 100)}
```

## Task 5.10: Missing allFieldsRequired EN key

- [ ] **Step 1:** U `locales/en/translation.json` `admin.login.errors`:
```json
"allFieldsRequired": "All fields are required."
```

## Task 5.11: Build + commit

- [ ] **Step 1:** `rm -rf .next && pnpm build && pnpm lint && npx tsc --noEmit && pnpm test:unit` → zeleno

- [ ] **Step 2: Manual QA:**
  - Tab kroz CTA-e → vidim focus ring
  - macOS Accessibility → Reduce Motion ON → animacije stoje
  - Mobile menu → Escape + klik vani zatvara
  - Pricing: "25,00 €" (SR) / "€25.00" (EN)
  - VoiceOver ne čita dekorativne ikone

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "polish(landing): UX a11y + content fixes

- Focus-visible rings on primary CTAs
- Respect prefers-reduced-motion across framer-motion + counter
- aria-hidden on decorative Lucide icons
- Mobile menu Escape + click-outside
- Extract Pricing inline strings to i18n pricing.labels
- Intl.NumberFormat for locale-aware currency
- Add missing allFieldsRequired EN key
- [conditional] real social proof numbers or remove section
- [conditional] remove unpublished Product Hunt badge
- '100% Free' → 'Free plan available'

Closes audit High Priority 2.1, 2.5 and i18n polish.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push -u origin feat/landing-ux-polish
gh pr create --title "polish(landing): UX a11y + content" --body "Phase 5."
```

---

# PHASE 6 — Verifikacija

Bez branch-a — QA pass nakon Phase 1-5 merge-ovanih.

## Task 6.1: Bundle analyzer

- [ ] `rm -rf .next && ANALYZE=true pnpm build 2>&1 | tail -30` → zabilježi chunk sizes.

## Task 6.2: Lighthouse

- [ ] **Desktop SR + EN:**

```bash
pnpm build && pnpm start &
sleep 5
for lang in sr en; do
  npx lighthouse http://localhost:3000/$lang --preset=desktop \
    --output=html --output-path=./claudedocs/lh-$lang-desktop.html \
    --chrome-flags="--headless"
done
```
Target: Perf ≥ 90, A11y ≥ 95, SEO 100, Best Practices ≥ 90.

- [ ] **Mobile SR + EN:** isti sa `--preset=mobile`, target Perf ≥ 85.

## Task 6.3: Security headers live

- [ ] `curl -I https://www.dodajuspomenu.com/ 2>/dev/null | grep -iE "content-security-policy|strict-transport-security|x-frame|x-content|referrer-policy|permissions-policy"` → 6 headera.

- [ ] Mozilla Observatory: https://observatory.mozilla.org/analyze/www.dodajuspomenu.com → target grade B+.

## Task 6.4: Consent flow test (manual)

- [ ] Privatni prozor → otvori `https://www.dodajuspomenu.com/sr`
- [ ] Banner prisutan
- [ ] DevTools → Application → Cookies: NEMA `_ga` prije pristanka
- [ ] "Odbijam" → banner nestaje, `_ga` se ne setuje
- [ ] Clear storage, reload, "Prihvatam" → `_ga` se setuje
- [ ] Isto na `/en`

## Task 6.5: OG card preview

- [ ] https://www.opengraph.xyz/ — unesi `/sr` → SR metadata, locale `sr_RS`
- [ ] Isto za `/en` → EN metadata, locale `en_US`

## Task 6.6: Screen reader smoke test

- [ ] macOS VoiceOver (Cmd+F5) na `/sr`:
  - Prvi fokus = "Preskoči na glavni sadržaj"
  - Section landmarks čitaju se ispravno
- [ ] `/en`: skip link = "Skip to main content", lang = en
- [ ] Mobile menu toggle announce-uje "expanded/collapsed"

## Task 6.7: Docker build sanity

- [ ] `docker build --env-file .env -t weddingapp-launch-test .`
- [ ] `docker run -p 3000:3000 --env-file .env weddingapp-launch-test &`
- [ ] `curl -I http://localhost:3000/sr` → 200, svi headeri.

## Task 6.8: WebPageTest EU 4G

- [ ] https://www.webpagetest.org/ → `/sr`, Frankfurt, 4G Chrome Mobile
- [ ] Zabilježi LCP, CLS, TBT. Target: LCP < 2.5s, CLS < 0.1, TBT < 200ms.

## Task 6.9: Vercel DNS redirect

- [ ] Vercel → Project Settings → Domains: `dodajuspomenu.com → www.dodajuspomenu.com 301`

## Task 6.10: Finalni sign-off

- [ ] U `claudedocs/2026-04-20-landing-production-readiness.md` sekcija 5, označi sve [x] u Fazi 1-3 (blokeri).
- [ ] Otvori followup issue-e za stavke iz "Followups" sekcije.
- [ ] Deploy PSA i launch announcement.

---

## Verification (end-to-end)

```bash
# 1. Merge status
gh pr list --state merged --limit 6

# 2. Live health
curl -I https://www.dodajuspomenu.com/sr | head -20

# 3. Final Lighthouse
npx lighthouse https://www.dodajuspomenu.com/sr --output=html --output-path=./claudedocs/lh-final.html

# 4. Cookie posture
curl -c /tmp/cookies.txt -o /dev/null -s https://www.dodajuspomenu.com/sr
grep -E "_ga|cookie_consent" /tmp/cookies.txt
# Expected: samo i18nextLng ili cookie_consent (ne _ga prije consent-a)

# 5. Legal pages
for p in /privacy /terms /cookies /kontakt /sr/privacy /en/kontakt; do
  echo "$p: $(curl -o /dev/null -s -w '%{http_code}' https://www.dodajuspomenu.com$p)"
done

# 6. Sitemap sanity
curl -s https://www.dodajuspomenu.com/sitemap.xml | head -40
```

---

## Followups (out of scope)

- True RSC migration svih landing sekcija (-200+ KB JS)
- Uklanjanje framer-motion-a u korist CSS keyframes + reduced-motion media query
- Focus trap na mobile menu (`focus-trap-react`)
- Nonce-based strict CSP bez `'unsafe-inline'` / `'unsafe-eval'`
- Pravi per-locale `<html lang>` SSR (root-level `app/sr/layout.tsx` restructure)
- Pre-gen AVIF/WebP u build-u ako Vercel edge optimization bude skup
- A/B testing pricing copy
- E2E Playwright test za cookie consent flow
- Observability na rate-limiting (real rate measurements)

---

## Critical files

- **Phase 1:** `app/layout.tsx`, `app/page.tsx`, `app/about/page.tsx`, `components/landingPage/Footer.tsx`, `locales/{sr,en}/translation.json`, **new** `components/CookieConsent.tsx`, `hooks/useConsent.ts`, `app/{privacy,terms,cookies,kontakt}/page.tsx`
- **Phase 2:** `next.config.mjs`
- **Phase 3:** `app/{page,layout}.tsx`, `app/{sr,en}/{layout,page}.tsx`, `components/ClientPage.tsx`, `components/landingPage/{HeroSection,HowItWorks,Navbar,Footer,SocialProof}.tsx`, `app/sitemap.xml/route.ts`, **new** `components/{HtmlLangSync,SkipLink}.tsx`
- **Phase 4:** `next.config.mjs`, `lib/pricing-db.ts`, `public/manifest.json`, `public/favicon.ico`, `public/images/sr/gallery-desktop.png`, deletes
- **Phase 5:** `components/landingPage/*.tsx`, `locales/{sr,en}/translation.json`

---

**Generisano 2026-04-20. Plan je evidence-based — svaka stavka mapirana na konkretan fajl + liniju iz audita.**
