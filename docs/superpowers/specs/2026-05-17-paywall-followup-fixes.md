# Paywall M1 — Follow-Up Fixes

**Source:** Combined security + logic audit run on 2026-05-17 after M1 went live end-to-end.
**Status:** Captured for later — to do AFTER M2 and M3 are complete.
**Reviewers:** security-engineer agent + root-cause-analyst agent (two parallel passes).

---

## Group A — CRITICAL: fix before next user-facing change

These are real bugs that the next admin testing will hit.

### A1 — Trailing slash on `NEXTAUTH_URL`

- **File:** `app/api/admin/events/route.tsx:132`
- **Bug:** `successRedirectUrl: ${process.env.NEXTAUTH_URL || 'https://www.dodajuspomenu.com/'}admin/dashboard/${event.id}?paid=1` — string concatenation with no normalization. If Vercel env var ever stored without trailing slash, URL collapses to `https://www.dodajuspomenu.comadmin/dashboard/...`.
- **Fix:** Apply the same `.replace(/\/?$/, '/')` normalization already used in `pending-checkout/route.ts:42`:
```ts
const baseUrl = (process.env.NEXTAUTH_URL || 'https://www.dodajuspomenu.com/').replace(/\/?$/, '/');
successRedirectUrl: `${baseUrl}admin/dashboard/${event.id}?paid=1`
```
- **Same fix needed in:** Task 6.1 upgrade route + Task 7.1 retention route when they ship.

### A2 — Webhook handler throws on missing event → LS retry loop

- **File:** `lib/lemonsqueezy/handlers.ts:47` (and similar in `handleUpgrade:97`, `handleRetentionExtension:152`)
- **Bug:** If admin clicks "Otkaži događaj" while LS webhook is in flight, cancel-pending wins the race → event row deleted. Webhook handler then throws `Event ${id} not found` → route returns 500 → LS retries every few minutes indefinitely.
- **Fix:** Treat missing event as graceful no-op:
```ts
if (!event) {
  console.warn(`Event ${w.custom.eventId} not found — likely cancelled. Skipping.`);
  return;
}
```
- Apply this pattern in all 3 handlers that look up event by `w.custom.eventId`.

### A3 — Orphaned pending Payment after successful purchase

- **File:** `app/api/admin/events/route.tsx:135-151` (creation) + `lib/lemonsqueezy/handlers.ts` (handleInitialPurchase)
- **Bug:** Event creation inserts `Payment(status='pending', lsCheckoutId='pending_${eventId}', lsEventId=null)`. Webhook later inserts a NEW Payment via upsert keyed on `lsEventId`. Original pending row sits forever.
- **Impact:** Confuses any future query that counts payments. The comment in `cancel-pending/route.ts:32` ("any payment is pending or failed — never paid") becomes false after first paid event.
- **Fix option 1 (cleanup in webhook):**
```ts
// In handleInitialPurchase after the $transaction:
await prisma.payment.deleteMany({
  where: { eventId: w.custom.eventId, status: 'pending', lsEventId: null },
});
```
- **Fix option 2 (skip pending Payment creation entirely):** Don't insert the placeholder pending Payment at event creation. The pending Event row alone (`activatedAt=null + pendingPaymentExpiresAt`) is sufficient state. LS checkout URL is regeneratable from `pending-checkout/route.ts`.
- **Recommended:** Option 2 — simpler, no orphan, no extra DELETE on hot path.

### A4 — `purpose` not validated against allowlist at boundary

- **File:** `lib/lemonsqueezy/handlers.ts:53` (`purpose as PaymentPurpose`)
- **Bug:** TS cast accepts any string from LS payload. Dispatch in `webhooks/lemonsqueezy/route.ts:74-80` is `if/else if` with no `else` — unknown purpose silently no-ops, masking LS misconfiguration.
- **Fix:** In `normalizeWebhook`:
```ts
const validPurposes = ['initial_purchase', 'upgrade', 'retention_extension'] as const;
if (!validPurposes.includes(purpose as any)) return null;
```

### A5 — Cleanup cron doesn't process expired pending events

- **File:** `app/api/cron/cleanup/route.ts`
- **Bug:** Cron iterates events filtering by retention from wedding date. Pending events with `activatedAt=null` get expiry computed as `weddingDate + storageDays` — potentially 6+ months out. During that window, the 1:1 admin↔event constraint blocks the admin from creating any new event. Admin must manually click "Otkaži" to recover.
- **Fix:** Add a cleanup pass BEFORE the retention loop:
```ts
// Delete pending events past their 24h TTL
const expiredPending = await prisma.event.findMany({
  where: {
    activatedAt: null,
    pendingPaymentExpiresAt: { lt: now },
  },
  select: { id: true },
});
if (expiredPending.length > 0) {
  const ids = expiredPending.map(e => e.id);
  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { eventId: { in: ids } } }),
    prisma.event.deleteMany({ where: { id: { in: ids } } }),
  ]);
  result.pendingEventsDeleted = expiredPending.length;
}
```
- **Note:** This is essentially Task 8.1 from the original plan (`docs/superpowers/plans/2026-05-16-paywall-implementation.md`). It moved up in priority because of the 1:1 lockout.

---

## Group B — DEFENSE-IN-DEPTH (security hardening, non-blocking)

### B1 — Webhook DB write before signature verification

- **File:** `app/api/webhooks/lemonsqueezy/route.ts:40-49`
- **Bug:** Every request — including unsigned attacker traffic — triggers a `prisma.webhookLog.create` BEFORE the signature check at line 51. The 64KB body cap and 255-char field cap mitigate per-request cost but not request volume.
- **Impact:** Attacker can flood endpoint with unsigned payloads to grow WebhookLog table → DB IOPS exhaustion → billing spike.
- **Fix:** Two-pronged approach:
  1. Add per-IP rate limit using existing `createRateLimiter` (same pattern as `/api/admin/login`): e.g., 60 requests/min/IP. LS legitimate webhook volume is < 1/sec.
  2. Move WebhookLog write to AFTER signature validation; for failed signatures, increment an in-memory counter and only persist a row on first failure per IP per hour (sample for audit, don't store every attempt).

### B2 — `handleRefund` lacks secondary admin ownership check

- **File:** `lib/lemonsqueezy/handlers.ts:209-221`
- **Bug:** `findFirst` matches by `lsOrderId + eventId + status='paid'`. The `eventId` comes from webhook `custom_data` — trusted via HMAC, but no defense in depth.
- **Impact:** If HMAC secret were ever leaked or test mode left on in prod, a crafted refund webhook could deactivate any event.
- **Fix:** After finding the payment, assert the event's admin matches the custom data:
```ts
const event = await prisma.event.findUnique({
  where: { id: payment.eventId },
  select: { adminId: true },
});
if (event?.adminId !== w.custom.adminId) {
  console.error(`Refund admin mismatch: payment.event.adminId=${event?.adminId} vs custom.adminId=${w.custom.adminId}`);
  return;
}
```

### B3 — Misleading "race-safe" comment in `handleRetentionExtension`

- **File:** `lib/lemonsqueezy/handlers.ts:153-163`
- **Bug:** Comment claims early bail is race-safe, but the actual safety net is the `@unique` constraint on `lsEventId` causing P2002 on the second concurrent insert. Without the unique constraint, the soft check would be insufficient.
- **Fix:** Either (a) rewrite the comment to credit the unique constraint, or (b) convert to interactive transaction using `prisma.$transaction(async (tx) => { ... })` with the `findUnique` INSIDE the transaction for true atomicity.
- **Recommended:** (a) — the unique constraint IS the safety net and it works.

### B4 — Idempotency check at route level allows pending-status re-processing

- **File:** `app/api/webhooks/lemonsqueezy/route.ts:58`
- **Bug:** `if (existing && existing.status !== 'pending') return idempotent` — pending status is treated as "still re-processable". Combined with the orphaned pending row pattern (A3), this could cause confusion.
- **Fix:** After A3 (orphan removed), simplify to `if (existing) return idempotent` — any row with this `lsEventId` means we already saw this webhook.

---

## Group C — INFORMATIONAL (probably leave as-is)

### C1 — `pendingPaymentExpiresAt` leaks via `/api/admin/me`

- **File:** `app/api/admin/me/route.ts:16` + `lib/admin-auth.ts:31`
- **Bug:** Returns internal TTL timestamp to client.
- **Impact:** Reveals 24h pending window. No exploit path.
- **Fix:** Strip from `/me` response, or omit from select.

### C2 — `findFirst` vs `findUnique` on `adminId`

- **File:** `app/api/admin/events/route.tsx:80`
- **Bug:** `findFirst({where: {adminId}})` should be `findUnique` (adminId is unique on Event). Stylistic.

### C3 — Currency hardcoded fallback to 'EUR' if payload missing

- **File:** `lib/lemonsqueezy/handlers.ts:54`
- **Bug:** If `attrs.currency` is null, defaults to EUR regardless of actual charge currency.
- **Impact:** LS always sends currency in practice. Latent bug.

---

## Group D — Already-known scope deferrals (from spec)

- `Payment.lsOrderId` and `Payment.lsCheckoutId` are still **partial** unique indexes (`WHERE col IS NOT NULL`). We only fixed `lsEventId`. Currently no `upsert` uses those columns. If future code uses upsert on them, repeat the constraint fix from `prisma/migrations/20260517143500_fix_payment_lseventid_constraint/migration.sql`.
- WebhookLog has no retention policy. After 30+ days of production traffic this table will grow unbounded. Add a cron pass to delete `WebhookLog` rows older than 90 days.

---

## Sequencing

When this work resumes (after M2 + M3 from `docs/superpowers/plans/2026-05-16-paywall-implementation.md`):

1. **Single PR** for Group A items 1-5 (all small, all related to "paywall robustness")
2. **Separate PR** for Group B (security hardening, deserves independent review)
3. Skip Group C unless requested

Total estimated effort:
- Group A: ~150 lines across ~7 files, includes 1 new cron path + tests
- Group B: ~80 lines across 3 files, mostly tests

Both groups: < 4 hours of work each.
