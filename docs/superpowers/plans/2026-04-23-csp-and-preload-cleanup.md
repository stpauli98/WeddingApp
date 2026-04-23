# CSP + Hero Preload Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate two console warnings on admin/guest routes: CSP blocks on regional Google Analytics endpoints, and an unused hero-poster preload wasted on every non-landing page.

**Architecture:** Two independent, additive fixes in existing files. CSP: widen `connect-src` and `img-src` to `*.google-analytics.com` so GA4 can reach regional collection endpoints. Preload: move the poster preload out of the global `<head>` and scope it to the three landing pages that actually render the hero video.

**Tech Stack:** Next.js 15.3.9 App Router · React 18.3 · `ReactDOM.preload` resource-hint API.

---

## Context

**Bug 1: CSP blocks GA4 regional data collection.**

Console on `/sr/admin/login` shows:
```
Refused to connect to 'https://region1.google-analytics.com/g/collect?...'
because it violates the CSP directive
"connect-src 'self' https://www.google-analytics.com https://*.vercel-insights.com https://vitals.vercel-insights.com https://api.producthunt.com"
```

GA4's `gtag.js` auto-detects the user's region and POSTs collection hits to `region1-N.google-analytics.com` (regional data residency — particularly enforced for EU traffic since Google Analytics 4 rollout). Only `www.google-analytics.com` is currently allow-listed in [next.config.mjs:35](next.config.mjs:35), so every analytics beacon from outside the US fails silently. Analytics data is being lost on most of the traffic.

The `script-src` entry is fine (GA still loads gtag.js from `www.google-analytics.com`). Only the runtime collection fetches go to the regional hosts.

**Bug 2: Wasted preload on every non-landing route.**

Console on `/sr/admin/login`:
```
The resource http://localhost:3001/videos/hero-guest-flow-poster.jpg was
preloaded using link preload but not used within a few seconds from the
window's load event.
```

[app/layout.tsx:95-100](app/layout.tsx:95) preloads `/videos/hero-guest-flow-poster.jpg` with `fetchPriority="high"`. The poster is only rendered by `HeroSection` (mounted on the three landing pages). Admin and guest routes never mount Hero, so the browser downloads the JPG and then discards it — the classic "preload not used" warning, plus a real bandwidth tax on every admin/guest page load.

**Why the preload exists.** Added in commit `086cb85` / PR #18 as part of the LCP optimization plan (`docs/superpowers/plans/2026-04-20-lcp-ssr-fix.md`). The landing page's hero video uses `preload="none"`, so the poster serves as the LCP candidate. Preloading in `<head>` shaved ~200ms off LCP on the landing page — that's a real win and needs to be preserved, just scoped to where it pays off.

**Route topology.** Middleware rewrites `/sr/admin/*` → `/admin/*` and `/sr/guest/*` → `/guest/*` internally. So:
- `app/sr/layout.tsx` and `app/sr/page.tsx` only fire on `/sr` (landing) — not on `/sr/admin/...`
- Same for `/en`
- `/` (bare root) is redirected by middleware to `/{lang}` before `app/page.tsx` ever renders — it's a dead fallback

So the preload belongs in `app/sr/page.tsx` + `app/en/page.tsx` (and `app/page.tsx` for defense in depth, since it exists).

---

## Architecture

**Direction:** Minimal, targeted fixes. No refactor of either CSP structure or preload strategy.

**Approach:**

- **CSP.** In [next.config.mjs](next.config.mjs), replace the two `https://www.google-analytics.com` tokens (in `connect-src` and `img-src`) with the wildcard `https://*.google-analytics.com`. Leave `script-src` narrow since scripts only come from `www.`. Wildcard restricts to Google's domain — no blast-radius increase beyond Google.
- **Preload.** Remove the `<link rel="preload">` tag from the root layout's `<head>`. Call `preload()` from `react-dom` in each landing page component. `react-dom`'s `preload` API (stable in React 18.3) tells Next.js to emit a `<link rel="preload">` into the streamed HTML's `<head>` — same effect as the manual tag, but only on pages that actually opt in.

**Not proposed in this plan (explicit decisions):**

- **Per-region explicit allow-list (`region1.google-analytics.com region2.google-analytics.com ...`).** Google publishes no hard list of regional hosts; they add regions over time. Wildcard is the pragmatic choice and matches what most production CSPs for GA4 use.
- **Moving preload into `HeroSection`.** Would require making HeroSection a client component or invoking `preload()` from a client boundary, wasting the RSC advantage. Landing `page.tsx` is already an async server component — cheapest place.
- **Conditional `<link>` in root layout based on pathname.** Would force the root layout to read `headers()` AGAIN for a second reason — fragile, and the whole point of scoping this plan narrow is to not pile more work into the recently-touched layout.
- **Removing the `app/page.tsx` landing fallback.** Out of scope; it's harmless.

---

## File Structure

**Modified:**

- `next.config.mjs` — two tokens widened to `*.google-analytics.com`
- `app/layout.tsx` — delete the 6-line `<link rel="preload">` block
- `app/page.tsx` — add one `preload()` call
- `app/sr/page.tsx` — add one `preload()` call
- `app/en/page.tsx` — add one `preload()` call

**New:** None.

**Not modified:** Root layout's other preloads/scripts, middleware, HeroSection component, any admin or guest page.

**Existing patterns reused:** `preload` from `react-dom` is already a stable Next.js 15 / React 18.3 pattern; Next.js hoists it into the streamed `<head>` automatically.

---

## Tasks

### Task 1: Widen CSP to cover GA4 regional endpoints

**Files:**
- Modify: `next.config.mjs:33` and `next.config.mjs:35`

- [ ] **Step 1: Open `next.config.mjs` and locate the CSP block** (lines 29-42). Confirm current `connect-src` and `img-src` entries:

```js
"img-src 'self' data: https: blob: https://res.cloudinary.com https://api.producthunt.com https://www.google-analytics.com",
"connect-src 'self' https://www.google-analytics.com https://*.vercel-insights.com https://vitals.vercel-insights.com https://api.producthunt.com",
```

- [ ] **Step 2: Replace both `https://www.google-analytics.com` tokens with `https://*.google-analytics.com`.** After edit:

```js
"img-src 'self' data: https: blob: https://res.cloudinary.com https://api.producthunt.com https://*.google-analytics.com",
"connect-src 'self' https://*.google-analytics.com https://*.vercel-insights.com https://vitals.vercel-insights.com https://api.producthunt.com",
```

Leave `script-src` unchanged — scripts still only come from `www.google-analytics.com` and `www.googletagmanager.com`.

- [ ] **Step 3: Build to confirm config parses.**

```bash
cd /Users/nmil/Desktop/WeddingApp && pnpm build
```

Expected: success, no CSP-related warnings in output.

- [ ] **Step 4: Manual verify in dev.** `pnpm dev`, open `/sr/admin/login` in a Chrome incognito window, check Network tab. Expected: a POST to `https://region1.google-analytics.com/g/collect?...` returns `204 No Content` and no CSP violation appears in console.

### Task 2: Remove global hero-poster preload from root layout

**Files:**
- Modify: `app/layout.tsx:93-100`

- [ ] **Step 1: Delete the preload block.** Current code:

```tsx
{/* Preload poster JPG for hero video — serves as LCP candidate during
    video fetch. Video itself uses preload="none" to stay off LCP path. */}
<link
  rel="preload"
  as="image"
  href="/videos/hero-guest-flow-poster.jpg"
  fetchPriority="high"
/>
```

Remove this entire block (6 lines including the comment). The surrounding `<link rel="icon">` and JSON-LD scripts stay.

- [ ] **Step 2: Confirm no other reference** to the preload path remains in `app/layout.tsx`. Grep:

```bash
grep -n "hero-guest-flow-poster" app/layout.tsx
```

Expected: no matches.

### Task 3: Add targeted `preload()` calls in landing pages

**Files:**
- Modify: `app/page.tsx`, `app/sr/page.tsx`, `app/en/page.tsx`

- [ ] **Step 1: Update `app/sr/page.tsx`.** Current content:

```tsx
import ClientPage from "@/components/ClientPage";
import { getPricingPlansFromDb } from "@/lib/pricing-db";
import { getServerT } from "@/lib/i18n/server";

export default async function SrHomePage() {
  const tiers = await getPricingPlansFromDb();
  const t = getServerT('sr');
  return <ClientPage t={t} lang="sr" tiers={tiers} />;
}
```

Replace with:

```tsx
import { preload } from "react-dom";
import ClientPage from "@/components/ClientPage";
import { getPricingPlansFromDb } from "@/lib/pricing-db";
import { getServerT } from "@/lib/i18n/server";

export default async function SrHomePage() {
  // LCP candidate: hero video's poster image. The <video> uses preload="none"
  // so we promote the poster here instead. Scoped per-page so admin/guest
  // routes don't pay for a resource they never render.
  preload("/videos/hero-guest-flow-poster.jpg", {
    as: "image",
    fetchPriority: "high",
  });

  const tiers = await getPricingPlansFromDb();
  const t = getServerT('sr');
  return <ClientPage t={t} lang="sr" tiers={tiers} />;
}
```

- [ ] **Step 2: Update `app/en/page.tsx`.** Apply the same pattern (import `preload`, call at the top of the async function). Assume the file mirrors `app/sr/page.tsx` with `lang="en"` and `getServerT('en')`.

- [ ] **Step 3: Update `app/page.tsx`.** Same pattern — import and call `preload(...)` at the top of the `Home` async function, just before the `getPricingPlansFromDb()` call. Keep the existing `metadata` export untouched.

- [ ] **Step 4: Build.**

```bash
cd /Users/nmil/Desktop/WeddingApp && pnpm build
```

Expected: success. Output should still show `/sr`, `/en`, `/` as dynamic (ƒ). First-load JS unchanged.

- [ ] **Step 5: Manual verify LCP is preserved.** `pnpm dev`, open `/sr` in Chrome DevTools Network tab. Expected: `hero-guest-flow-poster.jpg` appears with "Priority: High" and is fetched during the initial HTML parse (not after). The preload should now show as *used* — no "preloaded but not used" warning.

- [ ] **Step 6: Manual verify admin/guest no longer preload.** Open `/sr/admin/login` in DevTools Network tab. Expected: **no request** for `hero-guest-flow-poster.jpg`. Console clean of the preload warning.

### Task 4: Unit tests + commit + PR

- [ ] **Step 1: Run full unit test suite.**

```bash
cd /Users/nmil/Desktop/WeddingApp && pnpm test:unit
```

Expected: 148 passing (no test touches CSP or preload, so count stays flat).

- [ ] **Step 2: Commit on a new feature branch.**

```bash
git checkout -b fix/csp-ga-regional-and-scoped-preload
git add next.config.mjs app/layout.tsx app/page.tsx app/sr/page.tsx app/en/page.tsx
git commit -m "fix(csp): allow GA4 regional endpoints + scope hero preload to landing"
```

- [ ] **Step 3: Push and open PR.**

```bash
git push -u origin fix/csp-ga-regional-and-scoped-preload
gh pr create --title "fix: GA4 regional CSP + hero preload scoping" --body "[body per template]"
```

PR body highlights:
- Analytics data was being silently dropped on non-US traffic — `region1.google-analytics.com` blocked by CSP. Wildcard fixes it.
- Non-landing routes were fetching the 60 kB hero poster they never rendered. Scoped preload to landing-only via `react-dom`'s `preload()` in each page component.
- No behaviour change for users; LCP on landing preserved.

---

## Verification (end-to-end)

**Unit:** `pnpm test:unit` — 148/148.

**Build:** `pnpm build` — success.

**Manual E2E (per surface):**
- `/sr` (landing) → Network tab shows poster preloaded with High priority; no console warning.
- `/en` (landing) → same.
- `/` (redirect source) → middleware redirects to `/{lang}`; no poster fetched from `/` itself.
- `/sr/admin/login`, `/sr/admin/register`, `/sr/admin/event`, `/sr/admin/dashboard`, `/sr/guest/login`, `/sr/guest/dashboard` → no poster fetch, no preload warning, no CSP console noise.
- GA4 check: in DevTools Network filter on `google-analytics.com`, confirm `region1.google-analytics.com/g/collect` POST returns `204` (or `200`), not blocked.

---

## Out of Scope

- **Strict CSP with nonces.** Tracked elsewhere; `unsafe-inline` + `unsafe-eval` stay for Next.js runtime + gtag.
- **Audit other CSP entries.** `img-src` has a very broad `https:` wildcard already; tightening that is a separate PR.
- **Replacing `gtag.js` with a self-hosted proxy.** Avoids the regional-endpoint problem entirely but is a larger analytics migration.
- **Removing the `app/page.tsx` fallback.** Harmless; not touching it.
