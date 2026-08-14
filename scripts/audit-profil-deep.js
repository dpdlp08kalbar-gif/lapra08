const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});

(async () => {
  console.log('=== AUDIT PROFIL MENU (DEEP) ===\n');

  // 1. Profile Content (stored in SystemSetting, category=PROFILE_CONTENT)
  const profileContents = await prisma.systemSetting.count({ where: { category: 'PROFILE_CONTENT' } });
  console.log(`[1] ProfileContent (SystemSetting): ${profileContents} rows`);
  const pcSamples = await prisma.systemSetting.findMany({ where: { category: 'PROFILE_CONTENT' }, select: { key: true, description: true, updatedAt: true }, take: 15 });
  pcSamples.forEach(s => console.log(`     - ${s.key}: "${s.description}" (updated: ${s.updatedAt?.toISOString().slice(0,10)})`));

  // 2. OrgPositions (Struktur Pengurus)
  console.log(`\n[2] OrgPosition (Struktur Pengurus):`);
  const byLevel = await prisma.orgPosition.groupBy({ by: ['level'], _count: { _all: true } });
  byLevel.forEach(l => console.log(`     ${l.level}: ${l._count._all} pengurus`));

  // Check DPD Kalbar
  const kalbarTerr = await prisma.territory.findFirst({ where: { name: { contains: 'Kalimantan Barat' }, level: 'PROVINCE' } });
  if (kalbarTerr) {
    const kalbarPengurus = await prisma.orgPosition.findMany({
      where: { territoryId: kalbarTerr.id },
      orderBy: { order: 'asc' },
      select: { fullName: true, positionName: true, phone: true, approvalStatus: true, isActive: true, order: true },
    });
    console.log(`     DPD Kalbar: ${kalbarPengurus.length} pengurus`);
    console.log(`     Active: ${kalbarPengurus.filter(p => p.isActive).length}, Approved: ${kalbarPengurus.filter(p => p.approvalStatus === 'APPROVED').length}`);
    console.log(`     First 5:`);
    kalbarPengurus.slice(0, 5).forEach(p => console.log(`       ${p.order || '-'}. ${p.fullName} — ${p.positionName} (${p.phone || 'no WA'}) [${p.approvalStatus}, ${p.isActive ? 'Active' : 'Inactive'}]`));
  }

  // 3. SK Documents
  console.log(`\n[3] SKDocument (Arsip SK):`);
  const skDocs = await prisma.sKDocument.findMany({
    select: { id: true, skNumber: true, title: true, fileName: true, ocrStatus: true, fileSize: true, territory: { select: { name: true, level: true } } },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`     Total: ${skDocs.length} dokumen`);
  // Check fileData presence via raw SQL
  const skFileData = await prisma.$queryRaw`
    SELECT id, "fileName", "ocrStatus",
           CASE WHEN "fileData" IS NOT NULL THEN 'YES' ELSE 'NO' END AS has_file_data
    FROM "SKDocument" ORDER BY "createdAt" DESC LIMIT 10
  `;
  skFileData.forEach(d => console.log(`     - ${d.fileName} | OCR: ${d.ocrStatus} | FileData: ${d.has_file_data}`));

  // 4. Profile Documents (AD/ART + Legalitas) — stored in SystemSetting
  console.log(`\n[4] SystemSetting categories:`);
  const byCategory = await prisma.systemSetting.groupBy({ by: ['category'], _count: { _all: true } });
  byCategory.forEach(c => console.log(`     ${c.category}: ${c._count._all} items`));

  // 5. Territory structure
  console.log(`\n[5] Territory:`);
  const territories = await prisma.territory.groupBy({ by: ['level'], _count: { _all: true } });
  territories.forEach(t => console.log(`     ${t.level}: ${t._count._all}`));

  // 6. OrgPositions with null/empty fields
  const nullName = await prisma.orgPosition.count({ where: { OR: [{ fullName: null }, { fullName: '' }, { positionName: null }, { positionName: '' }] } });
  console.log(`\n[6] OrgPositions with null/empty name or position: ${nullName}`);

  // 7. Approval status
  console.log(`\n[7] Approval Status:`);
  const byApproval = await prisma.orgPosition.groupBy({ by: ['approvalStatus'], _count: { _all: true } });
  byApproval.forEach(a => console.log(`     ${a.approvalStatus}: ${a._count._all}`));

  // 8. Active vs Inactive
  console.log(`\n[8] Active/Inactive:`);
  const activeCount = await prisma.orgPosition.count({ where: { isActive: true } });
  const inactiveCount = await prisma.orgPosition.count({ where: { isActive: false } });
  console.log(`     Active: ${activeCount}, Inactive: ${inactiveCount}`);

  await prisma.$disconnect();
  console.log('\n=== AUDIT COMPLETE ===');
})();
