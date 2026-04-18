-- Retention infra: MarketingContact + Guest.marketingConsent +
-- Event.deletionWarningSentAt + Event.deletedAt.

-- Guest consent flag (default false — GDPR opt-in).
ALTER TABLE "Guest"
  ADD COLUMN IF NOT EXISTS "marketingConsent" BOOLEAN NOT NULL DEFAULT false;

-- Event retention lifecycle columns.
ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "deletionWarningSentAt" TIMESTAMP(3);
ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Event_deletedAt_idx" ON "Event" ("deletedAt");

-- MarketingContact table — harvested emails post-retention.
CREATE TABLE IF NOT EXISTS "MarketingContact" (
  "id"             TEXT NOT NULL,
  "email"          TEXT NOT NULL,
  "source"         TEXT NOT NULL,
  "eventSlug"      TEXT,
  "coupleName"     TEXT,
  "weddingDate"    TIMESTAMP(3),
  "consentedAt"    TIMESTAMP(3) NOT NULL,
  "harvestedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unsubscribedAt" TIMESTAMP(3),
  CONSTRAINT "MarketingContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingContact_email_source_key"
  ON "MarketingContact" ("email", "source");
CREATE INDEX IF NOT EXISTS "MarketingContact_source_idx"
  ON "MarketingContact" ("source");

DO $$ BEGIN
  ALTER TABLE "MarketingContact" ADD CONSTRAINT "MarketingContact_email_check"
    CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 254);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MarketingContact" ADD CONSTRAINT "MarketingContact_source_check"
    CHECK (source IN ('guest', 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
