# UI Improvement: PricingTierSelector Redesign

## Problem
Prethodni dizajn PricingTierSelector komponente:
- ❌ Koristio 4 velike kartice u gridu (lg:grid-cols-4)
- ❌ Prikazivao dugačke liste feature-a (5-6 stavki po kartici)
- ❌ Zauzimao previše prostora na stranici
- ❌ Nije se uklapao u formu za kreiranje eventa
- ❌ Preopterećivao korisnika sa previše informacija

## Solution
Kompletno redizajnirano kao radio button lista:
- ✅ Kompaktne horizontalne kartice
- ✅ Jedan red po tier-u
- ✅ Ikona slike sa leve strane
- ✅ Jasna informacija: naziv, broj slika, cijena
- ✅ Radio button + check mark desno
- ✅ "Preporučeno" badge diskretno prikazan
- ✅ Hover efekti za bolju UX

## File Changed

### `/components/admin/PricingTierSelector.tsx`

**Prethodni dizajn** (Grid sa karticama):
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {tiers.map(tier => (
    <Card onClick={...}>
      <CardHeader>
        <CardTitle>{tierName}</CardTitle>
        <CardDescription>{imageLimit} slika</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl">{price}</div>
        <ul className="space-y-2">
          {features.map(feature => (
            <li>✓ {feature}</li>
          ))}
        </ul>
        <Button>Izaberi {tier}</Button>
      </CardContent>
    </Card>
  ))}
</div>
```

**Novi dizajn** (Radio button lista):
```typescript
<RadioGroup value={selectedTier} onValueChange={onTierChange}>
  {tiers.map(tier => (
    <div key={tier}>
      <RadioGroupItem value={tier} id={`tier-${tier}`} className="peer sr-only" />
      <Label htmlFor={`tier-${tier}`} className="flex items-center justify-between p-4">
        {/* Left: Ikona + Naziv + Broj slika */}
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary">
            <ImageIcon />
          </div>
          <div>
            <span className="font-semibold">{tierName}</span>
            {isRecommended && <Badge>Preporučeno</Badge>}
            <div className="text-sm">{imageLimit} slika po gostu</div>
          </div>
        </div>

        {/* Right: Cijena + Radio button */}
        <div className="flex items-center gap-3">
          <div className="font-bold">{price}</div>
          <div className="rounded-full border-2">
            {isSelected && <Check />}
          </div>
        </div>
      </Label>
    </div>
  ))}
</RadioGroup>
```

## Visual Comparison

### Before (Card Grid):
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Besplatno   │ Osnovno     │ Premium     │ Neograničeno│
│ [BADGE]     │             │ [BADGE]     │             │
│             │             │ Preporučeno │             │
│ 10 slika    │ 25 slika    │ 50 slika    │ 999 slika   │
│             │             │             │             │
│ Besplatno   │ 19.99 EUR   │ 39.99 EUR   │ 59.99 EUR   │
│             │             │             │             │
│ ✓ Feature 1 │ ✓ Feature 1 │ ✓ Feature 1 │ ✓ Feature 1 │
│ ✓ Feature 2 │ ✓ Feature 2 │ ✓ Feature 2 │ ✓ Feature 2 │
│ ✓ Feature 3 │ ✓ Feature 3 │ ✓ Feature 3 │ ✓ Feature 3 │
│ ✓ Feature 4 │ ✓ Feature 4 │ ✓ Feature 4 │ ✓ Feature 4 │
│             │ ✓ Feature 5 │ ✓ Feature 5 │ ✓ Feature 5 │
│             │             │ ✓ Feature 6 │ ✓ Feature 6 │
│             │             │             │ ✓ Feature 7 │
│             │             │             │             │
│ [Izaberi]   │ [Izaberi]   │ [Izaberi]   │ [Izaberi]   │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### After (Radio List):
```
┌────────────────────────────────────────────────────────────────┐
│ [🖼️] Besplatno               10 slika po gostu     Besplatno ⦿ │
├────────────────────────────────────────────────────────────────┤
│ [🖼️] Osnovno                 25 slika po gostu    19.99 EUR ○  │
├────────────────────────────────────────────────────────────────┤
│ [🖼️] Premium [Preporučeno]   50 slika po gostu    39.99 EUR ○  │
├────────────────────────────────────────────────────────────────┤
│ [🖼️] Neograničeno            999 slika po gostu   59.99 EUR ○  │
└────────────────────────────────────────────────────────────────┘
```

## Key Improvements

### 1. Space Efficiency
- **Before**: ~800px height (4 cards × ~200px)
- **After**: ~240px height (4 rows × ~60px)
- **Savings**: ~70% manje prostora

### 2. Information Hierarchy
- **Before**: Previše detalja (features lista)
- **After**: Fokus na bitno (naziv, limit, cijena)

### 3. Interaction Pattern
- **Before**: Klikni na karticu ili dugme
- **After**: Native radio button pattern (poznato korisnicima)

### 4. Visual Clarity
- **Before**: Teško uporediti opcije (vertikalni grid)
- **After**: Lako uporediti (horizontalna lista)

### 5. Mobile Responsiveness
- **Before**: Grid se lomi na manje ekrane
- **After**: Adaptivni horizontalni layout

## Technical Details

### Dependencies Added
```typescript
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ImageIcon } from 'lucide-react';
```

### Dependencies Removed
```typescript
// Removed - no longer needed:
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getTierFeatures } from '@/lib/pricing-tiers'; // Feature list not shown
```

### Accessibility
- ✅ Native radio button semantics
- ✅ Proper label associations
- ✅ Keyboard navigation
- ✅ Screen reader friendly
- ✅ Focus indicators

## Testing Checklist

- [x] Component compiles without errors
- [x] Radio button selection works
- [x] Selected tier highlighted correctly
- [x] "Preporučeno" badge shows for Premium
- [x] "Besplatno" shows in green
- [ ] Hover effects work correctly
- [ ] Mobile responsive layout
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly

## Status
✅ **IMPLEMENTED** - Redesigned PricingTierSelector with compact radio list design

## Related Files
- Original implementation: `/claudedocs/phase1-completion-report.md` (STEP 5)
- Pricing configuration: `/lib/pricing-tiers.ts`
