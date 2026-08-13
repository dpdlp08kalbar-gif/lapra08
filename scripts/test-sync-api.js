const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});
(async () => {
  // Get the SK doc with fileData
  const sk = await prisma.sKDocument.findFirst({
    where: { fileName: { contains: '016 SK LP08' } },
    select: { id: true, fileName: true, fileData: true, ocrStatus: true, extractedText: true, ocrMetadata: true }
  });
  if (!sk) {
    console.log('SK not found');
    return;
  }
  console.log('=== SK Document ===');
  console.log('ID:', sk.id);
  console.log('FileName:', sk.fileName);
  console.log('OCR Status:', sk.ocrStatus);
  console.log('ExtractedText:', sk.extractedText?.substring(0, 500));
  console.log('OCR Metadata:', sk.ocrMetadata);
  console.log('FileData length:', sk.fileData?.length || 0);
  console.log('FileData starts with:', sk.fileData?.substring(0, 50));

  // Now try to extract pengurus locally using our extractor
  console.log('\n=== Testing FOSS extractor ===');
  try {
    const { extractPengurusFromDataUrl } = require('/home/z/my-project/src/lib/sk-extractor.ts');
    // Can't use require for TS, let's use dynamic import
    const mod = await import('/home/z/my-project/src/lib/sk-extractor.ts');
    const result = await mod.extractPengurusFromDataUrl(sk.fileData);
    console.log('Pengurus count:', result.pengurus.length);
    console.log('SK info:', JSON.stringify(result.skInfo, null, 2));
    result.pengurus.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i+1}. ${p.fullName} — ${p.positionName} ${p.phone || ''}`);
    });
  } catch (e) {
    console.error('❌ Extractor error:', e.message);
    console.error(e.stack);
  }

  await prisma.$disconnect();
})();
