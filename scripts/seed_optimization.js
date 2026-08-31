// LAPRA 08 - Seed defaults & demo data for optimization
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== OPTIMIZATION SEED ===\n')
  const admin = await prisma.user.findFirst({ where: { username: 'superadmin' } })
  if (!admin) throw new Error('superadmin not found')

  // 1. Seed Profile Content defaults
  console.log('--- 1. Profile Content Defaults ---')
  const tentangContent = {
    heroTitle: 'Laskar Prabowo 08',
    heroSubtitle: '(LAPRA 08)',
    heroDescription: 'Laskar Prabowo 08—yang secara resmi disingkat sebagai LAPRA 08—adalah organisasi kemasyarakatan sekaligus wadah relawan resmi Prabowo Subianto yang bergerak aktif di tingkat nasional.',
    misiStrategis1: 'Organisasi ini mengemban misi strategis dalam mengawal serta mengawasi implementasi program-program nasional, baik di tingkat pusat maupun daerah. Hal ini dilakukan guna memastikan keberhasilan pembangunan menuju Indonesia Emas yang merupakan cita-cita mulia Presiden Prabowo Subianto.',
    misiStrategis2: 'Dalam pergerakannya, LAPRA 08 bertumpu pada fokus utama yang meliputi pengawasan program pemerintah, pelaksanaan kaderisasi yang terstruktur, serta penyelenggaraan aksi sosial kemanusiaan yang berdampak nyata bagi masyarakat dan negara.',
    pelantikanDate: '21 Maret 2025',
    pelantikanTempat: 'Auditorium RRI Jakarta',
    pelantik: 'Dr. (HC) Hashim S. Djojohadikusumo',
    ketuaUmum: 'Devi Taurisa, SH, MH, CLD',
    pilar1Title: 'Pengawasan Kebijakan',
    pilar1Desc: 'Mengawal, memantau, dan memastikan seluruh program strategis pemerintah berjalan tepat sasaran demi kesejahteraan rakyat.',
    pilar2Title: 'Kaderisasi Nasionalis',
    pilar2Desc: 'Membentuk, membina, dan melahirkan kader-kader berkualitas yang memiliki integritas tinggi dan berjiwa kepemimpinan nasional.',
    pilar3Title: 'Aksi Sosial Nyata',
    pilar3Desc: 'Menginisiasi pengabdian masyarakat dan aksi kemanusiaan secara aktif di seluruh penjuru wilayah.',
  }
  await prisma.systemSetting.upsert({
    where: { key: 'profil.tentang' },
    update: { value: JSON.stringify(tentangContent), category: 'PROFILE_CONTENT' },
    create: { key: 'profil.tentang', value: JSON.stringify(tentangContent), category: 'PROFILE_CONTENT', description: 'Profile content: tentang' },
  })
  console.log('  ✓ profil.tentang seeded')

  const visiMisiContent = {
    visi: 'Menjadi relawan terdepan dalam mendukung visi kebangsaan Prabowo Subianto menuju Indonesia Emas 2045.',
    misi: [
      'Mengawal program-program pemerintah Prabowo-Gibran',
      'Kaderisasi dan pembinaan relawan di seluruh Indonesia',
      'Aksi sosial dan pengabdian masyarakat',
      'Penguatan harmoni dan persatuan bangsa',
    ],
  }
  await prisma.systemSetting.upsert({
    where: { key: 'profil.visi-misi' },
    update: { value: JSON.stringify(visiMisiContent), category: 'PROFILE_CONTENT' },
    create: { key: 'profil.visi-misi', value: JSON.stringify(visiMisiContent), category: 'PROFILE_CONTENT', description: 'Profile content: visi-misi' },
  })
  console.log('  ✓ profil.visi-misi seeded')

  // 2. Seed more Logistik items
  console.log('\n--- 2. Logistik & Atribut ---')
  const kalbar = await prisma.territory.findFirst({ where: { code: '61', level: 'PROVINCE' } })
  if (kalbar) {
    const existingAssets = await prisma.asset.count()
    if (existingAssets < 5) {
      const assets = [
        { name: 'Kemeja Seragam Hitam', category: 'KEMEJA', sku: 'KME-001', stock: 500, unit: 'pcs', minStock: 100, description: 'Kemeja seragam resmi LAPRA 08 hitam' },
        { name: 'Bendera LAPRA 08', category: 'BENDERA', sku: 'BND-001', stock: 150, unit: 'pcs', minStock: 50, description: 'Bendera organisasi LAPRA 08 ukuran 3x2 meter' },
        { name: 'Plakat Penghargaan', category: 'PLAKAT', sku: 'PLK-001', stock: 30, unit: 'pcs', minStock: 10, description: 'Plakat penghargaan untuk pengurus aktif' },
        { name: 'Pin/Lencana LAPRA 08', category: 'LAINNYA', sku: 'PND-001', stock: 1000, unit: 'pcs', minStock: 200, description: 'Pin lencana resmi untuk anggota' },
        { name: 'Banner Spanduk Kegiatan', category: 'LAINNYA', sku: 'BNR-001', stock: 75, unit: 'pcs', minStock: 20, description: 'Banner/spanduk untuk kegiatan dan event' },
        { name: 'ID Card Tali (Lanyard)', category: 'LAINNYA', sku: 'LNY-001', stock: 2000, unit: 'pcs', minStock: 500, description: 'Tali ID card dengan logo LAPRA 08' },
      ]
      for (const a of assets) {
        const existing = await prisma.asset.findFirst({ where: { name: a.name } })
        if (!existing) {
          await prisma.asset.create({ data: { ...a, territoryId: kalbar.id } })
          console.log(`  ✓ Asset: ${a.name} (${a.stock} ${a.unit})`)
        }
      }
    } else {
      console.log('  → Already have sufficient assets')
    }
  }

  // 3. Seed Events
  console.log('\n--- 3. Events & Agenda ---')
  const existingEvents = await prisma.event.count()
  if (existingEvents < 5) {
    const indonesia = await prisma.territory.findFirst({ where: { code: 'ID', level: 'COUNTRY' } })
    const pontianak = await prisma.territory.findFirst({ where: { code: '6171', level: 'REGENCY' } })
    const jakarta = await prisma.territory.findFirst({ where: { code: '31', level: 'PROVINCE' } })

    const events = [
      { title: 'Rapat Pleno DPN LAPRA 08', type: 'RAPAT', description: 'Rapat pleno pengurus DPN membahas program kerja semester II 2026', startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), location: 'Sekretariat DPN, East Tower Lt 42, Jakarta', targetAttendance: 50, territoryId: jakarta?.id || indonesia.id, createdById: admin.id },
      { title: 'Pelatihan Kader DPC Pontianak', type: 'LAINNYA', description: 'Pelatihan kader DPC Pontianak tentang digitalisasi sistem informasi', startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), location: 'Sekretariat DPC Pontianak', targetAttendance: 30, territoryId: pontianak?.id || indonesia.id, createdById: admin.id },
      { title: 'Aksi Sosial Santunan Anak Yatim', type: 'SOSIAL', description: 'Santunan untuk 95 anak yatim di Pasar Pejaten bekerja sama dengan PD Pasar Jaya', startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), location: 'Pasar Pejaten, Jakarta Selatan', targetAttendance: 20, territoryId: jakarta?.id || indonesia.id, createdById: admin.id },
      { title: 'Peace Walk & Peace Forum 2026', type: 'MOBILISASI', description: 'Peace Walk dari Monas ke Istana Negara dan Peace Forum mendukung program pemerintahan Prabowo-Gibran', startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000), location: 'Monas, Jakarta Pusat', targetAttendance: 5000, territoryId: jakarta?.id || indonesia.id, createdById: admin.id },
      { title: 'Rapat Koordinasi Koorwil III Kalimantan', type: 'RAPAT', description: 'Rapat koordinasi Koorwil III dengan seluruh DPD di wilayah Kalimantan', startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), location: 'Banjarmasin, Kalimantan Selatan', targetAttendance: 40, territoryId: kalbar?.id || indonesia.id, createdById: admin.id },
    ]
    for (const e of events) {
      const existing = await prisma.event.findFirst({ where: { title: e.title } })
      if (!existing) {
        await prisma.event.create({ data: e })
        console.log(`  ✓ Event: ${e.title}`)
      }
    }
  } else {
    console.log('  → Already have sufficient events')
  }

  // 4. Seed Support Tickets
  console.log('\n--- 4. Support Tickets ---')
  const existingTickets = await prisma.supportTicket.count()
  if (existingTickets === 0) {
    const tickets = [
      { title: 'Login gagal di browser Safari', description: 'Saat login menggunakan Safari di iPhone, tombol Masuk tidak merespon. Sudah coba clear cache tapi tetap sama.', category: 'BUG', priority: 'MEDIUM', reporterId: admin.id },
      { title: 'Request: tambah fitur export Excel di Kas & Keuangan', description: 'Saya butuh export laporan kas ke Excel untuk laporan rapat bulanan. Saat ini hanya ada Cetak PDF.', category: 'FEATURE_REQUEST', priority: 'LOW', reporterId: admin.id },
      { title: 'Cara upload foto pengurus?', description: 'Saya admin DPC Pontianak, bagaimana cara upload foto pass untuk pengurus yang sudah diinput?', category: 'QUESTION', priority: 'LOW', reporterId: admin.id },
    ]
    for (const t of tickets) {
      const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      await prisma.supportTicket.create({ data: { ...t, ticketNumber } })
      console.log(`  ✓ Ticket: ${t.title}`)
    }
  } else {
    console.log('  → Already have tickets')
  }

  // 5. Final DB stats
  console.log('\n=== FINAL DB STATS ===')
  const stats = {
    announcements: await prisma.announcement.count(),
    members: await prisma.member.count(),
    territories: await prisma.territory.count(),
    orgPositions: await prisma.orgPosition.count(),
    skDocuments: await prisma.sKDocument.count(),
    broadcasts: await prisma.broadcast.count(),
    financeTxns: await prisma.financeTransaction.count(),
    polls: await prisma.poll.count(),
    crisisZones: await prisma.crisisZone.count(),
    aspirations: await prisma.aspiration.count(),
    voterContacts: await prisma.voterContact.count(),
    ktaApplications: await prisma.ktaApplication.count(),
    users: await prisma.user.count(),
    assets: await prisma.asset.count(),
    events: await prisma.event.count(),
    tickets: await prisma.supportTicket.count(),
    galleryPhotos: await prisma.systemSetting.count({ where: { category: 'GALLERY' } }),
    galleryVideos: await prisma.systemSetting.count({ where: { category: 'GALLERY_VIDEO' } }),
    sekretariatLocs: await prisma.systemSetting.count({ where: { category: 'SEKRETARIAT' } }),
    profileContent: await prisma.systemSetting.count({ where: { category: 'PROFILE_CONTENT' } }),
    profileDocs: await prisma.systemSetting.count({ where: { category: 'PROFILE_DOCUMENT' } }),
    programContent: await prisma.systemSetting.count({ where: { category: 'PROGRAM_CONTENT' } }),
  }
  console.log(JSON.stringify(stats, null, 2))
  console.log('\n✅ OPTIMIZATION COMPLETE')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
