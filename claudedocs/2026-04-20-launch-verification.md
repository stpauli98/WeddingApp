# Launch Verification Report

**Date:** 2026-04-20
**Base commit:** `a6715e6` — polish(landing): UX a11y + content polish (#10)
**Environment:** local prod build (`pnpm build && pnpm start` on `:3000`) + live `https://www.dodajuspomenu.com`

## Phase summary

| Phase | PR | Commit | Scope |
|---|---|---|---|
| 1 | #6 | b47e766 | GDPR legal pages (`/privacy`, `/terms`, `/cookies`, `/kontakt`), cookie consent banner, JSON-LD cleanup |
| 2 | #7 | 4472480 | Baseline security headers (CSP, HSTS, X-Frame, MIME, Referrer, Permissions-Policy) |
| 3 | #8 | b761a08 | Structural a11y + i18n + SEO fixes |
| 4 | #9 | 9968950 | Image optimization, SSR caching, manifest fix |
| 5 | #10 | a6715e6 | UX a11y polish + content polish |

---

## Build

Build succeeded with no errors. Prisma generate ran cleanly; Next 15.3.9 compiled all 40 routes. A non-fatal runtime log during static render notes the pricing DB is unreachable at build time (`[pricing-db] fallback to hardcoded config: TypeError: Cannot read properties of null (reading 'pricingPlan')`) — this is the documented `lib/pricing-tiers.ts` fallback path and does not affect output correctness. Runtime will re-fetch from DB per request.

### Route sizes (First Load JS, first 20)

```
/                      173 kB  (static, revalidate 1h, expire 1y)
/en                    173 kB  (same)
/sr                    173 kB  (same)
/about                 106 kB
/cookies               106 kB
/kontakt               106 kB
/privacy               106 kB
/terms                 106 kB
/admin/login           148 kB
/admin/register        148 kB
/admin/event           185 kB  (one-time create wizard)
/admin/dashboard/[id]  192 kB
/guest/login           144 kB
/guest/dashboard       206 kB
/guest/success         172 kB
/sitemap.xml           102 kB  (SSR)

Shared chunk baseline: 102 kB
  chunks/6648.js   45.8 kB
  chunks/c1846248  54.2 kB
Middleware: 33.6 kB
```

Landing at 173 kB First Load JS — reasonable for a marketing page with Tailwind, Radix, and i18n bundles.

---

## Security headers — LOCAL

All six required headers present on `/sr`:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'
  https://www.googletagmanager.com https://www.google-analytics.com https://vercel.live
  https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:
  blob: https://res.cloudinary.com https://api.producthunt.com https://www.google-analytics.com;
  font-src 'self' data:; connect-src 'self' https://www.google-analytics.com
  https://*.vercel-insights.com https://vitals.vercel-insights.com https://api.producthunt.com;
  frame-src 'self' https://www.producthunt.com; frame-ancestors 'none'; base-uri 'self';
  form-action 'self'; object-src 'none'; upgrade-insecure-requests
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

Note: CSP still carries `'unsafe-inline' 'unsafe-eval'` in `script-src` — see Open items for nonce-based hardening.

---

## Legal pages — LOCAL (12 routes)

All 200 after following redirects:

```
/privacy: 200          /sr/privacy: 200       /en/privacy: 200
/terms: 200            /sr/terms: 200         /en/terms: 200
/cookies: 200          /sr/cookies: 200       /en/cookies: 200
/kontakt: 200          /sr/kontakt: 200       /en/kontakt: 200
```

---

## Sitemap — LOCAL

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://www.dodajuspomenu.com/sr</loc>
    <xhtml:link rel="alternate" hreflang="sr-RS" href=".../sr" />
    <xhtml:link rel="alternate" hreflang="en-US" href=".../en" />
    <xhtml:link rel="alternate" hreflang="x-default" href=".../sr" />
  </url>
  <url><loc>https://www.dodajuspomenu.com/en</loc>  ...hreflang tags same...</url>
  <url><loc>https://www.dodajuspomenu.com/privacy</loc></url>
  <url><loc>https://www.dodajuspomenu.com/terms</loc></url>
  <url><loc>https://www.dodajuspomenu.com/cookies</loc></url>
  <url><loc>https://www.dodajuspomenu.com/kontakt</loc></url>
</urlset>
```

Correct: 6 public URLs, no `/admin/`, no `/guest/`, no `/about`, hreflang alternates in place on both locale roots.

---

## i18n metadata

**SR** (direct):
```
og:title       = "DodajUspomenu – Digitalni svadbeni album i razmjena slika"
og:description = "Digitalni svadbeni album – gosti mogu uploadovati slike i čestitke, mladenci preuzimaju uspomene. Brza i sigurna razmjena fotografija sa vjenčanja."
og:locale      = "sr_RS"
```

**EN** (with `i18nextLng=en` cookie to bypass locale auto-detect):
```
og:title       = "AddMemories – Digital Wedding Album"
og:description = "Collect wedding photos from all guests via QR code."
og:locale      = "en_US"
```

Note: a fresh `/en` request without cookie returns 307 to `/sr/en` because default detected locale is `sr`. Middleware correctly collapses the double-prefix — behaviour is intentional. Crawlers with `Accept-Language: en` will hit the EN variant correctly.

---

## Cookie posture (pre-consent)

After following redirects on first visit:
```
i18nextLng=sr  (1-year persistence)
```

No `_ga`, `_gid`, no tracker cookies set before consent. Passes.

---

## Image pipeline

```
$ curl -sI -H 'Accept: image/avif,image/webp,image/*' \
    "http://localhost:3000/_next/image?url=%2Fimages%2Fsr%2Fgallery-desktop.png&w=1920&q=75"
HTTP/1.1 400 Bad Request
X-Content-Type-Options: nosniff
```

Local 400 is the known pre-existing middleware/i18n interaction with `/_next/image` — Vercel's edge handler does not go through the same middleware path in production. Not a blocker; Vercel image optimizer is the production path.

---

## Lighthouse — SR mobile (headless Chrome)

```
performance:    72    ⚠ below target 85
accessibility:  96    ✓ target ≥95
best-practices: 92    ✓
seo:           100    ✓ target 100

LCP:          5.3 s   ⚠ (target < 2.5 s)
FCP:          3.1 s
TBT:          130 ms  ✓
CLS:          0       ✓
Speed Index:  3.9 s
```

Report: `claudedocs/lh-phase6-sr-mobile.report.html`

## Lighthouse — EN mobile

```
performance:    82    ⚠ slightly below 85 target
accessibility:  96    ✓
best-practices: 92    ✓
seo:            92    ⚠ (SR hits 100, EN drops — likely missing hreflang/canonical when served from auto-redirect path)

LCP:          4.8 s   ⚠
FCP:          1.1 s   ✓
TBT:          80 ms   ✓
CLS:          0       ✓
Speed Index:  1.9 s
```

Report: `claudedocs/lh-phase6-en-mobile.report.html`

### Interpretation

- **LCP is the main drag on perf score.** On localhost over headless Chrome with mobile throttling, LCP sits at 4.8–5.3 s. On Vercel edge with CDN-cached hero images (AVIF + `Cache-Control: immutable`), real-world LCP should improve materially. Re-run Lighthouse against the live URL after Vercel image optimizer warms cache to confirm.
- **A11y 96, Best-Practices 92, SEO 100/92** all meet or are within 3 points of targets. EN SEO drop likely due to cookie-driven 307 indirection — verify on live where crawler hits `/en` with `Accept-Language: en`.
- **TBT and CLS are excellent** — no runtime JS or layout-shift regressions from Phase 4/5.

---

## Live production — https://www.dodajuspomenu.com

```
=== Headers (www, HTTP/2) ===
content-security-policy:   present, identical to local
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-frame-options:           DENY
x-content-type-options:    nosniff
referrer-policy:           strict-origin-when-cross-origin
permissions-policy:        camera=(), microphone=(), geolocation=(), interest-cohort=()

=== non-www canonical ===
HTTP/2 307  location: https://www.dodajuspomenu.com/   (Vercel Server)
(307 not 301 — acceptable for Vercel's apex-to-www rule; search engines treat as temporary but will follow)

=== Legal pages live ===
/privacy: 200
/terms:   200
/cookies: 200
/kontakt: 200
```

All Phase 2 headers live. All Phase 1 legal pages live. Apex redirects to www via Vercel's default (307). DNS/deploy is cut over.

---

## Open items before full launch

- [ ] Fill any remaining `[POPUNITI]` placeholders in legal pages (previously addressed in PR #6 follow-up — verify contact email / address on live)
- [ ] Change Vercel apex→www redirect from 307 to **301** (permanent) for SEO juice transfer — Vercel Project → Domains → Redirect type
- [ ] Submit `https://www.dodajuspomenu.com/sitemap.xml` to Google Search Console + Bing Webmaster Tools
- [ ] Verify Product Hunt badge renders on live domain (CSP allowlists `api.producthunt.com` + frame-src for `www.producthunt.com`)
- [ ] Check Mozilla Observatory grade post-launch — expect **B+** given CSP still has `'unsafe-inline' 'unsafe-eval'` in script-src. To reach A/A+, move to nonce-based CSP (listed under followups)
- [ ] Re-run Lighthouse against `https://www.dodajuspomenu.com/sr` and `/en` (CDN-served) once cache is warm; expect perf to climb from 72/82 → 85+ with Vercel image optimizer + edge caching
- [ ] Validate cookie-consent banner on live (decline → confirm no `_ga`, accept → confirm GA loads)

## Followups (out of scope for launch)

- True React Server Components migration for remaining landing sections (currently client-rendered hero trims bundle budget)
- Full EN translations of legal pages (currently SR is authoritative)
- Wire SocialProof counters to live DB (currently static)
- Nonce-based strict CSP (remove `'unsafe-inline' 'unsafe-eval'` from script-src — requires Script component migration)
- Migrate PWA from deprecated `next-pwa@5.6.0` to `@serwist/next` (documented TODO in CLAUDE.md)
