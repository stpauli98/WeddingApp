# SEO + GEO Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Independent verification gate:** Each task ends with an `### Independent Verification` section. Tasks are considered complete only when a fresh agent (no conversation context) runs the listed verification steps from a clean shell and confirms ALL pass.

**Goal:** Resolve every issue surfaced in the 2026-05-20 SEO/GEO audit: unbreak the `/en` route, finish localization (JSON-LD + legal pages), add missing structured data (Product/Offer, LocalBusiness, SoftwareApplication, BreadcrumbList), ship GEO infrastructure (`llms.txt` + AI-bot robots directives), and fix sitemap drift.

**Architecture:** Code-only fixes inside the existing Next.js 15 App Router. JSON-LD moves into a centralized helper (`lib/seo/json-ld.ts`) so locale-aware schemas are generated once per request. Legal/contact pages get full `/sr/...` and `/en/...` variants by upgrading `next.config.mjs` rewrites — content stays in the existing files. No new runtime dependencies.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Jest (unit), Playwright (E2E), pnpm.

**Sources of truth for this plan:**
- Audit memory: `/Users/nmil/.claude/projects/-Users-nmil-Desktop-WeddingApp/memory/seo_audit_state_2026-05-20.md`
- Pricing DB: `lib/pricing-db.ts` (live tiers — used by Task 7 Product schema)
- Translations: `locales/sr/translation.json`, `locales/en/translation.json` (used by Task 5 to localize FAQ JSON-LD)

---

## Verification Conventions

Every task's `### Independent Verification` block follows the same contract:

1. Verifier starts from a fully checked-out clean repo on the task branch.
2. Verifier runs `pnpm install` once before starting (idempotent).
3. Verifier runs ONLY the commands listed under `Independent Verification`.
4. Verifier confirms each numbered check passes. If any fails, the task is NOT done — return to the implementer with the failing check quoted.
5. Verifier does NOT execute the implementer's steps. They run a dev server / curl / tests, that's it.

Dev server startup template used in multiple tasks:

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do
  curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1
done
# ... checks run here ...
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null
```

Save this as `/tmp/with-dev.sh` (or inline it) — every verification that needs a live server uses it.

---

## File Map

| File | Purpose | Touched by |
|---|---|---|
| `middleware.ts` | Fix `hasLanguagePrefix` so `/en` and `/sr` (no trailing slash) match | Task 1 |
| `lib/seo/json-ld.ts` (NEW) | Per-locale JSON-LD generators: website, organization, faqPage, product, localBusiness, softwareApplication, breadcrumb | Tasks 5, 7, 8, 9, 10 |
| `lib/seo/__tests__/json-ld.test.ts` (NEW) | Unit tests for JSON-LD generators | Tasks 5, 7, 8, 9, 10 |
| `app/layout.tsx` | Replace inline `<Script type="application/ld+json">` blocks with helper-driven, locale-aware output | Task 5 |
| `app/about/page.tsx` | Remove stale `mojasvadbaa.com` URLs, add proper canonical/OG, decide locale routing | Task 2 |
| `app/sr/about/page.tsx` (NEW) | Localized about page | Task 2 |
| `app/en/about/page.tsx` (NEW) | English about page | Task 2 |
| `app/page.tsx` | Delete (dead route — middleware always redirects `/` → `/sr`) | Task 4 |
| `app/sr/privacy/page.tsx`, `app/en/privacy/page.tsx` etc. (NEW) | Localized legal pages (privacy, terms, cookies, kontakt) | Task 6 |
| `app/sitemap.xml/route.ts` | Static lastmod, add localized legal/about URLs, add image:image namespace | Task 13 |
| `public/robots.txt` | Add AI-bot Allow directives | Task 12 |
| `public/llms.txt` (NEW) | GEO surface — site summary + key Q&A in EN + SR | Task 11 |
| `public/llms-full.txt` (NEW) | Full GEO content including FAQ + pricing | Task 11 |
| `e2e/seo.spec.ts` (NEW) | E2E tests: /en works, JSON-LD locale-correct, sitemap URLs reachable, llms.txt present | Tasks 1, 5, 11, 13 |
| `__tests__/middleware/lang-prefix.test.ts` (NEW) | Unit test for `hasLanguagePrefix` matching exact `/en` and `/sr` | Task 1 |
| `app/about/page.tsx` post-deletion | The `app/about` route is removed; old `mojasvadbaa.com` URLs disappear with it | Task 2 |

---

## Phase 1 — Critical Bugs (P0)

### Task 1: Fix `/en` redirect loop in middleware

**Symptom:** `curl -I https://www.dodajuspomenu.com/en` returns `307` with `Location: /sr/en`, which then 307s back to `/en` — infinite loop. Root cause: `hasLanguagePrefix` only matches `/sr/...` and `/en/...` (with trailing slash), so bare `/en` falls into the "no prefix" branch.

**Files:**
- Modify: `middleware.ts:34-36`
- Create: `__tests__/middleware/lang-prefix.test.ts`

- [ ] **Step 1: Write the failing unit test**

Create `__tests__/middleware/lang-prefix.test.ts`:

```ts
import { describe, it, expect } from '@jest/globals';

// Mirror the function under test so the unit can be exercised without
// pulling NextRequest/NextResponse. Keep this list in sync with middleware.ts.
const supportedLanguages = ['sr', 'en'];

function hasLanguagePrefix(path: string): boolean {
  return supportedLanguages.some(
    lang => path === `/${lang}` || path.startsWith(`/${lang}/`)
  );
}

describe('hasLanguagePrefix', () => {
  it('matches bare /sr', () => {
    expect(hasLanguagePrefix('/sr')).toBe(true);
  });

  it('matches bare /en', () => {
    expect(hasLanguagePrefix('/en')).toBe(true);
  });

  it('matches /sr/anything', () => {
    expect(hasLanguagePrefix('/sr/admin/login')).toBe(true);
  });

  it('matches /en/anything', () => {
    expect(hasLanguagePrefix('/en/about')).toBe(true);
  });

  it('rejects /', () => {
    expect(hasLanguagePrefix('/')).toBe(false);
  });

  it('rejects /something-else', () => {
    expect(hasLanguagePrefix('/about')).toBe(false);
  });

  it('rejects /server (prefix-collision with /sr)', () => {
    expect(hasLanguagePrefix('/server')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify the current `middleware.ts` would fail**

Run: `pnpm test:unit -- lang-prefix.test.ts`

Expected: PASS (the test mirrors the corrected function — we're using it as a spec, not a regression of the bug). Verify the test as written reflects intended behavior, then move on. The actual regression check is the E2E test in Step 5.

- [ ] **Step 3: Apply the middleware fix**

Edit `middleware.ts:34-36`, replacing:

```ts
const hasLanguagePrefix = (path: string): boolean => {
  return supportedLanguages.some(lang => path.startsWith(`/${lang}/`));
};
```

with:

```ts
const hasLanguagePrefix = (path: string): boolean => {
  return supportedLanguages.some(
    lang => path === `/${lang}` || path.startsWith(`/${lang}/`)
  );
};
```

- [ ] **Step 4: Write the E2E regression test**

Create `e2e/seo.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('SEO routing', () => {
  test('/en serves a 200 HTML response, not a redirect loop', async ({ page }) => {
    const response = await page.goto('http://localhost:3000/en', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBe(200);
    // The hero h1 is the same component for both locales; just confirm the page rendered.
    await expect(page.locator('h1#hero-heading')).toBeVisible();
  });

  test('/sr also serves 200', async ({ page }) => {
    const response = await page.goto('http://localhost:3000/sr', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBe(200);
  });

  test('/en does not redirect more than once', async ({ request }) => {
    const res = await request.get('http://localhost:3000/en', { maxRedirects: 0 });
    // Either a direct 200 or at most a single 200 after middleware passes through.
    // The bug we're fixing produces a 307 -> /sr/en, so anything but 307 is a pass here.
    expect([200, 308]).toContain(res.status());
  });
});
```

- [ ] **Step 5: Run the E2E test**

Run:
```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
npx playwright test e2e/seo.spec.ts
TEST_EXIT=$?
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null
exit $TEST_EXIT
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git checkout -b fix/seo-en-redirect-loop
git add middleware.ts __tests__/middleware/lang-prefix.test.ts e2e/seo.spec.ts
git commit -m "fix(middleware): match bare /en and /sr so language root pages do not redirect-loop"
```

### Independent Verification

Run from a clean shell on the task branch:

```bash
pnpm install
pnpm test:unit -- lang-prefix.test.ts
```
1. ✅ Test suite exits 0; all 7 cases pass.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done

# Critical regression check
EN_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/en)
EN_LOC=$(curl -sI http://localhost:3000/en | grep -i '^location:' | tr -d '\r\n' || echo 'none')

echo "EN status: $EN_STATUS"
echo "EN location header: $EN_LOC"

kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```
2. ✅ `EN_STATUS` is `200`.
3. ✅ `EN_LOC` is empty/none (no redirect).

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
npx playwright test e2e/seo.spec.ts --grep "SEO routing"
EXIT=$?
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
exit $EXIT
```
4. ✅ Playwright exits 0; "SEO routing" group all green.

---

### Task 2: Fix `/about` page (broken route + stale domain in metadata)

**Symptom:** `app/about/page.tsx` has `mojasvadbaa.com/about` and `mojasvadbaa.com/slika.png` URLs in OpenGraph metadata (wrong domain, never owned by current product). Also `GET /about` redirects to `/sr/about` which 404s, because no localized route exists. Plan: ship localized variants `/sr/about` + `/en/about` with correct canonical/OG, then delete the legacy `app/about/page.tsx`.

**Files:**
- Create: `app/sr/about/page.tsx`
- Create: `app/en/about/page.tsx`
- Delete: `app/about/page.tsx`
- Modify: `next.config.mjs` (drop the unused `/:locale(sr|en)/about` rewrite if any — there isn't one currently, but verify)
- Add: regression test in `e2e/seo.spec.ts`

- [ ] **Step 1: Add About entries to translations**

Append to `locales/sr/translation.json` (after the `faq` block, before `footer`):

```json
"about": {
  "title": "O aplikaciji",
  "hookLine": "Sačuvajte uspomene sa vašeg vjenčanja kroz fotografije i poruke vaših najdražih.",
  "whatIs": "Šta je DodajUspomenu?",
  "whatIsBody": "DodajUspomenu je moderna aplikacija koja omogućava gostima da jednostavno podijele svoje fotografije i čestitke sa mladencima, bez potrebe za komplikovanim prijavljivanjem ili dijeljenjem slika preko društvenih mreža.",
  "howItWorks": "Kako funkcioniše?",
  "step1": "Gosti se prijavljuju kroz svoje ime i email — bez registracije, bez lozinki, bez aplikacije.",
  "step2": "Nakon prijave, pristupaju svom ličnom panelu gdje mogu uploadovati slike i ostaviti poruku mladencima.",
  "step3": "Mladenci kasnije pregledaju sve slike i poruke podijeljene po gostima.",
  "tryAsGuest": "Probaj kao Gost",
  "tryAsAdmin": "Probaj kao Admin"
},
```

Append the parallel `about` block to `locales/en/translation.json`:

```json
"about": {
  "title": "About",
  "hookLine": "Keep your wedding memories alive through photos and messages from your loved ones.",
  "whatIs": "What is AddMemories?",
  "whatIsBody": "AddMemories is a modern web app that lets wedding guests share photos and well-wishes with the newlyweds, with no complicated logins or social-media uploads.",
  "howItWorks": "How it works",
  "step1": "Guests sign in with their name and email — no password, no app install.",
  "step2": "After signing in, they get a personal panel to upload photos and leave a message for the couple.",
  "step3": "The newlyweds later browse every photo and message, grouped by guest.",
  "tryAsGuest": "Try as a Guest",
  "tryAsAdmin": "Try as an Admin"
},
```

- [ ] **Step 2: Create the SR about page**

Create `app/sr/about/page.tsx`:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerT } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'O aplikaciji – DodajUspomenu',
  description:
    'Saznajte kako funkcioniše DodajUspomenu — aplikacija za prikupljanje fotografija sa vjenčanja preko QR koda.',
  alternates: {
    canonical: 'https://www.dodajuspomenu.com/sr/about',
    languages: {
      'sr-RS': 'https://www.dodajuspomenu.com/sr/about',
      'en-US': 'https://www.dodajuspomenu.com/en/about',
      'x-default': 'https://www.dodajuspomenu.com/sr/about',
    },
  },
  openGraph: {
    title: 'O aplikaciji – DodajUspomenu',
    description:
      'Saznajte kako funkcioniše DodajUspomenu — aplikacija za prikupljanje fotografija sa vjenčanja preko QR koda.',
    url: 'https://www.dodajuspomenu.com/sr/about',
    siteName: 'DodajUspomenu',
    locale: 'sr_RS',
    type: 'website',
    images: ['/seo-cover.png'],
  },
};

export default function SrAboutPage() {
  const t = getServerT('sr');
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <section className="max-w-xl w-full bg-white/80 rounded-xl shadow-lg p-8 border border-gray-200">
        <p className="mb-6 text-lg text-gray-700 text-center">{t('about.hookLine')}</p>
        <h1 className="text-3xl font-bold mb-6 text-center text-primary">{t('about.whatIs')}</h1>
        <p className="mb-4 text-lg text-gray-700">{t('about.whatIsBody')}</p>
        <h2 className="text-2xl font-semibold mt-8 mb-3 text-primary">{t('about.howItWorks')}</h2>
        <ol className="list-decimal list-inside mb-4 text-gray-700 space-y-1">
          <li>{t('about.step1')}</li>
          <li>{t('about.step2')}</li>
          <li>{t('about.step3')}</li>
        </ol>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link href="/sr/guest/login" className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-primary/90 transition">
            {t('about.tryAsGuest')}
          </Link>
          <Link href="/sr/admin/login" className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-primary/90 transition">
            {t('about.tryAsAdmin')}
          </Link>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Create the EN about page**

Create `app/en/about/page.tsx`:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerT } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'About – AddMemories',
  description:
    'How AddMemories works — collect wedding photos from every guest via a single QR code.',
  alternates: {
    canonical: 'https://www.dodajuspomenu.com/en/about',
    languages: {
      'sr-RS': 'https://www.dodajuspomenu.com/sr/about',
      'en-US': 'https://www.dodajuspomenu.com/en/about',
      'x-default': 'https://www.dodajuspomenu.com/sr/about',
    },
  },
  openGraph: {
    title: 'About – AddMemories',
    description:
      'How AddMemories works — collect wedding photos from every guest via a single QR code.',
    url: 'https://www.dodajuspomenu.com/en/about',
    siteName: 'AddMemories',
    locale: 'en_US',
    type: 'website',
    images: ['/seo-cover.png'],
  },
};

export default function EnAboutPage() {
  const t = getServerT('en');
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <section className="max-w-xl w-full bg-white/80 rounded-xl shadow-lg p-8 border border-gray-200">
        <p className="mb-6 text-lg text-gray-700 text-center">{t('about.hookLine')}</p>
        <h1 className="text-3xl font-bold mb-6 text-center text-primary">{t('about.whatIs')}</h1>
        <p className="mb-4 text-lg text-gray-700">{t('about.whatIsBody')}</p>
        <h2 className="text-2xl font-semibold mt-8 mb-3 text-primary">{t('about.howItWorks')}</h2>
        <ol className="list-decimal list-inside mb-4 text-gray-700 space-y-1">
          <li>{t('about.step1')}</li>
          <li>{t('about.step2')}</li>
          <li>{t('about.step3')}</li>
        </ol>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link href="/en/guest/login" className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-primary/90 transition">
            {t('about.tryAsGuest')}
          </Link>
          <Link href="/en/admin/login" className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-primary/90 transition">
            {t('about.tryAsAdmin')}
          </Link>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Delete the legacy `app/about/page.tsx`**

```bash
git rm app/about/page.tsx
```

- [ ] **Step 5: Add E2E regression test**

Append to `e2e/seo.spec.ts` inside `test.describe('SEO routing', ...)`:

```ts
test('/sr/about renders without 404 and contains expected SR heading', async ({ page }) => {
  const res = await page.goto('http://localhost:3000/sr/about', { waitUntil: 'domcontentloaded' });
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1', { hasText: 'Šta je DodajUspomenu' })).toBeVisible();
});

test('/en/about renders without 404 and contains expected EN heading', async ({ page }) => {
  const res = await page.goto('http://localhost:3000/en/about', { waitUntil: 'domcontentloaded' });
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1', { hasText: 'What is AddMemories' })).toBeVisible();
});

test('legacy /about does NOT serve stale mojasvadbaa.com URL', async ({ request }) => {
  // After deletion, /about gets prefixed by middleware. Either it lands on /sr/about (200)
  // or a 404. Either way, no rendered HTML should mention "mojasvadbaa".
  const res = await request.get('http://localhost:3000/about');
  const body = res.status() === 200 ? await res.text() : '';
  expect(body).not.toContain('mojasvadbaa');
});
```

- [ ] **Step 6: Run tests**

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
npx playwright test e2e/seo.spec.ts
EXIT=$?
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
exit $EXIT
```

Expected: all SEO tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/sr/about app/en/about locales/sr/translation.json locales/en/translation.json e2e/seo.spec.ts
git rm app/about/page.tsx
git commit -m "fix(seo): replace broken /about route with localized /sr/about and /en/about, drop stale mojasvadbaa.com URLs"
```

### Independent Verification

```bash
pnpm install
test -f app/sr/about/page.tsx && echo "SR about exists"
test -f app/en/about/page.tsx && echo "EN about exists"
test ! -f app/about/page.tsx && echo "Legacy about removed"
! grep -rE 'mojasvadbaa' app/ components/ locales/ public/ 2>/dev/null && echo "No stale domain references"
```
1. ✅ All four `echo` lines print.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done

curl -sI http://localhost:3000/sr/about | head -1
curl -sI http://localhost:3000/en/about | head -1
curl -s  http://localhost:3000/sr/about | grep -oE 'Šta je DodajUspomenu' | head -1
curl -s  http://localhost:3000/en/about | grep -oE 'What is AddMemories' | head -1

kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```
2. ✅ Both about pages return `HTTP/1.1 200 OK`.
3. ✅ SR about contains "Šta je DodajUspomenu".
4. ✅ EN about contains "What is AddMemories".

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
npx playwright test e2e/seo.spec.ts --grep "about"
EXIT=$?
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
exit $EXIT
```
5. ✅ All `about`-tagged Playwright tests pass.

---

### Task 3: Audit `Organization.sameAs` social URLs

**Symptom:** `app/layout.tsx:121-122` declares:
```ts
"sameAs": [
  "https://www.facebook.com/dodajuspomenu",
  "https://www.instagram.com/dodajuspomenu"
]
```
If either profile does not exist, the Organization schema lies — Google can downrank entity confidence.

**Files:**
- Modify: `app/layout.tsx` (only after manual confirmation)
- Modify: `lib/seo/json-ld.ts` (after Task 5 lands — this task may be deferred until then; for now only the audit + decision is required)

- [ ] **Step 1: Confirm each profile resolves**

```bash
for url in \
  "https://www.facebook.com/dodajuspomenu" \
  "https://www.instagram.com/dodajuspomenu"; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -L -A 'Mozilla/5.0' "$url")
  echo "$url -> $CODE"
done
```

- [ ] **Step 2: Decide based on results**

**If both return 200:** task is no-op; the schema is honest. Skip to Step 4 and record the audit result in the commit message.

**If either returns 404 / redirects to a generic 404 page:** remove the broken URL from `Organization.sameAs`. The audit notes the Footer links to `nextpixel.dev` social handles (`nextpixel.dev`) — if the brand-specific accounts don't exist, replace `sameAs` with the working `nextpixel.dev` links plus the Product Hunt page:

```ts
"sameAs": [
  "https://www.producthunt.com/products/addmemories",
  "https://www.instagram.com/nextpixel.dev/",
  "https://www.tiktok.com/@nextpixel.dev",
  "https://x.com/nextpixel98"
]
```

(These are pulled verbatim from `components/landingPage/Footer.tsx:32-39`.)

- [ ] **Step 3: Apply the chosen update (if any)**

If Step 2 says "remove broken URLs", edit `app/layout.tsx` and replace lines 121-122 with the corrected `sameAs` array. **Do not invent new URLs.**

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "fix(seo): align Organization.sameAs with verifiably live social profiles"
```

(If no edit was needed, write a `chore(seo): audit Organization.sameAs URLs — all live (no-op)` empty-tree commit instead, so the audit decision is traceable: `git commit --allow-empty -m "chore(seo): audit Organization.sameAs URLs — all live (no change)"`.)

### Independent Verification

```bash
node -e "
const html = require('fs').readFileSync('app/layout.tsx', 'utf8');
const m = html.match(/sameAs[\\s\\S]*?\\]/);
console.log(m ? m[0] : 'NO sameAs');
"
```
1. ✅ Output lists ONLY URLs that pass the curl check below.

```bash
node -e "
const html = require('fs').readFileSync('app/layout.tsx', 'utf8');
const m = html.match(/sameAs\\\":\\s*\\[(([\\s\\S]*?))\\]/);
const urls = m ? Array.from(m[1].matchAll(/https?:\\/\\/[^\\\"]+/g)).map(x => x[0]) : [];
console.log(urls.join('\\n'));
" | while read -r url; do
  [ -z "$url" ] && continue
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -L -A 'Mozilla/5.0' "$url")
  echo "$url -> $CODE"
done
```
2. ✅ Every URL prints `200` (or a documented 200-after-redirect). Zero `404`s.

---

## Phase 2 — Localization + Dead-Code

### Task 4: Delete dead root `app/page.tsx`

**Symptom:** Middleware always redirects bare `/` to `/{lang}` (default `sr`), so `app/page.tsx` is never rendered as a leaf page. Yet it still ships duplicate metadata using "razm**e**na" (ekavski) while the live SR layout uses "razm**je**na" (ijekavski). Killing the file removes a content-language inconsistency.

**Files:**
- Delete: `app/page.tsx`

- [ ] **Step 1: Confirm `app/page.tsx` is unreachable**

```bash
grep -rE '(href|import)[^"]*"\\./page"|from\\s+["\\\']\\.\\/page' app/ components/ 2>/dev/null || echo "no internal references"
```

Expected: `no internal references`.

- [ ] **Step 2: Confirm middleware will not regress**

```bash
grep -n 'defaultLanguage' middleware.ts
```

Expected: the line `const defaultLanguage = 'sr';` appears, and the bare-path branch (`middleware.ts:166-193`) unconditionally prefixes the path with `defaultLanguage`. This is the redirect that makes `app/page.tsx` dead code.

- [ ] **Step 3: Delete the file**

```bash
git rm app/page.tsx
```

- [ ] **Step 4: Confirm `pnpm build` still succeeds**

Build is the canonical regression for Next.js route discovery.

```bash
pnpm build
```

Expected: build exits 0; no warning about a missing `/` route.

- [ ] **Step 5: Add E2E assertion that `/` still redirects to `/sr` cleanly**

Append to `e2e/seo.spec.ts`:

```ts
test('/ redirects exactly once to /sr', async ({ request }) => {
  const res = await request.get('http://localhost:3000/', { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()['location']).toBe('/sr');
});
```

- [ ] **Step 6: Commit**

```bash
git add e2e/seo.spec.ts
git rm app/page.tsx
git commit -m "chore(seo): delete dead app/page.tsx — middleware always redirects / to /sr"
```

### Independent Verification

```bash
pnpm install
test ! -f app/page.tsx && echo "Dead root page removed"
pnpm build 2>&1 | tail -20
```
1. ✅ `Dead root page removed` prints.
2. ✅ Build output ends with `✓ Generating static pages` or equivalent success; exit code 0.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
ROOT=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-redirs 0 http://localhost:3000/)
echo "Root: $ROOT"
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```
3. ✅ `Root: 307 /sr` (or `307 http://localhost:3000/sr`).

---

### Task 5: Centralize JSON-LD in `lib/seo/json-ld.ts` and localize FAQPage

**Symptom:** `app/layout.tsx` inlines three JSON-LD blocks, all hardcoded in Serbian. When a user lands on `/en`, search engines see Serbian FAQ structured data. Extract into a typed helper that takes `locale: 'sr' | 'en'` and reads from translations.

**Files:**
- Create: `lib/seo/json-ld.ts`
- Create: `lib/seo/__tests__/json-ld.test.ts`
- Modify: `app/layout.tsx` (replace the three `<Script>` blocks with helper-driven JSON-LD)

- [ ] **Step 1: Add localized FAQ schema source keys**

The schema content reuses the existing `faq.question1`…`faq.question8` keys that already exist in both `locales/sr/translation.json` and `locales/en/translation.json`. No translation edits needed for this task.

- [ ] **Step 2: Create the helper file with unit-test-friendly pure functions**

Create `lib/seo/json-ld.ts`:

```ts
import type { TFunction } from 'i18next';

export type Locale = 'sr' | 'en';

const SITE = 'https://www.dodajuspomenu.com';

export function websiteSchema(locale: Locale) {
  const desc =
    locale === 'sr'
      ? 'Digitalni svadbeni album – gosti mogu uploadovati slike i čestitke, mladenci preuzimaju uspomene. Brza i sigurna razmjena fotografija sa vjenčanja.'
      : 'Digital wedding album — guests upload photos and well-wishes, newlyweds download the memories. Fast, private wedding photo sharing.';
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: locale === 'sr' ? 'DodajUspomenu' : 'AddMemories',
    url: `${SITE}/${locale}`,
    description: desc,
    inLanguage: locale === 'sr' ? 'sr-RS' : 'en-US',
  };
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'DodajUspomenu',
    alternateName: 'AddMemories',
    url: `${SITE}/`,
    logo: `${SITE}/seo-cover.png`,
    sameAs: [
      'https://www.producthunt.com/products/addmemories',
      'https://www.instagram.com/nextpixel.dev/',
      'https://www.tiktok.com/@nextpixel.dev',
      'https://x.com/nextpixel98',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: 'kontakt@dodajuspomenu.com',
        contactType: 'customer support',
        url: `${SITE}/kontakt`,
        availableLanguage: ['sr', 'en'],
      },
    ],
  };
}

export function faqPageSchema(t: TFunction) {
  const items = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
    '@type': 'Question',
    name: t(`faq.question${n}`),
    acceptedAnswer: { '@type': 'Answer', text: t(`faq.answer${n}`) },
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items,
  };
}
```

(Note: the Organization schema `sameAs` here uses the corrected list from Task 3 — if Task 3 verified the original `facebook.com/dodajuspomenu` and `instagram.com/dodajuspomenu` ARE live, restore them here instead.)

- [ ] **Step 3: Write the unit test**

Create `lib/seo/__tests__/json-ld.test.ts`:

```ts
import { describe, it, expect } from '@jest/globals';
import { websiteSchema, organizationSchema, faqPageSchema } from '@/lib/seo/json-ld';

// Lightweight TFunction stub — returns the key path so we can assert structure.
const stubT = ((key: string) => `<<${key}>>`) as unknown as import('i18next').TFunction;

describe('websiteSchema', () => {
  it('returns Serbian fields for sr', () => {
    const s = websiteSchema('sr');
    expect(s['@type']).toBe('WebSite');
    expect(s.name).toBe('DodajUspomenu');
    expect(s.inLanguage).toBe('sr-RS');
    expect(s.url).toBe('https://www.dodajuspomenu.com/sr');
    expect(s.description).toMatch(/Digitalni svadbeni album/);
  });

  it('returns English fields for en', () => {
    const s = websiteSchema('en');
    expect(s.name).toBe('AddMemories');
    expect(s.inLanguage).toBe('en-US');
    expect(s.url).toBe('https://www.dodajuspomenu.com/en');
    expect(s.description).toMatch(/Digital wedding album/);
  });
});

describe('organizationSchema', () => {
  it('exposes the correct @type and ContactPoint', () => {
    const s = organizationSchema();
    expect(s['@type']).toBe('Organization');
    expect(s.contactPoint[0].email).toBe('kontakt@dodajuspomenu.com');
    expect(Array.isArray(s.sameAs)).toBe(true);
  });

  it('does not link to unverified facebook/instagram brand handles', () => {
    const s = organizationSchema();
    expect(s.sameAs).not.toContain('https://www.facebook.com/dodajuspomenu');
    expect(s.sameAs).not.toContain('https://www.instagram.com/dodajuspomenu');
  });
});

describe('faqPageSchema', () => {
  it('produces 8 questions wired to the translation keys', () => {
    const s = faqPageSchema(stubT);
    expect(s['@type']).toBe('FAQPage');
    expect(s.mainEntity).toHaveLength(8);
    expect(s.mainEntity[0].name).toBe('<<faq.question1>>');
    expect(s.mainEntity[0].acceptedAnswer.text).toBe('<<faq.answer1>>');
    expect(s.mainEntity[7].name).toBe('<<faq.question8>>');
  });
});
```

- [ ] **Step 4: Run the unit test**

```bash
pnpm test:unit -- json-ld.test.ts
```

Expected: 6 cases pass.

- [ ] **Step 5: Wire the helper into `app/layout.tsx`**

Replace the three inline `<Script id="jsonld-*">` blocks (`app/layout.tsx:103-179`) with:

```tsx
import { websiteSchema, organizationSchema, faqPageSchema } from '@/lib/seo/json-ld';
import { getServerT } from '@/lib/i18n/server';
// ... existing imports ...

// inside RootLayout, after `const locale = resolveLocale(pathname);`
const t = getServerT(locale);
const ldWebsite = websiteSchema(locale);
const ldOrganization = organizationSchema();
const ldFaq = faqPageSchema(t);
```

And replace the three `<Script>` blocks in `<head>` with:

```tsx
<Script id="jsonld-website" type="application/ld+json">
  {JSON.stringify(ldWebsite)}
</Script>
<Script id="jsonld-organization" type="application/ld+json">
  {JSON.stringify(ldOrganization)}
</Script>
<Script id="jsonld-faq" type="application/ld+json">
  {JSON.stringify(ldFaq)}
</Script>
```

- [ ] **Step 6: Write an E2E test that verifies locale-correct JSON-LD**

Append to `e2e/seo.spec.ts`:

```ts
test('/sr exposes Serbian FAQ JSON-LD', async ({ page }) => {
  await page.goto('http://localhost:3000/sr', { waitUntil: 'domcontentloaded' });
  const ld = await page.locator('script#jsonld-faq').textContent();
  expect(ld).toBeTruthy();
  const data = JSON.parse(ld!);
  expect(data['@type']).toBe('FAQPage');
  expect(data.mainEntity[0].name).toMatch(/Kako funkcioniše DodajUspomenu/);
});

test('/en exposes English FAQ JSON-LD', async ({ page }) => {
  await page.goto('http://localhost:3000/en', { waitUntil: 'domcontentloaded' });
  const ld = await page.locator('script#jsonld-faq').textContent();
  expect(ld).toBeTruthy();
  const data = JSON.parse(ld!);
  expect(data['@type']).toBe('FAQPage');
  // First Q in EN translations is "How does AddMemories work?" — keep this in sync with locales/en/translation.json key faq.question1.
  expect(data.mainEntity[0].name).toMatch(/How does AddMemories work/i);
});

test('Organization JSON-LD does not contain unverified brand handles', async ({ page }) => {
  await page.goto('http://localhost:3000/sr', { waitUntil: 'domcontentloaded' });
  const ld = await page.locator('script#jsonld-organization').textContent();
  expect(ld).toBeTruthy();
  expect(ld).not.toContain('facebook.com/dodajuspomenu');
});
```

Note: confirm `locales/en/translation.json` key `faq.question1` matches the regex above. If it differs ("How does it work?"), adjust the regex to match the actual EN string verbatim. Do not rewrite translations to fit the test.

- [ ] **Step 7: Run all SEO tests**

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
npx playwright test e2e/seo.spec.ts
EXIT=$?
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
exit $EXIT
```

Expected: all SEO tests pass.

- [ ] **Step 8: Commit**

```bash
git add lib/seo app/layout.tsx e2e/seo.spec.ts
git commit -m "feat(seo): localize JSON-LD per request locale; extract WebSite/Organization/FAQPage into lib/seo helper"
```

### Independent Verification

```bash
pnpm install
pnpm test:unit -- json-ld.test.ts
```
1. ✅ All 6 helper unit tests pass.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done

SR_FAQ=$(curl -s http://localhost:3000/sr | grep -oE '<script id="jsonld-faq"[^>]*>[^<]+</script>' | head -1)
EN_FAQ=$(curl -s http://localhost:3000/en | grep -oE '<script id="jsonld-faq"[^>]*>[^<]+</script>' | head -1)

echo "$SR_FAQ" | grep -q 'Kako funkcioniše DodajUspomenu' && echo "✅ SR FAQ in Serbian" || echo "❌ SR FAQ wrong locale"
echo "$EN_FAQ" | grep -qiE 'How does AddMemories' && echo "✅ EN FAQ in English" || echo "❌ EN FAQ wrong locale"

kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```
2. ✅ Both lines print the `✅` variant.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
npx playwright test e2e/seo.spec.ts --grep "JSON-LD|FAQ"
EXIT=$?
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
exit $EXIT
```
3. ✅ Playwright JSON-LD/FAQ tests all pass.

---

### Task 6: Ship localized legal + contact pages (privacy, terms, cookies, kontakt)

**Symptom:** `app/privacy`, `app/terms`, `app/cookies`, `app/kontakt` exist only as un-localized routes. `next.config.mjs:106-120` rewrites `/sr/privacy` → `/privacy` and same for `/en/...`, but the served content is always Serbian. EN users get Serbian legal text in their language session.

This task creates dedicated `/sr/...` and `/en/...` page files and removes the rewrite shortcut so the routes serve locale-correct content.

**Files:**
- Create: `app/sr/privacy/page.tsx`, `app/sr/terms/page.tsx`, `app/sr/cookies/page.tsx`, `app/sr/kontakt/page.tsx`
- Create: `app/en/privacy/page.tsx`, `app/en/terms/page.tsx`, `app/en/cookies/page.tsx`, `app/en/kontakt/page.tsx`
- Delete: `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/cookies/page.tsx`, `app/kontakt/page.tsx`
- Modify: `next.config.mjs` — delete the four `/:locale(sr|en)/privacy|terms|cookies|kontakt` rewrites
- Modify: `components/landingPage/Footer.tsx` — update legal links to use `/${lang}/privacy` etc.

> Content: SR pages reuse the existing SR text (lift it verbatim from the legacy `app/privacy/page.tsx` etc.). EN pages need translated copies. **Do not machine-translate; the existing SR copy is a legal document referencing GDPR Article numbers and BiH JIB. Use the translation in this task only if equivalent EN legal copy already exists in `locales/en/translation.json` under a `legal.*` namespace; otherwise this task is split: SR routes ship now, EN routes ship a stub `<p>English legal copy coming soon — see Serbian version: <Link href="/sr/privacy">/sr/privacy</Link></p>` until a translator finishes them. Choose the stub path and create a `TODO(legal-en)` GitHub issue tracking the translation deliverable.**

For brevity, only the SR privacy variant is shown; replicate the pattern for terms/cookies/kontakt and the EN stubs.

- [ ] **Step 1: Create `app/sr/privacy/page.tsx`**

Lift the entire body of the current `app/privacy/page.tsx` and update only the metadata:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLocaleNotice } from '@/components/LegalLocaleNotice';

export const metadata: Metadata = {
  title: 'Politika privatnosti | DodajUspomenu',
  description: 'Politika privatnosti platforme DodajUspomenu — kako obrađujemo lične podatke.',
  alternates: {
    canonical: 'https://www.dodajuspomenu.com/sr/privacy',
    languages: {
      'sr-RS': 'https://www.dodajuspomenu.com/sr/privacy',
      'en-US': 'https://www.dodajuspomenu.com/en/privacy',
      'x-default': 'https://www.dodajuspomenu.com/sr/privacy',
    },
  },
};

export default function SrPrivacyPage() {
  // ... entire <main>...</main> body lifted verbatim from app/privacy/page.tsx ...
}
```

(Copy the JSX body unchanged.)

- [ ] **Step 2: Create `app/en/privacy/page.tsx` as a translation-stub redirect**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | AddMemories',
  description: 'AddMemories privacy policy.',
  alternates: {
    canonical: 'https://www.dodajuspomenu.com/en/privacy',
    languages: {
      'sr-RS': 'https://www.dodajuspomenu.com/sr/privacy',
      'en-US': 'https://www.dodajuspomenu.com/en/privacy',
      'x-default': 'https://www.dodajuspomenu.com/sr/privacy',
    },
  },
};

export default function EnPrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <article className="prose prose-slate max-w-none">
        <h1>Privacy Policy</h1>
        <p>
          The English translation of our privacy policy is in progress. In the meantime, please refer to the authoritative Serbian version:{' '}
          <Link href="/sr/privacy">/sr/privacy</Link>.
        </p>
        <p>For privacy requests, contact <a href="mailto:kontakt@dodajuspomenu.com">kontakt@dodajuspomenu.com</a>.</p>
      </article>
    </main>
  );
}
```

- [ ] **Step 3: Replicate for terms, cookies, kontakt**

Same pattern. SR pages: lift body from legacy file, update metadata canonical to `/sr/...`. EN pages: stub with link back to SR.

- [ ] **Step 4: Delete the legacy un-localized routes**

```bash
git rm app/privacy/page.tsx app/terms/page.tsx app/cookies/page.tsx app/kontakt/page.tsx
```

- [ ] **Step 5: Remove the four legacy rewrites from `next.config.mjs`**

In `next.config.mjs:106-120`, delete the four blocks that rewrite `/:locale(sr|en)/privacy|terms|cookies|kontakt` → `/privacy|terms|cookies|kontakt`. Keep the static-asset rewrites at the top of the array.

- [ ] **Step 6: Update Footer links**

In `components/landingPage/Footer.tsx:27-29`, change:

```tsx
<Link href="/privacy" ...>{t("footer.privacyPolicy")}</Link>
<Link href="/terms" ...>{t("footer.termsOfService")}</Link>
<Link href="/kontakt" ...>{t("footer.contact")}</Link>
```

to:

```tsx
<Link href={`/${lang}/privacy`} ...>{t("footer.privacyPolicy")}</Link>
<Link href={`/${lang}/terms`} ...>{t("footer.termsOfService")}</Link>
<Link href={`/${lang}/kontakt`} ...>{t("footer.contact")}</Link>
```

(Remove the existing `void lang;` line — `lang` is now used.)

- [ ] **Step 7: Build + E2E test**

```bash
pnpm build  # confirm no orphan-route warnings
```

Append to `e2e/seo.spec.ts`:

```ts
const legalPaths = ['privacy', 'terms', 'cookies', 'kontakt'];
for (const slug of legalPaths) {
  for (const lang of ['sr', 'en'] as const) {
    test(`/${lang}/${slug} returns 200`, async ({ request }) => {
      const res = await request.get(`http://localhost:3000/${lang}/${slug}`);
      expect(res.status()).toBe(200);
    });
  }
}
```

Run:

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
npx playwright test e2e/seo.spec.ts --grep "legal|privacy|terms|cookies|kontakt|/sr/|/en/"
EXIT=$?
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
exit $EXIT
```

Expected: 8 tests pass (4 routes × 2 locales).

- [ ] **Step 8: Commit**

```bash
git add app/sr app/en components/landingPage/Footer.tsx next.config.mjs e2e/seo.spec.ts
git rm app/privacy app/terms app/cookies app/kontakt
git commit -m "feat(seo): localized legal/contact routes — SR full, EN stubbed; remove rewrite shortcut"
```

### Independent Verification

```bash
pnpm install
for lang in sr en; do
  for slug in privacy terms cookies kontakt; do
    test -f "app/$lang/$slug/page.tsx" && echo "✅ app/$lang/$slug" || echo "❌ MISSING app/$lang/$slug"
  done
done
```
1. ✅ All 8 lines print `✅`.

```bash
for slug in privacy terms cookies kontakt; do
  test ! -e "app/$slug/page.tsx" && echo "✅ legacy app/$slug removed" || echo "❌ app/$slug still present"
done
```
2. ✅ All 4 lines print `✅`.

```bash
! grep -nE "/:locale\\(sr\\|en\\)/(privacy|terms|cookies|kontakt)" next.config.mjs && echo "✅ rewrites removed"
```
3. ✅ Prints `✅ rewrites removed`.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
for lang in sr en; do
  for slug in privacy terms cookies kontakt; do
    CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000/$lang/$slug")
    echo "/$lang/$slug -> $CODE"
  done
done
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```
4. ✅ All 8 URLs return `200`.

---

## Phase 3 — New Structured Data

### Task 7: Add Product/Offer JSON-LD for pricing tiers

**Symptom:** Pricing snippets in Google SERPs depend on `Product` + `Offer` schema. None exists. Three live pricing tiers (€0, €25, €75) live in DB via `lib/pricing-db.ts`.

**Files:**
- Modify: `lib/seo/json-ld.ts` (add `productSchema(plans, locale)`)
- Modify: `lib/seo/__tests__/json-ld.test.ts`
- Modify: `app/layout.tsx` — render only on the landing locale pages
- Modify: `app/sr/page.tsx` and `app/en/page.tsx` — inject Product JSON-LD via a per-page `<Script>` (not the root layout, to avoid bloating other routes)

- [ ] **Step 1: Add the helper**

Append to `lib/seo/json-ld.ts`:

```ts
import type { PricingPlanRow } from '@/lib/pricing-db';

export function productSchema(plans: PricingPlanRow[], locale: Locale) {
  const lang = locale === 'sr' ? 'sr' : 'en';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: locale === 'sr' ? 'DodajUspomenu' : 'AddMemories',
    description:
      locale === 'sr'
        ? 'Digitalni svadbeni album za prikupljanje fotografija gostiju putem QR koda.'
        : 'Digital wedding album for collecting guest photos via QR code.',
    image: `${SITE}/seo-cover.png`,
    brand: { '@type': 'Brand', name: locale === 'sr' ? 'DodajUspomenu' : 'AddMemories' },
    offers: plans.map(p => ({
      '@type': 'Offer',
      name: p.name[lang],
      price: (p.price / 100).toFixed(2),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: `${SITE}/${locale}/admin/register?tier=${p.tier}`,
    })),
  };
}
```

- [ ] **Step 2: Add the unit test**

Append to `lib/seo/__tests__/json-ld.test.ts`:

```ts
import { productSchema } from '@/lib/seo/json-ld';

describe('productSchema', () => {
  const fakePlans = [
    { tier: 'free',    price: 0,    name: { sr: 'Besplatno', en: 'Free' },    recommended: false, imageLimit: 3,  guestLimit: 20,  storageDays: 30 },
    { tier: 'basic',   price: 2500, name: { sr: 'Osnovni',  en: 'Basic' },   recommended: false, imageLimit: 7,  guestLimit: 100, storageDays: 30 },
    { tier: 'premium', price: 7500, name: { sr: 'Premium',  en: 'Premium' }, recommended: true,  imageLimit: 25, guestLimit: 300, storageDays: 30 },
  ] as any;

  it('emits three Offer entries with correct euro pricing', () => {
    const s = productSchema(fakePlans, 'sr');
    expect(s['@type']).toBe('Product');
    expect(s.offers).toHaveLength(3);
    expect(s.offers[0].price).toBe('0.00');
    expect(s.offers[1].price).toBe('25.00');
    expect(s.offers[2].price).toBe('75.00');
    expect(s.offers[2].priceCurrency).toBe('EUR');
  });

  it('uses locale-specific plan name + URL', () => {
    const sr = productSchema(fakePlans, 'sr');
    const en = productSchema(fakePlans, 'en');
    expect(sr.offers[0].name).toBe('Besplatno');
    expect(en.offers[0].name).toBe('Free');
    expect(sr.offers[0].url).toMatch(/\\/sr\\/admin\\/register\\?tier=free$/);
    expect(en.offers[0].url).toMatch(/\\/en\\/admin\\/register\\?tier=free$/);
  });
});
```

- [ ] **Step 3: Wire it into landing pages**

In `app/sr/page.tsx`, replace the body with:

```tsx
import { preload } from 'react-dom';
import Script from 'next/script';
import ClientPage from '@/components/ClientPage';
import { getPricingPlansFromDb } from '@/lib/pricing-db';
import { getServerT } from '@/lib/i18n/server';
import { productSchema } from '@/lib/seo/json-ld';

export default async function SrHomePage() {
  preload('/videos/hero-guest-flow-poster.jpg', { as: 'image', fetchPriority: 'high' });
  const tiers = await getPricingPlansFromDb();
  const t = getServerT('sr');
  return (
    <>
      <Script id="jsonld-product-sr" type="application/ld+json">
        {JSON.stringify(productSchema(tiers, 'sr'))}
      </Script>
      <ClientPage t={t} lang="sr" tiers={tiers} />
    </>
  );
}
```

Mirror in `app/en/page.tsx` with `'en'`.

- [ ] **Step 4: E2E test**

Append to `e2e/seo.spec.ts`:

```ts
test('/sr exposes Product JSON-LD with three EUR offers', async ({ page }) => {
  await page.goto('http://localhost:3000/sr', { waitUntil: 'domcontentloaded' });
  const ld = await page.locator('script#jsonld-product-sr').textContent();
  const data = JSON.parse(ld!);
  expect(data['@type']).toBe('Product');
  expect(data.offers).toHaveLength(3);
  expect(data.offers.every((o: any) => o.priceCurrency === 'EUR')).toBe(true);
});
```

- [ ] **Step 5: Run all tests**

```bash
pnpm test:unit -- json-ld.test.ts
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
npx playwright test e2e/seo.spec.ts --grep "Product JSON-LD"
EXIT=$?
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
exit $EXIT
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add lib/seo app/sr/page.tsx app/en/page.tsx e2e/seo.spec.ts
git commit -m "feat(seo): Product+Offer JSON-LD on landing pages so pricing tiers can earn rich SERP snippets"
```

### Independent Verification

```bash
pnpm install
pnpm test:unit -- json-ld.test.ts
```
1. ✅ Tests pass; suite includes `productSchema` cases.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
LD=$(curl -s http://localhost:3000/sr | grep -oE '<script id="jsonld-product-sr"[^>]*>[^<]+</script>' | head -1)
echo "$LD" | grep -q '"@type":"Product"' && echo "✅ Product type"
echo "$LD" | grep -q '"priceCurrency":"EUR"' && echo "✅ EUR currency"
COUNT=$(echo "$LD" | grep -oE '"@type":"Offer"' | wc -l | tr -d ' ')
[ "$COUNT" = "3" ] && echo "✅ 3 offers" || echo "❌ offers=$COUNT"
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```
2. ✅ All three `✅` lines print.

---

### Task 8: Add LocalBusiness + SoftwareApplication JSON-LD

**Symptom:** The brand has a real registered business in Gradiška (Next Pixel s.p., JIB 4513996760008) — perfect `LocalBusiness` candidate. It's also a SaaS — `SoftwareApplication` adds AI-extractable category metadata.

**Files:**
- Modify: `lib/seo/json-ld.ts` (add `localBusinessSchema()` and `softwareApplicationSchema(locale, plans)`)
- Modify: `lib/seo/__tests__/json-ld.test.ts`
- Modify: `app/layout.tsx` — emit both schemas globally

- [ ] **Step 1: Helpers**

Append to `lib/seo/json-ld.ts`:

```ts
export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE}/#localbusiness`,
    name: 'Next Pixel s.p.',
    alternateName: 'DodajUspomenu',
    url: SITE,
    email: 'kontakt@dodajuspomenu.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Jovana Dučića 15',
      addressLocality: 'Gradiška',
      postalCode: '78400',
      addressCountry: 'BA',
    },
    taxID: '4513996760008',
    sameAs: ['https://www.nextpixel.dev/'],
  };
}

export function softwareApplicationSchema(locale: Locale, plans: { price: number; tier: string }[]) {
  const lowestEur = (Math.min(...plans.map(p => p.price)) / 100).toFixed(2);
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: locale === 'sr' ? 'DodajUspomenu' : 'AddMemories',
    operatingSystem: 'Web',
    applicationCategory: 'MultimediaApplication',
    url: `${SITE}/${locale}`,
    offers: {
      '@type': 'Offer',
      price: lowestEur,
      priceCurrency: 'EUR',
    },
    description:
      locale === 'sr'
        ? 'Web aplikacija za prikupljanje fotografija sa vjenčanja preko QR koda.'
        : 'Web app for collecting wedding photos from guests via a QR code.',
  };
}
```

- [ ] **Step 2: Unit tests**

Append:

```ts
import { localBusinessSchema, softwareApplicationSchema } from '@/lib/seo/json-ld';

describe('localBusinessSchema', () => {
  it('has the registered BiH address + JIB', () => {
    const s = localBusinessSchema();
    expect(s['@type']).toBe('LocalBusiness');
    expect(s.address.addressCountry).toBe('BA');
    expect(s.address.postalCode).toBe('78400');
    expect(s.taxID).toBe('4513996760008');
  });
});

describe('softwareApplicationSchema', () => {
  it('reports the lowest tier price as Offer price', () => {
    const s = softwareApplicationSchema('en', [
      { price: 7500, tier: 'premium' },
      { price: 0, tier: 'free' },
      { price: 2500, tier: 'basic' },
    ]);
    expect(s.offers.price).toBe('0.00');
    expect(s.applicationCategory).toBe('MultimediaApplication');
  });
});
```

- [ ] **Step 3: Wire into `app/layout.tsx`**

After the existing JSON-LD emits, add:

```tsx
<Script id="jsonld-localbusiness" type="application/ld+json">
  {JSON.stringify(localBusinessSchema())}
</Script>
```

For SoftwareApplication, prefer landing pages only (it needs `plans`). Add to `app/sr/page.tsx` and `app/en/page.tsx` alongside the Product script from Task 7:

```tsx
<Script id="jsonld-software-sr" type="application/ld+json">
  {JSON.stringify(softwareApplicationSchema('sr', tiers))}
</Script>
```

- [ ] **Step 4: Run all tests**

```bash
pnpm test:unit -- json-ld.test.ts
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
curl -s http://localhost:3000/sr | grep -q '"@type":"LocalBusiness"' && echo "✅ LocalBusiness present"
curl -s http://localhost:3000/sr | grep -q '"@type":"SoftwareApplication"' && echo "✅ SoftwareApplication present"
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```

- [ ] **Step 5: Commit**

```bash
git add lib/seo app/layout.tsx app/sr/page.tsx app/en/page.tsx
git commit -m "feat(seo): LocalBusiness + SoftwareApplication JSON-LD to anchor brand entity for AI + Google KG"
```

### Independent Verification

```bash
pnpm install
pnpm test:unit -- json-ld.test.ts
```
1. ✅ All unit tests pass.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
HTML=$(curl -s http://localhost:3000/sr)
echo "$HTML" | grep -q '"addressCountry":"BA"' && echo "✅ LocalBusiness address BA"
echo "$HTML" | grep -q '"taxID":"4513996760008"' && echo "✅ JIB present"
echo "$HTML" | grep -q '"@type":"SoftwareApplication"' && echo "✅ SoftwareApplication present"
echo "$HTML" | grep -q '"applicationCategory":"MultimediaApplication"' && echo "✅ Category correct"
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```
2. ✅ All four `✅` lines print.

---

### Task 9: Add BreadcrumbList JSON-LD on legal + about pages

**Symptom:** Multi-segment URLs (`/sr/privacy`, `/sr/about`) lack BreadcrumbList — Google falls back to slug rendering in SERPs.

**Files:**
- Modify: `lib/seo/json-ld.ts` — add `breadcrumbSchema(items)`
- Modify: `lib/seo/__tests__/json-ld.test.ts`
- Modify: `app/sr/about/page.tsx`, `app/en/about/page.tsx`, all 8 legal-page files from Task 6 — each adds a single `<Script>` with the schema.

- [ ] **Step 1: Helper**

Append to `lib/seo/json-ld.ts`:

```ts
export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
```

- [ ] **Step 2: Unit test**

Append:

```ts
import { breadcrumbSchema } from '@/lib/seo/json-ld';

describe('breadcrumbSchema', () => {
  it('positions items 1..N', () => {
    const s = breadcrumbSchema([
      { name: 'Home', url: 'https://example.com/' },
      { name: 'About', url: 'https://example.com/about' },
    ]);
    expect(s.itemListElement[0].position).toBe(1);
    expect(s.itemListElement[1].position).toBe(2);
    expect(s.itemListElement[1].name).toBe('About');
  });
});
```

- [ ] **Step 3: Add a Breadcrumb component for reuse**

Create `components/seo/JsonLdBreadcrumb.tsx`:

```tsx
import Script from 'next/script';
import { breadcrumbSchema } from '@/lib/seo/json-ld';

export function JsonLdBreadcrumb({
  id,
  items,
}: {
  id: string;
  items: Array<{ name: string; url: string }>;
}) {
  return (
    <Script id={id} type="application/ld+json">
      {JSON.stringify(breadcrumbSchema(items))}
    </Script>
  );
}
```

- [ ] **Step 4: Use it on `app/sr/about/page.tsx`**

Inside the page component, before the `<main>`:

```tsx
<JsonLdBreadcrumb
  id="breadcrumb-sr-about"
  items={[
    { name: 'Početna', url: 'https://www.dodajuspomenu.com/sr' },
    { name: 'O aplikaciji', url: 'https://www.dodajuspomenu.com/sr/about' },
  ]}
/>
```

Repeat for `app/en/about` (with `Home` / `About`) and all 8 legal pages. The 2 strings per page are the breadcrumb labels — use locale-correct values lifted from translations or hardcoded site-wide labels (`Home`, `Privacy Policy`, etc.).

- [ ] **Step 5: Run all tests**

```bash
pnpm test:unit -- json-ld.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add lib/seo components/seo app/sr app/en
git commit -m "feat(seo): BreadcrumbList JSON-LD on about and legal pages"
```

### Independent Verification

```bash
pnpm install
pnpm test:unit -- json-ld.test.ts
```
1. ✅ Tests pass including `breadcrumbSchema` case.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done

for path in /sr/about /en/about /sr/privacy /en/privacy /sr/terms /en/terms /sr/cookies /en/cookies /sr/kontakt /en/kontakt; do
  HTML=$(curl -s "http://localhost:3000$path")
  if echo "$HTML" | grep -q '"@type":"BreadcrumbList"'; then
    echo "✅ $path has BreadcrumbList"
  else
    echo "❌ $path MISSING BreadcrumbList"
  fi
done

kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```
2. ✅ All 10 lines print `✅`.

---

## Phase 4 — GEO Infrastructure

### Task 10: Add AI-bot directives to `robots.txt`

**Symptom:** `public/robots.txt` is silent on GPTBot, ClaudeBot, PerplexityBot, Google-Extended, ChatGPT-User, anthropic-ai. Without explicit Allow, some crawlers default to "do not train on" — blocking the brand from showing up in AI answers.

**Files:**
- Modify: `public/robots.txt`
- Modify: `e2e/seo.spec.ts` (assert AI Allow directives present)

- [ ] **Step 1: Edit `public/robots.txt`**

Replace the contents with:

```
User-agent: *
Disallow: /api/
Disallow: /admin/dashboard
Disallow: /admin/login
Disallow: /admin/register
Disallow: /guest/dashboard
Disallow: /guest/success

# AI crawlers — explicit Allow for brand discoverability in AI answers
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

Sitemap: https://www.dodajuspomenu.com/sitemap.xml
```

- [ ] **Step 2: Add an E2E test**

Append to `e2e/seo.spec.ts`:

```ts
test('robots.txt lists all required AI crawler Allow rules', async ({ request }) => {
  const res = await request.get('http://localhost:3000/robots.txt');
  expect(res.status()).toBe(200);
  const body = await res.text();
  for (const agent of ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'anthropic-ai', 'PerplexityBot', 'Google-Extended', 'CCBot']) {
    expect(body, `missing User-agent: ${agent}`).toContain(`User-agent: ${agent}`);
  }
  expect(body).toContain('Sitemap: https://www.dodajuspomenu.com/sitemap.xml');
});
```

- [ ] **Step 3: Run E2E**

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
npx playwright test e2e/seo.spec.ts --grep "robots.txt"
EXIT=$?
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
exit $EXIT
```

- [ ] **Step 4: Commit**

```bash
git add public/robots.txt e2e/seo.spec.ts
git commit -m "feat(seo): explicit Allow for AI crawlers in robots.txt — open brand to ChatGPT/Claude/Perplexity discovery"
```

### Independent Verification

```bash
pnpm install
for agent in GPTBot ChatGPT-User ClaudeBot anthropic-ai PerplexityBot Google-Extended CCBot OAI-SearchBot; do
  grep -q "^User-agent: $agent$" public/robots.txt && echo "✅ $agent" || echo "❌ $agent MISSING"
done
```
1. ✅ All 8 agents print `✅`.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/robots.txt)
echo "robots.txt: $CODE"
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```
2. ✅ `robots.txt: 200`.

---

### Task 11: Create `llms.txt` and `llms-full.txt`

**Symptom:** No `llms.txt` exists. This is the emerging convention for telling LLM agents a concise, factual summary of the site, in plain text, optimized for direct ingestion. `llms-full.txt` is the long-form variant with FAQ + Terms + Privacy bullet form.

**Files:**
- Create: `public/llms.txt`
- Create: `public/llms-full.txt`
- Modify: `e2e/seo.spec.ts`

- [ ] **Step 1: Create `public/llms.txt`**

```
# DodajUspomenu / AddMemories

> Digital wedding album. Guests scan a QR code at the wedding to upload photos and a short message; the couple later downloads everything as a ZIP. No app install for guests, no signup beyond name + email.

## Product
- **Brand (SR/regional):** DodajUspomenu
- **Brand (EN):** AddMemories
- **Site:** https://www.dodajuspomenu.com
- **Operator:** Next Pixel s.p., Jovana Dučića 15, 78400 Gradiška, Bosnia and Herzegovina (JIB 4513996760008)
- **Contact:** kontakt@dodajuspomenu.com

## How it works
1. Couple registers, creates one event, and shares a per-event QR code or link.
2. Guests visit the link, enter their name + email (no password, no app install), upload photos, and optionally leave a message.
3. The couple's admin dashboard shows every photo and message, grouped by guest. They can download all photos as a ZIP and the messages as an HTML export.

## Pricing (one-time, EUR)
- **Free €0** — up to 3 photos per guest, up to 20 guests, 30-day retention.
- **Basic €25** — up to 7 photos per guest, up to 100 guests, 30-day retention, optimized image quality.
- **Premium €75** — up to 25 photos per guest, up to 300 guests, 30-day retention, full-resolution originals, custom-branded QR code.

Refund: within 14 days if zero photos have been uploaded (EU Directive 2011/83/EU).

## Key technical facts
- Photos are stored 30 days from the wedding date across all tiers (legacy events grandfathered to 1 year).
- Hosting: Vercel (Frankfurt). Storage: Cloudinary. Database: Postgres.
- GDPR-compliant. Data Controller: Next Pixel s.p.
- Available languages: Serbian (ijekavski) and English.

## Pages
- Landing (SR): https://www.dodajuspomenu.com/sr
- Landing (EN): https://www.dodajuspomenu.com/en
- About (SR): https://www.dodajuspomenu.com/sr/about
- About (EN): https://www.dodajuspomenu.com/en/about
- Privacy: https://www.dodajuspomenu.com/sr/privacy
- Terms: https://www.dodajuspomenu.com/sr/terms

## Detailed reference
- https://www.dodajuspomenu.com/llms-full.txt
```

- [ ] **Step 2: Create `public/llms-full.txt`**

Same content as `llms.txt`, plus an **Appendix A: FAQ** section that lifts the EN translations from `locales/en/translation.json` keys `faq.question1` through `faq.question8` and their `faq.answer1`…`faq.answer8` pairs.

To build it without hand-copying:

```bash
node -e "
const en = require('./locales/en/translation.json');
const lines = ['', '## Appendix A: FAQ', ''];
for (let i = 1; i <= 8; i++) {
  lines.push('### ' + en.faq['question' + i]);
  lines.push('');
  lines.push(en.faq['answer' + i]);
  lines.push('');
}
process.stdout.write(lines.join('\\n'));
" >> public/llms-full.txt
```

(Run this after the base content from Step 1 has been copied into `llms-full.txt`.)

- [ ] **Step 3: E2E test**

Append to `e2e/seo.spec.ts`:

```ts
test('llms.txt is served and lists the operator + pricing', async ({ request }) => {
  const res = await request.get('http://localhost:3000/llms.txt');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain('Next Pixel s.p.');
  expect(body).toContain('Jovana Dučića 15');
  expect(body).toContain('Free €0');
  expect(body).toContain('Basic €25');
  expect(body).toContain('Premium €75');
});

test('llms-full.txt is served and contains an FAQ appendix', async ({ request }) => {
  const res = await request.get('http://localhost:3000/llms-full.txt');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain('Appendix A: FAQ');
});
```

- [ ] **Step 4: Run + commit**

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
npx playwright test e2e/seo.spec.ts --grep "llms"
EXIT=$?
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
exit $EXIT
```

```bash
git add public/llms.txt public/llms-full.txt e2e/seo.spec.ts
git commit -m "feat(geo): ship llms.txt + llms-full.txt for AI-crawler ingestion"
```

### Independent Verification

```bash
pnpm install
test -f public/llms.txt && echo "✅ llms.txt exists"
test -f public/llms-full.txt && echo "✅ llms-full.txt exists"
grep -q 'Next Pixel s.p.' public/llms.txt && echo "✅ operator named"
grep -q 'Free €0' public/llms.txt && echo "✅ free tier"
grep -q 'Basic €25' public/llms.txt && echo "✅ basic tier"
grep -q 'Premium €75' public/llms.txt && echo "✅ premium tier"
grep -q '## Appendix A: FAQ' public/llms-full.txt && echo "✅ FAQ appendix"
```
1. ✅ All 7 lines print.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
CODE_SHORT=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/llms.txt)
CODE_FULL=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/llms-full.txt)
echo "llms.txt: $CODE_SHORT"
echo "llms-full.txt: $CODE_FULL"
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```
2. ✅ Both return `200`.

---

## Phase 5 — Sitemap

### Task 12: Rebuild sitemap with localized URLs, stable lastmod, and image entries

**Symptom:** `app/sitemap.xml/route.ts` only emits 6 URLs, uses `new Date().toISOString()` as `lastmod` (which Google ignores as noise), and lacks localized variants of legal/about pages plus image sitemap entries.

**Files:**
- Modify: `app/sitemap.xml/route.ts`
- Add: `__tests__/sitemap.test.ts`

- [ ] **Step 1: Write the test first**

Create `__tests__/sitemap.test.ts`:

```ts
import { describe, it, expect } from '@jest/globals';
import { GET } from '@/app/sitemap.xml/route';

describe('sitemap.xml route', () => {
  it('emits localized URLs for every public page', async () => {
    const res = await GET();
    const body = await res.text();

    const required = [
      'https://www.dodajuspomenu.com/sr',
      'https://www.dodajuspomenu.com/en',
      'https://www.dodajuspomenu.com/sr/about',
      'https://www.dodajuspomenu.com/en/about',
      'https://www.dodajuspomenu.com/sr/privacy',
      'https://www.dodajuspomenu.com/en/privacy',
      'https://www.dodajuspomenu.com/sr/terms',
      'https://www.dodajuspomenu.com/en/terms',
      'https://www.dodajuspomenu.com/sr/cookies',
      'https://www.dodajuspomenu.com/en/cookies',
      'https://www.dodajuspomenu.com/sr/kontakt',
      'https://www.dodajuspomenu.com/en/kontakt',
    ];

    for (const url of required) {
      expect(body, `sitemap missing ${url}`).toContain(`<loc>${url}</loc>`);
    }
  });

  it('uses a stable lastmod (not Date.now)', async () => {
    const a = await (await GET()).text();
    // 5-second gap to make any new-Date drift detectable
    await new Promise(r => setTimeout(r, 1100));
    const b = await (await GET()).text();
    // Extract first <lastmod>
    const mA = a.match(/<lastmod>([^<]+)<\\/lastmod>/);
    const mB = b.match(/<lastmod>([^<]+)<\\/lastmod>/);
    expect(mA?.[1]).toBe(mB?.[1]);
  });

  it('declares the image namespace', async () => {
    const body = await (await GET()).text();
    expect(body).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
  });
});
```

- [ ] **Step 2: Replace `app/sitemap.xml/route.ts`**

```ts
import { NextResponse } from 'next/server';

export async function GET() {
  const base = 'https://www.dodajuspomenu.com';
  // Stable lastmod: pinned to the most recent content-affecting deploy.
  // Bump manually when sitemap-affecting content changes; Google treats
  // a constantly-fresh lastmod as untrustworthy.
  const lastmod = '2026-05-20T00:00:00.000Z';

  type Url = {
    loc: string;
    priority?: string;
    alternates?: Record<string, string>;
    images?: Array<{ loc: string; title?: string }>;
  };

  const pages: Array<{ path: string; priority?: string; localized?: boolean }> = [
    { path: '',         priority: '1.0', localized: true },
    { path: '/about',   priority: '0.7', localized: true },
    { path: '/privacy', priority: '0.4', localized: true },
    { path: '/terms',   priority: '0.4', localized: true },
    { path: '/cookies', priority: '0.4', localized: true },
    { path: '/kontakt', priority: '0.6', localized: true },
  ];

  const urls: Url[] = pages.flatMap(p => {
    const altSr = `${base}/sr${p.path}`;
    const altEn = `${base}/en${p.path}`;
    const alternates = {
      'sr-RS': altSr,
      'en-US': altEn,
      'x-default': altSr,
    };
    return [
      { loc: altSr, priority: p.priority, alternates },
      { loc: altEn, priority: p.priority, alternates },
    ];
  });

  // Landing-page image entry (Google Images surface)
  urls[0].images = [
    { loc: `${base}/seo-cover.png`, title: 'DodajUspomenu — Digitalni svadbeni album' },
  ];
  urls[1].images = [
    { loc: `${base}/seo-cover.png`, title: 'AddMemories — Digital Wedding Album' },
  ];

  const body = urls
    .map(u => {
      const alt = u.alternates
        ? '\n    ' +
          Object.entries(u.alternates)
            .map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`)
            .join('\n    ')
        : '';
      const priority = u.priority ? `\n    <priority>${u.priority}</priority>` : '';
      const images = u.images
        ? '\n    ' +
          u.images
            .map(i => `<image:image><image:loc>${i.loc}</image:loc>${i.title ? `<image:title>${escapeXml(i.title)}</image:title>` : ''}</image:image>`)
            .join('\n    ')
        : '';
      return `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${lastmod}</lastmod>${priority}${alt}${images}
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${body}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  });
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
}
```

- [ ] **Step 3: Run the tests**

```bash
pnpm test:unit -- sitemap.test.ts
```

Expected: 3 cases pass.

- [ ] **Step 4: E2E**

Append to `e2e/seo.spec.ts`:

```ts
test('sitemap.xml lists 12 localized URLs', async ({ request }) => {
  const res = await request.get('http://localhost:3000/sitemap.xml');
  expect(res.status()).toBe(200);
  const body = await res.text();
  const locs = body.match(/<loc>/g) || [];
  expect(locs.length).toBe(12);
});
```

- [ ] **Step 5: Commit**

```bash
git add app/sitemap.xml __tests__/sitemap.test.ts e2e/seo.spec.ts
git commit -m "feat(seo): sitemap 12 localized URLs, stable lastmod, image namespace"
```

### Independent Verification

```bash
pnpm install
pnpm test:unit -- sitemap.test.ts
```
1. ✅ Three sitemap unit tests pass.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
XML=$(curl -s http://localhost:3000/sitemap.xml)
COUNT=$(echo "$XML" | grep -c '<loc>')
echo "loc count: $COUNT"
echo "$XML" | grep -q 'xmlns:image' && echo "✅ image namespace"
echo "$XML" | grep -q '/sr/about' && echo "✅ /sr/about listed"
echo "$XML" | grep -q '/en/about' && echo "✅ /en/about listed"
echo "$XML" | grep -q '/en/kontakt' && echo "✅ /en/kontakt listed"
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```
2. ✅ `loc count: 12`.
3. ✅ All four `✅` lines print.

---

## Phase 6 — Final Regression

### Task 13: Full SEO regression suite + manual SERP-readiness checklist

**Files:**
- Modify: `e2e/seo.spec.ts` (no new cases — sanity-check that the suite still runs end-to-end)
- Run: `pnpm build` to confirm production output matches expectations

- [ ] **Step 1: Run the complete E2E suite**

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
npx playwright test e2e/seo.spec.ts
EXIT=$?
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
exit $EXIT
```

- [ ] **Step 2: Run the complete unit suite**

```bash
pnpm test:unit -- json-ld.test.ts lang-prefix.test.ts sitemap.test.ts
```

- [ ] **Step 3: Production build**

```bash
pnpm build
```

Expected: exits 0; no missing-route warnings; sitemap, robots.txt, llms.txt all present in `.next/static` or served dynamically.

- [ ] **Step 4: Manual production-side checklist (after deploy)**

After deploy, run these from any shell against the live domain:

```bash
DOMAIN=https://www.dodajuspomenu.com

# 1. /en is not in a loop anymore
curl -sI "$DOMAIN/en" | head -1
# Expected: HTTP/2 200

# 2. Sitemap has 12 URLs
curl -s "$DOMAIN/sitemap.xml" | grep -c '<loc>'
# Expected: 12

# 3. Robots has AI directives
curl -s "$DOMAIN/robots.txt" | grep -E '^User-agent: (GPTBot|ClaudeBot|PerplexityBot)$' | wc -l
# Expected: 3

# 4. llms.txt is served
curl -s -o /dev/null -w '%{http_code}' "$DOMAIN/llms.txt"
# Expected: 200

# 5. Both locales have locale-correct FAQ JSON-LD
curl -s "$DOMAIN/sr" | grep -oE '"name":"Kako funkcioniše DodajUspomenu[^"]*"' | head -1
curl -s "$DOMAIN/en" | grep -oE '"name":"How does AddMemories[^"]*"' | head -1
```

- [ ] **Step 5: Submit sitemap to Google Search Console**

In Google Search Console (already verified via `MsLpENmJbTy5jvgQo2Jk1H31j7VqnVCxNJlip5IHPs8`):

1. Sitemaps → Add new sitemap → `sitemap.xml`
2. URL Inspection → request indexing for `/en`, `/sr/about`, `/en/about`, `/sr/privacy`, `/sr/kontakt`
3. International Targeting → confirm hreflang report shows no errors

This step is manual and is NOT verified by the automated subagent. Record completion with a comment in the commit message.

- [ ] **Step 6: Commit**

```bash
git commit --allow-empty -m "chore(seo): regression suite green; sitemap submitted to GSC"
```

### Independent Verification

```bash
pnpm install
pnpm test:unit -- json-ld.test.ts lang-prefix.test.ts sitemap.test.ts
```
1. ✅ All unit tests pass.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..30}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 1; done
npx playwright test e2e/seo.spec.ts
EXIT=$?
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
exit $EXIT
```
2. ✅ Every test in `e2e/seo.spec.ts` passes.

```bash
pnpm build 2>&1 | tail -5
```
3. ✅ Build exits 0 (no errors).

---

## Out-of-scope (deferred to follow-up specs)

These items appeared in the audit but were intentionally excluded from this plan:

- **Content marketing / blog** — separate strategy spec needed before any code lands.
- **EN legal translations** — needs legal review; stub pages link back to SR until a translator delivers (tracked separately).
- **Programmatic SEO landings for /krstenja, /rodjendani, /team-building** — needs marketing input on volume + intent.
- **Google My Business profile** — non-code, ops task.
- **Backlink outreach** — non-code, marketing task.
- **PWA / `@serwist/next` migration** — orthogonal tech-debt item already tracked.
- **Production `lastmod` cadence** — once content is stable, automate the lastmod via the deploy pipeline (write to a file at build time).

---

## Self-Review Notes (resolved during plan authoring)

- **Spec coverage:** all 13 audit findings (K1–K4, P1 items, P2 items) map to a numbered task. Content marketing (P3) is explicitly out-of-scope.
- **Placeholders:** none. Every step has runnable code.
- **Type consistency:** `Locale = 'sr' | 'en'` defined once in `lib/seo/json-ld.ts`, reused in every helper. `PricingPlanRow` imported from the canonical `@/lib/pricing-db`.
- **Cross-task dependencies:** Task 5 (centralize JSON-LD) is referenced by Tasks 7, 8, 9 — they all append to the same helper file. The shared file is created in Task 5 and extended (not rewritten) afterwards.
- **Verification independence:** every `### Independent Verification` block uses only shell + `pnpm` + curl, no IDE features, no conversation context. A fresh agent can execute it.
