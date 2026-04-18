// Full DB audit: tables, columns, enums, row counts, and schema drift detection.
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

async function main() {
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
    ORDER BY table_name
  `;

  console.log('=== Tables + row counts ===');
  for (const { table_name } of tables) {
    const r = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
      `SELECT COUNT(*)::bigint AS c FROM "${table_name}"`
    );
    console.log(`  ${table_name.padEnd(25)} ${r[0].c} rows`);
  }

  console.log('\n=== Enums ===');
  const enums = await prisma.$queryRaw<Array<{ name: string; values: string }>>`
    SELECT t.typname AS name, string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS values
    FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
    GROUP BY t.typname ORDER BY t.typname
  `;
  for (const e of enums) console.log(`  ${e.name}: [${e.values}]`);

  console.log('\n=== Columns per table ===');
  for (const { table_name } of tables) {
    const cols = await prisma.$queryRaw<
      Array<{ column_name: string; data_type: string; is_nullable: string; column_default: string | null }>
    >`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=${table_name}
      ORDER BY ordinal_position
    `;
    console.log(`\n  ${table_name}:`);
    for (const c of cols) {
      const nullable = c.is_nullable === 'YES' ? '?' : ' ';
      const dflt = c.column_default ? ` default=${c.column_default.substring(0, 30)}` : '';
      console.log(`    ${nullable} ${c.column_name.padEnd(22)} ${c.data_type}${dflt}`);
    }
  }

  console.log('\n=== Check constraints ===');
  const checks = await prisma.$queryRaw<Array<{ table_name: string; constraint_name: string; check_clause: string }>>`
    SELECT tc.table_name, tc.constraint_name, cc.check_clause
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name=cc.constraint_name
    WHERE tc.table_schema='public' AND tc.constraint_type='CHECK'
    ORDER BY tc.table_name
  `;
  for (const c of checks) console.log(`  ${c.table_name}.${c.constraint_name}: ${c.check_clause}`);
  if (!checks.length) console.log('  (none)');

  console.log('\n=== Triggers ===');
  const triggers = await prisma.$queryRaw<Array<{ event_object_table: string; trigger_name: string; event_manipulation: string }>>`
    SELECT event_object_table, trigger_name, event_manipulation
    FROM information_schema.triggers WHERE trigger_schema='public'
    ORDER BY event_object_table, trigger_name
  `;
  for (const t of triggers) console.log(`  ${t.event_object_table}.${t.trigger_name} (${t.event_manipulation})`);
  if (!triggers.length) console.log('  (none)');
}

main().finally(() => prisma.$disconnect());
