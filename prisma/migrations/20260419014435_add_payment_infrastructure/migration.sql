-- Payment infrastructure: Payment + WebhookLog tables, enum, grandfather flag.

-- Enum
CREATE TYPE "PaymentStatus" AS ENUM ('pending','paid','refunded','partial','failed');

-- Payment table
CREATE TABLE "Payment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "tier" "PricingTier" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "status" "PaymentStatus" NOT NULL,
  "lsCheckoutId" TEXT NOT NULL,
  "lsOrderId" TEXT,
  "lsEventId" TEXT,
  "refundedAmountCents" INTEGER NOT NULL DEFAULT 0,
  "refundedAt" TIMESTAMP(3),
  "customerEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Payment_lsCheckoutId_key" ON "Payment"("lsCheckoutId");
CREATE UNIQUE INDEX "Payment_lsOrderId_key" ON "Payment"("lsOrderId") WHERE "lsOrderId" IS NOT NULL;
CREATE UNIQUE INDEX "Payment_lsEventId_key" ON "Payment"("lsEventId") WHERE "lsEventId" IS NOT NULL;
CREATE INDEX "Payment_eventId_status_idx" ON "Payment"("eventId","status");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_check"
  CHECK ("amountCents" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_refund_check"
  CHECK ("refundedAmountCents" >= 0 AND "refundedAmountCents" <= "amountCents");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_currency_check"
  CHECK (currency ~ '^[A-Z]{3}$');

-- WebhookLog table
CREATE TABLE "WebhookLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lsEventId" TEXT,
  "eventName" TEXT,
  "signatureValid" BOOLEAN NOT NULL,
  "payload" JSONB NOT NULL,
  "error" TEXT,
  "processedAt" TIMESTAMP(3),
  "sourceIp" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "WebhookLog_lsEventId_key" ON "WebhookLog"("lsEventId") WHERE "lsEventId" IS NOT NULL;
CREATE INDEX "WebhookLog_signatureValid_createdAt_idx" ON "WebhookLog"("signatureValid","createdAt");
CREATE INDEX "WebhookLog_eventName_idx" ON "WebhookLog"("eventName");

-- PricingPlan.lsVariantId
ALTER TABLE "PricingPlan" ADD COLUMN "lsVariantId" TEXT;
CREATE UNIQUE INDEX "PricingPlan_lsVariantId_key" ON "PricingPlan"("lsVariantId") WHERE "lsVariantId" IS NOT NULL;

-- Event.legacyGrandfathered
ALTER TABLE "Event" ADD COLUMN "legacyGrandfathered" BOOLEAN NOT NULL DEFAULT false;

-- Grandfather existing nikola-i-milica event (basic tier + 180d override, no Payment row)
UPDATE "Event" SET "legacyGrandfathered" = true
  WHERE "slug" = 'nikola-i-milica' AND "pricingTier" = 'basic';
