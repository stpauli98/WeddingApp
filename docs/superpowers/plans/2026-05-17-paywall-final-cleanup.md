# Paywall Final Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address all actionable findings from the final holistic paywall review (`docs/superpowers/specs/2026-05-17-paywall-followup-fixes.md` + final-review verdict) so the paywall stack is ready for the `LEMONSQUEEZY_TEST_MODE=0` live-mode switch.

**Architecture:** Surgical fixes only — no architectural rework. 2 HIGH correctness fixes (state-machine redirect + race condition), 2 MEDIUM functional fixes (unlimited tier rejection + dead-column drop), 3 LOW polish fixes (log prefix consistency, i18n on pending page, CLAUDE.md docs). Each task ships independently and is unit-tested where behavior changes.

**Tech Stack:** Next.js 15 App Router, Prisma 6, TypeScript strict, Jest+ts-jest. Branch off latest `main` (HEAD `dc01d24` at time of writing).

**Out of scope (deferred):**
- M1 PaymentStatus enum cleanup (`pending`, `partial`, `failed` are unused but dropping enum values in Postgres requires a multi-step migration that's not worth the risk — leave as documented "reserved")
- M4 DB integration test (separate larger effort)
- M3 customerEmail rename (only worth a code comment, addressed in L1 batch)

**Sequencing:** Phase 1 (HIGH) must merge before live-mode switch. Phases 2–3 can ship together as a follow-up PR.

---

## Phase 1 — HIGH correctness fixes

### Task 1: Dashboard index redirect for pending events (H1)

**Files:**
- Modify: `app/admin/dashboard/page.tsx` (around lines 20-30)

**Why:** Admin with paid-tier pending event hitting `/{lang}/admin/dashboard` currently redirects to `/{lang}/admin/dashboard/{eventId}`, which then re-redirects to `/{lang}/admin/event/pending`. Two-hop redirect bounce. Short-circuit at the index.

- [ ] **Step 1: Read current state**

```bash
cd /Users/nmil/Desktop/WeddingApp
cat app/admin/dashboard/page.tsx
```

You should see a server component that looks up the admin's event and redirects to `/admin/dashboard/{event.id}` (or to `/admin/event` if no event exists). Note the exact variable names used (e.g., `admin`, `event`).

- [ ] **Step 2: Add pending-state short-circuit**

In `app/admin/dashboard/page.tsx`, find the line that does `redirect(\`/admin/dashboard/\${event.id}\`)` (or similar). Immediately ABOVE that line, add:

```ts
  // Short-circuit pending events to avoid a redirect bounce via [eventId] page.
  if (event && !event.activatedAt) {
    redirect('/admin/event/pending');
  }
```

Verify the existing imports include `redirect` from `next/navigation`. If not, add it.

- [ ] **Step 3: Verify the event row exposes `activatedAt`**

```bash
grep -A 5 "select:" app/admin/dashboard/page.tsx | head -15
```

If `activatedAt` is not in the `select`, add it. The `getAuthenticatedAdmin()` helper already returns events with `activatedAt` (verified in `lib/admin-auth.ts`), so if the page uses that helper, no select change is needed.

- [ ] **Step 4: Run full test suite — no test exists for this server-component redirect; verify no regression**

```bash
pnpm test:unit 2>&1 | tail -5
```

Expected: 199 passing (no change).

- [ ] **Step 5: Commit**

```bash
git add app/admin/dashboard/page.tsx
git -c commit.gpgsign=false commit -m "fix(paywall): dashboard index short-circuits pending events to /admin/event/pending

Avoids a 2-hop redirect bounce when admin with paid-but-unactivated
event hits the dashboard index. Previously: index → /dashboard/[id]
→ /event/pending. Now: index → /event/pending."
```

---

### Task 2: Cancel-pending race fix (H2)

**Files:**
- Modify: `app/api/admin/events/cancel-pending/route.ts`
- Test: `__tests__/api/cancel-pending.test.ts` (CREATE)

**Why:** Current flow: read `admin.event.activatedAt` → if null, run `$transaction([deleteMany payments, delete event])`. If a webhook commits `activatedAt = now()` between the read and the transaction, we delete a now-active event.

Fix: use `prisma.event.deleteMany({ where: { id, activatedAt: null } })` so the WHERE clause is part of the same atomic operation. Check `count` to know whether deletion happened.

- [ ] **Step 1: Read current state**

```bash
cd /Users/nmil/Desktop/WeddingApp
cat app/api/admin/events/cancel-pending/route.ts
```

You should see the POST handler with the activatedAt guard, the deleteMany payments call, and the event.delete call inside `$transaction`.

- [ ] **Step 2: Write failing test FIRST**

Create `__tests__/api/cancel-pending.test.ts`:

```ts
/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({
  prisma: {
    payment: { deleteMany: jest.fn() },
    event: { deleteMany: jest.fn() },
    $transaction: jest.fn(async (ops) => Promise.all(ops)),
  },
}));
jest.mock('@/lib/admin-auth', () => ({ getAuthenticatedAdmin: jest.fn() }));
jest.mock('@/lib/csrf', () => ({
  validateCsrfToken: jest.fn(async () => true),
  generateCsrfToken: jest.fn(async () => ({ token: 't', cookie: 'c' })),
}));

import { POST } from '@/app/api/admin/events/cancel-pending/route';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';

function req() {
  return new Request('https://x/api/admin/events/cancel-pending', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': 't' },
    body: '{}',
  });
}

describe('POST /api/admin/events/cancel-pending — race-safe deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses deleteMany({where: id + activatedAt: null}) so concurrent webhook activation blocks the delete', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: null, pricingTier: 'basic' },
    });
    // Simulate: event was activated between guard read and transaction commit.
    // deleteMany with activatedAt: null condition would match 0 rows.
    (prisma.event.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    (prisma.payment.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });

    const res = await POST(req());
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/already active|race/i);
    expect(prisma.event.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'e1', activatedAt: null }),
    }));
  });

  it('succeeds when event is still pending at delete time', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: null, pricingTier: 'basic' },
    });
    (prisma.event.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 1 });
    (prisma.payment.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });

    const res = await POST(req());
    expect(res.status).toBe(200);
  });

  it('rejects 409 if admin.event.activatedAt is non-null at guard time', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'basic' },
    });
    const res = await POST(req());
    expect(res.status).toBe(409);
    expect(prisma.event.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects 401 unauthenticated', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce(null);
    const res = await POST(req());
    expect([401, 404]).toContain(res.status);
  });
});
```

- [ ] **Step 3: Run, expect fail**

```bash
pnpm test:unit -- cancel-pending 2>&1 | tail -15
```

Expected: tests run but fail because current implementation uses `event.delete` (not `deleteMany`) and doesn't return 409 on race.

- [ ] **Step 4: Refactor the route**

Replace the `$transaction` block in `app/api/admin/events/cancel-pending/route.ts`. The new flow:

```ts
  // Atomic check-and-delete: WHERE clause ensures concurrent activation blocks the delete.
  // payment.deleteMany is safe to run unconditionally — if the event was activated
  // between guard and now, the next event.deleteMany returns count=0 and we report 409.
  const eventId = admin.event.id;
  const [, eventDelete] = await prisma.$transaction([
    prisma.payment.deleteMany({ where: { eventId } }),
    prisma.event.deleteMany({ where: { id: eventId, activatedAt: null } }),
  ]);

  if (eventDelete.count === 0) {
    // Event was activated between guard and delete — race lost; webhook wins.
    return NextResponse.json(
      { error: 'Plaćanje je u međuvremenu potvrđeno — event je sad aktivan.' },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
```

Replace the existing transaction + return. Keep all other code (CSRF, auth, activatedAt guard) unchanged.

- [ ] **Step 5: Run tests, expect pass**

```bash
pnpm test:unit -- cancel-pending 2>&1 | tail -15
```

Expected: 4 tests pass.

- [ ] **Step 6: Run full suite**

```bash
pnpm test:unit 2>&1 | tail -5
```

Expected: previous + 4 = 203 tests passing (was 199).

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/events/cancel-pending/route.ts __tests__/api/cancel-pending.test.ts
git -c commit.gpgsign=false commit -m "fix(paywall): cancel-pending race window — atomic deleteMany WHERE activatedAt IS NULL

If a webhook commits activatedAt between the initial guard read and
the transaction commit, the old flow would delete an active event +
its paid Payment, silently destroying a successful purchase. New flow
moves the activatedAt check INSIDE deleteMany's WHERE clause so the
DB does the check atomically; we return 409 if count=0."
```

---

## Phase 2 — MEDIUM functional fixes

### Task 3: Reject `unlimited` tier in upgrade + extend-retention (M5)

**Files:**
- Modify: `app/api/admin/events/upgrade/route.ts`
- Modify: `app/api/admin/events/extend-retention/route.ts`
- Modify: `__tests__/api/admin-events-upgrade.test.ts` (add 1 test)
- Modify: `__tests__/api/extend-retention-paywall.test.ts` (add 1 test)

**Why:** Grandfathered `unlimited` tier events still exist. Currently they hit `TIER_ORDER.indexOf('unlimited') === -1` in upgrade → returns "downgrades not supported" (wrong message). Should be explicit "already on highest plan."

- [ ] **Step 1: Write failing tests**

In `__tests__/api/admin-events-upgrade.test.ts`, add this test inside the existing `describe` block:

```ts
  it('rejects 400 with clear message when fromTier is unlimited (grandfathered)', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'unlimited' },
    });
    const res = await POST(req({ toTier: 'premium' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/najvišem planu|highest plan|unlimited/i);
  });
```

In `__tests__/api/extend-retention-paywall.test.ts`, add inside the existing `describe`:

```ts
  it('rejects 400 when pricingTier is unlimited (grandfathered — never expires)', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'unlimited', retentionOverrideDays: 0 },
    });
    const res = await POST(req());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/unlimited|trajno|never expires/i);
  });
```

- [ ] **Step 2: Run, expect fail**

```bash
pnpm test:unit -- admin-events-upgrade extend-retention-paywall 2>&1 | tail -15
```

- [ ] **Step 3: Add unlimited guard to upgrade route**

In `app/api/admin/events/upgrade/route.ts`, find the block that checks `fromTier === toTier`. Just ABOVE it (after `getAuthenticatedAdmin` and `toTier` validation), add:

```ts
  if (fromTier === 'unlimited') {
    return NextResponse.json(
      { error: 'Već ste na najvišem planu (unlimited).' },
      { status: 400 }
    );
  }
```

- [ ] **Step 4: Add unlimited guard to extend-retention route**

In `app/api/admin/events/extend-retention/route.ts`, find the existing `if (admin.event.pricingTier === 'free')` check. Just BELOW it (or just above the retention cap check), add:

```ts
  if (admin.event.pricingTier === 'unlimited') {
    return NextResponse.json(
      { error: 'Unlimited plan već ima trajno čuvanje — produženje nije potrebno.' },
      { status: 400 }
    );
  }
```

- [ ] **Step 5: Run, expect pass**

```bash
pnpm test:unit -- admin-events-upgrade extend-retention-paywall 2>&1 | tail -15
```

- [ ] **Step 6: Full regression**

```bash
pnpm test:unit 2>&1 | tail -5
```

Expected: 205 tests passing (203 + 2 new).

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/events/upgrade/route.ts app/api/admin/events/extend-retention/route.ts __tests__/api/admin-events-upgrade.test.ts __tests__/api/extend-retention-paywall.test.ts
git -c commit.gpgsign=false commit -m "fix(paywall): explicit unlimited-tier rejection in upgrade + extend-retention

Grandfathered unlimited events previously hit unclear errors
('downgrades not supported' for upgrade). Now both routes reject with
'already on highest plan' / 'unlimited has permanent retention' so
the admin gets accurate feedback."
```

---

### Task 4: Drop `Payment.lsCheckoutId` vestige column (M2)

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/lemonsqueezy/handlers.ts` (remove `lsCheckoutId` field from 3 upsert blocks)
- Create: `prisma/migrations/<timestamp>_drop_payment_lscheckoutid/migration.sql`

**Why:** After Group A removed pending-Payment creation at routes, `lsCheckoutId` always equals `lsOrderId` in webhook handler writes. The `@unique` constraint can never fire usefully and adds a spurious P2002 collision surface if LS ever reuses an order ID across two delivery events.

- [ ] **Step 1: Verify the field is no longer used anywhere meaningful**

```bash
cd /Users/nmil/Desktop/WeddingApp
grep -rn "lsCheckoutId" app/ lib/ components/ __tests__/ 2>&1 | grep -v node_modules | grep -v .next
```

You should see only:
- `lib/lemonsqueezy/handlers.ts` — 3 writes (each `lsCheckoutId: w.lsOrderId`)
- Any test that mocks/asserts on it

If you find any READ of `lsCheckoutId` (e.g., a route querying by it), STOP and report — the column is not yet safe to drop.

- [ ] **Step 2: Remove from handlers.ts**

In `lib/lemonsqueezy/handlers.ts`, find all 3 `prisma.payment.upsert` calls (one per purpose handler). Remove the `lsCheckoutId: w.lsOrderId,` line from each `create` block.

Verify the file still compiles by running:

```bash
pnpm test:unit -- lemonsqueezy-webhook 2>&1 | tail -10
```

If a test fails because it asserted on `lsCheckoutId` being set, remove that assertion (the field is going away).

- [ ] **Step 3: Update schema.prisma**

Open `prisma/schema.prisma`. Find `model Payment`. Remove the line:

```prisma
  lsCheckoutId         String         @unique
```

Run formatter + validate:

```bash
npx prisma format
npx prisma validate
```

- [ ] **Step 4: Generate migration (without applying)**

```bash
npx prisma migrate dev --name drop_payment_lscheckoutid --create-only
```

This creates `prisma/migrations/<timestamp>_drop_payment_lscheckoutid/migration.sql`.

Open the generated file and confirm it contains something like:

```sql
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_lsCheckoutId_key";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "lsCheckoutId";
```

If Prisma generated the constraint drop and column drop but you want defensive `IF EXISTS` clauses (recommended given migration history drift), edit the SQL to add them.

- [ ] **Step 5: Apply the migration to production DB**

```bash
npx prisma db execute --file ./prisma/migrations/<timestamp>_drop_payment_lscheckoutid/migration.sql --schema ./prisma/schema.prisma
```

Then mark it as applied in Prisma's migration tracking:

```bash
npx prisma migrate resolve --applied <timestamp>_drop_payment_lscheckoutid
```

Verify via:

```bash
npx prisma migrate status
```

Should report "Database schema is up to date!"

- [ ] **Step 6: Run prisma generate so the client picks up the schema change**

```bash
npx prisma generate --no-engine
```

- [ ] **Step 7: Full regression**

```bash
pnpm test:unit 2>&1 | tail -5
```

Expected: 205 tests passing.

If a test fails because the Prisma client TypeScript type no longer has `lsCheckoutId`, remove that field from the test's mock data.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ lib/lemonsqueezy/handlers.ts __tests__/
git -c commit.gpgsign=false commit -m "refactor(db): drop unused Payment.lsCheckoutId vestige column

After Group A removed pre-webhook pending Payment creation, this column
always held the same value as lsOrderId on every row. The @unique
constraint provided no value and created a spurious P2002 collision
surface if LS ever reuses an order id across two delivery events.
lsEventId @unique remains the sole idempotency key."
```

---

## Phase 3 — LOW polish

### Task 5: Consistent log prefixes (L1) + customerEmail naming comment (M3)

**Files:**
- Modify: `app/api/webhooks/lemonsqueezy/route.ts`
- Modify: `lib/lemonsqueezy/handlers.ts`

- [ ] **Step 1: Standardize all logs in webhook route to `[lemonsqueezy]` prefix**

In `app/api/webhooks/lemonsqueezy/route.ts`, find these patterns and ensure each console log has the `[lemonsqueezy]` prefix:

```bash
grep -n "console\." app/api/webhooks/lemonsqueezy/route.ts
```

Each match should start with `[lemonsqueezy]`. Examples to update if found:
- `console.error('LS webhook handler error:', err);` → `console.error('[lemonsqueezy] webhook handler error:', err);`
- `console.error('LEMONSQUEEZY_WEBHOOK_SECRET not set ...')` → `console.error('[lemonsqueezy] LEMONSQUEEZY_WEBHOOK_SECRET not set ...')`

- [ ] **Step 2: Standardize handlers.ts logs**

```bash
grep -n "console\." lib/lemonsqueezy/handlers.ts
```

Each should start with `[lemonsqueezy]`. Update any that don't (e.g., `console.warn(\`Refund webhook for unknown order ...\`)` → prepend `[lemonsqueezy]`).

- [ ] **Step 3: Add `customerEmail` clarifying comment**

In `lib/lemonsqueezy/handlers.ts`, find the line `customerEmail: w.customerEmail,` in any of the upsert blocks. Right above the FIRST occurrence, add a one-line comment:

```ts
      // NOTE: customerEmail is the BUYER email from LS checkout form, not the admin's
      // account email. They may differ if buyer pays on behalf of the admin.
```

(Only add it once — first occurrence — to avoid noise.)

- [ ] **Step 4: Full regression**

```bash
pnpm test:unit 2>&1 | tail -5
```

Expected: 205 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/webhooks/lemonsqueezy/route.ts lib/lemonsqueezy/handlers.ts
git -c commit.gpgsign=false commit -m "polish(paywall): consistent [lemonsqueezy] log prefix + clarify customerEmail source

Every paywall log line now starts with '[lemonsqueezy]' for grep parity
in Vercel logs. Added a comment noting that customerEmail comes from
the LS buyer form, not the admin's account email (they can differ if
someone pays on behalf of the admin)."
```

---

### Task 6: i18n for pending event page (L2)

**Files:**
- Modify: `app/admin/event/pending/page.tsx`
- Modify: `locales/sr/translation.json`
- Modify: `locales/en/translation.json`

- [ ] **Step 1: Read current state of pending page**

```bash
cd /Users/nmil/Desktop/WeddingApp
cat app/admin/event/pending/page.tsx
```

You'll see hardcoded Serbian strings like "Plaćanje na čekanju", "Plati sad", "Otkaži događaj", etc.

- [ ] **Step 2: Check existing i18n pattern**

```bash
grep -B2 -A 4 "useTranslation\|t\(" components/admin/AdminDashboardWelcome.tsx 2>&1 | head -20
```

Note how other admin components use `useTranslation` + `t('key')` keys, and how keys are organized in `locales/{sr,en}/translation.json`.

- [ ] **Step 3: Add translation keys**

In `locales/sr/translation.json`, find a sensible parent (probably `admin.event` or create new `admin.pending`). Add:

```json
{
  "admin": {
    "pending": {
      "loading": "Učitavanje...",
      "errorLoading": "Greška pri učitavanju",
      "title": "Plaćanje na čekanju",
      "description": "Tvoj događaj <strong>{{coupleName}}</strong> ({{tier}}) je rezervisan. Završi plaćanje da bi aktivirao admin dashboard.",
      "payNow": "Plati sad",
      "loadingState": "Učitava...",
      "cancel": "Otkaži događaj",
      "cancelConfirm": "Sigurno otkažeš događaj? URL će biti oslobođen i ne možeš ga vratiti.",
      "cancelError": "Greška pri otkazivanju",
      "networkError": "Network error",
      "error": "Greška",
      "refundFooter": "Refund je moguć u roku od 7 dana — kontaktirajte support@dodajuspomenu.com."
    }
  }
}
```

In `locales/en/translation.json`, add the same structure with English values:

```json
{
  "admin": {
    "pending": {
      "loading": "Loading...",
      "errorLoading": "Failed to load",
      "title": "Payment pending",
      "description": "Your event <strong>{{coupleName}}</strong> ({{tier}}) is reserved. Complete payment to activate the admin dashboard.",
      "payNow": "Pay now",
      "loadingState": "Loading...",
      "cancel": "Cancel event",
      "cancelConfirm": "Sure you want to cancel? The URL will be freed and you cannot get it back.",
      "cancelError": "Failed to cancel",
      "networkError": "Network error",
      "error": "Error",
      "refundFooter": "Refunds within 7 days — contact support@dodajuspomenu.com."
    }
  }
}
```

Use `Trans` component for the description so the `<strong>` interpolation works, OR use a simpler version that doesn't bold the couple name. Simpler is fine for this page.

- [ ] **Step 4: Refactor pending page to use t()**

In `app/admin/event/pending/page.tsx`, add at the top:

```tsx
import { useTranslation } from 'react-i18next';
```

In the component body:

```tsx
  const { t } = useTranslation();
```

Replace every hardcoded Serbian string with `t('admin.pending.<key>')`. For the description with interpolation:

```tsx
<p>
  {t('admin.pending.description', {
    coupleName: eventInfo.coupleName,
    tier: eventInfo.pricingTier,
  })}
</p>
```

(If the design needs `<strong>`, use `Trans` from `react-i18next` instead. Simpler `t()` interpolation drops the bold — acceptable for now.)

- [ ] **Step 5: Smoke test in dev**

```bash
pnpm dev
```

In another terminal or browser:
- Visit `/sr/admin/event/pending` (Serbian) — confirm strings render
- Visit `/en/admin/event/pending` (English) — confirm strings render

Stop dev server.

- [ ] **Step 6: Full regression**

```bash
pnpm test:unit 2>&1 | tail -5
```

Expected: 205 tests still passing.

- [ ] **Step 7: Commit**

```bash
git add app/admin/event/pending/page.tsx locales/sr/translation.json locales/en/translation.json
git -c commit.gpgsign=false commit -m "i18n(paywall): pending event page uses translation keys (sr + en)

Pending payment screen was hardcoded Serbian. Now uses
useTranslation + admin.pending.* keys so the EN locale also works
ahead of the EN launch."
```

---

### Task 7: Document paywall in CLAUDE.md (L4)

**Files:**
- Modify: `CLAUDE.md`

**Why:** Future engineers landing on this codebase need a quick map of the paywall flow without digging through 7 PRs and 3 spec docs.

- [ ] **Step 1: Read CLAUDE.md current structure**

```bash
head -100 CLAUDE.md
```

Note where existing sections live (e.g., "Two separate auth systems", "Photo upload pipeline").

- [ ] **Step 2: Add Paywall section**

In CLAUDE.md, after the "Pricing data flow (DB-first)" section, add this new section:

```markdown
### Paywall (LemonSqueezy)

All paid actions go through LemonSqueezy (LS) hosted checkout. Three surfaces:

1. **Initial purchase** — admin selects `basic`/`premium` at event creation → POST `/api/admin/events` returns `{ checkoutUrl }`. Event is created with `activatedAt=null + pendingPaymentExpiresAt=now+24h`. Webhook activates on payment.
2. **Tier upgrade** — POST `/api/admin/events/upgrade` (free→basic/premium, basic→premium). Persists pending Payment-not (Group A removed orphan pre-Payment rows). Webhook updates `event.pricingTier + imageLimit + records Payment(purpose='upgrade', metadata.previousTier)`.
3. **Retention extension** — €15 / +30 days. POST `/api/admin/events/extend-retention` returns checkout URL. Webhook bumps `event.retentionOverrideDays` by 30 (capped at 365). Free tier explicitly blocked, must upgrade first.

**Webhook receiver** at `/api/webhooks/lemonsqueezy`:
- HMAC-SHA256 signature gate (fail-closed, log only authenticated traffic)
- Rate limit 60/min/IP via `createRateLimiter`
- Idempotency: `Payment.lsEventId @unique` (full constraint, not partial)
- Dispatch by `payload.meta.event_name + payload.meta.custom_data.purpose`
- Each handler wraps writes in `prisma.$transaction([upsert, eventUpdate])`
- Missing-event guard: `console.warn + return` instead of throwing → LS doesn't retry-storm cancelled events
- Refund handler cross-checks `event.adminId === custom.admin_id` as defense-in-depth

**Cleanup cron** (`/api/cron/cleanup`) purges expired pending events (`activatedAt=null AND pendingPaymentExpiresAt < now`) to prevent 1:1 admin↔event lockout.

**Env vars** (Production): `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`, `LEMONSQUEEZY_TEST_MODE` (1=test, 0=live), `LS_VARIANT_{BASIC,PREMIUM,UPGRADE_BASIC_TO_PREMIUM,RETENTION_30}`.

**Custom data keys** sent to LS use **snake_case** (`event_id`, `admin_id`, `purpose`, `to_tier`) — LS normalizes them anyway, but we send the canonical form.

**Spec + plan**: `docs/superpowers/specs/2026-05-16-paywall-design.md` (design), `docs/superpowers/plans/2026-05-16-paywall-implementation.md` (M1/M2/M3 plan), `docs/superpowers/specs/2026-05-17-paywall-followup-fixes.md` (post-go-live audit + fixes Group A/B).
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git -c commit.gpgsign=false commit -m "docs(claude): document paywall stack — flow, webhook, cron, env vars"
```

---

## Phase 4 — Holistic re-review

### Task 8: Fresh-context final review (controller-only, not for implementer subagents)

> **Implementer subagents executing Tasks 1–7: STOP HERE.** Task 8 is a controller action — the parent agent dispatches this review and handles the PR merge after.

The controller (parent agent) does the following after Tasks 1–7 commits are pushed:

- [ ] **Step 1: Push branch + open PR**

```bash
cd /Users/nmil/Desktop/WeddingApp
git push -u origin feature/paywall-final-cleanup
gh pr create --title "fix(paywall): final cleanup — H1/H2 correctness + M2/M5 cleanup + L1/L2/L4 polish" --body "$(cat <<'EOF'
## Summary
Implements all actionable fixes from the post-Group-B holistic review.
- H1: dashboard index short-circuits pending → /admin/event/pending (no redirect bounce)
- H2: cancel-pending race fix — atomic deleteMany WHERE activatedAt IS NULL
- M5: unlimited tier explicitly rejected in upgrade + extend-retention
- M2: dropped Payment.lsCheckoutId vestige column + migration
- L1: standardized [lemonsqueezy] log prefix everywhere
- M3: comment clarifying customerEmail source (buyer not admin)
- L2: pending event page now uses i18n (sr + en)
- L4: CLAUDE.md documents paywall stack for future engineers

Spec/plan: docs/superpowers/plans/2026-05-17-paywall-final-cleanup.md
205/205 tests pass, 0 regressions.
EOF
)"
```

- [ ] **Step 2: Wait for CI**

Use Bash background monitor with `gh pr checks <PR>` polling until all checks complete.

- [ ] **Step 3: Dispatch fresh-context reviewer**

Dispatch a `general-purpose` subagent with `opus` model (matches the first final review). The prompt MUST be self-contained — reviewer has zero prior context. Reviewer prompt template:

```
You are doing the SECOND final holistic review of the WeddingApp paywall stack
at /Users/nmil/Desktop/WeddingApp, branch main + commits from feature/paywall-final-cleanup
(squash will follow review). The FIRST holistic review identified 2 HIGH + 5 MEDIUM
+ 7 LOW issues, all of which have been addressed in commits on this branch per
docs/superpowers/plans/2026-05-17-paywall-final-cleanup.md.

Your job: read the same files as the first review (listed in
docs/superpowers/specs/2026-05-17-paywall-followup-fixes.md AND
docs/superpowers/plans/2026-05-17-paywall-final-cleanup.md Task 8 step 3
file list — copy that list verbatim into your shell commands), then verify:

A. Each H1, H2, M2, M5, L1, L2, L4, M3 fix from the plan landed correctly.
B. No NEW issues introduced by the cleanup work (regression check).
C. State machine coherence (initial purchase + upgrade + retention + refund + cancel) holds end-to-end.
D. Security posture intact (HMAC signature, rate limit, admin cross-check on refund, CSRF on state-changing routes, transaction atomicity in handlers).
E. Schema vs code alignment after the lsCheckoutId column drop.

Output one of:
- ✅ APPROVED FOR LIVE MODE — short justification covering A-E
- ❌ ISSUES — severity-tagged list with file:line, what needs to be fixed before live mode

Under 600 words.
```

- [ ] **Step 4: Address any final reviewer findings**

If reviewer flags issues, fix them on the same branch, push, request re-review (re-dispatch with brief delta context). Loop until ✅.

- [ ] **Step 5: Merge PR**

```bash
gh pr merge <PR_NUMBER> --squash --delete-branch
```

- [ ] **Step 6: Wait for Vercel deploy**

Background-monitor the deployment for the squash commit. When success, declare the paywall ready for `LEMONSQUEEZY_TEST_MODE=0` switch (Task 9.x — user manual action).

- [ ] **Step 7: Update task tracker**

Mark parent-session tasks #32 (Final code review) and #33 (Followup fixes) as completed.

---

## Final test budget

| Task | Tests added | Cumulative |
|---|---|---|
| Baseline (after Group B merge) | — | 199 |
| Task 1 (H1 dashboard redirect) | 0 (server-component) | 199 |
| Task 2 (H2 cancel-pending race) | 4 (new test file) | 203 |
| Task 3 (M5 unlimited rejection) | 2 (upgrade + retention) | 205 |
| Task 4 (M2 drop lsCheckoutId) | 0 (mock-only changes) | 205 |
| Task 5 (L1 + M3 polish) | 0 (logs only) | 205 |
| Task 6 (L2 i18n) | 0 (UI) | 205 |
| Task 7 (L4 CLAUDE.md) | 0 (docs) | 205 |

**Final: 205/205 unit tests passing, 0 regressions.**
