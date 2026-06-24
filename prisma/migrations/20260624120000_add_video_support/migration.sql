-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "lifetimeVideoCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PricingPlan" ADD COLUMN     "videoLimit" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "posterUrl" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "tier" "PricingTier",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Video_guestId_createdAt_idx" ON "Video"("guestId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Video_createdAt_idx" ON "Video"("createdAt");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
