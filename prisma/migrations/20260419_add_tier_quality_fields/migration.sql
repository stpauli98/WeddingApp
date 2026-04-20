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
