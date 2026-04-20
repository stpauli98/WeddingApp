// Seed is idempotent and reads from lib/pricing-tiers.ts (single source of truth).
// Running this in production is safe: upserts plan metadata to match the lib file.
import { PrismaClient, PricingTier } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PRICING_TIERS } from '../lib/pricing-tiers';

const prisma = new PrismaClient();

async function seedPricingPlans() {
  const sortOrder: Record<string, number> = { free: 0, basic: 1, premium: 2, unlimited: 3 };

  for (const [tier, config] of Object.entries(PRICING_TIERS)) {
    const planData = {
      nameSr: config.name.sr,
      nameEn: config.name.en,
      imageLimit: config.imageLimit,
      clientResizeMaxWidth: config.clientResizeMaxWidth,
      clientQuality: config.clientQuality,
      storeOriginal: config.storeOriginal,
      price: config.price,
      recommended: config.recommended ?? false,
      sortOrder: sortOrder[tier] ?? 99,
      // Unlimited je deprecated (2026-04-20). Row ostaje u DB-u za
      // back-compat sa postojećim event-ima koji koriste taj enum value,
      // ali ne pojavljuje se na landing/admin zbog active:false.
      active: tier !== 'unlimited',
    };

    await prisma.pricingPlan.upsert({
      where: { tier: tier as PricingTier },
      update: {
        ...planData,
        features: {
          deleteMany: {},
          create: config.features.map((f, i) => ({
            textSr: f.sr,
            textEn: f.en,
            sortOrder: i,
          })),
        },
      },
      create: {
        tier: tier as PricingTier,
        ...planData,
        features: {
          create: config.features.map((f, i) => ({
            textSr: f.sr,
            textEn: f.en,
            sortOrder: i,
          })),
        },
      },
    });
    console.log(`  ✓ ${tier}: imageLimit=${config.imageLimit}, price=${config.price}`);
  }
}

async function seedTestAdmin() {
  if (process.env.NODE_ENV === 'production') return;
  const email = 'admin@test.com';
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`  ✓ test admin already exists: ${email}`);
    return;
  }
  const passwordHash = await bcrypt.hash('test1234', 10);
  await prisma.admin.create({
    data: { email, passwordHash, firstName: 'Admin', lastName: 'Test' },
  });
  console.log(`  ✓ test admin created: ${email}`);
}

async function main() {
  console.log('Seeding PricingPlan rows from lib/pricing-tiers.ts…');
  await seedPricingPlans();
  console.log('Seeding test admin (dev only)…');
  await seedTestAdmin();
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
