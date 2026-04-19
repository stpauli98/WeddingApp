# Payment E2E checklist (manual)

**Prerequisites:** LS test mode products created, env vars set, dev server running.

## Required env vars

```bash
LS_API_KEY="..."                    # from LS Settings → API (test key)
LS_STORE_ID="..."                   # from LS dashboard URL
LS_WEBHOOK_SECRET="..."             # from LS webhook config
LS_VARIANT_ID_BASIC="..."
LS_VARIANT_ID_PREMIUM="..."
LS_VARIANT_ID_UNLIMITED="..."
# optional:
TELEGRAM_BOT_TOKEN="..."
TELEGRAM_CHAT_ID="..."
```

Then re-seed to sync variant IDs: `npx tsx prisma/seed.ts`.

## Happy path

- [ ] Login as admin. Dashboard loads with current tier badge (Free).
- [ ] Click on tier badge → UpgradePlanModal opens.
- [ ] Select "Premium — 39.99 EUR". Redirect to LS hosted checkout.
- [ ] Use test card `4242 4242 4242 4242`, any CVV, future date.
- [ ] Complete purchase → LS redirects back to `/sr/admin/dashboard/[eventId]?payment=success&ck=...`.
- [ ] Page shows "Obrada plaćanja u toku…" initially, auto-refreshes every 3s.
- [ ] After <10s, dashboard renders with "Premium" badge.
- [ ] DB check: Payment row with status='paid', Event.pricingTier='premium'.
- [ ] ExtendRetentionButton in Help tab is enabled, shows +7/+30/+90/+180.
- [ ] Click +30 days → toast "Produženo".

## Refund path

- [ ] LS dashboard → find the order → Refund fully.
- [ ] Webhook fires (check Vercel logs).
- [ ] DB: Payment.status='refunded', Event.pricingTier='free'.
- [ ] Dashboard badge shows "Free".
- [ ] ExtendRetentionButton panel shows "Dostupno od Premium tier-a".

## Negative paths

- [ ] DevTools: POST `/api/payments/checkout` with `{targetTier:'premium',amountCents:1}`.
      Server creates Payment with amountCents=3999 (ignores client amount).
- [ ] Webhook with invalid signature → 401 + WebhookLog signatureValid=false.
- [ ] Attempt downgrade (premium → basic) in modal → 409.
- [ ] 11th checkout call in 1h → 429.

## Audit

- [ ] `npx tsx scripts/audit-drift.ts` → "✓ No drift"
- [ ] After refund, `audit-drift` detects no cache drift (webhook updated Event.pricingTier).

## Cron smoke tests

```bash
SECRET=$(grep "^CRON_SECRET=" .env.local | cut -d= -f2- | tr -d '"')

# Cleanup cron (includes stuck payment sweep)
curl -s -H "Authorization: Bearer $SECRET" http://localhost:3000/api/cron/cleanup | jq
# Expected: {"ok":true, ..., "stuckPaymentsMarked": <n>}

# Payment digest cron
curl -s -H "Authorization: Bearer $SECRET" http://localhost:3000/api/cron/payment-digest | jq
# Expected: {"ok":true, "webhookTotal":<n>, ...}
# You should receive a digest email at ADMIN_EMAIL.
```
