import { PrismaClient, PricingTier } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedPricingPlans() {
  const plans = [
    {
      tier: PricingTier.free,
      nameSr: 'Besplatno',
      nameEn: 'Free',
      imageLimit: 10,
      price: 0,
      recommended: false,
      sortOrder: 0,
      features: [
        { textSr: 'Do 10 slika po gostu', textEn: 'Up to 10 images per guest', sortOrder: 0 },
        { textSr: 'QR kod za pristup', textEn: 'QR code access', sortOrder: 1 },
        { textSr: 'Galerija fotografija', textEn: 'Photo gallery', sortOrder: 2 },
        { textSr: 'Preuzimanje svih slika', textEn: 'Download all images', sortOrder: 3 },
      ],
    },
    {
      tier: PricingTier.basic,
      nameSr: 'Osnovno',
      nameEn: 'Basic',
      imageLimit: 25,
      price: 1999,
      recommended: false,
      sortOrder: 1,
      features: [
        { textSr: 'Do 25 slika po gostu', textEn: 'Up to 25 images per guest', sortOrder: 0 },
        { textSr: 'Prilagođen QR kod', textEn: 'Custom QR code', sortOrder: 1 },
        { textSr: 'Galerija fotografija', textEn: 'Photo gallery', sortOrder: 2 },
        { textSr: 'Preuzimanje svih slika', textEn: 'Download all images', sortOrder: 3 },
        { textSr: 'Prioritetna podrška', textEn: 'Priority support', sortOrder: 4 },
      ],
    },
    {
      tier: PricingTier.premium,
      nameSr: 'Premium',
      nameEn: 'Premium',
      imageLimit: 50,
      price: 3999,
      recommended: true,
      sortOrder: 2,
      features: [
        { textSr: 'Do 50 slika po gostu', textEn: 'Up to 50 images per guest', sortOrder: 0 },
        { textSr: 'Prilagođen brending', textEn: 'Custom branding', sortOrder: 1 },
        { textSr: 'Napredni QR kod', textEn: 'Advanced QR code', sortOrder: 2 },
        { textSr: 'Galerija fotografija', textEn: 'Photo gallery', sortOrder: 3 },
        { textSr: 'Preuzimanje svih slika', textEn: 'Download all images', sortOrder: 4 },
        { textSr: 'Prioritetna podrška', textEn: 'Priority support', sortOrder: 5 },
        { textSr: 'Prilagođene poruke', textEn: 'Custom messages', sortOrder: 6 },
      ],
    },
    {
      tier: PricingTier.unlimited,
      nameSr: 'Neograničeno',
      nameEn: 'Unlimited',
      imageLimit: 999,
      price: 5999,
      recommended: false,
      sortOrder: 3,
      features: [
        { textSr: 'Neograničeno slika po gostu', textEn: 'Unlimited images per guest', sortOrder: 0 },
        { textSr: 'Potpuna prilagodljivost', textEn: 'Full customization', sortOrder: 1 },
        { textSr: 'White-label opcija', textEn: 'White-label option', sortOrder: 2 },
        { textSr: 'Sve premium funkcije', textEn: 'All premium features', sortOrder: 3 },
        { textSr: 'Dedicirana podrška', textEn: 'Dedicated support', sortOrder: 4 },
        { textSr: 'Napredna analitika', textEn: 'Advanced analytics', sortOrder: 5 },
      ],
    },
  ];

  for (const plan of plans) {
    const { features, ...planData } = plan;
    await prisma.pricingPlan.upsert({
      where: { tier: plan.tier },
      update: {
        ...planData,
        features: {
          deleteMany: {},
          create: features,
        },
      },
      create: {
        ...planData,
        features: {
          create: features,
        },
      },
    });
    console.log(`Plan '${plan.tier}' seeded`);
  }
}

async function seedTestAdmin() {
  const email = 'admin@test.com';
  const password = 'test1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (!existing) {
    await prisma.admin.create({
      data: {
        email,
        passwordHash,
        firstName: 'Admin',
        lastName: 'Test',
      },
    });
    console.log('Test admin kreiran:', email);
  } else {
    console.log('Test admin već postoji:', email);
  }
}

async function main() {
  await seedPricingPlans();
  await seedTestAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
