# Paywall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement LemonSqueezy (LS) paywall covering event creation, tier upgrade, and retention extension per the design in `docs/superpowers/specs/2026-05-16-paywall-design.md`.

**Execution mode:** Subagent-driven. After each task is completed, a fresh agent with zero prior context reviews the changes (diff + relevant files) and signs off before the next task starts. User explicitly requested this.

**Architecture:** Reservation pattern — paid events are created with `activatedAt=null` and unlocked by webhook. LS hosted checkout, HMAC-verified webhooks, idempotent via `Payment.lsEventId @unique`. Three paywall surfaces share a single webhook handler that dispatches by `Payment.purpose` (`initial_purchase | upgrade | retention_extension`).

**Tech Stack:** Next.js 15 App Router, Prisma 6 on Postgres, `@lemonsqueezy/lemonsqueezy.js` SDK, `@edge-csrf/core` for CSRF, Jest+ts-jest for tests, Docker for backend integration runs.

**Milestones (shippable checkpoints):**
- **M1** — Initial purchase paywall (Phases 0–5). Free still works; paid tier requires LS payment.
- **M2** — Tier upgrade (Phase 6). Free→basic/premium and basic→premium via dashboard.
- **M3** — Retention extension paywall (Phase 7). €15 per 30 days via dashboard.

**Backend testing note:** Per project rules, backend integration tests run via Docker built from `.env` (not `.env.local`). Unit tests run locally via `pnpm test:unit`.

---

## Phase 0 — Setup & dependencies

### Task 0.1: Install LemonSqueezy SDK

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Install SDK**

```bash
pnpm add @lemonsqueezy/lemonsqueezy.js
```

- [ ] **Step 2: Verify install**

```bash
grep "lemonsqueezy" package.json
```

Expected: `"@lemonsqueezy/lemonsqueezy.js": "^4.x.x"` (or current version)

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @lemonsqueezy/lemonsqueezy.js SDK"
```

### Task 0.2: LemonSqueezy dashboard configuration (manual)

This is a **manual step** to do in the LS dashboard at https://app.lemonsqueezy.com. No code changes.

- [ ] **Step 1: Create LS store** (if not already created) — Settings → Stores → New store, mode: **Test** to start.
- [ ] **Step 2: Create 4 products** in the store:
  - "Wedding Event — Basic" — one-time, €25 EUR
  - "Wedding Event — Premium" — one-time, €75 EUR
  - "Premium Upgrade from Basic" — one-time, €50 EUR
  - "Retention Extension — 30 days" — one-time, €15 EUR
- [ ] **Step 3: For each product, create a single variant** (LS requires at least one variant per product). Note each `variant_id`.
- [ ] **Step 4: Create a webhook** at Settings → Webhooks → New webhook:
  - URL: `https://www.dodajuspomenu.com/api/webhooks/lemonsqueezy` (use `https://<staging-url>/...` for test)
  - Signing secret: generate strong random string, save it
  - Subscribe to events: `order_created`, `order_refunded`
- [ ] **Step 5: Generate API key** at Settings → API → Create API key. Save the bearer token.
- [ ] **Step 6: Record these values** for Phase 0.3:
  - `LEMONSQUEEZY_API_KEY` (bearer token)
  - `LEMONSQUEEZY_STORE_ID` (store ID from URL)
  - `LEMONSQUEEZY_WEBHOOK_SECRET` (signing secret from step 4)
  - `LS_VARIANT_BASIC`, `LS_VARIANT_PREMIUM`, `LS_VARIANT_UPGRADE_BASIC_TO_PREMIUM`, `LS_VARIANT_RETENTION_30` (variant IDs from step 3)

### Task 0.3: Update env documentation

**Files:**
- Modify: `.env.example` (or create if missing)

- [ ] **Step 1: Append LS section to `.env.example`**

```bash
cat >> .env.example <<'EOF'

# LemonSqueezy paywall
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_TEST_MODE=1
LS_VARIANT_BASIC=
LS_VARIANT_PREMIUM=
LS_VARIANT_UPGRADE_BASIC_TO_PREMIUM=
LS_VARIANT_RETENTION_30=
EOF
```

- [ ] **Step 2: Populate local `.env` with the values from Task 0.2 step 6**

(Do not commit `.env`. Only `.env.example` is committed.)

- [ ] **Step 3: Set the same env vars on Vercel** (Project → Settings → Environment Variables → Production scope). Use **test variant IDs** for now; switch to live IDs in Phase 9.

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "chore: document LemonSqueezy env vars"
```

---

## Phase 1 — Schema migration

### Task 1.1: Update Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `activatedAt` and `pendingPaymentExpiresAt` to `Event` model**

Find `model Event { ... }` and add these fields after `retentionOverrideDays`:

```prisma
  /// Null until payment confirmed via webhook (paid tiers only).
  /// Free tier events have this set to createdAt on creation.
  activatedAt              DateTime?
  /// 24h after createdAt for paid tiers; cleanup cron deletes pending events past this time.
  pendingPaymentExpiresAt  DateTime?
```

- [ ] **Step 2: Update `Payment` model**

Replace `id String @id` with `id String @id @default(uuid())` and add new columns. Final shape:

```prisma
model Payment {
  id                  String         @id @default(uuid())
  eventId             String
  tier                PricingTier
  amountCents         Int
  currency            String         @default("EUR")
  status              PaymentStatus
  purpose             PaymentPurpose
  lsCheckoutId        String         @unique
  lsOrderId           String?
  lsEventId           String?        @unique
  retentionDaysGranted Int?
  metadata            Json?
  refundedAmountCents Int            @default(0)
  refundedAt          DateTime?
  customerEmail       String
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
  Event               Event          @relation(fields: [eventId], references: [id])

  @@index([createdAt])
  @@index([eventId, status])
  @@index([eventId, purpose])
}
```

- [ ] **Step 3: Add `PaymentPurpose` enum**

After the `PaymentStatus` enum, add:

```prisma
enum PaymentPurpose {
  initial_purchase
  upgrade
  retention_extension
}
```

- [ ] **Step 4: Update `WebhookLog` to give `id` a default**

```prisma
model WebhookLog {
  id             String    @id @default(uuid())
  ...
}
```

- [ ] **Step 5: Format & validate**

```bash
npx prisma format
npx prisma validate
```

Expected: both succeed without errors.

### Task 1.2: Create and apply migration

**Files:**
- Create: `prisma/migrations/<timestamp>_add_paywall_fields/migration.sql`

- [ ] **Step 1: Generate migration**

```bash
npx prisma migrate dev --name add_paywall_fields --create-only
```

This generates the SQL file without running it yet.

- [ ] **Step 2: Open the generated migration and prepend a backfill for existing events**

Edit the new migration SQL file. After Prisma's generated `ALTER TABLE` statements, append:

```sql
-- Backfill activatedAt for existing events so their dashboards stay accessible.
-- All pre-paywall events are treated as active.
UPDATE "Event" SET "activatedAt" = "createdAt" WHERE "activatedAt" IS NULL;
```

- [ ] **Step 3: Apply migration**

```bash
npx prisma migrate dev
```

Expected: migration applies successfully; `npx prisma generate --no-engine` runs at the end.

- [ ] **Step 4: Verify schema state**

```bash
npx prisma studio
```

Manually check: open any existing `Event` row, confirm `activatedAt` is populated (= createdAt). Open `Payment` model, confirm `purpose` column exists.

Close Prisma Studio.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add paywall fields — Event.activatedAt/pendingPaymentExpiresAt, Payment.purpose/metadata, PaymentPurpose enum"
```

---

## Phase 2 — LemonSqueezy library core

### Task 2.1: Variants resolver

**Files:**
- Create: `lib/lemonsqueezy/variants.ts`
- Test: `__tests__/lib/lemonsqueezy-variants.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/lib/lemonsqueezy-variants.test.ts
import { resolveVariantId, type CheckoutTarget } from '@/lib/lemonsqueezy/variants';

describe('resolveVariantId', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      LS_VARIANT_BASIC: 'var_basic_123',
      LS_VARIANT_PREMIUM: 'var_premium_456',
      LS_VARIANT_UPGRADE_BASIC_TO_PREMIUM: 'var_upgrade_789',
      LS_VARIANT_RETENTION_30: 'var_retention_321',
    };
  });
  afterEach(() => { process.env = originalEnv; });

  it('returns basic variant for initial_purchase + basic tier', () => {
    const target: CheckoutTarget = { purpose: 'initial_purchase', tier: 'basic' };
    expect(resolveVariantId(target)).toBe('var_basic_123');
  });

  it('returns premium variant for initial_purchase + premium tier', () => {
    expect(resolveVariantId({ purpose: 'initial_purchase', tier: 'premium' })).toBe('var_premium_456');
  });

  it('returns upgrade variant for basic→premium upgrade', () => {
    expect(resolveVariantId({ purpose: 'upgrade', fromTier: 'basic', toTier: 'premium' }))
      .toBe('var_upgrade_789');
  });

  it('returns basic variant for free→basic upgrade', () => {
    expect(resolveVariantId({ purpose: 'upgrade', fromTier: 'free', toTier: 'basic' }))
      .toBe('var_basic_123');
  });

  it('returns premium variant for free→premium upgrade', () => {
    expect(resolveVariantId({ purpose: 'upgrade', fromTier: 'free', toTier: 'premium' }))
      .toBe('var_premium_456');
  });

  it('returns retention variant', () => {
    expect(resolveVariantId({ purpose: 'retention_extension' })).toBe('var_retention_321');
  });

  it('throws if env var missing', () => {
    delete process.env.LS_VARIANT_BASIC;
    expect(() => resolveVariantId({ purpose: 'initial_purchase', tier: 'basic' }))
      .toThrow(/LS_VARIANT_BASIC/);
  });

  it('rejects free as initial_purchase target (free has no payment)', () => {
    expect(() => resolveVariantId({ purpose: 'initial_purchase', tier: 'free' as any }))
      .toThrow(/free tier has no LS variant/i);
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
pnpm test:unit -- lemonsqueezy-variants
```

Expected: FAIL with "Cannot find module '@/lib/lemonsqueezy/variants'"

- [ ] **Step 3: Implement**

```ts
// lib/lemonsqueezy/variants.ts
import type { PricingTier } from '@/lib/pricing-tiers';

export type CheckoutTarget =
  | { purpose: 'initial_purchase'; tier: Exclude<PricingTier, 'free'> }
  | { purpose: 'upgrade'; fromTier: PricingTier; toTier: Exclude<PricingTier, 'free'> }
  | { purpose: 'retention_extension' };

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function resolveVariantId(target: CheckoutTarget): string {
  if (target.purpose === 'initial_purchase') {
    if (target.tier === 'free' as PricingTier) {
      throw new Error('free tier has no LS variant');
    }
    if (target.tier === 'basic') return requireEnv('LS_VARIANT_BASIC');
    if (target.tier === 'premium') return requireEnv('LS_VARIANT_PREMIUM');
    throw new Error(`Unknown tier: ${(target as any).tier}`);
  }
  if (target.purpose === 'upgrade') {
    if (target.fromTier === 'basic' && target.toTier === 'premium') {
      return requireEnv('LS_VARIANT_UPGRADE_BASIC_TO_PREMIUM');
    }
    if (target.fromTier === 'free' && target.toTier === 'basic') {
      return requireEnv('LS_VARIANT_BASIC');
    }
    if (target.fromTier === 'free' && target.toTier === 'premium') {
      return requireEnv('LS_VARIANT_PREMIUM');
    }
    throw new Error(`Unsupported upgrade path: ${target.fromTier} → ${target.toTier}`);
  }
  if (target.purpose === 'retention_extension') {
    return requireEnv('LS_VARIANT_RETENTION_30');
  }
  throw new Error('Unreachable');
}
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
pnpm test:unit -- lemonsqueezy-variants
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/lemonsqueezy/variants.ts __tests__/lib/lemonsqueezy-variants.test.ts
git commit -m "feat(paywall): LS variant ID resolver"
```

### Task 2.2: Webhook signature verification

**Files:**
- Create: `lib/lemonsqueezy/signature.ts`
- Test: `__tests__/lib/lemonsqueezy-signature.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/lib/lemonsqueezy-signature.test.ts
import crypto from 'crypto';
import { verifyLemonSqueezySignature } from '@/lib/lemonsqueezy/signature';

const SECRET = 'test_signing_secret';
const BODY = JSON.stringify({ meta: { event_name: 'order_created' }, data: {} });

function sign(body: string, secret = SECRET) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifyLemonSqueezySignature', () => {
  it('returns true for valid signature', () => {
    const sig = sign(BODY);
    expect(verifyLemonSqueezySignature(BODY, sig, SECRET)).toBe(true);
  });

  it('returns false for invalid signature', () => {
    expect(verifyLemonSqueezySignature(BODY, 'badsig', SECRET)).toBe(false);
  });

  it('returns false for empty signature', () => {
    expect(verifyLemonSqueezySignature(BODY, '', SECRET)).toBe(false);
  });

  it('returns false for tampered body', () => {
    const sig = sign(BODY);
    expect(verifyLemonSqueezySignature(BODY + 'x', sig, SECRET)).toBe(false);
  });

  it('returns false if signature length differs (timing-safe guard)', () => {
    expect(verifyLemonSqueezySignature(BODY, 'aa', SECRET)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
pnpm test:unit -- lemonsqueezy-signature
```

Expected: FAIL "Cannot find module"

- [ ] **Step 3: Implement**

```ts
// lib/lemonsqueezy/signature.ts
import crypto from 'crypto';

/**
 * Verify LemonSqueezy webhook signature.
 * LS signs the raw request body with HMAC-SHA256 using the webhook signing secret.
 * The signature arrives in the `X-Signature` header as a hex string.
 *
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function verifyLemonSqueezySignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(computed, 'hex');
  let b: Buffer;
  try {
    b = Buffer.from(signatureHeader, 'hex');
  } catch {
    return false;
  }
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
pnpm test:unit -- lemonsqueezy-signature
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/lemonsqueezy/signature.ts __tests__/lib/lemonsqueezy-signature.test.ts
git commit -m "feat(paywall): LS webhook HMAC signature verification"
```

### Task 2.3: Checkout URL client

**Files:**
- Create: `lib/lemonsqueezy/client.ts`
- Test: `__tests__/lib/lemonsqueezy-client.test.ts`

- [ ] **Step 1: Write failing test** (mocked SDK)

```ts
// __tests__/lib/lemonsqueezy-client.test.ts
import { createCheckoutUrl } from '@/lib/lemonsqueezy/client';

jest.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
  lemonSqueezySetup: jest.fn(),
  createCheckout: jest.fn(async () => ({
    data: { data: { attributes: { url: 'https://checkout.lemonsqueezy.com/abc123' } } },
    error: null,
  })),
}));

import { createCheckout, lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';

describe('createCheckoutUrl', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      LEMONSQUEEZY_API_KEY: 'lstest_apikey',
      LEMONSQUEEZY_STORE_ID: '99',
    };
  });
  afterEach(() => { process.env = originalEnv; });

  it('returns checkout URL on success', async () => {
    const url = await createCheckoutUrl({
      variantId: 'var_basic',
      customerEmail: 'admin@example.com',
      customData: { eventId: 'e1', adminId: 'a1', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://app.test/admin/dashboard/e1?paid=1',
    });
    expect(url).toBe('https://checkout.lemonsqueezy.com/abc123');
    expect(lemonSqueezySetup).toHaveBeenCalledWith({ apiKey: 'lstest_apikey' });
    expect(createCheckout).toHaveBeenCalledWith('99', 'var_basic', expect.objectContaining({
      checkoutData: expect.objectContaining({
        email: 'admin@example.com',
        custom: { eventId: 'e1', adminId: 'a1', purpose: 'initial_purchase' },
      }),
      productOptions: expect.objectContaining({
        redirectUrl: 'https://app.test/admin/dashboard/e1?paid=1',
      }),
    }));
  });

  it('throws when LS SDK returns error', async () => {
    (createCheckout as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: 'invalid variant' },
    });
    await expect(createCheckoutUrl({
      variantId: 'var_bad',
      customerEmail: 'a@b.c',
      customData: { eventId: 'e', adminId: 'a', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://x',
    })).rejects.toThrow(/invalid variant/);
  });

  it('throws when env vars missing', async () => {
    delete process.env.LEMONSQUEEZY_API_KEY;
    await expect(createCheckoutUrl({
      variantId: 'var_basic',
      customerEmail: 'a@b.c',
      customData: { eventId: 'e', adminId: 'a', purpose: 'initial_purchase' },
      successRedirectUrl: 'https://x',
    })).rejects.toThrow(/LEMONSQUEEZY_API_KEY/);
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
pnpm test:unit -- lemonsqueezy-client
```

Expected: FAIL "Cannot find module"

- [ ] **Step 3: Implement**

```ts
// lib/lemonsqueezy/client.ts
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

export interface CustomCheckoutData {
  eventId: string;
  adminId: string;
  purpose: 'initial_purchase' | 'upgrade' | 'retention_extension';
  [key: string]: string;
}

export interface CreateCheckoutArgs {
  variantId: string;
  customerEmail: string;
  customData: CustomCheckoutData;
  successRedirectUrl: string;
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

  const { data, error } = await createCheckout(storeId, args.variantId, {
    checkoutData: {
      email: args.customerEmail,
      custom: args.customData,
    },
    productOptions: {
      redirectUrl: args.successRedirectUrl,
    },
    testMode: process.env.LEMONSQUEEZY_TEST_MODE === '1',
  });

  if (error) throw new Error(`LS createCheckout failed: ${error.message}`);
  const url = data?.data?.attributes?.url;
  if (!url) throw new Error('LS createCheckout returned no URL');
  return url;
}
```

- [ ] **Step 4: Reset SDK init state for tests** — add to top of test file (between imports and describe):

```ts
beforeEach(() => {
  // Force re-init each test since module-level `initialized` is sticky.
  jest.resetModules();
});
```

Then re-import `createCheckoutUrl` inside each `it()` via `require()` if the test still leaks. (Simpler: change `initialized` flag to read from a module-scoped object you can reset, or expose `__resetForTest`.)

Pragmatic alternative — export a reset helper:

```ts
// Append to lib/lemonsqueezy/client.ts
export function __resetForTest() {
  initialized = false;
}
```

And in test:

```ts
import { __resetForTest } from '@/lib/lemonsqueezy/client';
beforeEach(() => __resetForTest());
```

- [ ] **Step 5: Run tests, confirm pass**

```bash
pnpm test:unit -- lemonsqueezy-client
```

Expected: all 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/lemonsqueezy/client.ts __tests__/lib/lemonsqueezy-client.test.ts
git commit -m "feat(paywall): LS checkout URL client with test-mode toggle"
```

---

## Phase 3 — Webhook handler

### Task 3.1: Webhook route skeleton — signature + WebhookLog

**Files:**
- Create: `app/api/webhooks/lemonsqueezy/route.ts`
- Test: `__tests__/api/lemonsqueezy-webhook.test.ts`

- [ ] **Step 1: Write failing test for invalid signature path**

```ts
// __tests__/api/lemonsqueezy-webhook.test.ts
import { POST } from '@/app/api/webhooks/lemonsqueezy/route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    webhookLog: { create: jest.fn(async () => ({ id: 'wl1' })) },
    payment: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    event: { update: jest.fn() },
  },
}));

function makeRequest(body: string, signature: string) {
  return new Request('https://x/api/webhooks/lemonsqueezy', {
    method: 'POST',
    headers: { 'x-signature': signature, 'content-type': 'application/json' },
    body,
  });
}

describe('POST /api/webhooks/lemonsqueezy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test_secret';
  });

  it('rejects request with invalid signature, logs to WebhookLog', async () => {
    const body = JSON.stringify({ meta: { event_name: 'order_created' }, data: {} });
    const res = await POST(makeRequest(body, 'invalidhex'));
    expect(res.status).toBe(401);
    expect(prisma.webhookLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ signatureValid: false }),
    }));
  });

  it('rejects request with no signature header', async () => {
    const body = JSON.stringify({ meta: { event_name: 'order_created' }, data: {} });
    const req = new Request('https://x/api/webhooks/lemonsqueezy', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
pnpm test:unit -- lemonsqueezy-webhook
```

Expected: FAIL "Cannot find module"

- [ ] **Step 3: Implement skeleton**

```ts
// app/api/webhooks/lemonsqueezy/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyLemonSqueezySignature } from '@/lib/lemonsqueezy/signature';
import { getRequestIp } from '@/lib/security/request-ip';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('LEMONSQUEEZY_WEBHOOK_SECRET not set — rejecting webhook');
    return NextResponse.json({ error: 'webhook misconfigured' }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') || '';
  const signatureValid = verifyLemonSqueezySignature(rawBody, signature, secret);

  let payload: any = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // Body wasn't JSON. We still log.
  }

  const lsEventId = payload?.meta?.event_id ? String(payload.meta.event_id) : null;
  const eventName = payload?.meta?.event_name ? String(payload.meta.event_name) : null;
  const sourceIp = getRequestIp(req as any);

  await prisma.webhookLog.create({
    data: {
      lsEventId,
      eventName,
      signatureValid,
      payload: payload ?? { raw: rawBody.slice(0, 1000) },
      sourceIp,
      processedAt: null,
    },
  });

  if (!signatureValid) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  // Dispatch happens in Phase 3.2+
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
pnpm test:unit -- lemonsqueezy-webhook
```

Expected: both tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/webhooks/lemonsqueezy/route.ts __tests__/api/lemonsqueezy-webhook.test.ts
git commit -m "feat(paywall): LS webhook signature gate + WebhookLog audit"
```

### Task 3.2: Webhook idempotency

**Files:**
- Modify: `app/api/webhooks/lemonsqueezy/route.ts`
- Modify: `__tests__/api/lemonsqueezy-webhook.test.ts`

- [ ] **Step 1: Write failing test for idempotency**

Add to the existing test file:

```ts
// __tests__/api/lemonsqueezy-webhook.test.ts (append within the describe block)
import crypto from 'crypto';

function validSig(body: string, secret = 'test_secret') {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

it('returns 200 and skips processing when payment with lsEventId already exists', async () => {
  const body = JSON.stringify({
    meta: { event_name: 'order_created', event_id: 'evt_dup_123', custom_data: { eventId: 'e1', adminId: 'a1', purpose: 'initial_purchase' } },
    data: { id: 'order_1', attributes: { user_email: 'x@y.z', total: 2500, currency: 'EUR', status: 'paid' } },
  });
  (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'p1', status: 'paid', lsEventId: 'evt_dup_123' });

  const res = await POST(makeRequest(body, validSig(body)));
  expect(res.status).toBe(200);
  expect(prisma.payment.upsert).not.toHaveBeenCalled();
  expect(prisma.event.update).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
pnpm test:unit -- lemonsqueezy-webhook
```

Expected: FAIL — test sees `expect(...upsert).not.toHaveBeenCalled()` but the route currently does nothing, so it would pass for the wrong reason. Look closer: actually it passes by accident here. Adjust the test to confirm the early-return code path:

```ts
// Verify the route returned the "idempotent: true" marker:
const json = await res.json();
expect(json).toEqual({ ok: true, idempotent: true });
```

Re-run: now fails because route returns `{ ok: true }` not `{ ok: true, idempotent: true }`.

- [ ] **Step 3: Implement idempotency check**

In `app/api/webhooks/lemonsqueezy/route.ts`, replace the "Dispatch happens in Phase 3.2+" line with:

```ts
  // Idempotency: if we've already processed this LS event, return 200 no-op.
  if (lsEventId) {
    const existing = await prisma.payment.findUnique({ where: { lsEventId } });
    if (existing && existing.status !== 'pending') {
      return NextResponse.json({ ok: true, idempotent: true });
    }
  }

  // Dispatch happens in Phase 3.3+
  return NextResponse.json({ ok: true });
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
pnpm test:unit -- lemonsqueezy-webhook
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/webhooks/lemonsqueezy/route.ts __tests__/api/lemonsqueezy-webhook.test.ts
git commit -m "feat(paywall): LS webhook idempotency via Payment.lsEventId"
```

### Task 3.3: Webhook handler dispatch — initial_purchase

**Files:**
- Create: `lib/lemonsqueezy/handlers.ts`
- Modify: `app/api/webhooks/lemonsqueezy/route.ts`
- Modify: `__tests__/api/lemonsqueezy-webhook.test.ts`

- [ ] **Step 1: Write failing test for initial_purchase happy path**

Add to test file:

```ts
it('handles initial_purchase order_created: activates event, persists payment', async () => {
  const customData = { eventId: 'e1', adminId: 'a1', purpose: 'initial_purchase' };
  const body = JSON.stringify({
    meta: { event_name: 'order_created', event_id: 'evt_new_1', custom_data: customData },
    data: { id: 'order_555', attributes: { user_email: 'admin@x.com', total: 2500, currency: 'EUR', status: 'paid' } },
  });
  (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null);
  (prisma.payment.upsert as jest.Mock).mockResolvedValueOnce({ id: 'p1' });
  (prisma.event.update as jest.Mock).mockResolvedValueOnce({ id: 'e1', activatedAt: new Date() });

  const res = await POST(makeRequest(body, validSig(body)));
  expect(res.status).toBe(200);

  expect(prisma.payment.upsert).toHaveBeenCalledWith(expect.objectContaining({
    where: { lsEventId: 'evt_new_1' },
    create: expect.objectContaining({
      eventId: 'e1',
      purpose: 'initial_purchase',
      status: 'paid',
      amountCents: 2500,
      lsOrderId: 'order_555',
    }),
  }));
  expect(prisma.event.update).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 'e1' },
    data: expect.objectContaining({ activatedAt: expect.any(Date) }),
  }));
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
pnpm test:unit -- lemonsqueezy-webhook
```

Expected: FAIL — `upsert` not called.

- [ ] **Step 3: Implement handlers.ts**

```ts
// lib/lemonsqueezy/handlers.ts
import { prisma } from '@/lib/prisma';
import type { PaymentPurpose, PaymentStatus } from '@prisma/client';

export interface NormalizedWebhook {
  lsEventId: string;
  lsOrderId: string;
  eventName: 'order_created' | 'order_refunded';
  customerEmail: string;
  amountCents: number;
  currency: string;
  custom: { eventId: string; adminId: string; purpose: PaymentPurpose };
}

export function normalizeWebhook(payload: any): NormalizedWebhook | null {
  const eventName = payload?.meta?.event_name;
  if (eventName !== 'order_created' && eventName !== 'order_refunded') return null;
  const lsEventId = payload?.meta?.event_id;
  const lsOrderId = payload?.data?.id;
  const custom = payload?.meta?.custom_data;
  const attrs = payload?.data?.attributes;
  if (!lsEventId || !lsOrderId || !custom?.eventId || !custom?.adminId || !custom?.purpose || !attrs) {
    return null;
  }
  return {
    lsEventId: String(lsEventId),
    lsOrderId: String(lsOrderId),
    eventName,
    customerEmail: attrs.user_email,
    amountCents: attrs.total,
    currency: attrs.currency,
    custom: {
      eventId: String(custom.eventId),
      adminId: String(custom.adminId),
      purpose: custom.purpose as PaymentPurpose,
    },
  };
}

export async function handleInitialPurchase(w: NormalizedWebhook): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: w.custom.eventId },
    select: { id: true, pricingTier: true },
  });
  if (!event) throw new Error(`Event ${w.custom.eventId} not found`);
  if (event.pricingTier === 'free') throw new Error('free tier should never reach this handler');

  await prisma.payment.upsert({
    where: { lsEventId: w.lsEventId },
    create: {
      eventId: w.custom.eventId,
      tier: event.pricingTier,
      amountCents: w.amountCents,
      currency: w.currency,
      status: 'paid',
      purpose: 'initial_purchase',
      lsCheckoutId: w.lsOrderId, // LS uses order id as effective checkout ref here
      lsOrderId: w.lsOrderId,
      lsEventId: w.lsEventId,
      customerEmail: w.customerEmail,
      updatedAt: new Date(),
    },
    update: {
      status: 'paid',
      lsOrderId: w.lsOrderId,
      updatedAt: new Date(),
    },
  });

  await prisma.event.update({
    where: { id: w.custom.eventId },
    data: {
      activatedAt: new Date(),
      pendingPaymentExpiresAt: null,
    },
  });
}
```

- [ ] **Step 4: Wire dispatch in webhook route**

Replace the "Dispatch happens in Phase 3.3+" block:

```ts
  const normalized = normalizeWebhook(payload);
  if (!normalized) {
    // Unknown event type — log & ack so LS stops retrying.
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    if (normalized.eventName === 'order_created') {
      if (normalized.custom.purpose === 'initial_purchase') {
        await handleInitialPurchase(normalized);
      }
      // upgrade + retention_extension handlers added in next tasks
    }
    // order_refunded handled in Task 3.6
  } catch (err) {
    console.error('LS webhook handler error:', err);
    return NextResponse.json({ error: 'handler failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
```

Add import at top:

```ts
import { normalizeWebhook, handleInitialPurchase } from '@/lib/lemonsqueezy/handlers';
```

- [ ] **Step 5: Run test, confirm pass**

```bash
pnpm test:unit -- lemonsqueezy-webhook
```

Expected: test passes.

- [ ] **Step 6: Commit**

```bash
git add lib/lemonsqueezy/handlers.ts app/api/webhooks/lemonsqueezy/route.ts __tests__/api/lemonsqueezy-webhook.test.ts
git commit -m "feat(paywall): handle order_created initial_purchase — activate event + persist payment"
```

### Task 3.4: Upgrade handler

**Files:**
- Modify: `lib/lemonsqueezy/handlers.ts`
- Modify: `app/api/webhooks/lemonsqueezy/route.ts`
- Modify: `__tests__/api/lemonsqueezy-webhook.test.ts`

- [ ] **Step 1: Write failing test**

```ts
it('handles upgrade order_created: updates tier and imageLimit, snapshots previous', async () => {
  const customData = { eventId: 'e2', adminId: 'a2', purpose: 'upgrade', toTier: 'premium' };
  const body = JSON.stringify({
    meta: { event_name: 'order_created', event_id: 'evt_up_1', custom_data: customData },
    data: { id: 'order_700', attributes: { user_email: 'a@b.c', total: 5000, currency: 'EUR', status: 'paid' } },
  });
  (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null);
  // Mock event lookup to get previous tier
  (prisma.event as any).findUnique = jest.fn(async () => ({ id: 'e2', pricingTier: 'basic', imageLimit: 7 }));
  (prisma.pricingPlan as any) = { findUnique: jest.fn(async () => ({ imageLimit: 25 })) };
  (prisma.payment.upsert as jest.Mock).mockResolvedValueOnce({ id: 'p2' });
  (prisma.event.update as jest.Mock).mockResolvedValueOnce({ id: 'e2' });

  const res = await POST(makeRequest(body, validSig(body)));
  expect(res.status).toBe(200);
  expect(prisma.event.update).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 'e2' },
    data: expect.objectContaining({ pricingTier: 'premium', imageLimit: 25 }),
  }));
  expect(prisma.payment.upsert).toHaveBeenCalledWith(expect.objectContaining({
    create: expect.objectContaining({
      purpose: 'upgrade',
      metadata: expect.objectContaining({ previousTier: 'basic', previousImageLimit: 7 }),
    }),
  }));
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
pnpm test:unit -- lemonsqueezy-webhook
```

Expected: FAIL — upgrade path not implemented.

- [ ] **Step 3: Add upgrade handler**

Append to `lib/lemonsqueezy/handlers.ts`:

```ts
import type { PricingTier } from '@/lib/pricing-tiers';
import { PRICING_TIERS } from '@/lib/pricing-tiers';

export async function handleUpgrade(w: NormalizedWebhook, payload: any): Promise<void> {
  const toTier = payload?.meta?.custom_data?.toTier as PricingTier | undefined;
  if (!toTier || toTier === 'free') throw new Error('upgrade webhook missing toTier or free');

  const event = await prisma.event.findUnique({
    where: { id: w.custom.eventId },
    select: { id: true, pricingTier: true, imageLimit: true },
  });
  if (!event) throw new Error(`Event ${w.custom.eventId} not found`);

  // Resolve new imageLimit from PricingPlan (DB) with hardcoded fallback.
  const plan = await prisma.pricingPlan.findUnique({
    where: { tier: toTier },
    select: { imageLimit: true },
  });
  const newImageLimit = plan?.imageLimit ?? PRICING_TIERS[toTier].imageLimit;

  await prisma.payment.upsert({
    where: { lsEventId: w.lsEventId },
    create: {
      eventId: w.custom.eventId,
      tier: toTier,
      amountCents: w.amountCents,
      currency: w.currency,
      status: 'paid',
      purpose: 'upgrade',
      lsCheckoutId: w.lsOrderId,
      lsOrderId: w.lsOrderId,
      lsEventId: w.lsEventId,
      customerEmail: w.customerEmail,
      metadata: {
        previousTier: event.pricingTier,
        previousImageLimit: event.imageLimit,
        toTier,
      },
      updatedAt: new Date(),
    },
    update: { status: 'paid', updatedAt: new Date() },
  });

  await prisma.event.update({
    where: { id: w.custom.eventId },
    data: { pricingTier: toTier, imageLimit: newImageLimit },
  });
}
```

- [ ] **Step 4: Wire dispatch in webhook route**

In `app/api/webhooks/lemonsqueezy/route.ts`, expand the dispatch block:

```ts
    if (normalized.eventName === 'order_created') {
      if (normalized.custom.purpose === 'initial_purchase') {
        await handleInitialPurchase(normalized);
      } else if (normalized.custom.purpose === 'upgrade') {
        await handleUpgrade(normalized, payload);
      }
      // retention_extension in Task 3.5
    }
```

Update import:

```ts
import { normalizeWebhook, handleInitialPurchase, handleUpgrade } from '@/lib/lemonsqueezy/handlers';
```

- [ ] **Step 5: Run test, confirm pass**

```bash
pnpm test:unit -- lemonsqueezy-webhook
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add lib/lemonsqueezy/handlers.ts app/api/webhooks/lemonsqueezy/route.ts __tests__/api/lemonsqueezy-webhook.test.ts
git commit -m "feat(paywall): handle upgrade webhook — update tier + imageLimit, snapshot previous"
```

### Task 3.5: Retention extension handler

**Files:**
- Modify: `lib/lemonsqueezy/handlers.ts`
- Modify: `app/api/webhooks/lemonsqueezy/route.ts`
- Modify: `__tests__/api/lemonsqueezy-webhook.test.ts`

- [ ] **Step 1: Write failing test**

```ts
it('handles retention_extension order_created: bumps retentionOverrideDays by 30', async () => {
  const customData = { eventId: 'e3', adminId: 'a3', purpose: 'retention_extension' };
  const body = JSON.stringify({
    meta: { event_name: 'order_created', event_id: 'evt_ret_1', custom_data: customData },
    data: { id: 'order_900', attributes: { user_email: 'a@b.c', total: 1500, currency: 'EUR', status: 'paid' } },
  });
  (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null);
  (prisma.event as any).findUnique = jest.fn(async () => ({ id: 'e3', pricingTier: 'basic', retentionOverrideDays: 60 }));
  (prisma.payment.upsert as jest.Mock).mockResolvedValueOnce({ id: 'p3' });
  (prisma.event.update as jest.Mock).mockResolvedValueOnce({ id: 'e3' });

  const res = await POST(makeRequest(body, validSig(body)));
  expect(res.status).toBe(200);
  expect(prisma.event.update).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 'e3' },
    data: expect.objectContaining({
      retentionOverrideDays: 90,
      deletionWarningSentAt: null,
    }),
  }));
  expect(prisma.payment.upsert).toHaveBeenCalledWith(expect.objectContaining({
    create: expect.objectContaining({
      purpose: 'retention_extension',
      retentionDaysGranted: 30,
    }),
  }));
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
pnpm test:unit -- lemonsqueezy-webhook
```

Expected: FAIL.

- [ ] **Step 3: Add handler**

Append to `lib/lemonsqueezy/handlers.ts`:

```ts
const RETENTION_DAYS_PER_PURCHASE = 30;
const RETENTION_MAX_OVERRIDE_DAYS = 365;

export async function handleRetentionExtension(w: NormalizedWebhook): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: w.custom.eventId },
    select: { id: true, pricingTier: true, retentionOverrideDays: true },
  });
  if (!event) throw new Error(`Event ${w.custom.eventId} not found`);
  if (event.pricingTier === 'free') throw new Error('free tier cannot have retention extension');

  const newOverride = Math.min(
    event.retentionOverrideDays + RETENTION_DAYS_PER_PURCHASE,
    RETENTION_MAX_OVERRIDE_DAYS
  );

  await prisma.payment.upsert({
    where: { lsEventId: w.lsEventId },
    create: {
      eventId: w.custom.eventId,
      tier: event.pricingTier,
      amountCents: w.amountCents,
      currency: w.currency,
      status: 'paid',
      purpose: 'retention_extension',
      lsCheckoutId: w.lsOrderId,
      lsOrderId: w.lsOrderId,
      lsEventId: w.lsEventId,
      customerEmail: w.customerEmail,
      retentionDaysGranted: RETENTION_DAYS_PER_PURCHASE,
      updatedAt: new Date(),
    },
    update: { status: 'paid', updatedAt: new Date() },
  });

  await prisma.event.update({
    where: { id: w.custom.eventId },
    data: {
      retentionOverrideDays: newOverride,
      deletionWarningSentAt: null,
    },
  });
}
```

- [ ] **Step 4: Wire dispatch**

Update `app/api/webhooks/lemonsqueezy/route.ts`:

```ts
      } else if (normalized.custom.purpose === 'retention_extension') {
        await handleRetentionExtension(normalized);
      }
```

Update import:

```ts
import { normalizeWebhook, handleInitialPurchase, handleUpgrade, handleRetentionExtension } from '@/lib/lemonsqueezy/handlers';
```

- [ ] **Step 5: Run test, confirm pass**

```bash
pnpm test:unit -- lemonsqueezy-webhook
```

- [ ] **Step 6: Commit**

```bash
git add lib/lemonsqueezy/handlers.ts app/api/webhooks/lemonsqueezy/route.ts __tests__/api/lemonsqueezy-webhook.test.ts
git commit -m "feat(paywall): handle retention extension webhook — +30 days up to 365 cap"
```

### Task 3.6: Refund dispatch

**Files:**
- Modify: `lib/lemonsqueezy/handlers.ts`
- Modify: `app/api/webhooks/lemonsqueezy/route.ts`
- Modify: `__tests__/api/lemonsqueezy-webhook.test.ts`

- [ ] **Step 1: Write failing test**

```ts
it('handles order_refunded for initial_purchase: clears activatedAt', async () => {
  const customData = { eventId: 'e1', adminId: 'a1', purpose: 'initial_purchase' };
  const body = JSON.stringify({
    meta: { event_name: 'order_refunded', event_id: 'evt_ref_1', custom_data: customData },
    data: { id: 'order_555', attributes: { user_email: 'a@b.c', total: 2500, currency: 'EUR', status: 'refunded' } },
  });
  (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null);
  (prisma.payment as any).findFirst = jest.fn(async () => ({
    id: 'p1', purpose: 'initial_purchase', eventId: 'e1',
    lsOrderId: 'order_555', retentionDaysGranted: null, metadata: null,
  }));
  (prisma.payment.update as jest.Mock).mockResolvedValueOnce({ id: 'p1' });
  (prisma.event.update as jest.Mock).mockResolvedValueOnce({ id: 'e1' });

  const res = await POST(makeRequest(body, validSig(body)));
  expect(res.status).toBe(200);
  expect(prisma.payment.update).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 'p1' },
    data: expect.objectContaining({ status: 'refunded', refundedAt: expect.any(Date) }),
  }));
  expect(prisma.event.update).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 'e1' },
    data: { activatedAt: null },
  }));
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
pnpm test:unit -- lemonsqueezy-webhook
```

- [ ] **Step 3: Add refund handler**

Append to `lib/lemonsqueezy/handlers.ts`:

```ts
export async function handleRefund(w: NormalizedWebhook): Promise<void> {
  const payment = await prisma.payment.findFirst({
    where: { lsOrderId: w.lsOrderId },
    select: { id: true, purpose: true, eventId: true, retentionDaysGranted: true, metadata: true },
  });
  if (!payment) {
    console.warn(`Refund webhook for unknown order ${w.lsOrderId}`);
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'refunded',
      refundedAmountCents: w.amountCents,
      refundedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  if (payment.purpose === 'initial_purchase') {
    await prisma.event.update({
      where: { id: payment.eventId },
      data: { activatedAt: null },
    });
  } else if (payment.purpose === 'upgrade') {
    const meta = (payment.metadata as any) || {};
    if (meta.previousTier && meta.previousImageLimit != null) {
      await prisma.event.update({
        where: { id: payment.eventId },
        data: {
          pricingTier: meta.previousTier,
          imageLimit: meta.previousImageLimit,
        },
      });
    }
  } else if (payment.purpose === 'retention_extension') {
    const days = payment.retentionDaysGranted ?? 0;
    const event = await prisma.event.findUnique({
      where: { id: payment.eventId },
      select: { retentionOverrideDays: true },
    });
    if (event) {
      await prisma.event.update({
        where: { id: payment.eventId },
        data: { retentionOverrideDays: Math.max(0, event.retentionOverrideDays - days) },
      });
    }
  }
}
```

- [ ] **Step 4: Wire dispatch**

In webhook route:

```ts
    if (normalized.eventName === 'order_created') {
      // ... existing dispatch
    } else if (normalized.eventName === 'order_refunded') {
      await handleRefund(normalized);
    }
```

Update import:

```ts
import { normalizeWebhook, handleInitialPurchase, handleUpgrade, handleRetentionExtension, handleRefund } from '@/lib/lemonsqueezy/handlers';
```

- [ ] **Step 5: Run tests, confirm pass**

```bash
pnpm test:unit -- lemonsqueezy-webhook
```

- [ ] **Step 6: Commit**

```bash
git add lib/lemonsqueezy/handlers.ts app/api/webhooks/lemonsqueezy/route.ts __tests__/api/lemonsqueezy-webhook.test.ts
git commit -m "feat(paywall): handle refund webhook per purpose type"
```

### Task 3.7: Mark webhook processed timestamp

**Files:**
- Modify: `app/api/webhooks/lemonsqueezy/route.ts`

- [ ] **Step 1: After successful dispatch, update WebhookLog with processedAt**

Refactor the route to keep the `webhookLog` id and update it after dispatch:

```ts
  const logRow = await prisma.webhookLog.create({
    data: { /* ...as before... */ },
  });

  if (!signatureValid) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  // ... idempotency check unchanged ...

  // ... dispatch unchanged ...

  await prisma.webhookLog.update({
    where: { id: logRow.id },
    data: { processedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
```

If dispatch throws, also update the log with the error:

```ts
  try {
    /* dispatch */
  } catch (err) {
    await prisma.webhookLog.update({
      where: { id: logRow.id },
      data: { error: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.json({ error: 'handler failed' }, { status: 500 });
  }
```

- [ ] **Step 2: Add test**

```ts
it('marks WebhookLog.processedAt on success', async () => {
  const customData = { eventId: 'e1', adminId: 'a1', purpose: 'initial_purchase' };
  const body = JSON.stringify({
    meta: { event_name: 'order_created', event_id: 'evt_proc_1', custom_data: customData },
    data: { id: 'order_111', attributes: { user_email: 'a@b.c', total: 2500, currency: 'EUR', status: 'paid' } },
  });
  (prisma.webhookLog.create as jest.Mock).mockResolvedValueOnce({ id: 'wl_proc' });
  (prisma.webhookLog as any).update = jest.fn(async () => ({ id: 'wl_proc' }));
  (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null);
  (prisma.payment.upsert as jest.Mock).mockResolvedValueOnce({ id: 'p1' });
  (prisma.event.update as jest.Mock).mockResolvedValueOnce({ id: 'e1' });

  await POST(makeRequest(body, validSig(body)));
  expect(prisma.webhookLog.update).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 'wl_proc' },
    data: { processedAt: expect.any(Date) },
  }));
});
```

- [ ] **Step 3: Run tests, confirm pass**

```bash
pnpm test:unit -- lemonsqueezy-webhook
```

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/lemonsqueezy/route.ts __tests__/api/lemonsqueezy-webhook.test.ts
git commit -m "feat(paywall): mark WebhookLog.processedAt + error on dispatch"
```

---

## Phase 4 — Paid event creation flow

### Task 4.1: Modify event creation API to branch free vs paid

**Files:**
- Modify: `app/api/admin/events/route.tsx`
- Test: `__tests__/api/admin-events-paywall.test.ts`

- [ ] **Step 1: Write failing test** — free path returns event with no checkoutUrl

```ts
// __tests__/api/admin-events-paywall.test.ts
import { POST } from '@/app/api/admin/events/route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    adminSession: { findUnique: jest.fn() },
    admin: { findUnique: jest.fn() },
    event: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    pricingPlan: { findUnique: jest.fn() },
    payment: { create: jest.fn() },
  },
}));

jest.mock('@/lib/lemonsqueezy/client', () => ({
  createCheckoutUrl: jest.fn(async () => 'https://checkout.lemonsqueezy.com/abc'),
}));

jest.mock('@/lib/csrf', () => ({
  validateCsrfToken: jest.fn(async () => true),
  generateCsrfToken: jest.fn(async () => ({ token: 't', cookie: 'c' })),
}));

function makeReq(body: any) {
  return new Request('https://x/api/admin/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': 't', cookie: 'admin_session=sess1' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/events paywall behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.adminSession.findUnique as jest.Mock).mockResolvedValue({
      admin: { id: 'a1', email: 'a@b.c' }, expiresAt: new Date(Date.now() + 100000),
    });
    (prisma.event.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.admin.findUnique as jest.Mock).mockResolvedValue({ language: 'sr' });
    (prisma.pricingPlan.findUnique as jest.Mock).mockResolvedValue({ imageLimit: 3 });
  });

  it('creates free event with activatedAt set and no checkoutUrl', async () => {
    (prisma.event.create as jest.Mock).mockResolvedValueOnce({ id: 'e_free', slug: 'free-slug' });
    const res = await POST(makeReq({
      coupleName: 'Marko i Ana', location: 'Bg', date: '2027-01-01',
      slug: 'free-slug', pricingTier: 'free',
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checkoutUrl).toBeUndefined();
    expect(prisma.event.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ pricingTier: 'free', activatedAt: expect.any(Date) }),
    }));
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('creates paid event pending + Payment(pending) + returns checkoutUrl', async () => {
    (prisma.event.create as jest.Mock).mockResolvedValueOnce({ id: 'e_paid', slug: 'paid-slug' });
    (prisma.pricingPlan.findUnique as jest.Mock).mockResolvedValue({ imageLimit: 7 });
    (prisma.payment.create as jest.Mock).mockResolvedValueOnce({ id: 'p1' });

    const res = await POST(makeReq({
      coupleName: 'X Y', location: 'Bg', date: '2027-01-01',
      slug: 'paid-slug', pricingTier: 'basic',
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checkoutUrl).toBe('https://checkout.lemonsqueezy.com/abc');
    expect(prisma.event.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        pricingTier: 'basic',
        activatedAt: null,
        pendingPaymentExpiresAt: expect.any(Date),
      }),
    }));
    expect(prisma.payment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventId: 'e_paid', status: 'pending', purpose: 'initial_purchase',
      }),
    }));
  });
});
```

- [ ] **Step 2: Run, confirm fail**

```bash
pnpm test:unit -- admin-events-paywall
```

- [ ] **Step 3: Modify `app/api/admin/events/route.tsx`** — replace the event creation block:

Locate the lines that currently call `prisma.event.create({ data: { ... } })` and replace with:

```ts
    const PENDING_TTL_MS = 1000 * 60 * 60 * 24; // 24h
    const isFree = selectedTier === 'free';
    const now = new Date();

    const event = await prisma.event.create({
      data: {
        coupleName,
        location,
        date: new Date(date),
        slug,
        guestMessage: guestMessage || null,
        language: admin?.language || 'sr',
        pricingTier: selectedTier,
        imageLimit: resolvedImageLimit,
        activatedAt: isFree ? now : null,
        pendingPaymentExpiresAt: isFree ? null : new Date(now.getTime() + PENDING_TTL_MS),
        admin: { connect: { id: adminId } },
      },
    });

    if (isFree) {
      return NextResponse.json({ success: true, event });
    }

    // Paid: create pending Payment, generate LS checkout URL
    const { resolveVariantId } = await import('@/lib/lemonsqueezy/variants');
    const { createCheckoutUrl } = await import('@/lib/lemonsqueezy/client');

    const variantId = resolveVariantId({ purpose: 'initial_purchase', tier: selectedTier });
    const checkoutUrl = await createCheckoutUrl({
      variantId,
      customerEmail: session.admin.email,
      customData: {
        eventId: event.id,
        adminId: adminId,
        purpose: 'initial_purchase',
      },
      successRedirectUrl: `${process.env.NEXTAUTH_URL || 'https://www.dodajuspomenu.com'}admin/dashboard/${event.id}?paid=1`,
    });

    // Persist a pending Payment so we can correlate to the eventual webhook.
    // lsCheckoutId is set to a placeholder; webhook will upsert by lsEventId.
    await prisma.payment.create({
      data: {
        eventId: event.id,
        tier: selectedTier,
        amountCents: 0, // real amount comes from webhook
        currency: 'EUR',
        status: 'pending',
        purpose: 'initial_purchase',
        lsCheckoutId: `pending_${event.id}`,
        customerEmail: session.admin.email,
        metadata: { checkoutUrlGeneratedAt: now.toISOString(), requestingAdminId: adminId },
        updatedAt: now,
      },
    });

    return NextResponse.json({ success: true, event, checkoutUrl });
```

- [ ] **Step 4: Run, confirm pass**

```bash
pnpm test:unit -- admin-events-paywall
```

- [ ] **Step 5: Run full test suite to catch regressions**

```bash
pnpm test:unit
```

Expected: no new failures. If `admin-events-invariant.test.ts` breaks because of new required fields, update its mock accordingly.

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/events/route.tsx __tests__/api/admin-events-paywall.test.ts
git commit -m "feat(paywall): branch event creation — free instant, paid returns LS checkoutUrl"
```

### Task 4.2: Update event creation page client

**Files:**
- Modify: `app/admin/event/page.tsx`

- [ ] **Step 1: Locate the form submit handler** in `app/admin/event/page.tsx`. Find where `router.push('/admin/dashboard/...')` happens after successful POST. Replace that block.

- [ ] **Step 2: Handle 2-shape response**

```ts
// In the onSubmit handler, after `const data = await res.json()`:
if (data.checkoutUrl) {
  // Paid tier: redirect to LS hosted checkout
  window.location.href = data.checkoutUrl;
  return;
}
// Free tier: navigate to dashboard as before
router.push(`/admin/dashboard/${data.event.id}`);
```

- [ ] **Step 3: Manual smoke test**

Run dev server:

```bash
pnpm dev
```

- Open `http://localhost:3000/sr/admin/event` (must be logged in as admin)
- Select **Free** tier, submit → should land on dashboard
- Reset DB, select **Basic** tier, submit → should redirect to LS test checkout

(Skip the actual LS payment for now; just verify the redirect happens.)

- [ ] **Step 4: Commit**

```bash
git add app/admin/event/page.tsx
git commit -m "feat(paywall): handle paid checkoutUrl response in event creation form"
```

---

## Phase 5 — Pending event lock & UI

### Task 5.1: Update admin-auth helper to expose activatedAt

**Files:**
- Modify: `lib/admin-auth.ts`

- [ ] **Step 1: Read current state**

```bash
grep -n "event:" lib/admin-auth.ts | head -5
```

- [ ] **Step 2: Add `activatedAt`, `pendingPaymentExpiresAt` to the event include**

In `lib/admin-auth.ts`, find the `select` or `include` block that fetches `admin.event` and add the two new fields. Concretely if the current code has `event: { select: { id: true, slug: true, ... } }`, append `activatedAt: true, pendingPaymentExpiresAt: true`.

- [ ] **Step 3: Run existing tests**

```bash
pnpm test:unit -- admin-auth || true
pnpm test:unit
```

Expected: no failures.

- [ ] **Step 4: Commit**

```bash
git add lib/admin-auth.ts
git commit -m "feat(paywall): expose activatedAt + pendingPaymentExpiresAt via getAuthenticatedAdmin"
```

### Task 5.2: Pending event page

**Files:**
- Create: `app/admin/event/pending/page.tsx`
- Create: `app/api/admin/events/pending-checkout/route.ts` (regenerates URL)

- [ ] **Step 1: Create the regenerate-checkout API route**

```ts
// app/api/admin/events/pending-checkout/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { validateCsrfToken, generateCsrfToken } from '@/lib/csrf';
import { resolveVariantId } from '@/lib/lemonsqueezy/variants';
import { createCheckoutUrl } from '@/lib/lemonsqueezy/client';
import type { PricingTier } from '@/lib/pricing-tiers';

export async function GET() {
  const { token, cookie } = await generateCsrfToken();
  const r = NextResponse.json({ csrfToken: token });
  r.headers.set('set-cookie', cookie);
  return r;
}

export async function POST(req: Request) {
  const csrf = req.headers.get('x-csrf-token') || '';
  if (!(await validateCsrfToken(csrf))) {
    return NextResponse.json({ error: 'invalid csrf' }, { status: 403 });
  }
  const admin = await getAuthenticatedAdmin();
  if (!admin?.event) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (admin.event.activatedAt) {
    return NextResponse.json({ error: 'event already active' }, { status: 409 });
  }
  if (admin.event.pricingTier === 'free') {
    return NextResponse.json({ error: 'free tier needs no checkout' }, { status: 400 });
  }

  const variantId = resolveVariantId({
    purpose: 'initial_purchase',
    tier: admin.event.pricingTier as Exclude<PricingTier, 'free'>,
  });
  const checkoutUrl = await createCheckoutUrl({
    variantId,
    customerEmail: admin.email,
    customData: {
      eventId: admin.event.id,
      adminId: admin.id,
      purpose: 'initial_purchase',
    },
    successRedirectUrl: `${process.env.NEXTAUTH_URL || 'https://www.dodajuspomenu.com'}admin/dashboard/${admin.event.id}?paid=1`,
  });
  return NextResponse.json({ checkoutUrl });
}
```

- [ ] **Step 2: Create the pending page**

```tsx
// app/admin/event/pending/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PendingPaymentPage() {
  const router = useRouter();
  const [eventInfo, setEventInfo] = useState<{ coupleName: string; pricingTier: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pull event info from /api/admin/me or similar
    fetch('/api/admin/me').then(r => r.json()).then(data => {
      if (data?.event?.activatedAt) {
        router.replace(`/admin/dashboard/${data.event.id}`);
        return;
      }
      setEventInfo({ coupleName: data?.event?.coupleName, pricingTier: data?.event?.pricingTier });
    });
  }, [router]);

  async function payNow() {
    setLoading(true);
    setError(null);
    try {
      const csrfRes = await fetch('/api/admin/events/pending-checkout');
      const { csrfToken } = await csrfRes.json();
      const res = await fetch('/api/admin/events/pending-checkout', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken, 'content-type': 'application/json' },
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.error || 'Greška');
      }
    } finally {
      setLoading(false);
    }
  }

  async function cancelEvent() {
    if (!confirm('Sigurno otkažeš događaj? URL će biti oslobođen.')) return;
    setLoading(true);
    try {
      const csrfRes = await fetch('/api/admin/events/cancel-pending');
      const { csrfToken } = await csrfRes.json();
      await fetch('/api/admin/events/cancel-pending', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
      });
      router.replace('/admin/event');
    } finally {
      setLoading(false);
    }
  }

  if (!eventInfo) return <div className="p-8">Učitavanje...</div>;

  return (
    <div className="container mx-auto py-12 max-w-xl">
      <Card>
        <CardContent className="space-y-6 pt-6">
          <h1 className="text-2xl font-bold">Plaćanje na čekanju</h1>
          <p>Tvoj događaj <strong>{eventInfo.coupleName}</strong> ({eventInfo.pricingTier}) je rezervisan. Završi plaćanje da bi aktivirao admin dashboard.</p>
          {error && <div className="text-red-600">{error}</div>}
          <div className="flex gap-3">
            <Button onClick={payNow} disabled={loading}>Plati sad</Button>
            <Button variant="outline" onClick={cancelEvent} disabled={loading}>Otkaži događaj</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Refund je moguć u roku od 7 dana — kontaktirajte support@dodajuspomenu.com.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Create `/api/admin/me` if it doesn't exist**

Check first:

```bash
ls app/api/admin/me/ 2>/dev/null
```

If missing, create:

```ts
// app/api/admin/me/route.ts
import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ id: admin.id, email: admin.email, event: admin.event });
}
```

- [ ] **Step 4: Create cancel-pending route**

```ts
// app/api/admin/events/cancel-pending/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { validateCsrfToken, generateCsrfToken } from '@/lib/csrf';

export async function GET() {
  const { token, cookie } = await generateCsrfToken();
  const r = NextResponse.json({ csrfToken: token });
  r.headers.set('set-cookie', cookie);
  return r;
}

export async function POST(req: Request) {
  const csrf = req.headers.get('x-csrf-token') || '';
  if (!(await validateCsrfToken(csrf))) {
    return NextResponse.json({ error: 'invalid csrf' }, { status: 403 });
  }
  const admin = await getAuthenticatedAdmin();
  if (!admin?.event) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (admin.event.activatedAt) {
    return NextResponse.json({ error: 'cannot cancel active event' }, { status: 409 });
  }
  // Delete pending Payment rows + the event
  await prisma.payment.deleteMany({ where: { eventId: admin.event.id, status: 'pending' } });
  await prisma.event.delete({ where: { id: admin.event.id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/event/pending/page.tsx app/api/admin/events/pending-checkout/ app/api/admin/events/cancel-pending/ app/api/admin/me/
git commit -m "feat(paywall): pending event page + regenerate-checkout + cancel-pending routes"
```

### Task 5.3: Middleware redirect for pending events

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Read current middleware to understand patterns**

```bash
cat middleware.ts | head -80
```

- [ ] **Step 2: Add post-auth pending check**

The middleware currently only checks cookie presence. The actual DB lookup happens in route handlers. For the pending-event redirect, we use a **lightweight cookie hint** set on event creation, OR we let the dashboard route itself redirect server-side.

**Simpler approach: server-side redirect in the dashboard layout.** Add to `app/admin/dashboard/[eventId]/layout.tsx` (or page.tsx if no layout):

```tsx
// In the server component for the dashboard route
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children, params }: { children: React.ReactNode; params: { eventId: string } }) {
  const admin = await getAuthenticatedAdmin();
  if (!admin?.event) redirect('/admin/event');
  if (admin.event.id !== params.eventId) redirect(`/admin/dashboard/${admin.event.id}`);
  if (!admin.event.activatedAt) redirect('/admin/event/pending');
  return children;
}
```

If a layout already exists in that path, edit it to include this check at the top. Verify:

```bash
ls app/admin/dashboard/[eventId]/
```

If `layout.tsx` exists, modify it. Otherwise create the layout file above.

- [ ] **Step 3: Manual smoke test**

```bash
pnpm dev
```

- Create a paid event (Basic) → redirect goes to LS test checkout
- Hit back button to return to app → URL is `/sr/admin/event` or wherever LS cancel redirects to
- Manually navigate to `/sr/admin/dashboard/<eventId>` → should redirect to `/sr/admin/event/pending`
- On pending page, click "Otkaži događaj" → confirms → event deleted, lands on `/admin/event`

- [ ] **Step 4: Commit**

```bash
git add app/admin/dashboard/
git commit -m "feat(paywall): dashboard layout redirects pending events to /admin/event/pending"
```

---

## **🎉 Milestone M1 reached** — paid event creation works end-to-end.

Smoke test the full M1 flow before continuing:

- [ ] Create free event → instant dashboard access
- [ ] Create basic event → redirected to LS checkout → pay with test card → return → dashboard accessible
- [ ] Create premium event without paying → land on pending page → cancel → event removed
- [ ] Re-create same slug after cancellation → succeeds (slug freed)

If anything fails, fix before moving to Phase 6.

---

## Phase 6 — Tier upgrade flow

### Task 6.1: Upgrade API route

**Files:**
- Create: `app/api/admin/events/upgrade/route.ts`
- Test: `__tests__/api/admin-events-upgrade.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/api/admin-events-upgrade.test.ts
import { POST } from '@/app/api/admin/events/upgrade/route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    payment: { create: jest.fn() },
  },
}));
jest.mock('@/lib/admin-auth', () => ({
  getAuthenticatedAdmin: jest.fn(),
}));
jest.mock('@/lib/csrf', () => ({
  validateCsrfToken: jest.fn(async () => true),
  generateCsrfToken: jest.fn(async () => ({ token: 't', cookie: 'c' })),
}));
jest.mock('@/lib/lemonsqueezy/client', () => ({
  createCheckoutUrl: jest.fn(async () => 'https://lc.test/checkout/up'),
}));

import { getAuthenticatedAdmin } from '@/lib/admin-auth';

function req(body: any) {
  return new Request('https://x/api/admin/events/upgrade', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': 't' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/events/upgrade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LS_VARIANT_BASIC = 'vb';
    process.env.LS_VARIANT_PREMIUM = 'vp';
    process.env.LS_VARIANT_UPGRADE_BASIC_TO_PREMIUM = 'vu';
  });

  it('returns checkoutUrl for free→basic upgrade', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'free' },
    });
    (prisma.payment.create as jest.Mock).mockResolvedValueOnce({ id: 'p1' });

    const res = await POST(req({ toTier: 'basic' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checkoutUrl).toBe('https://lc.test/checkout/up');
    expect(prisma.payment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ purpose: 'upgrade', status: 'pending' }),
    }));
  });

  it('rejects free→free or premium→premium', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'premium' },
    });
    const res = await POST(req({ toTier: 'premium' }));
    expect(res.status).toBe(400);
  });

  it('rejects upgrade on inactive (pending) event', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: null, pricingTier: 'basic' },
    });
    const res = await POST(req({ toTier: 'premium' }));
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run, confirm fail**

```bash
pnpm test:unit -- admin-events-upgrade
```

- [ ] **Step 3: Implement route**

```ts
// app/api/admin/events/upgrade/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { validateCsrfToken, generateCsrfToken } from '@/lib/csrf';
import { resolveVariantId } from '@/lib/lemonsqueezy/variants';
import { createCheckoutUrl } from '@/lib/lemonsqueezy/client';
import { isValidTier, type PricingTier } from '@/lib/pricing-tiers';

export async function GET() {
  const { token, cookie } = await generateCsrfToken();
  const r = NextResponse.json({ csrfToken: token });
  r.headers.set('set-cookie', cookie);
  return r;
}

export async function POST(req: Request) {
  const csrf = req.headers.get('x-csrf-token') || '';
  if (!(await validateCsrfToken(csrf))) {
    return NextResponse.json({ error: 'invalid csrf' }, { status: 403 });
  }
  const admin = await getAuthenticatedAdmin();
  if (!admin?.event) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const toTier = body?.toTier;
  if (!isValidTier(toTier) || toTier === 'free') {
    return NextResponse.json({ error: 'toTier must be basic or premium' }, { status: 400 });
  }
  const fromTier = admin.event.pricingTier as PricingTier;
  if (fromTier === toTier) {
    return NextResponse.json({ error: `already on ${toTier}` }, { status: 400 });
  }
  // Only allow forward upgrades (no downgrades in v1)
  const order: PricingTier[] = ['free', 'basic', 'premium'];
  if (order.indexOf(toTier) <= order.indexOf(fromTier)) {
    return NextResponse.json({ error: 'downgrades not supported' }, { status: 400 });
  }
  if (!admin.event.activatedAt) {
    return NextResponse.json({ error: 'finish initial payment first' }, { status: 409 });
  }

  const variantId = resolveVariantId({ purpose: 'upgrade', fromTier, toTier });
  const checkoutUrl = await createCheckoutUrl({
    variantId,
    customerEmail: admin.email,
    customData: {
      eventId: admin.event.id,
      adminId: admin.id,
      purpose: 'upgrade',
      toTier,
    },
    successRedirectUrl: `${process.env.NEXTAUTH_URL || 'https://www.dodajuspomenu.com'}admin/dashboard/${admin.event.id}?upgraded=1`,
  });

  await prisma.payment.create({
    data: {
      eventId: admin.event.id,
      tier: toTier,
      amountCents: 0,
      currency: 'EUR',
      status: 'pending',
      purpose: 'upgrade',
      lsCheckoutId: `pending_up_${admin.event.id}_${Date.now()}`,
      customerEmail: admin.email,
      metadata: { fromTier, toTier, requestingAdminId: admin.id },
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ checkoutUrl });
}
```

- [ ] **Step 4: Run, confirm pass**

```bash
pnpm test:unit -- admin-events-upgrade
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/events/upgrade/route.ts __tests__/api/admin-events-upgrade.test.ts
git commit -m "feat(paywall): tier upgrade route — free→paid, basic→premium"
```

### Task 6.2: Upgrade page UI

**Files:**
- Create: `app/admin/upgrade/page.tsx`

- [ ] **Step 1: Build page**

```tsx
// app/admin/upgrade/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type TierInfo = { tier: 'basic' | 'premium'; price: number; label: string };

const OPTIONS_FROM_FREE: TierInfo[] = [
  { tier: 'basic', price: 25, label: 'Basic — €25' },
  { tier: 'premium', price: 75, label: 'Premium — €75' },
];
const OPTIONS_FROM_BASIC: TierInfo[] = [
  { tier: 'premium', price: 50, label: 'Premium upgrade — €50 (razlika)' },
];

export default function UpgradePage() {
  const router = useRouter();
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/me').then(r => r.json()).then(d => {
      setCurrentTier(d?.event?.pricingTier ?? null);
      if (d?.event?.pricingTier === 'premium') {
        router.replace(`/admin/dashboard/${d.event.id}`);
      }
    });
  }, [router]);

  async function buy(toTier: 'basic' | 'premium') {
    setLoading(toTier);
    try {
      const csrf = await fetch('/api/admin/events/upgrade').then(r => r.json());
      const res = await fetch('/api/admin/events/upgrade', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf.csrfToken },
        body: JSON.stringify({ toTier }),
      });
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else alert(data.error);
    } finally {
      setLoading(null);
    }
  }

  if (!currentTier) return <div className="p-8">Učitavanje...</div>;

  const options = currentTier === 'free' ? OPTIONS_FROM_FREE : OPTIONS_FROM_BASIC;

  return (
    <div className="container mx-auto py-12 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Nadogradnja paketa</h1>
      <div className="grid gap-4">
        {options.map(opt => (
          <Card key={opt.tier}>
            <CardContent className="flex justify-between items-center py-6">
              <div className="font-semibold">{opt.label}</div>
              <Button onClick={() => buy(opt.tier)} disabled={loading !== null}>
                {loading === opt.tier ? 'Učitava...' : 'Plati'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-6">
        Refund je moguć u roku od 7 dana — kontaktirajte support@dodajuspomenu.com.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke test**

```bash
pnpm dev
```

- Log in as admin with a free event, navigate to `/sr/admin/upgrade` → see Basic and Premium options
- Click Basic → redirect to LS test checkout
- (Reset DB or upgrade scenario for basic admin) → see only Premium €50 option

- [ ] **Step 3: Commit**

```bash
git add app/admin/upgrade/page.tsx
git commit -m "feat(paywall): /admin/upgrade page with tier-specific options"
```

### Task 6.3: Upgrade banner in dashboard

**Files:**
- Modify: dashboard component file (likely `components/admin/AdminDashboardTabs.tsx` or similar — verify location first)

- [ ] **Step 1: Locate banner insertion point**

```bash
grep -rn "free\|pricingTier" components/admin/ --include="*.tsx" | head
```

- [ ] **Step 2: Add banner above tabs**

In the dashboard component (find the main dashboard wrapper), add at the top of the rendered tree:

```tsx
{event.pricingTier !== 'premium' && (
  <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4 flex justify-between items-center">
    <div>
      <strong>Otključajte sve funkcije</strong>
      <p className="text-sm text-muted-foreground">
        {event.pricingTier === 'free' ? 'Pređite na Basic (€25) ili Premium (€75)' : 'Pređite na Premium (+€50)'}
      </p>
    </div>
    <a href="/admin/upgrade" className="btn btn-primary">Nadogradi</a>
  </div>
)}
```

(Use whatever button/link classes match the existing design system.)

- [ ] **Step 3: Manual smoke**

```bash
pnpm dev
```

- View dashboard as free admin → banner visible
- View dashboard as premium admin → banner hidden

- [ ] **Step 4: Commit**

```bash
git add components/admin/
git commit -m "feat(paywall): upgrade banner on dashboard for non-premium tiers"
```

---

## **🎉 Milestone M2 reached** — tier upgrade works.

Smoke test:
- [ ] Free → Basic upgrade: pay with test card → webhook → tier updated → banner now shows "→ Premium" CTA
- [ ] Basic → Premium upgrade: pay with test card → tier=premium, imageLimit=25
- [ ] Refund on test order via LS dashboard → tier reverts, photos intact

---

## Phase 7 — Retention extension paywall

### Task 7.1: Convert extend-retention to paywall

**Files:**
- Modify: `app/api/admin/events/extend-retention/route.ts`
- Test: `__tests__/api/extend-retention-paywall.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/api/extend-retention-paywall.test.ts
import { POST } from '@/app/api/admin/events/extend-retention/route';

jest.mock('@/lib/admin-auth', () => ({ getAuthenticatedAdmin: jest.fn() }));
jest.mock('@/lib/prisma', () => ({ prisma: { payment: { create: jest.fn() } } }));
jest.mock('@/lib/csrf', () => ({
  validateCsrfToken: jest.fn(async () => true),
  generateCsrfToken: jest.fn(async () => ({ token: 't', cookie: 'c' })),
}));
jest.mock('@/lib/lemonsqueezy/client', () => ({
  createCheckoutUrl: jest.fn(async () => 'https://lc.test/checkout/ret'),
}));

import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

function req() {
  return new Request('https://x/api/admin/events/extend-retention', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': 't' },
    body: '{}',
  });
}

describe('POST /api/admin/events/extend-retention (paywall)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LS_VARIANT_RETENTION_30 = 'vr';
  });

  it('returns checkoutUrl for paid tier admin', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'basic', retentionOverrideDays: 30 },
    });
    const res = await POST(req());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checkoutUrl).toBe('https://lc.test/checkout/ret');
    expect(prisma.payment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ purpose: 'retention_extension', status: 'pending' }),
    }));
  });

  it('rejects free tier', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'free', retentionOverrideDays: 0 },
    });
    const res = await POST(req());
    expect(res.status).toBe(403);
  });

  it('rejects when retention cap reached (335+ days)', async () => {
    (getAuthenticatedAdmin as jest.Mock).mockResolvedValueOnce({
      id: 'a1', email: 'a@b.c',
      event: { id: 'e1', activatedAt: new Date(), pricingTier: 'premium', retentionOverrideDays: 340 },
    });
    const res = await POST(req());
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run, confirm fail**

```bash
pnpm test:unit -- extend-retention-paywall
```

- [ ] **Step 3: Rewrite the route**

Replace the entire `app/api/admin/events/extend-retention/route.ts` with:

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCsrfToken, validateCsrfToken } from '@/lib/csrf';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { resolveVariantId } from '@/lib/lemonsqueezy/variants';
import { createCheckoutUrl } from '@/lib/lemonsqueezy/client';

const RETENTION_MAX_OVERRIDE_DAYS = 365;
const RETENTION_DAYS_PER_PURCHASE = 30;

export async function GET() {
  const { token, cookie } = await generateCsrfToken();
  const r = NextResponse.json({ csrfToken: token });
  r.headers.set('set-cookie', cookie);
  return r;
}

export async function POST(req: Request) {
  const csrf = req.headers.get('x-csrf-token') || '';
  if (!(await validateCsrfToken(csrf))) {
    return NextResponse.json({ error: 'Neispravan CSRF token.' }, { status: 403 });
  }
  const admin = await getAuthenticatedAdmin();
  if (!admin?.event) return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 });
  if (admin.event.pricingTier === 'free') {
    return NextResponse.json({ error: 'Free tier mora prvo nadograditi paket.' }, { status: 403 });
  }
  if (admin.event.retentionOverrideDays + RETENTION_DAYS_PER_PURCHASE > RETENTION_MAX_OVERRIDE_DAYS) {
    return NextResponse.json({ error: `Maksimalna retencija je ${RETENTION_MAX_OVERRIDE_DAYS} dana.` }, { status: 409 });
  }

  const variantId = resolveVariantId({ purpose: 'retention_extension' });
  const checkoutUrl = await createCheckoutUrl({
    variantId,
    customerEmail: admin.email,
    customData: {
      eventId: admin.event.id,
      adminId: admin.id,
      purpose: 'retention_extension',
    },
    successRedirectUrl: `${process.env.NEXTAUTH_URL || 'https://www.dodajuspomenu.com'}admin/dashboard/${admin.event.id}?retention=1`,
  });

  await prisma.payment.create({
    data: {
      eventId: admin.event.id,
      tier: admin.event.pricingTier,
      amountCents: 0,
      currency: 'EUR',
      status: 'pending',
      purpose: 'retention_extension',
      lsCheckoutId: `pending_ret_${admin.event.id}_${Date.now()}`,
      customerEmail: admin.email,
      retentionDaysGranted: RETENTION_DAYS_PER_PURCHASE,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ checkoutUrl });
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test:unit -- extend-retention-paywall
# Also run the original retention tests to confirm no regression on read-side
pnpm test:unit -- retention
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/events/extend-retention/route.ts __tests__/api/extend-retention-paywall.test.ts
git commit -m "feat(paywall): gate retention extension behind LS checkout (€15/30 days)"
```

### Task 7.2: Retention extension button in dashboard

**Files:**
- Modify: dashboard settings/storage component (find via grep)

- [ ] **Step 1: Locate where retention info is shown**

```bash
grep -rn "retentionOverrideDays\|extend-retention" components/ app/admin/ --include="*.tsx" | head
```

- [ ] **Step 2: Replace existing extend-retention call site to redirect to LS checkout**

Find the function that POSTs to `/api/admin/events/extend-retention` (likely with a `days` body). Replace its body to handle the new shape:

```tsx
async function extendRetention() {
  const csrfRes = await fetch('/api/admin/events/extend-retention');
  const { csrfToken } = await csrfRes.json();
  const res = await fetch('/api/admin/events/extend-retention', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
    body: '{}',
  });
  const data = await res.json();
  if (data.checkoutUrl) window.location.href = data.checkoutUrl;
  else alert(data.error || 'Greška');
}
```

Update the button label to "Produži za 30 dana (+€15)".

- [ ] **Step 3: Manual smoke**

```bash
pnpm dev
```

- View dashboard as paid admin → click "Produži za 30 dana" → redirects to LS test checkout

- [ ] **Step 4: Commit**

```bash
git add components/admin/ app/admin/
git commit -m "feat(paywall): dashboard retention extension button redirects to LS checkout"
```

---

## **🎉 Milestone M3 reached** — retention extension paywall works.

---

## Phase 8 — Cleanup cron

### Task 8.1: Extend cron to purge expired pending events

**Files:**
- Modify: `app/api/cron/cleanup/route.ts`
- Test: `__tests__/api/retention.test.ts` (add a case)

- [ ] **Step 1: Write failing test**

Add to `__tests__/api/retention.test.ts` (or create `__tests__/api/cleanup-pending.test.ts`):

```ts
it('deletes pending events whose pendingPaymentExpiresAt has passed', async () => {
  // Setup: insert an event with activatedAt=null, pendingPaymentExpiresAt < now
  // (requires DB mock or Docker integration — pattern matches existing retention test)
  // Then call POST /api/cron/cleanup with valid CRON_SECRET
  // Assert: event deleted, pending Payment deleted, slug freed
});
```

Mirror the structure of the existing retention test in this file. If integration test relies on real DB, use Docker per project rule.

- [ ] **Step 2: Run, confirm fail**

```bash
# Docker for backend integration:
docker build -t weddingapp-test --build-arg ENV_FILE=.env .
docker run --rm weddingapp-test pnpm test:integration -- cleanup-pending
```

- [ ] **Step 3: Modify `app/api/cron/cleanup/route.ts`**

After the existing guest-session and admin-session cleanup logic, add:

```ts
  // 4. Delete expired pending events (paid tier, never activated within 24h).
  try {
    const expired = await prisma.event.findMany({
      where: {
        activatedAt: null,
        pendingPaymentExpiresAt: { lt: now },
      },
      select: { id: true },
    });
    if (expired.length > 0) {
      const eventIds = expired.map(e => e.id);
      await prisma.payment.deleteMany({
        where: { eventId: { in: eventIds }, status: 'pending' },
      });
      await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
      result.pendingEventsDeleted = expired.length;
    } else {
      result.pendingEventsDeleted = 0;
    }
  } catch (e) {
    result.errors.push(`pending cleanup: ${e instanceof Error ? e.message : String(e)}`);
  }
```

Update the `result` initial object to include `pendingEventsDeleted: 0`.

- [ ] **Step 4: Run, confirm pass**

```bash
docker run --rm weddingapp-test pnpm test:integration -- cleanup-pending
```

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/cleanup/route.ts __tests__/api/
git commit -m "feat(paywall): cleanup cron purges expired pending events + frees slug"
```

---

## Phase 9 — Production rollout

### Task 9.1: Vercel test mode smoke

- [ ] **Step 1: Confirm `LEMONSQUEEZY_TEST_MODE=1` on Vercel Production env**
- [ ] **Step 2: Confirm all 4 `LS_VARIANT_*` env vars point to TEST variant IDs**
- [ ] **Step 3: Confirm `LEMONSQUEEZY_WEBHOOK_SECRET` matches the secret you set in LS dashboard for the production webhook URL**
- [ ] **Step 4: Deploy current main**

```bash
git push origin main
# wait for Vercel build
```

- [ ] **Step 5: End-to-end smoke on production with test card** (LS test card: `4242 4242 4242 4242`, any CVV, any future date)

  - Free event create → instant dashboard ✓
  - Basic event create → LS test checkout → pay → dashboard active ✓
  - Free admin upgrades to premium → checkout → tier updated ✓
  - Basic admin upgrades to premium (pay €50) → checkout → tier=premium ✓
  - Premium admin extends retention → checkout → +30 days ✓
  - Refund any of the above in LS dashboard → verify webhook fires → state reverts ✓

- [ ] **Step 6: Check Vercel logs** for any `LS webhook handler error:` messages. Verify `WebhookLog` table in Prisma Studio shows `signatureValid=true, processedAt IS NOT NULL` for all attempts.

### Task 9.2: Switch to live mode

- [ ] **Step 1: In LS dashboard, switch store from Test mode to Live mode** (or create separate Live variants and note the IDs)
- [ ] **Step 2: Create production webhook in Live mode**, copy the new signing secret
- [ ] **Step 3: Update Vercel env vars:**
  - `LEMONSQUEEZY_TEST_MODE=0`
  - `LEMONSQUEEZY_WEBHOOK_SECRET=<live secret>`
  - `LS_VARIANT_*` → Live variant IDs
- [ ] **Step 4: Redeploy**
- [ ] **Step 5: Smoke test with a real card (use your own, refund immediately)**

### Task 9.3: Announce paywall to existing free admins

- [ ] **Step 1: Decide announcement copy** (banner already in place from Task 6.3 covers it). Optional one-off email via existing marketing harvest infra is out of scope for v1.

---

## Self-review checklist (run before declaring done)

- [ ] All M1, M2, M3 smoke tests pass
- [ ] `pnpm test:unit` passes with no new failures
- [ ] `pnpm lint` passes
- [ ] Vercel logs show no unhandled errors in webhook route over 24h
- [ ] `WebhookLog` shows all signatures valid + processedAt set
- [ ] No pending Payment rows older than 25 hours (cleanup cron working)
- [ ] No `activatedAt IS NULL AND pendingPaymentExpiresAt < now()` events linger past 25h
- [ ] Test refund flow returns event to correct previous state
- [ ] Spec section 13 (out-of-scope items) explicitly NOT implemented
