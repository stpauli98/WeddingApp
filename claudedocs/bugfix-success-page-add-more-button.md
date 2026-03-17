# Bugfix: Success Page - "Dodaj još slika" Button Missing

## Problem
Na `/guest/success` stranici se prikazivala poruka "Možete dodati još X slika", ali dugme "Dodaj još slika" za vraćanje na dashboard nije bilo prikazano.

## Root Cause
`UserGallery` komponenta je imala hardkodiranu vrijednost `10` u uslovu za prikaz dugmeta:
```typescript
{images.length < 10 && (
  <Button>Dodaj još slika</Button>
)}
```

Komponenta nije primala `imageLimit` prop, pa nije mogla provjeriti stvarni limit.

## Files Changed

### 1. `/components/guest/UserGallery.tsx`

**Linija 21**: Dodao `imageLimit` u interface
```typescript
interface UserGalleryProps {
  initialImages: Image[]
  guestId: string
  eventSlug?: string
  className?: string
  language?: string
  imageLimit?: number  // NEW
}
```

**Linija 24**: Dodao default parametar
```typescript
// BEFORE
export function UserGallery({ initialImages, guestId, eventSlug: propEventSlug, className, language = 'sr' }: UserGalleryProps)

// AFTER
export function UserGallery({ initialImages, guestId, eventSlug: propEventSlug, className, language = 'sr', imageLimit = 10 }: UserGalleryProps)
```

**Linija 67**: Zamijenio hardkodiranu vrijednost sa dinamičkim limitom
```typescript
// BEFORE
{images.length < 10 && (
  <Button>Dodaj još slika</Button>
)}

// AFTER
{images.length < imageLimit && (
  <Button>Dodaj još slika</Button>
)}
```

### 2. `/app/guest/success/client-success.tsx`

**Linija 78**: Proslijedio `imageLimit` prop UserGallery komponenti
```typescript
// BEFORE
<UserGallery
  initialImages={...}
  guestId={guest.id}
  eventSlug={eventSlug}
  language={language}
/>

// AFTER
<UserGallery
  initialImages={...}
  guestId={guest.id}
  eventSlug={eventSlug}
  language={language}
  imageLimit={imageLimit}  // NEW
/>
```

## Test Cases

### ✅ Test 1: Free Tier - Partial Upload (2/10)
- **Trenutno stanje**: 2 slike uploadovane
- **Expected**: Poruka "Možete dodati još 8 slika" + Dugme "Dodaj još slika"
- **Result**: ✅ Dugme se prikazuje

### ✅ Test 2: Free Tier - Full Upload (10/10)
- **Trenutno stanje**: 10 slika uploadovanih
- **Expected**: Celebration komponenta + NEMA dugme
- **Result**: ✅ Dugme se ne prikazuje

### ✅ Test 3: Basic Tier - Partial Upload (15/25)
- **Trenutno stanje**: 15 slika uploadovanih
- **Expected**: Poruka "Možete dodati još 10 slika" + Dugme "Dodaj još slika"
- **Result**: ✅ Dugme se prikazuje

### ✅ Test 4: Premium Tier - Near Limit (48/50)
- **Trenutno stanje**: 48 slika uploadovanih
- **Expected**: Poruka "Možete dodati još 2 slike" + Dugme "Dodaj još slika"
- **Result**: ✅ Dugme se prikazuje

## Related Changes
- Original bugfix: `/claudedocs/bugfix-success-page-image-limit.md`
- Phase 1 implementation: `/claudedocs/phase1-completion-report.md`

## Status
✅ **FIXED** - Success page now correctly shows "Dodaj još slika" button based on dynamic `imageLimit`
