-- Replace partial unique index with proper UNIQUE constraint so Prisma upsert ON CONFLICT works.
-- Postgres treats NULLs as distinct in UNIQUE constraints by default, so behavior is equivalent.
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_lsEventId_key";
DROP INDEX IF EXISTS "Payment_lsEventId_key";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_lsEventId_key" UNIQUE ("lsEventId");
