import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@test.com';
  const password = 'test1234';
  const passwordHash = await bcrypt.hash(password, 10);

  // Kreiraj admina samo ako ne postoji
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (!existing) {
    await prisma.admin.create({
      data: {
        email,
        passwordHash,
      },
    });
    console.log('Test admin kreiran:', email);
  } else {
    console.log('Test admin već postoji:', email);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
