-- CreateTable
CREATE TABLE IF NOT EXISTS "PricingPlan" (
    "id" TEXT NOT NULL,
    "tier" "PricingTier" NOT NULL,
    "nameSr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "imageLimit" INTEGER NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PricingFeature" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "textSr" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PricingFeature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PricingPlan_tier_key" ON "PricingPlan"("tier");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PricingFeature_planId_idx" ON "PricingFeature"("planId");

-- AddForeignKey
ALTER TABLE "PricingFeature" ADD CONSTRAINT "PricingFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
