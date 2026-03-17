# Bugfix: Success Page Image Limit Check

## Problem
Na `/guest/success` stranici nije se provjeravao dinamički `imageLimit` iz eventa. Umjesto toga, koristila se hardkodirana vrijednost `10`, što je uzrokovalo da se dugme "Dodaj više slika" prikazuje čak i kada je dostignut stvarni limit (npr. 25, 50, ili 999).

## Simptomi
- Gost koji je uploadovao 10 slika u event sa limitom od 25 slika vidio je poruku "Dostigli ste maksimalan broj slika (10/10)" umjesto "Možete dodati još 15 slika"
- UploadLimitReachedCelebration komponenta se prikazivala na `images.length === 10` umjesto `images.length >= imageLimit`

## Root Cause
1. `success/page.tsx` nije dohvatao `imageLimit` polje iz Event modela
2. `client-success.tsx` nije primao `imageLimit` prop
3. Hardkodirane vrijednosti `10` u logici za prikaz poruka i komponenti

## Files Changed

### 1. `/app/guest/success/page.tsx`
**Linija 91**: Dodao `imageLimit: true` u select query
```typescript
// BEFORE
select: {
  coupleName: true,
  slug: true,
  admin: { select: { language: true }}
}

// AFTER
select: {
  coupleName: true,
  slug: true,
  imageLimit: true,  // NEW
  admin: { select: { language: true }}
}
```

**Linija 112**: Proslijedio `imageLimit` prop ClientSuccess komponenti
```typescript
// BEFORE
<ClientSuccess
  guest={guest}
  coupleName={event?.coupleName}
  // ... other props
/>

// AFTER
<ClientSuccess
  guest={guest}
  coupleName={event?.coupleName}
  imageLimit={event?.imageLimit || 10}  // NEW
  // ... other props
/>
```

### 2. `/app/guest/success/client-success.tsx`

**Linija 30**: Dodao `imageLimit` u Props interface
```typescript
interface Props {
  guest: Guest
  coupleName?: string
  message?: { text: string }
  eventSlug?: string
  language?: string
  imageLimit?: number  // NEW
}
```

**Linija 46**: Dodao default parametar
```typescript
// BEFORE
export default function ClientSuccess({ guest, coupleName, message, eventSlug, language = 'sr' }: Props)

// AFTER
export default function ClientSuccess({ guest, coupleName, message, eventSlug, language = 'sr', imageLimit = 10 }: Props)
```

**Linija 79**: Zamijenio hardkodiranu vrijednost sa dinamičkim limitom
```typescript
// BEFORE
{guest.images && guest.images.length < 10 && (
  <div className="mt-2 text-sm text-[hsl(var(--lp-muted-foreground))]">
    {t('guest.imageSlotBar.canAddMore', 'Možete dodati još {{count}} {{imageText}}', {
      count: 10 - guest.images.length,
      imageText: getSlikaPadez(10 - guest.images.length)
    })}
  </div>
)}

// AFTER
{guest.images && guest.images.length < imageLimit && (
  <div className="mt-2 text-sm text-[hsl(var(--lp-muted-foreground))]">
    {t('guest.imageSlotBar.canAddMore', 'Možete dodati još {{count}} {{imageText}}', {
      count: imageLimit - guest.images.length,
      imageLimit: getSlikaPadez(imageLimit - guest.images.length)
    })}
  </div>
)}
```

**Linija 92**: Promijenio uslov za prikaz celebration komponente
```typescript
// BEFORE
{guest.images && guest.images.length === 10 && (
  <div className="mb-2">
    <UploadLimitReachedCelebration imagesCount={guest.images.length} language={language} />
  </div>
)}

// AFTER
{guest.images && guest.images.length >= imageLimit && (
  <div className="mb-2">
    <UploadLimitReachedCelebration
      imagesCount={guest.images.length}
      language={language}
      imageLimit={imageLimit}  // NEW
    />
  </div>
)}
```

## Test Cases

### ✅ Test 1: Free Tier (10 images)
- Guest uploaduje 10 slika
- **Expected**: Prikazuje se "Dostigli ste maksimalan broj slika (10/10)"
- **Expected**: Dugme "Dodaj više slika" se NE prikazuje

### ✅ Test 2: Basic Tier (25 images) - Partial Upload
- Guest uploaduje 10 slika u event sa 25 limita
- **Expected**: Prikazuje se "Možete dodati još 15 slika"
- **Expected**: Dugme "Dodaj više slika" se prikazuje

### ✅ Test 3: Basic Tier (25 images) - Full Upload
- Guest uploaduje 25 slika
- **Expected**: Prikazuje se "Dostigli ste maksimalan broj slika (25/25)"
- **Expected**: Dugme "Dodaj više slika" se NE prikazuje

### ✅ Test 4: Premium Tier (50 images)
- Guest uploaduje 30 slika u event sa 50 limita
- **Expected**: Prikazuje se "Možete dodati još 20 slika"
- **Expected**: Dugme "Dodaj više slika" se prikazuje

## Build Result
✅ Build successful - No errors
✅ TypeScript validation passed
✅ No bundle size increase

## Related Files
- Phase 1 completion report: `/claudedocs/phase1-completion-report.md`
- Original implementation plan: `/claudedocs/phase1-implementation-plan.md`

## Status
✅ **FIXED** - Success page now correctly uses dynamic `imageLimit` from event
