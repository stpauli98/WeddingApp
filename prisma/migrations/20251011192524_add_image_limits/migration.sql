-- AlterTable
ALTER TABLE "public"."Event" ADD COLUMN     "imageLimit" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "pricingTier" TEXT NOT NULL DEFAULT 'free';
