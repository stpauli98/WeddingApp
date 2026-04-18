-- Admin-granted retention extension (0..365 days beyond tier.storageDays).
ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "retentionOverrideDays" INTEGER NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE "Event" ADD CONSTRAINT "Event_retentionOverrideDays_check"
    CHECK ("retentionOverrideDays" BETWEEN 0 AND 365);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
