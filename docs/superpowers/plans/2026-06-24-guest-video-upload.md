# Guest Video Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let premium-tier wedding guests upload up to 3 short videos (≤60s each) alongside their photos, stored on Cloudinary and shown in the guest + admin galleries.

**Architecture:** Videos bypass our serverless function entirely. The browser requests a short-lived Cloudinary upload **signature** from our API (which gates on premium tier + remaining slots), uploads the file **directly to Cloudinary** (`resource_type: 'video'`), then calls a **confirm** endpoint that re-validates duration/size/count against Cloudinary's authoritative metadata and writes the DB row. This avoids Vercel's ~4.5 MB request-body limit and never loads a video into function memory. Videos use a **separate `Video` model** so existing image limit/ZIP/gallery logic is untouched.

**Tech Stack:** Next.js 15 App Router, Prisma 6 (PostgreSQL), Cloudinary Node SDK (`cloudinary.utils.api_sign_request`, `cloudinary.api.resource`), React 18, i18next, Jest (unit) + Docker-based integration.

## Global Constraints

- Video is **premium-only**. Gate = `PRICING_TIERS[tier].videoLimit > 0` (premium=3, unlimited=3, free=0, basic=0). Legacy `unlimited` events are treated as premium.
- **Max 3 active videos per guest**; **lifetime cap = 6** (mirrors image anti-abuse `lifetime ≤ limit × 2`).
- **Max duration 60s**, **max size 100 MB** — both enforced server-side against Cloudinary metadata (authoritative), client-side pre-check is UX only.
- All Cloudinary calls for video MUST pass `{ resource_type: 'video' }` — the SDK defaults to `'image'` and would silently no-op on delete.
- All state-changing routes follow the existing CSRF pattern: GET to mint a per-action token in an httpOnly cookie, then POST/DELETE echoing it in `x-csrf-token`.
- Cloudinary credentials are server-only secrets except `api_key` (safe to return to the browser for signed uploads). Folder for videos: `wedding-app/videos`.
- Package manager is **pnpm**. Backend/DB tests run **in Docker built with `.env`** (project rule), not `.env.local`.
- i18n: every user-facing string added to both `locales/sr/translation.json` and `locales/en/translation.json`. Serbian `sr` is default.

---

### Task 1: Shared video config + pure helpers (`lib/video-config.ts`)

Pure, dependency-free module so the validation + poster logic is unit-testable without DB or Cloudinary.

**Files:**
- Create: `lib/video-config.ts`
- Test: `__tests__/lib/video-config.test.ts`

**Interfaces:**
- Produces:
  - `MAX_VIDEO_DURATION_SEC = 60`
  - `MAX_VIDEO_BYTES = 100 * 1024 * 1024`
  - `VIDEO_FOLDER = 'wedding-app/videos'`
  - `getVideoLimit(tier: PricingTier): number`
  - `validateVideoMeta(meta: { durationSec: number; bytes: number }): { ok: true } | { ok: false; reason: 'duration' | 'size' }`
  - `derivePosterUrl(secureUrl: string): string`
  - `isOwnedVideoPublicId(publicId: string): boolean` — true only if it starts with `wedding-app/videos/`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/video-config.test.ts
import {
  MAX_VIDEO_DURATION_SEC,
  MAX_VIDEO_BYTES,
  getVideoLimit,
  validateVideoMeta,
  derivePosterUrl,
  isOwnedVideoPublicId,
} from '@/lib/video-config';

describe('video-config', () => {
  it('exposes the agreed caps', () => {
    expect(MAX_VIDEO_DURATION_SEC).toBe(60);
    expect(MAX_VIDEO_BYTES).toBe(100 * 1024 * 1024);
  });

  it('only premium/unlimited tiers may upload video', () => {
    expect(getVideoLimit('premium')).toBe(3);
    expect(getVideoLimit('unlimited')).toBe(3);
    expect(getVideoLimit('free')).toBe(0);
    expect(getVideoLimit('basic')).toBe(0);
  });

  it('accepts a 30s/10MB video', () => {
    expect(validateVideoMeta({ durationSec: 30, bytes: 10 * 1024 * 1024 })).toEqual({ ok: true });
  });

  it('rejects over-length and over-size video', () => {
    expect(validateVideoMeta({ durationSec: 61, bytes: 1000 })).toEqual({ ok: false, reason: 'duration' });
    expect(validateVideoMeta({ durationSec: 10, bytes: MAX_VIDEO_BYTES + 1 })).toEqual({ ok: false, reason: 'size' });
  });

  it('derives a .jpg poster URL from a video secure_url', () => {
    expect(
      derivePosterUrl('https://res.cloudinary.com/demo/video/upload/v1/wedding-app/videos/abc.mp4')
    ).toBe('https://res.cloudinary.com/demo/video/upload/v1/wedding-app/videos/abc.jpg');
    // no extension → append
    expect(derivePosterUrl('https://res.cloudinary.com/demo/video/upload/v1/wedding-app/videos/abc')).toBe(
      'https://res.cloudinary.com/demo/video/upload/v1/wedding-app/videos/abc.jpg'
    );
  });

  it('only trusts public_ids inside our video folder', () => {
    expect(isOwnedVideoPublicId('wedding-app/videos/abc')).toBe(true);
    expect(isOwnedVideoPublicId('wedding-app/abc')).toBe(false);
    expect(isOwnedVideoPublicId('../etc/passwd')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- video-config.test.ts`
Expected: FAIL — `Cannot find module '@/lib/video-config'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/video-config.ts
import { PRICING_TIERS, type PricingTier } from '@/lib/pricing-tiers';

export const MAX_VIDEO_DURATION_SEC = 60;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const VIDEO_FOLDER = 'wedding-app/videos';

/** Per-guest active video slots for a tier. 0 = tier may not upload video. */
export function getVideoLimit(tier: PricingTier): number {
  return PRICING_TIERS[tier]?.videoLimit ?? 0;
}

export function validateVideoMeta(meta: {
  durationSec: number;
  bytes: number;
}): { ok: true } | { ok: false; reason: 'duration' | 'size' } {
  if (meta.durationSec > MAX_VIDEO_DURATION_SEC) return { ok: false, reason: 'duration' };
  if (meta.bytes > MAX_VIDEO_BYTES) return { ok: false, reason: 'size' };
  return { ok: true };
}

/** Cloudinary auto-generates a poster frame at the same path with a .jpg extension. */
export function derivePosterUrl(secureUrl: string): string {
  if (/\.[^/.]+$/.test(secureUrl)) return secureUrl.replace(/\.[^/.]+$/, '.jpg');
  return `${secureUrl}.jpg`;
}

/** Defence-in-depth: confirm only accepts assets we told the browser to create. */
export function isOwnedVideoPublicId(publicId: string): boolean {
  return publicId.startsWith(`${VIDEO_FOLDER}/`) && !publicId.includes('..');
}
```

- [ ] **Step 4: Add `videoLimit` to the tier config so `getVideoLimit` resolves**

In `lib/pricing-tiers.ts`, add `videoLimit: number;` to the `TierConfig` interface (after `clientQuality`), then set it on each tier in `PRICING_TIERS`:
- `free`: `videoLimit: 0,`
- `basic`: `videoLimit: 0,`
- `premium`: `videoLimit: 3,`
- `unlimited`: `videoLimit: 3,`

```ts
// lib/pricing-tiers.ts — interface addition
  /** Max number of active videos per guest. 0 = tier may not upload video. */
  videoLimit: number;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test:unit -- video-config.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/video-config.ts lib/pricing-tiers.ts __tests__/lib/video-config.test.ts
git commit -m "feat(video): tier-aware video config + pure validation helpers"
```

---

### Task 2: Prisma schema — `Video` model, lifetime counter, plan column

**Files:**
- Modify: `prisma/schema.prisma` (add `Video` model; add field to `Guest`; add field to `PricingPlan`)
- Create: migration via `npx prisma migrate dev`

**Interfaces:**
- Produces Prisma model `Video { id, guestId, videoUrl, posterUrl, storagePath, durationSec, bytes, tier, createdAt, guest }`
- Produces `Guest.lifetimeVideoCount Int @default(0)` and `Guest.videos Video[]`
- Produces `PricingPlan.videoLimit Int @default(0)`

- [ ] **Step 1: Add the `Video` model** (place directly after the `Image` model block)

```prisma
/// Video — guest-uploaded short clip on Cloudinary (premium tier only).
/// storagePath = Cloudinary public_id; deletion MUST pass resource_type:'video'.
model Video {
  id          String       @id @default(uuid())
  guestId     String
  videoUrl    String
  posterUrl   String
  storagePath String
  durationSec Int
  bytes       Int
  tier        PricingTier?
  createdAt   DateTime     @default(now())
  guest       Guest        @relation(fields: [guestId], references: [id])

  @@index([guestId, createdAt(sort: Desc)])
  @@index([createdAt])
}
```

- [ ] **Step 2: Extend `Guest`** — add the relation + lifetime counter inside `model Guest`:

```prisma
  /// Monotonic lifetime video upload count (never decremented on delete).
  /// Anti-abuse: lifetimeVideoCount <= videoLimit * 2.
  lifetimeVideoCount Int       @default(0)
  videos             Video[]
```

- [ ] **Step 3: Extend `PricingPlan`** — add after `imageLimit`:

```prisma
  /// Max active videos per guest for this tier (0 = no video).
  videoLimit Int @default(0)
```

- [ ] **Step 4: Generate the migration**

Run: `npx prisma migrate dev --name add_video_support`
Expected: new folder under `prisma/migrations/`, Prisma Client regenerated, no errors. The migration creates the `Video` table and adds two nullable-defaulted columns (existing rows backfill to `0`).

- [ ] **Step 5: Verify the client typechecks**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no references yet, just confirms schema generated cleanly).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(video): Video model + lifetime counter + plan videoLimit column"
```

---

### Task 3: Seed `videoLimit` into the DB + expose via `/api/pricing`

The landing page reads limits from the DB, not the hardcoded fallback. Push `videoLimit` to `PricingPlan` rows and surface it in the pricing API.

**Files:**
- Modify: `prisma/seed.ts` (set `videoLimit` per plan in the upsert)
- Modify: `app/api/pricing/route.ts` (add `videoLimit` to the mapped result)
- Test: `__tests__/api/pricing-video-limit.test.ts`

**Interfaces:**
- Consumes: `PricingPlan.videoLimit` (Task 2)
- Produces: `/api/pricing` items gain `videoLimit: number`

- [ ] **Step 1: Write the failing test** (pure mapping shape, mock prisma)

```ts
// __tests__/api/pricing-video-limit.test.ts
import { GET } from '@/app/api/pricing/route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    pricingPlan: {
      findMany: jest.fn().mockResolvedValue([
        {
          tier: 'premium', nameSr: 'Premium', nameEn: 'Premium',
          imageLimit: 25, videoLimit: 3, clientResizeMaxWidth: 2560,
          clientQuality: 0.95, storeOriginal: true, price: 7500,
          recommended: false, features: [],
        },
      ]),
    },
  },
}));

it('exposes videoLimit per plan', async () => {
  const res = await GET();
  const body = await res.json();
  expect(body[0].videoLimit).toBe(3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- pricing-video-limit.test.ts`
Expected: FAIL — `body[0].videoLimit` is `undefined`.

- [ ] **Step 3: Add `videoLimit` to the API mapping**

In `app/api/pricing/route.ts`, inside the `plans.map(...)` object literal, add after `imageLimit: plan.imageLimit,`:

```ts
    videoLimit: plan.videoLimit,
```

- [ ] **Step 4: Set `videoLimit` in the seed**

In `prisma/seed.ts`, for each plan upsert add `videoLimit` to BOTH the `create` and `update` objects: premium → `3`, all others → `0`. Example for the premium plan:

```ts
    videoLimit: 3,
```

- [ ] **Step 5: Run the seed against the DB**

Run: `npx tsx prisma/seed.ts`
Expected: upserts complete; premium row now has `videoLimit = 3`.

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test:unit -- pricing-video-limit.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma/seed.ts app/api/pricing/route.ts __tests__/api/pricing-video-limit.test.ts
git commit -m "feat(video): seed + expose videoLimit through /api/pricing"
```

---

### Task 4: Signature endpoint — `GET` (CSRF) + `POST` (sign) at `/api/guest/upload/video-sign`

Gates on premium tier and remaining slots, then returns a Cloudinary upload signature. No file passes through this route.

**Files:**
- Create: `app/api/guest/upload/video-sign/route.ts`
- Test: `__tests__/api/video-sign.test.ts` (integration — run in Docker)

**Interfaces:**
- Consumes: `getAuthenticatedGuest()`, `getVideoLimit`, `VIDEO_FOLDER` (Task 1)
- Produces: `POST` JSON `{ signature: string; timestamp: number; apiKey: string; cloudName: string; folder: string }`; `GET` sets cookie `csrf_token_guest_video`

- [ ] **Step 1: Write the failing integration test**

```ts
// __tests__/api/video-sign.test.ts
import { POST } from '@/app/api/guest/upload/video-sign/route';

jest.mock('@/lib/guest-auth', () => ({
  getAuthenticatedGuest: jest.fn(),
}));
import { getAuthenticatedGuest } from '@/lib/guest-auth';
import { prisma } from '@/lib/prisma';

function reqWithCsrf(token: string) {
  return new Request('http://x/api/guest/upload/video-sign', {
    method: 'POST',
    headers: { 'x-csrf-token': token, cookie: `csrf_token_guest_video=${token}` },
  }) as any;
}

it('rejects non-premium guests with 403', async () => {
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue({
    id: 'g1', event: { id: 'e1', pricingTier: 'free' },
  });
  const res = await POST(reqWithCsrf('tok'));
  expect(res.status).toBe(403);
});

it('signs for a premium guest under the limit', async () => {
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue({
    id: 'g1', event: { id: 'e1', pricingTier: 'premium' },
  });
  jest.spyOn(prisma.video, 'count').mockResolvedValue(0 as any);
  jest.spyOn(prisma.guest, 'findUnique').mockResolvedValue({ lifetimeVideoCount: 0 } as any);
  const res = await POST(reqWithCsrf('tok'));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.signature).toEqual(expect.any(String));
  expect(body.folder).toBe('wedding-app/videos');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (Docker, built with `.env`): `pnpm test:integration -- video-sign.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the route**

```ts
// app/api/guest/upload/video-sign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedGuest } from '@/lib/guest-auth';
import { getVideoLimit, VIDEO_FOLDER } from '@/lib/video-config';

export async function GET() {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const response = NextResponse.json({ csrfToken });
  response.cookies.set('csrf_token_guest_video', csrfToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 30,
    path: '/',
  });
  return response;
}

export async function POST(request: NextRequest) {
  const reqCookies = await cookies();
  const csrfCookie = reqCookies.get('csrf_token_guest_video')?.value;
  const csrfHeader = request.headers.get('x-csrf-token');
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return NextResponse.json({ error: 'Neispravan CSRF token. Osvježite stranicu.' }, { status: 403 });
  }

  const guest = await getAuthenticatedGuest();
  if (!guest) return NextResponse.json({ error: 'Niste prijavljeni' }, { status: 401 });

  const limit = getVideoLimit(guest.event.pricingTier);
  if (limit <= 0) {
    return NextResponse.json({ error: 'Video je dostupan samo za premium pakete.' }, { status: 403 });
  }

  // Pre-gate (authoritative re-check happens on confirm).
  const [active, guestRow] = await Promise.all([
    prisma.video.count({ where: { guestId: guest.id } }),
    prisma.guest.findUnique({ where: { id: guest.id }, select: { lifetimeVideoCount: true } }),
  ]);
  if (active >= limit) {
    return NextResponse.json({ error: `Dosegli ste limit od ${limit} videa.` }, { status: 400 });
  }
  if ((guestRow?.lifetimeVideoCount ?? 0) >= limit * 2) {
    return NextResponse.json({ error: 'Dosegli ste ukupan limit video upload-a za ovaj event.' }, { status: 400 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { folder: VIDEO_FOLDER, timestamp };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);

  return NextResponse.json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    folder: VIDEO_FOLDER,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (Docker): `pnpm test:integration -- video-sign.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/guest/upload/video-sign/route.ts __tests__/api/video-sign.test.ts
git commit -m "feat(video): signed-upload endpoint gated on premium + slot count"
```

---

### Task 5: Confirm endpoint — `POST /api/guest/upload/video-confirm`

Re-validates against Cloudinary's authoritative metadata, then atomically writes the `Video` row or destroys the orphaned asset.

**Files:**
- Create: `app/api/guest/upload/video-confirm/route.ts`
- Test: `__tests__/api/video-confirm.test.ts` (integration — Docker)

**Interfaces:**
- Consumes: `getAuthenticatedGuest()`, `getVideoLimit`, `validateVideoMeta`, `derivePosterUrl`, `isOwnedVideoPublicId` (Task 1); reuses CSRF cookie `csrf_token_guest_video` (Task 4)
- Produces: JSON `{ success: true; video: { id, videoUrl, posterUrl, durationSec } }` on success
- Request body: `{ publicId: string }` (server fetches everything else from Cloudinary — client values are not trusted)

- [ ] **Step 1: Write the failing integration test**

```ts
// __tests__/api/video-confirm.test.ts
import { POST } from '@/app/api/guest/upload/video-confirm/route';

jest.mock('@/lib/guest-auth', () => ({ getAuthenticatedGuest: jest.fn() }));
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    api: { resource: jest.fn() },
    uploader: { destroy: jest.fn((_id, _opts, cb) => cb(null, { result: 'ok' })) },
  },
}));
import { getAuthenticatedGuest } from '@/lib/guest-auth';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '@/lib/prisma';

function req(body: object, token = 'tok') {
  return new Request('http://x/api/guest/upload/video-confirm', {
    method: 'POST',
    headers: { 'x-csrf-token': token, cookie: `csrf_token_guest_video=${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue({
    id: 'g1', event: { id: 'e1', pricingTier: 'premium' },
  });
});

it('destroys and rejects a video longer than 60s', async () => {
  (cloudinary.api.resource as jest.Mock).mockResolvedValue({
    duration: 90, bytes: 5_000_000, secure_url: 'https://res.cloudinary.com/x/video/upload/v1/wedding-app/videos/a.mp4',
  });
  const res = await POST(req({ publicId: 'wedding-app/videos/a' }));
  expect(res.status).toBe(400);
  expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
    'wedding-app/videos/a', { resource_type: 'video' }, expect.any(Function)
  );
});

it('rejects a public_id outside our folder', async () => {
  const res = await POST(req({ publicId: 'wedding-app/a' }));
  expect(res.status).toBe(400);
  expect(cloudinary.api.resource).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (Docker): `pnpm test:integration -- video-confirm.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the route**

```ts
// app/api/guest/upload/video-confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedGuest } from '@/lib/guest-auth';
import {
  getVideoLimit,
  validateVideoMeta,
  derivePosterUrl,
  isOwnedVideoPublicId,
} from '@/lib/video-config';
import { assertCloudinaryUrl } from '@/app/api/guest/upload/assertCloudinaryUrl';

function destroyVideo(publicId: string): Promise<void> {
  return new Promise((resolve) => {
    cloudinary.uploader.destroy(publicId, { resource_type: 'video' }, (err) => {
      if (err) console.error('[video-confirm] orphan cleanup failed for', publicId, err);
      resolve();
    });
  });
}

export async function POST(request: NextRequest) {
  const reqCookies = await cookies();
  const csrfCookie = reqCookies.get('csrf_token_guest_video')?.value;
  const csrfHeader = request.headers.get('x-csrf-token');
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return NextResponse.json({ error: 'Neispravan CSRF token.' }, { status: 403 });
  }

  const guest = await getAuthenticatedGuest();
  if (!guest) return NextResponse.json({ error: 'Niste prijavljeni' }, { status: 401 });

  const limit = getVideoLimit(guest.event.pricingTier);
  if (limit <= 0) return NextResponse.json({ error: 'Video nije dostupan za vaš paket.' }, { status: 403 });

  const { publicId } = (await request.json().catch(() => ({}))) as { publicId?: string };
  if (!publicId || !isOwnedVideoPublicId(publicId)) {
    return NextResponse.json({ error: 'Neispravan video.' }, { status: 400 });
  }

  // Authoritative metadata straight from Cloudinary — client values are not trusted.
  let resource: { duration?: number; bytes: number; secure_url: string };
  try {
    resource = await cloudinary.api.resource(publicId, { resource_type: 'video' });
  } catch {
    return NextResponse.json({ error: 'Video nije pronađen.' }, { status: 400 });
  }

  const durationSec = Math.ceil(resource.duration ?? 0);
  const check = validateVideoMeta({ durationSec, bytes: resource.bytes });
  if (!check.ok) {
    await destroyVideo(publicId);
    const msg = check.reason === 'duration'
      ? 'Video može trajati najviše 60 sekundi.'
      : 'Video je prevelik (max 100 MB).';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    assertCloudinaryUrl(resource.secure_url);
  } catch {
    await destroyVideo(publicId);
    return NextResponse.json({ error: 'Neispravan video URL.' }, { status: 400 });
  }

  const tier = guest.event.pricingTier;
  const posterUrl = derivePosterUrl(resource.secure_url);

  try {
    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const guestRow = await tx.guest.findUnique({
        where: { id: guest.id },
        select: { lifetimeVideoCount: true },
      });
      const lifetime = guestRow?.lifetimeVideoCount ?? 0;
      if (lifetime + 1 > limit * 2) {
        throw new Error('LIFETIME');
      }
      const active = await tx.video.count({ where: { guestId: guest.id } });
      if (active + 1 > limit) {
        throw new Error('ACTIVE');
      }
      const video = await tx.video.create({
        data: {
          guestId: guest.id,
          videoUrl: resource.secure_url,
          posterUrl,
          storagePath: publicId,
          durationSec,
          bytes: resource.bytes,
          tier,
        },
      });
      await tx.guest.update({
        where: { id: guest.id },
        data: { lifetimeVideoCount: { increment: 1 } },
      });
      return video;
    });

    return NextResponse.json({
      success: true,
      video: {
        id: created.id,
        videoUrl: created.videoUrl,
        posterUrl: created.posterUrl,
        durationSec: created.durationSec,
      },
    });
  } catch (err) {
    await destroyVideo(publicId);
    const msg = err instanceof Error && err.message === 'LIFETIME'
      ? 'Dosegli ste ukupan limit video upload-a za ovaj event.'
      : `Možete imati najviše ${limit} videa.`;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (Docker): `pnpm test:integration -- video-confirm.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/guest/upload/video-confirm/route.ts __tests__/api/video-confirm.test.ts
git commit -m "feat(video): confirm endpoint with authoritative Cloudinary validation"
```

---

### Task 6: Video delete endpoint — `GET` (CSRF) + `DELETE /api/guest/videos/delete`

Mirrors `app/api/guest/images/delete/route.ts` but for the `Video` model and `resource_type: 'video'`. Lifetime counter is NOT decremented (monotonic, anti-abuse).

**Files:**
- Create: `app/api/guest/videos/delete/route.ts`
- Test: `__tests__/api/video-delete.test.ts` (integration — Docker)

**Interfaces:**
- Consumes: `getAuthenticatedGuest()`
- Produces: `GET` sets cookie `csrf_token_guest_video_delete`; `DELETE ?id=<videoId>` returns `{ success: true }`

- [ ] **Step 1: Write the failing integration test**

```ts
// __tests__/api/video-delete.test.ts
import { DELETE } from '@/app/api/guest/videos/delete/route';

jest.mock('@/lib/guest-auth', () => ({ getAuthenticatedGuest: jest.fn() }));
jest.mock('cloudinary', () => ({
  v2: { config: jest.fn(), uploader: { destroy: jest.fn((_i, _o, cb) => cb(null, {})) } },
}));
import { getAuthenticatedGuest } from '@/lib/guest-auth';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '@/lib/prisma';

function req(id: string, token = 'tok') {
  return new Request(`http://x/api/guest/videos/delete?id=${id}`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': token, cookie: `csrf_token_guest_video_delete=${token}` },
  }) as any;
}

it('refuses to delete a video the guest does not own', async () => {
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue({ id: 'g1' });
  jest.spyOn(prisma.video, 'findUnique').mockResolvedValue({ id: 'v1', guestId: 'OTHER', storagePath: 'wedding-app/videos/a' } as any);
  const res = await DELETE(req('v1'));
  expect(res.status).toBe(403);
  expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
});

it('deletes an owned video with resource_type video', async () => {
  (getAuthenticatedGuest as jest.Mock).mockResolvedValue({ id: 'g1' });
  jest.spyOn(prisma.video, 'findUnique').mockResolvedValue({ id: 'v1', guestId: 'g1', storagePath: 'wedding-app/videos/a' } as any);
  jest.spyOn(prisma.video, 'delete').mockResolvedValue({} as any);
  const res = await DELETE(req('v1'));
  expect(res.status).toBe(200);
  expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('wedding-app/videos/a', { resource_type: 'video' }, expect.any(Function));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (Docker): `pnpm test:integration -- video-delete.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the route**

```ts
// app/api/guest/videos/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedGuest } from '@/lib/guest-auth';

export async function GET() {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const response = NextResponse.json({ csrfToken });
  response.cookies.set('csrf_token_guest_video_delete', csrfToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 30,
    path: '/',
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  const reqCookies = await cookies();
  const csrfCookie = reqCookies.get('csrf_token_guest_video_delete')?.value;
  const csrfHeader = request.headers.get('x-csrf-token');
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return NextResponse.json({ error: 'Neispravan CSRF token.' }, { status: 403 });
  }

  const guest = await getAuthenticatedGuest();
  if (!guest) return NextResponse.json({ error: 'Niste prijavljeni' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Nedostaje ID videa.' }, { status: 400 });

  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) return NextResponse.json({ error: 'Video ne postoji.' }, { status: 404 });
  if (video.guestId !== guest.id) {
    return NextResponse.json({ error: 'Nemate pristup ovom videu.' }, { status: 403 });
  }

  if (video.storagePath) {
    await new Promise<void>((resolve) => {
      cloudinary.uploader.destroy(video.storagePath, { resource_type: 'video' }, (error) => {
        if (error) console.error('[video-delete] Cloudinary destroy failed:', error);
        resolve();
      });
    });
  }

  await prisma.video.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (Docker): `pnpm test:integration -- video-delete.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/guest/videos/delete/route.ts __tests__/api/video-delete.test.ts
git commit -m "feat(video): owner-scoped video delete with resource_type video"
```

---

### Task 7: Retention cron deletes videos too

Without this, expired videos leak on Cloudinary forever and keep billing.

**Files:**
- Modify: `app/api/cron/cleanup/route.ts`

**Interfaces:**
- Consumes: existing `executeHardDelete` / `deleteCloudinaryInChunks` (collect `Video.storagePath` for the same `guestIds`)

- [ ] **Step 1: Collect video public_ids before deletion**

In `app/api/cron/cleanup/route.ts`, wherever the code gathers image `storagePath`s for the guests being purged, add a parallel gather for videos:

```ts
const videoRows = await prisma.video.findMany({
  where: { guestId: { in: guestIds }, storagePath: { not: '' } },
  select: { storagePath: true },
});
const videoPublicIds = videoRows.map((v) => v.storagePath).filter(Boolean) as string[];
```

- [ ] **Step 2: Delete the Cloudinary video assets with the right resource_type**

`deleteCloudinaryInChunks` calls `cloudinary.api.delete_resources(batch)` which defaults to images. Add a `resourceType` parameter and a video call. Update the signature:

```ts
async function deleteCloudinaryInChunks(
  publicIds: string[],
  contextLabel: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<void> {
  const CHUNK = 100;
  for (let i = 0; i < publicIds.length; i += CHUNK) {
    const batch = publicIds.slice(i, i + CHUNK);
    try {
      await cloudinary.api.delete_resources(batch, { resource_type: resourceType });
    } catch (err) {
      console.error(`Cloudinary ${resourceType} batch ${i}..${i + batch.length} failed for ${contextLabel}:`, err);
    }
  }
}
```

Then, next to the existing image call, add:

```ts
await deleteCloudinaryInChunks(videoPublicIds, contextLabel, 'video');
```

(The existing image call keeps its default third argument and is unchanged.)

- [ ] **Step 3: Delete the DB rows**

Next to `prisma.image.deleteMany({ where: { guestId: { in: guestIds } } })` add:

```ts
prisma.video.deleteMany({ where: { guestId: { in: guestIds } } }),
```

- [ ] **Step 4: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/cleanup/route.ts
git commit -m "feat(video): retention cron purges Cloudinary videos + Video rows"
```

---

### Task 8: Client video uploader — `components/guest/VideoUploadForm.tsx`

Premium-only UI: pick a video, client-side duration pre-check, request signature, direct XHR upload to Cloudinary with progress, then confirm.

**Files:**
- Create: `components/guest/VideoUploadForm.tsx`
- Create: `lib/uploadVideoToCloudinary.ts` (pure-ish XHR helper, unit-testable signature)
- Test: `__tests__/components/uploadVideoToCloudinary.test.ts`

**Interfaces:**
- Consumes: `/api/guest/upload/video-sign`, `/api/guest/upload/video-confirm`, `fetchWithCsrfRetry` (existing `lib/csrf-client`), `MAX_VIDEO_DURATION_SEC` (Task 1)
- Produces: `uploadVideoToCloudinary(file, signData, onProgress): Promise<{ publicId: string }>`; React component `<VideoUploadForm guestId videoLimit existingVideoCount language />`

- [ ] **Step 1: Write the failing test for the upload helper** (mock XHR)

```ts
// __tests__/components/uploadVideoToCloudinary.test.ts
import { buildCloudinaryFormData } from '@/lib/uploadVideoToCloudinary';

it('builds signed multipart fields in the order Cloudinary expects', () => {
  const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' });
  const fd = buildCloudinaryFormData(file, {
    signature: 'sig', timestamp: 123, apiKey: 'key', cloudName: 'cloud', folder: 'wedding-app/videos',
  });
  expect(fd.get('api_key')).toBe('key');
  expect(fd.get('timestamp')).toBe('123');
  expect(fd.get('signature')).toBe('sig');
  expect(fd.get('folder')).toBe('wedding-app/videos');
  expect(fd.get('file')).toBeInstanceOf(File);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- uploadVideoToCloudinary.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the upload helper**

```ts
// lib/uploadVideoToCloudinary.ts
export interface VideoSignData {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export function buildCloudinaryFormData(file: File, sign: VideoSignData): FormData {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', sign.apiKey);
  fd.append('timestamp', String(sign.timestamp));
  fd.append('signature', sign.signature);
  fd.append('folder', sign.folder);
  return fd;
}

export function uploadVideoToCloudinary(
  file: File,
  sign: VideoSignData,
  onProgress?: (pct: number) => void
): Promise<{ publicId: string; secureUrl: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${sign.cloudName}/video/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const res = JSON.parse(xhr.responseText);
        resolve({ publicId: res.public_id, secureUrl: res.secure_url });
      } else {
        reject(new Error('Cloudinary upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during video upload'));
    xhr.send(buildCloudinaryFormData(file, sign));
  });
}

/** Reads duration (seconds) from a local video File without uploading. */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(el.duration);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Cannot read video metadata'));
    };
    el.src = url;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- uploadVideoToCloudinary.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement the `VideoUploadForm` component**

```tsx
// components/guest/VideoUploadForm.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";
import { fetchWithCsrfRetry } from "@/lib/csrf-client";
import {
  uploadVideoToCloudinary,
  readVideoDuration,
  type VideoSignData,
} from "@/lib/uploadVideoToCloudinary";
import { MAX_VIDEO_DURATION_SEC } from "@/lib/video-config";

interface VideoUploadFormProps {
  videoLimit: number;
  existingVideoCount: number;
  language?: string;
  onUploaded?: () => void;
}

export function VideoUploadForm({ videoLimit, existingVideoCount, language = "sr", onUploaded }: VideoUploadFormProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const remaining = Math.max(0, videoLimit - existingVideoCount);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-pick of same file
    if (!file) return;
    setError("");

    try {
      const duration = await readVideoDuration(file);
      if (duration > MAX_VIDEO_DURATION_SEC) {
        setError(t("guest.videoUpload.tooLong", `Video može trajati najviše ${MAX_VIDEO_DURATION_SEC} sekundi.`));
        return;
      }

      setBusy(true);
      setProgress(0);

      // 1) signature (CSRF handled by fetchWithCsrfRetry against the same endpoint)
      const signRes = await fetchWithCsrfRetry("/api/guest/upload/video-sign", {
        method: "POST",
        csrfEndpoint: "/api/guest/upload/video-sign",
      });
      const signData = (await signRes.json()) as VideoSignData & { error?: string };
      if (!signRes.ok) throw new Error(signData.error || "Greška pri pripremi upload-a.");

      // 2) direct upload to Cloudinary
      const { publicId } = await uploadVideoToCloudinary(file, signData, setProgress);

      // 3) confirm + persist
      const confirmRes = await fetchWithCsrfRetry("/api/guest/upload/video-confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicId }),
        csrfEndpoint: "/api/guest/upload/video-sign",
      });
      const confirmData = await confirmRes.json().catch(() => ({}));
      if (!confirmRes.ok) throw new Error(confirmData.error || "Greška pri potvrdi videa.");

      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri uploadu videa.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>{t("guest.videoUpload.title", "Dodaj video")}</CardTitle>
        <p className="text-sm text-[hsl(var(--lp-muted-foreground))]">
          {t("guest.videoUpload.hint", `Do ${videoLimit} videa, max ${MAX_VIDEO_DURATION_SEC}s. Preostalo: ${remaining}.`)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={onPick}
          disabled={busy || remaining <= 0}
          aria-label={t("guest.videoUpload.pick", "Izaberite video")}
        />
        {busy && (
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("guest.videoUpload.uploading", "Slanje videa...")} {progress}%</span>
          </div>
        )}
        <Button type="button" disabled className="hidden" aria-hidden />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/uploadVideoToCloudinary.ts components/guest/VideoUploadForm.tsx __tests__/components/uploadVideoToCloudinary.test.ts
git commit -m "feat(video): client direct-upload helper + premium VideoUploadForm"
```

---

### Task 9: Guest video gallery + wire into the dashboard

**Files:**
- Create: `components/guest/VideoGallery.tsx`
- Modify: `app/guest/dashboard/page.tsx` (load videos, pass to client)
- Modify: `components/guest/DashboardClient.tsx` (render gallery + form when `videoLimit > 0`)

**Interfaces:**
- Consumes: video rows `{ id, videoUrl, posterUrl, durationSec }`, `VideoUploadForm` (Task 8), `/api/guest/videos/delete` (Task 6)
- Produces: `<VideoGallery videos onDeleted language />`

- [ ] **Step 1: Implement `VideoGallery`**

```tsx
// components/guest/VideoGallery.tsx
"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchWithCsrfRetry } from "@/lib/csrf-client";

export interface GuestVideo {
  id: string;
  videoUrl: string;
  posterUrl: string;
  durationSec: number;
}

export function VideoGallery({
  videos,
  onDeleted,
}: {
  videos: GuestVideo[];
  onDeleted?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (videos.length === 0) {
    return <p className="text-sm text-[hsl(var(--lp-muted-foreground))]">{t("guest.videoGallery.empty", "Nema uploadovanih videa.")}</p>;
  }

  async function remove(id: string) {
    setDeletingId(id);
    try {
      const res = await fetchWithCsrfRetry(`/api/guest/videos/delete?id=${id}`, {
        method: "DELETE",
        csrfEndpoint: "/api/guest/videos/delete",
      });
      if (res.ok) onDeleted?.(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {videos.map((v) => (
        <Card key={v.id} className="relative overflow-hidden">
          <video controls preload="metadata" poster={v.posterUrl} src={v.videoUrl} className="w-full rounded-md" />
          <button
            onClick={() => remove(v.id)}
            disabled={deletingId === v.id}
            aria-label={t("guest.videoGallery.delete", "Obriši video")}
            className="absolute top-2 right-2 bg-white/80 rounded-full p-1.5 text-gray-700 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Load videos in the dashboard server page**

In `app/guest/dashboard/page.tsx`, add `videos: true` to the `prisma.guest.findUnique({ include: { ... } })` call, and pass to `DashboardClient`:

```tsx
        initialVideos={(guestWithData?.videos ?? []).map((v) => ({
          id: v.id, videoUrl: v.videoUrl, posterUrl: v.posterUrl, durationSec: v.durationSec,
        }))}
        videoLimit={getVideoLimit(event.pricingTier)}
```

Add the import at the top: `import { getVideoLimit } from "@/lib/video-config";`

- [ ] **Step 3: Render in `DashboardClient`**

In `components/guest/DashboardClient.tsx`, accept the new props `initialVideos: GuestVideo[]` and `videoLimit: number`, hold `videos` in state, and when `videoLimit > 0` render a section:

```tsx
{videoLimit > 0 && (
  <section className="mt-8 space-y-4">
    <VideoUploadForm
      videoLimit={videoLimit}
      existingVideoCount={videos.length}
      language={language}
      onUploaded={() => window.location.reload()}
    />
    <VideoGallery videos={videos} onDeleted={(id) => setVideos((prev) => prev.filter((v) => v.id !== id))} />
  </section>
)}
```

Add imports for `VideoUploadForm`, `VideoGallery`, and the `GuestVideo` type. Initialize `const [videos, setVideos] = useState(initialVideos);`.

- [ ] **Step 4: Typecheck + render test**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.
Run: `pnpm test:unit -- DashboardClient` (if a test exists) — otherwise verify manually that a premium guest sees the video section and a free guest does not.

- [ ] **Step 5: Commit**

```bash
git add components/guest/VideoGallery.tsx components/guest/DashboardClient.tsx app/guest/dashboard/page.tsx
git commit -m "feat(video): guest video gallery wired into premium dashboard"
```

---

### Task 10: Admin video gallery (view + per-video download)

Admins see guest videos but download them individually (videos are too large for the in-memory ZIP).

**Files:**
- Create: `components/admin/AdminVideoGallery.tsx`
- Modify: the admin dashboard data source that loads images for the event, to also load videos (the `prisma` query feeding `AdminDashboardTabs`), and render the new gallery in a tab.

**Interfaces:**
- Consumes: video rows `{ id, videoUrl, posterUrl, durationSec, guestName }`
- Produces: `<AdminVideoGallery videos />`

- [ ] **Step 1: Implement `AdminVideoGallery`**

```tsx
// components/admin/AdminVideoGallery.tsx
"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface AdminVideo {
  id: string;
  videoUrl: string;
  posterUrl: string;
  durationSec: number;
  guestName?: string;
}

export function AdminVideoGallery({ videos }: { videos: AdminVideo[] }) {
  const { t } = useTranslation();
  if (videos.length === 0) {
    return <p className="text-sm text-[hsl(var(--lp-muted-foreground))]">{t("admin.videoGallery.empty", "Nema video snimaka.")}</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((v) => (
        <Card key={v.id} className="overflow-hidden">
          <video controls preload="metadata" poster={v.posterUrl} src={v.videoUrl} className="w-full" />
          <div className="flex items-center justify-between p-2 text-sm">
            <span className="truncate">{v.guestName ?? ""}</span>
            <a href={v.videoUrl} download className="inline-flex items-center gap-1 text-[hsl(var(--lp-primary))]" aria-label={t("admin.videoGallery.download", "Preuzmi video")}>
              <Download className="h-4 w-4" />
            </a>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Load videos for the admin dashboard**

In the server query that loads the event's images for the admin dashboard (the page/component feeding `AdminDashboardTabs`), add a videos fetch scoped to the event and flatten the guest name:

```ts
const videos = await prisma.video.findMany({
  where: { guest: { eventId: admin.event.id } },
  select: { id: true, videoUrl: true, posterUrl: true, durationSec: true, guest: { select: { firstName: true, lastName: true } } },
  orderBy: { createdAt: "desc" },
});
const adminVideos = videos.map((v) => ({
  id: v.id, videoUrl: v.videoUrl, posterUrl: v.posterUrl, durationSec: v.durationSec,
  guestName: `${v.guest.firstName} ${v.guest.lastName}`.trim(),
}));
```

Pass `adminVideos` into `AdminDashboardTabs` and render `<AdminVideoGallery videos={adminVideos} />` inside a new "Video" tab (follow the existing tab pattern in `components/admin/AdminDashboardTabs`).

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/admin/AdminVideoGallery.tsx components/admin/AdminDashboardTabs* app/admin
git commit -m "feat(video): admin video tab with per-video download"
```

---

### Task 11: i18n strings + pricing feature bullet

**Files:**
- Modify: `locales/sr/translation.json`, `locales/en/translation.json`
- Modify: `lib/pricing-features.ts` (add a video bullet when `plan.videoLimit > 0`)

- [ ] **Step 1: Add translation keys** (both files; sr shown, mirror in en)

Under `guest`, add:

```json
"videoUpload": {
  "title": "Dodaj video",
  "hint": "Do {{limit}} videa, max {{sec}}s. Preostalo: {{remaining}}.",
  "pick": "Izaberite video",
  "uploading": "Slanje videa...",
  "tooLong": "Video može trajati najviše {{sec}} sekundi."
},
"videoGallery": {
  "empty": "Nema uploadovanih videa.",
  "delete": "Obriši video"
}
```

Under `admin`, add:

```json
"videoGallery": {
  "empty": "Nema video snimaka.",
  "download": "Preuzmi video"
}
```

Add the `en` equivalents in `locales/en/translation.json` with the same keys.

- [ ] **Step 2: Add the pricing bullet** in `lib/pricing-features.ts`

Inside `buildDynamicFeatures`, after the image-quality bullet, add:

```ts
if (plan.videoLimit > 0) {
  bullets.push(
    t('pricing.feature.videosPerGuest', {
      count: plan.videoLimit,
      defaultValue: `Video: do ${plan.videoLimit} po gostu (60s)`,
    })
  );
}
```

Add `videoLimit` to the `PricingPlanRow` type the function consumes if it is locally typed.

- [ ] **Step 3: Typecheck + verify landing page**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.
Run: `pnpm dev`, open the landing page, confirm the premium card shows the video bullet and free/basic do not.

- [ ] **Step 4: Commit**

```bash
git add locales/sr/translation.json locales/en/translation.json lib/pricing-features.ts
git commit -m "feat(video): i18n strings + premium video pricing bullet"
```

---

### Task 12: End-to-end manual verification on Cloudinary test mode

Automated tests mock Cloudinary; one real run confirms the signed-upload path and validates true billing/transcoding behaviour before go-live.

**Files:** none (verification task)

- [ ] **Step 1: Build + run in Docker with `.env`** (project rule)

Run: `docker build -t weddingapp --build-arg ... .` then run with the `.env` file mounted (per project Docker convention). Confirm the app boots.

- [ ] **Step 2: As a premium guest, upload a real ~20s phone video**

Verify: the file goes directly to `api.cloudinary.com` (check the Network tab — the POST target is Cloudinary, not our origin), progress bar advances, confirm succeeds, and the clip appears in the guest gallery with a poster frame.

- [ ] **Step 3: Negative checks**

- Upload a >60s video → rejected client-side (and if forced, server destroys + 400).
- Upload a 4th video → `Možete imati najviše 3 videa.`
- Log in as a free guest → no video section visible.
- Delete a video → it disappears and the Cloudinary asset is gone (check the Cloudinary Media Library, `wedding-app/videos` folder).

- [ ] **Step 4: Confirm retention cleanup** (optional dry-run)

Trigger `/api/cron/cleanup` against a test event past retention and confirm both image and video assets are removed from Cloudinary.

- [ ] **Step 5: Commit any fixes found, then open the integration branch for review.**

---

## Notes / risks carried from analysis

- **Cloudinary cost is the real risk, not the code.** Video storage + streaming bandwidth bills far higher than images. The premium-only gate + 3-video/60s caps are the cost controls. Re-check the Cloudinary credit usage after Task 12's real upload before announcing the feature.
- **Poster frames** are generated lazily by Cloudinary on first `.jpg` request; the first gallery load per video may show a brief blank before the poster materialises.
- **No ZIP for videos** by design — admins download individually. If bulk video download is later required, it needs a background job, not the in-memory ZIP route.
- **`assertCloudinaryUrl`** path is imported from the existing upload route (`app/api/guest/upload/assertCloudinaryUrl`); if that helper is not exported, export it or copy the allowlist check into `lib/video-config.ts`.
