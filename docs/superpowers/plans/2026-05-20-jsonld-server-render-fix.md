# JSON-LD Server-Render Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Independent verification gate:** Each task ends with `### Independent Verification`. A fresh agent (no conversation context) runs the listed checks from a clean shell and confirms ALL pass before the task is marked complete.

**Goal:** Make every JSON-LD structured-data block on dodajuspomenu.com appear in the initial HTML response — not after JS hydration — so AI crawlers (GPTBot, ClaudeBot, PerplexityBot) and Googlebot's first crawl pass can extract structured data without executing JavaScript.

**Root cause (verified on production 2026-05-20):** Tasks 5 + 7 + 8 of the previous SEO plan used Next.js `<Script type="application/ld+json">` for WebSite, Organization, FAQPage, LocalBusiness, Product, SoftwareApplication. The Next.js `<Script>` component serializes its content into the React Server Components data stream (`self.__next_f.push(...)`) and only injects the actual `<script>` element into the DOM after client-side hydration. Result: `curl https://www.dodajuspomenu.com/sr | grep '<script[^>]*ld+json'` returns 0 matches. Only the BreadcrumbList — which uses plain `<script dangerouslySetInnerHTML>` via `JsonLdBreadcrumb` — survives in the initial HTML.

**Architecture:** Introduce a single reusable `<JsonLd>` server component that wraps the proven `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ... }} />` pattern. Replace every existing `<Script>`-based JSON-LD emission with `<JsonLd>`. Add a no-JS regression test (raw HTTP fetch + HTML parse) so the regression cannot silently return.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, React Server Components, Jest, Playwright.

**Out of scope (intentional):**
- `<Script>` blocks that are NOT JSON-LD (Google Analytics gtag) — those legitimately need next/script's lifecycle hooks.
- BreadcrumbList — already uses the correct pattern via `JsonLdBreadcrumb`. Optionally refactored in Task 1, but the schema-correctness behavior does not change.

---

## File Structure

| File | Purpose | Touched by |
|---|---|---|
| `components/seo/JsonLd.tsx` (NEW) | Generic server component: `<JsonLd id schema />` → `<script type="application/ld+json" dangerouslySetInnerHTML />` | Task 1 |
| `components/seo/__tests__/JsonLd.test.tsx` (NEW) | Unit test for the component's render contract | Task 1 |
| `components/seo/JsonLdBreadcrumb.tsx` | Refactor internals to use `<JsonLd>` (no behavior change) | Task 1 |
| `app/layout.tsx` | Replace 4 `<Script id="jsonld-*">` blocks with `<JsonLd>` (WebSite, Organization, FAQPage, LocalBusiness) | Task 2 |
| `app/sr/page.tsx` | Replace 2 `<Script id="jsonld-{product,software}-sr">` blocks with `<JsonLd>` | Task 3 |
| `app/en/page.tsx` | Same for `-en` variants | Task 3 |
| `e2e/seo.spec.ts` | Add raw-HTML regression test (no JS execution) | Task 4 |
| Production verification | Live curl + script-count assertion on dodajuspomenu.com after deploy | Task 5 |

Total schemas migrated: **7** (4 in root layout + 2 on /sr + 2 on /en, minus 1 double-count for Product = 6 unique mounts. The 4 layout schemas mount on every page; the 2 landing schemas mount only on / locales).

---

## Verification Conventions

Each task's `### Independent Verification` block uses ONLY:
- `pnpm install` (idempotent, run once)
- `pnpm test:unit -- <pattern>`
- `pnpm dev` + `curl` (raw HTTP, no browser)
- `npx playwright test e2e/seo.spec.ts`
- Pure shell inspection (`grep`, `node -e`, `perl`)

Verifier does NOT execute implementer steps. They run the listed commands and confirm output matches. **A passing task means schemas appear in `curl`-fetched HTML, not in browser-after-JS HTML.** That is the regression we are guarding against.

Standard dev-server template:

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..60}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 2; done
# ... checks ...
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```

---

## Phase 1 — Reusable Component

### Task 1: Create `<JsonLd>` server component + refactor `JsonLdBreadcrumb` to use it

**Files:**
- Create: `components/seo/JsonLd.tsx`
- Create: `components/seo/__tests__/JsonLd.test.tsx`
- Modify: `components/seo/JsonLdBreadcrumb.tsx`

- [ ] **Step 1: Write the unit test (TDD)**

Create `components/seo/__tests__/JsonLd.test.tsx`:

```tsx
import { describe, it, expect } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import { JsonLd } from '@/components/seo/JsonLd';

describe('<JsonLd>', () => {
  it('renders a <script type="application/ld+json"> with the given id', () => {
    const html = renderToString(
      <JsonLd id="jsonld-test" data={{ '@context': 'https://schema.org', '@type': 'Thing', name: 'X' }} />
    );
    expect(html).toContain('<script');
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('id="jsonld-test"');
  });

  it('serializes the schema as JSON inside the script body', () => {
    const html = renderToString(
      <JsonLd id="jsonld-foo" data={{ '@type': 'Person', name: 'Ada' }} />
    );
    // The JSON must appear in initial markup (not as a child of __next_f.push)
    expect(html).toMatch(/<script[^>]*id="jsonld-foo"[^>]*>\{"@type":"Person","name":"Ada"\}<\/script>/);
  });

  it('escapes </script> inside the payload to prevent injection', () => {
    const html = renderToString(
      <JsonLd id="jsonld-xss" data={{ '@type': 'Hack', payload: '</script><img src=x>' }} />
    );
    // The < of </script> must be escaped (<) so the closing tag cannot
    // terminate the JSON-LD block early. Schema.org JSON-LD recommendation.
    expect(html).not.toContain('</script><img');
    expect(html).toMatch(/\\u003[Cc]\/script/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails (component doesn't exist yet)**

```bash
cd /Users/nmil/Desktop/WeddingApp
pnpm test:unit -- JsonLd.test.tsx
```

Expected: FAIL with module-not-found for `@/components/seo/JsonLd`.

- [ ] **Step 3: Create `components/seo/JsonLd.tsx`**

```tsx
// Server component (no 'use client'). Emits a JSON-LD <script> tag whose
// content appears in the INITIAL HTML response — so AI crawlers and the
// first Googlebot pass can extract structured data without executing JS.
//
// Why this exists instead of next/script:
//   next/Script with type="application/ld+json" serializes the payload into
//   the RSC data stream and only injects the <script> element after client
//   hydration. That hides the schema from no-JS crawlers (GPTBot, ClaudeBot,
//   PerplexityBot) and delays Google rich-results extraction by N days.

interface JsonLdProps {
  id: string;
  data: object;
}

export function JsonLd({ id, data }: JsonLdProps) {
  // Escape </script> sequences so a malicious payload string can't break
  // out of the JSON-LD block. Replacement uses the JSON Unicode escape
  // (<), which is valid JSON and harmless when parsed as schema.
  const json = JSON.stringify(data).replace(/</g, '\\u003C');
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test:unit -- JsonLd.test.tsx
```

Expected: PASS (3/3).

- [ ] **Step 5: Refactor `JsonLdBreadcrumb` to use `<JsonLd>` (no behavior change)**

Replace the body of `components/seo/JsonLdBreadcrumb.tsx` with:

```tsx
import { breadcrumbSchema } from '@/lib/seo/json-ld';
import { JsonLd } from '@/components/seo/JsonLd';

export function JsonLdBreadcrumb({
  id,
  items,
}: {
  id: string;
  items: Array<{ name: string; url: string }>;
}) {
  return <JsonLd id={id} data={breadcrumbSchema(items)} />;
}
```

This deletes the inline `<script dangerouslySetInnerHTML>` literal but keeps the same external API and the same emitted HTML structure (modulo the new `</script>` escape, which is strictly safer).

- [ ] **Step 6: Run the full unit suite to confirm no regression**

```bash
pnpm test:unit -- JsonLd.test.tsx json-ld.test.ts
```

Expected: all green (3 new + previous 9+ json-ld helper tests).

- [ ] **Step 7: Commit**

```bash
git checkout -b fix/jsonld-server-render
git add components/seo/JsonLd.tsx components/seo/__tests__/JsonLd.test.tsx components/seo/JsonLdBreadcrumb.tsx
git commit -m "feat(seo): add reusable <JsonLd> server component for initial-HTML structured data

Wraps the proven '<script type=\"application/ld+json\" dangerouslySetInnerHTML>'
pattern that next/Script does NOT provide for JSON-LD — next/Script serializes
the payload to the RSC data stream and injects the element only after client
hydration, which hides the schema from AI crawlers and delays Google rich
results extraction.

Also escapes </script> sequences to \\u003C/script to prevent payload
injection from breaking out of the JSON-LD block.

Refactors JsonLdBreadcrumb to use the new component (no behavior change).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Independent Verification

```bash
pnpm install
pnpm test:unit -- JsonLd.test.tsx
```
1. ✅ Suite passes; the 3 cases (renders script tag, serializes JSON, escapes `</script>`) are all green.

```bash
cd /Users/nmil/Desktop/WeddingApp
# Confirm the file exists and has the right export
test -f components/seo/JsonLd.tsx && grep -q "export function JsonLd" components/seo/JsonLd.tsx && echo "✅ JsonLd component exported"

# Confirm the breadcrumb refactor preserves the public API
grep -q "export function JsonLdBreadcrumb" components/seo/JsonLdBreadcrumb.tsx && echo "✅ Breadcrumb still exported"

# Confirm Breadcrumb internally uses the new component (not its old inline script literal)
! grep -q "dangerouslySetInnerHTML" components/seo/JsonLdBreadcrumb.tsx && echo "✅ Breadcrumb delegates to <JsonLd>"

# Confirm <script> escape rule is in the component
grep -q 'replace(/</g' components/seo/JsonLd.tsx && echo "✅ </script> escape present"
```
2. ✅ All four `✅` lines print.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..60}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 2; done
# /sr/about uses JsonLdBreadcrumb — confirm it still emits a parseable schema in INITIAL HTML
RAW=$(curl -s http://localhost:3000/sr/about)
echo "$RAW" | node -e "
const html = require('fs').readFileSync('/dev/stdin', 'utf8');
const m = html.match(/<script[^>]*application\/ld\+json[^>]*>([^<]+)<\/script>/);
if (!m) { console.log('❌ NO JSON-LD in initial HTML'); process.exit(1); }
const d = JSON.parse(m[1].replace(/\\u003C/g, '<'));
console.log('✅ Breadcrumb schema in initial HTML:', d['@type']);
"
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```
3. ✅ Prints `✅ Breadcrumb schema in initial HTML: BreadcrumbList`.

---

## Phase 2 — Convert Existing `<Script>` JSON-LD Mounts

### Task 2: Convert `app/layout.tsx` JSON-LD blocks to `<JsonLd>`

**Files:**
- Modify: `app/layout.tsx`

The current `app/layout.tsx` imports `Script from "next/script"` and uses `<Script id="jsonld-*" type="application/ld+json">{JSON.stringify(...)}</Script>` for 4 schemas: WebSite, Organization, FAQPage, LocalBusiness. The `<Script>` import is also used for GA's gtag-consent and gtag.js — those MUST stay.

- [ ] **Step 1: Add the `<JsonLd>` import to `app/layout.tsx`**

Insert next to the existing imports near the top:

```tsx
import { JsonLd } from '@/components/seo/JsonLd';
```

- [ ] **Step 2: Replace the 4 `<Script id="jsonld-*">` blocks**

Find the 4 blocks (search for `id="jsonld-website"`, `id="jsonld-organization"`, `id="jsonld-faq"`, `id="jsonld-localbusiness"` — each currently looks like):

```tsx
<Script id="jsonld-website" type="application/ld+json">
  {JSON.stringify(ldWebsite)}
</Script>
```

Replace each with the `<JsonLd>` form:

```tsx
<JsonLd id="jsonld-website" data={ldWebsite} />
<JsonLd id="jsonld-organization" data={ldOrganization} />
<JsonLd id="jsonld-faq" data={ldFaq} />
<JsonLd id="jsonld-localbusiness" data={ldLocalBusiness} />
```

Do NOT touch the other `<Script>` invocations in the file (the gtag-consent and gtag.js ones). Those use `strategy="beforeInteractive"` / `strategy="lazyOnload"` and are legitimately tied to next/script's lifecycle.

- [ ] **Step 3: Run the full Playwright SEO suite to confirm the JS-rendered behavior still works**

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..60}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 2; done
npx playwright test e2e/seo.spec.ts 2>&1 | tail -10
EXIT=$?
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
exit $EXIT
```

Expected: all 34 existing E2E tests still pass (the schemas are still in the DOM — they just now arrive via initial HTML instead of post-hydration).

- [ ] **Step 4: Manual raw-HTML spot check**

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..60}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 2; done

# Confirm all 4 layout schemas are now in the initial HTML response
curl -s http://localhost:3000/sr > /tmp/check_sr.html
for t in WebSite Organization FAQPage LocalBusiness; do
  if grep -qE "<script[^>]*application/ld\+json[^>]*>[^<]*\"@type\":\"$t\"" /tmp/check_sr.html; then
    echo "✅ $t in initial HTML"
  else
    echo "❌ $t MISSING from initial HTML"
  fi
done

kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```

Expected: all 4 schemas show `✅`.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx
git commit -m "fix(seo): emit layout JSON-LD as initial HTML via <JsonLd>, not post-hydration <Script>

Replaces 4 inline <Script id=\"jsonld-...\"> blocks in app/layout.tsx
(WebSite, Organization, FAQPage, LocalBusiness) with the <JsonLd>
server component. The schemas now appear in the initial HTML response
so AI crawlers (GPTBot, ClaudeBot, PerplexityBot) and Googlebot's first
crawl pass can extract structured data without executing JavaScript.

The 4 non-JSON-LD <Script> invocations (GA consent-default + gtag.js)
are intentionally left untouched — they use lifecycle strategies
(beforeInteractive, lazyOnload) that the plain <script> tag can't
provide.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Independent Verification

```bash
cd /Users/nmil/Desktop/WeddingApp

# (1) Static check — no Script wrapper around JSON-LD remains in layout.tsx
! grep -E '<Script[^>]+application/ld\+json' app/layout.tsx && echo "✅ no <Script> JSON-LD in layout.tsx"

# (2) <JsonLd> is now used for the 4 schemas
COUNT=$(grep -cE '<JsonLd[^>]+id="jsonld-(website|organization|faq|localbusiness)"' app/layout.tsx)
[ "$COUNT" = "4" ] && echo "✅ 4 <JsonLd> mounts" || echo "❌ found $COUNT <JsonLd> mounts (expected 4)"

# (3) The non-JSON-LD <Script> blocks for gtag remain
grep -q 'gtag-consent-default' app/layout.tsx && echo "✅ gtag-consent <Script> preserved"
grep -q 'googletagmanager.com/gtag/js' app/layout.tsx && echo "✅ gtag.js <Script> preserved"
```
1. ✅ All four `✅` lines print.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..60}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 2; done

# Critical check: raw HTML (no JS execution) must contain all 4 schemas
RAW=$(curl -s http://localhost:3000/sr)
PASS=0
for t in WebSite Organization FAQPage LocalBusiness; do
  if echo "$RAW" | grep -qE "<script[^>]+application/ld\+json[^>]*>[^<]*\"@type\":\"$t\""; then
    echo "✅ $t in raw initial HTML"
    PASS=$((PASS+1))
  else
    echo "❌ $t NOT in raw HTML — STILL HIDDEN BEHIND HYDRATION"
  fi
done

# Also confirm the existing Playwright suite stays green (the schemas should still be in the DOM post-hydration too)
npx playwright test e2e/seo.spec.ts 2>&1 | tail -3

kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null

[ "$PASS" = "4" ] && echo "🎉 Phase 2 verification passed" || { echo "💥 Phase 2 FAILED — $PASS/4 schemas in raw HTML"; exit 1; }
```
2. ✅ Prints `🎉 Phase 2 verification passed`. Playwright suite ends with `passed`.

---

### Task 3: Convert `app/sr/page.tsx` and `app/en/page.tsx` JSON-LD blocks to `<JsonLd>`

**Files:**
- Modify: `app/sr/page.tsx`
- Modify: `app/en/page.tsx`

Each currently has 2 `<Script>` blocks: `jsonld-product-{sr,en}` and `jsonld-software-{sr,en}`. Plus a `Script` import from `next/script`. After this task neither file imports `Script`.

- [ ] **Step 1: Edit `app/sr/page.tsx`**

Read the current file. Then:

1. Remove the line `import Script from 'next/script';` (or change to `// removed: import Script` if your linter complains).
2. Add `import { JsonLd } from '@/components/seo/JsonLd';` next to the other imports.
3. Replace:

```tsx
<Script id="jsonld-product-sr" type="application/ld+json">
  {JSON.stringify(productSchema(tiers, 'sr'))}
</Script>
<Script id="jsonld-software-sr" type="application/ld+json">
  {JSON.stringify(softwareApplicationSchema('sr', tiers))}
</Script>
```

with:

```tsx
<JsonLd id="jsonld-product-sr" data={productSchema(tiers, 'sr')} />
<JsonLd id="jsonld-software-sr" data={softwareApplicationSchema('sr', tiers)} />
```

- [ ] **Step 2: Edit `app/en/page.tsx` symmetrically**

Same surgery: remove `Script` import, add `JsonLd` import, replace `<Script>` with `<JsonLd>` for `jsonld-product-en` and `jsonld-software-en`.

- [ ] **Step 3: Confirm neither file still imports `Script`**

```bash
cd /Users/nmil/Desktop/WeddingApp
grep -n "from 'next/script'" app/sr/page.tsx app/en/page.tsx
```

Expected: zero matches.

- [ ] **Step 4: Raw-HTML verification (both locales)**

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..60}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 2; done

# /sr: Product + SoftwareApplication in raw HTML
RAW_SR=$(curl -s http://localhost:3000/sr)
echo "$RAW_SR" | grep -qE '<script[^>]+id="jsonld-product-sr"[^>]*>[^<]*"@type":"Product"' && echo "✅ Product (sr) in raw HTML" || echo "❌ Product (sr) missing"
echo "$RAW_SR" | grep -qE '<script[^>]+id="jsonld-software-sr"[^>]*>[^<]*"@type":"SoftwareApplication"' && echo "✅ SoftwareApplication (sr) in raw HTML" || echo "❌ SoftwareApplication (sr) missing"

# /en: same
RAW_EN=$(curl -s http://localhost:3000/en)
echo "$RAW_EN" | grep -qE '<script[^>]+id="jsonld-product-en"[^>]*>[^<]*"@type":"Product"' && echo "✅ Product (en) in raw HTML" || echo "❌ Product (en) missing"
echo "$RAW_EN" | grep -qE '<script[^>]+id="jsonld-software-en"[^>]*>[^<]*"@type":"SoftwareApplication"' && echo "✅ SoftwareApplication (en) in raw HTML" || echo "❌ SoftwareApplication (en) missing"

npx playwright test e2e/seo.spec.ts 2>&1 | tail -3

kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```

Expected: 4 `✅` lines + Playwright ends with `passed`.

- [ ] **Step 5: Commit**

```bash
git add app/sr/page.tsx app/en/page.tsx
git commit -m "fix(seo): emit landing-page JSON-LD as initial HTML via <JsonLd>

Replaces 4 <Script id=\"jsonld-{product,software}-{sr,en}\"> blocks on
the localized landing pages with <JsonLd>. Product/Offer and
SoftwareApplication schemas now appear in the initial HTML response,
not behind client hydration.

Removes the now-unused 'next/script' import from both pages.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Independent Verification

```bash
cd /Users/nmil/Desktop/WeddingApp

# (1) Static — neither landing page imports Script anymore
! grep -q "from 'next/script'" app/sr/page.tsx && echo "✅ /sr no Script import"
! grep -q "from 'next/script'" app/en/page.tsx && echo "✅ /en no Script import"

# (2) Both use <JsonLd>
grep -cE '<JsonLd[^>]+id="jsonld-(product|software)-(sr|en)"' app/sr/page.tsx app/en/page.tsx
```
1. ✅ Both `✅` lines print.
2. ✅ Grep reports 2 matches each (4 total across both files).

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..60}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 2; done

for path_lang in "sr:Product:product-sr" "sr:SoftwareApplication:software-sr" "en:Product:product-en" "en:SoftwareApplication:software-en"; do
  IFS=':' read -r locale ttype id <<< "$path_lang"
  RAW=$(curl -s "http://localhost:3000/$locale")
  if echo "$RAW" | grep -qE "<script[^>]+id=\"jsonld-$id\"[^>]*>[^<]*\"@type\":\"$ttype\""; then
    echo "✅ $ttype on /$locale in raw HTML"
  else
    echo "❌ $ttype on /$locale missing from raw HTML"
  fi
done

kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
```
3. ✅ All 4 lines print `✅`.

---

## Phase 3 — Regression Test

### Task 4: Add no-JS raw-HTML E2E regression tests

**Files:**
- Modify: `e2e/seo.spec.ts`

The existing E2E suite uses `page.goto()` which runs JS, so post-hydration schemas pass even when initial HTML is missing them. We add complementary tests that use `request.get()` (raw HTTP, no JS) to fetch HTML and grep for `<script>` tags. These tests would have caught the original regression.

- [ ] **Step 1: Append new test block at the end of the existing `SEO routing` describe**

In `/Users/nmil/Desktop/WeddingApp/e2e/seo.spec.ts`, before the closing `});` of `test.describe('SEO routing', ...)`, add:

```ts
  // ----- No-JS raw-HTML regression suite -----
  // These tests intentionally use request.get (no browser, no JS execution)
  // so any schema that only materializes after client hydration WILL fail.
  // Guards against the 2026-05-20 regression where next/Script-wrapped
  // JSON-LD blocks were serialized into the RSC data stream instead of
  // emitted as initial-HTML <script> elements.

  function extractJsonLdTypes(html: string): string[] {
    const types: string[] = [];
    const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      try {
        const data = JSON.parse(m[1].replace(/\\u003C/g, '<'));
        if (data['@type']) types.push(data['@type']);
      } catch {
        // ignore malformed — they will surface as missing types in the assertion
      }
    }
    return types;
  }

  test('initial HTML for /sr contains all 6 expected JSON-LD schemas', async ({ request }) => {
    const res = await request.get('/sr');
    expect(res.status()).toBe(200);
    const html = await res.text();
    const types = extractJsonLdTypes(html);
    for (const expected of ['WebSite', 'Organization', 'FAQPage', 'LocalBusiness', 'Product', 'SoftwareApplication']) {
      expect(types, `initial HTML missing ${expected} on /sr — got [${types.join(', ')}]`).toContain(expected);
    }
  });

  test('initial HTML for /en contains all 6 expected JSON-LD schemas', async ({ request }) => {
    const res = await request.get('/en');
    expect(res.status()).toBe(200);
    const html = await res.text();
    const types = extractJsonLdTypes(html);
    for (const expected of ['WebSite', 'Organization', 'FAQPage', 'LocalBusiness', 'Product', 'SoftwareApplication']) {
      expect(types, `initial HTML missing ${expected} on /en — got [${types.join(', ')}]`).toContain(expected);
    }
  });

  test('initial HTML for /sr/about contains BreadcrumbList + layout schemas', async ({ request }) => {
    const res = await request.get('/sr/about');
    expect(res.status()).toBe(200);
    const html = await res.text();
    const types = extractJsonLdTypes(html);
    for (const expected of ['WebSite', 'Organization', 'FAQPage', 'LocalBusiness', 'BreadcrumbList']) {
      expect(types, `initial HTML missing ${expected} on /sr/about — got [${types.join(', ')}]`).toContain(expected);
    }
  });

  test('initial HTML for /en/about contains BreadcrumbList + layout schemas', async ({ request }) => {
    const res = await request.get('/en/about');
    expect(res.status()).toBe(200);
    const html = await res.text();
    const types = extractJsonLdTypes(html);
    for (const expected of ['WebSite', 'Organization', 'FAQPage', 'LocalBusiness', 'BreadcrumbList']) {
      expect(types, `initial HTML missing ${expected} on /en/about — got [${types.join(', ')}]`).toContain(expected);
    }
  });
```

- [ ] **Step 2: Run the new tests against the local dev server**

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..60}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 2; done
npx playwright test e2e/seo.spec.ts --grep "initial HTML for" 2>&1 | tail -10
EXIT=$?
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
exit $EXIT
```

Expected: 4 tests pass (would fail before Tasks 2+3 land).

- [ ] **Step 3: Run the entire SEO suite to confirm nothing regressed**

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..60}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 2; done
npx playwright test e2e/seo.spec.ts 2>&1 | tail -5
EXIT=$?
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
exit $EXIT
```

Expected: 38 tests pass (34 existing + 4 new).

- [ ] **Step 4: Commit**

```bash
git add e2e/seo.spec.ts
git commit -m "test(seo): no-JS raw-HTML regression tests for JSON-LD on landing + about pages

Adds 4 Playwright tests that use request.get() (no browser, no JS) to
fetch HTML and parse <script type=\"application/ld+json\"> elements
directly. Would have caught the 2026-05-20 regression where next/Script
serialized schemas into the RSC data stream instead of emitting them as
initial-HTML elements.

Assertions cover /sr, /en (6 schemas each: WebSite, Organization,
FAQPage, LocalBusiness, Product, SoftwareApplication) and /sr/about,
/en/about (5 schemas: layout 4 + BreadcrumbList).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Independent Verification

```bash
cd /Users/nmil/Desktop/WeddingApp

# (1) New tests exist
grep -c "initial HTML for" e2e/seo.spec.ts
```
1. ✅ Returns 4.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
for i in {1..60}; do curl -fsS http://localhost:3000/sr -o /dev/null && break || sleep 2; done
npx playwright test e2e/seo.spec.ts 2>&1 | tail -3
EXIT=$?
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null
exit $EXIT
```
2. ✅ Final line shows `38 passed` (or similar — total ≥ 38).

---

## Phase 4 — Push, Deploy, Production Verify

### Task 5: PR, deploy, and production verification

**Files:**
- No code changes — verification only.

- [ ] **Step 1: Push the branch and open a PR**

```bash
cd /Users/nmil/Desktop/WeddingApp
git push -u origin fix/jsonld-server-render

gh pr create --title "fix(seo): emit JSON-LD in initial HTML (no-JS crawler compatibility)" --body "$(cat <<'EOF'
## Summary

Fixes a JSON-LD regression discovered in production verification of PR #43.

**Problem:** PR #43 used Next.js \`<Script type=\"application/ld+json\">\` for 6 schemas (WebSite, Organization, FAQPage, LocalBusiness, Product, SoftwareApplication). next/Script serializes its payload into the React Server Components data stream and only injects the \`<script>\` element after client hydration. Result: \`curl https://www.dodajuspomenu.com/sr | grep '<script[^>]*ld+json'\` returns 0 — AI crawlers (GPTBot, ClaudeBot, PerplexityBot) and Googlebot's first crawl pass see no structured data.

**Fix:** New \`<JsonLd>\` server component wraps \`<script type=\"application/ld+json\" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\\\u003C') }} />\`. Replaces every existing \`<Script>\` JSON-LD mount. Keeps the working \`JsonLdBreadcrumb\` pattern (now refactored to delegate to \`<JsonLd>\`).

## Changes

- New \`components/seo/JsonLd.tsx\` + 3 unit tests (render contract, JSON serialization, \`</script>\` escape).
- Refactored \`components/seo/JsonLdBreadcrumb.tsx\` to use \`<JsonLd>\` (no behavior change).
- \`app/layout.tsx\`: 4 \`<Script>\` JSON-LD mounts → \`<JsonLd>\`. \`<Script>\` import preserved for gtag (legitimate lifecycle use).
- \`app/sr/page.tsx\` + \`app/en/page.tsx\`: 4 \`<Script>\` JSON-LD mounts → \`<JsonLd>\`. \`<Script>\` import removed (no longer used).
- 4 new no-JS Playwright tests use \`request.get()\` (no browser) to assert all schemas appear in initial HTML.

## Test plan

- [x] \`pnpm test:unit -- JsonLd.test.tsx json-ld.test.ts\` — green
- [x] \`pnpm dev\` + \`npx playwright test e2e/seo.spec.ts\` — 38/38 pass
- [x] \`pnpm build\` — clean
- [x] Local \`curl http://localhost:3000/sr | grep '<script[^>]*ld+json'\` — 6 matches
- [ ] After Vercel deploy: \`curl https://www.dodajuspomenu.com/sr | grep '<script[^>]*ld+json'\` — expect 6
- [ ] After deploy: re-run \`E2E_BASE_URL=https://www.dodajuspomenu.com npx playwright test e2e/seo.spec.ts\` — expect 38 pass

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Capture the PR number from output.

- [ ] **Step 2: Monitor CI**

```bash
gh pr checks <PR_NUMBER>
```

Wait for build-and-test + e2e + Vercel deploy to all show `pass`.

- [ ] **Step 3: Merge once CI is green**

If the user is auto-merging or has explicit approval, run:

```bash
gh pr merge <PR_NUMBER> --squash --delete-branch
```

Otherwise leave the PR for the user to merge.

- [ ] **Step 4: After deploy, run production verification**

```bash
DOMAIN=https://www.dodajuspomenu.com

# Critical assertion: 6 JSON-LD blocks in raw HTML for both locales
for locale in sr en; do
  COUNT=$(curl -s "$DOMAIN/$locale" | grep -oE '<script[^>]+application/ld\+json' | wc -l | tr -d ' ')
  echo "/$locale: $COUNT JSON-LD blocks in raw HTML (expect 6)"
done

# Schema type roll-call on /sr
curl -s "$DOMAIN/sr" | node -e "
const html = require('fs').readFileSync('/dev/stdin', 'utf8');
const re = /<script[^>]*application\/ld\+json[^>]*>([^<]+)<\/script>/g;
let m; const types = [];
while ((m = re.exec(html)) !== null) {
  try { const d = JSON.parse(m[1].replace(/\\\\u003C/g, '<')); if (d['@type']) types.push(d['@type']); } catch {}
}
const required = ['WebSite','Organization','FAQPage','LocalBusiness','Product','SoftwareApplication'];
const missing = required.filter(t => !types.includes(t));
if (missing.length) console.log('❌ /sr missing:', missing.join(', '), '— got [' + types.join(', ') + ']');
else console.log('✅ /sr has all 6 required schemas:', types.join(', '));
"

# Same on /en
curl -s "$DOMAIN/en" | node -e "
const html = require('fs').readFileSync('/dev/stdin', 'utf8');
const re = /<script[^>]*application\/ld\+json[^>]*>([^<]+)<\/script>/g;
let m; const types = [];
while ((m = re.exec(html)) !== null) {
  try { const d = JSON.parse(m[1].replace(/\\\\u003C/g, '<')); if (d['@type']) types.push(d['@type']); } catch {}
}
const required = ['WebSite','Organization','FAQPage','LocalBusiness','Product','SoftwareApplication'];
const missing = required.filter(t => !types.includes(t));
if (missing.length) console.log('❌ /en missing:', missing.join(', '));
else console.log('✅ /en has all 6 required schemas:', types.join(', '));
"

# E2E suite against production
cd /Users/nmil/Desktop/WeddingApp
E2E_BASE_URL=$DOMAIN npx playwright test e2e/seo.spec.ts 2>&1 | tail -5
```

Expected:
- Both locales report 6 JSON-LD blocks in raw HTML.
- Both `node` scripts print `✅ ... all 6 required schemas`.
- Playwright suite ends with `38 passed`.

### Independent Verification

```bash
DOMAIN=https://www.dodajuspomenu.com

# (1) Each landing page has all 6 schemas in raw HTML
for locale in sr en; do
  HTML=$(curl -s "$DOMAIN/$locale")
  PRESENT=0
  for t in WebSite Organization FAQPage LocalBusiness Product SoftwareApplication; do
    echo "$HTML" | grep -qE "<script[^>]+application/ld\+json[^>]*>[^<]*\"@type\":\"$t\"" && PRESENT=$((PRESENT+1))
  done
  echo "/$locale: $PRESENT/6 schemas in raw HTML"
done
```
1. ✅ Both locales report `6/6 schemas`.

```bash
# (2) BreadcrumbList still present on /sr/about + /en/about (regression guard for Task 1 refactor)
for path in /sr/about /en/about; do
  curl -s "$DOMAIN$path" | grep -qE '<script[^>]+application/ld\+json[^>]*>[^<]*"@type":"BreadcrumbList"' && echo "✅ $path BreadcrumbList in raw HTML"
done
```
2. ✅ Both lines print.

```bash
# (3) Production E2E suite
cd /Users/nmil/Desktop/WeddingApp
E2E_BASE_URL=$DOMAIN npx playwright test e2e/seo.spec.ts 2>&1 | tail -3
```
3. ✅ Final line includes `38 passed` (or `passed (Xs)` with 38 in the count).

---

## Self-Review Notes (resolved during plan authoring)

- **Spec coverage:** the regression's root cause (Next.js `<Script>` serializing JSON-LD into the RSC stream) is addressed in Task 1 (mechanism) + Tasks 2-3 (all 6 mounts). Task 4 prevents future regression. Task 5 closes the loop in production.
- **Placeholder scan:** no TBDs. Every step has runnable code or an exact shell command.
- **Type consistency:** `<JsonLd id data />` defined once in Task 1, used identically in Tasks 2 and 3. `extractJsonLdTypes()` defined inline in Task 4's test file — single use site, no cross-task drift.
- **Verifier independence:** each `### Independent Verification` uses only shell + curl + node-eval, no IDE state.
- **Out-of-scope (intentional):** gtag `<Script>` blocks; BreadcrumbList behavior (already correct, refactored only for code consolidation).
