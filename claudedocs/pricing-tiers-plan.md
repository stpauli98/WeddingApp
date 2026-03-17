# Pricing Tiers Implementation Plan

## Overview
Implement flexible image limits per event based on pricing tiers to enable monetization.

## 1. Database Schema Changes

### Add to Event model (Prisma):
```prisma
model Event {
  // ... existing fields
  imageLimit    Int      @default(10)  // Maximum images per guest
  pricingTier   String?  @default("free")  // free, basic, premium, unlimited
}
```

## 2. Pricing Tiers Configuration

### lib/pricing-tiers.ts
```typescript
export const PRICING_TIERS = {
  free: {
    name: 'Free',
    imageLimit: 10,
    price: 0,
    features: [
      'Up to 10 images per guest',
      'Basic QR code',
      'Photo gallery',
      'Download all images'
    ]
  },
  basic: {
    name: 'Basic',
    imageLimit: 25,
    price: 1999, // in cents (19.99 EUR/USD)
    features: [
      'Up to 25 images per guest',
      'Custom QR code design',
      'Photo gallery',
      'Download all images',
      'Priority support'
    ]
  },
  premium: {
    name: 'Premium',
    imageLimit: 50,
    price: 3999, // 39.99
    features: [
      'Up to 50 images per guest',
      'Custom branding',
      'Advanced QR code',
      'Photo gallery',
      'Download all images',
      'Priority support',
      'Custom messages'
    ]
  },
  unlimited: {
    name: 'Unlimited',
    imageLimit: 999, // Practical limit
    price: 5999, // 59.99
    features: [
      'Unlimited images per guest',
      'Full customization',
      'White-label option',
      'All premium features',
      'Dedicated support',
      'Advanced analytics'
    ]
  }
}

export type PricingTier = keyof typeof PRICING_TIERS;

export function getPricingTier(tier: string) {
  return PRICING_TIERS[tier as PricingTier] || PRICING_TIERS.free;
}
```

## 3. Implementation Steps

### Step 1: Database Migration
```bash
npx prisma migrate dev --name add_image_limit_to_events
```

### Step 2: Update Event Creation Form
- Add pricing tier selector with visual cards
- Display features for each tier
- Show price
- (Optional) Integrate Stripe payment

### Step 3: Update Guest Upload Logic
- Read `imageLimit` from event
- Replace hardcoded `10` with `event.imageLimit`
- Update validation messages

### Step 4: Update UI Components
- ImageSlotBar: Use dynamic max from event
- UploadForm: Validate against event limit
- DashboardClient: Show correct limit

### Step 5: Admin Dashboard
- Show selected tier in event details
- Allow tier upgrades (with payment)
- Display usage stats

## 4. Files to Modify

### Backend:
- `prisma/schema.prisma` - Add imageLimit field
- `app/api/admin/events/route.ts` - Save imageLimit
- `app/api/guest/upload/route.ts` - Validate against event limit

### Frontend:
- `app/admin/event/page.tsx` - Pricing tier selector
- `components/guest/Upload-Form.tsx` - Dynamic validation
- `components/guest/ImageSlotBar.tsx` - Dynamic max
- `components/guest/DashboardClient.tsx` - Pass limit
- `components/guest/UploadLimitReachedCelebration.tsx` - Dynamic message

### New Components:
- `components/admin/PricingTierSelector.tsx` - Tier selection UI
- `lib/pricing-tiers.ts` - Configuration

## 5. Payment Integration (Optional Phase 2)

### Stripe Integration:
```typescript
// lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// app/api/payment/checkout/route.ts
export async function POST(request: Request) {
  const { tier, eventId } = await request.json();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: {
          name: PRICING_TIERS[tier].name,
          description: `Wedding event with ${PRICING_TIERS[tier].imageLimit} images per guest`,
        },
        unit_amount: PRICING_TIERS[tier].price,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/event?payment=cancelled`,
    metadata: { eventId, tier }
  });

  return Response.json({ sessionId: session.id });
}
```

## 6. Migration Strategy for Existing Events

```typescript
// Set all existing events to free tier with 10 image limit
await prisma.event.updateMany({
  where: { imageLimit: null },
  data: {
    imageLimit: 10,
    pricingTier: 'free'
  }
});
```

## 7. Advantages of This Approach

✅ **Flexible**: Easy to add/modify tiers
✅ **Scalable**: Database-driven limits
✅ **Monetizable**: Clear pricing structure
✅ **Backward Compatible**: Default to free tier
✅ **User-Friendly**: Visual tier selection
✅ **Future-Proof**: Easy to add more features per tier

## 8. Future Enhancements

- **Tier Upgrades**: Allow upgrading during/after event
- **Usage Analytics**: Show how many images uploaded vs limit
- **Notifications**: Warn admin when guests hit limit
- **Dynamic Pricing**: Seasonal discounts
- **Referral Program**: Discount for referring other couples
- **Add-ons**: Extra features (custom domain, video support)

## 9. Recommended Implementation Order

1. ✅ Database schema (1 hour)
2. ✅ Pricing configuration (30 min)
3. ✅ Backend validation (1 hour)
4. ✅ Admin event form update (2 hours)
5. ✅ Guest UI updates (2 hours)
6. ✅ Testing (1 hour)
7. 🔄 Payment integration (Phase 2, 4-6 hours)

**Total Time (Phase 1 - without payment): ~7-8 hours**
**Total Time (Phase 2 - with payment): ~11-14 hours**
