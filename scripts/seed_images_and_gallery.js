// LAPRA 08 - Seed images for announcements + gallery items + program content
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapping announcement title pattern → image URL from search results
const IMG = {
  hashim_lantik:     'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/5f139c90784f.jpeg',  // RRI - Hashim
  lantik2:           'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/c9918afe50d9.jpeg',   // DelikAsia - pelantikan
  lantik3:           'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/f104bc16f01f.jpg',    // BIDIKKASUSNEWS
  seragam:           'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d9b49f9bf99a.jpg',     // katababel - seragam kehormatan
  peace_walk:        'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3651d2c23fb2.jpg',    // Irish Examiner - peace walk rally
  asta_cita:         'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/a326d98a27d4.jpg',     // Foreign Policy - Prabowo
  markas_baru:       'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/6355ab4a92ef.jpg',     // Carnegie - Jakarta meeting
  aksi_babel:        'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/31933e5cf281.jpg',     // DT Peduli - aksi sosial
  dukung_pemerintah: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0e9e522793f5.jpg',     // Jakarta Post - supporters
  // Gallery additional
  gallery_meeting:   'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/abd24400739d.jpg',    // Mabes TNI - formal meeting
  gallery_seminar:   'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/616d472dfec0.jpg',     // EEAS - seminar audience
  gallery_donation:  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/999375ded343.jpg',    // Fight Back - community
  gallery_flag:      'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/cf1a4ba54c82.jpg',    // Shutterstock - flag ceremony
  gallery_blood:     'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/465920f6c624.png',    // Acibadem - blood donation
  gallery_skyline:   'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3a8cf43abb3c.jpg',     // NYT - Jakarta skyline
  gallery_interfaith:'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/1aaffb59ce81.jpeg',  // LiCAS - interfaith
  gallery_workshop:  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/04a8bfdec633.png',    // Speech Academy - workshop
  gallery_volunteer: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/19ddffb90a1b.jpg',     // Peace Corps - volunteer
  gallery_redcross:  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3f8c51eb80b5.jpeg',   // Red Cross
  gallery_un:        'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d12c6efb1fe8.png',     // UN
  gallery_newsphoto: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/dc1f9d832ad5.jpg',     // CNN
  gallery_crowd:     'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/a8278cb34097.jpg',     // BBC - crowd
  gallery_youtube1:  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/cf45272371b0.jpg',     // YouTube
  gallery_youtube2:  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/e0a679d7590a.jpg',     // YouTube
  gallery_newsweek:  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/ecc961a8e0b8.jpg',     // Newsweek
};

// Title keyword → image mapping
const titleImageMap = [
  { match: 'Hashim Djojohadikusumo Lantik Pengurus Laskar Prabowo 08 Per', img: IMG.hashim_lantik },
  { match: 'Peace Walk dan Peace Forum Dukung Pr', img: IMG.peace_walk },
  { match: 'Serahkan Seragam Kehormatan', img: IMG.seragam },
  { match: 'Kukuhkan Pengurus Baru dan Luncurkan Pusat', img: IMG.lantik2 },
  { match: 'Sukseskan Asta Cita', img: IMG.asta_cita },
  { match: 'Resmikan Markas Baru', img: IMG.markas_baru },
  { match: 'Aksi Berbagi Tak', img: IMG.aksi_babel },
  { match: 'Komit Dukung Pemerintahan Prabowo-Gibran', img: IMG.dukung_pemerintah },
];

(async () => {
  try {
    console.log('=== Step 1: Update announcement photoUrl ===');
    const anns = await prisma.announcement.findMany({ select: { id: true, title: true, source: true, photoUrl: true } });
    let updated = 0;
    for (const a of anns) {
      if (a.photoUrl) continue;
      const map = titleImageMap.find(m => a.title.includes(m.match));
      if (map) {
        await prisma.announcement.update({ where: { id: a.id }, data: { photoUrl: map.img } });
        console.log(`✓ ${a.source} | ${a.title.substring(0,60)} → ${map.img.substring(map.img.lastIndexOf('/')+1)}`);
        updated++;
      }
    }
    console.log(`Updated ${updated} announcements`);

    console.log('\n=== Step 2: Seed Gallery Items ===');
    const galleryItems = [
      // KEGIATAN
      { id: 'gal_pelnas_001', title: 'Pelantikan Pengurus DPN Periode 2024-2029', description: 'Hashim Djojohadikusumo melantik pengurus DPN LAPRA 08 di Jakarta', category: 'PELANTIKAN', fileUrl: IMG.hashim_lantik },
      { id: 'gal_pelnas_002', title: 'Pelantikan Pengurus DPD & DPC', description: 'Penyerahan seragam kehormatan kepada pengurus baru', category: 'PELANTIKAN', fileUrl: IMG.seragam },
      { id: 'gal_pelnas_003', title: 'Pengukuhan Pengurus Inti Maret 2026', description: 'Reshuffle pengurus inti DPN LAPRA 08', category: 'PELANTIKAN', fileUrl: IMG.lantik2 },
      // RAPAT
      { id: 'gal_rapat_001', title: 'Rapat Koordinasi Nasional DPN', description: 'Rapat koordinasi pengurus DPN dengan seluruh Koorwil se-Indonesia', category: 'RAPAT', fileUrl: IMG.gallery_meeting },
      { id: 'gal_rapat_002', title: 'Rapat Kerja DPD Kalbar', description: 'Rapat kerja DPD Kalimantan Barat dengan 14 DPC', category: 'RAPAT', fileUrl: IMG.gallery_crowd },
      { id: 'gal_rapat_003', title: 'Sidang Pleno Pengurus Pusat', description: 'Sidang pleno DPN membahas program kerja 2026', category: 'RAPAT', fileUrl: IMG.markas_baru },
      // SOSIAL
      { id: 'gal_sosial_001', title: 'Aksi Berbagi Takjil Ramadhan', description: 'DPD Bangka Belitung gelar aksi berbagi takjil saat Ramadhan', category: 'SOSIAL', fileUrl: IMG.aksi_babel },
      { id: 'gal_sosial_002', title: 'Bakti Sosial Donor Darah', description: 'Kegiatan donor darah massal anggota LAPRA 08', category: 'SOSIAL', fileUrl: IMG.gallery_blood },
      { id: 'gal_sosial_003', title: 'Distribusi Sembako Masyarakat', description: 'Bantuan sosial distribusi paket sembako untuk masyarakat kurang mampu', category: 'SOSIAL', fileUrl: IMG.gallery_donation },
      { id: 'gal_sosial_004', title: 'Bantuan Korban Bencana', description: 'Aksi kemanusiaan tim relawan LAPRA 08', category: 'SOSIAL', fileUrl: IMG.gallery_redcross },
      // KEGIATAN
      { id: 'gal_keg_001', title: 'Peace Walk & Peace Forum', description: 'Laskar Prabowo 08 gelar peace walk dan peace forum dukung pemerintahan', category: 'KEGIATAN', fileUrl: IMG.peace_walk },
      { id: 'gal_keg_002', title: 'Sosialisasi Asta Cita Presiden', description: 'Sosialisasi 13 prioritas Asta Cita Presiden Prabowo', category: 'KEGIATAN', fileUrl: IMG.asta_cita },
      { id: 'gal_keg_003', title: 'Markas Baru LAPRA 08 Jakarta', description: 'Peresmian markas baru DPN LAPRA 08 di Jakarta', category: 'KEGIATAN', fileUrl: IMG.gallery_skyline },
      { id: 'gal_keg_004', title: 'Dukung Pemerintahan Prabowo-Gibran', description: 'Deklarasi dukungan kepada pemerintahan Prabowo-Gibran', category: 'KEGIATAN', fileUrl: IMG.dukung_pemerintah },
      // DOKUMENTER
      { id: 'gal_dok_001', title: 'Upacara Bendera Hari Kemerdekaan', description: 'Upacara bendera merah putih peringatan HUT RI', category: 'DOKUMENTER', fileUrl: IMG.gallery_flag },
      { id: 'gal_dok_002', title: 'Dialog Lintas Agama', description: 'Forum dialog lintas agama dan budaya untuk perdamaian', category: 'DOKUMENTER', fileUrl: IMG.gallery_interfaith },
      { id: 'gal_dok_003', title: 'Pelatihan Kader Daerah', description: 'Workshop pelatihan kader DPD dan DPC se-Indonesia', category: 'DOKUMENTER', fileUrl: IMG.gallery_workshop },
      { id: 'gal_dok_004', title: 'Relawan Lapangan', description: 'Tim relawan LAPRA 08 di lapangan saat aksi sosial', category: 'DOKUMENTER', fileUrl: IMG.gallery_volunteer },
    ];

    let galleryCreated = 0;
    for (const item of galleryItems) {
      const existing = await prisma.systemSetting.findUnique({ where: { key: item.id } });
      if (existing) {
        // Update
        await prisma.systemSetting.update({
          where: { key: item.id },
          data: {
            value: JSON.stringify({ ...item, uploadedBy: 'System Seed', uploadedAt: new Date().toISOString() }),
            category: 'GALLERY',
          }
        });
        console.log(`↻ Gallery updated: ${item.id} | ${item.title}`);
      } else {
        await prisma.systemSetting.create({
          data: {
            key: item.id,
            value: JSON.stringify({ ...item, uploadedBy: 'System Seed', uploadedAt: new Date().toISOString() }),
            category: 'GALLERY',
          }
        });
        console.log(`✓ Gallery created: ${item.id} | ${item.title}`);
        galleryCreated++;
      }
    }
    console.log(`Total gallery created: ${galleryCreated}`);

    console.log('\n=== Step 3: Seed Program Content Items ===');
    // PROGRAM_KERJA, AKSI_SOSIAL, KEMITRAAN — store in SystemSetting with category=PROGRAM_*
    const programItems = [
      // PROGRAM_KERJA
      { id: 'prog_pk_001', title: 'Sosialisasi Asta Cita Presiden Prabowo ke 38 DPD', description: 'Program sosialisasi 13 prioritas Asta Cita Presiden Prabowo Subianto ke seluruh DPD di 38 provinsi. Tim DPN akan berkunjung ke setiap DPD untuk memberikan materi sosialisasi.', location: '38 Provinsi', date: '2026-03-15', status: 'BERJALAN', category: 'PROGRAM_KERJA' },
      { id: 'prog_pk_002', title: 'Penguatan Kader DPC se-Indonesia', description: 'Program pelatihan kader DPC untuk meningkatkan kapasitas pengurus tingkat kabupaten/kota. Dilaksanakan secara bertahap per Koorwil.', location: '7 Koorwil', date: '2026-04-01', status: 'DIRENCANAKAN', category: 'PROGRAM_KERJA' },
      { id: 'prog_pk_003', title: 'Reorganisasi DPD Luar Negeri', description: 'Reorganisasi DPD di 5 negara (AS, Cina, Malaysia, Arab Saudi, Australia) untuk penguatan diaspora LAPRA 08.', location: '5 Negara LN', date: '2026-05-01', status: 'DIRENCANAKAN', category: 'PROGRAM_KERJA' },
      { id: 'prog_pk_004', title: 'Digitalisasi Sistem Informasi LAPRA 08', description: 'Implementasi sistem informasi internal terintegrasi dari DPN hingga DPC dengan KTA digital dan database keanggotaan nasional.', location: 'Markas DPN Jakarta', date: '2026-02-01', status: 'BERJALAN', category: 'PROGRAM_KERJA' },
      // AKSI_SOSIAL
      { id: 'prog_as_001', title: 'Aksi Berbagi Takjil Ramadhan 1447 H', description: 'Aksi sosial berbagi takjil saat Ramadhan di 14 DPC Kalbar, dengan target 10.000 paket takjil gratis untuk masyarakat.', location: '14 DPC Kalbar', date: '2026-03-10', status: 'SELESAI', category: 'AKSI_SOSIAL' },
      { id: 'prog_as_002', title: 'Bakti Sosial Donor Darah Massal', description: 'Kegiatan donor darah massal bekerja sama dengan PMI. Target 500 kantong darah dari anggota LAPRA 08 di seluruh DPD.', location: '38 DPD', date: '2026-04-15', status: 'BERJALAN', category: 'AKSI_SOSIAL' },
      { id: 'prog_as_003', title: 'Distribusi Sembako Masyarakat Kurang Mampu', description: 'Distribusi 5.000 paket sembako untuk keluarga kurang mampu di wilayah DPC seluruh Indonesia.', location: '514 DPC', date: '2026-06-01', status: 'DIRENCANAKAN', category: 'AKSI_SOSIAL' },
      { id: 'prog_as_004', title: 'Bantuan Korban Bencana Alam', description: 'Tim relawan LAPRA 08 siaga membantu korban bencana alam dengan logistik, sandang, dan pangan.', location: 'Wilayah Bencana', date: '2026-01-01', status: 'BERJALAN', category: 'AKSI_SOSIAL' },
      // KEMITRAAN
      { id: 'prog_km_001', title: 'Kemitraan dengan Ummat dan Ormas Islam', description: 'Memperkuat kolaborasi dengan ummat dan organisasi massa Islam untuk mendukung program pemerintah dan kesejahteraan rakyat.', location: 'Jakarta', date: '2026-02-20', status: 'BERJALAN', category: 'KEMITRAAN' },
      { id: 'prog_km_002', title: 'Kolaborasi dengan Kementerian Terkait', description: 'MoU dengan kementerian untuk program Asta Cita: MBG, pangan, infrastruktur desa, dan pemberdayaan UMKM.', location: 'Jakarta', date: '2026-03-01', status: 'BERJALAN', category: 'KEMITRAAN' },
      { id: 'prog_km_003', title: 'Sinergi dengan Partai Gerindra', description: 'Sinergi kelembagaan dengan Partai Gerindra untuk konsolidasi kekuatan politik mendukung pemerintahan Prabowo-Gibran.', location: 'Jakarta', date: '2026-01-15', status: 'SELESAI', category: 'KEMITRAAN' },
      { id: 'prog_km_004', title: 'Kemitraan dengan BUMN untuk CSR', description: 'Kerja sama dengan BUMN untuk program CSR di bidang pendidikan, kesehatan, dan pemberdayaan ekonomi daerah.', location: 'Jakarta', date: '2026-05-01', status: 'DIRENCANAKAN', category: 'KEMITRAAN' },
    ];

    let programCreated = 0;
    for (const item of programItems) {
      const existing = await prisma.systemSetting.findUnique({ where: { key: item.id } });
      if (existing) {
        await prisma.systemSetting.update({
          where: { key: item.id },
          data: {
            value: JSON.stringify({ ...item, uploadedBy: 'System Seed', uploadedAt: new Date().toISOString() }),
            category: 'PROGRAM_CONTENT',
          }
        });
        console.log(`↻ Program updated: ${item.id} | ${item.category} | ${item.title}`);
      } else {
        await prisma.systemSetting.create({
          data: {
            key: item.id,
            value: JSON.stringify({ ...item, uploadedBy: 'System Seed', uploadedAt: new Date().toISOString() }),
            category: 'PROGRAM_CONTENT',
          }
        });
        console.log(`✓ Program created: ${item.id} | ${item.category} | ${item.title}`);
        programCreated++;
      }
    }
    console.log(`Total program created: ${programCreated}`);

    console.log('\n=== DONE ===');
  } catch(e) {
    console.error('ERROR:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
