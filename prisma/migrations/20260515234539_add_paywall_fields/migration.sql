-- Migration: add paywall fields
-- Adds PaymentPurpose enum, Event activation tracking, and Payment metadata columns.
-- All changes are additive (new nullable columns + new enum + new indexes).
-- Safe to apply to existing data.

-- CreateEnum: PaymentPurpose
DO $$ BEGIN
  CREATE TYPE "PaymentPurpose" AS ENUM ('initial_purchase', 'upgrade', 'retention_extension');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterTable Event: add activatedAt and pendingPaymentExpiresAt columns
ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pendingPaymentExpiresAt" TIMESTAMP(3);

-- AlterTable Payment: add purpose, retentionDaysGranted, metadata columns
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "purpose" "PaymentPurpose",
  ADD COLUMN IF NOT EXISTS "retentionDaysGranted" INTEGER,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- AlterTable Payment: add unique constraint on lsEventId.
-- The constraint creates an underlying index named "Payment_lsEventId_key",
-- so we must catch both duplicate_object (constraint name) AND duplicate_table (index name).
DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_lsEventId_key" UNIQUE ("lsEventId");
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;

-- CreateIndex: Event [eventId, purpose] on Payment
CREATE INDEX IF NOT EXISTS "Payment_eventId_purpose_idx" ON "Payment"("eventId", "purpose");

-- Backfill activatedAt for existing events so their dashboards stay accessible.
-- All pre-paywall events are treated as active.
UPDATE "Event" SET "activatedAt" = "createdAt" WHERE "activatedAt" IS NULL;
