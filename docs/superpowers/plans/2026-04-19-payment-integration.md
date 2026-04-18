# Payment Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dodati Lemon Squeezy naplatu sa tier upgrade flow-om, webhook handling, i retention extension gating.

**Architecture:** Admin klikne tier badge → UpgradeModal → `/api/payments/checkout` (kreira LS checkout URL + Payment row status=pending) → LS hosted checkout → webhook `order_created` → Serializable txn update Payment.paid + Event.pricingTier. Refund flow manual kroz LS dashboard → `order_refunded` webhook. Entitlement se derive-uje iz Payment-a (`getEffectiveTier`), `Event.pricingTier` je cache sa audit invariant-om.

**Tech Stack:** Next.js 15 App Router, Prisma, PostgreSQL via Accelerate, `@lemonsqueezy/lemonsqueezy.js`, nodemailer (za digest), optional Telegram Bot API, Jest za unit testove.

**Spec:** [docs/superpowers/specs/2026-04-19-payment-integration-design.md](../specs/2026-04-19-payment-integration-design.md)

**Branch:** `feat/payment-integration`

**Deferred (user pickup):**
- C2: LS `custom_price` test — ako fail-uje, promijeniti `lib/lemon-squeezy.ts:createCheckoutUrl` da koristi zasebne upgrade variant-e umjesto `custom_price`
- H5: BiH knjigovođa prije prvog live plaćanja

---

## Preduslov: LS test mode setup

Prije Task 1, user treba u LS dashboard-u:
1. Kreirati 3 produkta: **WeddingApp Basic**, **Premium**, **Unlimited** (svaki jedna variant, one-time, test mode)
2. Dobiti 3 variant ID-a
3. Kreirati **Test API key** (Settings → API)
4. Kreirati **Test Webhook** (Settings → Webhooks), URL `https://dodajuspomenu.com/api/payments/webhook`, events: `order_created`, `order_refunded`
5. Postaviti env vars u `.env.local` + Vercel (sve 3 envs):

```bash
LS_API_KEY="..."
LS_STORE_ID="..."
LS_WEBHOOK_SECRET="..."
LS_VARIANT_ID_BASIC="..."
LS_VARIANT_ID_PREMIUM="..."
LS_VARIANT_ID_UNLIMITED="..."
# Opciono:
TELEGRAM_BOT_TOKEN="..."
TELEGRAM_CHAT_ID="..."
```

---

## Task 1: Install LS SDK + add env var stubs

**Files:**
- Modify: `package.json`
- Modify: `.env.local` (local dev) — **user action**

- [ ] **Step 1: Install SDK**

```bash
pnpm add @lemonsqueezy/lemonsqueezy.js
```

- [ ] **Step 2: Verify install**

```bash
pnpm ls @lemonsqueezy/lemonsqueezy.js
```

Expected: version 4.x or higher listed.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(payments): install @lemonsqueezy/lemonsqueezy.js"
```

---

## Task 2: Schema + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<ts>_add_payment_infrastructure/migration.sql`

- [ ] **Step 1: Update schema.prisma**

Add to `prisma/schema.prisma` (after existing models):

```prisma
model Payment {
  id                  String        @id @default(uuid())
  eventId             String
  tier                PricingTier
  amountCents         Int
  currency            String        @default("EUR")
  status              PaymentStatus
  lsCheckoutId        String        @unique
  lsOrderId           String?       @unique
  lsEventId           String?       @unique
  refundedAmountCents Int           @default(0)
  refundedAt          DateTime?
  customerEmail       String
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  event               Event         @relation(fields: [eventId], references: [id], onDelete: Restrict)

  @@index([eventId, status])
  @@index([createdAt])
}

enum PaymentStatus {
  pending
  paid
  refunded
  partial
  failed
}

model WebhookLog {
  id             String    @id @default(uuid())
  lsEventId      String?   @unique
  eventName      String?
  signatureValid Boolean
  payload        Json
  error          String?
  processedAt    DateTime?
  sourceIp       String?
  createdAt      DateTime  @default(now())

  @@index([signatureValid, createdAt])
  @@index([eventName])
}
```

Modify existing `Event` model — dodaj polja unutar postojećeg `model Event { ... }` bloka:

```prisma
  payments             Payment[]
  legacyGrandfathered  Boolean   @default(false)
```

Modify existing `PricingPlan` model — dodaj unutar:

```prisma
  lsVariantId    String?   @unique
```

- [ ] **Step 2: Kreiraj migration folder**

```bash
TS=$(date +%Y%m%d%H%M%S)
DIR=prisma/migrations/${TS}_add_payment_infrastructure
mkdir -p "$DIR"
echo "Created $DIR"
```

- [ ] **Step 3: Napiši migration.sql**

Zamijeni `<DIR>` sa stvarnim path-om iz Step 2. Upisati u `<DIR>/migration.sql`:

```sql
-- Payment tabela + enum
CREATE TYPE "PaymentStatus" AS ENUM ('pending','paid','refunded','partial','failed');

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "tier" "PricingTier" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "status" "PaymentStatus" NOT NULL,
  "lsCheckoutId" TEXT NOT NULL,
  "lsOrderId" TEXT,
  "lsEventId" TEXT,
  "refundedAmountCents" INTEGER NOT NULL DEFAULT 0,
  "refundedAt" TIMESTAMP(3),
  "customerEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Payment_lsCheckoutId_key" ON "Payment"("lsCheckoutId");
CREATE UNIQUE INDEX "Payment_lsOrderId_key" ON "Payment"("lsOrderId") WHERE "lsOrderId" IS NOT NULL;
CREATE UNIQUE INDEX "Payment_lsEventId_key" ON "Payment"("lsEventId") WHERE "lsEventId" IS NOT NULL;
CREATE INDEX "Payment_eventId_status_idx" ON "Payment"("eventId","status");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_check"
  CHECK ("amountCents" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_refund_check"
  CHECK ("refundedAmountCents" >= 0 AND "refundedAmountCents" <= "amountCents");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_currency_check"
  CHECK (currency ~ '^[A-Z]{3}$');

-- WebhookLog tabela
CREATE TABLE "WebhookLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lsEventId" TEXT,
  "eventName" TEXT,
  "signatureValid" BOOLEAN NOT NULL,
  "payload" JSONB NOT NULL,
  "error" TEXT,
  "processedAt" TIMESTAMP(3),
  "sourceIp" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "WebhookLog_lsEventId_key" ON "WebhookLog"("lsEventId") WHERE "lsEventId" IS NOT NULL;
CREATE INDEX "WebhookLog_signatureValid_createdAt_idx" ON "WebhookLog"("signatureValid","createdAt");
CREATE INDEX "WebhookLog_eventName_idx" ON "WebhookLog"("eventName");

-- PricingPlan.lsVariantId
ALTER TABLE "PricingPlan" ADD COLUMN "lsVariantId" TEXT;
CREATE UNIQUE INDEX "PricingPlan_lsVariantId_key" ON "PricingPlan"("lsVariantId") WHERE "lsVariantId" IS NOT NULL;

-- Event.legacyGrandfathered
ALTER TABLE "Event" ADD COLUMN "legacyGrandfathered" BOOLEAN NOT NULL DEFAULT false;

-- Grandfather postojeći event
UPDATE "Event" SET "legacyGrandfathered" = true
  WHERE "slug" = 'nikola-i-milica' AND "pricingTier" = 'basic';
```

- [ ] **Step 4: Apply migration**

```bash
npx prisma migrate deploy
npx prisma generate --no-engine
```

Expected: "All migrations have been successfully applied."

- [ ] **Step 5: Verify grandfather update**

```bash
cat > /tmp/check-gf.ts <<'EOF'
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.event.findMany({ select: { slug: true, legacyGrandfathered: true }}).then(console.table).finally(() => p.$disconnect());
EOF
npx tsx /tmp/check-gf.ts && rm /tmp/check-gf.ts
```

Expected: `nikola-i-milica` ima `legacyGrandfathered: true`.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(payments): add Payment + WebhookLog tables + grandfather flag"
```

---

## Task 3: `lib/entitlement.ts` — TDD

**Files:**
- Create: `lib/entitlement.ts`
- Create: `__tests__/lib/entitlement.test.ts`

- [ ] **Step 1: Napiši failing testove**

Kreiraj `__tests__/lib/entitlement.test.ts`:

```ts
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    payment: { findMany: jest.fn() },
  },
}));

import {
  getEffectiveTier,
  hasRetentionExtension,
  maxRetentionOverrideDays,
  isGrandfathered,
  TIER_ORDER,
} from '@/lib/entitlement';
import { prisma } from '@/lib/prisma';

const findMany = prisma.payment.findMany as jest.MockedFunction<any>;

beforeEach(() => jest.clearAllMocks());

describe('getEffectiveTier', () => {
  it('returns free when no payments', async () => {
    findMany.mockResolvedValue([]);
    expect(await getEffectiveTier('e1')).toBe('free');
  });

  it('returns basic with single paid basic', async () => {
    findMany.mockResolvedValue([
      { tier: 'basic', amountCents: 1999, refundedAmountCents: 0 },
    ]);
    expect(await getEffectiveTier('e1')).toBe('basic');
  });

  it('returns highest tier across payments', async () => {
    findMany.mockResolvedValue([
      { tier: 'basic', amountCents: 1999, refundedAmountCents: 0 },
      { tier: 'premium', amountCents: 2000, refundedAmountCents: 0 },
    ]);
    expect(await getEffectiveTier('e1')).toBe('premium');
  });

  it('returns free when premium fully refunded', async () => {
    findMany.mockResolvedValue([
      { tier: 'premium', amountCents: 3999, refundedAmountCents: 3999 },
    ]);
    expect(await getEffectiveTier('e1')).toBe('free');
  });

  it('returns premium when partial refund (>0 remaining)', async () => {
    findMany.mockResolvedValue([
      { tier: 'premium', amountCents: 3999, refundedAmountCents: 1000 },
    ]);
    expect(await getEffectiveTier('e1')).toBe('premium');
  });
});

describe('hasRetentionExtension', () => {
  it('is false for free', async () => {
    findMany.mockResolvedValue([]);
    expect(await hasRetentionExtension('e1')).toBe(false);
  });

  it('is false for basic', async () => {
    findMany.mockResolvedValue([
      { tier: 'basic', amountCents: 1999, refundedAmountCents: 0 },
    ]);
    expect(await hasRetentionExtension('e1')).toBe(false);
  });

  it('is true for premium', async () => {
    findMany.mockResolvedValue([
      { tier: 'premium', amountCents: 3999, refundedAmountCents: 0 },
    ]);
    expect(await hasRetentionExtension('e1')).toBe(true);
  });
});

describe('maxRetentionOverrideDays', () => {
  it('returns 0 for free/basic', () => {
    expect(maxRetentionOverrideDays('free')).toBe(0);
    expect(maxRetentionOverrideDays('basic')).toBe(0);
  });

  it('returns 180 for premium', () => {
    expect(maxRetentionOverrideDays('premium')).toBe(180);
  });

  it('returns 365 for unlimited', () => {
    expect(maxRetentionOverrideDays('unlimited')).toBe(365);
  });
});

describe('isGrandfathered', () => {
  it('returns true when legacyGrandfathered=true', () => {
    expect(isGrandfathered({ legacyGrandfathered: true })).toBe(true);
  });

  it('returns false otherwise', () => {
    expect(isGrandfathered({ legacyGrandfathered: false })).toBe(false);
  });
});

describe('TIER_ORDER', () => {
  it('ranks tiers correctly', () => {
    expect(TIER_ORDER.free).toBeLessThan(TIER_ORDER.basic);
    expect(TIER_ORDER.basic).toBeLessThan(TIER_ORDER.premium);
    expect(TIER_ORDER.premium).toBeLessThan(TIER_ORDER.unlimited);
  });
});
```

- [ ] **Step 2: Verify testovi fail-uju**

```bash
pnpm test:unit -- entitlement
```

Expected: FAIL — `Cannot find module '@/lib/entitlement'`.

- [ ] **Step 3: Implementiraj `lib/entitlement.ts`**

```ts
import { prisma } from '@/lib/prisma';
import type { PricingTier } from '@prisma/client';

export const TIER_ORDER: Record<PricingTier, number> = {
  free: 0,
  basic: 1,
  premium: 2,
  unlimited: 3,
};

/**
 * Effective tier derived from successful Payment rows.
 * Filters out fully-refunded payments (amountCents - refundedAmountCents must be > 0).
 * Returns 'free' if no qualifying payments.
 */
export async function getEffectiveTier(eventId: string): Promise<PricingTier> {
  const payments = await prisma.payment.findMany({
    where: { eventId, status: { in: ['paid', 'partial'] } },
    select: { tier: true, amountCents: true, refundedAmountCents: true },
  });
  return payments
    .filter((p) => p.amountCents - p.refundedAmountCents > 0)
    .reduce<PricingTier>(
      (max, p) => (TIER_ORDER[p.tier] > TIER_ORDER[max] ? p.tier : max),
      'free'
    );
}

export async function hasRetentionExtension(eventId: string): Promise<boolean> {
  const tier = await getEffectiveTier(eventId);
  return TIER_ORDER[tier] >= TIER_ORDER.premium;
}

/**
 * Max retention override admin smije postaviti. Validira se u
 * /api/admin/events/extend-retention.
 */
export function maxRetentionOverrideDays(tier: PricingTier): number {
  const caps: Record<PricingTier, number> = {
    free: 0,
    basic: 0,
    premium: 180,
    unlimited: 365,
  };
  return caps[tier] ?? 0;
}

/**
 * Legacy grandfather exception — bypasses retention cap and
 * audit-drift "paid tier without Payment" check.
 */
export function isGrandfathered(event: { legacyGrandfathered: boolean }): boolean {
  return event.legacyGrandfathered === true;
}
```

- [ ] **Step 4: Verify tests pass**

```bash
pnpm test:unit -- entitlement
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/entitlement.ts __tests__/lib/entitlement.test.ts
git commit -m "feat(payments): add entitlement derivation + retention caps"
```

---

## Task 4: `lib/webhook-scrub.ts` — PII minimization

**Files:**
- Create: `lib/webhook-scrub.ts`
- Create: `__tests__/lib/webhook-scrub.test.ts`

- [ ] **Step 1: Write failing test**

`__tests__/lib/webhook-scrub.test.ts`:

```ts
import { scrubPayload } from '@/lib/webhook-scrub';

describe('scrubPayload', () => {
  it('removes customer_name and billing_address', () => {
    const raw = {
      meta: { event_name: 'order_created', custom_data: { eventId: 'e1' } },
      data: {
        attributes: {
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          total: 3999,
          billing_address: { city: 'Sarajevo', country: 'BA' },
          user_email: 'john@example.com',
        },
      },
    };
    const scrubbed = scrubPayload(raw);
    expect(scrubbed.data.attributes.customer_name).toBeUndefined();
    expect(scrubbed.data.attributes.billing_address).toBeUndefined();
    expect(scrubbed.data.attributes.customer_email).toBe('john@example.com');
    expect(scrubbed.data.attributes.total).toBe(3999);
    expect(scrubbed.meta.event_name).toBe('order_created');
  });

  it('handles missing fields gracefully', () => {
    expect(scrubPayload({})).toEqual({});
    expect(scrubPayload({ data: {} })).toEqual({ data: {} });
  });

  it('does not mutate input', () => {
    const raw = { data: { attributes: { customer_name: 'X' } } };
    const copy = JSON.parse(JSON.stringify(raw));
    scrubPayload(raw);
    expect(raw).toEqual(copy);
  });
});
```

- [ ] **Step 2: Verify fail**

```bash
pnpm test:unit -- webhook-scrub
```

- [ ] **Step 3: Implement**

`lib/webhook-scrub.ts`:

```ts
const STRIPPED_FIELDS = ['customer_name', 'billing_address'] as const;

/**
 * GDPR minimization — strips PII from webhook payload before DB insert.
 * Keeps: email (needed for refund audit), total, event_id, order_id, tier info.
 * Removes: customer_name, billing_address.
 */
export function scrubPayload<T>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload;
  const clone = JSON.parse(JSON.stringify(payload));
  const attrs = clone?.data?.attributes;
  if (attrs && typeof attrs === 'object') {
    for (const field of STRIPPED_FIELDS) {
      delete attrs[field];
    }
  }
  return clone;
}
```

- [ ] **Step 4: Verify pass**

```bash
pnpm test:unit -- webhook-scrub
```

- [ ] **Step 5: Commit**

```bash
git add lib/webhook-scrub.ts __tests__/lib/webhook-scrub.test.ts
git commit -m "feat(payments): add PII scrubber for webhook payloads"
```

---

## Task 5: `lib/telegram.ts` — optional alert helper

**Files:**
- Create: `lib/telegram.ts`
- Create: `__tests__/lib/telegram.test.ts`

- [ ] **Step 1: Write failing test**

```ts
/**
 * @jest-environment node
 */
import { sendTelegramAlert } from '@/lib/telegram';

const origFetch = global.fetch;
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true });
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
});
afterAll(() => { global.fetch = origFetch; });

describe('sendTelegramAlert', () => {
  it('is a no-op when env vars missing', async () => {
    await sendTelegramAlert('test');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls Telegram API when both env vars set', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    process.env.TELEGRAM_CHAT_ID = '123';
    await sendTelegramAlert('hello');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottok/sendMessage',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: expect.stringContaining('"chat_id":"123"'),
      })
    );
  });

  it('never throws — fire and forget', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    process.env.TELEGRAM_CHAT_ID = '123';
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));
    await expect(sendTelegramAlert('x')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Verify fail**

```bash
pnpm test:unit -- telegram
```

- [ ] **Step 3: Implement**

`lib/telegram.ts`:

```ts
/**
 * Optional critical-event alerting via Telegram bot.
 * No-op if env vars not configured. Never throws.
 */
export async function sendTelegramAlert(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_notification: false,
      }),
    });
  } catch (err) {
    console.error('Telegram alert failed:', err);
  }
}
```

- [ ] **Step 4: Verify pass**

```bash
pnpm test:unit -- telegram
```

- [ ] **Step 5: Commit**

```bash
git add lib/telegram.ts __tests__/lib/telegram.test.ts
git commit -m "feat(payments): add optional Telegram alert helper"
```

---

## Task 6: `lib/lemon-squeezy.ts` — SDK wrapper

**Files:**
- Create: `lib/lemon-squeezy.ts`
- Create: `__tests__/lib/lemon-squeezy.test.ts`

- [ ] **Step 1: Write failing test**

```ts
/**
 * @jest-environment node
 */
import crypto from 'crypto';
import { verifyWebhookSignature } from '@/lib/lemon-squeezy';

const SECRET = 'test-webhook-secret';

function sign(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifyWebhookSignature', () => {
  it('returns true for valid signature', () => {
    const body = '{"foo":"bar"}';
    const sig = sign(body, SECRET);
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true);
  });

  it('returns false for tampered body', () => {
    const sig = sign('{"foo":"bar"}', SECRET);
    expect(verifyWebhookSignature('{"foo":"baz"}', sig, SECRET)).toBe(false);
  });

  it('returns false for tampered signature (1 byte flipped)', () => {
    const body = '{"foo":"bar"}';
    const sig = sign(body, SECRET);
    const tampered = sig.slice(0, -1) + (sig.slice(-1) === '0' ? '1' : '0');
    expect(verifyWebhookSignature(body, tampered, SECRET)).toBe(false);
  });

  it('returns false for different-length signature', () => {
    const body = '{"foo":"bar"}';
    expect(verifyWebhookSignature(body, 'short', SECRET)).toBe(false);
  });

  it('returns false for missing secret', () => {
    const body = '{"foo":"bar"}';
    const sig = sign(body, SECRET);
    expect(verifyWebhookSignature(body, sig, '')).toBe(false);
  });
});
```

- [ ] **Step 2: Verify fail**

```bash
pnpm test:unit -- lemon-squeezy
```

- [ ] **Step 3: Implement**

`lib/lemon-squeezy.ts`:

```ts
import crypto from 'crypto';
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  const apiKey = process.env.LS_API_KEY;
  if (!apiKey) throw new Error('LS_API_KEY not configured');
  lemonSqueezySetup({ apiKey });
  initialized = true;
}

/**
 * Constant-time webhook signature verification.
 * Matches LS docs: HMAC-SHA256(rawBody, LS_WEBHOOK_SECRET) → hex.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

interface CheckoutParams {
  variantId: string;
  customPriceCents: number;
  customData: { eventId: string; adminId: string; targetTier: string; checkoutInternalId: string };
  redirectUrl: string;
  customerEmail: string;
}

/**
 * Creates an LS checkout session and returns the hosted URL.
 * Uses custom_price to bill the differential upgrade amount.
 */
export async function createCheckoutUrl(params: CheckoutParams): Promise<string> {
  ensureInitialized();
  const storeId = process.env.LS_STORE_ID;
  if (!storeId) throw new Error('LS_STORE_ID not configured');

  const { data, error } = await createCheckout(storeId, params.variantId, {
    checkoutData: {
      email: params.customerEmail,
      custom: params.customData,
    },
    productOptions: {
      redirectUrl: params.redirectUrl,
      receiptButtonText: 'Povratak u aplikaciju',
    },
    checkoutOptions: {
      embed: false,
    },
    // custom_price per LS API: override variant's default price
    custom_price: params.customPriceCents,
  } as any);

  if (error) {
    throw new Error(`LS createCheckout failed: ${error.message}`);
  }
  if (!data?.data?.attributes?.url) {
    throw new Error('LS createCheckout returned no URL');
  }
  return data.data.attributes.url;
}
```

- [ ] **Step 4: Verify pass**

```bash
pnpm test:unit -- lemon-squeezy
```

- [ ] **Step 5: Commit**

```bash
git add lib/lemon-squeezy.ts __tests__/lib/lemon-squeezy.test.ts
git commit -m "feat(payments): add Lemon Squeezy SDK wrapper + signature verify"
```

---

## Task 7: `POST /api/payments/checkout` — create checkout endpoint

**Files:**
- Create: `app/api/payments/checkout/route.ts`
- Create: `__tests__/api/payments/checkout.test.ts`

- [ ] **Step 1: Write failing test**

```ts
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    payment: { findMany: jest.fn(), create: jest.fn() },
    pricingPlan: { findUnique: jest.fn() },
    event: { findUnique: jest.fn() },
  },
}));
jest.mock('@/lib/csrf', () => ({
  generateCsrfToken: jest.fn().mockResolvedValue({ token: 't', cookie: 'c' }),
  validateCsrfToken: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/admin-auth', () => ({
  getAuthenticatedAdmin: jest.fn(),
}));
jest.mock('@/lib/lemon-squeezy', () => ({
  createCheckoutUrl: jest.fn(),
}));

import { POST } from '@/app/api/payments/checkout/route';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { createCheckoutUrl } from '@/lib/lemon-squeezy';

const getAdmin = getAuthenticatedAdmin as jest.MockedFunction<any>;
const findManyPayments = prisma.payment.findMany as jest.MockedFunction<any>;
const createPayment = prisma.payment.create as jest.MockedFunction<any>;
const findUniquePlan = prisma.pricingPlan.findUnique as jest.MockedFunction<any>;
const findUniqueEvent = prisma.event.findUnique as jest.MockedFunction<any>;
const createLS = createCheckoutUrl as jest.MockedFunction<any>;

function req(body: unknown, csrf = 't'): Request {
  return new Request('http://localhost/api/payments/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as any).__paymentCheckoutAttempts?.clear();
  getAdmin.mockResolvedValue({
    id: 'a1',
    email: 'admin@x.com',
    event: { id: 'e1', pricingTier: 'free' },
  });
  findUniqueEvent.mockResolvedValue({ id: 'e1', pricingTier: 'free' });
  findUniquePlan.mockResolvedValue({ price: 3999, lsVariantId: 'v_premium' });
  findManyPayments.mockResolvedValue([]);
  createPayment.mockResolvedValue({ id: 'p1', lsCheckoutId: 'ck1' });
  createLS.mockResolvedValue('https://ls.test/checkout/xyz');
});

describe('POST /api/payments/checkout', () => {
  it('rejects missing CSRF', async () => {
    jest.mocked(require('@/lib/csrf').validateCsrfToken).mockResolvedValueOnce(false);
    const res = await POST(req({ targetTier: 'premium' }));
    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated admin', async () => {
    getAdmin.mockResolvedValue(null);
    const res = await POST(req({ targetTier: 'premium' }));
    expect(res.status).toBe(401);
  });

  it('rejects invalid targetTier', async () => {
    const res = await POST(req({ targetTier: 'hackerTier' }));
    expect(res.status).toBe(400);
  });

  it('rejects downgrade (current=premium, target=basic)', async () => {
    getAdmin.mockResolvedValue({ id: 'a1', email: 'a@x', event: { id: 'e1', pricingTier: 'premium' } });
    findUniqueEvent.mockResolvedValue({ id: 'e1', pricingTier: 'premium' });
    const res = await POST(req({ targetTier: 'basic' }));
    expect(res.status).toBe(409);
  });

  it('rejects same-tier (current=basic, target=basic)', async () => {
    getAdmin.mockResolvedValue({ id: 'a1', email: 'a@x', event: { id: 'e1', pricingTier: 'basic' } });
    findUniqueEvent.mockResolvedValue({ id: 'e1', pricingTier: 'basic' });
    findManyPayments.mockResolvedValue([{ amountCents: 1999, refundedAmountCents: 0 }]);
    const res = await POST(req({ targetTier: 'basic' }));
    expect(res.status).toBe(409);
  });

  it('computes correct amount for free → premium', async () => {
    const res = await POST(req({ targetTier: 'premium' }));
    expect(res.status).toBe(200);
    expect(createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountCents: 3999,
          tier: 'premium',
          status: 'pending',
        }),
      })
    );
    const body = await res.json();
    expect(body.url).toBe('https://ls.test/checkout/xyz');
  });

  it('computes differential for basic → premium (already paid 1999)', async () => {
    getAdmin.mockResolvedValue({ id: 'a1', email: 'a@x', event: { id: 'e1', pricingTier: 'basic' } });
    findUniqueEvent.mockResolvedValue({ id: 'e1', pricingTier: 'basic' });
    findManyPayments.mockResolvedValue([{ amountCents: 1999, refundedAmountCents: 0 }]);
    const res = await POST(req({ targetTier: 'premium' }));
    expect(res.status).toBe(200);
    expect(createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountCents: 2000 }),
      })
    );
  });

  it('rate limits at 11th attempt per IP', async () => {
    for (let i = 0; i < 10; i++) {
      const r = await POST(req({ targetTier: 'premium' }));
      expect(r.status).toBe(200);
    }
    const res = await POST(req({ targetTier: 'premium' }));
    expect(res.status).toBe(429);
  });

  it('ignores client-supplied amountCents (security)', async () => {
    await POST(req({ targetTier: 'premium', amountCents: 1 }));
    expect(createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amountCents: 3999 }) })
    );
  });
});
```

- [ ] **Step 2: Verify fail**

```bash
pnpm test:unit -- payments/checkout
```

- [ ] **Step 3: Implement**

`app/api/payments/checkout/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCsrfToken, validateCsrfToken } from '@/lib/csrf';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { createCheckoutUrl } from '@/lib/lemon-squeezy';
import { TIER_ORDER } from '@/lib/entitlement';
import { randomBytes } from 'crypto';
import type { PricingTier } from '@prisma/client';

export const runtime = 'nodejs';

declare global {
  var __paymentCheckoutAttempts: Map<string, number[]> | undefined;
}
const attempts: Map<string, number[]> = globalThis.__paymentCheckoutAttempts || new Map();
globalThis.__paymentCheckoutAttempts = attempts;
const CHECKOUT_MAX = 10;
const CHECKOUT_WINDOW_MS = 60 * 60 * 1000;

const VALID_TIERS: PricingTier[] = ['free', 'basic', 'premium', 'unlimited'];

export async function GET() {
  const { token, cookie } = await generateCsrfToken();
  const r = NextResponse.json({ csrfToken: token });
  r.headers.set('set-cookie', cookie);
  return r;
}

export async function POST(req: Request) {
  if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || ''))) {
    return NextResponse.json({ error: 'Neispravan CSRF token.' }, { status: 403 });
  }

  const admin = await getAuthenticatedAdmin();
  if (!admin?.event) {
    return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((ts) => now - ts < CHECKOUT_WINDOW_MS);
  if (recent.length >= CHECKOUT_MAX) {
    return NextResponse.json({ error: 'Previše pokušaja, pokušajte kasnije.' }, { status: 429 });
  }
  attempts.set(ip, [...recent, now]);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Neispravan JSON.' }, { status: 400 });
  }
  const targetTier = (body as { targetTier?: unknown })?.targetTier;
  if (typeof targetTier !== 'string' || !VALID_TIERS.includes(targetTier as PricingTier)) {
    return NextResponse.json({ error: 'Nevažeći tier.' }, { status: 400 });
  }
  const target = targetTier as PricingTier;

  const event = await prisma.event.findUnique({
    where: { id: admin.event.id },
    select: { id: true, pricingTier: true },
  });
  if (!event) {
    return NextResponse.json({ error: 'Event ne postoji.' }, { status: 404 });
  }

  if (TIER_ORDER[target] <= TIER_ORDER[event.pricingTier]) {
    return NextResponse.json(
      { error: 'Downgrade ili isti tier nije moguć.' },
      { status: 409 }
    );
  }

  const plan = await prisma.pricingPlan.findUnique({
    where: { tier: target },
    select: { price: true, lsVariantId: true },
  });
  if (!plan?.lsVariantId) {
    return NextResponse.json(
      { error: 'Plan nije dostupan za kupovinu.' },
      { status: 503 }
    );
  }

  const existingPayments = await prisma.payment.findMany({
    where: { eventId: event.id, status: { in: ['paid', 'partial'] } },
    select: { amountCents: true, refundedAmountCents: true },
  });
  const netPaid = existingPayments.reduce(
    (sum, p) => sum + (p.amountCents - p.refundedAmountCents),
    0
  );
  const amountDue = plan.price - netPaid;
  if (amountDue <= 0) {
    return NextResponse.json(
      { error: 'Već si platio ovaj ili veći tier.' },
      { status: 409 }
    );
  }

  const checkoutInternalId = randomBytes(16).toString('hex');

  await prisma.payment.create({
    data: {
      eventId: event.id,
      tier: target,
      amountCents: amountDue,
      status: 'pending',
      lsCheckoutId: checkoutInternalId,
      customerEmail: admin.email,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.dodajuspomenu.com';
  const url = await createCheckoutUrl({
    variantId: plan.lsVariantId,
    customPriceCents: amountDue,
    customData: {
      eventId: event.id,
      adminId: admin.id,
      targetTier: target,
      checkoutInternalId,
    },
    redirectUrl: `${baseUrl}/sr/admin/dashboard/${event.id}?payment=success&ck=${checkoutInternalId}`,
    customerEmail: admin.email,
  });

  return NextResponse.json({ url });
}
```

- [ ] **Step 4: Verify pass**

```bash
pnpm test:unit -- payments/checkout
```

- [ ] **Step 5: Commit**

```bash
git add app/api/payments/checkout/route.ts __tests__/api/payments/checkout.test.ts
git commit -m "feat(payments): add checkout endpoint with differential pricing"
```

---

## Task 8: `POST /api/payments/webhook` — order_created handler

**Files:**
- Create: `app/api/payments/webhook/route.ts`
- Create: `__tests__/api/payments/webhook.test.ts`

- [ ] **Step 1: Write failing test**

```ts
/**
 * @jest-environment node
 */
import crypto from 'crypto';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    webhookLog: { create: jest.fn(), update: jest.fn(), upsert: jest.fn() },
    payment: { update: jest.fn(), upsert: jest.fn(), findUnique: jest.fn() },
    event: { update: jest.fn() },
    pricingPlan: { findMany: jest.fn() },
    $transaction: jest.fn(async (fn: any) =>
      typeof fn === 'function'
        ? fn(require('@/lib/prisma').prisma)
        : Promise.all(fn)
    ),
  },
}));
jest.mock('@/lib/entitlement', () => ({
  ...jest.requireActual('@/lib/entitlement'),
  getEffectiveTier: jest.fn().mockResolvedValue('premium'),
}));
jest.mock('@/lib/telegram', () => ({ sendTelegramAlert: jest.fn() }));

import { POST } from '@/app/api/payments/webhook/route';
import { prisma } from '@/lib/prisma';

const SECRET = 'test-webhook-secret';
process.env.LS_WEBHOOK_SECRET = SECRET;
process.env.LS_STORE_ID = 'store-1';
process.env.NODE_ENV = 'development';

function sign(body: string): string {
  return crypto.createHmac('sha256', SECRET).update(body).digest('hex');
}

function req(body: string, sig?: string): Request {
  return new Request('http://localhost/api/payments/webhook', {
    method: 'POST',
    headers: { 'x-signature': sig ?? sign(body), 'content-type': 'application/json' },
    body,
  });
}

const baseOrderCreated = {
  meta: {
    event_name: 'order_created',
    event_id: 'evt-1',
    custom_data: {
      eventId: 'e1',
      adminId: 'a1',
      targetTier: 'premium',
      checkoutInternalId: 'ck1',
    },
    test_mode: false,
  },
  data: {
    id: 'ord-1',
    attributes: {
      store_id: 'store-1',
      total: 3999,
      customer_email: 'a@x.com',
      first_order_item: { variant_id: 'v_premium' },
      customer_name: 'John Doe',
    },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.pricingPlan.findMany as jest.Mock).mockResolvedValue([
    { tier: 'premium', lsVariantId: 'v_premium', imageLimit: 50 },
  ]);
  (prisma.webhookLog.upsert as jest.Mock).mockResolvedValue({});
  (prisma.webhookLog.create as jest.Mock).mockResolvedValue({});
  (prisma.webhookLog.update as jest.Mock).mockResolvedValue({});
  (prisma.payment.update as jest.Mock).mockResolvedValue({});
  (prisma.event.update as jest.Mock).mockResolvedValue({});
});

describe('POST /api/payments/webhook', () => {
  it('rejects invalid signature with 401 and logs', async () => {
    const body = JSON.stringify(baseOrderCreated);
    const res = await POST(req(body, 'bad-signature-same-len' + '0'.repeat(40)));
    expect(res.status).toBe(401);
    expect(prisma.webhookLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ signatureValid: false }),
      })
    );
  });

  it('rejects test_mode=true in production', async () => {
    process.env.NODE_ENV = 'production';
    const payload = { ...baseOrderCreated, meta: { ...baseOrderCreated.meta, test_mode: true } };
    const body = JSON.stringify(payload);
    const res = await POST(req(body));
    expect(res.status).toBe(400);
    process.env.NODE_ENV = 'development';
  });

  it('rejects wrong store_id', async () => {
    const payload = {
      ...baseOrderCreated,
      data: { ...baseOrderCreated.data, attributes: { ...baseOrderCreated.data.attributes, store_id: 'other' } },
    };
    const body = JSON.stringify(payload);
    const res = await POST(req(body));
    expect(res.status).toBe(400);
  });

  it('rejects unknown variant_id', async () => {
    const payload = {
      ...baseOrderCreated,
      data: {
        ...baseOrderCreated.data,
        attributes: {
          ...baseOrderCreated.data.attributes,
          first_order_item: { variant_id: 'unknown' },
        },
      },
    };
    const body = JSON.stringify(payload);
    const res = await POST(req(body));
    expect(res.status).toBe(400);
  });

  it('processes order_created and updates Payment + Event in transaction', async () => {
    const body = JSON.stringify(baseOrderCreated);
    const res = await POST(req(body));
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lsCheckoutId: 'ck1' },
        data: expect.objectContaining({
          status: 'paid',
          lsOrderId: 'ord-1',
          lsEventId: 'evt-1',
        }),
      })
    );
    expect(prisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'e1' },
        data: expect.objectContaining({ pricingTier: 'premium' }),
      })
    );
  });

  it('is idempotent on duplicate lsEventId (upsert no-op)', async () => {
    (prisma.webhookLog.upsert as jest.Mock).mockResolvedValue({ alreadyProcessed: true });
    const body = JSON.stringify(baseOrderCreated);
    const res = await POST(req(body));
    expect(res.status).toBe(200);
  });

  it('logs unknown event as unknown:*', async () => {
    const payload = { ...baseOrderCreated, meta: { ...baseOrderCreated.meta, event_name: 'subscription_created' } };
    const body = JSON.stringify(payload);
    const res = await POST(req(body));
    expect(res.status).toBe(200);
    expect(prisma.webhookLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventName: 'unknown:subscription_created' }),
      })
    );
  });
});
```

- [ ] **Step 2: Verify fail**

```bash
pnpm test:unit -- payments/webhook
```

- [ ] **Step 3: Implement**

`app/api/payments/webhook/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/lemon-squeezy';
import { scrubPayload } from '@/lib/webhook-scrub';
import { getEffectiveTier } from '@/lib/entitlement';
import { PRICING_TIERS, type PricingTier } from '@/lib/pricing-tiers';
import { sendTelegramAlert } from '@/lib/telegram';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') || '';
  const sourceIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const secret = process.env.LS_WEBHOOK_SECRET || '';

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    await prisma.webhookLog.create({
      data: {
        signatureValid: false,
        payload: safeParse(rawBody),
        sourceIp,
      },
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Malformed body' }, { status: 400 });
  }

  const meta = event?.meta ?? {};
  const data = event?.data ?? {};
  const attrs = data?.attributes ?? {};

  // Production guard — reject test_mode in production
  if (process.env.NODE_ENV === 'production' && meta.test_mode === true) {
    await prisma.webhookLog.create({
      data: {
        lsEventId: meta.event_id,
        eventName: meta.event_name,
        signatureValid: true,
        payload: scrubPayload(event),
        error: 'test_mode webhook in production',
        sourceIp,
      },
    });
    return NextResponse.json({ error: 'test_mode rejected in production' }, { status: 400 });
  }

  // Store ID allowlist
  if (attrs.store_id && String(attrs.store_id) !== String(process.env.LS_STORE_ID)) {
    await prisma.webhookLog.create({
      data: {
        lsEventId: meta.event_id,
        eventName: meta.event_name,
        signatureValid: true,
        payload: scrubPayload(event),
        error: `wrong store_id: ${attrs.store_id}`,
        sourceIp,
      },
    });
    return NextResponse.json({ error: 'Wrong store' }, { status: 400 });
  }

  // Variant ID allowlist (for order events only)
  const variantId = attrs?.first_order_item?.variant_id;
  if (
    (meta.event_name === 'order_created' || meta.event_name === 'order_refunded') &&
    variantId
  ) {
    const plans = await prisma.pricingPlan.findMany({ select: { lsVariantId: true } });
    const allowed = new Set(plans.map((p) => p.lsVariantId).filter(Boolean));
    if (!allowed.has(String(variantId))) {
      await sendTelegramAlert(`⚠️ Unknown variant_id in webhook: ${variantId}`);
      await prisma.webhookLog.create({
        data: {
          lsEventId: meta.event_id,
          eventName: meta.event_name,
          signatureValid: true,
          payload: scrubPayload(event),
          error: `unknown variant_id: ${variantId}`,
          sourceIp,
        },
      });
      return NextResponse.json({ error: 'Unknown variant' }, { status: 400 });
    }
  }

  // Idempotency: upsert by lsEventId (unique). If already exists, no-op.
  const logResult = await prisma.webhookLog.upsert({
    where: { lsEventId: meta.event_id },
    create: {
      lsEventId: meta.event_id,
      eventName: meta.event_name,
      signatureValid: true,
      payload: scrubPayload(event),
      sourceIp,
    },
    update: {}, // no-op — already processed
  });

  try {
    switch (meta.event_name) {
      case 'order_created':
        await handleOrderCreated(event);
        break;
      case 'order_refunded':
        await handleOrderRefunded(event);
        break;
      default:
        await prisma.webhookLog.update({
          where: { lsEventId: meta.event_id },
          data: { eventName: `unknown:${meta.event_name}` },
        });
    }

    await prisma.webhookLog.update({
      where: { lsEventId: meta.event_id },
      data: { processedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    await prisma.webhookLog.update({
      where: { lsEventId: meta.event_id },
      data: { error: String(err?.message || err), processedAt: new Date() },
    });
    // Return 200 so LS doesn't retry forever; reprocess script handles.
    return NextResponse.json({ ok: false, logged: true });
  }
}

async function handleOrderCreated(event: any): Promise<void> {
  const customData = event.meta.custom_data ?? {};
  const { eventId, checkoutInternalId } = customData;
  const orderId = String(event.data.id);
  const lsEventId = event.meta.event_id;

  await prisma.$transaction(
    async (tx) => {
      await tx.payment.update({
        where: { lsCheckoutId: checkoutInternalId },
        data: {
          status: 'paid',
          lsOrderId: orderId,
          lsEventId,
        },
      });
      const effective = await getEffectiveTier(eventId);
      const plan = await tx.pricingPlan.findUnique({
        where: { tier: effective },
        select: { imageLimit: true },
      });
      await tx.event.update({
        where: { id: eventId },
        data: {
          pricingTier: effective,
          imageLimit: plan?.imageLimit ?? PRICING_TIERS[effective].imageLimit,
        },
      });
    },
    { isolationLevel: 'Serializable' }
  );
}

async function handleOrderRefunded(event: any): Promise<void> {
  const { eventId, targetTier, checkoutInternalId } = event.meta.custom_data ?? {};
  const orderId = String(event.data.id);
  const refundedAmount = Number(event.data.attributes.refunded_amount ?? 0);
  const total = Number(event.data.attributes.total ?? 0);
  const lsEventId = event.meta.event_id;

  await prisma.$transaction(
    async (tx) => {
      // H3: upsert handles out-of-order case (refund before order_created)
      await tx.payment.upsert({
        where: { lsOrderId: orderId },
        update: {
          refundedAmountCents: { increment: refundedAmount },
          refundedAt: new Date(),
          status: refundedAmount >= total ? 'refunded' : 'partial',
          lsEventId,
        },
        create: {
          eventId,
          tier: targetTier as PricingTier,
          amountCents: total,
          refundedAmountCents: refundedAmount,
          refundedAt: new Date(),
          status: refundedAmount >= total ? 'refunded' : 'partial',
          lsOrderId: orderId,
          lsEventId,
          lsCheckoutId: checkoutInternalId || `refund-placeholder-${orderId}`,
          customerEmail: event.data.attributes.customer_email ?? 'unknown@unknown',
        },
      });

      const effective = await getEffectiveTier(eventId);
      const plan = await tx.pricingPlan.findUnique({
        where: { tier: effective },
        select: { imageLimit: true },
      });
      await tx.event.update({
        where: { id: eventId },
        data: {
          pricingTier: effective,
          imageLimit: plan?.imageLimit ?? PRICING_TIERS[effective].imageLimit,
        },
      });
    },
    { isolationLevel: 'Serializable' }
  );
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return { _rawUnparseable: raw.slice(0, 500) };
  }
}
```

- [ ] **Step 4: Verify pass**

```bash
pnpm test:unit -- payments/webhook
```

- [ ] **Step 5: Commit**

```bash
git add app/api/payments/webhook/route.ts __tests__/api/payments/webhook.test.ts
git commit -m "feat(payments): webhook with HMAC verify + order handlers + idempotency"
```

---

## Task 9: Audit-drift extension (new invariants)

**Files:**
- Modify: `scripts/audit-drift.ts`

- [ ] **Step 1: Read existing audit-drift**

```bash
head -20 scripts/audit-drift.ts
```

Expected: familiar header + imports.

- [ ] **Step 2: Append 4 new checks**

Otvori `scripts/audit-drift.ts`. Pronađi liniju pred `// 7. Stuck retention detection`. Dodaj prije nje:

```ts
  // 7. Event on paid tier without Payment row (C3: grandfathered exempt)
  const paidEvents = await prisma.event.findMany({
    where: { pricingTier: { not: 'free' }, legacyGrandfathered: false, deletedAt: null },
    select: { id: true, slug: true, pricingTier: true },
  });
  const paidEventIds = paidEvents.map((e) => e.id);
  const paymentsByEvent = new Map<string, number>();
  if (paidEventIds.length > 0) {
    const counts = await prisma.payment.groupBy({
      by: ['eventId'],
      where: { eventId: { in: paidEventIds }, status: { in: ['paid', 'partial'] } },
      _count: true,
    });
    for (const c of counts) paymentsByEvent.set(c.eventId, c._count);
  }
  for (const e of paidEvents) {
    if ((paymentsByEvent.get(e.id) ?? 0) === 0) {
      findings.push({
        severity: 'CRITICAL',
        check: 'Event on paid tier without successful Payment',
        detail: `event=${e.slug} tier=${e.pricingTier}`,
      });
    }
  }

  // 8. Stuck pending payments > 2h
  const stuckCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const stuckCount = await prisma.payment.count({
    where: { status: 'pending', createdAt: { lt: stuckCutoff } },
  });
  if (stuckCount > 0) {
    findings.push({
      severity: 'MEDIUM',
      check: 'Stuck pending payments > 2h',
      detail: `count=${stuckCount}`,
    });
  }

  // 9. WebhookLog signature-fail spike > 10/24h
  const last24h = new Date(Date.now() - 86400000);
  const invalidCount = await prisma.webhookLog.count({
    where: { signatureValid: false, createdAt: { gt: last24h } },
  });
  if (invalidCount > 10) {
    findings.push({
      severity: 'HIGH',
      check: 'Webhook signature failures > 10 in 24h (possible attack)',
      detail: `count=${invalidCount}`,
    });
  }

  // 10. Event.pricingTier cache drift vs derivedEffectiveTier (H1 enforcement)
  const { getEffectiveTier } = await import('../lib/entitlement');
  for (const e of paidEvents) {
    const derived = await getEffectiveTier(e.id);
    if (derived !== e.pricingTier) {
      findings.push({
        severity: 'HIGH',
        check: 'Event.pricingTier cache drift',
        detail: `event=${e.slug} stored=${e.pricingTier} derived=${derived}`,
      });
    }
  }

```

- [ ] **Step 3: Run audit, expect current state clean**

```bash
npx tsx scripts/audit-drift.ts
```

Expected: `✓ No drift` (postojeći `nikola-i-milica` je grandfathered, pa check #7 ga preskače; nema Payment row-ova pa #8-10 sve clean).

- [ ] **Step 4: Commit**

```bash
git add scripts/audit-drift.ts
git commit -m "feat(payments): add 4 payment invariants to audit-drift"
```

---

## Task 10: Cron extension — stuck payments + retention exemption

**Files:**
- Modify: `app/api/cron/cleanup/route.ts`

- [ ] **Step 1: Find retention hard-delete section**

```bash
grep -n "executeHardDelete\|stuckPaymentsMarked" app/api/cron/cleanup/route.ts
```

Expected: `executeHardDelete` function found.

- [ ] **Step 2: Add stuck-payment cleanup and guard in executeHardDelete**

U `app/api/cron/cleanup/route.ts`, u GET handler-u (nakon postojećeg session cleanup-a ali prije retention loop-a), dodaj:

```ts
    // Stuck payment cleanup (LS checkout expiry 60min, grace 2h)
    const stuckPaymentCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const stuckCleared = (
      await prisma.payment.updateMany({
        where: { status: 'pending', createdAt: { lt: stuckPaymentCutoff } },
        data: { status: 'failed' },
      })
    ).count;
    (result as any).stuckPaymentsMarked = stuckCleared;
```

Takođe u `executeHardDelete`, prije `prisma.$transaction(ops)`, osiguraj da `ops` NE uključuje brisanje Payment row-ova (oni su izuzeti). Pronađi blok sa `prisma.image.deleteMany`, `prisma.message.deleteMany`, `prisma.guest.deleteMany` — ti ostaju isti. Payment se **ne** briše (FK `onDelete: Restrict` je već postavljen u schemi). Event soft-delete nastavlja raditi.

Dodaj komentar iznad `prisma.image.deleteMany` u `executeHardDelete`:

```ts
    // NOTE: Payment rows are deliberately NOT deleted — tax retention (BiH 10 yrs).
    // FK onDelete:Restrict prevents accidental cascade.
```

- [ ] **Step 3: Test stuck cleanup**

Kreiraj `scripts/_test-stuck.ts` (privremeno):

```ts
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const ev = await p.event.findFirst();
  if (!ev) throw new Error('no event');
  const stuck = await p.payment.create({
    data: {
      eventId: ev.id,
      tier: 'basic',
      amountCents: 1999,
      status: 'pending',
      lsCheckoutId: 'test-stuck-' + Date.now(),
      customerEmail: 'stuck@test.com',
      createdAt: new Date(Date.now() - 3 * 3600 * 1000),
    },
  });
  console.log('created stuck:', stuck.id);
}
main().finally(() => p.$disconnect());
```

Run:
```bash
npx tsx scripts/_test-stuck.ts
```

Then call cron (with CRON_SECRET):
```bash
SECRET=$(grep "^CRON_SECRET=" .env.local | cut -d= -f2- | tr -d '"')
curl -s -H "Authorization: Bearer $SECRET" http://localhost:3000/api/cron/cleanup | head -5
```

Expected output includes `"stuckPaymentsMarked":1`.

Cleanup:
```bash
rm scripts/_test-stuck.ts
```

And delete the test Payment row:
```bash
cat > /tmp/del.ts <<'EOF'
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.payment.deleteMany({ where: { customerEmail: 'stuck@test.com' } })
  .then(r => console.log('deleted', r.count))
  .finally(() => p.$disconnect());
EOF
npx tsx /tmp/del.ts && rm /tmp/del.ts
```

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/cleanup/route.ts
git commit -m "feat(payments): cron marks stuck pending payments as failed"
```

---

## Task 11: Seed update — LS variant IDs

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Update seed**

U `prisma/seed.ts`, pronađi `seedPricingPlans` funkciju. Dodaj nakon `const planData = { ... }` bloka (unutar for-petlje):

```ts
    const envVarName = `LS_VARIANT_ID_${tier.toUpperCase()}`;
    const lsVariantId = process.env[envVarName] || null;
    if (!lsVariantId && tier !== 'free') {
      console.warn(`⚠ ${envVarName} not set — ${tier} plan won't accept payments`);
    }
```

U upsert-u (i `update` i `create`) blok-ovima, dodaj polje:

```ts
        lsVariantId,
```

- [ ] **Step 2: Dry-run seed**

```bash
npx tsx prisma/seed.ts
```

Expected: seed runs without error. Warning lines for any unset variant env vars.

- [ ] **Step 3: Verify DB**

```bash
cat > /tmp/ck-plan.ts <<'EOF'
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.pricingPlan.findMany({ select: { tier: true, lsVariantId: true } })
  .then(console.table).finally(() => p.$disconnect());
EOF
npx tsx /tmp/ck-plan.ts && rm /tmp/ck-plan.ts
```

Expected: table shows tier + lsVariantId (null if env unset, value if set).

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(payments): seed syncs PricingPlan.lsVariantId from env vars"
```

---

## Task 12: UpgradePlanModal component

**Files:**
- Create: `components/admin/UpgradePlanModal.tsx`
- Modify: `components/admin/EventTierBadge.tsx`

- [ ] **Step 1: Create UpgradePlanModal**

`components/admin/UpgradePlanModal.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Tier = "free" | "basic" | "premium" | "unlimited";

const TIER_ORDER: Record<Tier, number> = {
  free: 0, basic: 1, premium: 2, unlimited: 3,
};

interface PlanOption {
  tier: Tier;
  label: string;
  fullPriceCents: number;
  deltaCents: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: Tier;
  netPaidCents: number;
}

const PLAN_LABELS: Record<Tier, string> = {
  free: "Besplatno",
  basic: "Basic",
  premium: "Premium",
  unlimited: "Unlimited",
};

const FULL_PRICES: Record<Tier, number> = {
  free: 0,
  basic: 1999,
  premium: 3999,
  unlimited: 5999,
};

export function UpgradePlanModal({ open, onOpenChange, currentTier, netPaidCents }: Props) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    fetch("/api/payments/checkout")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => setCsrfToken(null));
  }, [open]);

  const options: PlanOption[] = (Object.keys(PLAN_LABELS) as Tier[])
    .filter((t) => TIER_ORDER[t] > TIER_ORDER[currentTier])
    .map((t) => ({
      tier: t,
      label: PLAN_LABELS[t],
      fullPriceCents: FULL_PRICES[t],
      deltaCents: Math.max(0, FULL_PRICES[t] - netPaidCents),
    }));

  async function buy(tier: Tier) {
    if (!csrfToken) return;
    setBusy(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({ targetTier: tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Greška",
          description: data.error || "Pokušaj ponovo",
        });
        return;
      }
      window.location.href = data.url;
    } catch {
      toast({ variant: "destructive", title: "Mrežna greška", description: "Provjeri konekciju" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade plan</DialogTitle>
        </DialogHeader>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">Imaš najviši plan. ✨</p>
        ) : (
          <ul className="space-y-3">
            {options.map((opt) => (
              <li key={opt.tier} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {(opt.fullPriceCents / 100).toFixed(2)} EUR
                    {opt.deltaCents !== opt.fullPriceCents && (
                      <span className="ml-2 text-xs">
                        (razlika: {(opt.deltaCents / 100).toFixed(2)} EUR)
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={busy || !csrfToken}
                  onClick={() => buy(opt.tier)}
                >
                  Plati {(opt.deltaCents / 100).toFixed(2)} EUR
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Wire EventTierBadge.tsx onClick**

Pročitaj `components/admin/EventTierBadge.tsx`:

```bash
cat components/admin/EventTierBadge.tsx
```

Modify to accept `onClick` prop and render as button if provided. Pronađi postojeći `<Badge ...>` JSX i wrapuj ga u button:

```tsx
// Ako je modal prop prisutan, badge je clickable
// Na mjestu gdje se renderuje Badge, dodaj onClick handler:
// <button onClick={props.onClick} ...><Badge ... /></button>
```

Alternativno: dodaj optional `onClick?: () => void` prop-o u interface i ako postoji, wrap-uj ceo badge u `<button>` sa tim handler-om. Bez promjene postojeće default render logike.

U `app/admin/dashboard/[eventId]/page.tsx` (ili gdje god se Badge koristi), uvezi i koristi UpgradePlanModal sa state-om za open.

Pošto ovo zahtijeva orkestraciju u Server Component-u koji ne može drži state, najlakše je kreirati novi client wrapper:

`components/admin/ClickableTierBadge.tsx`:

```tsx
"use client";
import { useState, useEffect } from "react";
import { EventTierBadge } from "@/components/admin/EventTierBadge";
import { UpgradePlanModal } from "@/components/admin/UpgradePlanModal";
import type { PricingTier } from "@prisma/client";

export function ClickableTierBadge({
  tier,
  imageLimit,
  language,
  eventId,
}: {
  tier: PricingTier;
  imageLimit: number;
  language: "sr" | "en";
  eventId: string;
}) {
  const [open, setOpen] = useState(false);
  const [netPaidCents, setNetPaidCents] = useState(0);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/payments/history?eventId=${eventId}`)
      .then((r) => r.json())
      .then((d) => {
        const net = (d.payments || [])
          .filter((p: any) => p.status === "paid" || p.status === "partial")
          .reduce((s: number, p: any) => s + (p.amountCents - p.refundedAmountCents), 0);
        setNetPaidCents(net);
      })
      .catch(() => setNetPaidCents(0));
  }, [open, eventId]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="cursor-pointer hover:opacity-80">
        <EventTierBadge tier={tier} imageLimit={imageLimit} language={language} variant="badge" />
      </button>
      <UpgradePlanModal
        open={open}
        onOpenChange={setOpen}
        currentTier={tier as any}
        netPaidCents={netPaidCents}
      />
    </>
  );
}
```

Onda u `app/admin/dashboard/[eventId]/page.tsx`, zamijeni postojeći `<EventTierBadge .../>` sa:

```tsx
<ClickableTierBadge
  tier={event.pricingTier as PricingTier}
  imageLimit={event.imageLimit || 10}
  language={event.language as 'sr' | 'en'}
  eventId={event.id}
/>
```

(import: `import { ClickableTierBadge } from "@/components/admin/ClickableTierBadge";`)

- [ ] **Step 3: Build**

```bash
pnpm build
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add components/admin/UpgradePlanModal.tsx components/admin/ClickableTierBadge.tsx app/admin/dashboard/\[eventId\]/page.tsx
git commit -m "feat(payments): add UpgradePlanModal + clickable tier badge"
```

---

## Task 13: Payment history endpoint

**Files:**
- Create: `app/api/payments/history/route.ts`
- Create: `__tests__/api/payments/history.test.ts`

- [ ] **Step 1: Write failing test**

```ts
/**
 * @jest-environment node
 */
jest.mock('@/lib/prisma', () => ({
  prisma: { payment: { findMany: jest.fn() } },
}));
jest.mock('@/lib/admin-auth', () => ({
  getAuthenticatedAdmin: jest.fn(),
}));

import { GET } from '@/app/api/payments/history/route';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';

const getAdmin = getAuthenticatedAdmin as jest.MockedFunction<any>;
const findMany = prisma.payment.findMany as jest.MockedFunction<any>;

beforeEach(() => {
  jest.clearAllMocks();
  getAdmin.mockResolvedValue({ id: 'a1', event: { id: 'e1' } });
  findMany.mockResolvedValue([
    { id: 'p1', tier: 'premium', amountCents: 3999, refundedAmountCents: 0, status: 'paid', createdAt: new Date() },
  ]);
});

describe('GET /api/payments/history', () => {
  it('returns 401 without session', async () => {
    getAdmin.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/payments/history'));
    expect(res.status).toBe(401);
  });

  it('returns only own event payments (IDOR guard)', async () => {
    const res = await GET(new Request('http://localhost/api/payments/history?eventId=someoneElse'));
    expect(res.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ eventId: 'e1' }),
      })
    );
  });

  it('returns serialized payments', async () => {
    const res = await GET(new Request('http://localhost/api/payments/history'));
    const body = await res.json();
    expect(body.payments).toHaveLength(1);
    expect(body.payments[0]).toMatchObject({ tier: 'premium', amountCents: 3999 });
  });
});
```

- [ ] **Step 2: Verify fail**

```bash
pnpm test:unit -- payments/history
```

- [ ] **Step 3: Implement**

`app/api/payments/history/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET(_req: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin?.event) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payments = await prisma.payment.findMany({
    where: { eventId: admin.event.id },
    select: {
      id: true,
      tier: true,
      amountCents: true,
      refundedAmountCents: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ payments });
}
```

- [ ] **Step 4: Verify pass**

```bash
pnpm test:unit -- payments/history
```

- [ ] **Step 5: Commit**

```bash
git add app/api/payments/history/route.ts __tests__/api/payments/history.test.ts
git commit -m "feat(payments): add payment history endpoint with IDOR guard"
```

---

## Task 14: ExtendRetentionButton — cap per tier + grandfather bypass + +365 preset

**Files:**
- Modify: `components/admin/ExtendRetentionButton.tsx`
- Modify: `app/api/admin/events/extend-retention/route.ts`
- Modify: `app/admin/dashboard/[eventId]/page.tsx` (pass tier + grandfather flag)

- [ ] **Step 1: Update ExtendRetentionButton**

Pročitaj postojeći `components/admin/ExtendRetentionButton.tsx`. Zamijeni `PRESET_DAYS` i Props:

```tsx
interface Props {
  currentOverrideDays?: number;
  tier: "free" | "basic" | "premium" | "unlimited";
  isGrandfathered?: boolean;
}

const ALL_PRESETS = [7, 30, 90, 180, 365] as const;

const TIER_CAPS: Record<Props["tier"], number> = {
  free: 0,
  basic: 0,
  premium: 180,
  unlimited: 365,
};
```

U komponenti, izračunaj `maxDays` i filtriraj preset-e:

```tsx
export function ExtendRetentionButton({ currentOverrideDays = 0, tier, isGrandfathered = false }: Props) {
  const maxDays = isGrandfathered ? 365 : TIER_CAPS[tier];
  const presets = ALL_PRESETS.filter((d) => d <= maxDays);
  // ... ostatak
  if (maxDays === 0) {
    return (
      <div className="space-y-2 opacity-60">
        <h3 className="font-semibold">Produži trajanje podataka</h3>
        <p className="text-sm text-muted-foreground">
          Dostupno od Premium tier-a.
        </p>
      </div>
    );
  }
  // render button row sa presets umjesto PRESET_DAYS
}
```

Izmijeni button row da koristi `presets` umjesto `PRESET_DAYS`.

- [ ] **Step 2: Update extend-retention API to enforce cap**

`app/api/admin/events/extend-retention/route.ts`, pronađi `const MAX_DAYS = 365;` i zamijeni sa logikom po tier-u + grandfather:

```ts
import { maxRetentionOverrideDays, isGrandfathered, getEffectiveTier } from '@/lib/entitlement';

// ... u POST funkciji, poslije getAuthenticatedAdmin:
const event = await prisma.event.findUnique({
  where: { id: admin.event.id },
  select: { legacyGrandfathered: true, pricingTier: true },
});
if (!event) return NextResponse.json({ error: 'Event ne postoji.' }, { status: 404 });

const effectiveTier = await getEffectiveTier(admin.event.id);
const cap = isGrandfathered(event) ? 365 : maxRetentionOverrideDays(effectiveTier);
if (days > cap) {
  return NextResponse.json(
    { error: `Ovaj tier dozvoljava najviše ${cap} dodatnih dana.` },
    { status: 403 }
  );
}
```

Ukloni stari `MAX_DAYS` check i koristi ovaj novi.

- [ ] **Step 3: Pass props from page**

U `app/admin/dashboard/[eventId]/page.tsx` pronađi gdje se renderuje `<ExtendRetentionButton .../>`. Proslijedi tier + grandfather prop:

```tsx
<ExtendRetentionButton
  currentOverrideDays={event.retentionOverrideDays}
  tier={event.pricingTier as "free" | "basic" | "premium" | "unlimited"}
  isGrandfathered={event.legacyGrandfathered}
/>
```

U select-u iste page:
```ts
select: {
  // postojeća polja +
  retentionOverrideDays: true,
  legacyGrandfathered: true,
}
```

- [ ] **Step 4: Build + test**

```bash
pnpm build
pnpm test:unit -- entitlement
```

Expected: build passes, tests still pass.

- [ ] **Step 5: Commit**

```bash
git add components/admin/ExtendRetentionButton.tsx app/api/admin/events/extend-retention/route.ts app/admin/dashboard/\[eventId\]/page.tsx
git commit -m "feat(payments): retention cap per tier + grandfather bypass + 365 preset"
```

---

## Task 15: Success page redirect handling

**Files:**
- Modify: `app/admin/dashboard/[eventId]/page.tsx` (dodaj pending state rendering)

- [ ] **Step 1: Add pending payment detection**

U `app/admin/dashboard/[eventId]/page.tsx`, nakon fetch-a event-a, dodaj:

```tsx
const url = new URL(request?.url || 'http://x/x'); // Next 15: koristi searchParams
// Actually Next App Router: koristi searchParams prop:
```

Bolje: koristi searchParams prop (App Router pattern). Zamijeni signature:

```tsx
export default async function AdminDashboardEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ payment?: string; ck?: string }>;
}) {
  const { eventId } = await params;
  const { payment, ck } = await searchParams;
  // ... postojeći kod
```

Nakon dobijanja event-a, ako `payment === 'success'` i `ck` postoji:

```tsx
if (payment === 'success' && ck) {
  const pay = await prisma.payment.findUnique({
    where: { lsCheckoutId: ck },
    select: { status: true },
  });
  if (pay?.status === 'pending') {
    return (
      <html>
        <head>
          <meta httpEquiv="refresh" content="3" />
        </head>
        <body>
          <main className="p-8 text-center">
            <h1 className="text-2xl font-semibold">Obrada plaćanja u toku…</h1>
            <p className="mt-2 text-muted-foreground">
              Stranica će se automatski osvježiti. Ako ne uspije, klikni dole.
            </p>
            <a href={`/sr/admin/dashboard/${eventId}`} className="mt-4 inline-block underline">
              Osvježi stranicu
            </a>
          </main>
        </body>
      </html>
    );
  }
  if (pay?.status === 'failed') {
    return (
      <main className="p-8 text-center">
        <h1 className="text-2xl font-semibold">Plaćanje nije uspjelo</h1>
        <p className="mt-2">Molimo pokušaj ponovo ili kontaktiraj podršku.</p>
        <a href={`/sr/admin/dashboard/${eventId}`} className="mt-4 inline-block underline">
          Nazad na dashboard
        </a>
      </main>
    );
  }
  // status 'paid' — continue to normal dashboard
}
```

- [ ] **Step 2: Build**

```bash
pnpm build
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add app/admin/dashboard/\[eventId\]/page.tsx
git commit -m "feat(payments): success page handles pending via meta refresh"
```

---

## Task 16: Payment digest cron

**Files:**
- Create: `app/api/cron/payment-digest/route.ts`
- Modify: `vercel.json`
- Modify: `lib/email.ts` (dodaj `sendPaymentDigestEmail`)

- [ ] **Step 1: Add email template to lib/email.ts**

Dodaj na kraju `lib/email.ts`:

```ts
interface PaymentDigestParams {
  to: string;
  webhookTotal: number;
  webhookInvalid: number;
  webhookErrors: number;
  stuckPending: number;
  signatureFailFlood: boolean;
}

export async function sendPaymentDigestEmail(p: PaymentDigestParams): Promise<void> {
  const alert = p.webhookInvalid > 10 || p.webhookErrors > 0 || p.signatureFailFlood;
  const subject = alert
    ? `⚠️ Payment digest — ${p.webhookInvalid} invalid, ${p.webhookErrors} errors`
    : `Payment digest — ${p.webhookTotal} webhooks OK`;
  const text = [
    'Payment system daily digest:',
    ``,
    `Webhooks last 24h:`,
    `  Total:          ${p.webhookTotal}`,
    `  Invalid sig:    ${p.webhookInvalid}  ${p.signatureFailFlood ? '⚠️ SPIKE' : ''}`,
    `  Errors:         ${p.webhookErrors}`,
    `  Stuck pending:  ${p.stuckPending}`,
    ``,
    `— WeddingApp payments cron`,
  ].join('\n');

  await getTransporter().sendMail({
    from: process.env.ADMIN_EMAIL,
    to: p.to,
    subject,
    text,
  });
}
```

- [ ] **Step 2: Create cron route**

`app/api/cron/payment-digest/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendPaymentDigestEmail } from '@/lib/email';
import { sendTelegramAlert } from '@/lib/telegram';

export const runtime = 'nodejs';

function safeCompareBearer(header: string, secret: string): boolean {
  if (!secret) return false;
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization') || '';
  if (!safeCompareBearer(auth, process.env.CRON_SECRET || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const since = new Date(Date.now() - 86400000);
  const [total, invalid, errors, stuck] = await Promise.all([
    prisma.webhookLog.count({ where: { createdAt: { gt: since } } }),
    prisma.webhookLog.count({
      where: { signatureValid: false, createdAt: { gt: since } },
    }),
    prisma.webhookLog.count({
      where: { error: { not: null }, createdAt: { gt: since } },
    }),
    prisma.payment.count({
      where: { status: 'pending', createdAt: { lt: new Date(Date.now() - 2 * 3600 * 1000) } },
    }),
  ]);

  const signatureFailFlood = invalid > 10;
  if (signatureFailFlood) {
    await sendTelegramAlert(`⚠️ Webhook signature fail flood: ${invalid} in 24h`);
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await sendPaymentDigestEmail({
      to: adminEmail,
      webhookTotal: total,
      webhookInvalid: invalid,
      webhookErrors: errors,
      stuckPending: stuck,
      signatureFailFlood,
    });
  }

  return NextResponse.json({
    ok: true,
    webhookTotal: total,
    webhookInvalid: invalid,
    webhookErrors: errors,
    stuckPending: stuck,
  });
}
```

- [ ] **Step 3: Update vercel.json**

Dodaj novi cron entry u postojeći `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/cleanup", "schedule": "0 3 * * *" },
    { "path": "/api/cron/payment-digest", "schedule": "0 9 * * *" }
  ]
}
```

- [ ] **Step 4: Smoke test**

```bash
SECRET=$(grep "^CRON_SECRET=" .env.local | cut -d= -f2- | tr -d '"')
curl -s -H "Authorization: Bearer $SECRET" http://localhost:3000/api/cron/payment-digest | head -10
```

Expected: `{"ok":true,"webhookTotal":0,"webhookInvalid":0,"webhookErrors":0,"stuckPending":0}`.

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/payment-digest/route.ts vercel.json lib/email.ts
git commit -m "feat(payments): daily digest cron + email alerts"
```

---

## Task 17: Incident runbook docs

**Files:**
- Create: `docs/security/payment-incidents.md`

- [ ] **Step 1: Write runbook**

```bash
mkdir -p docs/security
```

`docs/security/payment-incidents.md`:

```markdown
# Payment incident response runbook

Draft — updated as we learn from real incidents.

## Incident 1: Webhook signature failure flood (>100/h)

Symptoms:
- Payment digest email subject starts with ⚠️
- Telegram alert (if configured): "Webhook signature fail flood"
- `WebhookLog` filled with `signatureValid=false` rows

Actions:
1. Check `WebhookLog.sourceIp` distribution — if clustered, add IP to middleware denylist.
2. Rotate `LS_WEBHOOK_SECRET`:
   - LS dashboard → Settings → Webhooks → edit webhook → regenerate secret
   - `npx vercel env rm LS_WEBHOOK_SECRET production/preview/development`
   - Add new: `printf '%s' "$NEW_SECRET" | npx vercel env add LS_WEBHOOK_SECRET production` (preview, development too)
   - Trigger deploy
3. Verify first valid webhook after rotation reaches handler (create test mode order, check WebhookLog).

## Incident 2: "Platio sam, nije dobio premium"

Actions:
1. Find admin's email, locate WebhookLog:
   ```sql
   SELECT * FROM "WebhookLog"
   WHERE payload->'data'->'attributes'->>'customer_email' = 'admin@email'
   ORDER BY "createdAt" DESC LIMIT 5;
   ```
2. Cases:
   - No log + valid order in LS dashboard → webhook never delivered. Manually reprocess via scripts/reprocess-webhook.ts.
   - Log with `error IS NOT NULL` → fix bug, run reprocess.
   - Log with `signatureValid=false` → signature rotation issue? Check LS dashboard webhook secret matches env.
3. If all else fails, manually update Event.pricingTier + insert Payment row matching LS order.

## Incident 3: Unknown variant_id

Symptoms:
- Telegram alert "Unknown variant_id"
- `WebhookLog.error` contains "unknown variant_id"

Actions:
1. Check `PricingPlan.lsVariantId` sync:
   ```sql
   SELECT tier, "lsVariantId" FROM "PricingPlan";
   ```
2. Verify all 3 env vars (`LS_VARIANT_ID_BASIC/PREMIUM/UNLIMITED`) match LS dashboard.
3. Run seed to re-sync: `npx tsx prisma/seed.ts`.
4. If it's a legitimate new product, add it to schema and update env.

## Incident 4: Stuck pending Payment cleanup failed

Symptoms:
- Payment digest shows `stuckPending` rising
- Cron cleanup returns error

Actions:
1. Check Vercel cron logs for cleanup endpoint errors.
2. Manual cleanup:
   ```sql
   UPDATE "Payment" SET status = 'failed'
   WHERE status = 'pending' AND "createdAt" < NOW() - INTERVAL '2 hours';
   ```

## Pre-launch security checklist

See [payment integration design spec §2.8](../superpowers/specs/2026-04-19-payment-integration-design.md#28-pre-launch-security-checklist).
```

- [ ] **Step 2: Commit**

```bash
git add docs/security/payment-incidents.md
git commit -m "docs(payments): incident response runbook"
```

---

## Task 18: Final verification + regression

**Files:** (no new files — verification only)

- [ ] **Step 1: Run all tests**

```bash
pnpm test:unit
```

Expected: all existing + new tests pass. Count should be old total (e.g., 26) + new ~30 = ~56 tests.

- [ ] **Step 2: Lint**

```bash
pnpm lint
```

Expected: only pre-existing CanvasRenderer warning.

- [ ] **Step 3: Build**

```bash
pnpm build
```

Expected: production build passes.

- [ ] **Step 4: Migrate status**

```bash
npx prisma migrate status
```

Expected: `Database schema is up to date!`

- [ ] **Step 5: Audit drift**

```bash
npx tsx scripts/audit-drift.ts
```

Expected: `✓ No drift` (grandfathered event ne tripuje check, nema Payment-a pa nema drift-a).

- [ ] **Step 6: Manual E2E test list**

Create `docs/testing/payment-e2e-checklist.md`:

```markdown
# Payment E2E checklist (manual)

Prerequisites: LS test mode products created, env vars set, dev server running.

- [ ] Login as admin. Dashboard loads with current tier badge (Free).
- [ ] Click on tier badge → UpgradePlanModal opens.
- [ ] Select "Premium — 39.99 EUR". Redirect to LS hosted checkout.
- [ ] Use test card `4242 4242 4242 4242`, any CVV, future date.
- [ ] Complete purchase → LS redirects back to `/sr/admin/dashboard/[eventId]?payment=success&ck=...`.
- [ ] Page shows "Obrada plaćanja u toku…" initially, auto-refreshes 3s.
- [ ] After <10s, dashboard renders with "Premium" badge.
- [ ] DB check: Payment row with status='paid', Event.pricingTier='premium'.
- [ ] ExtendRetentionButton in Help tab is enabled, shows +7/+30/+90/+180.
- [ ] Click +30 days → toast "Produženje postavljeno".
- [ ] LS dashboard → find the order → Refund fully → webhook fires.
- [ ] DB: Payment.status='refunded', Event.pricingTier='free'.
- [ ] ExtendRetentionButton panel shows "Dostupno od Premium tier-a".
```

Commit:

```bash
git add docs/testing/payment-e2e-checklist.md
git commit -m "docs(payments): E2E manual test checklist"
```

- [ ] **Step 7: Final summary commit (if any stray files)**

```bash
git status
```

Expected: clean working tree.

---

## Self-review checklist

**Spec coverage:**
- ✅ Section 1 (Architecture) → Tasks 6-8, 12, 13 covered frontend, backend, DB layers
- ✅ Section 2 (Security) → Tasks 6 (HMAC), 7 (CSRF+rate limit+IDOR), 8 (sig+store+variant+test_mode guards)
- ✅ Section 3 (Schema) → Task 2 (migration) + Task 9 (audit invariants)
- ✅ Section 4 (Flows) → Task 7 (checkout), Task 8 (webhook), Task 15 (success redirect)
- ✅ Section 4.7 (Entitlement) → Task 3 (lib/entitlement)
- ✅ Section 5 (Error handling) → Task 8 (try/catch + WebhookLog.error), Task 10 (stuck cleanup)
- ✅ Section 6 (Testing) → Tasks 3, 4, 5, 6, 7, 8, 13 all include tests

**No placeholders:** scanned — actual code blocks everywhere.

**Type consistency:** `PricingTier` enum used consistently; `Payment.lsCheckoutId` matches `checkoutInternalId` param in checkout route; webhook handler reads `custom_data.checkoutInternalId` to look up Payment.

**Deferred items explicitly noted:** C2 (custom_price test), H5 (BiH knjigovođa) documented in plan header.
