# Paywall LS Checkout i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LemonSqueezy hosted-checkout page shows the product name + description in the admin's locale (`sr` or `en`), not whatever single language was typed into the LS dashboard.

**Architecture:** LS `createCheckout` API supports `productOptions.name` + `productOptions.description` overrides per request. We add a `getLocalizedProductCopy(target, locale)` helper that maps `(purpose, tier?, locale) → { name, description }`, extend `createCheckoutUrl()` to accept a `locale` arg, and have every calling route pass `admin.language` from the authenticated session. No new LS variants, no schema changes.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, `@lemonsqueezy/lemonsqueezy.js` SDK, Jest unit tests.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `lib/lemonsqueezy/product-copy.ts` | NEW. Pure mapping `(purpose, tier?, locale) → { name, description }`. Hand-curated SR + EN strings | Create |
| `lib/lemonsqueezy/client.ts` | Accept `locale` in args + pass `productOptions.name`/`description` via `getLocalizedProductCopy` | Modify |
| `app/api/admin/events/route.tsx` | Pass `session.admin.language` as `locale` to `createCheckoutUrl` | Modify |
| `app/api/admin/events/upgrade/route.ts` | Same | Modify |
| `app/api/admin/events/pending-checkout/route.ts` | Same | Modify |
| `app/api/admin/events/extend-retention/route.ts` | Same | Modify |
| `__tests__/lib/lemonsqueezy-product-copy.test.ts` | NEW. Unit tests for the mapping | Create |
| `__tests__/lib/lemonsqueezy-client.test.ts` | Update existing tests to assert `productOptions.name/description` based on locale | Modify |

All 4 routes already have `admin.language` available (`getAuthenticatedAdmin()` returns it via the `admin.language` field, default `'sr'`) — no new auth surface needed.

---

## Task 1 — Product copy mapping

**Files:**
- Create: `lib/lemonsqueezy/product-copy.ts`
- Test: `__tests__/lib/lemonsqueezy-product-copy.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/lemonsqueezy-product-copy.test.ts`:

```ts
import { getLocalizedProductCopy } from '@/lib/lemonsqueezy/product-copy';

describe('getLocalizedProductCopy', () => {
  describe('initial_purchase', () => {
    it('returns SR copy for basic tier', () => {
      const copy = getLocalizedProductCopy({ purpose: 'initial_purchase', tier: 'basic' }, 'sr');
      expect(copy.name).toBe('Svadbeni paket — Basic');
      expect(copy.description).toMatch(/7 slika/);
    });
    it('returns EN copy for basic tier', () => {
      const copy = getLocalizedProductCopy({ purpose: 'initial_purchase', tier: 'basic' }, 'en');
      expect(copy.name).toBe('Wedding Package — Basic');
      expect(copy.description).toMatch(/7 photos/);
    });
    it('returns SR copy for premium tier', () => {
      const copy = getLocalizedProductCopy({ purpose: 'initial_purchase', tier: 'premium' }, 'sr');
      expect(copy.name).toBe('Svadbeni paket — Premium');
      expect(copy.description).toMatch(/25 slika/);
    });
    it('returns EN copy for premium tier', () => {
      const copy = getLocalizedProductCopy({ purpose: 'initial_purchase', tier: 'premium' }, 'en');
      expect(copy.name).toBe('Wedding Package — Premium');
      expect(copy.description).toMatch(/25 photos/);
    });
  });

  describe('upgrade', () => {
    it('returns SR copy for free→basic', () => {
      const copy = getLocalizedProductCopy({ purpose: 'upgrade', fromTier: 'free', toTier: 'basic' }, 'sr');
      expect(copy.name).toBe('Nadogradnja na Basic');
      expect(copy.description).toMatch(/Basic paket/);
    });
    it('returns EN copy for free→premium', () => {
      const copy = getLocalizedProductCopy({ purpose: 'upgrade', fromTier: 'free', toTier: 'premium' }, 'en');
      expect(copy.name).toBe('Upgrade to Premium');
      expect(copy.description).toMatch(/Premium package/);
    });
    it('returns SR copy for basic→premium', () => {
      const copy = getLocalizedProductCopy({ purpose: 'upgrade', fromTier: 'basic', toTier: 'premium' }, 'sr');
      expect(copy.name).toBe('Nadogradnja Basic → Premium');
      expect(copy.description).toMatch(/razlika/);
    });
    it('returns EN copy for basic→premium', () => {
      const copy = getLocalizedProductCopy({ purpose: 'upgrade', fromTier: 'basic', toTier: 'premium' }, 'en');
      expect(copy.name).toBe('Upgrade Basic → Premium');
      expect(copy.description).toMatch(/difference/);
    });
  });

  describe('retention_extension', () => {
    it('returns SR copy', () => {
      const copy = getLocalizedProductCopy({ purpose: 'retention_extension' }, 'sr');
      expect(copy.name).toBe('Produženje čuvanja — 30 dana');
      expect(copy.description).toMatch(/30 dana/);
    });
    it('returns EN copy', () => {
      const copy = getLocalizedProductCopy({ purpose: 'retention_extension' }, 'en');
      expect(copy.name).toBe('Retention Extension — 30 days');
      expect(copy.description).toMatch(/30 days/);
    });
  });

  describe('locale fallback', () => {
    it('falls back to SR when locale is undefined', () => {
      const copy = getLocalizedProductCopy({ purpose: 'initial_purchase', tier: 'basic' }, undefined as any);
      expect(copy.name).toBe('Svadbeni paket — Basic');
    });
    it('falls back to SR when locale is unknown string', () => {
      const copy = getLocalizedProductCopy({ purpose: 'initial_purchase', tier: 'basic' }, 'fr' as any);
      expect(copy.name).toBe('Svadbeni paket — Basic');
    });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd /Users/nmil/Desktop/WeddingApp
pnpm test:unit -- lemonsqueezy-product-copy 2>&1 | tail -15
```

Expected: FAIL with `Cannot find module '@/lib/lemonsqueezy/product-copy'`.

- [ ] **Step 3: Implement the module**

Create `lib/lemonsqueezy/product-copy.ts`:

```ts
import type { CheckoutTarget } from '@/lib/lemonsqueezy/variants';

export type Locale = 'sr' | 'en';

export interface ProductCopy {
  name: string;
  description: string;
}

/**
 * Localized product name + description shown on the LemonSqueezy hosted checkout page.
 * LS variants are configured once in the LS dashboard; we override per-checkout via
 * productOptions to match the admin's locale.
 */
export function getLocalizedProductCopy(target: CheckoutTarget, locale: Locale): ProductCopy {
  const safeLocale: Locale = locale === 'en' ? 'en' : 'sr';

  if (target.purpose === 'initial_purchase') {
    if (target.tier === 'basic') {
      return safeLocale === 'sr'
        ? {
            name: 'Svadbeni paket — Basic',
            description: 'Digitalni svadbeni album: 7 slika po gostu, 30 dana čuvanja, standardni QR kod, optimizovan kvalitet.',
          }
        : {
            name: 'Wedding Package — Basic',
            description: 'Digital wedding album: 7 photos per guest, 30 days retention, standard QR code, optimized quality.',
          };
    }
    if (target.tier === 'premium') {
      return safeLocale === 'sr'
        ? {
            name: 'Svadbeni paket — Premium',
            description: 'Digitalni svadbeni album: 25 slika po gostu, 30 dana čuvanja, prilagođen QR kod, originali bez kompresije.',
          }
        : {
            name: 'Wedding Package — Premium',
            description: 'Digital wedding album: 25 photos per guest, 30 days retention, custom QR code, originals with no compression.',
          };
    }
  }

  if (target.purpose === 'upgrade') {
    if (target.fromTier === 'basic' && target.toTier === 'premium') {
      return safeLocale === 'sr'
        ? {
            name: 'Nadogradnja Basic → Premium',
            description: 'Plati razliku do Premium paketa: 25 slika po gostu, originali, prilagođen QR kod.',
          }
        : {
            name: 'Upgrade Basic → Premium',
            description: 'Pay the difference for Premium: 25 photos per guest, originals, custom QR code.',
          };
    }
    if (target.fromTier === 'free' && target.toTier === 'basic') {
      return safeLocale === 'sr'
        ? {
            name: 'Nadogradnja na Basic',
            description: 'Otključaj Basic paket: 7 slika po gostu, 30 dana čuvanja, standardni QR kod.',
          }
        : {
            name: 'Upgrade to Basic',
            description: 'Unlock Basic package: 7 photos per guest, 30 days retention, standard QR code.',
          };
    }
    if (target.fromTier === 'free' && target.toTier === 'premium') {
      return safeLocale === 'sr'
        ? {
            name: 'Nadogradnja na Premium',
            description: 'Otključaj Premium paket: 25 slika po gostu, originali, prilagođen QR kod.',
          }
        : {
            name: 'Upgrade to Premium',
            description: 'Unlock Premium package: 25 photos per guest, originals, custom QR code.',
          };
    }
  }

  if (target.purpose === 'retention_extension') {
    return safeLocale === 'sr'
      ? {
          name: 'Produženje čuvanja — 30 dana',
          description: 'Produži čuvanje slika i poruka za dodatnih 30 dana.',
        }
      : {
          name: 'Retention Extension — 30 days',
          description: 'Extend storage of photos and messages for an additional 30 days.',
        };
  }

  // Unreachable for well-typed inputs; defensive default.
  return { name: 'WeddingApp', description: '' };
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
pnpm test:unit -- lemonsqueezy-product-copy 2>&1 | tail -15
```

Expected: all 12 tests pass.

- [ ] **Step 5: Full regression sweep**

```bash
pnpm test:unit 2>&1 | tail -5
```

Expected: previous count + 12 new = 222 (was 210).

- [ ] **Step 6: Commit**

```bash
git add lib/lemonsqueezy/product-copy.ts __tests__/lib/lemonsqueezy-product-copy.test.ts
git -c commit.gpgsign=false commit -m "feat(paywall): localized product copy mapping for LS checkout overrides"
```

---

## Task 2 — Extend createCheckoutUrl with locale + productOptions overrides

**Files:**
- Modify: `lib/lemonsqueezy/client.ts`
- Modify: `__tests__/lib/lemonsqueezy-client.test.ts`

- [ ] **Step 1: Read current client + test files**

```bash
cat lib/lemonsqueezy/client.ts
cat __tests__/lib/lemonsqueezy-client.test.ts
```

You'll see `CreateCheckoutArgs` has 4 fields and `createCheckout` is called with `productOptions: { redirectUrl }` only.

- [ ] **Step 2: Update tests FIRST**

Edit `__tests__/lib/lemonsqueezy-client.test.ts`. Update the imports section (add `CheckoutTarget` type if used):

Add a new test inside the existing `describe('createCheckoutUrl')` block (before the closing `});`):

```ts
  it('passes localized productOptions.name + description based on locale arg', async () => {
    await createCheckoutUrl({
      variantId: 'var_basic',
      customerEmail: 'a@b.c',
      customData: { event_id: 'e', admin_id: 'a', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://x',
      locale: 'sr',
      checkoutTarget: { purpose: 'initial_purchase', tier: 'basic' },
    });
    expect(createCheckout).toHaveBeenCalledWith('99', 'var_basic', expect.objectContaining({
      productOptions: expect.objectContaining({
        name: 'Svadbeni paket — Basic',
        description: expect.stringMatching(/7 slika/),
      }),
    }));
  });

  it('uses EN copy when locale=en', async () => {
    await createCheckoutUrl({
      variantId: 'var_premium',
      customerEmail: 'a@b.c',
      customData: { event_id: 'e', admin_id: 'a', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://x',
      locale: 'en',
      checkoutTarget: { purpose: 'initial_purchase', tier: 'premium' },
    });
    expect(createCheckout).toHaveBeenCalledWith('99', 'var_premium', expect.objectContaining({
      productOptions: expect.objectContaining({
        name: 'Wedding Package — Premium',
        description: expect.stringMatching(/25 photos/),
      }),
    }));
  });
```

Also update the EXISTING `'returns checkout URL on success'` test — its current call to `createCheckoutUrl` is missing the new required `locale` and `checkoutTarget` args. Add them:

Find:
```ts
    const url = await createCheckoutUrl({
      variantId: 'var_basic',
      customerEmail: 'admin@example.com',
      customData: { eventId: 'e1', adminId: 'a1', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://app.test/admin/dashboard/e1?paid=1',
    });
```

Replace with:
```ts
    const url = await createCheckoutUrl({
      variantId: 'var_basic',
      customerEmail: 'admin@example.com',
      customData: { event_id: 'e1', admin_id: 'a1', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://app.test/admin/dashboard/e1?paid=1',
      locale: 'sr',
      checkoutTarget: { purpose: 'initial_purchase', tier: 'basic' },
    });
```

(Note: snake_case `event_id`/`admin_id` is the existing convention — if the test was using camelCase pre-existing, leave that part alone; the new locale + checkoutTarget fields are the only required additions.)

Same treatment for the OTHER 3 existing tests in this file that call `createCheckoutUrl` — append `locale: 'sr', checkoutTarget: { purpose: 'initial_purchase', tier: 'basic' }` to their args. The exact `checkoutTarget` shape can match the test's intent (e.g., upgrade tests would use a `{ purpose: 'upgrade', fromTier: ..., toTier: ... }` target — but for the existing tests that just verify error paths, `initial_purchase + basic` is fine since they're not asserting on productOptions).

- [ ] **Step 3: Run, expect fail**

```bash
pnpm test:unit -- lemonsqueezy-client 2>&1 | tail -20
```

Expected: tests fail with TypeScript error about missing properties on `CreateCheckoutArgs` (`locale`, `checkoutTarget`).

- [ ] **Step 4: Update `lib/lemonsqueezy/client.ts`**

Replace the file entirely with:

```ts
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { getLocalizedProductCopy, type Locale } from '@/lib/lemonsqueezy/product-copy';
import type { CheckoutTarget } from '@/lib/lemonsqueezy/variants';

export interface CustomCheckoutData {
  event_id: string;
  admin_id: string;
  purpose: 'initial_purchase' | 'upgrade' | 'retention_extension';
  to_tier?: 'basic' | 'premium';
  [key: string]: string | undefined;
}

export interface CreateCheckoutArgs {
  variantId: string;
  customerEmail: string;
  customData: CustomCheckoutData;
  successRedirectUrl: string;
  /**
   * Admin's UI locale ('sr' or 'en'). Used to override the LS-stored product
   * name/description on the hosted checkout page so the buyer sees the right
   * language regardless of what was typed in the LS dashboard.
   */
  locale: Locale;
  /**
   * The same target object passed to `resolveVariantId` — used to look up the
   * localized product copy.
   */
  checkoutTarget: CheckoutTarget;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

let initialized = false;
function ensureSetup() {
  if (initialized) return;
  lemonSqueezySetup({ apiKey: requireEnv('LEMONSQUEEZY_API_KEY') });
  initialized = true;
}

export async function createCheckoutUrl(args: CreateCheckoutArgs): Promise<string> {
  ensureSetup();
  const storeId = requireEnv('LEMONSQUEEZY_STORE_ID');

  const copy = getLocalizedProductCopy(args.checkoutTarget, args.locale);

  const { data, error } = await createCheckout(storeId, args.variantId, {
    checkoutData: {
      email: args.customerEmail,
      custom: args.customData,
    },
    productOptions: {
      redirectUrl: args.successRedirectUrl,
      name: copy.name,
      description: copy.description,
    },
    testMode: process.env.LEMONSQUEEZY_TEST_MODE === '1',
  });

  if (error) throw new Error(`LS createCheckout failed: ${error.message}`);
  const url = data?.data?.attributes?.url;
  if (!url) throw new Error('LS createCheckout returned no URL');
  return url;
}

/** Exposed only for tests: resets the module-level init flag. */
export function __resetForTest(): void {
  initialized = false;
}
```

- [ ] **Step 5: Run tests, expect pass**

```bash
pnpm test:unit -- lemonsqueezy-client 2>&1 | tail -15
```

Expected: all client tests pass (including the 2 new locale tests).

- [ ] **Step 6: Full regression**

```bash
pnpm test:unit 2>&1 | tail -5
```

Expected: 224 (222 + 2 new locale tests). May break tests in 4 calling routes — DO NOT fix them in this task; that's Task 3-6. Note any failures; they should be exclusively in `admin-events-paywall`, `admin-events-upgrade`, `extend-retention-paywall`, or webhook test files that mock `createCheckoutUrl`. If any OTHER test fails, debug here.

- [ ] **Step 7: Commit**

```bash
git add lib/lemonsqueezy/client.ts __tests__/lib/lemonsqueezy-client.test.ts
git -c commit.gpgsign=false commit -m "feat(paywall): createCheckoutUrl accepts locale + checkoutTarget for productOptions override"
```

---

## Task 3 — Wire locale in event creation route

**Files:**
- Modify: `app/api/admin/events/route.tsx`
- Modify: `__tests__/api/admin-events-paywall.test.ts`

- [ ] **Step 1: Update tests FIRST**

Read the test:
```bash
cat __tests__/api/admin-events-paywall.test.ts | head -50
```

Find the test `'creates paid event pending + Payment(pending) + returns checkoutUrl'` (or current variant). It already asserts on `createCheckoutUrl` call args via `expect.objectContaining`. Add `locale` + `checkoutTarget` assertions:

```ts
    expect(createCheckoutUrl).toHaveBeenCalledWith(expect.objectContaining({
      customerEmail: 'a@b.c',
      customData: expect.objectContaining({
        event_id: 'e_paid',
        admin_id: 'a1',
        purpose: 'initial_purchase',
      }),
      locale: 'sr',  // admin.language default
      checkoutTarget: { purpose: 'initial_purchase', tier: 'basic' },
    }));
```

Also: the admin mock in this test should include `language`. Find the `prisma.admin.findUnique.mockResolvedValue({ language: 'sr' })` line — verify it's present (already was after M2 setup); if not, add it.

- [ ] **Step 2: Run, expect fail**

```bash
pnpm test:unit -- admin-events-paywall 2>&1 | tail -15
```

Expected: assertion failure (createCheckoutUrl called without locale/checkoutTarget).

- [ ] **Step 3: Update the route**

In `app/api/admin/events/route.tsx`, find the existing `createCheckoutUrl({...})` call (around line 124). It currently passes `variantId, customerEmail, customData, successRedirectUrl`. Add 2 fields:

```ts
    const checkoutUrl = await createCheckoutUrl({
      variantId,
      customerEmail: session.admin.email,
      customData: {
        event_id: event.id,
        admin_id: adminId,
        purpose: 'initial_purchase',
      },
      successRedirectUrl: `${baseUrl}admin/dashboard/${event.id}?paid=1`,
      locale: (admin?.language === 'en' ? 'en' : 'sr'),
      checkoutTarget: { purpose: 'initial_purchase', tier: selectedTier as 'basic' | 'premium' },
    });
```

Note: `admin` (from `prisma.admin.findUnique({ select: { language: true } })`) is already fetched earlier in this route — reuse that variable. If the variable is named differently locally, adapt the reference.

- [ ] **Step 4: Run, expect pass**

```bash
pnpm test:unit -- admin-events-paywall 2>&1 | tail -15
```

- [ ] **Step 5: Full regression**

```bash
pnpm test:unit 2>&1 | tail -5
```

Expected: same count as after Task 2 (no NEW failures, possibly the same other 3 routes still pending — that's Task 4-6).

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/events/route.tsx __tests__/api/admin-events-paywall.test.ts
git -c commit.gpgsign=false commit -m "feat(paywall): pass admin locale to LS checkout in event creation route"
```

---

## Task 4 — Wire locale in upgrade route

**Files:**
- Modify: `app/api/admin/events/upgrade/route.ts`
- Modify: `__tests__/api/admin-events-upgrade.test.ts`

- [ ] **Step 1: Update tests FIRST**

In `__tests__/api/admin-events-upgrade.test.ts`, find the 2 happy-path tests (free→basic and basic→premium). Each calls `expect(createCheckoutUrl).toHaveBeenCalledWith(expect.objectContaining({...}))`. Add `locale` + `checkoutTarget`:

For the free→basic test:
```ts
    expect(createCheckoutUrl).toHaveBeenCalledWith(expect.objectContaining({
      customerEmail: 'a@b.c',
      customData: expect.objectContaining({
        event_id: 'e1', admin_id: 'a1', purpose: 'upgrade', to_tier: 'basic',
      }),
      locale: 'sr',
      checkoutTarget: { purpose: 'upgrade', fromTier: 'free', toTier: 'basic' },
    }));
```

For the basic→premium test:
```ts
    expect(createCheckoutUrl).toHaveBeenCalledWith(expect.objectContaining({
      customData: expect.objectContaining({ to_tier: 'premium' }),
      locale: 'sr',
      checkoutTarget: { purpose: 'upgrade', fromTier: 'basic', toTier: 'premium' },
    }));
```

Also: the `getAuthenticatedAdmin` mock in this test does not currently set `language`. Add `language: 'sr'` to the admin mock object in the happy-path tests (next to `id`, `email`).

Example:
```ts
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c', language: 'sr',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'free' },
    });
```

- [ ] **Step 2: Run, expect fail**

```bash
pnpm test:unit -- admin-events-upgrade 2>&1 | tail -15
```

- [ ] **Step 3: Update the route**

In `app/api/admin/events/upgrade/route.ts`, find the `createCheckoutUrl` call. Add 2 fields:

```ts
  const checkoutUrl = await createCheckoutUrl({
    variantId,
    customerEmail: admin.email,
    customData: {
      event_id: admin.event.id,
      admin_id: admin.id,
      purpose: 'upgrade',
      to_tier: toTier,
    },
    successRedirectUrl: `${baseUrl}admin/dashboard/${admin.event.id}?upgraded=1`,
    locale: (admin.language === 'en' ? 'en' : 'sr'),
    checkoutTarget: { purpose: 'upgrade', fromTier, toTier },
  });
```

Note: `admin.language` must exist on the type returned by `getAuthenticatedAdmin()`. If TypeScript complains, check that `lib/admin-auth.ts` `select` includes `language: true` on admin (it was added in an earlier M2 task). If not present, add it to the select.

- [ ] **Step 4: Run, expect pass**

```bash
pnpm test:unit -- admin-events-upgrade 2>&1 | tail -15
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/events/upgrade/route.ts __tests__/api/admin-events-upgrade.test.ts
git -c commit.gpgsign=false commit -m "feat(paywall): pass admin locale to LS checkout in upgrade route"
```

---

## Task 5 — Wire locale in pending-checkout regenerate route

**Files:**
- Modify: `app/api/admin/events/pending-checkout/route.ts`

- [ ] **Step 1: Read current state**

```bash
cat app/api/admin/events/pending-checkout/route.ts
```

This route doesn't have a dedicated test file (per current setup). The change is mechanical — just add 2 fields to the existing `createCheckoutUrl` call.

- [ ] **Step 2: Update the route**

Find the `createCheckoutUrl` call. Add `locale` + `checkoutTarget`:

```ts
  const checkoutUrl = await createCheckoutUrl({
    variantId,
    customerEmail: admin.email,
    customData: {
      event_id: admin.event.id,
      admin_id: admin.id,
      purpose: 'initial_purchase',
    },
    successRedirectUrl: `${baseUrl}admin/dashboard/${admin.event.id}?paid=1`,
    locale: (admin.language === 'en' ? 'en' : 'sr'),
    checkoutTarget: { purpose: 'initial_purchase', tier: admin.event.pricingTier as 'basic' | 'premium' },
  });
```

- [ ] **Step 3: Run full regression**

```bash
pnpm test:unit 2>&1 | tail -5
```

Expected: no new failures; this route had no test asserting on createCheckoutUrl args.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/events/pending-checkout/route.ts
git -c commit.gpgsign=false commit -m "feat(paywall): pass admin locale to LS checkout in pending-checkout regenerate route"
```

---

## Task 6 — Wire locale in retention extension route

**Files:**
- Modify: `app/api/admin/events/extend-retention/route.ts`
- Modify: `__tests__/api/extend-retention-paywall.test.ts`

- [ ] **Step 1: Update tests FIRST**

In `__tests__/api/extend-retention-paywall.test.ts`, find the happy-path test `'returns checkoutUrl for activated basic tier admin'`. It calls `expect(createCheckoutUrl).toHaveBeenCalledWith(expect.objectContaining({...}))`. Add:

```ts
    expect(createCheckoutUrl).toHaveBeenCalledWith(expect.objectContaining({
      customData: expect.objectContaining({
        event_id: 'e1', admin_id: 'a1', purpose: 'retention_extension',
      }),
      locale: 'sr',
      checkoutTarget: { purpose: 'retention_extension' },
    }));
```

Add `language: 'sr'` to the admin mock object in the happy-path test (next to `id`, `email`).

- [ ] **Step 2: Run, expect fail**

```bash
pnpm test:unit -- extend-retention-paywall 2>&1 | tail -15
```

- [ ] **Step 3: Update the route**

In `app/api/admin/events/extend-retention/route.ts`, find the `createCheckoutUrl` call. Add 2 fields:

```ts
  const checkoutUrl = await createCheckoutUrl({
    variantId,
    customerEmail: admin.email,
    customData: {
      event_id: admin.event.id,
      admin_id: admin.id,
      purpose: 'retention_extension',
    },
    successRedirectUrl: `${baseUrl}admin/dashboard/${admin.event.id}?retention=1`,
    locale: (admin.language === 'en' ? 'en' : 'sr'),
    checkoutTarget: { purpose: 'retention_extension' },
  });
```

- [ ] **Step 4: Run, expect pass**

```bash
pnpm test:unit -- extend-retention-paywall 2>&1 | tail -15
```

- [ ] **Step 5: Full regression**

```bash
pnpm test:unit 2>&1 | tail -5
```

Expected: ALL tests pass. Final count: 224 (was 210 + 12 product-copy + 2 client = 224).

- [ ] **Step 6: Build check**

```bash
pnpm build 2>&1 | tail -10
```

Must succeed.

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/events/extend-retention/route.ts __tests__/api/extend-retention-paywall.test.ts
git -c commit.gpgsign=false commit -m "feat(paywall): pass admin locale to LS checkout in retention extension route"
```

---

## Task 7 — Push + PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin feature/paywall-ls-checkout-i18n 2>&1 | tail -3
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "feat(paywall): localize LS hosted checkout name + description per admin locale" --body "$(cat <<'EOF'
## Summary

LemonSqueezy hosted-checkout page now shows the product name + description in the admin's UI locale (\`sr\` or \`en\`) rather than whatever single language was typed into the LS dashboard.

## How it works

LS \`createCheckout\` API supports \`productOptions.name\` + \`productOptions.description\` overrides per request. We added:

1. \`lib/lemonsqueezy/product-copy.ts\` — pure mapping \`(purpose, tier?, locale) → { name, description }\` with hand-curated SR + EN strings for all 3 purchase types and all upgrade paths.
2. \`createCheckoutUrl\` now requires \`locale: Locale\` + \`checkoutTarget: CheckoutTarget\` args, used to resolve copy.
3. All 4 calling routes pass \`admin.language\` (from authenticated session) as \`locale\`.

No new LS variants, no schema changes, no env var changes.

## Locale handling

- Falls back to \`'sr'\` if locale is \`undefined\` or unknown.
- Admin's \`language\` field is the source of truth (\`'sr'\` default, set at register based on UI locale).
- Buyer (not always = admin) sees checkout in admin's chosen language. This is the right call — admin is the customer-of-record, they pick the experience for their guests/buyers.

## Test status

- 12 new product-copy unit tests
- 2 new client tests verifying productOptions.name/description overrides
- 4 existing route tests updated to assert locale + checkoutTarget on createCheckoutUrl call
- Expected total: 224 unit tests (was 210), 0 regressions

## Test plan

- [ ] Merge → Vercel deploy
- [ ] Log in as SR admin, navigate to /admin/upgrade, click Premium → LS checkout shows "Nadogradnja na Premium" + SR description
- [ ] Switch admin language to EN (via /api/admin/me or direct DB update), repeat → LS shows "Upgrade to Premium" + EN description
- [ ] Same verification for initial purchase + retention extension flows

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" 2>&1 | tail -3
```

Report PR URL.

---

## Final test budget

| Task | Tests added/changed | Cumulative |
|---|---|---|
| Baseline (post-M2/M3 fixes) | — | 210 |
| Task 1 (product copy) | +12 | 222 |
| Task 2 (client) | +2 | 224 |
| Tasks 3-6 (routes) | 0 added (assertion updates only) | 224 |

**Final: 224/224 unit tests passing, 0 regressions.**
