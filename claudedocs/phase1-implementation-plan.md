# Phase 1: Dynamic Image Limits - Detailed Implementation Plan

## 🎯 Goal
Implement flexible image limits per event (10/25/50/unlimited) without payment integration.

## 📋 Structured Implementation Plan

### STEP 1: Database Schema (15 min)
**Files to modify:**
- `prisma/schema.prisma`

**Actions:**
1. Add `imageLimit` field to Event model (Int, default: 10)
2. Add `pricingTier` field to Event model (String?, default: "free")
3. Run migration: `npx prisma migrate dev --name add_image_limits`
4. Generate Prisma client: `npx prisma generate`

**Success criteria:** Migration completes without errors

---

### STEP 2: Pricing Configuration (15 min)
**Files to create:**
- `lib/pricing-tiers.ts`

**Actions:**
1. Create pricing tiers config object
2. Define types (PricingTier, TierConfig)
3. Create helper functions (getPricingTier, getTierOptions)
4. Export bilingual tier names and descriptions

**Success criteria:** Config exports correctly, types are valid

---

### STEP 3: Translation Keys (20 min)
**Files to modify:**
- `locales/sr/translation.json`
- `locales/en/translation.json`

**Actions:**
1. Add pricing tier translations under `admin.event.pricing.*`
2. Add tier names, descriptions, features
3. Add validation messages for image limits
4. Add success messages

**Success criteria:** All keys properly structured, no missing translations

---

### STEP 4: Admin Event Creation - Backend (30 min)
**Files to modify:**
- `app/api/admin/events/route.ts`

**Actions:**
1. Update POST handler to accept `imageLimit` and `pricingTier`
2. Add validation for imageLimit (10-999 range)
3. Save to database
4. Return updated event data

**Success criteria:**
- Build succeeds
- API accepts new fields
- Data saves correctly

---

### STEP 5: Admin Event Creation - Frontend (60 min)
**Files to modify:**
- `app/admin/event/page.tsx`

**Files to create:**
- `components/admin/PricingTierSelector.tsx`

**Actions:**
1. Create PricingTierSelector component with visual cards
2. Add to event creation form (after guestMessage field)
3. Update form schema to include pricingTier
4. Display selected tier features
5. Update translation keys usage

**Success criteria:**
- Build succeeds
- Component renders properly
- Form validation works
- Tier selection saves to DB

**TEST:** Create new event, verify imageLimit in database

---

### STEP 6: Guest Upload Validation - Backend (30 min)
**Files to modify:**
- `app/api/guest/upload/route.ts`

**Actions:**
1. Fetch event with imageLimit
2. Replace hardcoded `10` with `event.imageLimit`
3. Update validation error messages (bilingual)
4. Update count checks

**Success criteria:**
- Build succeeds
- Validation respects event limit
- Error messages are bilingual

---

### STEP 7: Guest Dashboard - Dynamic Limits (45 min)
**Files to modify:**
- `app/guest/dashboard/page.tsx`
- `components/guest/DashboardClient.tsx`
- `components/guest/Upload-Form.tsx`
- `components/guest/ImageSlotBar.tsx`
- `components/guest/UploadLimitReachedCelebration.tsx`

**Actions:**
1. Pass `imageLimit` from server to DashboardClient
2. Update DashboardClient to pass limit down
3. Update Upload-Form validation to use dynamic max
4. Update ImageSlotBar to show dynamic limit
5. Update UploadLimitReachedCelebration messages

**Success criteria:**
- Build succeeds
- All hardcoded `10` replaced with dynamic limit
- UI shows correct limit everywhere

**TEST:** Upload images, verify limit enforcement

---

### STEP 8: Admin Dashboard - Display Tier (30 min)
**Files to modify:**
- `app/admin/dashboard/[eventId]/page.tsx`
- Create: `components/admin/EventTierBadge.tsx`

**Actions:**
1. Create EventTierBadge component
2. Display current tier and limit
3. Show tier features
4. Add to event details view

**Success criteria:**
- Build succeeds
- Badge displays correctly
- Shows correct tier info

---

### STEP 9: Data Migration (15 min)
**Files to create:**
- `scripts/migrate-existing-events.ts`

**Actions:**
1. Create migration script
2. Set all existing events to free tier (imageLimit: 10)
3. Run script
4. Verify all events have valid limits

**Success criteria:** All events have imageLimit set

---

### STEP 10: Comprehensive Testing (45 min)
**Files to create:**
- `e2e/pricing-tiers.spec.ts`

**Actions:**
1. Test event creation with different tiers
2. Test guest upload with different limits
3. Test limit enforcement
4. Test bilingual support
5. Run full build
6. Run all Playwright tests

**Success criteria:**
- All tests pass
- Build succeeds
- No console errors

---

## 📊 Total Estimated Time: ~5 hours

## 🔄 After Each Major Step:

```bash
# 1. Build
pnpm build

# 2. Run tests (if tests exist for that feature)
npx playwright test

# 3. Check types
npx tsc --noEmit

# 4. Git commit
git add .
git commit -m "feat: [step description]"
```

## ✅ Success Checkpoints:

- [ ] Step 1: Migration runs successfully
- [ ] Step 2: Config file compiles
- [ ] Step 3: Translations valid JSON
- [ ] Step 4: API accepts new fields
- [ ] Step 5: Event form works, builds succeed
- [ ] Step 6: Upload validation works
- [ ] Step 7: Guest UI respects limits
- [ ] Step 8: Admin sees tier info
- [ ] Step 9: Migration script completes
- [ ] Step 10: All tests pass

## 🚨 Important Rules:

1. **No Hardcoded `10`**: Search and replace ALL instances
2. **Bilingual Everything**: SR and EN for all new text
3. **Build After Each Step**: Catch errors early
4. **Test Manually**: Create events, upload images
5. **Clean Code**: No duplication, proper typing
6. **Commit Often**: After each working step

## 🎯 Ready to start?

Type "START" and I'll begin with Step 1: Database Schema.
