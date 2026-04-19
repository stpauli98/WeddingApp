# Guest Lifetime Upload Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zamijeniti per-IP upload rate limit sa per-guest lifetime counter-om (2× tier cap) tako da guest ne može beskonačno ciklirati upload→delete→upload, dok legitiman user ima dovoljno prostora za remorse.

**Architecture:** Dodaje se `Guest.lifetimeUploadCount Int @default(0)`. Brojač se inkrementira unutar postojeće `prisma.$transaction` u `app/api/guest/upload/route.ts` atomicno sa `image.create`-ovima. Provjera (`lifetime + new > imageLimit * 2`) se dešava prije postojeće active-limit provjere. Per-IP rate limit se uklanja jer je per-guest counter precizniji za authenticated endpoint.

**Tech Stack:** Prisma 6 (PostgreSQL), Next.js 15 App Router route handlers, Jest za unit test (mock prisma — isti pattern kao `__tests__/api/upload-atomic-count.test.ts`).

**Spec rationale (user-approved 2026-04-19):** 2× tier daje guest-u jednu kompletnu zamjenu galerije — ako upload-uje 25 i predomisli se, može potpuno resetovati i upload-ovati drugih 25. Brisanje **ne** oslobađa lifetime slot-ove → anti-abuse. Backfill postojećih guest-ova na trenutni active image count znači da niko nije retroaktivno blokiran.

---

## File structure

| Fajl | Akcija | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify (Guest model) | Dodati `lifetimeUploadCount Int @default(0)` |
| **NEW** `prisma/migrations/20260419_add_guest_lifetime_upload_count/migration.sql` | Create | `ALTER TABLE` + backfill + CHECK constraint |
| `app/api/guest/upload/route.ts` | Modify | Add `LifetimeLimitError`, check u TX, increment u TX, ukloniti IP rate limit |
| **NEW** `__tests__/api/upload-lifetime-limit.test.ts` | Create | 3 unit testa: happy path, lifetime exceeded, increment pravilno |
| `__tests__/api/upload-atomic-count.test.ts` | Modify | Dodati mock-ove za nova polja (`guest.findUnique`, `guest.update`) — postojeći testovi moraju i dalje prolaziti |

---

## Task 1: Branch check + pre-flight

**Files:** none (git only)

- [ ] **Step 1: Potvrdi da si na ispravnoj grani sa čistim tree-om**

Run:
```bash
git status
git branch --show-current
```
Expected: branch `feat/guest-gallery-lightbox`, working tree clean (sve prethodne gallery+scroll+success izmjene već commit-ovane).

- [ ] **Step 2: Provjeri postojeći test pattern za upload**

Run:
```bash
head -80 __tests__/api/upload-atomic-count.test.ts
```
Expected: vidiš `jest.mock('@/lib/prisma', ...)`, `jest.mock('@/lib/guest-auth', ...)`, `jest.mock('@/lib/cloudinary', ...)`, `jest.mock('sharp', ...)`. Novi test će koristiti isti setup.

---

## Task 2: Update Prisma schema

**Files:**
- Modify: `prisma/schema.prisma:126-145` (Guest model)

- [ ] **Step 1: Dodaj `lifetimeUploadCount` polje**

U `prisma/schema.prisma`, Guest model, ubaci novo polje IZMEĐU `marketingConsent` i `createdAt`:

```prisma
/// GDPR opt-in at registration. When true, email is harvested into
/// MarketingContact at retention expiry.
marketingConsent Boolean   @default(false)
/// Total images this guest has ever uploaded to this event. Monotonic:
/// never decreases, even when images are deleted. Anti-abuse cap:
/// lifetime <= event.imageLimit * 2 prevents unlimited upload/delete
/// cycles from draining Cloudinary bandwidth.
lifetimeUploadCount Int   @default(0)
createdAt        DateTime  @default(now())
```

- [ ] **Step 2: Regeneriši Prisma client types**

Run:
```bash
npx prisma generate --no-engine
```
Expected: `✔ Generated Prisma Client ...` success message, bez error-a.

- [ ] **Step 3: Verifikuj TS typecheck**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 grešaka. `Guest` tip sada sadrži `lifetimeUploadCount: number`.

---

## Task 3: Create migration SQL

**Files:**
- Create: `prisma/migrations/20260419_add_guest_lifetime_upload_count/migration.sql`

- [ ] **Step 1: Kreiraj migration direktorij**

Run:
```bash
mkdir -p prisma/migrations/20260419_add_guest_lifetime_upload_count
```

- [ ] **Step 2: Napiši migration SQL**

Kreiraj `prisma/migrations/20260419_add_guest_lifetime_upload_count/migration.sql`:

```sql
-- Lifetime upload counter per guest. Anti-abuse cap: upload handler rejects
-- when guest.lifetimeUploadCount + new > event.imageLimit * 2. Deleting
-- images drops active gallery count but never decreases this field, so an
-- upload/delete loop cannot evade the cap. Backfill uses the current
-- image count so existing guests get a fair starting point.

ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "lifetimeUploadCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill: set to current active image count. Only touches rows that are
-- still at default 0 so re-running this migration (e.g. on a restored DB)
-- doesn't clobber real increments.
UPDATE "Guest" g
SET "lifetimeUploadCount" = COALESCE((SELECT COUNT(*)::INTEGER FROM "Image" WHERE "guestId" = g.id), 0)
WHERE "lifetimeUploadCount" = 0;

-- Defence-in-depth: non-negative invariant at the DB level.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Guest_lifetimeUploadCount_nonneg'
  ) THEN
    ALTER TABLE "Guest" ADD CONSTRAINT "Guest_lifetimeUploadCount_nonneg" CHECK ("lifetimeUploadCount" >= 0);
  END IF;
END $$;
```

- [ ] **Step 3: Formalna review migrationa**

Pročitaj fajl nazad:
```bash
cat prisma/migrations/20260419_add_guest_lifetime_upload_count/migration.sql
```
Expected: vidi sva tri koraka (ADD COLUMN, UPDATE, CHECK constraint), idempotentna forma (`IF NOT EXISTS`).

---

## Task 4: Apply migration to database (HUMAN CONFIRMATION GATE)

**Files:** none (database operation)

⚠️ **Ovo je destructive-adjacent:** tvoj `DIRECT_DATABASE_URL` je produkcijska Prisma Postgres baza (isti DATABASE_URL koristi prod Vercel deploy). Migration će izvršiti ALTER TABLE + UPDATE na pravim podacima.

- [ ] **Step 1: Prikaži migracije koje će se primijeniti**

Run:
```bash
npx prisma migrate status 2>&1 | tail -20
```
Expected: lista pending migration-a uključujući `20260419_add_guest_lifetime_upload_count`.

- [ ] **Step 2: TRAŽI EKSPLICITNU POTVRDU OD KORISNIKA PRIJE APPLY-A**

Engineer (ti, koji izvršavaš plan): reci korisniku tačno šta SQL radi (iz Task 3 Step 2) i pitaj: *"Mogu li pokrenuti `npx prisma migrate deploy` protiv produkcijske baze?"*. Čekaj na "da" / "potvrdjujem" / ekvivalent.

Ako je odgovor "ne" → **ZAUSTAVI** izvršavanje plana, plan ostaje na ovom koraku dok se stvar ne razriješi.

- [ ] **Step 3: Primijeni migration (samo nakon potvrde)**

Run:
```bash
npx prisma migrate deploy 2>&1 | tail -15
```
Expected: `1 migration applied` ili `Database schema is up to date` + `Applied migration 20260419_add_guest_lifetime_upload_count`.

- [ ] **Step 4: Verifikuj backfill uspješan**

Run:
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
const p = new PrismaClient().\$extends(withAccelerate());
const sample = await p.guest.findMany({ take: 5, select: { email: true, lifetimeUploadCount: true, _count: { select: { images: true } } } });
console.log(JSON.stringify(sample, null, 2));
await p.\$disconnect();
" 2>&1 | tail -30
```
Expected: za svaki guest `lifetimeUploadCount === _count.images` (backfill je postavio lifetime = trenutni active count).

---

## Task 5: Add `LifetimeLimitError` + lifetime check in upload handler

**Files:**
- Modify: `app/api/guest/upload/route.ts` (cijeli handler re-written)

- [ ] **Step 1: Dodaj LifetimeLimitError klasu i konstantu**

U `app/api/guest/upload/route.ts`, odmah poslije postojeće `LimitExceededError` klase (oko linije 34-39), dodaj:

```ts
class LifetimeLimitError extends Error {
  constructor(public lifetimeUsed: number, public attempted: number, public limit: number) {
    super(`Lifetime upload limit: used ${lifetimeUsed}, adding ${attempted}, limit ${limit}`);
    this.name = 'LifetimeLimitError';
  }
}
```

I iznad postojećeg `const ALLOWED_FORMATS = ...` dodaj:

```ts
// Lifetime cap is 2× the tier's active image limit — a guest can re-upload
// once after a full gallery wipe, but not loop forever.
const LIFETIME_MULTIPLIER = 2;
```

- [ ] **Step 2: Izračunaj `LIFETIME_LIMIT` u POST-u**

U `app/api/guest/upload/route.ts`, u `POST` funkciji, poslije linije gdje se definira `const MAX_IMAGES = guestSession.event.imageLimit || 10;`, dodaj:

```ts
const LIFETIME_LIMIT = MAX_IMAGES * LIFETIME_MULTIPLIER;
```

- [ ] **Step 3: Ubaci lifetime check i inkrement u postojeću `$transaction`**

U istom fajlu, pronađi postojeći `prisma.$transaction` blok (oko linija 212-223) i proširi ga. Stara verzija:

```ts
await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
  const existing = await tx.image.count({ where: { guestId } });
  if (existing + processedUploads.length > MAX_IMAGES) {
    throw new LimitExceededError(existing, processedUploads.length, MAX_IMAGES);
  }
  for (const { imageUrl, publicId } of processedUploads) {
    await tx.image.create({
      data: { guestId, imageUrl, storagePath: publicId },
    });
  }
});
```

Zamijeni sa:

```ts
await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
  // Lifetime gate first: once you've burned through 2× the tier, no
  // amount of deleting will free more slots.
  const guestRow = await tx.guest.findUnique({
    where: { id: guestId },
    select: { lifetimeUploadCount: true },
  });
  const lifetimeUsed = guestRow?.lifetimeUploadCount ?? 0;
  if (lifetimeUsed + processedUploads.length > LIFETIME_LIMIT) {
    throw new LifetimeLimitError(lifetimeUsed, processedUploads.length, LIFETIME_LIMIT);
  }

  // Active gallery cap.
  const existing = await tx.image.count({ where: { guestId } });
  if (existing + processedUploads.length > MAX_IMAGES) {
    throw new LimitExceededError(existing, processedUploads.length, MAX_IMAGES);
  }

  for (const { imageUrl, publicId } of processedUploads) {
    await tx.image.create({
      data: { guestId, imageUrl, storagePath: publicId },
    });
  }

  // Monotonic increment. Delete never decrements this.
  await tx.guest.update({
    where: { id: guestId },
    data: { lifetimeUploadCount: { increment: processedUploads.length } },
  });
});
```

- [ ] **Step 4: Dodaj error branch za LifetimeLimitError u outer catch**

U istom fajlu, u `catch (err)` bloku poslije `await rollbackCloudinary(...)` poziva (oko linije 249), prije `if (err instanceof LimitExceededError)` branch-a, ubaci:

```ts
if (err instanceof LifetimeLimitError) {
  return NextResponse.json(
    {
      error: `Dosegli ste ukupan limit upload-a za ovaj event (${err.limit} slika). Već ste poslali ${err.lifetimeUsed}, a pokušavate dodati ${err.attempted} više. Brisanje postojećih slika ne vraća ovaj limit.`,
      failed: failed.map((f) => ({ filename: f.filename, error: f.error })),
    },
    { status: 400 }
  );
}
```

- [ ] **Step 5: TS check**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 grešaka.

---

## Task 6: Remove IP-based rate limit from upload handler

**Files:**
- Modify: `app/api/guest/upload/route.ts`

- [ ] **Step 1: Ukloni rate limit state**

U `app/api/guest/upload/route.ts`, na vrhu, ukloni cijeli blok (linije ~11-24 oko):

```ts
// Per-IP rate limit for uploads. App Router does not honour the legacy
// `export const config = { api: { bodyParser: { sizeLimit } } }` — size is
// enforced below via the Content-Length header.
declare global {
  var __guestUploadAttempts: Map<string, number[]> | undefined;
}
const uploadAttempts: Map<string, number[]> = globalThis.__guestUploadAttempts || new Map();
globalThis.__guestUploadAttempts = uploadAttempts;
// Each image is its own POST, so the cap has to accommodate batch uploads +
// retries. Premium tier allows 50 images → 50 POSTs in a batch, plus some
// room for individual retries on transient failures. 100/5min fits.
const UPLOAD_MAX = 100;
const UPLOAD_WINDOW_MS = 5 * 60 * 1000;
const UPLOAD_RATE_LIMIT_ENABLED = process.env.NODE_ENV !== 'development';
```

Zamijeni komentarem koji pojašnjava novu politiku:

```ts
// Per-guest lifetime counter (Guest.lifetimeUploadCount) replaces the
// former IP rate limit. Upload is an authenticated endpoint — throttling
// the authenticated subject is both fairer and more effective than
// bucketing by IP, and it survives the guest moving between Wi-Fi/mobile
// networks during a single event.
```

- [ ] **Step 2: Ukloni rate limit branch u POST-u**

U istom fajlu, u `POST` funkciji, ukloni cijeli blok (linije ~146-160 oko):

```ts
// Per-IP rate limit. Disabled in development so heavy local testing
// doesn't hit the cap; the in-memory state wouldn't survive a server
// restart there anyway, so a bypass is equivalent.
if (UPLOAD_RATE_LIMIT_ENABLED) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const recent = (uploadAttempts.get(ip) || []).filter((ts) => now - ts < UPLOAD_WINDOW_MS);
  if (recent.length >= UPLOAD_MAX) {
    return NextResponse.json(
      { error: "Previše upload zahtjeva. Pokušajte ponovo za nekoliko minuta." },
      { status: 429 }
    );
  }
  uploadAttempts.set(ip, [...recent, now]);
}
```

Nakon uklanjanja, "Auth" sekcija (`const guestSession = await getAuthenticatedGuest();`) mora dolaziti odmah nakon body size cap-a.

- [ ] **Step 3: TS check + build**

Run:
```bash
npx tsc --noEmit
rm -rf .next && pnpm build 2>&1 | tail -5
```
Expected: TS 0 grešaka, build uspješan.

---

## Task 7: Unit tests za lifetime cap (TDD)

**Files:**
- Create: `__tests__/api/upload-lifetime-limit.test.ts`
- Modify: `__tests__/api/upload-atomic-count.test.ts` (dodati mock-ove za nova Prisma polja)

- [ ] **Step 1: Prvo — updatuj postojeći `upload-atomic-count.test.ts` da mock prisma pokriva nova polja**

Otvori `__tests__/api/upload-atomic-count.test.ts`. Pronađi `jest.mock('@/lib/prisma', ...)` blok (vrh fajla). Trenutno sadrži:

```ts
jest.mock('@/lib/prisma', () => ({
  prisma: {
    image: {
      count: jest.fn(),
      create: jest.fn(),
    },
    message: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
```

Zamijeni sa (dodaje `guest.findUnique` i `guest.update`):

```ts
jest.mock('@/lib/prisma', () => ({
  prisma: {
    image: {
      count: jest.fn(),
      create: jest.fn(),
    },
    guest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    message: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
```

U istom fajlu, pronađi `const mocks = { ... }` objekt i dodaj:

```ts
guestFindUnique: prisma.guest.findUnique as Mocked,
guestUpdate: prisma.guest.update as Mocked,
```

U `beforeEach` bloku, poslije postojećeg `mocks.getGuest.mockResolvedValue(...)` poziva, dodaj:

```ts
mocks.guestFindUnique.mockResolvedValue({ lifetimeUploadCount: 0 });
mocks.guestUpdate.mockResolvedValue({ id: 'guest-1' });
```

I promijeni `mocks.transaction.mockImplementation` da proxy-uje i nove metode:

```ts
mocks.transaction.mockImplementation(async (fn: any) =>
  fn({
    image: { count: mocks.imageCount, create: mocks.imageCreate },
    guest: { findUnique: mocks.guestFindUnique, update: mocks.guestUpdate },
  })
);
```

- [ ] **Step 2: Run postojeće testove i potvrdi prolaze**

Run:
```bash
pnpm test:unit -- upload-atomic-count
```
Expected: 4 testa PASS (ista kao prije, samo sad mock pokriva nova polja).

- [ ] **Step 3: Kreiraj novi test fajl**

Kreiraj `__tests__/api/upload-lifetime-limit.test.ts`:

```ts
/**
 * @jest-environment node
 *
 * Verifies the lifetime upload cap: a guest cannot exceed event.imageLimit * 2
 * uploads across the lifetime of the event, regardless of how many they've
 * deleted. Deletes drop active gallery count but not the lifetime counter.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    image: {
      count: jest.fn(),
      create: jest.fn(),
    },
    guest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    message: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/guest-auth', () => ({
  getAuthenticatedGuest: jest.fn(),
}));

jest.mock('@/lib/cloudinary', () => ({
  __esModule: true,
  default: {
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn((id: string, cb: (err: unknown) => void) => cb(null)),
    },
  },
}));

jest.mock('sharp', () => {
  const instance = {
    metadata: jest.fn().mockResolvedValue({ format: 'jpeg' }),
    rotate: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('optimized')),
  };
  return jest.fn(() => instance);
});

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: (name: string) =>
      name === 'csrf_token_guest_upload' ? { value: 'test-token' } : undefined,
  }),
}));

import { POST } from '@/app/api/guest/upload/route';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedGuest } from '@/lib/guest-auth';
import cloudinary from '@/lib/cloudinary';

type Mocked = jest.MockedFunction<any>;
const mocks = {
  transaction: prisma.$transaction as Mocked,
  imageCount: prisma.image.count as Mocked,
  imageCreate: prisma.image.create as Mocked,
  guestFindUnique: prisma.guest.findUnique as Mocked,
  guestUpdate: prisma.guest.update as Mocked,
  getGuest: getAuthenticatedGuest as Mocked,
  cloudinaryUploadStream: cloudinary.uploader.upload_stream as Mocked,
  cloudinaryDestroy: cloudinary.uploader.destroy as Mocked,
};

function buildRequest(files: Array<{ name: string }>): Request {
  const form = new FormData();
  for (const f of files) {
    const bytes = new Uint8Array(1024);
    form.append('images', new File([bytes], f.name, { type: 'image/jpeg' }));
  }
  return new Request('http://localhost/api/guest/upload', {
    method: 'POST',
    headers: {
      'x-csrf-token': 'test-token',
      'x-forwarded-for': '1.2.3.4',
      'content-length': '1024',
    },
    body: form as any,
  });
}

beforeEach(() => {
  jest.clearAllMocks();

  // Tier limit = 25 → lifetime cap = 50.
  mocks.getGuest.mockResolvedValue({
    id: 'guest-1',
    event: { imageLimit: 25 },
  });

  let counter = 0;
  mocks.cloudinaryUploadStream.mockImplementation((_opts: any, cb: any) => ({
    end: () => {
      counter += 1;
      cb(undefined, {
        secure_url: `https://cdn.example/img-${counter}.jpg`,
        public_id: `wedding-app/pub-${counter}`,
      });
    },
  }));

  mocks.imageCount.mockResolvedValue(0);
  mocks.guestUpdate.mockResolvedValue({ id: 'guest-1' });
  mocks.imageCreate.mockImplementation(async ({ data }: any) => ({ id: 'img', ...data }));

  mocks.transaction.mockImplementation(async (fn: any) =>
    fn({
      image: { count: mocks.imageCount, create: mocks.imageCreate },
      guest: { findUnique: mocks.guestFindUnique, update: mocks.guestUpdate },
    })
  );
});

describe('POST /api/guest/upload — lifetime cap', () => {
  it('accepts upload when lifetimeUsed + new ≤ 2× tier', async () => {
    // 40 used + 5 new = 45 ≤ 50. Active count 0, so active cap also fine.
    mocks.guestFindUnique.mockResolvedValue({ lifetimeUploadCount: 40 });

    const res = await POST(
      buildRequest([
        { name: '1.jpg' }, { name: '2.jpg' }, { name: '3.jpg' }, { name: '4.jpg' }, { name: '5.jpg' },
      ]) as any
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.uploaded).toBe(5);
    expect(mocks.guestUpdate).toHaveBeenCalledWith({
      where: { id: 'guest-1' },
      data: { lifetimeUploadCount: { increment: 5 } },
    });
  });

  it('rejects when lifetimeUsed + new > 2× tier and rolls back Cloudinary', async () => {
    // 48 used + 5 new = 53 > 50.
    mocks.guestFindUnique.mockResolvedValue({ lifetimeUploadCount: 48 });

    const res = await POST(
      buildRequest([
        { name: '1.jpg' }, { name: '2.jpg' }, { name: '3.jpg' }, { name: '4.jpg' }, { name: '5.jpg' },
      ]) as any
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/ukupan limit upload-a/);
    expect(mocks.imageCreate).not.toHaveBeenCalled();
    expect(mocks.guestUpdate).not.toHaveBeenCalled();
    // Cloudinary uploads happen in phase 1, before the transaction — they
    // must be cleaned up when the TX aborts.
    expect(mocks.cloudinaryDestroy).toHaveBeenCalledTimes(5);
  });

  it('does not decrement the lifetime counter on a successful upload', async () => {
    // Regression guard — a bug where DELETE or errors accidentally decremented
    // lifetimeUploadCount would defeat the whole anti-abuse mechanism.
    mocks.guestFindUnique.mockResolvedValue({ lifetimeUploadCount: 10 });

    await POST(buildRequest([{ name: 'a.jpg' }, { name: 'b.jpg' }]) as any);

    const updateCalls = mocks.guestUpdate.mock.calls;
    expect(updateCalls).toHaveLength(1);
    const updateArg = updateCalls[0][0];
    // Only an `increment` operation is allowed — never a `decrement` or a
    // direct number that could go backwards.
    expect(updateArg.data.lifetimeUploadCount).toHaveProperty('increment');
    expect(updateArg.data.lifetimeUploadCount).not.toHaveProperty('decrement');
    expect(updateArg.data.lifetimeUploadCount.increment).toBe(2);
  });
});
```

- [ ] **Step 4: Run new test**

Run:
```bash
pnpm test:unit -- upload-lifetime-limit
```
Expected: 3 testa PASS.

- [ ] **Step 5: Run full suite**

Run:
```bash
pnpm test:unit
```
Expected: **56 passed, 56 total** (prethodnih 53 + 3 nova).

---

## Task 8: Verify + commit + push

**Files:** none (release operation)

- [ ] **Step 1: Full local verify**

Run:
```bash
rm -rf .next
pnpm build
pnpm lint
pnpm test:unit
pnpm audit --prod --audit-level=high
```
Expected:
- Build: uspjeh
- Lint: samo pre-existing warning iz `CanvasRenderer.tsx` (postojeći, nije novi)
- Tests: 56 PASS
- Audit: exit 0

- [ ] **Step 2: Pregledaj diff**

Run:
```bash
git status
git diff --stat
```
Expected: izmjene u 5 fajlova:
- `prisma/schema.prisma` (1 novo polje u Guest)
- `prisma/migrations/20260419_add_guest_lifetime_upload_count/migration.sql` (new)
- `app/api/guest/upload/route.ts` (modified — remove IP limit, add lifetime)
- `__tests__/api/upload-atomic-count.test.ts` (mock polja)
- `__tests__/api/upload-lifetime-limit.test.ts` (new)

- [ ] **Step 3: Commit + push**

Run:
```bash
git add \
  prisma/schema.prisma \
  prisma/migrations/20260419_add_guest_lifetime_upload_count \
  app/api/guest/upload/route.ts \
  __tests__/api/upload-atomic-count.test.ts \
  __tests__/api/upload-lifetime-limit.test.ts

git commit -m "$(cat <<'EOF'
feat(guest-upload): per-guest lifetime cap replaces IP rate limit

Adds Guest.lifetimeUploadCount, a monotonically increasing counter of
images ever uploaded by a guest to a given event. The upload handler
rejects requests when lifetimeUploadCount + new > event.imageLimit * 2.
Deletes reduce the active gallery count but never decrement this
counter, so an upload/delete loop cannot evade the cap — a Basic-tier
guest (limit 25) can upload 50 images in total across the event's
lifetime, which covers one full remorse round.

The IP rate limit (100/5min) is removed. Upload is authenticated, so
throttling the authenticated subject is both fairer (no collateral on
shared Wi-Fi) and more effective (survives the guest moving between
networks mid-event). The Guest.* counter plays the same role and
persists across server restarts, unlike the in-memory Map we deleted.

Migration backfills existing guests: lifetimeUploadCount is set to
each guest's current Image count so no one is retroactively blocked.
A CHECK constraint guards against negative values at the DB level.

Tests:
- upload-lifetime-limit.test.ts: new. Covers happy path (lifetime+new
  fits), rejection + Cloudinary rollback when cap hit, and a regression
  guard that the counter never decrements on successful upload.
- upload-atomic-count.test.ts: prisma mock updated to include
  guest.findUnique/update; existing 4 tests still pass.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push
```

Expected: push uspješan, PR #4 se automatski ažurira sa novim commit-om.

---

## Verifikacija (end-to-end, nakon push-a)

```bash
# 1. CI status
gh pr checks 4
# Expected: build-and-test PASS, e2e PASS

# 2. Manual QA na 3001 (user)
# - Upload do tier limita (npr. 25 na basic)
# - Delete 10 slika
# - Upload 10 novih → mora proći (lifetime 25+10=35 < 50)
# - Upload 15 novih više → 50/50, dozvoljeno
# - Pokušaj 51. upload → server vraća "Dosegli ste ukupan limit..."
# - Delete 20 slika → gallery 5/25, ali lifetime zaglavljen na 50/50
# - Pokušaj bilo kojeg dalje upload-a → BLOK poruka

# 3. DB sanity
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
const p = new PrismaClient().\$extends(withAccelerate());
const g = await p.guest.findFirst({ where: { email: 'nmil32@icloud.com' }, select: { lifetimeUploadCount: true, _count: { select: { images: true } } } });
console.log(g);
" 2>&1 | tail -5
# Expected: lifetimeUploadCount je >= _count.images (inkrementirano pri upload-u,
# nepromijenjeno pri delete-u)
```

## Followups (out of scope)

- **UI disclosure** — prikazati guest-u koliko lifetime slot-ova ostaje (npr. "Preostalo 23/50 ukupno"). Korisno UX, ali zahtijeva dodatni API endpoint + client state. Odvojen plan.
- **Admin override** — admin bi trebao moći resetovati lifetime counter za guest-a (npr. ako gost ima tehnički problem). Endpoint + dashboard UI. Odvojen plan.
- **Per-tier multiplier** — trenutno hardcoded 2× za sve tier-ove. Moglo bi biti configurable u `lib/pricing-tiers.ts` (npr. free=3×, premium=1.5×). Samo ako bude stvaran feedback.
- **Redis za rate limit** — ako se u budućnosti uvede npr. login endpoint sa strožim rate limit-om, Redis backed state umjesto in-memory Map. Drugi deo aplikacije.
