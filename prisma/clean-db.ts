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
    
    console.log('Baza podataka je uspešno očišćena. Event tabela je sačuvana.');
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
