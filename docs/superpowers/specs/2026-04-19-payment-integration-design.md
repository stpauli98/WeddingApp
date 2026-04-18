# Design Spec — Payment integration + paid tier upgrades

**Status:** Revised design (rev 2), pending implementation plan.
**Prior work:** retention + marketing harvest — završen i deployed (commit `17d1fda` u main).

---

## Revisions — iz code-reviewer analize

Spec je prošao dubinski design review prije pisanja koda. Najvažniji nalazi i kako smo ih adresirali:

| # | Nalaz | Odluka |
|---|---|---|
| **C1** | Da li LS prihvata BiH merchant-e | ✅ Verifikovano — user kreirao LS account |
| **C2** | Da li LS `custom_price` radi za arbitrary mid-range delta (€20 za basic→premium) | ⏳ Odgođeno — testira se poslije kreiranja LS produkata. **Dvojni design u spec-u:** ako radi → Section 4.2 varijanta A (jedna variant + custom_price). Ako ne → varijanta B (zasebne upgrade variante: basic-to-premium, basic-to-unlimited, premium-to-unlimited) |
| **C3** | Postojeći `nikola-i-milica` event će day-1 tripovati audit-drift i novi retention cap | ✅ Grandfather: dodaje se `Event.legacyGrandfathered Boolean @default(false)`, postojeći event se markira u migraciji; audit + retention cap ga izuzimaju |
| **H1** | Dual source of truth: `Event.pricingTier` vs `getEffectiveTier()` | ✅ Resolved — `Event.pricingTier` ostaje kao **cache** koji piše **samo** webhook handler u okviru transakcije sa Payment update-om. Novi audit invariant: `event.pricingTier === derivedEffectiveTier(eventId)`. Ako drift, audit fail-uje u CI. Code discipline + audit enforcement |
| **H2** | Contradiction: "async webhook" vs sync processing | ✅ Resolved — odustajemo od async claim-a. Processing je sync, handler vraća 200 kad završi. LS tolerira do 30s; naše transakcije traju <500ms |
| **H3** | Out-of-order webhook (refund prije order_created) | ✅ Handler za `order_refunded` bez prethodnog Payment row-a: upsert `{lsOrderId, status:'refunded', refundedAmountCents: refundAmount}`. Kasniji `order_created` bi update-ovao isti row |
| **H4** | Concurrency race u derivation+update | ✅ `prisma.$transaction(isolationLevel: 'Serializable')` za sve Payment + Event update operacije |
| **H5** | BiH tax/legal realnost šira nego MoR claim | User odgovornost: konsultuje knjigovođu prije launch-a. Spec dodaje obaveznu `Pre-launch legal checklist` (vidi 2.8) |
| **H6** | Gmail SMTP ne-pouzdan za security alert-e | ✅ Digest email-ovi ostaju preko Gmail-a (tolerantno). Za **incident alert-e** (signature flood) dodaje se Telegram bot integration opciono (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) — ako env vars postavljeni, šalje na Telegram paralelno |
| **M1** | Polling UX on redirect | ✅ Pojednostavljeno: server-component page sa `<meta refresh>` svakih 3s dok `status=pending`, manual refresh button. Bez JS polling-a |
| **M2** | WebhookLog.payload čuva PII | ✅ `scrubPayload()` helper strip-uje `customer_name`, `billing_address`, samo zadrži email (za GDPR audit trail) + amount + event_id |
| **M3** | 3 migracije → 1 combined | ✅ Jedna migracija `add_payment_infrastructure` sve odjednom |
| **M7** | **Premium retention cap: 180 dana, Unlimited: 365 dana** (korisnikova odluka) | ✅ `maxRetentionOverrideDays(premium)=180`, `maxRetentionOverrideDays(unlimited)=365`. ExtendRetentionButton dodaje +365 preset. Postojeći premium korisnici zadržavaju +7/+30/+90/+180 opcije |
| **L3** | Neimenovani LS event types | ✅ Default branch logs u WebhookLog kao `unknown_event` umjesto ignore-a |

---

## Context

WeddingApp trenutno prikazuje tier cijene (`lib/pricing-tiers.ts` — Free €0, Basic €19.99, Premium €39.99, Unlimited €59.99) ali **nema nikakav payment kod**. Svi admini dobijaju ono što izaberu u formi bez naplate. UI obećava feature-e koje nemamo kako da naplatimo.

Dva nova zahtjeva korisnika:

1. **Retention extension (ExtendRetentionButton +7/30/90/180 dana)** — mora biti **paid feature** ILI dostupan samo u skupljem tier-u.
2. **Tier upgrade flow** — klik na tier badge u dashboard-u → modal za upgrade sa pravom naplatom.

Odluke iz brainstorming sesije (već potvrđeno):

| Pitanje | Odluka |
|---|---|
| Payment provider | **Lemon Squeezy** (MoR model; Stripe ne prihvata BiH business account-e, LS radi) |
| Naplata | **One-time per event** (svadba = jedan event = jedan plaćen tier; nema recurring) |
| Retention extension monetization | **Tier gating sa max cap-om po tier-u** (vidi sekciju 4.7) — **NE** kao zaseban paid add-on |
| Tier upgrade timing | **Oba** (bira pri kreiranju event-a + može upgrade-ovati poslije sa diferencijalnom cijenom) |

Cilj: admin koji hoće premium plaća razliku kroz LS checkout, webhook upgrade-uje Event, feature-i se odmah otključaju.

---

## Sekcija 1 — Arhitektura

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND                                                │
│  ├── PricingTierSelector (postojeći u app/admin/event)   │
│  │   → radio buttons sa cijenama                         │
│  │   → submit → POST /api/payments/checkout              │
│  │   → redirect na LS hosted checkout                    │
│  ├── Dashboard tier badge (EventTierBadge.tsx)           │
│  │   → onClick → UpgradeModal (NEW komponenta)           │
│  │   → prikazuje + cijenu razlike do svakog vi\u0161eg tier-a │
│  │   → CTA → POST /api/payments/checkout sa targetTier   │
│  └── ExtendRetentionButton (postojeći)                   │
│      → ako tier < premium: disabled + tooltip "Samo PRM" │
└──────────────────┬──────────────────────────────────────┘
                   │ LS hosted checkout (page redirect)
                   ▼
┌─────────────────────────────────────────────────────────┐
│  LEMON SQUEEZY (external, MoR)                           │
│  Admin unese karticu, LS procesira, izdaje VAT fakturu, │
│  redirect nas natrag + \u0161alje webhook na na\u0161 endpoint.    │
└──────────────────┬──────────────────────────────────────┘
                   │ POST /api/payments/webhook
                   │ X-Signature: <HMAC-SHA256>
                   ▼
┌─────────────────────────────────────────────────────────┐
│  BACKEND (Next.js App Router API routes)                 │
│  POST /api/payments/checkout                             │
│    auth: admin_session + CSRF                            │
│    → compute amountDue = targetTierPrice - sum(paid)     │
│    → call LS SDK: createCheckout(...)                    │
│    → insert Payment{status=pending, lsCheckoutId}        │
│    → return { url } za redirect                          │
│                                                          │
│  POST /api/payments/webhook                              │
│    auth: HMAC signature verify (raw body, constant-time) │
│    → WebhookLog insert (sig result, raw payload)         │
│    → dispatch by event_name:                             │
│       order_created     → Payment.status='paid', update  │
│                           Event.pricingTier              │
│       order_refunded    → Payment.refundedAmountCents +, │
│                           Event.pricingTier derivation   │
│                                                          │
│  GET /api/payments/history                               │
│    auth: admin_session                                   │
│    → list Payment WHERE event.adminId = session.admin.id │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  DATABASE (Postgres via Prisma Accelerate)               │
│  ├── Payment (NEW) — immutable audit trail              │
│  ├── WebhookLog (NEW) — forensic, digest source          │
│  ├── Event (postojeći) — dodata Payment[] relation       │
│  └── PricingPlan (postojeći) — dodat lsVariantId         │
└─────────────────────────────────────────────────────────┘
```

**Ključna odluka — `Payment` row per transakcija:**
- Svaki checkout = 1 row (immutable za `amountCents`, `tier`, `lsCheckoutId`, `lsOrderId`, `createdAt`)
- Upgrade = novi row sa delta amount-om, ne edit
- Refund = update istog row-a (`refundedAmountCents`, `refundedAt`, `status`)
- Efektivni tier event-a = `max(tier across Payment where status IN ('paid','partial'))`

**Context7 research potvrdio:**
- LS SDK: `@lemonsqueezy/lemonsqueezy.js` — `lemonSqueezySetup({ apiKey })` obavezan prije bilo kog call-a
- API key je **server-side only** — CAUTION u SDK docs-u protiv browser usage-a
- Checkout se kreira sa `custom_data` poljem koje preživi u webhook-u kao `meta.custom_data`
- Webhook retry policy: do 5 pokušaja sa exponential backoff (pa handler MORA biti brz i idempotent)
- Test mode ima odvojen API key — dashboard preklopka za live/test

---

## Sekcija 2 — Security deep dive

### 2.1 STRIDE threat model

| Prijetnja | Kategorija | Primjer | Mitigacija |
|---|---|---|---|
| Spoofing webhook-a | **S** | Napadač POST-uje fake `order_created` i "kupi" premium | HMAC-SHA256 verify + `timingSafeEqual`. **Raw body** obavezan (ne `req.json()` prije verify-a) |
| Tampering payload-a | **T** | MITM mijenja `amount` ili `custom_data.eventId` | HMAC signing preko CIJELOG raw body-ja — bilo koja izmjena = invalid |
| Repudiation | **R** | Admin: "nikad nisam platio premium, hoću refund" | Immutable `Payment` + `WebhookLog` sa timestamp-ovima; LS vlastiti audit trail |
| Info disclosure | **I** | Admin A preko IDOR-a vidi B-ove transakcije | Svaki `payments/*` endpoint filter-uje `payment.event.adminId = session.admin.id` |
| DoS na checkout | **D** | Bot spamuje `/api/payments/checkout` | Per-IP rate limit (10/h) + per-admin rate limit (5/h) |
| Elevation of privilege | **E** | Admin bez plaćanja koristi premium feature | Server derivira efektivni tier iz SUM Payment-a, ne vjeruje `Event.pricingTier` direktno |

### 2.2 LS-specific attack surface

**Webhook verify — tačan obrazac iz LS docs + Context7 istraživanja:**
```ts
// app/api/payments/webhook/route.ts
import crypto from 'crypto';

export const runtime = 'nodejs'; // edge runtime nema crypto.createHmac

export async function POST(req: Request) {
  const rawBody = await req.text();       // KRITIČNO: raw, ne req.json()
  const signature = req.headers.get('x-signature') || '';

  const expected = crypto
    .createHmac('sha256', process.env.LS_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');

  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    // Log u WebhookLog sa signatureValid=false i reject
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(rawBody);
  // Idempotency: lsEventId UNIQUE guard
  // ...
}
```

**LS-specific napadi:**

1. **Test vs Live mode payload confusion** — isti URL prima oba. **Odbrana:** odbij webhook ako `data.attributes.test_mode !== false` u produkciji.
2. **Store ID confusion** — multi-store account može slati kroz isti URL. **Odbrana:** hardcode `LS_STORE_ID`; reject ako `data.attributes.store_id !== LS_STORE_ID`.
3. **Variant ID hijack** — napadač kreira LS produkt sa našim brand-om i varijantom, admin proda u checkout flow-u. **Odbrana:** strict allowlist `PricingPlan.lsVariantId` — unknown variant = reject + alert.
4. **Webhook retry storm** — LS retry na non-2xx do 5x. **Odbrana (H2 resolved):** sync obrada u <1s (Prisma transakcija), vrati 200 tek kad završimo. LS tolerira do 30s response-a. Ako ikad transakcija pređe 5s (alarm u digest-u), razmatrati queue. Za MVP: sync je dovoljno pouzdano.
5. **Race webhook-vs-redirect** — korisnik se vrati na naš success page prije nego webhook stigne. **Odbrana:** success page fetch-uje Payment po `lsCheckoutId` iz URL query-ja; ako je `status=pending`, pokaži "obrada u toku" UI sa auto-refresh.

### 2.3 Secret & key management

| Secret | Scope | Rotation | Rizik leak-a |
|---|---|---|---|
| `LS_API_KEY` | Server-side, store-scoped | Kvartalno, ručno u LS dashboard | **Kritičan** — napadač refund-uje orders, čita kupce |
| `LS_WEBHOOK_SECRET` | Samo za verify | Godišnje ili na incident | **Visok** — napadač potpisuje fake webhook-e |
| `LS_STORE_ID` | Quasi-public identifier | Ne rotira se | Nizak |

### 2.4 Idempotency slojevi (defense-in-depth)

```
[1] LS retry logic                                    (provider side)
[2] Client: checkout button disabled during request   (UX)
[3] /payments/checkout: upsert by (eventId, tier, pending)
[4] LS side: unique checkout_id
[5] Webhook: UPSERT by Payment.lsEventId UNIQUE       (replay guard)
[6] DB CHECK: PaymentStatus enum — samo valjane tranzicije
```

### 2.5 Monitoring bez Sentry-ja (H6 resolved)

**WebhookLog** + **dual-channel alerting**:

**Dnevni digest cron** (`/api/cron/payment-digest` u 09:00 UTC, Gmail SMTP):
- Count total / valid / invalid webhook-a
- List `signatureValid=false` iz zadnjih 24h (vjerovatni napadi)
- List `error IS NOT NULL` (naši bug-ovi)
- List stuck `pending` Payment-a starijih od 2h
- Email adminu (`ADMIN_EMAIL`) sa `⚠️` prefix-om

**Realtime Telegram alert** (opciono, ako env vars postavljeni):
- Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (tvoj osobni chat)
- Šalje se **odmah** (ne čeka dnevni digest) kad:
  - Webhook signature fail flood (>5 za sat) → mogući napad u toku
  - Payment transakcija failuje sa bazom
  - Unknown `variant_id` u webhook-u → moguća konfig drift
- Helper: `lib/telegram.ts` — fire-and-forget fetch na Telegram Bot API
- Fallback: ako Telegram env nije postavljen → samo email digest radi (OK za dev)

Razlog: Gmail je tolerantan za dnevni digest ali ne za critical alert-e (može kasniti, može ići u spam). Telegram je instant + pouzdan + besplatan.

### 2.6 Incident response runbook (draft)

**Signature mismatch flood (>100/h):**
1. `WebhookLog` izvor IP-a → block u middleware-u
2. Rotate `LS_WEBHOOK_SECRET`
3. LS dashboard → update webhook sa novim secret-om
4. Redeploy sa novim env var-om

**"Platio sam ali premium nisam dobio":**
1. `WebhookLog WHERE payload->>'customer_email' = admin.email` — stigao li?
2. Valid sig + error → ručni reprocess (skripta)
3. Nikad nije stigao → provjeri LS dashboard za taj order
4. Nigdje nema → refund kroz LS dashboard

**Unknown variant_id:**
1. Auto-reject, log, alert u narednom digest-u
2. Provjeri sinhronizaciju `PricingPlan.lsVariantId` sa LS-om

### 2.7 Compliance matrix

| Zahtjev | Izvor | Kako zadovoljavamo |
|---|---|---|
| PCI-DSS | Card schemes | **SAQ A** — kartice ne vide naš server, LS je MoR |
| GDPR Art. 5 minimization | EU | Čuvamo: email, lsOrderId, amountCents, createdAt. Ne čuvamo: adresu, ime, PAN |
| GDPR Art. 17 right to erasure vs BiH tax | BiH poreski zakon (10 god čuvanja faktura) | Payment row-ovi **izuzeti** od retention cleanup-a |
| EU VAT | MoR ugovor | LS izdaje VAT invoice |
| 14-day withdrawal right | EU | LS checkbox "waive refund rights" **mora biti uključen** u checkout config |

### 2.8 Pre-launch security checklist

- [ ] `LS_API_KEY` u Vercel env (production only pravi key; preview/dev test key)
- [ ] `LS_WEBHOOK_SECRET` isti pattern
- [ ] `LS_STORE_ID` set i test checkout ga verifikuje
- [ ] `PricingPlan.lsVariantId` popunjen za sve tier-ove iz LS prod store-a
- [ ] Webhook URL u LS dashboard-u ✅ initial ping potvrđen
- [ ] E2E test mode prošao (4242 4242 4242 4242)
- [ ] E2E live mode prošao sa pravom karticom + refund
- [ ] Rate limit: 11-i checkout vraća 429
- [ ] IDOR test: admin A vs B → 403
- [ ] Secret rotation testiran jednom u test-u
- [ ] `docs/security/payment-incidents.md` napisan i pročitan

---

## Sekcija 3 — Data model + migracije

### 3.1 Nove tabele

```prisma
model Payment {
  id                  String        @id @default(uuid())
  eventId             String
  /// Kupljeni (target) tier za OVU uplatu, ne current Event.pricingTier.
  tier                PricingTier
  /// Iznos u centima (EUR). Uvijek > 0.
  amountCents         Int
  currency            String        @default("EUR")
  status              PaymentStatus
  /// Unique po checkout sesiji; popunjen pri /payments/checkout.
  lsCheckoutId        String        @unique
  /// Popunjen kad stigne order_created webhook.
  lsOrderId           String?       @unique
  /// LS event.id — idempotency guard za webhook-e.
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
  lsEventId      String?   @unique     // null kad sig invalid
  eventName      String?
  signatureValid Boolean
  /// M2: PII-scrubbed payload. scrubPayload() helper strip-uje
  /// customer_name, billing_address, country. Zadržava email
  /// (potreban za refund audit) + amount + event_id + order_id.
  payload        Json
  error          String?
  processedAt    DateTime?
  sourceIp       String?
  createdAt      DateTime  @default(now())

  @@index([signatureValid, createdAt])
  @@index([eventName])
}
```

### 3.2 Izmjene postojećih

```prisma
model Event {
  // ... postojeća polja ...
  payments             Payment[]
  /// C3: Grandfather zastavica za event-e kreirane prije payment infra-e.
  /// Izuzima od audit-drift invarianta "paid tier without Payment row" i
  /// od maxRetentionOverrideDays cap-a. Postavlja se u migraciji za konkretne
  /// postojeće event-e; default false za sve buduće.
  legacyGrandfathered  Boolean   @default(false)
}

model PricingPlan {
  // ... postojeća polja ...
  /// LS variant ID — allowlist; null za free tier (nije kupljiv).
  lsVariantId    String?   @unique
}
```

### 3.3 Audit-drift proširenje

`scripts/audit-drift.ts` dobija 4 nova provjerača:
1. **Event na paid tier-u bez successful Payment-a** (CRITICAL) — izuzima `legacyGrandfathered` event-e
2. **Stuck pending Payment-i > 2h** (MEDIUM)
3. **WebhookLog signature-fail spike > 10/24h** (HIGH — mogući napad)
4. **Event.pricingTier drift vs derivedEffectiveTier(eventId)** (HIGH) — cache inkonzistentnost (H1 enforcement)

### 3.4 Retention izuzetci

Kad istekne event retention (postojeći retention cleanup cron):
| Tabela | Akcija |
|---|---|
| Event | Soft delete (postojeći behaviour) |
| Guest, Image, Message | Hard delete (postojeći) |
| **Payment** | **STAY** (BiH poreski zakon 10 god) |
| **WebhookLog** | **STAY 1 god** pa rolling delete (novi cron) |
| MarketingContact | Stay (postojeći) |

### 3.5 Migracija (M3: jedna combined)

```
<ts>_add_payment_infrastructure/migration.sql

-- Enum
CREATE TYPE "PaymentStatus" AS ENUM ('pending','paid','refunded','partial','failed');

-- Payment tabela
CREATE TABLE "Payment" (...);
CREATE INDEX "Payment_eventId_status_idx" ON "Payment"("eventId","status");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_check"
  CHECK ("amountCents" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_refund_check"
  CHECK ("refundedAmountCents" >= 0 AND "refundedAmountCents" <= "amountCents");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_currency_check"
  CHECK (currency ~ '^[A-Z]{3}$');

-- WebhookLog tabela
CREATE TABLE "WebhookLog" (...);
CREATE INDEX "WebhookLog_signatureValid_createdAt_idx" ON "WebhookLog"("signatureValid","createdAt");
CREATE INDEX "WebhookLog_eventName_idx" ON "WebhookLog"("eventName");

-- PricingPlan.lsVariantId
ALTER TABLE "PricingPlan" ADD COLUMN "lsVariantId" TEXT;
CREATE UNIQUE INDEX "PricingPlan_lsVariantId_key"
  ON "PricingPlan"("lsVariantId") WHERE "lsVariantId" IS NOT NULL;

-- Event.legacyGrandfathered (C3)
ALTER TABLE "Event" ADD COLUMN "legacyGrandfathered" BOOLEAN NOT NULL DEFAULT false;

-- Grandfather postojeći event koji je kreiran prije payment sistema (nikola-i-milica sa basic + 180d override)
UPDATE "Event" SET "legacyGrandfathered" = true
  WHERE "slug" = 'nikola-i-milica' AND "pricingTier" = 'basic';
```

Sve u jednoj migraciji — atomic deploy, lakši rollback, manji PR review load.

### 3.6 Seed update

`prisma/seed.ts` proširuje se: ako `LS_VARIANT_ID_BASIC`, `LS_VARIANT_ID_PREMIUM`, `LS_VARIANT_ID_UNLIMITED` env vars postoje → upiši u `PricingPlan.lsVariantId`. Inače warn log: "LS variant IDs not set — plans won't accept payments yet."

### 3.7 ERD snippet

```
Admin ──1:1── Event ──1:N── Payment
                │
                ├──1:N── Guest ──1:N── Image
                │                 └── Message
                └── Payment[]

PricingPlan (lsVariantId) ── 1:N ── PricingFeature

WebhookLog (standalone — forensic)
```

---

## Sekcija 4 — End-to-end flows

**Odluke iz brainstorma** (zatvorene):
- Initial flow: **free default + upgrade kroz badge kasnije** (jedan checkout path)
- Downgrade: **nije podržan** (UpgradeModal pokazuje samo tier-ove iznad trenutnog)
- Refund: **samo ti kroz LS dashboard** (admin ne može self-service)

### 4.1 Initial event creation (free, bez naplate)

```
Admin /admin/event form
  ├── coupleName, location, date, slug
  ├── NEMA vi\u0161e tier selector-a ovdje (uklanja se iz PricingTierSelector)
  └── submit → POST /api/admin/events
                 ├── CSRF check (postoje\u0107)
                 ├── getAuthenticatedAdmin (postoje\u0107)
                 ├── existing event check (postoje\u0107)
                 └── create Event sa pricingTier='free', imageLimit=10
```
Identi\u010dno trenutnom stanju minus tier selector. **Nema dodira sa LS-om u ovom flow-u.**

### 4.2 Upgrade flow (poslije kreiranja event-a)

```
Dashboard tier badge (EventTierBadge.tsx)
  │
  │ onClick
  ▼
UpgradeModal (NEW)
  ├── fetch GET /api/payments/checkout (CSRF token)
  ├── prikazuje tier-ove iznad trenutnog (basic/premium/unlimited)
  ├── svaki tier: displayed price = targetTier.price - SUM(paid amounts)
  │                                                         za ovaj event
  └── korisnik klikne "Upgrade to premium \u2014 \u20ac39.99"
      │
      │ POST /api/payments/checkout { targetTier: 'premium' }
      │   + x-csrf-token header
      ▼
   SERVER:
      ├── CSRF validate
      ├── getAuthenticatedAdmin → admin + admin.event
      ├── rate limit (10/h po IP, 5/h po admin)
      ├── validate targetTier > current Event.pricingTier
      │   (enum ordering: free < basic < premium < unlimited)
      ├── amountDue = PricingPlan.find(targetTier).price
      │             - SUM(Payment.amountCents - refundedAmountCents)
      │               WHERE eventId = admin.event.id AND status IN ('paid','partial')
      │   → ako amountDue <= 0: vrati 409 "ve\u0107 plati\u0107eno ili iznad"
      ├── lemonSqueezy.createCheckout({
      │     variant: PricingPlan.find(targetTier).lsVariantId,
      │     custom_price: amountDue,                  // LS podr\u017eava dinami\u010dku cijenu
      │     custom_data: { eventId, adminId, targetTier },
      │     redirect_url: '/sr/admin/dashboard/{eventId}?payment=success',
      │     receipt_button_text: 'Povratak u aplikaciju',
      │   })
      ├── INSERT Payment {
      │     eventId, tier=targetTier, amountCents=amountDue,
      │     status='pending', lsCheckoutId, customerEmail=admin.email
      │   }
      └── return { url: checkoutUrl }
  │
  │ client redirect window.location.href = url
  ▼
LS hosted checkout (new page)
  └── user unese karticu, plati
      └── LS redirect nazad na redirect_url
      └── LS \u0161alje webhook (sekcija 4.3)
```

### 4.3 Webhook success path (`order_created`)

```
POST /api/payments/webhook
  │ Body: raw JSON (ne parse-amo dok ne verify-amo)
  │ Header: X-Signature (HMAC-SHA256 hex)
  ▼
  1. rawBody = await req.text()
  2. HMAC verify sa LS_WEBHOOK_SECRET + timingSafeEqual
     │
     ├── FAIL: insert WebhookLog { signatureValid: false, payload: rawBody, sourceIp }
     │         return 401
     │
     └── OK:   event = JSON.parse(rawBody)
               ├── check test_mode: ako je production i test_mode=true → 400 + log
               ├── check store_id === LS_STORE_ID → inače 400 + log
               ├── check variant_id in PricingPlan.lsVariantId → inače 400 + log + alert
               │
               └── upsert WebhookLog { lsEventId, eventName, payload: scrubPayload(rawJson), signatureValid: true }
                   (UNIQUE lsEventId \u2014 retry = no-op; scrubPayload strip-uje customer_name, billing_address)
                   │
                   ▼
                switch (event.meta.event_name) {
                  case 'order_created':
                    // H4 concurrency \u2014 sve u serializable transakciji
                    await prisma.$transaction(async tx => {
                      await tx.payment.update({
                        where: { lsCheckoutId: custom_data.checkoutId },
                        data: {
                          status: 'paid',
                          lsOrderId: event.data.id,
                          lsEventId: event.meta.event_id,     // UNIQUE guard
                        },
                      });
                      const effective = await deriveEffectiveTier(tx, custom_data.eventId);
                      await tx.event.update({
                        where: { id: custom_data.eventId },
                        data: {
                          pricingTier: effective,
                          imageLimit: PRICING_TIERS[effective].imageLimit,
                        },
                      });
                    }, { isolationLevel: 'Serializable' });
                    break;

                  case 'order_refunded':
                    → sekcija 4.4 (isto Serializable + upsert za out-of-order)
                    break;

                  default:
                    // L3 \u2014 ne ignori\u0161emo, logujemo kao unknown za forensic
                    console.warn('Unknown LS event:', event.meta.event_name);
                    await prisma.webhookLog.update({
                      where: { lsEventId: event.meta.event_id },
                      data: { eventName: `unknown:${event.meta.event_name}` },
                    });
                }
                   │
                   ▼
                UPDATE WebhookLog SET processedAt = NOW() WHERE lsEventId = ...
                return 200
```

**`derivedEffectiveTier(eventId)`** = iz svih Payment-a sa `status IN ('paid','partial')` za taj event, uzmi `max(tier)` po enum ordering-u (free < basic < premium < unlimited). Ako nema paid-ova, `free`. Ovo je **izvor istine** za entitlement.

### 4.4 Refund flow (admin-initiated kroz LS dashboard)

```
1. Admin (customer) po\u0161alje ti email: "ho\u0107u refund za order #XYZ"
2. Ti → LS dashboard → Orders → XYZ → Refund (full ili partial)
3. LS procesira refund, \u0161alje webhook:
     event_name: 'order_refunded'
     data.attributes.refunded_amount: <cents>
     data.attributes.refunded: true|false (full)
4. Na\u0161 webhook handler (u Serializable transakciji):
     a) Upsert Payment WHERE lsOrderId = event.data.id:
          IF EXISTS:
            refundedAmountCents += event.data.attributes.refunded_amount
            refundedAt = NOW()
            status = refundedAmountCents === amountCents ? 'refunded' : 'partial'
          IF NOT EXISTS (H3 \u2014 out-of-order webhook):
            create {
              lsOrderId, eventId = event.meta.custom_data.eventId,
              tier = event.meta.custom_data.targetTier,
              amountCents = event.data.attributes.total,
              refundedAmountCents = refundAmount,
              status = refundAmount === total ? 'refunded' : 'partial',
              lsCheckoutId = event.meta.custom_data.checkoutId (fallback to placeholder),
            }
            (kasniji order_created za isti lsOrderId \u0107e fail-ovati na UNIQUE
             i biti no-op \u2014 to je \u017eeljeno pona\u0161anje, refund ve\u0107 handled)
5. U istoj transakciji Event UPDATE:
     pricingTier = derivedEffectiveTier(eventId)
     imageLimit = PricingPlan[effective].imageLimit
6. Admin vidi downgrade-ovan tier u dashboard-u
```

**Partial refund semantika:** ako admin plati premium (\u20ac39.99) i dobije \u20ac10 refund:
- `amountCents=3999, refundedAmountCents=1000, status='partial'`
- `derivedEffectiveTier` treba `paid - refunded > 0` filter \u2014 ostaje premium
- Ako kasnije do\u0111e jo\u0161 \u20ac2999 refund: `refundedAmountCents=3999, status='refunded'` \u2014 taj Payment se eliminira iz derivation-a

### 4.5 Edge: race webhook vs redirect (M1 — simplified)

Scenario: korisnik klikne "Pay" → LS checkout → plati → LS redirect nazad pod 500ms, ali webhook jo\u0161 nije do\u0161ao.

Redirect page `/admin/dashboard/{eventId}?payment=success` (server component):
```
1. Read Event + last Payment WHERE lsCheckoutId = URL param
2. Ako status='paid':
     prikaži dashboard sa novim tier badge-om + success toast
3. Ako status='pending':
     render:
       - heading: "Obrada pla\u0107anja u toku..."
       - meta http-equiv="refresh" content="3"  \u2190 browser auto-reloads za 3s
       - manual "Osvje\u017ei stranicu" link
       - NEMA client-side JS polling-a ni state machine-a
4. Ako status='failed':
     "Pla\u0107anje nije uspjelo, molimo poku\u0161ajte ponovo" + contact info
```

Rationale: webhook delivery traje <5s u 99% slučajeva. Server-side re-render je jednostavniji od JS polling state machine-a, radi sa disabled JS, i lakše debug-ovati.

### 4.6 Edge: checkout expired

Scenario: admin kreira checkout, ne plati, 60 minuta pro\u0111e. LS checkout se auto-expire-uje (ne \u0161alje webhook).

Postoje\u0107i `/api/cron/cleanup` dobija novi pass:
```
Every day at 03:00 UTC:
  Payment where status='pending' AND createdAt < NOW() - 2h:
    UPDATE status = 'failed'
    UPDATE expiredAt = NOW()
  (count u digest email-u)
```

Ako admin otvori isti UpgradeModal ponovo → kreira se novi `lsCheckoutId` i novi Payment row. Stari pending rows ne interferi\u0161u (filter u `derivedEffectiveTier` ih ignori\u0161e).

### 4.7 Entitlement derivation (KRITI\u010cNO)

```ts
// lib/entitlement.ts (NEW)
import { PRICING_TIERS, type PricingTier } from '@/lib/pricing-tiers';

const TIER_ORDER: Record<PricingTier, number> = {
  free: 0, basic: 1, premium: 2, unlimited: 3,
};

export async function getEffectiveTier(eventId: string): Promise<PricingTier> {
  const payments = await prisma.payment.findMany({
    where: {
      eventId,
      status: { in: ['paid', 'partial'] },
    },
    select: { tier: true, amountCents: true, refundedAmountCents: true },
  });
  // Paid - refunded mora biti > 0 da bro\u010di
  const effective = payments
    .filter(p => p.amountCents - p.refundedAmountCents > 0)
    .reduce<PricingTier>((max, p) =>
      TIER_ORDER[p.tier] > TIER_ORDER[max] ? p.tier : max,
    'free');
  return effective;
}

export async function hasRetentionExtension(eventId: string): Promise<boolean> {
  const tier = await getEffectiveTier(eventId);
  return TIER_ORDER[tier] >= TIER_ORDER.premium;
}

/**
 * Max retention extension admin smije postaviti, po tier-u.
 * Validira se server-side u /api/admin/events/extend-retention:
 *   if (requestedDays > maxRetentionOverrideDays(tier)) return 403.
 */
export function maxRetentionOverrideDays(tier: PricingTier): number {
  const caps: Record<PricingTier, number> = {
    free:      0,    // button disabled u UI-ju
    basic:     0,    // button disabled u UI-ju
    premium:   180,  // +7, +30, +90, +180 (zadržan postojeći opseg)
    unlimited: 365,  // svi preset-i + novi +365
  };
  return caps[tier] ?? 0;
}

// Legacy grandfather exception: postojeći nikola-i-milica event je stvoren
// prije ovog sistema sa retentionOverrideDays=180. Ne primjenjuje se cap.
export function isGrandfathered(event: { legacyGrandfathered: boolean }): boolean {
  return event.legacyGrandfathered === true;
}
```

**ExtendRetentionButton (postojeća komponenta) prilagodba:**
- Server-side fetch daje `maxDays = maxRetentionOverrideDays(effectiveTier)`
- Dodaje `+365` preset uz postojeće `+7/+30/+90/+180`
- Button renderuje SAMO preset-e `<=` maxDays (ili sve ako grandfathered)
- Ako `maxDays === 0` i nije grandfathered → čitav panel disabled + tooltip "Dostupno od Premium tier-a"

**Gdje se poziva:**
- `app/api/cron/cleanup/route.ts` — umjesto `event.pricingTier` koristiti `getEffectiveTier(event.id)` za retention logiku
- `app/api/admin/events/extend-retention/route.ts` — guard: `if (!await hasRetentionExtension(...)) return 403`
- `components/admin/ExtendRetentionButton.tsx` (server-fetched) — disabled + tooltip ako false
- Webhook handler — poslije `order_created`/`order_refunded`, update `Event.pricingTier` = derivedEffective (za UI/audit)

**Event.pricingTier kao cache — pravila strogosti (H1 resolved):**
- `Event.pricingTier` je **read cache** za UI/display
- **Jedini writer** je webhook handler, i to **u istoj transakciji** sa Payment update-om (serializable isolation)
- `getEffectiveTier(eventId)` = izvor za SECURITY/entitlement u run-time check-ovima (retention cron, extend-retention endpoint)
- **Audit invariant** u `scripts/audit-drift.ts`: za svaki Event, `event.pricingTier === derivedEffectiveTier(event.id)` — drift = HIGH finding, blocks CI
- **Gift scenario**: ako admin manuelno ubaci Payment row (kao poklon), isti audit pokupi drift i dev update-uje `Event.pricingTier` u istom SQL blok-u. Audit enforce-uje, ne discipline.

---

## Sekcija 5 — Error handling & retry

### 5.1 Webhook handler errors

Svaki `case` u webhook dispatch-u ima try/catch:
```ts
try {
  await handleOrderCreated(event);
} catch (err) {
  await prisma.webhookLog.update({
    where: { lsEventId: event.meta.event_id },
    data: { error: String(err?.message || err), processedAt: new Date() },
  });
  // i dalje vra\u0107amo 200 da LS ne retry-uje beskona\u010dno
  // (na\u0161 reprocess script \u0107e uhvatiti)
  return new Response('Logged for reprocess', { status: 200 });
}
```

### 5.2 Reprocess skripta

`scripts/reprocess-webhook.ts`:
```
1. SELECT FROM WebhookLog WHERE error IS NOT NULL
2. For each: re-dispatch u isti handler
3. On success: UPDATE error=NULL, processedAt=NOW()
4. On fail again: append error history, keep flagged
```
Pokre\u0107e se manualno poslije bug fix-a ili kroz deploy job ako po\u017eeli\u0161.

### 5.3 Frontend checkout errors

```tsx
// UpgradeModal
try {
  const res = await fetch('/api/payments/checkout', {...});
  if (!res.ok) {
    const data = await res.json();
    // status-specifi\u010dno handling:
    if (res.status === 429) toast.error('Previ\u0161e poku\u0161aja, sa\u010dekaj minut');
    else if (res.status === 409) toast.error('Ve\u0107 ima\u0161 taj plan');
    else toast.error(data.error || 'Gre\u0161ka \u2014 probaj ponovo');
    return;
  }
  window.location.href = data.url;
} catch {
  toast.error('Mre\u017ena gre\u0161ka \u2014 provjeri konekciju');
}
```

### 5.4 LS API errors pri kreiranju checkout-a

```ts
// lib/lemon-squeezy.ts
export async function createCheckoutUrl(params) {
  const { data, error, statusCode } = await createCheckout(storeId, variantId, options);
  if (error) {
    // 401/403 = na\u0161 API key loš, fail fast (ne retry)
    // 5xx = LS problem, log + vrati user-friendly error
    // 422 = validation (npr. nevaljan variantId) → log + alert
    throw new LemonSqueezyError(error, statusCode);
  }
  return data.data.attributes.url;
}
```
Ne retry-amo automatski sa na\u0161e strane (LS API ima vlastite guarantees).

### 5.5 Stuck checkout cleanup (u postoje\u0107em cron-u)

U `app/api/cron/cleanup/route.ts` dodaje se pass:
```ts
// Stuck pending payments (LS checkout expiry default je 60min, grace 2h)
const stuckCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);
result.stuckPaymentsMarked = (await prisma.payment.updateMany({
  where: { status: 'pending', createdAt: { lt: stuckCutoff } },
  data: { status: 'failed' },
})).count;
```

---

## Sekcija 6 — Testing strategy

### 6.1 Unit testovi

**`__tests__/lib/entitlement.test.ts` (NEW):**
- No payments → 'free'
- Single paid basic payment → 'basic'
- Paid basic + paid premium → 'premium' (max)
- Paid premium + full refund → 'free'
- Paid premium + partial refund (>0 remaining) → 'premium'
- Paid premium + paid unlimited + full refund na unlimited → 'premium'
- `hasRetentionExtension` za svaki tier
- `maxRetentionOverrideDays`: free=0, basic=0, premium=180, unlimited=365
- `isGrandfathered`: true za event sa `legacyGrandfathered=true` → bypass cap

**`__tests__/api/payments/webhook.test.ts` (NEW):**
- Valid signature + `order_created` → Payment paid, Event updated
- Invalid signature → 401 + WebhookLog with signatureValid=false + payload scrubbed
- Malformed body (not JSON) → 400 + log
- Repeat same lsEventId → 200 ali no duplicate Payment update
- Unknown variant_id → 400 + alert-worthy log + Telegram (if configured)
- test_mode=true u production mode → 400
- Wrong store_id → 400
- `order_refunded` partial → Payment.partial + Event downgrade derivation
- `order_refunded` full → Payment.refunded + Event → 'free'
- **H3**: `order_refunded` prije `order_created` → Payment row created with refunded status; kasniji `order_created` je no-op (UNIQUE konflikt)
- **H4**: concurrent `order_created` za dva upgrade-a istog event-a → Serializable txn prevents lost update; viši tier wins
- **L3**: unknown event type → eventName='unknown:...' + log, no crash
- **M2**: payload scrubbing removes customer_name, billing_address (checked by snapshot test)

**`__tests__/api/payments/checkout.test.ts` (NEW):**
- No session → 401
- CSRF invalid → 403
- Rate limit exceeded → 429
- Downgrade attempt (current=premium, target=basic) → 409
- Same tier attempt (current=basic, target=basic) → 409
- Valid upgrade → 200 + Payment row pending + LS SDK called sa pravim args
- Mock LS SDK: vra\u0107a 500 → 503 user-friendly
- IDOR: body ima tu\u0111i eventId (ignoriše se, koristi session event)

### 6.2 Integration test (manuel + semi-automatizovan)

**Manual checklist (`docs/testing/payment-e2e-checklist.md`):**
```
[ ] LS test mode aktivan, API key iz test store-a u .env.local
[ ] Admin login → dashboard → click tier badge → UpgradeModal otvoren
[ ] Select "premium" → redirect na LS hosted checkout
[ ] Kartica 4242 4242 4242 4242, CVV 123, bilo koji datum
[ ] Checkout uspje\u0161an → redirect nazad sa ?payment=success
[ ] Dashboard prikazuje "Obrada..." pa \u2192 "Premium" badge (poslije <10s)
[ ] DB: Payment row sa status='paid', Event.pricingTier='premium'
[ ] ExtendRetentionButton u pomo\u0107 tab-u je aktivan (ne disabled)
[ ] LS test dashboard → refund order → webhook stigne → badge → Free
```

### 6.3 Negative / security testovi

**`__tests__/api/payments/security.test.ts` (NEW):**
- Client \u0161alje `amount: 1` u POST body → server ignoriše, compute iz DB
- Client \u0161alje `eventId` drugog admina → server ignoriše, koristi session event
- Webhook sa validnom signature ali tampered `custom_data.eventId` koji ne postoji → reject + log
- Webhook bez `X-Signature` header-a → 401
- 11 checkout request-a u sat \u2192 429
- **Webhook signature HMAC test**: generate valid HMAC with test secret, POST, verify 200; flip 1 byte, verify 401 \u2014 real HMAC, bez mock-a

### 6.4 Regression (mora prolaziti i dalje)

- Svi postoje\u0107i 26 testa (invariant + retention + unsubscribe + override)
- `audit-drift` clean (sa **4 nova invarianta** iz Sekcije 3.3, uklju\u010duju\u0107i H1 cache drift check)
- **Existing `nikola-i-milica` event** sa `legacyGrandfathered=true` ne trigger-uje CRITICAL drift
- `pnpm build`, `pnpm lint` — bez novih gre\u0161aka
- Guest upload i login flow i dalje rade (nevezano sa payment-om)
- **ExtendRetentionButton za postoje\u0107e unlimited event-e** (ako ih ima) pokazuje +365 preset

---

## Open questions — svi rije\u0161eni u brainstorm-u

Sva pitanja iz ranijeg draft-a su zatvorena kroz AskUserQuestion:
- ✅ Pla\u0107anje pri kreiranju event-a → free default + upgrade kasnije
- ✅ Refund admin UX → downgrade u UI kroz derivation (badge se vra\u0107a na free ili ni\u017ei tier)
- ✅ Downgrade → nije mogu\u0107 (samo upgrade)
- ✅ Invoice display → LS sam \u0161alje email; MVP bez dashboard invoice historije (mo\u017ee se dodati kasnije kroz LS API)

---

## Critical files (tentative)

| Fajl | Akcija |
|---|---|
| `prisma/schema.prisma` | Add Payment, WebhookLog, PaymentStatus enum, PricingPlan.lsVariantId, Event.payments |
| `prisma/migrations/<ts>_*/migration.sql` | 3 nove migracije (sekvencijalno) |
| `lib/lemon-squeezy.ts` | **NEW** — SDK wrapper, setup, helper funkcije (`createCheckoutUrl`, `verifyWebhookSignature`) |
| `app/api/payments/checkout/route.ts` | **NEW** — GET (CSRF) + POST (kreira LS checkout) |
| `app/api/payments/webhook/route.ts` | **NEW** — POST, HMAC verify, dispatch po event_name |
| `app/api/payments/history/route.ts` | **NEW** — GET admin-ovih payment-a |
| `app/api/cron/payment-digest/route.ts` | **NEW** — dnevni sigurnosni digest |
| `app/api/cron/cleanup/route.ts` | **MODIFY** — dodaj stuck-pending payment cleanup; poštuj retention izuzetke za Payment |
| `components/admin/UpgradePlanModal.tsx` | **NEW** — modal otvoren iz tier badge-a |
| `components/admin/EventTierBadge.tsx` | **MODIFY** — onClick trigger-uje modal |
| `components/admin/ExtendRetentionButton.tsx` | **MODIFY** — disabled + tooltip ako tier < premium |
| `app/admin/event/page.tsx` | **MODIFY** — submit ide na checkout umjesto direkt event create |
| `components/landingPage/Pricing.tsx` | **MODIFY** — "Choose plan" dugme vodi kroz login → checkout |
| `lib/entitlement.ts` | **NEW** — `getEffectiveTier`, `hasRetentionExtension`, `maxRetentionOverrideDays`, `isGrandfathered` |
| `lib/pricing-tiers.ts` | Bez izmjena (cap logic živi u `entitlement.ts`) |
| `lib/telegram.ts` | **NEW** — opcioni realtime alert sender (H6) |
| `lib/webhook-scrub.ts` | **NEW** — `scrubPayload()` za PII minimization (M2) |
| `scripts/audit-drift.ts` | **MODIFY** — 3 nova invarianta (vidi 3.3) |
| `prisma/seed.ts` | **MODIFY** — sync `lsVariantId` iz env vars |
| `__tests__/api/payments/checkout.test.ts` | **NEW** — unit testovi |
| `__tests__/api/payments/webhook.test.ts` | **NEW** — unit testovi |
| `__tests__/lib/entitlement.test.ts` | **NEW** — derivation logic |
| `docs/security/payment-incidents.md` | **NEW** — runbook |
| `.env.local`, Vercel envs | Add: `LS_API_KEY`, `LS_WEBHOOK_SECRET`, `LS_STORE_ID`, `LS_VARIANT_ID_*`, opciono `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` |

---

## Verifikacija (planirano — puni detalji u Sekciji 6)

Svaka faza implementacije mora prolaziti:
- `pnpm lint` bez novih grešaka
- `pnpm build` prolazi
- `pnpm test:unit` svi postojeći testovi i dalje prolaze + novi testovi za payment
- `npx tsx scripts/audit-drift.ts` — No drift (uključujući nova 3 provjerača)
- `npx prisma migrate status` — Database schema is up to date
- **Ručni E2E test kroz LS test mode** — 4242 4242 4242 4242 kartica, verifikuj Payment row + Event.pricingTier update

---

## Next steps

1. User review ovog spec fajla
2. Invoke `superpowers:writing-plans` skill da napravi task-by-task implementation plan
3. Implementacija po fazama (task-by-task execution)
