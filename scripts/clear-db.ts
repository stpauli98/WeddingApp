import { prisma } from "../lib/prisma";

async function clearDatabase() {
  try {
    // Prvo brišemo zavisne entitete
    await prisma.image.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.guest.deleteMany({});
    await prisma.adminSession.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.admin.deleteMany({});
    console.log("✅ Svi podaci su uspješno obrisani iz baze.");
  } catch (error) {
    console.error("❌ Greška pri brisanju baze:", error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();