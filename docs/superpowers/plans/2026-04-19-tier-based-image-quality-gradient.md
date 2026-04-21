# Tier-Based Image Quality Gradient Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Povezati kvalitet upload-a sa pricing tier-om (free/basic = compressed, premium/unlimited = original), proširiti pricing UI da to eksplicitno prikaže, i snimiti tier snapshot na svaku uploadovanu sliku.

**Architecture:** Dodaje se 3 polja na `PricingPlan` (client resize params + store-original flag) i 1 polje na `Image` (tier snapshot). `lib/pricing-tiers.ts` config je single source of truth sa novim helper-ima. Upload handler primjenjuje Cloudinary `{quality:auto}{fetch_format:auto}` transformaciju samo kada `storeOriginal=false`. Klijent `Upload-Form` prima tier kao prop (server-side render passes it from `event.pricingTier`) i skalira `resizeImage` parametre.

**Tech Stack:** Next.js 15 App Router, Prisma 6 (PostgreSQL), Tailwind + shadcn/ui, react-i18next, Jest (ts-jest + jsdom), Cloudinary Node SDK.

**Spec:** [docs/superpowers/specs/2026-04-19-tier-based-image-quality-gradient-design.md](docs/superpowers/specs/2026-04-19-tier-based-image-quality-gradient-design.md)

---

## File structure

| Fajl | Akcija | Responsibility |
|---|---|---|
| `lib/pricing-tiers.ts` | Modify | TierConfig + PRICING_TIERS sa 3 nova polja; `getClientResizeParams` + `getQualityLabel` helperi |
| `prisma/schema.prisma` | Modify | `PricingPlan` + `Image` schema dopune |
| **NEW** `prisma/migrations/20260419_add_tier_quality_fields/migration.sql` | Create | ALTER TABLE za oba modela |
| `prisma/seed.ts` | Modify | Push novih polja u `PricingPlan` upsert |
| `app/api/guest/upload/route.ts` | Modify | `uploadToCloudinary(buf, tier)` conditional transformation + `image.create data.tier` |
| `app/api/pricing/route.ts` | Modify | Response exposure novih polja |
| `components/guest/Upload-Form.tsx` | Modify | Dodaje `tier` prop, dinamički resize, helper text za premium/unlimited |
| `components/guest/DashboardClient.tsx` | Modify | Dodaje `tier` prop, prosljeđuje do UploadForm-a |
| `app/guest/dashboard/page.tsx` | Modify | Čita `event.pricingTier`, prosljeđuje kao prop |
| `app/guest/success/page.tsx` | Modify | Isto ako koristi UploadForm (provjeriti) |
| `components/landingPage/Pricing.tsx` | Modify | 4 metrike, Sparkles ikona za quality |
| `components/admin/PricingTierSelector.tsx` | Modify | Quality info red |
| `components/admin/EventTierBadge.tsx` | Modify | Quality feature u listi |
| `locales/sr/translation.json` | Modify | Novi pricing.quality.* + admin.event.pricing.qualityInfo.* ključevi |
| `locales/en/translation.json` | Modify | Isto EN |
| **NEW** `__tests__/pricing-tiers.test.ts` | Create | Testovi za `getClientResizeParams` + `getQualityLabel` |
| `__tests__/api/upload-atomic-count.test.ts` | Modify | Mock update za `image.create` da prihvata `tier` polje + test da transformation-a nema za premium |
| **NEW** `__tests__/api/upload-quality-gradient.test.ts` | Create | Po jedan test za svaki tier: Cloudinary upload-ov options prima ili ne prima `transformation` |
| `CLAUDE.md` | Modify | Photo pipeline sekcija refresh |
| **MODIFY** `claudedocs/pricing-tiers-plan.md` | Modify | Nova politika quality gradient-a |

---

## Task 1: Pre-flight branch check

**Files:** none

- [ ] **Step 1: Potvrdi grani + clean tree**

Run:
```bash
git status
git branch --show-current
```
Expected: branch `feat/guest-gallery-lightbox` (stacked na reliability+gallery work), working tree clean poslije spec commit-a `d4f87a2`.

---

## Task 2: Extend `lib/pricing-tiers.ts` config + helpers

**Files:**
- Modify: `lib/pricing-tiers.ts`

- [ ] **Step 1: Dodaj 3 nova polja u `TierConfig` interface**

U `lib/pricing-tiers.ts` linije 11-23, zamijeni interface sa:

```ts
export interface TierConfig {
  name: {
    sr: string;
    en: string;
  };
  imageLimit: number;
  guestLimit: number;
  storageDays: number;
  price: number; // in cents (0 for free)
  /** Max width for client-side canvas resize. 0 = no resize. */
  clientResizeMaxWidth: number;
  /** Canvas.toBlob quality param (0.0–1.0). */
  clientQuality: number;
  /**
   * If true, Cloudinary upload runs WITHOUT transformation so the
   * original is stored. If false, upload applies q_auto+f_auto and
   * the stored asset is the compressed derivative.
   */
  storeOriginal: boolean;
  features: TierFeature[];
  limitations?: TierFeature[];
  recommended?: boolean;
}
```

- [ ] **Step 2: Dopuni `PRICING_TIERS` sa quality poljima po tier-u**

U istom fajlu, linije 26-90, zamijeni PRICING_TIERS tako da svaki tier ima 3 nova polja odmah poslije `price`. Tačne vrijednosti:

```ts
export const PRICING_TIERS: Record<PricingTier, TierConfig> = {
  free: {
    name: { sr: 'Besplatno', en: 'Free' },
    imageLimit: 10,
    guestLimit: 20,
    storageDays: 10,
    price: 0,
    clientResizeMaxWidth: 1280,
    clientQuality: 0.85,
    storeOriginal: false,
    features: [
      { sr: 'Do 10 slika po gostu', en: 'Up to 10 images per guest' },
      { sr: 'Maksimalno 20 gostiju', en: 'Up to 20 guests' },
      { sr: 'Slike se čuvaju 10 dana', en: 'Photos stored for 10 days' },
      { sr: 'Standardni kvalitet (do 1280px)', en: 'Standard quality (up to 1280px)' },
      { sr: 'Standardni QR kod', en: 'Standard QR code' },
      { sr: 'Galerija fotografija', en: 'Photo gallery' },
      { sr: 'Preuzimanje svih slika', en: 'Download all images' },
    ],
  },
  basic: {
    name: { sr: 'Osnovno', en: 'Basic' },
    imageLimit: 25,
    guestLimit: 100,
    storageDays: 30,
    price: 1999,
    clientResizeMaxWidth: 1600,
    clientQuality: 0.9,
    storeOriginal: false,
    features: [
      { sr: 'Do 25 slika po gostu', en: 'Up to 25 images per guest' },
      { sr: 'Do 100 gostiju', en: 'Up to 100 guests' },
      { sr: 'Slike se čuvaju 30 dana', en: 'Photos stored for 30 days' },
      { sr: 'Visok kvalitet (do 1600px)', en: 'High quality (up to 1600px)' },
      { sr: 'Prilagođen QR kod', en: 'Custom QR code' },
      { sr: 'Prioritetna podrška', en: 'Priority support' },
    ],
    recommended: true,
  },
  premium: {
    name: { sr: 'Premium', en: 'Premium' },
    imageLimit: 50,
    guestLimit: 300,
    storageDays: 365,
    price: 3999,
    clientResizeMaxWidth: 2560,
    clientQuality: 0.95,
    storeOriginal: true,
    features: [
      { sr: 'Do 50 slika po gostu', en: 'Up to 50 images per guest' },
      { sr: 'Do 300 gostiju', en: 'Up to 300 guests' },
      { sr: 'Slike se čuvaju 1 godinu', en: 'Photos stored for 1 year' },
      { sr: 'Vrlo visok kvalitet (do 2560px, idealno za A4 štampu)', en: 'Very high quality (up to 2560px, great for A4 print)' },
      { sr: 'Napredni QR kod', en: 'Advanced QR code' },
      { sr: 'Prilagođen brending', en: 'Custom branding' },
      { sr: 'Prilagođene poruke', en: 'Custom messages' },
      { sr: 'Dedicirana podrška', en: 'Dedicated support' },
    ],
    recommended: false,
  },
  unlimited: {
    name: { sr: 'Neograničeno', en: 'Unlimited' },
    imageLimit: 999,
    guestLimit: 9999,
    storageDays: 365,
    price: 5999,
    clientResizeMaxWidth: 0,
    clientQuality: 1.0,
    storeOriginal: true,
    features: [
      { sr: 'Neograničen broj slika po gostu', en: 'Unlimited images per guest' },
      { sr: 'Neograničen broj gostiju', en: 'Unlimited guests' },
      { sr: 'Slike se čuvaju 1 godinu', en: 'Photos stored for 1 year' },
      { sr: 'Originalan kvalitet i rezolucija (arhiva, štampa do A3)', en: 'Original quality and resolution (archive, A3 print)' },
      { sr: 'Napredni QR kod', en: 'Advanced QR code' },
      { sr: 'Prilagođen brending', en: 'Custom branding' },
      { sr: 'Dedicirana podrška', en: 'Dedicated support' },
    ],
    recommended: false,
  },
};
```

- [ ] **Step 3: Dodaj nove helper funkcije**

U istom fajlu, poslije `isValidTier` funkcije (kraj fajla), dodaj:

```ts
/**
 * Client-side resize params per tier. `maxWidth: 0` znači bez resize-a.
 */
export function getClientResizeParams(tier: PricingTier): {
  maxWidth: number;
  quality: number;
} {
  const config = PRICING_TIERS[tier] ?? PRICING_TIERS.free;
  return {
    maxWidth: config.clientResizeMaxWidth,
    quality: config.clientQuality,
  };
}

/**
 * Kombinovana fraza za quality+resolution (landing card + admin selector).
 */
export function getQualityLabel(tier: PricingTier, language: 'sr' | 'en' = 'sr'): string {
  const labels: Record<PricingTier, { sr: string; en: string }> = {
    free: {
      sr: 'Standard (do 1280px)',
      en: 'Standard (up to 1280px)',
    },
    basic: {
      sr: 'Visok kvalitet (do 1600px)',
      en: 'High quality (up to 1600px)',
    },
    premium: {
      sr: 'Vrlo visok (do 2560px)',
      en: 'Very high (up to 2560px)',
    },
    unlimited: {
      sr: 'Original (puna rezolucija)',
      en: 'Original (full resolution)',
    },
  };
  return (labels[tier] ?? labels.free)[language];
}
```

- [ ] **Step 4: TS typecheck**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 grešaka.

---

## Task 3: Update Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Proširi `PricingPlan` model**

U `prisma/schema.prisma`, linije 28-42, u `PricingPlan` modelu, dodaj 3 polja odmah poslije `price`:

```prisma
model PricingPlan {
  id                   String      @id @default(uuid())
  tier                 PricingTier @unique
  nameSr               String
  nameEn               String
  imageLimit           Int
  price                Int         @default(0)    // cijena u centima (0 = besplatno)
  /// Max width for client-side canvas resize. 0 = no resize (unlimited tier).
  clientResizeMaxWidth Int         @default(1280)
  /// Canvas.toBlob quality parameter (0.0–1.0).
  clientQuality        Float       @default(0.85)
  /// If true, Cloudinary upload runs WITHOUT transformation so the
  /// original is stored. Admin ZIP download returns the original.
  storeOriginal        Boolean     @default(false)
  recommended          Boolean     @default(false)
  sortOrder            Int         @default(0)
  active               Boolean     @default(true)
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt
  features             PricingFeature[]
}
```

- [ ] **Step 2: Proširi `Image` model sa `tier` snapshot**

U istom fajlu, linije 148-158 ili gdje je `Image` model, dopuni:

```prisma
model Image {
  id          String       @id @default(uuid())
  guestId     String
  imageUrl    String
  storagePath String?
  /// Snapshot of event.pricingTier at upload time. Captures whether this
  /// image was stored as a compressed derivative (free/basic) or original
  /// (premium/unlimited). Null for pre-migration legacy rows.
  tier        PricingTier?
  createdAt   DateTime     @default(now())
  guest       Guest        @relation(fields: [guestId], references: [id])

  @@index([guestId, createdAt(sort: Desc)])
  @@index([createdAt])
}
```

- [ ] **Step 3: Regeneriši Prisma client types**

Run:
```bash
npx prisma generate --no-engine
```
Expected: `✔ Generated Prisma Client ...` uspjeh.

- [ ] **Step 4: TS typecheck**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 grešaka — ostatak koda još ne koristi nova polja, ali typecheck prolazi.

---

## Task 4: Create migration SQL

**Files:**
- Create: `prisma/migrations/20260419_add_tier_quality_fields/migration.sql`

- [ ] **Step 1: Kreiraj migration direktorij**

Run:
```bash
mkdir -p prisma/migrations/20260419_add_tier_quality_fields
```

- [ ] **Step 2: Napiši migration SQL**

Kreiraj `prisma/migrations/20260419_add_tier_quality_fields/migration.sql`:

```sql
-- Tier-based image quality gradient: adds resize/quality params to
-- PricingPlan and a tier snapshot to Image. Idempotent — safe to re-run.

-- PricingPlan: client-side resize/quality config + storeOriginal flag.
ALTER TABLE "PricingPlan"
  ADD COLUMN IF NOT EXISTS "clientResizeMaxWidth" INTEGER NOT NULL DEFAULT 1280;
ALTER TABLE "PricingPlan"
  ADD COLUMN IF NOT EXISTS "clientQuality" DOUBLE PRECISION NOT NULL DEFAULT 0.85;
ALTER TABLE "PricingPlan"
  ADD COLUMN IF NOT EXISTS "storeOriginal" BOOLEAN NOT NULL DEFAULT false;

-- Image: snapshot of the tier that was active when this image was uploaded.
-- Nullable: legacy rows predate the column and their tier is unknown.
ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "tier" "PricingTier";

-- Sanity CHECK constraints.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PricingPlan_clientQuality_range') THEN
    ALTER TABLE "PricingPlan" ADD CONSTRAINT "PricingPlan_clientQuality_range"
      CHECK ("clientQuality" >= 0.0 AND "clientQuality" <= 1.0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PricingPlan_resizeWidth_nonneg') THEN
    ALTER TABLE "PricingPlan" ADD CONSTRAINT "PricingPlan_resizeWidth_nonneg"
      CHECK ("clientResizeMaxWidth" >= 0);
  END IF;
END $$;
```

- [ ] **Step 3: Verify file**

Run:
```bash
cat prisma/migrations/20260419_add_tier_quality_fields/migration.sql | head -10
```
Expected: prvi ALTER TABLE za `PricingPlan clientResizeMaxWidth`.

---

## Task 5: Apply migration (HUMAN CONFIRMATION GATE)

**Files:** none (DB operation)

⚠️ **Migration ide protiv produkcijske Prisma Postgres baze** (isti URL koji koristi Vercel prod).

- [ ] **Step 1: Prikaži pending migration**

Run:
```bash
npx prisma migrate status 2>&1 | tail -10
```
Expected: `20260419_add_tier_quality_fields` u listi pending.

- [ ] **Step 2: TRAŽI EKSPLICITNU POTVRDU OD KORISNIKA PRIJE APPLY-A**

Engineer: prikaži korisniku SQL iz Task 4 Step 2, pitaj *"Mogu li pokrenuti `npx prisma migrate deploy`?"*. Čekaj eksplicitno "da".

Ako odgovor nije "da" → **ZAUSTAVI** izvršavanje plana.

- [ ] **Step 3: Apply migration**

Run:
```bash
npx prisma migrate deploy 2>&1 | tail -10
```
Expected: `Applied migration 20260419_add_tier_quality_fields`.

- [ ] **Step 4: Verifikuj schema**

Run:
```bash
npx tsx -e '
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
async function main() {
  const p = new PrismaClient().$extends(withAccelerate());
  const plans = await p.pricingPlan.findMany({ select: { tier: true, clientResizeMaxWidth: true, clientQuality: true, storeOriginal: true } });
  console.log(JSON.stringify(plans, null, 2));
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
' 2>&1 | tail -30
```
Expected: 4 plana, sva sa default vrijednostima (`clientResizeMaxWidth: 1280, clientQuality: 0.85, storeOriginal: false`). Seed (Task 6) će ih ažurirati.

---

## Task 6: Seed `PricingPlan` sa novim poljima

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Dodaj nova polja u `planData` u `seed.ts`**

Otvori `prisma/seed.ts`. Pronađi `planData` objekat (gdje `imageLimit: config.imageLimit` je). Dodaj 3 nova polja:

```ts
const planData = {
  nameSr: config.name.sr,
  nameEn: config.name.en,
  imageLimit: config.imageLimit,
  clientResizeMaxWidth: config.clientResizeMaxWidth,
  clientQuality: config.clientQuality,
  storeOriginal: config.storeOriginal,
  price: config.price,
  recommended: config.recommended ?? false,
  sortOrder: sortOrder[tier] ?? 99,
  active: true,
};
```

`planData` se koristi i u `update` i `create` path-u `prisma.pricingPlan.upsert` — oba pick up novih polja automatski.

- [ ] **Step 2: Pokreni seed protiv prod DB-a**

Run:
```bash
npx tsx prisma/seed.ts 2>&1 | tail -10
```
Expected: `✓ free: imageLimit=10, price=0` itd. za sva 4 tier-a. Seed je idempotentan — update path-om postavlja nova polja.

- [ ] **Step 3: Verify**

Run:
```bash
npx tsx -e '
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
async function main() {
  const p = new PrismaClient().$extends(withAccelerate());
  const plans = await p.pricingPlan.findMany({ select: { tier: true, clientResizeMaxWidth: true, clientQuality: true, storeOriginal: true }, orderBy: { sortOrder: "asc" } });
  console.log(JSON.stringify(plans, null, 2));
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
' 2>&1 | tail -30
```
Expected: free=1280/0.85/false, basic=1600/0.9/false, premium=2560/0.95/true, unlimited=0/1.0/true.

---

## Task 7: Upload handler — tier-conditional Cloudinary + Image.tier snapshot

**Files:**
- Modify: `app/api/guest/upload/route.ts`

- [ ] **Step 1: Update `uploadToCloudinary` da prima tier i primjenjuje conditional transformation**

U `app/api/guest/upload/route.ts`, pronađi `uploadToCloudinary` funkciju (oko linija 63-82). Zamijeni CIJELU funkciju:

```ts
async function uploadToCloudinary(
  buffer: Buffer,
  tier: PricingTier
): Promise<{ url: string; publicId: string }> {
  const { PRICING_TIERS } = await import('@/lib/pricing-tiers');
  const config = PRICING_TIERS[tier] ?? PRICING_TIERS.free;

  const uploadOptions: Parameters<typeof cloudinary.uploader.upload_stream>[0] = {
    folder: 'wedding-app',
    resource_type: 'image',
    tags: ['wedding-app', 'guest-upload'],
  };

  // Apply q_auto + f_auto ONLY when the tier wants a compressed stored
  // derivative. Premium/unlimited skip this so the stored asset is the
  // original; admin ZIP download fetches the same URL and therefore
  // receives the original back.
  if (!config.storeOriginal) {
    uploadOptions.transformation = [
      { quality: "auto" },
      { fetch_format: "auto" },
    ];
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) return reject(error || new Error('Cloudinary upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}
```

Takođe dodaj import na vrh ako nije tamo:
```ts
import type { PricingTier } from '@/lib/pricing-tiers';
```

- [ ] **Step 2: Pass tier kroz `processImage`**

U istom fajlu, pronađi `processImage` (oko linija 85-110). Dopuni signature i prosljeđivanje:

```ts
async function processImage(image: File, tier: PricingTier): Promise<ProcessResult> {
  const filename = image.name;
  try {
    if (image.size > MAX_IMAGE_BYTES) {
      return { ok: false, filename, error: `Slika ${filename} je veća od 10MB.` };
    }
    const buffer = Buffer.from(await image.arrayBuffer());

    const meta = await sharp(buffer).metadata();
    if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
      return { ok: false, filename, error: `Fajl ${filename} nije podržan format slike.` };
    }

    const optimized = await sharp(buffer).rotate().toBuffer();

    const { url, publicId } = await uploadToCloudinary(optimized, tier);
    return { ok: true, upload: { filename, imageUrl: url, publicId } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nepoznata greška';
    return { ok: false, filename, error: msg };
  }
}
```

- [ ] **Step 3: Prosljeđi tier u `Promise.all(images.map(processImage))`**

U istom fajlu, u POST handleru, pronađi `const results = await Promise.all(images.map(processImage));` (oko linije 198). Zamijeni:

```ts
const tier = guestSession.event.pricingTier;
const results = await Promise.all(images.map((img) => processImage(img, tier)));
```

Uvjeri se da je `tier` u scope-u — koristi se kasnije u `image.create` (Step 4).

- [ ] **Step 4: Dodaj `tier` u `image.create` data**

U istom fajlu, u `prisma.$transaction` bloku, pronađi `image.create` call (oko linije 219). Dopuni:

```ts
for (const { imageUrl, publicId } of processedUploads) {
  await tx.image.create({
    data: { guestId, imageUrl, storagePath: publicId, tier },
  });
}
```

- [ ] **Step 5: TS typecheck**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 grešaka.

---

## Task 8: Expose quality fields in `/api/pricing` response

**Files:**
- Modify: `app/api/pricing/route.ts`

- [ ] **Step 1: Proširi response shape**

Otvori `app/api/pricing/route.ts`. Pronađi `tiers.map((plan) => ({ ... }))` blok. Dopuni response sa 3 nova polja:

```ts
const tiers = plans.map((plan) => ({
  tier: plan.tier,
  name: { sr: plan.nameSr, en: plan.nameEn },
  imageLimit: plan.imageLimit,
  clientResizeMaxWidth: plan.clientResizeMaxWidth,
  clientQuality: plan.clientQuality,
  storeOriginal: plan.storeOriginal,
  price: plan.price,
  recommended: plan.recommended,
  features: plan.features.map((f) => ({
    sr: f.textSr,
    en: f.textEn,
  })),
}));
```

Ako postoji fallback na `PRICING_TIERS` const u istom fajlu (za DB outage), provjeri da taj fallback takođe sadrži nova polja — ona su već u config-u od Task 2.

- [ ] **Step 2: TS typecheck**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 grešaka.

---

## Task 9: Client dynamic resize u `Upload-Form.tsx`

**Files:**
- Modify: `components/guest/Upload-Form.tsx`

- [ ] **Step 1: Dodaj `tier` u `UploadFormProps`**

U `components/guest/Upload-Form.tsx`, pronađi interface `UploadFormProps` (oko linije 30-37). Dopuni:

```ts
import type { PricingTier } from '@/lib/pricing-tiers';

interface UploadFormProps {
  guestId: string;
  message?: string;
  existingImagesCount?: number;
  language?: string;
  imageLimit?: number;
  tier?: PricingTier;
}
```

- [ ] **Step 2: Prihvati tier u komponent signature**

U istom fajlu, pronađi `export function UploadForm({ ... }: UploadFormProps)`. Dopuni default:

```ts
export function UploadForm({
  guestId,
  message,
  existingImagesCount: initialImagesCount = 0,
  language = 'sr',
  imageLimit = 10,
  tier = 'free',
}: UploadFormProps) {
```

- [ ] **Step 3: Ubaci dinamičan resize sa `getClientResizeParams`**

U istom fajlu, pronađi `resizeImage` funkciju. Trenutno ima hardcoded `maxWidth = 1280` + quality branching po size-u. Zamijeni CIJELU funkciju sa:

```ts
import { getClientResizeParams } from '@/lib/pricing-tiers';

async function resizeImage(file: File, maxWidth: number, quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    // No resize za unlimited tier — original fajl prolazi kako je.
    if (maxWidth === 0) {
      resolve(file);
      return;
    }
    // < 1MB i manji od target maxWidth → ne diraj.
    if (file.size < 1024 * 1024) {
      resolve(file);
      return;
    }

    const img = new window.Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      if (img.width <= maxWidth && file.size < 2 * 1024 * 1024) {
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas not supported');

      ctx.drawImage(img, 0, 0, width, height);

      const outputType =
        file.type.includes('jpeg') || file.type.includes('jpg')
          ? 'image/jpeg'
          : file.type;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const newFile = new File([blob], file.name, { type: outputType });
            resolve(newFile);
          } else {
            resolve(file);
          }
        },
        outputType,
        quality
      );
    };

    reader.onerror = () => {
      resolve(file);
    };
    reader.readAsDataURL(file);
  });
}
```

**Pažljivo:** `resizeImage` je definisan unutar `UploadForm` komponenta u postojećem kodu, ne na top-level. Sačuvaj tu poziciju — samo zamijeni tijelo i signature.

- [ ] **Step 4: Zamijeni sve `resizeImage(img)` pozive sa tier-aware pozivima**

U istom fajlu, u 3 upload path-a koji zovu `resizeImage`:

```ts
// Prije:
const resized = await resizeImage(file);

// Poslije:
const { maxWidth, quality } = getClientResizeParams(tier);
const resized = await resizeImage(file, maxWidth, quality);
```

Pronađi sva 3 call site-a i zamijeni. Lokacije su u `uploadSingleImage` funkciji i gdje god se `resizeImage` pojavljuje u kodu — grep:

```bash
grep -n "resizeImage(" components/guest/Upload-Form.tsx
```

Ažuriraj SVE occurence.

- [ ] **Step 5: TS typecheck**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 grešaka.

---

## Task 10: Wire tier kroz dashboard → DashboardClient → UploadForm

**Files:**
- Modify: `app/guest/dashboard/page.tsx`
- Modify: `components/guest/DashboardClient.tsx`
- Modify: `app/guest/success/client-success.tsx`

- [ ] **Step 1: Dashboard page prosljeđuje `event.pricingTier` do `DashboardClient`**

U `app/guest/dashboard/page.tsx`, pronađi `<DashboardClient ...>`. Dopuni:

```tsx
<DashboardClient
  initialImages={...}
  guestId={guest.id}
  message={guestWithData?.message?.text ?? ""}
  language={urlLanguage || language || eventLanguage}
  imageLimit={event.imageLimit || 10}
  tier={event.pricingTier}
/>
```

- [ ] **Step 2: `DashboardClient` prosljeđuje `tier` do `UploadForm`**

U `components/guest/DashboardClient.tsx`, proširi `DashboardClientProps` i props deklaraciju:

```tsx
import type { PricingTier } from '@/lib/pricing-tiers';

interface DashboardClientProps {
  initialImages: Image[]
  guestId: string
  message?: string
  language?: string
  imageLimit?: number
  tier?: PricingTier
}

export function DashboardClient({
  initialImages,
  guestId,
  message,
  language = 'sr',
  imageLimit = 10,
  tier = 'free',
}: DashboardClientProps) {
  // ...
```

U JSX gdje se `<UploadForm>` pojavljuje, dopuni prop:

```tsx
<UploadForm
  guestId={guestId}
  message={message}
  existingImagesCount={images.length}
  language={language}
  imageLimit={imageLimit}
  tier={tier}
/>
```

- [ ] **Step 3: Success page (ako koristi UploadForm) — provjeriti**

Run:
```bash
grep -n "UploadForm" app/guest/success/client-success.tsx
```

Trenutno success page ne koristi `UploadForm` (samo `UserGallery`), ali provjeriti. Ako se pojavljuje, dodaj `tier` prop u props flow istim patternom.

- [ ] **Step 4: TS typecheck**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 grešaka.

- [ ] **Step 5: Build verify**

Run:
```bash
rm -rf .next && pnpm build 2>&1 | tail -3
```
Expected: build success.

---

## Task 11: Landing page Pricing kartica — 4. metrika + Sparkles

**Files:**
- Modify: `components/landingPage/Pricing.tsx`

- [ ] **Step 1: Import Sparkles i helper**

U `components/landingPage/Pricing.tsx`, linija 8, dopuni import:

```tsx
import { Check, ArrowRight, Crown, Camera, Users, Clock, Sparkles } from "lucide-react"
import { PRICING_TIERS, PricingTier, TierConfig, getQualityLabel } from "@/lib/pricing-tiers"
```

- [ ] **Step 2: Dodaj 4. metriku u "key limits" blok**

U istom fajlu, u bloku `{/* Key limits - visual highlight */}` (oko linije 86-109), dodaj ČETVRTU metriku odmah poslije Clock reda:

```tsx
<div className="flex items-center gap-3">
  <Clock className={`w-4 h-4 flex-shrink-0 ${isRecommended ? "text-white/80" : "text-lp-accent"}`} />
  <span className={`text-sm font-medium ${isRecommended ? "text-white" : "text-lp-text"}`}>
    {config.storageDays <= 30
      ? t("pricing.storageDays", { count: config.storageDays })
      : t("pricing.storageYear")}
  </span>
</div>
<div className="flex items-center gap-3">
  <Sparkles className={`w-4 h-4 flex-shrink-0 ${isRecommended ? "text-white/80" : "text-lp-accent"}`} />
  <span className={`text-sm font-medium ${isRecommended ? "text-white" : "text-lp-text"}`}>
    {getQualityLabel(tier, lang)}
  </span>
</div>
```

- [ ] **Step 3: Build verify**

Run:
```bash
rm -rf .next && pnpm build 2>&1 | tail -3
```
Expected: build success.

---

## Task 12: Admin `PricingTierSelector` — dodaj quality info red

**Files:**
- Modify: `components/admin/PricingTierSelector.tsx`

- [ ] **Step 1: Import `getQualityLabel` + `Sparkles`**

U `components/admin/PricingTierSelector.tsx` imports:

```tsx
import { getQualityLabel } from "@/lib/pricing-tiers";
import { Sparkles, ... } from "lucide-react"; // zadrži postojeće ikone
```

- [ ] **Step 2: Dodaj quality red ispod imageLimit-a**

U istom fajlu, pronađi gdje se prikazuje `{config.imageLimit} slika po gostu`. Odmah ispod, dodaj quality red u istom stilu:

```tsx
<div className="flex items-center gap-2 text-sm text-[hsl(var(--lp-muted-foreground))]">
  <Sparkles className="w-4 h-4" />
  <span>{getQualityLabel(tier, language as 'sr' | 'en')}</span>
</div>
```

Koristi postojeći `language` prop iz komponenta (ili fallback `'sr'`).

- [ ] **Step 3: Build verify**

Run:
```bash
pnpm build 2>&1 | tail -3
```
Expected: success.

---

## Task 13: `EventTierBadge` — quality info u features

**Files:**
- Modify: `components/admin/EventTierBadge.tsx`

- [ ] **Step 1: Quality bullet je već u `PRICING_TIERS.features[]` (Task 2)**

Pošto smo u Task 2 već dodali bullet "Standardni kvalitet (do 1280px)" itd. u features array svakog tier-a, `EventTierBadge` koji iterira `getTierFeatures(tier, language)` automatski dobija novi feature bez promjene u komponenti.

- [ ] **Step 2: Build verify**

Run:
```bash
pnpm build 2>&1 | tail -3
```
Expected: success (nije potrebna promjena u EventTierBadge, quality se prikazuje kao dio feature list-e).

---

## Task 14: Helper tekst u `Upload-Form` za premium/unlimited guest-e

**Files:**
- Modify: `components/guest/Upload-Form.tsx`

- [ ] **Step 1: Dodaj helper tekst ispod upload area-e**

U `components/guest/Upload-Form.tsx`, pronađi gdje se `<ImageUpload>` renderira unutar form-e. Dodaj conditional helper tekst ODMAH ispod:

```tsx
{(tier === 'premium' || tier === 'unlimited') && (
  <p className="text-xs text-[hsl(var(--lp-muted-foreground))] mt-2 text-center">
    {t(
      'guest.uploadForm.premiumQualityNote',
      'Slike se čuvaju u punoj kvaliteti — idealno za album štampu.'
    )}
  </p>
)}
```

- [ ] **Step 2: Build verify**

Run:
```bash
pnpm build 2>&1 | tail -3
```
Expected: success.

---

## Task 15: i18n (SR + EN)

**Files:**
- Modify: `locales/sr/translation.json`
- Modify: `locales/en/translation.json`

- [ ] **Step 1: Dodaj ključeve u `locales/sr/translation.json`**

Pronađi `pricing` sekciju i `guest.uploadForm` sekciju. Dodaj:

Pod `"pricing": { ... }` (ako ne postoji `qualityLabel` ključ, dodaj):
```json
"qualityLabel": "Kvalitet slike"
```

Pod `"guest": { "uploadForm": { ... } }`:
```json
"premiumQualityNote": "Slike se čuvaju u punoj kvaliteti — idealno za album štampu."
```

- [ ] **Step 2: Dodaj ključeve u `locales/en/translation.json`**

Pod `"pricing": { ... }`:
```json
"qualityLabel": "Image quality"
```

Pod `"guest": { "uploadForm": { ... } }`:
```json
"premiumQualityNote": "Photos are stored at full quality — great for album printing."
```

- [ ] **Step 3: JSON syntax check**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('locales/sr/translation.json', 'utf8'))"
node -e "JSON.parse(require('fs').readFileSync('locales/en/translation.json', 'utf8'))"
```
Expected: oba exit 0 (valid JSON).

- [ ] **Step 4: Build verify**

Run:
```bash
pnpm build 2>&1 | tail -3
```
Expected: success.

---

## Task 16: Unit testovi za `pricing-tiers.ts` helpers

**Files:**
- Create: `__tests__/pricing-tiers.test.ts`

- [ ] **Step 1: Kreiraj test fajl**

Kreiraj `__tests__/pricing-tiers.test.ts`:

```ts
/**
 * @jest-environment node
 */
import {
  getClientResizeParams,
  getQualityLabel,
  PRICING_TIERS,
} from '@/lib/pricing-tiers';

describe('getClientResizeParams', () => {
  it('returns 1280/0.85 for free', () => {
    expect(getClientResizeParams('free')).toEqual({ maxWidth: 1280, quality: 0.85 });
  });

  it('returns 1600/0.9 for basic', () => {
    expect(getClientResizeParams('basic')).toEqual({ maxWidth: 1600, quality: 0.9 });
  });

  it('returns 2560/0.95 for premium', () => {
    expect(getClientResizeParams('premium')).toEqual({ maxWidth: 2560, quality: 0.95 });
  });

  it('returns 0/1.0 for unlimited (no resize)', () => {
    expect(getClientResizeParams('unlimited')).toEqual({ maxWidth: 0, quality: 1.0 });
  });
});

describe('getQualityLabel', () => {
  it('returns Serbian label for each tier', () => {
    expect(getQualityLabel('free', 'sr')).toBe('Standard (do 1280px)');
    expect(getQualityLabel('basic', 'sr')).toBe('Visok kvalitet (do 1600px)');
    expect(getQualityLabel('premium', 'sr')).toBe('Vrlo visok (do 2560px)');
    expect(getQualityLabel('unlimited', 'sr')).toBe('Original (puna rezolucija)');
  });

  it('returns English label for each tier', () => {
    expect(getQualityLabel('free', 'en')).toBe('Standard (up to 1280px)');
    expect(getQualityLabel('basic', 'en')).toBe('High quality (up to 1600px)');
    expect(getQualityLabel('premium', 'en')).toBe('Very high (up to 2560px)');
    expect(getQualityLabel('unlimited', 'en')).toBe('Original (full resolution)');
  });
});

describe('PRICING_TIERS storeOriginal flag', () => {
  it('free and basic do NOT store originals (compressed pipeline)', () => {
    expect(PRICING_TIERS.free.storeOriginal).toBe(false);
    expect(PRICING_TIERS.basic.storeOriginal).toBe(false);
  });

  it('premium and unlimited store originals', () => {
    expect(PRICING_TIERS.premium.storeOriginal).toBe(true);
    expect(PRICING_TIERS.unlimited.storeOriginal).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

Run:
```bash
pnpm test:unit -- pricing-tiers
```
Expected: 10 testova PASS.

---

## Task 17: Unit test — upload handler tier-conditional transformation

**Files:**
- Create: `__tests__/api/upload-quality-gradient.test.ts`

- [ ] **Step 1: Kreiraj test**

Kreiraj `__tests__/api/upload-quality-gradient.test.ts`:

```ts
/**
 * @jest-environment node
 *
 * Verifies the upload handler applies Cloudinary q_auto+f_auto transformation
 * ONLY for free/basic tiers. Premium/unlimited uploads must reach Cloudinary
 * with no transformation parameter so the stored asset is the original.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    image: { count: jest.fn(), create: jest.fn() },
    guest: { findUnique: jest.fn(), update: jest.fn() },
    message: { upsert: jest.fn() },
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
import type { PricingTier } from '@/lib/pricing-tiers';

type Mocked = jest.MockedFunction<any>;
const mocks = {
  transaction: prisma.$transaction as Mocked,
  imageCount: prisma.image.count as Mocked,
  imageCreate: prisma.image.create as Mocked,
  guestFindUnique: prisma.guest.findUnique as Mocked,
  guestUpdate: prisma.guest.update as Mocked,
  getGuest: getAuthenticatedGuest as Mocked,
  uploadStream: cloudinary.uploader.upload_stream as Mocked,
};

function buildRequest(): Request {
  const form = new FormData();
  const bytes = new Uint8Array(1024);
  form.append('images', new File([bytes], 'a.jpg', { type: 'image/jpeg' }));
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

function setup(tier: PricingTier, imageLimit: number) {
  mocks.getGuest.mockResolvedValue({
    id: 'guest-1',
    event: { imageLimit, pricingTier: tier },
  });
  mocks.guestFindUnique.mockResolvedValue({ lifetimeUploadCount: 0 });
  mocks.guestUpdate.mockResolvedValue({ id: 'guest-1' });
  mocks.imageCount.mockResolvedValue(0);
  mocks.imageCreate.mockImplementation(async ({ data }: any) => ({ id: 'img', ...data }));
  mocks.transaction.mockImplementation(async (fn: any) =>
    fn({
      image: { count: mocks.imageCount, create: mocks.imageCreate },
      guest: { findUnique: mocks.guestFindUnique, update: mocks.guestUpdate },
    })
  );
  mocks.uploadStream.mockImplementation((_opts: any, cb: any) => ({
    end: () => cb(undefined, { secure_url: 'https://cdn/x.jpg', public_id: 'wedding-app/x' }),
  }));
}

describe('POST /api/guest/upload — tier-conditional Cloudinary transformation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('free tier: passes q_auto+f_auto transformation', async () => {
    setup('free', 10);
    await POST(buildRequest() as any);
    const uploadOpts = mocks.uploadStream.mock.calls[0][0];
    expect(uploadOpts.transformation).toEqual([
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ]);
  });

  it('basic tier: passes q_auto+f_auto transformation', async () => {
    setup('basic', 25);
    await POST(buildRequest() as any);
    const uploadOpts = mocks.uploadStream.mock.calls[0][0];
    expect(uploadOpts.transformation).toEqual([
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ]);
  });

  it('premium tier: omits transformation (store original)', async () => {
    setup('premium', 50);
    await POST(buildRequest() as any);
    const uploadOpts = mocks.uploadStream.mock.calls[0][0];
    expect(uploadOpts.transformation).toBeUndefined();
  });

  it('unlimited tier: omits transformation (store original)', async () => {
    setup('unlimited', 999);
    await POST(buildRequest() as any);
    const uploadOpts = mocks.uploadStream.mock.calls[0][0];
    expect(uploadOpts.transformation).toBeUndefined();
  });

  it('image.create receives tier snapshot', async () => {
    setup('premium', 50);
    await POST(buildRequest() as any);
    expect(mocks.imageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ tier: 'premium' }),
    });
  });
});
```

- [ ] **Step 2: Run test**

Run:
```bash
pnpm test:unit -- upload-quality-gradient
```
Expected: 5 testova PASS.

- [ ] **Step 3: Run full suite**

Run:
```bash
pnpm test:unit
```
Expected: 56 (prethodnih) + 10 (pricing-tiers) + 5 (upload-quality-gradient) = **71 passed**.

---

## Task 18: Ažuriraj postojeći `upload-atomic-count.test.ts` mock za novo `tier` polje

**Files:**
- Modify: `__tests__/api/upload-atomic-count.test.ts`

- [ ] **Step 1: Provjeri da li testovi i dalje prolaze sa novim mock-ovima**

Pošto `imageCreate` sad prima `{ data: { ..., tier } }`, ali mocka `imageCreate.mockImplementation(async ({ data }: any) => ({ id: 'img', ...data }))` prihvata bilo šta — postojeći testovi ne moraju biti mijenjani.

Ali u test-u `"runs the count check inside the transaction (race-safe)"` linija provjerava redoslijed `['count', 'create', 'create']`. Hodler sad poziva `guest.findUnique` i `guest.update` takođe unutar transakcije. Postojeći test samo gleda `count` i `create` redoslijed — prolazi jer se drugi pozivi ne logiraju u `calls` array.

Ipak, dodaj `getGuest.mockResolvedValue` da uključuje `pricingTier`:

U `beforeEach` bloku, pronađi:
```ts
mocks.getGuest.mockResolvedValue({
  id: 'guest-1',
  event: { imageLimit: 3 },
});
```

Zamijeni:
```ts
mocks.getGuest.mockResolvedValue({
  id: 'guest-1',
  event: { imageLimit: 3, pricingTier: 'free' },
});
```

- [ ] **Step 2: Run test**

Run:
```bash
pnpm test:unit -- upload-atomic-count
```
Expected: svi 4 testa PASS.

---

## Task 19: Ažuriraj postojeći `upload-lifetime-limit.test.ts` mock

**Files:**
- Modify: `__tests__/api/upload-lifetime-limit.test.ts`

- [ ] **Step 1: Dodaj `pricingTier` u `getGuest` mock**

U `beforeEach` bloku, pronađi:
```ts
mocks.getGuest.mockResolvedValue({
  id: 'guest-1',
  event: { imageLimit: 25 },
});
```

Zamijeni:
```ts
mocks.getGuest.mockResolvedValue({
  id: 'guest-1',
  event: { imageLimit: 25, pricingTier: 'basic' },
});
```

- [ ] **Step 2: Run test**

Run:
```bash
pnpm test:unit -- upload-lifetime-limit
```
Expected: svi 3 testa PASS.

---

## Task 20: Docs refresh

**Files:**
- Modify: `CLAUDE.md`
- Modify: `claudedocs/pricing-tiers-plan.md`

- [ ] **Step 1: `CLAUDE.md` — photo pipeline sekcija**

Pronađi sekciju koja opisuje photo upload pipeline (oko linije 81). Zamijeni sa:

```markdown
### Photo upload pipeline (guest)

`Upload-Form.tsx` → client validates MIME/size (max 10 MB, allows JPEG/PNG/WebP/GIF/HEIC/HEIF) → **tier-aware canvas resize** (free=1280px@0.85q, basic=1600px@0.9q, premium=2560px@0.95q, unlimited=no resize) → optional EXIF strip (`/utils/removeExif.ts`) → POST FormData to `/api/guest/upload` → server re-auths via cookie, enforces `event.imageLimit` (tier-based per `/lib/pricing-tiers.ts`) AND `guest.lifetimeUploadCount` (2× imageLimit hard cap) → **Sharp** rotates per EXIF + strips metadata → **Cloudinary** upload: for free/basic applies `{quality:auto}{fetch_format:auto}` incoming transformation (stored as compressed derivative); for premium/unlimited uploads **without** transformation (original is stored) → `prisma.image.create({ imageUrl, storagePath, tier })`. The `tier` column snapshots the event's pricingTier at upload time so admin ZIP download logic can reason about each image's storage shape.

Admin ZIP download (`/api/admin/download/images`) fetches `imageUrl` directly: for free/basic events the URL returns the compressed derivative (fast, album-thumb-grade); for premium/unlimited events the URL returns the original (album-print-grade). No two-URL storage, no post-hoc transforms.
```

- [ ] **Step 2: `claudedocs/pricing-tiers-plan.md` — dodaj sekciju**

Na kraj fajla dodaj:

```markdown
---

## Image quality gradient (2026-04-19)

Each tier gets a distinct image pipeline beyond just `imageLimit`:

| Tier | Client resize | Client quality | Cloudinary storage |
|---|---|---|---|
| free | 1280px | 0.85 | q_auto compressed derivative |
| basic | 1600px | 0.9 | q_auto compressed derivative |
| premium | 2560px | 0.95 | original (no upload transform) |
| unlimited | no resize | 1.0 | original |

**Why:** 1280px is web-grade but unusable for album print (max ~A5 @ 300dpi). Premium/Unlimited tiers justify their price by delivering album-quality originals the admin can actually print. Free stays cheap on Cloudinary storage.

**Schema:** `PricingPlan.{clientResizeMaxWidth,clientQuality,storeOriginal}` + `Image.tier` (snapshot). See migration `20260419_add_tier_quality_fields`.

**Implementation:** See [plans/2026-04-19-tier-based-image-quality-gradient.md](../docs/superpowers/plans/2026-04-19-tier-based-image-quality-gradient.md).
```

- [ ] **Step 3: Git diff check**

Run:
```bash
git diff --stat CLAUDE.md claudedocs/
```
Expected: 2 fajla modifikovana.

---

## Task 21: Verify + commit + push

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
- Lint: samo postojeći warning (ništa novo)
- Tests: **71 passed** (56 postojećih + 10 pricing-tiers + 5 quality-gradient)
- Audit: exit 0

- [ ] **Step 2: Git status**

Run:
```bash
git status
git diff --stat
```
Expected fajlovi (novi i modifikovani):
- `lib/pricing-tiers.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260419_add_tier_quality_fields/migration.sql`
- `prisma/seed.ts`
- `app/api/guest/upload/route.ts`
- `app/api/pricing/route.ts`
- `components/guest/Upload-Form.tsx`
- `components/guest/DashboardClient.tsx`
- `app/guest/dashboard/page.tsx`
- `components/landingPage/Pricing.tsx`
- `components/admin/PricingTierSelector.tsx`
- `locales/sr/translation.json`
- `locales/en/translation.json`
- `__tests__/pricing-tiers.test.ts`
- `__tests__/api/upload-quality-gradient.test.ts`
- `__tests__/api/upload-atomic-count.test.ts` (mock update)
- `__tests__/api/upload-lifetime-limit.test.ts` (mock update)
- `CLAUDE.md`
- `claudedocs/pricing-tiers-plan.md`
- `docs/superpowers/plans/2026-04-19-tier-based-image-quality-gradient.md`

- [ ] **Step 3: Commit + push**

Run:
```bash
git add \
  lib/pricing-tiers.ts \
  prisma/schema.prisma \
  prisma/migrations/20260419_add_tier_quality_fields \
  prisma/seed.ts \
  app/api/guest/upload/route.ts \
  app/api/pricing/route.ts \
  components/guest/Upload-Form.tsx \
  components/guest/DashboardClient.tsx \
  app/guest/dashboard/page.tsx \
  components/landingPage/Pricing.tsx \
  components/admin/PricingTierSelector.tsx \
  locales/sr/translation.json \
  locales/en/translation.json \
  __tests__/pricing-tiers.test.ts \
  __tests__/api/upload-quality-gradient.test.ts \
  __tests__/api/upload-atomic-count.test.ts \
  __tests__/api/upload-lifetime-limit.test.ts \
  CLAUDE.md \
  claudedocs/pricing-tiers-plan.md \
  docs/superpowers/plans/2026-04-19-tier-based-image-quality-gradient.md

git commit -m "$(cat <<'EOF'
feat(pricing): tier-based image quality gradient

Each tier now gets a distinct upload pipeline beyond just imageLimit:
free and basic store compressed derivatives (q_auto+f_auto applied at
upload time), premium and unlimited store originals (no Cloudinary
transform on upload, so admin ZIP download returns album-printable
originals). Client-side canvas resize scales proportionally:
1280/1600/2560px @ 0.85/0.9/0.95 quality, unlimited skips resize.

The tier a guest uploaded under is snapshotted on Image.tier so the
admin download path can reason about each image's storage shape even
if the event tier later changes.

Pricing landing card gains a fourth metric (Sparkles icon, combined
quality+resolution phrase via getQualityLabel). Admin tier selector
and event badge surface the same info. New i18n keys in sr/en for
qualityLabel and the premium upload helper note.

Schema: PricingPlan.{clientResizeMaxWidth,clientQuality,storeOriginal}
        + Image.tier. Migration 20260419_add_tier_quality_fields
        applied and seeded.

Tests: 10 new pricing-tiers helper tests + 5 new upload-quality-
gradient tests verifying Cloudinary options and tier snapshot.
Existing upload tests updated for new mock shape.
71 unit tests pass, TS clean, audit exit 0.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push
```

Expected: push uspješan, PR #4 se automatski ažurira.

---

## Verifikacija (end-to-end, nakon push-a)

```bash
# 1. CI
gh pr checks 4
# Expected: build-and-test, e2e PASS

# 2. DB sanity
npx tsx -e '
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
async function main() {
  const p = new PrismaClient().$extends(withAccelerate());
  const plans = await p.pricingPlan.findMany({ select: { tier: true, clientResizeMaxWidth: true, storeOriginal: true }, orderBy: { sortOrder: "asc" } });
  console.log(plans);
  await p.$disconnect();
}
main().catch(console.error);
' 2>&1 | tail -10
# Expected: 4 plans sa tačnim vrijednostima

# 3. Manual QA na 3001
# - Upgradeuj test event na Premium tier (admin dashboard)
# - Uploaduj 5MB iPhone fotografiju kao guest
# - Cloudinary Media Library: stored asset treba biti puna veličina (~3MB, ne 300KB)
# - Admin ZIP download: fajl u ZIP-u treba biti ~3MB (originalan)
# - Downgrade na Free, ponovi upload
# - Cloudinary asset treba biti mali (~300KB, kompresovan)
# - ZIP download treba dati malo fajl

# 4. Landing page
# - Otvori /sr na mobile: 4 metrike po pricing kartici, Sparkles ikona, fraza po tier-u
# - Otvori /en: isto sa engleskim tekstom
```

## Followups (out of scope za ovaj PR)

- **Storage usage dashboard za admin-a** — koliko GB tvoj event koristi, sa upgrade preporukom
- **Retroaktivni quality upgrade** — admin upgrade-uje tier, dobija "pošaljite guest-ima email da ponovo upload-uju" dugme
- **Eager thumbnails** — pre-generisanje 400px thumbnail-a pri upload-u za brži lightbox
- **Client-side preview** — "your photos will look like this" slider na admin event create-u
