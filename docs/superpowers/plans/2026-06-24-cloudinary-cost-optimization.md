# Cloudinary Cost Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Cloudinary credit consumption and protect against the free-plan 25-credit/month hard cap, so the single paying premium event never gets its gallery blocked mid-month.

**Architecture:** Two remaining levers on top of already-shipped delivery optimizations: (1) a credit-usage monitor cron that emails the owner before the free cap is hit; (2) an optional, decision-gated switch to store premium images as optimized derivatives instead of full originals (biggest storage saver, trades print-grade originals). No guest-facing UX change.

**Tech Stack:** Next.js 15 App Router (route handlers / cron), Cloudinary Node SDK (`cloudinary.api.usage`), Nodemailer (existing `lib/email.ts`), Jest.

## Context: business situation

- Cloudinary **Free plan**: 25 credits/month, **hard cap, no overage** — when exceeded, Cloudinary **blocks delivery** (the paying couple's gallery goes dark until next month).
- Exactly **one** paying premium client (€75). Upgrading Cloudinary ($99/mo Plus) is not justified for one client. So the strategy is: stay on Free, keep usage well under 25 credits, and get warned before hitting it.
- Credit conversion: 1 credit ≈ 1 GB storage/month ≈ 1 GB image bandwidth ≈ **2 GB video bandwidth** ≈ 1,000 transformations.

## Already completed (context — not tasks)

- **Gallery thumbnails** (pre-existing): `ImageWithSpinner` uses `CldImage` at 400px + `f_auto` + `q_auto` + `loading="lazy"` — grid never serves originals.
- **Static video posters** (done): video tiles render a poster + play badge; the full video streams only on explicit click, one at a time.
- **30-day retention**, video caps **30s / 100 MB / 3 per guest**, free/basic images stored as `q_auto/f_auto` derivatives, orphan cleanup on failed uploads.
- **#1 / #2 / #4 (commit `50107e8`, on this branch):** video posters delivered as `c_fill,w_400,h_400,q_auto,f_auto` thumbnails; lightbox capped to `c_limit,w_1600,q_auto,f_auto` (originals stay available only via the admin ZIP); premium client-side upload resize lowered 2560 → 1920 px. (Helper: `lib/cloudinaryUrl.ts` `withCloudinaryTransform(url, transform)`.)

## Deferred (not in this plan — with reason)

- **#5 `q_auto` on video playback:** the Free plan's **40 MB max video transformation size** means any clip over 40 MB cannot be transformed — `q_auto` on playback would fail/fall back unpredictably. Revisit only on a paid plan (Plus = 300 MB transform limit). Not worth the fragility now.

## Global Constraints

- No guest-facing behavior change in Task 1. Task 2 is **decision-gated** (do not implement without the owner's explicit "store derivative" decision).
- Cron routes auth with `Authorization: Bearer ${CRON_SECRET}` (match the existing `app/api/cron/cleanup/route.ts` pattern: a constant-time `safeCompareBearer`).
- Use the configured Cloudinary singleton `import cloudinary from '@/lib/cloudinary'` (the only module that runs `cloudinary.config()`), NOT the raw package — otherwise `api.usage()` runs unconfigured and fails.
- Email goes out via the existing Nodemailer transport in `lib/email.ts` (env `ADMIN_EMAIL` / `ADMIN_EMAIL_PASSWORD`). New alert mail follows the same structure as `sendDeletionWarningEmail`.
- Tests run via `pnpm test:unit -- <file>`; API/cron tests use `/** @jest-environment node */` + mocked deps (no real network).
- pnpm.

---

### Task 1: Cloudinary credit-usage monitor + owner alert

A cron that reads Cloudinary usage and emails the owner when monthly credit usage crosses a threshold (default 80%), so the Free cap is never hit by surprise.

**Files:**
- Modify: `lib/email.ts` (add `sendCloudinaryUsageAlertEmail`)
- Create: `app/api/cron/cloudinary-usage/route.ts`
- Test: `__tests__/api/cloudinary-usage-cron.test.ts`

**Interfaces:**
- Consumes: `cloudinary.api.usage()` (returns `{ credits: { usage: number, limit: number, used_percent?: number } }`), `safeCompareBearer`-style auth, `sendCloudinaryUsageAlertEmail`.
- Produces: `GET /api/cron/cloudinary-usage` → JSON `{ usage, limit, percent, alerted: boolean }`; `sendCloudinaryUsageAlertEmail(params: { usedPercent: number; usage: number; limit: number; to: string }): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/api/cloudinary-usage-cron.test.ts
/** @jest-environment node */
process.env.CRON_SECRET = 'test-secret';
process.env.ADMIN_EMAIL = 'owner@example.com';

jest.mock('@/lib/cloudinary', () => ({ __esModule: true, default: { api: { usage: jest.fn() } } }));
jest.mock('@/lib/email', () => ({ sendCloudinaryUsageAlertEmail: jest.fn().mockResolvedValue(undefined) }));

import { GET } from '@/app/api/cron/cloudinary-usage/route';
import cloudinary from '@/lib/cloudinary';
import { sendCloudinaryUsageAlertEmail } from '@/lib/email';

const req = (auth?: string) =>
  new Request('http://x/api/cron/cloudinary-usage', { headers: auth ? { authorization: auth } : {} }) as any;

beforeEach(() => jest.clearAllMocks());

it('rejects without the cron bearer token', async () => {
  const res = await GET(req());
  expect(res.status).toBe(401);
});

it('alerts when usage is at/over the 80% threshold', async () => {
  (cloudinary.api.usage as jest.Mock).mockResolvedValue({ credits: { usage: 21, limit: 25 } }); // 84%
  const res = await GET(req('Bearer test-secret'));
  const body = await res.json();
  expect(res.status).toBe(200);
  expect(body.alerted).toBe(true);
  expect(sendCloudinaryUsageAlertEmail).toHaveBeenCalledWith(
    expect.objectContaining({ to: 'owner@example.com', usage: 21, limit: 25 })
  );
});

it('does not alert when under threshold', async () => {
  (cloudinary.api.usage as jest.Mock).mockResolvedValue({ credits: { usage: 5, limit: 25 } }); // 20%
  const res = await GET(req('Bearer test-secret'));
  const body = await res.json();
  expect(body.alerted).toBe(false);
  expect(sendCloudinaryUsageAlertEmail).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- cloudinary-usage-cron.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/cron/cloudinary-usage/route'`.

- [ ] **Step 3: Add the alert email to `lib/email.ts`**

Read `lib/email.ts` first to reuse its existing Nodemailer transport setup (the same `createTransport` / `ADMIN_EMAIL` pattern that `sendDeletionWarningEmail` uses). Append:

```ts
interface CloudinaryUsageAlertParams {
  usedPercent: number;
  usage: number;
  limit: number;
  to: string;
}

/** Warn the owner that Cloudinary monthly credit usage is approaching the cap. */
export async function sendCloudinaryUsageAlertEmail(params: CloudinaryUsageAlertParams): Promise<void> {
  const { usedPercent, usage, limit, to } = params;
  const transporter = getTransporter(); // reuse the existing transport factory in this file
  await transporter.sendMail({
    from: process.env.ADMIN_EMAIL,
    to,
    subject: `⚠️ Cloudinary: ${usedPercent}% mjesečnih kredita iskorišteno`,
    text:
      `Cloudinary mjesečna potrošnja: ${usage} / ${limit} kredita (${usedPercent}%).\n` +
      `Kad dosegne 100%, isporuka slika/videa se blokira do sljedećeg mjeseca.\n` +
      `Razmotri smanjenje upotrebe ili nadogradnju plana.`,
  });
}
```
(If `lib/email.ts` creates the transport inline in each function rather than via a shared `getTransporter()`, replicate that exact inline setup here instead — match the file.)

- [ ] **Step 4: Implement the cron route**

```ts
// app/api/cron/cloudinary-usage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import cloudinary from '@/lib/cloudinary';
import { sendCloudinaryUsageAlertEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

function safeCompareBearer(header: string, secret: string): boolean {
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  if (!process.env.CRON_SECRET || !safeCompareBearer(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const threshold = Number(process.env.CLOUDINARY_ALERT_THRESHOLD || '80');
  const to = process.env.ALERT_EMAIL || process.env.ADMIN_EMAIL || '';

  let usage = 0, limit = 0;
  try {
    const data = await cloudinary.api.usage();
    usage = data?.credits?.usage ?? 0;
    limit = data?.credits?.limit ?? 0;
  } catch (err) {
    console.error('[cloudinary-usage] api.usage failed', err);
    return NextResponse.json({ error: 'usage_fetch_failed' }, { status: 502 });
  }

  const percent = limit > 0 ? Math.round((usage / limit) * 100) : 0;
  let alerted = false;
  if (percent >= threshold && to) {
    try {
      await sendCloudinaryUsageAlertEmail({ usedPercent: percent, usage, limit, to });
      alerted = true;
    } catch (err) {
      console.error('[cloudinary-usage] alert email failed', err);
    }
  }

  return NextResponse.json({ usage, limit, percent, alerted });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test:unit -- cloudinary-usage-cron.test.ts`
Expected: PASS (3 tests). Then full `pnpm test:unit` → green; `pnpm exec tsc --noEmit` → no new errors in touched files.

- [ ] **Step 6: Schedule the cron (daily)**

If `vercel.json` exists with a `crons` array (the cleanup cron is scheduled there), add an entry:

```json
{ "path": "/api/cron/cloudinary-usage", "schedule": "0 8 * * *" }
```
If the project schedules crons elsewhere (e.g. an external scheduler hitting the URL with the Bearer token), document the new endpoint + that it needs `Authorization: Bearer ${CRON_SECRET}` daily. Verify by reading how `/api/cron/cleanup` is scheduled and mirror it. Add env `CLOUDINARY_ALERT_THRESHOLD` (default 80) and `ALERT_EMAIL` (optional; falls back to `ADMIN_EMAIL`) to the env documentation in `CLAUDE.md`.

- [ ] **Step 7: Commit**

```bash
git add lib/email.ts app/api/cron/cloudinary-usage/route.ts __tests__/api/cloudinary-usage-cron.test.ts vercel.json CLAUDE.md
git commit -m "feat(ops): cloudinary credit-usage monitor cron + owner alert email"
```

---

### Task 2 (DECISION-GATED — do NOT implement without owner approval): premium images as optimized derivative

**Decision required first.** Premium currently stores **full originals** (`storeOriginal: true`) for "album-print grade", which is the single largest storage + originals-delivery cost. Storing an optimized derivative (`q_auto/f_auto`, like free/basic) cuts premium image storage and originals delivery **~3–5×**, but the admin ZIP would then contain compressed derivatives, not print-grade originals. Only proceed if the owner accepts that trade-off for their one client.

**Files:**
- Modify: `lib/pricing-tiers.ts` (`PRICING_TIERS.premium.storeOriginal`, `PRICING_TIERS.unlimited.storeOriginal`)
- Modify: `locales/sr/translation.json`, `locales/en/translation.json` (`guest.uploadForm.premiumQualityNote` copy)
- Modify: `CLAUDE.md` (update the premium-storage description in the upload-pipeline + ZIP sections)
- Test: `__tests__/api/upload-quality-gradient.test.ts` (existing — update the premium expectation)

**Interfaces:**
- Consumes: the existing `uploadToCloudinary` branch in `app/api/guest/upload/route.ts` which applies `{quality:auto}{fetch_format:auto}` when `!config.storeOriginal`.

- [ ] **Step 1: Flip the flag**

In `lib/pricing-tiers.ts`, set `PRICING_TIERS.premium.storeOriginal: false` and `PRICING_TIERS.unlimited.storeOriginal: false`. No other code change is needed — `app/api/guest/upload/route.ts` already applies the `q_auto + f_auto` incoming transformation whenever `storeOriginal` is false, so premium uploads become stored derivatives automatically.

- [ ] **Step 2: Update the existing storage test**

Read `__tests__/api/upload-quality-gradient.test.ts`. It asserts premium uploads WITHOUT a transformation (original). Change the premium expectation to assert the upload options now INCLUDE the `quality: auto` / `fetch_format: auto` transformation (matching free/basic). Run: `pnpm test:unit -- upload-quality-gradient.test.ts` → PASS.

- [ ] **Step 3: Fix the now-inaccurate premium copy**

In both locales, change `guest.uploadForm.premiumQualityNote` from "stored at full quality — great for album printing" wording to accurate copy, e.g. SR "Slike se čuvaju u visokom kvalitetu." / EN "Photos are stored in high quality." (No longer promise raw originals.)

- [ ] **Step 4: Update `CLAUDE.md`**

In the photo-upload-pipeline and admin-ZIP sections, change the description so premium no longer "uploads WITHOUT transformation / stores the original" — premium now stores the `q_auto/f_auto` derivative like free/basic; the admin ZIP returns that derivative. Keep the historical note that pre-change premium events still hold originals.

- [ ] **Step 5: Verify + commit**

Run: `pnpm exec tsc --noEmit` (no new errors); `node -e "require('./locales/sr/translation.json'); require('./locales/en/translation.json'); console.log('json ok')"`; full `pnpm test:unit` → green.

```bash
git add lib/pricing-tiers.ts __tests__/api/upload-quality-gradient.test.ts locales/sr/translation.json locales/en/translation.json CLAUDE.md
git commit -m "perf(cloudinary): store premium images as optimized derivative (decision: drop print-grade originals)"
```

---

## Self-review

**Spec coverage:** monitor + alert (Task 1) covers the "warned before the 25-credit cap" goal; the storage lever (Task 2) covers the biggest remaining storage cost, gated on the owner's print-grade decision. #1/#2/#4 already shipped (commit `50107e8`); #5 explicitly deferred with reason. Gallery-thumbnail, static-poster, retention, and orphan-cleanup optimizations were already in place.

**Placeholder scan:** no TBD/TODO; each code step carries full code; the email step notes "match the file's transport pattern" because the exact transport factory name must be read from `lib/email.ts` (the only legitimate ambiguity, called out explicitly).

**Type consistency:** `sendCloudinaryUsageAlertEmail({ usedPercent, usage, limit, to })` defined in Task 1 Step 3 and consumed by the route in Step 4 and asserted in the test in Step 1 — same field names. `cloudinary.api.usage()` shape (`credits.usage`, `credits.limit`) consistent between the route and the test mock.
