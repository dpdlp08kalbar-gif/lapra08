// LAPRA 08 - Seed 41 pengurus DPD Kalimantan Barat dari SK asli
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});

const pengurus = [
  { order: 1, fullName: 'Bun Hon Khiong', positionName: 'Ketua', phone: '081283496168' },
  { order: 2, fullName: 'Eddy Ruslan, BA', positionName: 'Ketua Harian', phone: '081249944664' },
  { order: 3, fullName: 'Dedy Zahidi, S.Kom.', positionName: 'Wakil Ketua I (Internal)', phone: '087842151443' },
  { order: 4, fullName: 'Rusdi Chandra', positionName: 'Wakil Ketua II (Eksternal)', phone: '081257888666' },
  { order: 5, fullName: 'Marvely Nustra Bellem, S.IP', positionName: 'Wakil Ketua III (Dana & Inv)', phone: '081250846239' },
  { order: 6, fullName: 'AKBP (Purn) Slamet Riyadi, SH', positionName: 'Wakil Ketua IV (Huk & HAM)', phone: '081235223344' },
  { order: 7, fullName: 'Martinus, SE, M.Si', positionName: 'Sekretaris', phone: '085319317711' },
  { order: 8, fullName: 'Yesi Mayasari, S.H., M.H.', positionName: 'Wakil Sekretaris I', phone: '087755743499' },
  { order: 9, fullName: 'Eriono, S.T.', positionName: 'Wakil Sekretaris II', phone: '085750503097' },
  { order: 10, fullName: 'Suryadi', positionName: 'Bendahara', phone: '081257342299' },
  { order: 11, fullName: 'Martina, S.Pd.', positionName: 'Wakil Bendahara I', phone: '082252215474' },
  { order: 12, fullName: 'Kristy Damayanti, S.H.', positionName: 'Wakil Bendahara II', phone: '082151468201' },
  { order: 13, fullName: 'Heryanto', positionName: 'Bidang Sekretariat', phone: '085657267712' },
  { order: 14, fullName: 'Marselus', positionName: 'Wakil Bidang Sekretariat', phone: '081350085098' },
  { order: 15, fullName: 'Ismail Djayusman', positionName: 'Bidang Humas', phone: '085213651122' },
  { order: 16, fullName: 'Defriandi Irwan', positionName: 'Wakil Bidang Humas', phone: '085213651122' },
  { order: 17, fullName: 'Andri Zuliansyah, S.P.', positionName: 'Bidang Antar Lembaga', phone: '085245685139' },
  { order: 18, fullName: 'Heronimus Timin', positionName: 'Wakil Bidang Antar Lembaga', phone: '082159607130' },
  { order: 19, fullName: 'Drs. Yupinalis', positionName: 'Bidang Lembaga Pemerintahan', phone: '085252099239' },
  { order: 20, fullName: 'Suwartono', positionName: 'Bidang Non Pemerintah/Swasta', phone: '0895337470303' },
  { order: 21, fullName: 'Abraham Yadi Chairman', positionName: 'Wakil Bidang Non Pemerintah/Swasta', phone: '087844241550' },
  { order: 22, fullName: 'Halijah', positionName: 'Bidang Lembaga Luar Negeri', phone: '085820876980' },
  { order: 23, fullName: 'Hendri Budiman', positionName: 'Wakil Bidang Lembaga Luar Negeri', phone: '082255006668' },
  { order: 24, fullName: 'Hasrani, S.T.', positionName: 'Bidang Program Internal', phone: '089692043222' },
  { order: 25, fullName: 'Ibrahim', positionName: 'Wakil Bidang Program Internal', phone: '082252091122' },
  { order: 26, fullName: 'Erwan Gunawan', positionName: 'Bidang Program Eksternal', phone: '081345277389' },
  { order: 27, fullName: 'Meliana Gading, S.Pd.', positionName: 'Bidang Pemberdayaan Perempuan', phone: '081251792813' },
  { order: 28, fullName: 'Rosmawati Hasibuan', positionName: 'Wakil Bidang Pemberdayaan Perempuan', phone: '089676236990' },
  { order: 29, fullName: 'Heri Wahyudi', positionName: 'Bidang Kerukunan Antar Agama', phone: '083117458644' },
  { order: 30, fullName: 'Oren Rianto, S.Sos.', positionName: 'Bidang Kaderisasi & Organisasi', phone: '085753500769' },
  { order: 31, fullName: 'Mega Detriani', positionName: 'Wakil Bidang Kaderisasi & Organisasi', phone: '08152229990' },
  { order: 32, fullName: 'Hafizul Munir, B.Sc.', positionName: 'Bidang Etik', phone: '081256374119' },
  { order: 33, fullName: 'Sofyan, S.H.', positionName: 'Bidang Advokasi & Hukum', phone: '081352629189' },
  { order: 34, fullName: 'Khondory Syamlawi, S.H., M.H.', positionName: 'Bidang Litigasi', phone: '081352177787' },
  { order: 35, fullName: 'Akhyani, BA', positionName: 'Bidang Non Litigasi', phone: '081345661901' },
  { order: 36, fullName: "Sa'at", positionName: 'Bidang Ketenagakerjaan', phone: '085822266590' },
  { order: 37, fullName: 'Kirno El Quraisyi', positionName: 'Wakil Bidang Ketenagakerjaan', phone: '081256988336' },
  { order: 38, fullName: 'Nandi Putra Jumpa Gira', positionName: 'Bidang Kepemudaan', phone: '087882657179' },
  { order: 39, fullName: 'Tiamus, S.Ag.', positionName: 'Wakil Bidang Kepemudaan', phone: '083861066900' },
  { order: 40, fullName: 'Endih Supandih', positionName: 'Bidang Ekonomi Kreatif', phone: '08115667500' },
  { order: 41, fullName: 'Nurhani, S.Th.', positionName: 'Wakil Bidang Ekonomi Kreatif', phone: '081522964097' },
];

(async () => {
  try {
    // Get DPD Kalimantan Barat territory
    const territory = await prisma.territory.findFirst({
      where: { name: { contains: 'Kalimantan Barat' }, level: 'PROVINCE' }
    });
    if (!territory) {
      console.error('❌ Territory DPD Kalimantan Barat not found');
      process.exit(1);
    }
    console.log(`📍 Territory: ${territory.name} (${territory.id})`);

    // Get superadmin user
    const superadmin = await prisma.user.findFirst({ where: { username: 'superadmin' } });
    if (!superadmin) {
      console.error('❌ Superadmin not found');
      process.exit(1);
    }
    console.log(`👤 User: ${superadmin.fullName}`);

    // Delete existing pengurus for this territory
    const deleted = await prisma.orgPosition.deleteMany({
      where: { territoryId: territory.id, level: 'DPD' }
    });
    console.log(`🗑️ Deleted ${deleted.count} existing pengurus`);

    // Create new pengurus
    let created = 0;
    for (const p of pengurus) {
      await prisma.orgPosition.create({
        data: {
          ...p,
          level: 'DPD',
          territoryId: territory.id,
          startDate: new Date(),
          approvalStatus: 'APPROVED',
          approvedById: superadmin.id,
          approvedAt: new Date(),
        },
      });
      created++;
    }

    console.log(`✅ Created ${created} pengurus DPD Kalimantan Barat`);
    console.log('\n=== Summary ===');
    console.log(`  Total pengurus DPD Kalbar: ${created}`);
    console.log('  Categories:');
    console.log(`    Pimpinan Utama (Ketua, Ketua Harian): 2`);
    console.log(`    Wakil Ketua: 4`);
    console.log(`    Sekretariat & Keuangan: 5`);
    console.log(`    Bidang-Bidang: 30`);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
