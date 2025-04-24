-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "sessionExpires" TIMESTAMP(3),
ADD COLUMN     "sessionToken" TEXT;
