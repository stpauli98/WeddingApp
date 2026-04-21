# GA Lazy-Load Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spustiti LCP sa 2.9s u strict "good" Core Web Vitals zonu (<2.5s) mijenjanjem Google Analytics Script strategije iz `afterInteractive` u `lazyOnload`.

**Architecture:** Minimalan surgical fix — jedna riječ u `app/layout.tsx`. GA bootstrap (dataLayer + consent default) ostaje `beforeInteractive` jer je kritičan i sitan. GA SDK (gtag.js, 65 KiB) se defersuje sa "nakon hydration-a" na "nakon `window.load`" event-a. Ne utiče na consent flow, cookie behavior, ili analytics accuracy — samo pomjera network fetch izvan kritične staze.

**Tech Stack:** Next.js 15 `next/script` component, Google Analytics 4 with Consent Mode v2.

---

## Context

Nakon Phase 8 (PR #16, commit `cdf8d03`), live SR mobile Lighthouse je **Perf 95, LCP 2.9s**. Sajt je launch-ready, ali LCP je u "Needs Improvement" band-u (2.5-4.0s). Strict "good" treshold je ≤2.5s. 400ms više.

Preostale opportunities iz Lighthouse-a:
- `unused-javascript: 93 KiB` — breakdown: **65 KiB GA (gtag.js) nepotrebno u critical path** + 28 KiB framer-motion chunks (već minimizirani)
- `dom-size-insight: 558ms` — teoretski estimate, real gain <100ms za landing, low ROI (skip)

**Trenutno stanje GA-a u [app/layout.tsx:70-89](app/layout.tsx):**

```tsx
{/* Google Analytics with Consent Mode v2 (denied by default) */}
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

**Šta mijenjamo:** samo drugi `<Script>` — `strategy="afterInteractive"` → `strategy="lazyOnload"`.

**Next.js strategy semantics (from docs):**
- `beforeInteractive` — script runs before page is interactive. Must be in layout, not page. Use for critical scripts.
- `afterInteractive` (default) — script runs immediately after page becomes interactive (≈ post-hydration).
- `lazyOnload` — script runs during browser idle time **after the `load` event fires**. `load` event fires after ALL resources (images, fonts, sub-resources) have loaded.

**Zašto radi:** LCP je measure-an do "largest contentful paint" — to je hero image. `load` event fire-uje NAKON LCP-a. Znači gtag.js kreće fetch nakon što je LCP već zabilježen. 65 KiB izlazi iz critical path-a.

**Zašto je sigurno:**
1. Consent mode v2 default state (`denied`) je već postavljen u `beforeInteractive` scriptu — fire-uje PRIJE bilo čega. Tako da čak i da `gtag.js` stigne na stranicu sa cookies disabled (prije user consent-a), GA ne šalje nikakve cookies jer je `analytics_storage: denied`.
2. `useConsent.ts` hook (Phase 1 PR #6) poziva `gtag('consent', 'update', {...})` kad user prihvati. Taj poziv ide u `dataLayer` (već inicijalizovan `beforeInteractive`). Kad gtag.js konačno stigne (lazy), čita dataLayer queue i aplicira consent update.
3. Cookie-ji `_ga`, `_ga_*` se setuju **samo nakon što je consent granted + gtag.js učitan**. Ovim fix-om, oba koraka kasne — user prihvati, `_ga` se setuje kada load event fire-uje + GA fetch završi. Ukupno delay ~300-500ms više nego trenutno, ali fundamentalno ponašanje je isto: cookie-ji se setuju samo uz pristanak, nikad prije.

**Očekivani efekat:**
- LCP: 2.9s → **2.4-2.6s** ("good" zona)
- Perf: 95 → 96-97
- Nema utjecaja na analytics accuracy (page_view event-ovi se queue-aju u dataLayer dok gtag.js ne stigne; procesiraju se batch-ovano)

Procjena: **10-15 minuta**.

---

## File Structure

| Fajl | Akcija | Odgovornost |
|---|---|---|
| `app/layout.tsx` | Modify (line 87) | Script strategy change: `afterInteractive` → `lazyOnload` |

---

## Task 1: Branch

- [ ] **Step 1: Clean tree + pull main**

Run:
```bash
cd /Users/nmil/Desktop/WeddingApp
git status
git branch --show-current
git pull origin main
```
Expected: on `main`, HEAD je `cdf8d03` ili noviji (post Phase 8).

- [ ] **Step 2: Branch**

Run:
```bash
git checkout -b perf-ga-lazyonload
```

(Napomena: `perf/...` branch namespace u ovom repo-u ponekad sukobljava sa postojećim `fix/` referencama. Koristimo `perf-` prefix sa dash-om da izbjegnemo.)

---

## Task 2: Script strategy change

**Files:**
- Modify: `app/layout.tsx` (linija ~87)

- [ ] **Step 1: Edit `app/layout.tsx`**

Pronađi drugi `<Script>` blok (fetch gtag.js). Trenutno izgleda:

```tsx
<Script
  strategy="afterInteractive"
  src="https://www.googletagmanager.com/gtag/js?id=G-Y5LM1PHT8H"
/>
```

Zamijeni sa:

```tsx
<Script
  strategy="lazyOnload"
  src="https://www.googletagmanager.com/gtag/js?id=G-Y5LM1PHT8H"
/>
```

**Jedina promjena:** `afterInteractive` → `lazyOnload`. Sve ostalo (src URL, id-ovi drugih scriptova, konsent default block) ostaje.

**NE dirati:**
- `<Script id="gtag-consent-default" strategy="beforeInteractive">` — mora ostati `beforeInteractive` jer postavlja `window.dataLayer` + `gtag` funkciju + consent default PRIJE bilo čega drugog. Ako ovo promjenimo, gtag() pozivi iz `useConsent.ts` hook-a bi failo-vali jer `window.gtag` ne bi postojao u trenutku accept klika.
- Ostali JSON-LD Script-ovi — njima ne trebaju promjene.

- [ ] **Step 2: TS check**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 errors.

---

## Task 3: Local verify

**Files:** none (verification only)

- [ ] **Step 1: Build**

Run:
```bash
rm -rf .next
pnpm build 2>&1 | tail -10
```
Expected: build success, sve 3 landing rute (`/`, `/sr`, `/en`) prerender kao static.

- [ ] **Step 2: Start + curl SSR HTML**

Run:
```bash
pnpm start &
sleep 5

echo "=== Script with gtag.js src present in SSR HTML? ==="
curl -s http://localhost:3000/sr | grep -oE 'src="[^"]*gtag\/js[^"]*"' | head -1

echo "=== Does Next hint mark it as lazyOnload (data-nscript attr)? ==="
curl -s http://localhost:3000/sr | grep -oE 'data-nscript="[^"]*"' | sort -u

echo "=== Consent default still inline-scripted (dataLayer bootstrap)? ==="
curl -s http://localhost:3000/sr | grep -c "dataLayer = window.dataLayer"

kill %1 2>/dev/null
```

Expected:
- gtag.js src je prisutan u SSR HTML-u (Next.js injects it pre-wire-up)
- `data-nscript` attribute values — trebalo bi da vidimo `lazyOnload` negdje (Next 15 signature)
- `dataLayer` bootstrap: 1 occurrence (prije nije promijenjeno)

**Napomena:** `data-nscript="lazyOnload"` vs `"afterInteractive"` varira po Next verziji. Glavni ishod je da curl pokaže gtag.js src u HTML-u + inline consent script nepromijenjen.

- [ ] **Step 3: Manual DevTools test**

Otvori `http://localhost:3000/sr` u browser-u (Chrome). DevTools:

1. **Network tab:**
   - Filter: `gtag`
   - Reload stranice
   - Očekivano: `gtag/js?id=G-Y5LM1PHT8H` NE fire-uje u prvom talasu request-ova. Fire-uje tek nakon što se svi ostali resursi (slike, fontovi, CSS, ostali JS chunks) završe — tj. **nakon** DOMContentLoaded + nakon što su slike učitane.
   - Poređenje sa prije (on main sans this fix): gtag.js je fire-ovao čim je page bio interactive, često pre LCP-a.

2. **Performance tab:**
   - Record + reload
   - Identifikuj "Largest Contentful Paint" marker
   - Očekivano: gtag.js request start **nakon** LCP marker-a

3. **Console:**
   - Nakon što se stranica potpuno učita, kucaj `window.gtag` i `window.dataLayer`
   - Očekivano: oba definisana (inline consent default radi)

4. **Consent flow test:**
   - Clear `localStorage` + refresh
   - Banner se pojavi
   - Klikni "Prihvatam" → provjeri `document.cookie` (treba da nema `_ga` JOŠ, jer gtag.js možda još nije stigao)
   - Sačekaj 3-5 sekundi (ili triggeruj window.onload dispatch manually)
   - Provjeri ponovo `document.cookie` → `_ga` i `_ga_*` trebaju biti prisutni
   - Ako se `_ga` NE setuje, consent-update poziv iz `useConsent.ts` je izgubljen — ROLLBACK change i javi.

**Ako bilo šta od ovog failuje** — ne commit-uj, ne push-uj. Istraži root cause.

---

## Task 4: Commit + push + PR

- [ ] **Step 1: Commit**

```bash
git add app/layout.tsx
git commit -m "perf(landing): defer Google Analytics fetch to lazyOnload

Moves the gtag.js script from afterInteractive to lazyOnload strategy.
Effect: browser fetches the 65 KiB GA SDK only AFTER the window.load
event fires — i.e., after LCP has been recorded. The GA SDK exits the
critical rendering path entirely.

Consent Mode v2 semantics preserved:
- gtag-consent-default inline Script still runs beforeInteractive,
  setting dataLayer + gtag fn + analytics_storage:denied default
- useConsent hook still pushes consent-update calls into dataLayer
  when user accepts; gtag.js processes queued calls when it eventually
  loads
- _ga / _ga_* cookies still set ONLY after user accepts; just delayed
  by ~300-500ms compared to before

Expected LCP: 2.9s → ~2.4s (into strict Core Web Vitals 'good' zone).
Expected Perf: 95 → 96-97."
```

- [ ] **Step 2: Push + PR**

```bash
git push -u origin perf-ga-lazyonload

gh pr create \
  --title "perf(ga): defer gtag.js via lazyOnload (LCP 2.9s → <2.5s target)" \
  --body "$(cat <<'EOF'
## Summary
One-line surgical fix to push LCP from 2.9s into strict Core Web Vitals 'good' zone (<2.5s).

## Change
`app/layout.tsx`: second GA Script block `strategy="afterInteractive"` → `strategy="lazyOnload"`.

## Why it works
- `afterInteractive` fires ~hydration complete, often before LCP paint
- `lazyOnload` fires during browser idle AFTER `window.load` event (after all images + fonts load)
- gtag.js (65 KiB) exits critical rendering path

## Consent preserved
Phase 1 PR #6 consent-mode-v2 integration keeps working unchanged:
- `gtag-consent-default` inline script remains `beforeInteractive` — sets dataLayer + gtag fn + `analytics_storage: denied` BEFORE anything else
- `useConsent` hook's `gtag('consent', 'update', {...})` calls get queued in dataLayer if gtag.js hasn't loaded yet; processed in order when it arrives
- `_ga` / `_ga_*` cookies still only set after user accepts consent — no behavioral change, just delayed ~300-500ms

## Expected impact
- LCP: 2.9s → ~2.4s
- Perf: 95 → 96-97
- Analytics accuracy: unchanged (dataLayer queue preserves pageview + consent events)

## Test plan
- [ ] CI pass (pnpm build + test:unit + lint + e2e)
- [ ] Manual DevTools: gtag.js request fires AFTER LCP marker in Performance timeline
- [ ] Manual consent flow: Accept banner → `_ga` cookie eventually appears (may take 1-3s vs immediate before)
- [ ] Live Lighthouse post-deploy: LCP < 2.5s confirmed

## Risk
Minimal. The consent bootstrap is a 1.2 KiB inline script that still runs pre-interactive; lazy-loaded gtag.js just processes already-queued dataLayer events when it arrives. Worst case rollback is trivial (revert strategy attribute).
EOF
)"
```

---

## Task 5: Post-merge live verification

**Files:** none

- [ ] **Step 1: Merge PR (nakon CI green-a)**

```bash
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull
```

- [ ] **Step 2: Čekaj Vercel deploy**

```bash
# Signal: gtag.js Script tag sa data-nscript='lazyOnload' u live SSR
for i in $(seq 1 20); do
  html=$(curl -s https://www.dodajuspomenu.com/sr 2>/dev/null)
  nscript=$(echo "$html" | grep -oE 'data-nscript="[^"]*"' | sort -u | tr '\n' ' ')
  echo "t=${i}: data-nscript values: $nscript"
  if echo "$nscript" | grep -q "lazyOnload"; then
    echo "DONE: lazyOnload strategy is live"
    break
  fi
  sleep 20
done
```

- [ ] **Step 3: Finalni Lighthouse**

```bash
mkdir -p claudedocs
# Warmup
npx -y lighthouse@latest https://www.dodajuspomenu.com/sr --only-categories=performance --output=json --output-path=/tmp/lh-warm.json --chrome-flags="--headless --no-sandbox" --quiet 2>&1 | tail -2

# Real measurement
npx -y lighthouse@latest https://www.dodajuspomenu.com/sr --only-categories=performance,accessibility,best-practices,seo --output=json --output=html --output-path=claudedocs/lh-ga-lazyonload --chrome-flags="--headless --no-sandbox" --quiet 2>&1 | tail -3

node -e '
const r = require("./claudedocs/lh-ga-lazyonload.report.json");
console.log("=== SR Mobile (post-GA-lazyonload) ===");
for (const k of ["performance","accessibility","best-practices","seo"]) {
  console.log("  " + k + ":", Math.round((r.categories[k]?.score ?? 0) * 100));
}
console.log("  LCP:", r.audits["largest-contentful-paint"].displayValue);
console.log("  FCP:", r.audits["first-contentful-paint"].displayValue);
console.log("  CLS:", r.audits["cumulative-layout-shift"].displayValue);
console.log("  TBT:", r.audits["total-blocking-time"].displayValue);
console.log("  Total weight:", r.audits["total-byte-weight"].displayValue);

const criticalPath = r.audits["critical-request-chains"]?.details?.chains;
console.log("\n=== GA in critical path? ===");
const chainStr = JSON.stringify(criticalPath || {});
console.log("  gtag.js in critical chains:", chainStr.includes("gtag") ? "YES (fail)" : "NO (pass)");
'
```

- [ ] **Step 4: Success criteria**

Expected:
- LCP < 2.5s (**strict good** CWV zone)
- Perf 96+
- `gtag.js in critical chains: NO` — potvrda da je izašao iz critical path-a
- Svi ostali metrici (CLS 0, TBT ≤ 50ms) zadržani

**Ako LCP ostane ≥ 2.5s:**
- Verify `data-nscript="lazyOnload"` je zaista u SSR HTML-u (možda je CDN cache warm sa starom verzijom — sačekaj 5-10 min, ponovi)
- Run WebPageTest filmstrip view — vizualno potvrdi da LCP paint fire-uje prije gtag.js request-a
- Ako je LCP element "Hero image" a gtag.js fire-uje prije nego što on completeu, lazy-load NE radi u ovom setup-u — potrebna je dublja analiza
- Ne deklariši done dok ne potvrdiš stvarni LCP pad na live

---

## Verification (end-to-end)

```bash
# 1. Build + test
rm -rf .next && pnpm build
pnpm test:unit  # expect 85/85 (no test regressions)

# 2. Live check (post-deploy)
curl -s https://www.dodajuspomenu.com/sr | grep -oE 'data-nscript="[^"]*"' | sort -u
# Expected includes: data-nscript="lazyOnload"

# 3. Live Lighthouse
npx -y lighthouse@latest https://www.dodajuspomenu.com/sr --only-categories=performance --quiet --output=json --chrome-flags="--headless --no-sandbox" 2>/dev/null | \
  node -e 'let d=""; process.stdin.on("data",c=>d+=c); process.stdin.on("end",()=>{
    const r = JSON.parse(d);
    console.log("Perf:", Math.round(r.categories.performance.score * 100));
    console.log("LCP:", r.audits["largest-contentful-paint"].displayValue);
  });'
```

---

## Followups (out of scope)

- **Remove `fetchPriority="high"` from hero preload link** if Lighthouse reports it competes with critical fetches — testing post-deploy will tell
- **Consider removing `anonymize_ip: true`** from config — it's deprecated in GA4 (automatically applied) but harmless
- **Evaluate if `optimizeCss` flag can be removed** — explored to not actually fire under Next 15.5.15 App Router; leaving as insurance costs nothing, but if clean-up PR-ovi su cilj, ukloni + uninstall critters
- **Submit sitemap u GSC** (nije vezano za ovaj plan, ali sajt je spreman)

---

## Critical files

- **Modified:** `app/layout.tsx` (1 line change: `strategy` attribute)

---

**Generisano 2026-04-20. Plan je surgical — jedan attribute change + verify da consent flow ostaje intact.**
