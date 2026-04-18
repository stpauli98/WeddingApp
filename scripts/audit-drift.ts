// Comprehensive DB health audit: exits 1 on any drift/integrity/orphan issue.
// CI/cron-friendly. Read-only.
//
//   Checks:
//   1. Event.imageLimit drift vs PricingPlan[tier]
//   2. Event.pricingTier must match a PricingPlan row
//   3. Every PricingTier enum value must have a PricingPlan row
//   4. Orphan Image (guest FK missing) — should be impossible with FK, defensive
//   5. Orphan AdminSession (admin FK missing)
//   6. Orphan Message (guest FK missing)
//
//   Run: npx tsx scripts/audit-drift.ts
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

type Finding = { severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'; check: string; detail: string };

async function main() {
  const findings: Finding[] = [];

  // 1. Event.imageLimit vs PricingPlan[tier]
  const plans = await prisma.$queryRaw<Array<{ tier: string; imageLimit: number }>>`
    SELECT tier::text, "imageLimit" FROM "PricingPlan"
  `;
  const byTier = new Map(plans.map((p) => [p.tier, p.imageLimit]));

  const events = await prisma.event.findMany({
    select: { id: true, slug: true, pricingTier: true, imageLimit: true },
  });
  for (const e of events) {
    const expected = byTier.get(e.pricingTier);
    if (expected === undefined) {
      findings.push({
        severity: 'HIGH',
        check: 'Event.pricingTier has no PricingPlan row',
        detail: `event=${e.slug} tier=${e.pricingTier}`,
      });
    } else if (expected !== e.imageLimit) {
      findings.push({
        severity: 'HIGH',
        check: 'Event.imageLimit drift from PricingPlan',
        detail: `event=${e.slug} tier=${e.pricingTier} actual=${e.imageLimit} expected=${expected}`,
      });
    }
  }

  // 2. Every enum value must have a PricingPlan row
  const enumValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
    SELECT e.enumlabel FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PricingTier'
  `;
  for (const v of enumValues) {
    if (!byTier.has(v.enumlabel)) {
      findings.push({
        severity: 'CRITICAL',
        check: 'PricingTier enum value has no PricingPlan row',
        detail: `tier=${v.enumlabel}`,
      });
    }
  }

  // 3. Orphan detection (defensive — FKs should prevent these)
  const orphanImages = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(*)::bigint AS c FROM "Image" i
    WHERE NOT EXISTS (SELECT 1 FROM "Guest" g WHERE g.id = i."guestId")
  `;
  if (orphanImages[0].c > 0n) {
    findings.push({
      severity: 'CRITICAL',
      check: 'Orphan Image (guest FK broken)',
      detail: `count=${orphanImages[0].c}`,
    });
  }

  const orphanSessions = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(*)::bigint AS c FROM "AdminSession" s
    WHERE NOT EXISTS (SELECT 1 FROM "Admin" a WHERE a.id = s."adminId")
  `;
  if (orphanSessions[0].c > 0n) {
    findings.push({
      severity: 'CRITICAL',
      check: 'Orphan AdminSession (admin FK broken)',
      detail: `count=${orphanSessions[0].c}`,
    });
  }

  const orphanMessages = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(*)::bigint AS c FROM "Message" m
    WHERE NOT EXISTS (SELECT 1 FROM "Guest" g WHERE g.id = m."guestId")
  `;
  if (orphanMessages[0].c > 0n) {
    findings.push({
      severity: 'CRITICAL',
      check: 'Orphan Message (guest FK broken)',
      detail: `count=${orphanMessages[0].c}`,
    });
  }

  // Report
  if (findings.length === 0) {
    console.log(
      `✓ No drift (${events.length} events, ${plans.length} plans, ${enumValues.length} enum values)`
    );
    process.exit(0);
  }

  console.error(`✗ ${findings.length} issue(s) detected:`);
  console.table(findings);
  process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(2);
  })
  .finally(() => prisma.$disconnect());
