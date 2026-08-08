const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const sysSet = await prisma.systemSetting.findMany({ where: { category: 'GALLERY' }, select: { key: true, value: true, updatedAt: true } });
    console.log('=== Gallery Settings ===');
    sysSet.forEach(s => console.log(`- ${s.key} | ${s.value.substring(0, 200)}`));
    console.log('Total gallery items:', sysSet.length);
    const allCats = await prisma.systemSetting.findMany({ select: { category: true }, distinct: ['category'] });
    console.log('Categories:', allCats.map(c => c.category));
  } catch(e) { console.error(e); }
  finally { await prisma.$disconnect(); }
})();
