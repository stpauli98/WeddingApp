# Landing Page Production Readiness Audit

**Datum:** 2026-04-20
**Scope:** dodajuspomenu.com landing (`app/page.tsx`, `app/layout.tsx`, `components/landingPage/*`, `components/ClientPage.tsx`)
**Metodologija:** 6 paralelnih specijalizovanih agenata (SEO, performance, a11y, security/GDPR, UX/sadržaj, i18n/mobile)

---

## TL;DR — Šta blokira launch

Landing **NIJE spreman za produkciju u EU tržištu**. Pet blocker kategorija u redoslijedu po hitnosti:

1. **GDPR nekompletnost** — nema cookie banner-a, GA se učitava bez pristanka, 4 legal stranice su 404 (`/privacy`, `/terms`, `/contact`, `/kontakt`).
2. **Zastarjeli/lažni sadržaj koji može biti legal risk** — fake "Ana M." review u JSON-LD, FAQ advertiše stare cijene (€29 unlimited, 500 slika, 6 mjeseci / 1 godina) koje su u suprotnosti sa stvarnim tier-ovima.
3. **i18n polovičan** — `<html lang="sr">` hardkodiran za sve rute uključujući `/en`, OG metadata na engleskom dijeli srpsku karticu, skip-link + 4 aria-label su samo na srpskom.
4. **Performance blokeri** — `images: { unoptimized: true }`, 3.5 MB PNG hero slika, cijela landing je `'use client'` bez razloga, nema cache na Prisma pricing query-u.
5. **A11y duple landmarks** — `<main id="main-content">` ide i u `layout.tsx` i u `page.tsx` → duplo.

**Procjena:** 3-5 dana fokusiranog rada da se ovo dovede do launch state. Sve je popravljivo, ništa nije arhitekturno loše.

---

## 1. BLOCKERS (ne može u produkciju dok se ne riješi)

### 1.1 Legal / GDPR

| # | Problem | Fajl | Rizik |
|---|---|---|---|
| L1 | Footer linkuje `/privacy`, `/terms`, `/contact` — **nijedna stranica ne postoji** | [Footer.tsx:31-33](components/landingPage/Footer.tsx) | GDPR Art. 13-14 violation; processing PII bez policy-ja je nezakonit |
| L2 | Google Analytics se učitava bez consent-a za svakog posjetioca | [layout.tsx:69-81](app/layout.tsx) | ePrivacy + GDPR violation, _ga/_gid cookie-i + IP transfer ka US |
| L3 | Nema cookie consent banner-a igdje | N/A | Required pod EU ePrivacy + Zakon o zaštiti podataka o ličnosti (RS) |
| L4 | Fake 5-star Review ("Ana M.") u JSON-LD | [layout.tsx:163-183](app/layout.tsx) | EU Omnibus Directive (2019/2161) klasifikuje ovo kao "blacklisted practice" — automatski prekršaj, kazne do 4% prometa |
| L5 | Nema Impressum / legal entity identifikacije | N/A | Directive 2000/31/EC Art. 5 zahtijeva puno otkriće legalnog entiteta |
| L6 | FAQ JSON-LD advertiše **pogrešne cijene i retention** ("29€ unlimited", "500 slika besplatno", "6 mjeseci / neograničeno") | [layout.tsx:184-239](app/layout.tsx) | Misleading advertising + Google može disable-ovati rich result |
| L7 | FAQ u `locales/en/translation.json` advertiše "Free 10 days, Basic 30, Premium 1 year" i "Basic 25 slika, Premium 50" | [locales/en/translation.json](locales/en/translation.json) | Ugovorna obaveza / refund risk — kupac Premium-a očekuje godinu, dobija 30 dana |
| L8 | `app/about/page.tsx:47` tvrdi "na email dobija verifikacioni kod" | [about/page.tsx:47](app/about/page.tsx) | Netačno — email verification je stub (vidi CLAUDE.md) |

### 1.2 Security headers

| # | Problem | Fajl |
|---|---|---|
| S1 | **Zero security headers** — nema `headers()` u `next.config.mjs`, nema u middleware-u | [next.config.mjs](next.config.mjs) |
| S2 | Nema CSP → XSS nema defense layer | isto |
| S3 | Nema HSTS → auth cookie-i mogu procuriti preko HTTP-a | isto |
| S4 | Nema X-Frame-Options → clickjacking moguć | isto |
| S5 | External SVG od api.producthunt.com bez `img-src` whitelist-a | [Footer.tsx:56](components/landingPage/Footer.tsx) |

### 1.3 Strukturni (a11y + SEO)

| # | Problem | Fajl |
|---|---|---|
| A1 | **Duplo `<main id="main-content">`** — u `layout.tsx:246` i `page.tsx:49` | WCAG 1.3.1 violation + HTML spec violation (IDs moraju biti unique) |
| A2 | `<html lang="sr">` hardkodiran za `/en` rute | [layout.tsx:67](app/layout.tsx) — WCAG 3.1.1 fail |
| A3 | Skip-link "Preskoči na glavni sadržaj" samo na srpskom | [layout.tsx:243](app/layout.tsx) |
| A4 | Dupli `<I18nProvider>` wrapper | `layout.tsx:244` i `ClientPage.tsx:18` |
| A5 | Nema hreflang alternates — Google ne zna da su `/sr` i `/en` parovi istog sadržaja | [layout.tsx](app/layout.tsx) + [page.tsx:33-35](app/page.tsx) |
| A6 | `/en` rute dijele srpsku OG karticu (OG title/desc Serbian, locale "sr_RS") | [layout.tsx:28-43](app/layout.tsx) |

### 1.4 Broken image alt text (WCAG 1.1.1)

| # | Fajl:line | Problem |
|---|---|---|
| A7 | [HeroSection.tsx:87](components/landingPage/HeroSection.tsx) | `alt={t("hero.titleLine1")}` — reuse heading teksta na dekorativnoj screenshot slici |
| A8 | [HowItWorks.tsx:71](components/landingPage/HowItWorks.tsx) | `alt={t("howItWorks.title")}` — isti anti-pattern |

### 1.5 Performance

| # | Problem | Fajl | Impact |
|---|---|---|---|
| P1 | `images: { unoptimized: true }` — onemogućava cijeli next/image pipeline | [next.config.mjs:10](next.config.mjs) | LCP -1.5s do -3s na 4G |
| P2 | `gallery-desktop.png` = **3.5 MB**, `dodajuspomenu-gallery-sr-desktop.png` = 3.5 MB (duplikat) | public/images/sr/ | LCP hit 2-4s |
| P3 | `favicon.ico` = **1.1 MB** (trebalo bi <50 KB) | public/favicon.ico | Wasted bandwidth |
| P4 | Cijela landing je `'use client'` preko `ClientPage.tsx` | [ClientPage.tsx:1](components/ClientPage.tsx) | 250-400 KB ship-a se nepotrebno |
| P5 | `getPricingPlansFromDb()` radi Prisma roundtrip na svaki SSR render, nema cache | [lib/pricing-db.ts:28](lib/pricing-db.ts) | +50-200 ms TTFB |

---

## 2. HIGH PRIORITY (popraviti prije launch-a, ne blokira ali osjetno kvari utisak)

### 2.1 Sadržaj / tekst

- **"100% Free" badge u Navbar-u** konflikuje sa €25/€75 cijenama na istoj stranici — [Navbar.tsx](components/landingPage/Navbar.tsx). Promijeniti u "Free plan available" ili ukloniti.
- **Social proof stats su placeholder-i** (20 parova, 100 gostiju, 4 zemlje) — [SocialProof.tsx:46-48](components/landingPage/SocialProof.tsx). Ako to nisu stvarne brojke, maknuti ili označiti kao "coming soon". Fake metrike su trust-killer.
- **Product Hunt badge** — hardkodiran `post_id=979471`, embed-uje se na dva mjesta (SocialProof + Footer). Potvrditi da je launch tamo stvaran prije produkcije.

### 2.2 Pricing logika i copy

- **Basic vrijednost nejasna** — od landing page-a nije očigledno zašto platiti €25 za Basic kad Free pokriva 3 slike × 30 dana. Pricing kartica treba clear differentiator ("Do 7× više slika po gostu" + "Do 5× više gostiju" ili sličan social hook).
- **"1 god." label na Premium** kartici može implicirati 365-dana storage dok je sve 30 dana sada — [Pricing.tsx:104](components/landingPage/Pricing.tsx).

### 2.3 SEO

- **Twitter handle mismatch** — `site: @dodajuspomenu` vs `creator: @nextpixel98` ([page.tsx:31](app/page.tsx) vs [layout.tsx:49](app/layout.tsx)). Konsolidovati.
- **Sitemap listuje `/admin/dashboard`, `/guest/dashboard`, `/guest/success`** koji su gated + listani u robots.txt Disallow → konfliktni signali — [app/sitemap.xml/route.ts](app/sitemap.xml/route.ts).
- **`/about` u sitemap-u ali ruta ne postoji** → 404.
- **Misused `Event` schema** sa `startDate: "2025-05-04"` (prošlo) — [layout.tsx:95-108](app/layout.tsx). Product je SaaS, ne event. Zamijeniti sa `SoftwareApplication` ili ukloniti.
- **Canonical host mismatch** — `metadataBase` koristi `dodajuspomenu.com`, sve ostalo `www.dodajuspomenu.com`. Odabrati jedan + 301 drugi.
- **`generator: "v0.dev"`** — [layout.tsx:23](app/layout.tsx). Ukloniti.
- **Missing `<lastmod>` + `xhtml:link` hreflang** u sitemap-u.

### 2.4 i18n

- **Hardkodirani srpski aria-label-i** na `Navbar.tsx:34`, `Footer.tsx:55,66`, `SocialProof.tsx:107`, skip-link. Provući kroz `t()`.
- **Inline string ternaries u Pricing.tsx:101-113** (`"gostiju" : "guests"`, `"čuvanje" : "storage"`, `"kvalitet" : "quality"`, `"1 god." : "1 yr"`). Premjestiti u `translation.json`.
- **Cijena format** — `"{price} EUR"` je hardkodiran, koristiti `Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' })`.
- **Missing translation key** — `admin.login.errors.allFieldsRequired` postoji u `sr` ali ne u `en`.

### 2.5 A11y

- **Focus ring missing na primary CTA-ima** — samo `hover:` state, nema `focus-visible:ring-*` — WCAG 2.4.7 fail na [HeroSection.tsx:49-53](components/landingPage/HeroSection.tsx).
- **`prefers-reduced-motion` guard nedostaje** — framer-motion se ne gasi za korisnike koji to traže (WCAG 2.3.3 / 2.2.2). Pogađa 7 od 10 landing komponenti.
- **Dekorativni Lucide ikoni nemaju `aria-hidden="true"`** — pregazi ih desetak. Screen reader announce-uje "image" bez vrijednosti.
- **Mobile menu nema focus trap + Escape handler** — [Navbar.tsx:68-94](components/landingPage/Navbar.tsx).
- **Counter animacija u SocialProof** ignore-uje reduced-motion — [SocialProof.tsx:20-32](components/landingPage/SocialProof.tsx).

### 2.6 Performance optimizacije

| Promjena | Fajl | Efekat |
|---|---|---|
| Konvertovati sve `/public/images/*.png` u AVIF (ili WebP fallback) | public/images/ | ~85-90% manji payload (3.5 MB → 200-400 KB) |
| Maknuti `unoptimized: true` + dodati `formats: ['image/avif','image/webp']` | [next.config.mjs:10](next.config.mjs) | Automatski srcset |
| Maknuti 10 duplikata PNG-ova (root `/public` + `/public/images` su iste) | public/ | -5.6 MB repo |
| `lib/pricing-db.ts` → `unstable_cache(..., { revalidate: 3600, tags: ['pricing'] })` | [lib/pricing-db.ts:28](lib/pricing-db.ts) | TTFB -50 do -200ms; revalidate on mutation |
| Konvertovati statične sekcije u RSC (ukloniti `'use client'` gdje nema state-a) | Solution, PainPoints, Benefits, HowItWorks, FAQ | -150 do -250 KB JS |
| Premjestiti GA na `lazyOnload` **iza consent-a** | [layout.tsx:70-81](app/layout.tsx) | GDPR + LCP benefit |

---

## 3. MEDIUM / POLISH (nije launch blocker)

- `<meta name="keywords">` ignorisan od 2009. — ukloniti ([page.tsx:4-16](app/page.tsx))
- `manifest.json` icon-i pokazuju na `favicon.ico` ali deklarišu PNG mime + 192/512 — pravi PNG-ovi potrebni
- `manifest.json` `start_url: "/guest/dashboard"` ide na auth-gated stranicu — treba `/` ili `/sr`
- Pricing `scale-[1.03]` na recommended card može clip-ovati shadow na 320px
- `text-[10px]` u Pricing metrici je borderline neraspoznatljiv — bump na `text-xs`
- Replace manual `IntersectionObserver` counter u `SocialProof` sa CSS count-up ili use single observer
- Dead weight: `public/fonts/Inter-*.ttf` (~800 KB), `slika.png` (1.2 MB), `no-image-uploaded.png` (1.3 MB), `public/images/pexels-*.jpg` (4.3 MB), `.DS_Store` fajlovi
- `lucide-react` tree-shaking verification kroz `ANALYZE=true pnpm build`
- Consider localized anchor-e (`#kako-radi` → `#how-it-works` na EN)

---

## 4. ŠTA RADI DOBRO (ne dirati)

- Single `<h1>` u HeroSection-u, čist h1→h2→h3 hijerarhija — exemplary
- Svaki `<section>` ima `aria-labelledby` → real `h2` id — exemplary landmark labelling
- CSRF infrastruktura (`@edge-csrf/core`) na svim state-changing rutama
- Session cookies `httpOnly` + `sameSite=lax`
- `robots.txt` disallow-uje `/api/`, `/admin/dashboard`, `/guest/dashboard`
- External linkovi koriste `rel="noopener noreferrer"`
- Vercel Analytics + Speed Insights (first-party, GDPR OK)
- Radix Accordion za FAQ — accessible by default
- Mobile hamburger ima `aria-expanded` + dinamički `aria-label`
- `next/image` sa eksplicitnim width/height (prevents CLS)
- `priority` flag na hero slici
- 62 `t()` key-a parirano u oba locale-a (samo 1 drift na non-landing fajlu)
- Middleware ispravno rješava double-prefix + cookie persistence
- Responsive breakpoints konzistentno korišteni kroz sve sekcije
- Svi `<section>` elementi imaju semantičke landmarks

---

## 5. PRIORITET LAUNCH CHECKLIST (redoslijed izvršavanja)

### Faza 1 — Legal blokeri (D-Day -3 do -2)
- [ ] Kreirati `app/privacy/page.tsx` (privacy policy, data controller, rights)
- [ ] Kreirati `app/terms/page.tsx` (ToS sa pricing + retention pravim brojkama)
- [ ] Kreirati `app/cookies/page.tsx` (cookie policy)
- [ ] Kreirati `app/contact/page.tsx` ili `/kontakt` + Impressum sa legal entity info
- [ ] Dodati cookie consent banner (npr. `vanilla-cookieconsent`, `react-cookie-consent`, ili `@cookieconsent/react`)
- [ ] Gate GA iza consent-a (`gtag('consent', 'default', {analytics_storage: 'denied'})`)
- [ ] Ukloniti fake review iz [layout.tsx:163-183](app/layout.tsx)
- [ ] Popraviti FAQ JSON-LD u [layout.tsx:184-239](app/layout.tsx) — tačne cijene + retention
- [ ] Popraviti FAQ u `locales/en/translation.json` i `locales/sr/translation.json` — tačni brojevi
- [ ] Ukloniti `Event` JSON-LD blok (ne primjenjuje se)
- [ ] Popraviti [about/page.tsx:47](app/about/page.tsx) — email verification tvrdnja

### Faza 2 — Security headers (D-Day -2)
- [ ] Dodati `async headers()` u [next.config.mjs](next.config.mjs):
  - CSP (strict, `script-src 'self' 'unsafe-inline' www.googletagmanager.com vercel.live; img-src 'self' res.cloudinary.com api.producthunt.com data:;` …)
  - HSTS `max-age=63072000; includeSubDomains; preload`
  - X-Frame-Options DENY
  - Referrer-Policy `strict-origin-when-cross-origin`
  - Permissions-Policy (camera=(), microphone=(), geolocation=())
  - X-Content-Type-Options nosniff

### Faza 3 — Strukturni (D-Day -2 do -1)
- [ ] Ukloniti `<main>` iz [page.tsx:49](app/page.tsx) (layout ga već ima)
- [ ] Ukloniti duplirani `<I18nProvider>` iz [ClientPage.tsx:18](components/ClientPage.tsx)
- [ ] Set `<html lang>` dinamički — `app/sr/layout.tsx` + `app/en/layout.tsx` override root ili derive iz pathname-a
- [ ] Generate locale-specific `metadata` (EN varijanta OG-a, locale `en_US`)
- [ ] Dodati `alternates.languages` sa sr/en/x-default
- [ ] Popraviti image alt-e na [HeroSection.tsx:87](components/landingPage/HeroSection.tsx), [HowItWorks.tsx:71](components/landingPage/HowItWorks.tsx)
- [ ] Translate-ovati skip-link + aria-label-e kroz `t()`

### Faza 4 — Performance (D-Day -1)
- [ ] Konvertovati sve PNG u AVIF/WebP (npr. `sharp` script ili `@squoosh/cli`)
- [ ] Maknuti `unoptimized: true` iz [next.config.mjs:10](next.config.mjs)
- [ ] Obrisati duplikate iz `/public`
- [ ] Reprocessing favicon-a na normalnu veličinu
- [ ] Cache-ovati `getPricingPlansFromDb()` sa `unstable_cache`
- [ ] Konvertovati statične landing sekcije u RSC gdje je moguće
- [ ] Premjestiti GA iza consent-a (isti rad kao Faza 1)

### Faza 5 — Content + UX polish (D-Day -1 do 0)
- [ ] Provjeriti/zamijeniti SocialProof stats (`20 parova, 100 gostiju`) sa stvarnim brojkama ili ukloniti
- [ ] Provjeriti Product Hunt launch status, ukloniti badge ako nije live
- [ ] Zamijeniti "100% Free" u Navbar-u sa "Free plan available"
- [ ] Dodati focus ring na CTA-e (`focus-visible:ring-2 ring-offset-2`)
- [ ] `prefers-reduced-motion` guard na framer-motion animacijama
- [ ] `aria-hidden="true"` na dekorativnim Lucide ikonama
- [ ] Mobile menu Escape-to-close + focus trap

### Faza 6 — Pre-launch verifikacija (D-Day 0)
- [ ] `ANALYZE=true pnpm build` → provjeriti bundle size
- [ ] Lighthouse mobile + desktop (target: Perf ≥90, A11y ≥95, SEO 100, Best Practices ≥90)
- [ ] `curl -I https://www.dodajuspomenu.com` → verify security headers prisutni
- [ ] Manual consent flow test (accept/decline GA)
- [ ] Manual test na SR i EN rutama — OG card preview kroz https://www.opengraph.xyz/
- [ ] Screen reader smoke test (VoiceOver iOS + NVDA)
- [ ] Docker build sa `.env` fajlom (per project RULES) — sanity check
- [ ] WebPageTest run sa EU 4G profile-om

---

## 6. RELEVANTNI FAJLOVI (za fiksove)

Primarno:
- [app/layout.tsx](app/layout.tsx) — metadata, JSON-LD, duplicate main, html lang
- [app/page.tsx](app/page.tsx) — duplicate main, metadata
- [components/ClientPage.tsx](components/ClientPage.tsx) — duplicate I18nProvider, use client blanket
- [next.config.mjs](next.config.mjs) — headers, image optimization
- [lib/pricing-db.ts](lib/pricing-db.ts) — caching
- [components/landingPage/](components/landingPage/) — svih 10 komponenti

Sekundarno:
- [locales/en/translation.json](locales/en/translation.json), [locales/sr/translation.json](locales/sr/translation.json) — FAQ content mismatch
- [app/sitemap.xml/route.ts](app/sitemap.xml/route.ts) — cleanup, lastmod, hreflang
- [public/robots.txt](public/robots.txt) — disallow auth entry points
- [app/about/page.tsx](app/about/page.tsx) — misleading verification claim
- Novo: `app/privacy/`, `app/terms/`, `app/cookies/`, `app/contact/` — moraju postojati

---

## 7. PROCJENA EFORTA

| Faza | Effort | Šta se gradi |
|---|---|---|
| 1. Legal blokeri | 1-1.5 dana | 4 stranice + cookie banner + FAQ/JSON-LD cleanup |
| 2. Security headers | 1-2 sata | `headers()` funkcija + test |
| 3. Strukturni | 0.5 dana | layout restrukturacija + hreflang + alt-ovi |
| 4. Performance | 0.5-1 dan | Image conversion + cache + RSC migration |
| 5. UX polish | 0.5 dana | CTA fokus + motion + content fixes |
| 6. Verifikacija | 0.5 dan | Lighthouse + manual QA |
| **UKUPNO** | **~3.5-5 dana** | |

---

**Generisano 2026-04-20 od 6 paralelnih audit agenata. Svi nalazi su evidence-based sa file:line referencama. Nijedan fajl nije mijenjan u ovom audit-u.**
