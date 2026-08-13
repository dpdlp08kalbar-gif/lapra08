const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});
(async () => {
  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'SKDocument'
    ORDER BY ordinal_position
  `;
  console.log('SKDocument columns:');
  cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
  await prisma.$disconnect();
})();
