# Paywall via LemonSqueezy — Design Spec

**Status:** Draft — awaiting user review
**Date:** 2026-05-16
**Author:** Pair-programming with Claude
**Scope:** v1 paywall integration covering event creation, tier upgrade, and retention extension

## 1. Goal

Block access to paid features behind a LemonSqueezy (LS) one-time payment, replacing the current "anyone can create any tier event for free" behavior. Three paywall surfaces:

1. **Initial purchase** when admin creates an event with `basic` or `premium` tier
2. **Tier upgrade** from the admin dashboard (free→basic, free→premium, basic→premium)
3. **Retention extension** beyond the default 30-day retention window

`free` tier events continue to work without any payment.

## 2. Non-goals (explicit v1 cuts)

- Subscriptions (one-time payments only)
- Downgrades (premium→basic, basic→free)
- Coupon / discount codes
- Multi-currency (EUR only)
- Automated refund button — refunds handled manually via support email within 7 days
- Free-tier retention extension (must upgrade first to be eligible)
- Embedded checkout (use LS hosted checkout page)

## 3. Pricing model

| SKU | Price | Purpose |
|---|---|---|
| Wedding Event — Basic | €25 | Free → Basic OR new event at Basic |
| Wedding Event — Premium | €75 | Free → Premium OR new event at Premium |
| Premium Upgrade from Basic | €50 | Basic → Premium (pay difference) |
| Retention Extension — 30 days | €15 | Adds 30 days to `retentionOverrideDays`, repeatable until 365-day hard cap |

Default retention: 30 days for all tiers (unchanged from existing behavior).

## 4. State machine

### Event lifecycle

| `pricingTier` | `activatedAt` | Admin experience |
|---|---|---|
| `free` | NOT NULL (set immediately) | Full dashboard, with upgrade banner visible |
| `basic` / `premium` | NULL | Locked — redirected to `/admin/event/pending` |
| `basic` / `premium` | NOT NULL | Full dashboard, retention extension button visible |

### Pending event TTL

A pending event (paid tier, `activatedAt = NULL`) expires after **24 hours** via `pendingPaymentExpiresAt` field. The cleanup cron deletes expired pending events and their pending Payment row. The slug is freed for reuse.

### Refund handling

When LS sends a refund webhook:

- **Initial purchase refunded:** `Payment.status = refunded`, `event.activatedAt = null` → dashboard becomes read-only. Admin can re-pay or cancel.
- **Upgrade refunded:** Revert `event.pricingTier` and `event.imageLimit` to the previous tier (stored in `Payment.metadata.previousTier` / `previousImageLimit`), `Payment.status = refunded`. **Existing uploaded photos stay** — we do not delete content as a refund consequence. The lower tier limit applies only to subsequent uploads.
- **Retention extension refunded:** Subtract `Payment.retentionDaysGranted` from `event.retentionOverrideDays` (clamp at 0).

### Upgrade — content handling

When an admin upgrades (e.g. free→premium mid-event):
- `event.pricingTier` and `event.imageLimit` update immediately on webhook receipt
- **Existing photos are not re-processed** (a photo uploaded as free-tier compressed stays compressed; only new uploads use the higher-tier quality settings)
- Guests' lifetime upload count is preserved; their new per-guest limit reflects the new tier and may allow more uploads

## 5. Architecture

### High-level data flow

```
Admin form submit
  └─> POST /api/admin/events { tier, ... }
        ├─> tier=free → DB insert with activatedAt=now() → 200 { eventId }
        └─> tier=paid → DB insert (activatedAt=null) + Payment(pending) + LS checkout URL
                         → 200 { eventId, checkoutUrl }
                              └─> client redirects to checkoutUrl
                                    └─> user pays on LS
                                          ├─> LS webhook POST /api/webhooks/lemonsqueezy
                                          │     ├─> verify HMAC signature
                                          │     ├─> log to WebhookLog (always, even on failure)
                                          │     ├─> idempotency check on Payment.lsEventId
                                          │     └─> dispatch by Payment.purpose:
                                          │           ├─> initial_purchase → event.activatedAt = now()
                                          │           ├─> upgrade → event.pricingTier = newTier, event.imageLimit = newLimit
                                          │           └─> retention_extension → event.retentionOverrideDays += 30
                                          └─> LS redirects user back to:
                                                /admin/dashboard/[eventId]?paid=1
```

### Webhook signature verification

LS signs each webhook with HMAC-SHA256 using `LEMONSQUEEZY_WEBHOOK_SECRET`. The signature arrives in the `X-Signature` header. We compute HMAC on the raw body and `timingSafeEqual`-compare. **Fail-closed** — if the signature is invalid, we log to `WebhookLog` with `signatureValid=false` and return 401.

### Idempotency

LS may retry webhook delivery. Strategy:
- `Payment.lsEventId` becomes `@unique` — guarantees we never apply the same payment twice
- `WebhookLog` stays append-only (no unique constraint) — every delivery attempt is logged for audit, including duplicates
- Handler uses `prisma.payment.upsert({ where: { lsEventId } })` so duplicate webhook → no-op → return 200 → LS stops retrying

### Authorization

The checkout URL contains `custom_data: { eventId, adminId, purpose }`. We verify both:

1. The `adminId` in custom data matches the admin's session at the time the URL was generated (recorded in `Payment.metadata.requestingAdminId`)
2. The `eventId` is owned by that admin

This prevents a malicious admin from triggering a checkout that activates another admin's event.

## 6. Schema changes

### `Event` — 2 new columns

```prisma
activatedAt              DateTime?
pendingPaymentExpiresAt  DateTime?
```

### `Payment` — 2 new columns + 1 unique constraint

```prisma
purpose                  PaymentPurpose
retentionDaysGranted     Int?
metadata                 Json?           // stores previousTier for upgrades, requestingAdminId, etc.
// add: @@unique([eventId, purpose, status]) is NOT added — multiple retention extensions allowed
// existing: @unique on lsCheckoutId stays; lsEventId becomes @unique too
```

### New enum

```prisma
enum PaymentPurpose {
  initial_purchase
  upgrade
  retention_extension
}
```

### Migration notes

- Adding nullable columns to existing tables → no data backfill required
- Existing events: all `legacyGrandfathered` and pre-paywall events get `activatedAt = createdAt` via the migration so their dashboards stay accessible
- No retroactive Payment rows created for existing events

## 7. New / modified files

### New files

| Path | Purpose |
|---|---|
| `lib/lemonsqueezy/client.ts` | LS API wrapper: create checkout URL, fetch order details |
| `lib/lemonsqueezy/signature.ts` | HMAC-SHA256 webhook verification |
| `lib/lemonsqueezy/handlers.ts` | Per-`purpose` webhook processors (initial / upgrade / retention) |
| `lib/lemonsqueezy/variants.ts` | Maps `(tier, purpose)` → LS variant ID from env |
| `app/api/admin/events/upgrade/route.ts` | POST: creates Payment(pending,purpose=upgrade), returns checkout URL |
| `app/api/webhooks/lemonsqueezy/route.ts` | Public webhook receiver |
| `app/admin/event/pending/page.tsx` | Pending payment screen with "Pay now" and "Cancel" |
| `__tests__/api/lemonsqueezy-webhook.test.ts` | Signature, idempotency, purpose dispatch tests |
| `__tests__/lib/lemonsqueezy-signature.test.ts` | HMAC verification unit tests |

### Edited files

| Path | Change |
|---|---|
| `prisma/schema.prisma` | New fields + enum + migration |
| `app/api/admin/events/route.tsx` | Free unchanged; paid creates pending Event + Payment, returns checkoutUrl |
| `app/api/admin/events/extend-retention/route.ts` | Stops directly mutating retention. Creates Payment(pending,purpose=retention_extension) and returns checkout URL |
| `app/admin/event/page.tsx` | Handle 2-shape response (paid → redirect to LS, free → redirect to dashboard) |
| `components/admin/AdminDashboardTabs.tsx` (or equivalent) | Upgrade banner for free, retention extension button for paid |
| `lib/admin-auth.ts` | `getAuthenticatedAdmin()` returns event with `activatedAt`; consumers handle pending state |
| `middleware.ts` | If admin session present and event exists with `activatedAt=null`, allow only `/admin/event/pending` and `/api/...` paths |
| `app/api/cron/cleanup/route.ts` | Delete expired pending events (pendingPaymentExpiresAt < now AND activatedAt IS NULL) |
| `.env.example` | Document new env vars |
| `lib/pricing-tiers.ts` (only if needed) | Add LS variant ID resolver helper |

## 8. Environment variables

| Var | Purpose |
|---|---|
| `LEMONSQUEEZY_API_KEY` | Bearer for LS API calls |
| `LEMONSQUEEZY_STORE_ID` | LS store identifier |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | HMAC verification secret |
| `LEMONSQUEEZY_TEST_MODE` | `1` = use test variant IDs; `0` or unset = live |
| `LS_VARIANT_BASIC` | Variant ID for Basic tier (€25) |
| `LS_VARIANT_PREMIUM` | Variant ID for Premium tier (€75) |
| `LS_VARIANT_UPGRADE_BASIC_TO_PREMIUM` | Variant ID for Basic→Premium upgrade (€50) |
| `LS_VARIANT_RETENTION_30` | Variant ID for 30-day retention extension (€15) |

Test and live variants are configured as separate LS variants and switched via `LEMONSQUEEZY_TEST_MODE`. The variant IDs above point to whichever set is active.

## 9. UI changes

### Event creation page (`/admin/event`)

- Form submits as today, but on response: if `checkoutUrl` present, `window.location.href = checkoutUrl`; else navigate to dashboard.

### Pending event page (`/admin/event/pending`)

- Shows: "Plaćanje na čekanju" + event summary + 2 buttons:
  - **Plati sad** — regenerates LS checkout URL (in case old one expired) and redirects
  - **Otkaži događaj** — soft delete (Payment.status=failed, event deletion); slug freed
- Refund policy footer: "Refund je moguć u roku od 7 dana — kontaktirajte support@dodajuspomenu.com"

### Dashboard (free tier)

- Persistent banner above tabs: "Otključajte sve funkcije — €25 / €75" with CTA → `/admin/upgrade`

### Dashboard (paid tier)

- "Storage" section in settings shows current retention end date and "Produži za 30 dana (+€15)" button

### Upgrade page (`/admin/upgrade`)

- Two cards (Basic / Premium) if current tier is `free`
- One card (Premium upgrade — €50) if current tier is `basic`
- CTA → POST `/api/admin/events/upgrade` → redirect to LS

## 10. Testing strategy

### Unit tests
- HMAC signature verification: valid, invalid, missing, wrong secret
- Variant ID resolver: returns correct ID per (tier, purpose, testMode) combo
- Payment purpose dispatch: each purpose triggers correct DB mutation

### Integration tests (DB)
- Initial purchase webhook → event.activatedAt set
- Upgrade webhook → tier/imageLimit updated, previous tier saved to Payment.metadata
- Retention extension webhook → retentionOverrideDays += 30
- Refund of each purpose type reverses correctly
- Duplicate webhook (same lsEventId) is no-op

### Manual smoke (test mode)
- Full happy path for each of 3 paywall surfaces using LS test mode + test card
- Cancel-from-LS path returns to pending screen
- 24h pending expiry triggers cleanup

## 11. Security checklist

- [x] Webhook signature verified before any DB write
- [x] All webhook attempts (valid + invalid) logged to `WebhookLog`
- [x] Idempotency via `Payment.lsEventId` unique constraint
- [x] Admin authorization rechecked at webhook time (admin still owns event)
- [x] Payment.amountCents recorded so we can detect tampered checkout URLs (LS already prevents this, but log for audit)
- [x] No payment data (card, etc.) ever touches our servers — LS hosts checkout
- [x] CSRF on all new state-changing routes (`/api/admin/events/upgrade`, modified `/extend-retention`)
- [x] Rate limit on webhook endpoint (5/sec per IP to prevent log flooding)

## 12. Operational concerns

### Cleanup cron additions

Add to `/api/cron/cleanup`:
- Delete events where `activatedAt IS NULL AND pendingPaymentExpiresAt < now()` and their pending Payment rows
- Mark abandoned WebhookLog rows older than 30 days for purge (compliance)

### Monitoring

- Vercel logs already capture webhook errors
- Suggest adding a daily sanity check: are there pending Payments older than 7 days? They should be cleaned by the 24h cron — staleness indicates a bug

## 13. Out of scope for v1, captured for later

- Subscription billing (recurring monthly events for venues hosting many weddings)
- Discount codes / referral credits
- Premium → Basic / paid → free downgrade
- Admin-side refund button (currently manual via LS dashboard)
- Multi-currency
- Invoice download from admin dashboard (LS provides this via email by default)

## 14. Rollout plan

1. Merge schema migration to main (zero-impact, only adds nullable columns + backfills `activatedAt` for existing events)
2. Configure LS store and test variants; populate `LEMONSQUEEZY_TEST_MODE=1` env on Vercel
3. Ship paywall code with `LEMONSQUEEZY_TEST_MODE=1` — only test cards work, real users in test phase see normal flow but can't actually pay
4. End-to-end smoke test in production with test cards
5. Switch `LEMONSQUEEZY_TEST_MODE=0` and configure live variant IDs
6. Announce to existing free admins via in-app banner that paid tiers are now live
