// LAPRA 08 - Seed template struktur pengurus untuk SEMUA DPD & DPC
// =====================================================
// Template: 41 jabatan dari DPD Kalimantan Barat
// Untuk setiap DPD (44 provinsi) dan DPC (15 kab/kota) yang belum punya pengurus,
// buat 41 OrgPosition dengan:
//   - positionName: dari template (sama persis)
//   - fullName: "-" (kosong, akan diisi belakangan)
//   - phone: null
//   - email: null
//   - approvalStatus: APPROVED (template, siap edit)
//   - isActive: true
//   - source: TEMPLATE
//
// User bisa edit/tambah/hapus/sync dari Arsip SK belakangan.
// =====================================================
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});

// Template: 41 jabatan DPD Kalimantan Barat
const TEMPLATE_POSITIONS = [
  { order: 1, positionName: 'Ketua' },
  { order: 2, positionName: 'Ketua Harian' },
  { order: 3, positionName: 'Wakil Ketua I (Internal)' },
  { order: 4, positionName: 'Wakil Ketua II (Eksternal)' },
  { order: 5, positionName: 'Wakil Ketua III (Dana & Inv)' },
  { order: 6, positionName: 'Wakil Ketua IV (Huk & HAM)' },
  { order: 7, positionName: 'Sekretaris' },
  { order: 8, positionName: 'Wakil Sekretaris I' },
  { order: 9, positionName: 'Wakil Sekretaris II' },
  { order: 10, positionName: 'Bendahara' },
  { order: 11, positionName: 'Wakil Bendahara I' },
  { order: 12, positionName: 'Wakil Bendahara II' },
  { order: 13, positionName: 'Bidang Sekretariat' },
  { order: 14, positionName: 'Wakil Bidang Sekretariat' },
  { order: 15, positionName: 'Bidang Humas' },
  { order: 16, positionName: 'Wakil Bidang Humas' },
  { order: 17, positionName: 'Bidang Antar Lembaga' },
  { order: 18, positionName: 'Wakil Bidang Antar Lembaga' },
  { order: 19, positionName: 'Bidang Lembaga Pemerintahan' },
  { order: 20, positionName: 'Bidang Non Pemerintah/Swasta' },
  { order: 21, positionName: 'Wakil Bidang Non Pemerintah/Swasta' },
  { order: 22, positionName: 'Bidang Lembaga Luar Negeri' },
  { order: 23, positionName: 'Wakil Bidang Lembaga Luar Negeri' },
  { order: 24, positionName: 'Bidang Program Internal' },
  { order: 25, positionName: 'Wakil Bidang Program Internal' },
  { order: 26, positionName: 'Bidang Program Eksternal' },
  { order: 27, positionName: 'Bidang Pemberdayaan Perempuan' },
  { order: 28, positionName: 'Wakil Bidang Pemberdayaan Perempuan' },
  { order: 29, positionName: 'Bidang Kerukunan Antar Agama' },
  { order: 30, positionName: 'Bidang Kaderisasi & Organisasi' },
  { order: 31, positionName: 'Wakil Bidang Kaderisasi & Organisasi' },
  { order: 32, positionName: 'Bidang Etik' },
  { order: 33, positionName: 'Bidang Advokasi & Hukum' },
  { order: 34, positionName: 'Bidang Litigasi' },
  { order: 35, positionName: 'Bidang Non Litigasi' },
  { order: 36, positionName: 'Bidang Ketenagakerjaan' },
  { order: 37, positionName: 'Wakil Bidang Ketenagakerjaan' },
  { order: 38, positionName: 'Bidang Kepemudaan' },
  { order: 39, positionName: 'Wakil Bidang Kepemudaan' },
  { order: 40, positionName: 'Bidang Ekonomi Kreatif' },
  { order: 41, positionName: 'Wakil Bidang Ekonomi Kreatif' },
];

(async () => {
  try {
    console.log('🚀 Seed Template Struktur Pengurus untuk SEMUA DPD & DPC\n');

    // Get superadmin
    const superadmin = await prisma.user.findFirst({ where: { username: 'superadmin' } });
    if (!superadmin) { console.error('❌ Superadmin not found'); process.exit(1); }

    // Get all DPD territories (PROVINCE level)
    const provinces = await prisma.territory.findMany({
      where: { level: 'PROVINCE' },
      select: { id: true, name: true, code: true }
    });
    console.log(`📍 DPD (PROVINCE): ${provinces.length} territories`);

    // Get all DPC territories (REGENCY level)
    const regencies = await prisma.territory.findMany({
      where: { level: 'REGENCY' },
      select: { id: true, name: true, code: true }
    });
    console.log(`📍 DPC (REGENCY): ${regencies.length} territories\n`);

    // Check which territories already have pengurus
    const existingPositions = await prisma.orgPosition.findMany({
      where: { OR: [{ level: 'DPD' }, { level: 'DPC' }] },
      select: { territoryId: true, level: true }
    });
    const existingSet = new Set(existingPositions.map(p => `${p.territoryId}|${p.level}`));

    let totalCreated = 0;
    let dpdCreated = 0;
    let dpcCreated = 0;
    const errors = [];

    // Seed DPD (PROVINCE)
    console.log('=== SEED DPD ===');
    for (const prov of provinces) {
      const key = `${prov.id}|DPD`;
      if (existingSet.has(key)) {
        console.log(`  ⏭ ${prov.name} — sudah punya pengurus, skip`);
        continue;
      }

      try {
        // Batch create 41 positions for this DPD
        const positions = TEMPLATE_POSITIONS.map(t => ({
          fullName: '-',  // kosong, akan diisi belakangan
          positionName: t.positionName,
          level: 'DPD',
          territoryId: prov.id,
          order: t.order,
          phone: null,
          email: null,
          startDate: new Date(),
          approvalStatus: 'APPROVED',
          approvedById: superadmin.id,
          approvedAt: new Date(),
          source: 'TEMPLATE',
          isActive: true,
        }));

        await prisma.orgPosition.createMany({ data: positions });
        dpdCreated += 41;
        totalCreated += 41;
        console.log(`  ✅ ${prov.name} — 41 jabatan dibuat (nama kosong, siap edit)`);
      } catch (e) {
        errors.push(`DPD ${prov.name}: ${e.message}`);
        console.log(`  ❌ ${prov.name} — error: ${e.message}`);
      }
    }

    // Seed DPC (REGENCY)
    console.log('\n=== SEED DPC ===');
    for (const reg of regencies) {
      const key = `${reg.id}|DPC`;
      if (existingSet.has(key)) {
        console.log(`  ⏭ ${reg.name} — sudah punya pengurus, skip`);
        continue;
      }

      try {
        // Batch create 41 positions for this DPC
        const positions = TEMPLATE_POSITIONS.map(t => ({
          fullName: '-',
          positionName: t.positionName,
          level: 'DPC',
          territoryId: reg.id,
          order: t.order,
          phone: null,
          email: null,
          startDate: new Date(),
          approvalStatus: 'APPROVED',
          approvedById: superadmin.id,
          approvedAt: new Date(),
          source: 'TEMPLATE',
          isActive: true,
        }));

        await prisma.orgPosition.createMany({ data: positions });
        dpcCreated += 41;
        totalCreated += 41;
        console.log(`  ✅ ${reg.name} — 41 jabatan dibuat (nama kosong, siap edit)`);
      } catch (e) {
        errors.push(`DPC ${reg.name}: ${e.message}`);
        console.log(`  ❌ ${reg.name} — error: ${e.message}`);
      }
    }

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`DPD seeded: ${dpdCreated} positions (${dpdCreated / 41} DPDs)`);
    console.log(`DPC seeded: ${dpcCreated} positions (${dpcCreated / 41} DPCs)`);
    console.log(`Total created: ${totalCreated} positions`);
    if (errors.length > 0) {
      console.log(`Errors: ${errors.length}`);
      errors.forEach(e => console.log(`  - ${e}`));
    }

    // Final verify
    const finalCount = await prisma.orgPosition.groupBy({
      by: ['level'],
      _count: { _all: true },
    });
    console.log('\n=== FINAL DB STATE ===');
    finalCount.forEach(l => console.log(`  ${l.level}: ${l._count._all} pengurus`));

  } catch (e) {
    console.error('❌ Fatal:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
