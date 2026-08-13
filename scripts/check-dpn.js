const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});
(async () => {
  const dpn = await prisma.orgPosition.findMany({ where: { level: 'DPN' }, orderBy: { order: 'asc' }, include: { territory: { select: { name: true } } } });
  console.log(`DPN: ${dpn.length} pengurus`);
  dpn.forEach(p => console.log(`  ${p.order}. ${p.fullName} — ${p.positionName} (${p.phone || 'no WA'}) [${p.approvalStatus}, ${p.territory?.name}]`));

  // Check if extract-pengurus still has ZAI fallback text
  const sk = await prisma.sKDocument.findFirst({ where: { fileName: { contains: '016 SK' } }, select: { extractedText: true, ocrStatus: true, ocrMetadata: true } });
  if (sk) {
    console.log('\nSK Kalbar OCR status:', sk.ocrStatus);
    console.log('Extracted text (first 200):', sk.extractedText?.substring(0, 200));
    console.log('OCR metadata:', sk.ocrMetadata?.substring(0, 200));
  }

  // Check if profile content has actual data
  const pc = await prisma.systemSetting.findMany({ where: { category: 'PROFILE_CONTENT' }, select: { key: true, value: true } });
  console.log('\nProfile Content:');
  pc.forEach(p => {
    const val = p.value?.substring(0, 100) || 'NULL';
    console.log(`  ${p.key}: ${val}`);
  });

  await prisma.$disconnect();
})();
