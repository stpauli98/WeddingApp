import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

async function main() {
  console.log('=== Indexes per table ===');
  const indexes = await prisma.$queryRaw<
    Array<{ tablename: string; indexname: string; indexdef: string }>
  >`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes WHERE schemaname='public'
    ORDER BY tablename, indexname
  `;
  let currentTable = '';
  for (const i of indexes) {
    if (i.tablename !== currentTable) {
      currentTable = i.tablename;
      console.log(`\n  ${i.tablename}:`);
    }
    const short = i.indexdef.replace(/CREATE (UNIQUE )?INDEX .* ON [^(]+/, '').replace(/ USING btree/, '');
    console.log(`    ${(i.indexdef.includes('UNIQUE') ? '● UNIQUE ' : '○ ').padEnd(12)} ${i.indexname} ${short}`);
  }

  console.log('\n=== Foreign keys + ON DELETE actions ===');
  const fks = await prisma.$queryRaw<
    Array<{
      table_name: string;
      constraint_name: string;
      column_name: string;
      foreign_table: string;
      foreign_column: string;
      delete_rule: string;
      update_rule: string;
    }>
  >`
    SELECT
      tc.table_name, tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table,
      ccu.column_name AS foreign_column,
      rc.delete_rule, rc.update_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public'
    ORDER BY tc.table_name
  `;
  console.table(fks);

  console.log('\n=== Table + index sizes (bytes) ===');
  const sizes = await prisma.$queryRaw<
    Array<{ relname: string; total: string; table: string; indexes: string; toast: string; rows: bigint }>
  >`
    SELECT
      c.relname,
      pg_size_pretty(pg_total_relation_size(c.oid)) AS total,
      pg_size_pretty(pg_relation_size(c.oid)) AS "table",
      pg_size_pretty(pg_indexes_size(c.oid)) AS indexes,
      pg_size_pretty(pg_total_relation_size(c.reltoastrelid)) AS toast,
      c.reltuples::bigint AS rows
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r'
    ORDER BY pg_total_relation_size(c.oid) DESC
  `;
  console.table(sizes);

  console.log('\n=== Expired / orphan detection ===');
  const expiredAdminSessions = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(*)::bigint AS c FROM "AdminSession" WHERE "expiresAt" < NOW()
  `;
  const expiredGuestSessions = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(*)::bigint AS c FROM "Guest" WHERE "sessionExpires" IS NOT NULL AND "sessionExpires" < NOW()
  `;
  const orphanImages = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(*)::bigint AS c FROM "Image" i
    WHERE NOT EXISTS (SELECT 1 FROM "Guest" g WHERE g.id = i."guestId")
  `;
  const eventsWithoutAdmin = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(*)::bigint AS c FROM "Event" WHERE "adminId" IS NULL
  `;
  console.log(`  Expired admin sessions:  ${expiredAdminSessions[0].c}`);
  console.log(`  Expired guest sessions:  ${expiredGuestSessions[0].c}`);
  console.log(`  Orphan images:           ${orphanImages[0].c}`);
  console.log(`  Events without admin:    ${eventsWithoutAdmin[0].c}`);

  console.log('\n=== Columns lacking NOT NULL that probably should ===');
  const maybeNullable = await prisma.$queryRaw<
    Array<{ table_name: string; column_name: string; data_type: string }>
  >`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND is_nullable='YES'
      AND column_name NOT LIKE '%At'
      AND column_name NOT IN ('sessionToken','sessionExpires','storagePath','guestMessage','adminId','rolled_back_at','logs','finished_at')
    ORDER BY table_name, column_name
  `;
  console.table(maybeNullable);
}

main().finally(() => prisma.$disconnect());
