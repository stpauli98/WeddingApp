-- Opaque unsubscribe token per MarketingContact row. Embedded in outbound
-- marketing emails so recipients can unsubscribe without logging in.
ALTER TABLE "MarketingContact"
  ADD COLUMN IF NOT EXISTS "unsubscribeToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingContact_unsubscribeToken_key"
  ON "MarketingContact" ("unsubscribeToken")
  WHERE "unsubscribeToken" IS NOT NULL;
