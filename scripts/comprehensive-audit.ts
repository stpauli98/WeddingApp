import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

async function main() {
  console.log('=== 1. FOREIGN KEY CONSTRAINTS (via pg_constraint) ===\n');
  const fks = await prisma.$queryRaw<Array<{ conname: string; table: string; def: string }>>`
    SELECT conname, conrelid::regclass::text AS table, pg_get_constraintdef(oid) AS def
    FROM pg_constraint WHERE contype = 'f' ORDER BY conrelid::regclass, conname
  `;
  if (fks.length === 0) {
    console.log('  RESULT: NO FOREIGN KEYS DEFINED\n');
  } else {
    for (const fk of fks) {
      console.log(`  ${fk.table}.${fk.conname}:`);
      console.log(`    ${fk.def}\n`);
    }
  }

  console.log('=== 2. ROW-LEVEL SECURITY STATUS ===\n');
  const rls = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'
  `;
  for (const t of rls) {
    const status = t.rowsecurity ? 'ENABLED' : 'disabled';
    console.log(`  ${t.tablename}: ${status}`);
  }

  console.log('\n=== RLS POLICIES ===\n');
  const policies = await prisma.$queryRaw<Array<{ tablename: string; policyname: string; permissive: string; roles: string }>>`
    SELECT tablename, policyname, permissive, roles::text FROM pg_policies WHERE schemaname='public'
  `;
  if (policies.length === 0) {
    console.log('  RESULT: NO RLS POLICIES DEFINED\n');
  } else {
    for (const p of policies) {
      console.log(`  ${p.tablename}.${p.policyname}: ${p.permissive} | ${p.roles}`);
    }
  }

  console.log('\n=== 3. CHECK CONSTRAINTS ===\n');
  const checks = await prisma.$queryRaw<Array<{ conname: string; table: string; def: string }>>`
    SELECT conname, conrelid::regclass::text AS table, pg_get_constraintdef(oid)
    FROM pg_constraint WHERE contype = 'c'
  `;
  if (checks.length === 0) {
    console.log('  RESULT: NO CHECK CONSTRAINTS\n');
  } else {
    for (const c of checks) {
      console.log(`  ${c.table}.${c.conname}: ${c.def}`);
    }
  }

  console.log('\n=== 4. EXISTING INDEXES ===\n');
  const indexes = await prisma.$queryRaw<Array<{ tablename: string; indexname: string; indexdef: string }>>`
    SELECT tablename, indexname, indexdef FROM pg_indexes 
    WHERE schemaname='public' AND indexname NOT LIKE '%pkey%'
    ORDER BY tablename, indexname
  `;
  for (const idx of indexes) {
    console.log(`  ${idx.tablename}: ${idx.indexname}`);
  }

  console.log('\n=== 5. CLEANUP OPPORTUNITIES ===\n');
  
  const expiredGuests = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM "Guest" WHERE "sessionExpires" < NOW()
  `;
  console.log(`  Expired guest sessions: ${expiredGuests[0].count}`);

  const expiredAdminSessions = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM "AdminSession" WHERE "expiresAt" < NOW()
  `;
  console.log(`  Expired admin sessions (overdue cleanup): ${expiredAdminSessions[0].count}`);

  const guestsNoSession = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM "Guest" WHERE "sessionToken" IS NULL
  `;
  console.log(`  Guests never logged in (no sessionToken): ${guestsNoSession[0].count}`);

  const oldImages = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM "Image" WHERE "createdAt" < NOW() - INTERVAL '30 days'
  `;
  console.log(`  Images older than 30 days: ${oldImages[0].count}`);

  console.log('\n=== 6. PRICING / SCHEMA CONSISTENCY ===\n');
  
  const pricingPlans = await prisma.$queryRaw<Array<{ tier: string; imageLimit: number }>>`
    SELECT tier, "imageLimit" FROM "PricingPlan" ORDER BY tier
  `;
  console.log('  PricingPlan rows:');
  for (const p of pricingPlans) {
    console.log(`    ${p.tier}: imageLimit=${p.imageLimit}`);
  }

  const tiers = ['free', 'basic', 'premium', 'unlimited'];
  const foundTiers = pricingPlans.map(p => p.tier);
  const missingTiers = tiers.filter(t => !foundTiers.includes(t));
  if (missingTiers.length > 0) {
    console.log(`  Missing enum values in DB: ${missingTiers.join(', ')}`);
  } else {
    console.log(`  All expected enum values present`);
  }

  const eventMismatch = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM "Event" e 
    WHERE NOT EXISTS (SELECT 1 FROM "PricingPlan" p WHERE p.tier = e."pricingTier")
  `;
  console.log(`  Events with pricingTier not in PricingPlan: ${eventMismatch[0].count}`);

  console.log('\n=== ROW COUNTS ===\n');
  const tables = ['Admin', 'AdminSession', 'Event', 'Guest', 'Image', 'Message', 'PricingPlan', 'PricingFeature'];
  for (const table of tables) {
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM "${table}"`
    );
    console.log(`  ${table}: ${result[0].count} rows`);
  }
}

main()
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
