import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {
  try {
    console.log('Početak čišćenja baze podataka...');

    // Brisanje slika
    console.log('Brisanje svih slika...');
    const deletedImages = await prisma.image.deleteMany({});
    console.log(`Obrisano ${deletedImages.count} slika.`);

    // Brisanje poruka
    console.log('Brisanje svih poruka...');
    const deletedMessages = await prisma.message.deleteMany({});
    console.log(`Obrisano ${deletedMessages.count} poruka.`);

    // Brisanje gostiju
    console.log('Brisanje svih gostiju...');
    const deletedGuests = await prisma.guest.deleteMany({});
    console.log(`Obrisano ${deletedGuests.count} gostiju.`);

    // Brisanje eventova
    console.log('Brisanje svih eventova...');
    const deletedEvents = await prisma.event.deleteMany({});
    console.log(`Obrisano ${deletedEvents.count} eventova.`);

    // Brisanje admin sesija
    console.log('Brisanje svih admin sesija...');
    const deletedAdminSessions = await prisma.adminSession.deleteMany({});
    console.log(`Obrisano ${deletedAdminSessions.count} admin sesija.`);

    // Brisanje admina
    console.log('Brisanje svih admina...');
    const deletedAdmins = await prisma.admin.deleteMany({});
    console.log(`Obrisano ${deletedAdmins.count} admina.`);

    console.log('Baza podataka je POTPUNO očišćena.');
  } catch (error) {
    console.error('Greška prilikom čišćenja baze:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Pokretanje skripte
cleanDatabase()
  .then(() => console.log('Skripta je završena.'))
  .catch((e) => console.error('Greška u izvršavanju skripte:', e));
