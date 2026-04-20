# Tier-Based Image Quality Gradient

**Date:** 2026-04-19
**Owner:** @stpauli98
**Status:** Approved, ready for implementation planning

## Context

Trenutno upload pipeline klient-side resize-uje **SVE** slike na max 1280px sa quality 0.85 bez obzira na tier, a Cloudinary primjenjuje `{quality:auto}{fetch_format:auto}` kao upload-time transformaciju (compressed asset stored). Net rezultat: admin dobija web-grade slike (300-400 KB, 1280×960) čak i za Premium tier.

Za svadbeni foto-album mladenaca ovo je nedovoljno:
- 1280px = max ~11×8cm @ 300dpi (ispod A5 formata, neupotrebljivo za pravi album)
- A4 print traži min 2400×1800px
- Originalni iPhone snimak (4032×3024, 3-5 MB) ima arhiv/print vrijednost

Tier se trenutno diferencira samo po `imageLimit` (kvantitativno: 3/25/50/999). Slab upgrade trigger jer većina gostiju upload-uje 5-10 slika, ne 50. **Kvalitet kao diferencijator je monetizaciono snažniji: "Premium = album-grade".**

## Non-goals

- Per-guest quality override unutar istog event-a (svi gosti na Premium event-u imaju isti quality)
- Retroaktivni upgrade kvaliteta starih slika kad admin upgrade-uje tier mid-event (edge case, odvojeni followup)
- Pinch-zoom u lightbox-u (zasebni feature)
- Storage monitoring / usage dashboard za admin-a (opcioni followup)
- Eager Cloudinary transformacije za pre-generisanje thumbnail-a

## Design

### Quality gradient po tier-u

| Tier | Client resize max | Client quality | Cloudinary upload | Net storage |
|---|---|---|---|---|
| **free** | 1280px | 0.85 | `{quality:auto}{fetch_format:auto}` (incoming transform) | compressed (~300KB) |
| **basic** | 1600px | 0.90 | `{quality:auto}{fetch_format:auto}` (incoming transform) | compressed (~500KB) |
| **premium** | 2560px | 0.95 | **bez transformation-a** | original (~2-3MB) |
| **unlimited** | bez resize-a | 1.00 | **bez transformation-a** | original (~4-5MB) |

Web display za sve tier-ove koristi postojeći `ImageWithSpinner` koji gradi Cloudinary URL sa `c_fill,q_auto,f_auto` na render-time-u — manje wire bandwidth za web pregled. Admin ZIP download fetchuje `imageUrl` direktno → dobije storage-time verziju (compressed za free/basic, original za premium/unlimited).

### Tier flow (server → UI)

User je već izabrao **Opciju B** (tier kao prop). Flow:
1. Guest dashboard server component (`app/guest/dashboard/page.tsx` ili ekvivalent) SSR-uje sa `event.pricingTier` već u scope-u
2. Prosljeđuje `tier` prop do `<UploadForm>`
3. `UploadForm` računa `resizeImage` parametre iz tier-a
4. Server handler (`app/api/guest/upload/route.ts`) koristi `guestSession.event.pricingTier` (već dostupno)

Bez novih API endpoint-a. Bez client-side fetch-a za tier.

### Schema changes

**Image model** dobija **jedno novo polje** — snapshot tier-a pri upload-u:

```prisma
model Image {
  id          String      @id @default(uuid())
  guestId     String
  imageUrl    String
  storagePath String?
  /// Snapshot of event.pricingTier at upload time. Captures whether this
  /// image was stored as a compressed derivative (free/basic) or original
  /// (premium/unlimited) — source of truth for admin download decisions
  /// if the event tier changes mid-event.
  tier        PricingTier?
  createdAt   DateTime    @default(now())
  guest       Guest       @relation(fields: [guestId], references: [id])

  @@index([guestId, createdAt(sort: Desc)])
  @@index([createdAt])
}
```

`tier` je nullable jer stare slike (pre migration-a) nemaju snapshot — migration **NE backfill-uje** (ne znamo kojem tier-u su pripadale). Za download endpoint: ako je tier null, tretira se kao "legacy" (originalni pristup, što je što se trenutno dešava).

**PricingPlan model** dobija **tri nova polja** za quality gradient params:

```prisma
model PricingPlan {
  // ...postojeća polja
  clientResizeMaxWidth Int    @default(1280)  // 0 = no resize
  clientQuality        Float  @default(0.85)
  storeOriginal        Boolean @default(false) // true = no Cloudinary upload transform
}
```

Seed iz `lib/pricing-tiers.ts` (postojeći pattern). API endpoint `/api/pricing` dobija ova polja u response-u za landing page prikaz.

### Config (`lib/pricing-tiers.ts`)

`TierConfig` interface dobija tri nova polja koja prate DB šemu. `PRICING_TIERS` const se popunjava:

```ts
free:      { clientResizeMaxWidth: 1280, clientQuality: 0.85, storeOriginal: false }
basic:     { clientResizeMaxWidth: 1600, clientQuality: 0.90, storeOriginal: false }
premium:   { clientResizeMaxWidth: 2560, clientQuality: 0.95, storeOriginal: true }
unlimited: { clientResizeMaxWidth: 0,    clientQuality: 1.00, storeOriginal: true }
```

Novi helper:
```ts
export function getClientResizeParams(tier: PricingTier): { maxWidth: number; quality: number };
```

Koristi se i u klijentu i u admin UI-u za prikaz.

### Upload handler (`app/api/guest/upload/route.ts`)

`uploadToCloudinary(buffer, tier)` postaje tier-svjesna:

```ts
const shouldStoreOriginal = PRICING_TIERS[tier].storeOriginal;
const uploadOptions: UploadApiOptions = {
  folder: 'wedding-app',
  resource_type: 'image',
  tags: ['wedding-app', 'guest-upload'],
};
if (!shouldStoreOriginal) {
  uploadOptions.transformation = [
    { quality: "auto" },
    { fetch_format: "auto" },
  ];
}
// ... rest of upload
```

Pri `image.create` u transakciji, dodaje se `tier: guestSession.event.pricingTier` polje.

### Client resize (`components/guest/Upload-Form.tsx`)

`UploadFormProps` dobija `tier: PricingTier`. `resizeImage(file, maxWidth, quality)` više ne prima hardcoded default-e:

```ts
const { maxWidth, quality } = getClientResizeParams(tier);
if (maxWidth === 0) {
  // Unlimited: no resize
  resolve(file);
  return;
}
// ... rest of resize with dynamic maxWidth & quality
```

### Pricing landing kartica (`components/landingPage/Pricing.tsx`)

**4 metrike u redu** (ne 5):
- Camera: `imageLimit` (postojeće)
- Users: `guestLimit` (postojeće)
- Clock: `storageDays` / "godina" (postojeće)
- **Sparkles** (novo): **combined quality+resolution** kao jedna fraza

Frazni output (sa translation fallback-om):

| Tier | SR | EN |
|---|---|---|
| free | Standard (do 1280px) | Standard (up to 1280px) |
| basic | Visok kvalitet (do 1600px) | High quality (up to 1600px) |
| premium | Vrlo visok (do 2560px) | Very high (up to 2560px) |
| unlimited | Original (puna rezolucija) | Original (full resolution) |

Helper:
```ts
export function getQualityLabel(tier: PricingTier, lang: 'sr' | 'en'): string;
```

### Admin pricing UI

- **`PricingTierSelector.tsx`**: pokazuje quality info ispod imageLimit-a za svaki tier (ista `getQualityLabel` helper-a)
- **`EventTierBadge.tsx`**: dodaje quality/resolution info u features listu

### Guest UI text

- `UploadForm`: ispod upload area-e kratak helper tekst **samo za premium/unlimited event-e**: "Slike se čuvaju u punoj kvaliteti za album štampu" (daje guest-u vizibilnost da upload-uje u veličini važnoj za event)
- `ImageSlotBar`: bez promjena (prevelika simptomatika i UI je već pretrpan)

### i18n ključevi (novi)

Pod `pricing.quality.*` i `pricing.resolution.*`:
- `pricing.quality.free`, `.basic`, `.premium`, `.unlimited` (quality labels)
- `pricing.resolution.upTo` (template "do {{px}}px"), `.full` ("puna rezolucija" / "full resolution")
- `pricing.qualityLabel` ("Kvalitet slike" / "Image quality")

Pod `admin.event.pricing.*`:
- `admin.event.pricing.qualityInfo.description.{tier}` — kratak opis za svaki tier u admin selector-u
- `admin.event.pricing.qualityInfo.label` — label za quality row

Pod `guest.uploadForm.*`:
- `guest.uploadForm.premiumQualityNote` — helper tekst "čuva se u punoj kvaliteti"

## Implementation sequencing

1. **Data layer:** schema + migration + `PRICING_TIERS` config + seed push
2. **API layer:** upload handler conditional transform + tier snapshot; pricing endpoint expose novih polja
3. **Client resize:** Upload-Form tier prop + dynamic resize
4. **Tier prop wiring:** dashboard page prosljeđuje tier do UploadForm-a
5. **Landing + admin UI:** Pricing kartica, PricingTierSelector, EventTierBadge
6. **i18n:** sr + en keys
7. **Docs:** CLAUDE.md photo pipeline section, `claudedocs/pricing-tiers-plan.md`
8. **Tests:** client resize unit testovi + upload handler tier-branch testovi

## Testing strategy

**Unit (Jest):**
- `pricing-tiers.ts` `getClientResizeParams` vraća tačne parove po tier-u (4 testa, jedan po tier-u)
- `Upload-Form` client resize poziva `canvas.toBlob` sa tačnim quality param-om po tier-u (mock canvas)
- Upload handler pod premium/unlimited **ne prosljeđuje** `transformation:` u Cloudinary options; pod free/basic **prosljeđuje** (mock cloudinary.uploader.upload_stream, provjeri argumente)
- Upload handler zapisuje `tier` u `image.create` data

**E2E (Playwright):** ne dodajemo — quality se ne može inspect-ovati u browser-u lako, i `canvas.toBlob` quality param je non-observable (output je binary).

**Manual QA:**
- Guest na **premium** event-u upload-uje 5MB original → provjeri u Cloudinary Media Library-u da je stored asset pun (bez q_auto path-a)
- Admin ZIP download za isti event → originalne slike se pakuju
- Free tier event: Cloudinary storage je compressed, ZIP dobija compressed
- Pricing landing kartica: 4 metrike vidljive, quality fraza pravilna po tier-u
- Admin PricingTierSelector: quality info vidljiv pri kreiranju event-a

## Out of scope (followups)

- **Retroaktivno upgrade kvaliteta** starih slika pri tier upgrade (admin re-uploads ili "please re-upload" email)
- **Storage usage dashboard** za admina (koliko GB koristi event)
- **Eager thumbnails** pre-generisanje na upload-u (bolja performansa za galeriju, ali trenutni URL-based transformacije su dovoljne)
- **Client-side preview tier quality** — UI slider "Your photos will look like this" prije nego user plati
