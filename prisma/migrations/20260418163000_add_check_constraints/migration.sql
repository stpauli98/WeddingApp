-- Data integrity: CHECK constraints on numeric and string invariants.
-- Idempotent via DO block so re-application is safe.

DO $$ BEGIN
  ALTER TABLE "Event" ADD CONSTRAINT "Event_imageLimit_check"
    CHECK ("imageLimit" BETWEEN 1 AND 9999);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PricingPlan" ADD CONSTRAINT "PricingPlan_imageLimit_check"
    CHECK ("imageLimit" BETWEEN 1 AND 9999);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PricingPlan" ADD CONSTRAINT "PricingPlan_price_check"
    CHECK (price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Guest" ADD CONSTRAINT "Guest_email_check"
    CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 254);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Admin" ADD CONSTRAINT "Admin_email_check"
    CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 254);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Message" ADD CONSTRAINT "Message_text_length_check"
    CHECK (length(text) <= 5000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Guest" ADD CONSTRAINT "Guest_firstName_length_check"
    CHECK (length("firstName") BETWEEN 1 AND 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Guest" ADD CONSTRAINT "Guest_lastName_length_check"
    CHECK (length("lastName") BETWEEN 1 AND 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Admin" ADD CONSTRAINT "Admin_firstName_length_check"
    CHECK (length("firstName") BETWEEN 1 AND 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Admin" ADD CONSTRAINT "Admin_lastName_length_check"
    CHECK (length("lastName") BETWEEN 1 AND 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Event" ADD CONSTRAINT "Event_slug_format_check"
    CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,62}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
