-- DropIndex
DROP INDEX "Guest_email_key";

-- CreateTable
CREATE TABLE "Stats" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "totalUploadedImages" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Stats_pkey" PRIMARY KEY ("id")
);
