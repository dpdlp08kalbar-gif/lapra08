const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});
(async () => {
  const docs = await prisma.sKDocument.findMany({
    select: { id: true, title: true, fileName: true, fileUrl: true, fileType: true, fileSize: true, ocrStatus: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  console.log('=== Latest SK Documents ===');
  docs.forEach(d => {
    const hasFileData = d.fileUrl && d.fileUrl.startsWith('data:') ? 'YES (base64)' : d.fileUrl && d.fileUrl.startsWith('/api/sk/') ? 'YES (download URL)' : 'NO (old filesystem path)';
    console.log(`  ${d.id}`);
    console.log(`    Title: ${d.title}`);
    console.log(`    FileName: ${d.fileName}`);
    console.log(`    FileUrl: ${d.fileUrl?.substring(0, 80)}`);
    console.log(`    FileSize: ${d.fileSize} bytes`);
    console.log(`    OCR: ${d.ocrStatus}`);
    console.log(`    Created: ${d.createdAt}`);
    console.log('');
  });

  // Check if fileData column has data
  const withFileData = await prisma.$queryRaw`
    SELECT id, "fileName",
           CASE WHEN "fileData" IS NOT NULL THEN 'YES (' || LENGTH("fileData") || ' chars)'
                ELSE 'NO' END AS has_file_data
    FROM "SKDocument"
    ORDER BY "createdAt" DESC
    LIMIT 5
  `;
  console.log('=== fileData column status ===');
  withFileData.forEach(d => {
    console.log(`  ${d.fileName}: ${d.has_file_data}`);
  });

  await prisma.$disconnect();
})();
