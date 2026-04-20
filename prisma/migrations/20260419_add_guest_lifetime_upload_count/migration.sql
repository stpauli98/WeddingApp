-- Lifetime upload counter per guest. Anti-abuse cap: upload handler rejects
-- when guest.lifetimeUploadCount + new > event.imageLimit * 2. Deleting
-- images drops active gallery count but never decreases this field, so an
-- upload/delete loop cannot evade the cap. Backfill uses the current
-- image count so existing guests get a fair starting point.

ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "lifetimeUploadCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill: set to current active image count. Only touches rows that are
-- still at default 0 so re-running this migration (e.g. on a restored DB)
-- doesn't clobber real increments.
UPDATE "Guest" g
SET "lifetimeUploadCount" = COALESCE((SELECT COUNT(*)::INTEGER FROM "Image" WHERE "guestId" = g.id), 0)
WHERE "lifetimeUploadCount" = 0;

-- Defence-in-depth: non-negative invariant at the DB level.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Guest_lifetimeUploadCount_nonneg'
  ) THEN
    ALTER TABLE "Guest" ADD CONSTRAINT "Guest_lifetimeUploadCount_nonneg" CHECK ("lifetimeUploadCount" >= 0);
  END IF;
END $$;
