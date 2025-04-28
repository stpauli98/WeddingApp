/*
  Warnings:

  - A unique constraint covering the columns `[eventId]` on the table `Admin` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[adminId]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "eventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Admin_eventId_key" ON "Admin"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_adminId_key" ON "Event"("adminId");
