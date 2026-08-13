const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});
(async () => {
  const deleted = await prisma.systemSetting.deleteMany({ where: { category: 'GALLERY_VIDEO' } });
  console.log(`Deleted ${deleted.count} GALLERY_VIDEO rows (will re-scrape with correct dates)`);
  await prisma.$disconnect();
})();
