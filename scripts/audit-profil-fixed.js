const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});
(async () => {
  console.log('=== AUDIT PROFIL MENU ===\n');

  // OrgPosition by level
  console.log('[1] OrgPosition by level:');
  const dpn = await prisma.orgPosition.count({ where: { level: 'DPN' } });
  const dpd = await prisma.orgPosition.count({ where: { level: 'DPD' } });
  const dpc = await prisma.orgPosition.count({ where: { level: 'DPC' } });
  console.log(`     DPN: ${dpn}, DPD: ${dpd}, DPC: ${dpc}`);

  // DPD Kalbar detail
  const kalbar = await prisma.territory.findFirst({ where: { name: { contains: 'Kalimantan Barat' }, level: 'PROVINCE' } });
  if (kalbar) {
    const kp = await prisma.orgPosition.findMany({ where: { territoryId: kalbar.id }, orderBy: { order: 'asc' } });
    console.log(`\n[2] DPD Kalbar: ${kp.length} pengurus`);
    console.log(`     Active: ${kp.filter(p => p.isActive).length}, Approved: ${kp.filter(p => p.approvalStatus === 'APPROVED').length}`);
    kp.slice(0, 5).forEach(p => console.log(`     ${p.order}. ${p.fullName} — ${p.positionName} (${p.phone || 'no WA'}) [${p.approvalStatus}]`));
  }

  // SK Documents
  console.log('\n[3] SKDocument:');
  const sks = await prisma.sKDocument.findMany({ select: { id: true, fileName: true, ocrStatus: true, territory: { select: { name: true } } } });
  console.log(`     Total: ${sks.length}`);
  sks.forEach(s => console.log(`     - ${s.fileName} | OCR: ${s.ocrStatus} | Territory: ${s.territory?.name}`));

  // Profile Documents (AD/ART + Legalitas)
  console.log('\n[4] Profile Documents:');
  const pds = await prisma.systemSetting.findMany({ where: { category: 'PROFILE_DOCUMENT' }, select: { key: true, description: true } });
  console.log(`     Total: ${pds.length}`);
  pds.forEach(d => console.log(`     - ${d.key}: ${d.description}`));

  // SystemSetting categories
  console.log('\n[5] All SystemSetting categories:');
  const cats = await prisma.systemSetting.groupBy({ by: ['category'], _count: { _all: true } });
  cats.forEach(c => console.log(`     ${c.category}: ${c._count._all}`));

  // Profile Content
  console.log('\n[6] Profile Content:');
  const pcs = await prisma.systemSetting.findMany({ where: { category: 'PROFILE_CONTENT' }, select: { key: true, description: true, updatedAt: true } });
  pcs.forEach(p => console.log(`     - ${p.key}: ${p.description} (updated: ${p.updatedAt?.toISOString().slice(0,10)})`));

  // Gallery items
  console.log('\n[7] Gallery (GALLERY + GALLERY_VIDEO):');
  const gallery = await prisma.systemSetting.count({ where: { category: 'GALLERY' } });
  const galleryVideo = await prisma.systemSetting.count({ where: { category: 'GALLERY_VIDEO' } });
  console.log(`     GALLERY (Foto+Program): ${gallery}`);
  console.log(`     GALLERY_VIDEO: ${galleryVideo}`);

  await prisma.$disconnect();
  console.log('\n=== DONE ===');
})();
