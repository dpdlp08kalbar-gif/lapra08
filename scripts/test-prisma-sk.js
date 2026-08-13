const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});
(async () => {
  try {
    const sk = await prisma.sKDocument.create({
      data: {
        skNumber: `SK-TEST-${Date.now()}`,
        title: 'Test SK',
        fileUrl: '/api/sk/test-id/download',
        fileName: 'test.pdf',
        fileType: 'pdf',
        fileSize: 100,
        fileData: 'data:application/pdf;base64,JVBERi0xLjQK',
        ocrStatus: 'PENDING',
        issuedAt: new Date(),
        issuedBy: 'Test',
        territoryId: (await prisma.territory.findFirst({ where: { code: 'ID' } }))?.id,
      },
    });
    console.log('✅ Created:', sk.id);
    await prisma.sKDocument.delete({ where: { id: sk.id } });
    console.log('✅ Deleted (cleanup)');
  } catch (e) {
    console.error('❌ Error:', e.message.substring(0, 500));
  } finally {
    await prisma.$disconnect();
  }
})();
