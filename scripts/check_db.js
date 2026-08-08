const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const ann = await prisma.announcement.findMany({ select: { id: true, title: true, source: true, photoUrl: true, sourceUrl: true, sourceName: true, type: true }, take: 30 });
    console.log('=== Announcements ===');
    ann.forEach(a => console.log(`- ${a.id} | src=${a.source} | type=${a.type} | photo=${a.photoUrl || 'NULL'} | srcName=${a.sourceName || '-'} | ${a.title.substring(0, 60)}`));
    const gal = await prisma.asset.findMany({ select: { id: true, name: true, fileUrl: true, type: true }, take: 50 });
    console.log('=== Assets ===');
    gal.forEach(g => console.log(`- ${g.id} | type=${g.type} | ${g.name} | ${g.fileUrl}`));
    console.log('Total assets:', gal.length);
    console.log('Total announcements:', ann.length);
  } catch(e) { console.error(e); }
  finally { await prisma.$disconnect(); }
})();
