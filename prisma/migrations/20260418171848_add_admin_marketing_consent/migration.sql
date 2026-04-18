-- Admin marketing consent (GDPR opt-in). Default false — existing admins
-- must explicitly opt in later via admin UI before their email is harvested.
ALTER TABLE "Admin"
  ADD COLUMN IF NOT EXISTS "marketingConsent" BOOLEAN NOT NULL DEFAULT false;
