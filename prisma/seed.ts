import { PrismaClient, PricingTier } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedPricingPlans() {
  const plans = [
    {
      tier: PricingTier.free,
      nameSr: 'Besplatno',
      nameEn: 'Free',
      imageLimit: 3,
      price: 0,
      recommended: false,
      sortOrder: 0,
      features: [
        { textSr: 'Do 3 slike po gostu', textEn: 'Up to 3 images per guest', sortOrder: 0 },
        { textSr: 'Maksimalno 20 gostiju', textEn: 'Up to 20 guests', sortOrder: 1 },
        { textSr: 'Slike se čuvaju 10 dana', textEn: 'Photos stored for 10 days', sortOrder: 2 },
        { textSr: 'Standardni QR kod', textEn: 'Standard QR code', sortOrder: 3 },
        { textSr: 'Galerija fotografija', textEn: 'Photo gallery', sortOrder: 4 },
        { textSr: 'Preuzimanje svih slika', textEn: 'Download all images', sortOrder: 5 },
      ],
    },
    {
      tier: PricingTier.basic,
      nameSr: 'Osnovno',
      nameEn: 'Basic',
      imageLimit: 25,
      price: 1499,
      recommended: false,
      sortOrder: 1,
      features: [
        { textSr: 'Do 25 slika po gostu', textEn: 'Up to 25 images per guest', sortOrder: 0 },
        { textSr: 'Do 100 gostiju', textEn: 'Up to 100 guests', sortOrder: 1 },
        { textSr: 'Slike se čuvaju 30 dana', textEn: 'Photos stored for 30 days', sortOrder: 2 },
        { textSr: 'Prilagođen QR kod', textEn: 'Custom QR code', sortOrder: 3 },
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
        { textSr: 'Do 300 gostiju', textEn: 'Up to 300 guests', sortOrder: 1 },
        { textSr: 'Slike se čuvaju 1 godinu', textEn: 'Photos stored for 1 year', sortOrder: 2 },
        { textSr: 'Napredni QR kod', textEn: 'Advanced QR code', sortOrder: 3 },
        { textSr: 'Prilagođen brending', textEn: 'Custom branding', sortOrder: 4 },
        { textSr: 'Prilagođene poruke', textEn: 'Custom messages', sortOrder: 5 },
        { textSr: 'Dedicirana podrška', textEn: 'Dedicated support', sortOrder: 6 },
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
    console.log('Plan seeded:', plan.tier);
  }

  // Delete unlimited plan if it exists
  await prisma.pricingPlan.deleteMany({ where: { tier: 'unlimited' as any } }).catch(() => {});
}

async function seedTestAdmin() {
  const email = 'admin@test.com';
  const password = 'test1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (!existing) {
    await prisma.admin.create({
      data: { email, passwordHash, firstName: 'Admin', lastName: 'Test' },
    });
    console.log('Test admin kreiran:', email);
  } else {
    console.log('Test admin postoji:', email);
  }
}

async function main() {
  await seedPricingPlans();
  await seedTestAdmin();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
