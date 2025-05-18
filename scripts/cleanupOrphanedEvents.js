// Skripta za čišćenje događaja bez admina
const { PrismaClient } = require('@prisma/client');

async function cleanupOrphanedEvents() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧹 Započinjem čišćenje događaja bez admina...');
    
    // 1. Pronađi sve događaje bez admina
    const orphanedEvents = await prisma.event.findMany({
      where: { adminId: null },
      include: {
        guests: {
          include: {
            images: true,
            message: true
          }
        }
      }
    });
    
    console.log(`📊 Pronađeno ${orphanedEvents.length} događaja bez admina.`);
    
    // 2. Za svaki događaj, obriši povezane podatke
    for (const event of orphanedEvents) {
      console.log(`🗑️ Čistim događaj: ${event.coupleName} (ID: ${event.id})`);
      
      // Koristi transakciju za sigurno brisanje
      await prisma.$transaction(async (tx) => {
        // Broj gostiju za ovaj događaj
        console.log(`👥 Broj gostiju za brisanje: ${event.guests.length}`);
        
        // Za svakog gosta, obriši slike i poruke
        for (const guest of event.guests) {
          // Obriši slike gosta
          if (guest.images.length > 0) {
            await tx.image.deleteMany({
              where: { guestId: guest.id }
            });
            console.log(`🖼️ Obrisano ${guest.images.length} slika za gosta ${guest.firstName} ${guest.lastName}`);
          }
          
          // Obriši poruku gosta ako postoji
          if (guest.message) {
            await tx.message.delete({
              where: { guestId: guest.id }
            });
            console.log(`💬 Obrisana poruka za gosta ${guest.firstName} ${guest.lastName}`);
          }
        }
        
        // Obriši sve goste povezane s događajem
        await tx.guest.deleteMany({
          where: { eventId: event.id }
        });
        console.log(`👥 Obrisani svi gosti za događaj ${event.coupleName}`);
        
        // Konačno, obriši sam događaj
        await tx.event.delete({
          where: { id: event.id }
        });
        console.log(`📅 Obrisan događaj: ${event.coupleName}`);
      });
    }
    
    console.log('✅ Čišćenje završeno uspješno!');
    
    // Statistika nakon čišćenja
    const remainingEvents = await prisma.event.count();
    const remainingGuests = await prisma.guest.count();
    const remainingImages = await prisma.image.count();
    const remainingMessages = await prisma.message.count();
    
    console.log('\n📊 Statistika nakon čišćenja:');
    console.log(`📅 Preostalo događaja: ${remainingEvents}`);
    console.log(`👥 Preostalo gostiju: ${remainingGuests}`);
    console.log(`🖼️ Preostalo slika: ${remainingImages}`);
    console.log(`💬 Preostalo poruka: ${remainingMessages}`);
    
  } catch (error) {
    console.error('❌ Došlo je do greške prilikom čišćenja:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Pokreni skriptu
cleanupOrphanedEvents()
  .then(() => console.log('🏁 Skripta završena.'))
  .catch((error) => console.error('❌ Greška u skripti:', error));
