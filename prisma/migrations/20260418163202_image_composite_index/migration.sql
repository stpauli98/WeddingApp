-- Composite index for gallery queries: WHERE "guestId" = ? ORDER BY "createdAt" DESC.
-- Replaces the standalone Image_guestId_idx (covered by the leading column of the composite).
CREATE INDEX IF NOT EXISTS "Image_guestId_createdAt_idx"
  ON "Image" ("guestId", "createdAt" DESC);

DROP INDEX IF EXISTS "Image_guestId_idx";
