ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_lsCheckoutId_key";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "lsCheckoutId";
