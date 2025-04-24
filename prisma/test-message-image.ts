import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Pronađi jednog gosta (Guest) iz baze
  const guest = await prisma.guest.findFirst();
  if (!guest) {
    console.error('Nema gostiju u bazi.');
    return;
  }

  // Test upis poruke
  const message = await prisma.message.upsert({
    where: { guestId: guest.id },
    update: { text: 'Ovo je test poruka iz skripte.' },
    create: { guestId: guest.id, text: 'Ovo je test poruka iz skripte.' }
  });
  console.log('Upisana test poruka:', message.text);

  // Test upis slike
  const image = await prisma.image.create({
    data: {
      guestId: guest.id,
      imageUrl: '/uploads/test-image.jpg',
    }
  });
  console.log('Upisana test slika:', image.imageUrl);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
