# Payment incident response runbook

Ažurira se nakon stvarnih incidenata. Pre-launch checklist je u
[payment integration spec §2.8](../superpowers/specs/2026-04-19-payment-integration-design.md).

## Incident 1: Webhook signature failure flood (>100/h)

**Simptomi:**
- Payment digest email subject počinje sa ⚠️
- Telegram alert (ako je konfigurisan): "Webhook signature fail flood"
- `WebhookLog` pun redova sa `signatureValid=false`

**Akcije:**
1. Provjeri `WebhookLog.sourceIp` distribuciju — ako klasterisano, dodaj IP u middleware denylist.
2. Rotate `LS_WEBHOOK_SECRET`:
   - LS dashboard → Settings → Webhooks → edit webhook → regenerate secret
   - `npx vercel env rm LS_WEBHOOK_SECRET production/preview/development`
   - Dodaj novi: `printf '%s' "$NEW_SECRET" | npx vercel env add LS_WEBHOOK_SECRET production` (ponovi za preview, development)
   - Trigger deploy
3. Verify: kreiraj test order, provjeri da WebhookLog dobije novi valid red.

## Incident 2: "Platio sam, nije dobio premium"

**Akcije:**
1. Nađi admin-ov email, pretraži WebhookLog:
   ```sql
   SELECT * FROM "WebhookLog"
   WHERE payload->'data'->'attributes'->>'customer_email' = 'admin@email'
   ORDER BY "createdAt" DESC LIMIT 5;
   ```
2. Slučajevi:
   - **Nema log-a + valid order u LS dashboard-u** → webhook nikad nije isporučen. Koristi `scripts/reprocess-webhook.ts` (dodati kasnije) ili ručno insert Payment row.
   - **Log sa `error IS NOT NULL`** → popravi bug, ponovi handler.
   - **Log sa `signatureValid=false`** → problem sa rotation-om? Provjeri da LS dashboard webhook secret odgovara env-u.
3. Ako ništa ne pomogne: refund kroz LS dashboard ili ručni insert u DB.

## Incident 3: Unknown variant_id

**Simptomi:**
- Telegram alert "Unknown variant_id"
- `WebhookLog.error` sadrži "unknown variant_id"

**Akcije:**
1. Provjeri `PricingPlan.lsVariantId` sinhronizaciju:
   ```sql
   SELECT tier, "lsVariantId" FROM "PricingPlan";
   ```
2. Verify sva 3 env vars (`LS_VARIANT_ID_BASIC/PREMIUM/UNLIMITED`) match LS dashboard.
3. Pokreni seed da re-sync: `npx tsx prisma/seed.ts`.
4. Ako je legitimno novi produkt, dodaj u schema i env.

## Incident 4: Stuck pending Payment cleanup failed

**Simptomi:**
- Payment digest pokazuje rastući `stuckPending`
- Cron cleanup error logs

**Akcije:**
1. Provjeri Vercel cron logs za cleanup endpoint greške.
2. Manual cleanup:
   ```sql
   UPDATE "Payment" SET status = 'failed'
   WHERE status = 'pending' AND "createdAt" < NOW() - INTERVAL '2 hours';
   ```

## Incident 5: Event.pricingTier drift (audit-drift alert)

**Simptomi:**
- `npx tsx scripts/audit-drift.ts` vraća HIGH finding: "Event.pricingTier cache drift"

**Akcije:**
1. Identifikuj event (iz audit output-a)
2. Ručno ispravi u istoj transakciji:
   ```sql
   BEGIN;
   -- verify derived tier
   SELECT tier, SUM("amountCents" - "refundedAmountCents") AS net
     FROM "Payment"
     WHERE "eventId" = '<id>' AND status IN ('paid','partial')
     GROUP BY tier;
   -- update Event.pricingTier to derived
   UPDATE "Event" SET "pricingTier" = '<derived>' WHERE id = '<id>';
   COMMIT;
   ```
3. Re-run audit-drift, expect clean.

## Key Rotation Procedures

### LS_API_KEY (kvartalno ili na incident)
1. LS dashboard → Settings → API → regenerate
2. Vercel env replace (sve 3 envs)
3. Redeploy
4. Verify test checkout
5. LS dashboard → revoke old key

### LS_WEBHOOK_SECRET (godišnje ili na incident)
Vidi Incident 1 akcije.

### CRON_SECRET (godišnje)
1. Generiši novi: `openssl rand -hex 32`
2. Vercel env replace (sve 3 envs)
3. `.env.local` update
4. Redeploy

## Pre-launch security checklist

Vidi [payment integration spec §2.8](../superpowers/specs/2026-04-19-payment-integration-design.md).
