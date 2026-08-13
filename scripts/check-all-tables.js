// LAPRA 08 - Audit all table row counts to find empty/unused menus
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});

(async () => {
  // Get all table names from information_schema
  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;

  console.log('=== Production Data Counts (Neon PostgreSQL) ===\n');
  console.log('Table'.padEnd(35) + 'Rows'.padStart(8) + '  Status');
  console.log('-'.repeat(60));

  let emptyCount = 0;
  let lowCount = 0;
  let okCount = 0;

  for (const { table_name } of tables) {
    try {
      const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS cnt FROM "${table_name}"`);
      const count = result[0]?.cnt || 0;
      let status = '✅ OK';
      if (count === 0) { status = '❌ EMPTY'; emptyCount++; }
      else if (count < 5) { status = '⚠️ LOW'; lowCount++; }
      else { okCount++; }
      console.log(table_name.padEnd(35) + String(count).padStart(8) + '  ' + status);
    } catch (e) {
      console.log(table_name.padEnd(35) + '   ERR'.padStart(8) + '  ⚠️ ' + e.message.substring(0, 40));
    }
  }

  console.log('\n=== Summary ===');
  console.log(`  Total tables: ${tables.length}`);
  console.log(`  Empty (0 rows): ${emptyCount}`);
  console.log(`  Low (<5 rows): ${lowCount}`);
  console.log(`  OK (≥5 rows): ${okCount}`);

  await prisma.$disconnect();
})();
