// LAPRA 08 - Seed Command Center Demo Data
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const AGE_GROUPS = ['17-25', '26-35', '36-45', '46-55', '56-65', '65+']
const OCCUPATIONS = ['PETANI', 'NELAYAN', 'PELAJAR', 'GURU', 'PEDAGANG', 'PNS', 'TNI_POLRI', 'BURUH', 'LAINNYA']
const PROVINCES = [
  { code: '31', name: 'DKI Jakarta' },
  { code: '32', name: 'Jawa Barat' },
  { code: '33', name: 'Jawa Tengah' },
  { code: '35', name: 'Jawa Timur' },
  { code: '61', name: 'Kalimantan Barat' },
]

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

async function main() {
  console.log('=== Seed Command Center Demo Data ===\n')

  // Get superadmin user
  const admin = await prisma.user.findFirst({ where: { username: 'superadmin' } })
  if (!admin) throw new Error('superadmin not found')

  // Get territories
  const indonesia = await prisma.territory.findFirst({ where: { code: 'ID', level: 'COUNTRY' } })
  const jakarta = await prisma.territory.findFirst({ where: { code: '31', level: 'PROVINCE' } })
  const jabar = await prisma.territory.findFirst({ where: { code: '32', level: 'PROVINCE' } })
  const jateng = await prisma.territory.findFirst({ where: { code: '33', level: 'PROVINCE' } })
  const jatim = await prisma.territory.findFirst({ where: { code: '35', level: 'PROVINCE' } })
  const kalbar = await prisma.territory.findFirst({ where: { code: '61', level: 'PROVINCE' } })
  if (!indonesia) throw new Error('Indonesia territory not found')

  // ===========================================
  // 1. SEED POLLS (5 polling aktif + 2 closed)
  // ===========================================
  console.log('--- Seeding Polls ---')
  
  // Cleanup existing
  await prisma.pollResponse.deleteMany()
  await prisma.poll.deleteMany()
  await prisma.crisisZone.deleteMany()
  await prisma.aspiration.deleteMany()
  await prisma.voterContact.deleteMany()

  const pollsData = [
    {
      title: 'Survei Kepuasan Program MBG Bulan Agustus 2026',
      question: 'Bagaimana penilaian Bapak/Ibu terhadap pelaksanaan program Makan Bergizi Gratis (MBG) di wilayah Anda?',
      description: 'Polling rutin bulanan untuk mengukur sentimen publik terhadap program prioritas Asta Cita',
      triggerEvent: 'Laporan MBG Bulan Juli 2026',
      triggerUrl: 'https://setkab.go.id/mbg-laporan-juli-2026',
      territoryId: indonesia.id,
      status: 'ACTIVE',
      broadcastRecipientCount: 5000,
      closesAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 jam lagi
    },
    {
      title: 'Sentimen Pidato Kenegaraan 16 Agustus 2026',
      question: 'Apa tanggapan Bapak/Ibu terhadap pidato kenegaraan Presiden Prabowo Subianto?',
      description: 'Polling pasca pidato kenegaraan HUT RI ke-81',
      triggerEvent: 'Pidato Kenegaraan HUT RI ke-81',
      triggerUrl: 'https://setkab.go.id/pidato-kenegaraan-2026',
      territoryId: indonesia.id,
      status: 'ACTIVE',
      broadcastRecipientCount: 8000,
      closesAt: new Date(Date.now() + 18 * 60 * 60 * 1000),
    },
    {
      title: 'Kepuasan Program Asta Cita Bidang Pangan',
      question: 'Bagaimana penilaian Anda terhadap capaian swasembada pangan pemerintahan Prabowo-Gibran?',
      triggerEvent: 'Konferensi Pers Asta Cita Pangan',
      territoryId: jateng.id,
      status: 'ACTIVE',
      broadcastRecipientCount: 3000,
      closesAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    },
    {
      title: 'Tanggapan Kebijakan Ekspor Nikel',
      question: 'Bagaimana tanggapan Anda terhadap kebijakan hilirisasi nikel pemerintah?',
      triggerEvent: 'KEP Ekspor Nikel Q3 2026',
      territoryId: kalbar.id,
      status: 'ACTIVE',
      broadcastRecipientCount: 2000,
      closesAt: new Date(Date.now() + 20 * 60 * 60 * 1000),
    },
    {
      title: 'Sentimen Milenial Jawa Barat: Isu Ekonomi',
      question: 'Bagaimana persepsi Anda terhadap kondisi ekonomi saat ini di Jawa Barat?',
      triggerEvent: 'Rilis Data Ekonomi Jawa Barat Q2 2026',
      territoryId: jabar.id,
      status: 'ACTIVE',
      broadcastRecipientCount: 4000,
      closesAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    },
    // Closed polls (historical)
    {
      title: 'Survei Kepuasan Program MBG Bulan Juli 2026',
      question: 'Bagaimana penilaian Bapak/Ibu terhadap pelaksanaan program MBG bulan Juli?',
      territoryId: indonesia.id,
      status: 'CLOSED',
      broadcastRecipientCount: 5000,
      closesAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      broadcastSentAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Sentimen Deklarasi Dukung Pemerintahan',
      question: 'Apa tanggapan Anda terhadap deklarasi dukungan relawan untuk pemerintahan Prabowo-Gibran?',
      territoryId: indonesia.id,
      status: 'CLOSED',
      broadcastRecipientCount: 6000,
      closesAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      broadcastSentAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
    },
  ]

  const options5 = JSON.stringify([
    { id: 'a', label: 'Sangat Puas', sentiment: 'POSITIVE' },
    { id: 'b', label: 'Puas', sentiment: 'POSITIVE' },
    { id: 'c', label: 'Netral', sentiment: 'NEUTRAL' },
    { id: 'd', label: 'Tidak Puas', sentiment: 'NEGATIVE' },
    { id: 'e', label: 'Sangat Tidak Puas', sentiment: 'NEGATIVE' },
  ])

  const polls = []
  for (const p of pollsData) {
    const poll = await prisma.poll.create({
      data: {
        ...p,
        options: options5,
        broadcastSentAt: p.broadcastSentAt || (p.status === 'ACTIVE' ? new Date(Date.now() - randomInt(1, 20) * 60 * 60 * 1000) : null),
        createdById: admin.id,
      },
    })
    polls.push(poll)
    console.log(`  ✓ Poll: ${poll.title.substring(0, 50)}... [${poll.status}]`)
  }

  // ===========================================
  // 2. SEED POLL RESPONSES (~500 per poll)
  // ===========================================
  console.log('\n--- Seeding Poll Responses ---')
  
  // Generate realistic distribution: mostly positive, some neutral, few negative
  // Special: poll "Sentimen Milenial Jawa Barat" has HIGH negative (per user scenario)
  for (const poll of polls) {
    let responseCount
    let distribution // [positive%, neutral%, negative%]
    
    if (poll.title.includes('Milenial Jawa Barat')) {
      // User scenario: 70% negative in this poll
      responseCount = 847
      distribution = { positive: 0.15, neutral: 0.15, negative: 0.70 }
    } else if (poll.title.includes('Nikel')) {
      responseCount = 423
      distribution = { positive: 0.45, neutral: 0.30, negative: 0.25 }
    } else if (poll.title.includes('Asta Cita Pangan')) {
      responseCount = 612
      distribution = { positive: 0.55, neutral: 0.25, negative: 0.20 }
    } else if (poll.status === 'CLOSED') {
      responseCount = randomInt(800, 1500)
      distribution = { positive: 0.65, neutral: 0.20, negative: 0.15 }
    } else {
      responseCount = randomInt(300, 800)
      distribution = { positive: 0.60, neutral: 0.25, negative: 0.15 }
    }

    console.log(`  → Poll "${poll.title.substring(0, 40)}...": generating ${responseCount} responses`)

    const responses = []
    for (let i = 0; i < responseCount; i++) {
      const r = Math.random()
      let sentiment, optionId
      if (r < distribution.positive) {
        sentiment = 'POSITIVE'
        optionId = Math.random() < 0.4 ? 'a' : 'b' // Sangat Puas or Puas
      } else if (r < distribution.positive + distribution.neutral) {
        sentiment = 'NEUTRAL'
        optionId = 'c'
      } else {
        sentiment = 'NEGATIVE'
        optionId = Math.random() < 0.3 ? 'e' : 'd' // Sangat Tidak Puas or Tidak Puas
      }

      // Province distribution - bias to poll's territory
      let provinceCode, regencyCode
      if (poll.territoryId === indonesia.id) {
        // National poll - distribute across provinces
        const prov = randomChoice(PROVINCES)
        provinceCode = prov.code
        regencyCode = prov.code + randomInt(1, 5).toString().padStart(2, '0') + '01'
      } else {
        // Provincial poll - mostly that province
        const ter = await prisma.territory.findUnique({ where: { id: poll.territoryId } })
        provinceCode = ter.code
        regencyCode = ter.code + randomInt(1, 5).toString().padStart(2, '0') + '01'
      }

      // Time distribution - more recent for active polls
      const hoursAgo = poll.status === 'ACTIVE' ? randomInt(0, 23) : randomInt(0, 24 * 7)
      const submittedAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000 - randomInt(0, 59) * 60 * 1000)

      responses.push({
        pollId: poll.id,
        optionId,
        sentiment,
        respondentName: `Responden ${i + 1}`,
        ageGroup: randomChoice(AGE_GROUPS),
        gender: Math.random() < 0.55 ? 'L' : 'P',
        occupation: randomChoice(OCCUPATIONS),
        provinceCode,
        regencyCode,
        submittedAt,
      })
    }

    // Bulk insert in chunks
    for (let i = 0; i < responses.length; i += 100) {
      await prisma.pollResponse.createMany({ data: responses.slice(i, i + 100) })
    }
    console.log(`    ✓ Inserted ${responses.length} responses`)
  }

  // ===========================================
  // 3. SEED CRISIS ZONES (3 zones: 2 active, 1 resolved)
  // ===========================================
  console.log('\n--- Seeding Crisis Zones ---')

  // Find DPC for crisis zones
  const pontianakDpc = await prisma.territory.findFirst({ where: { code: '6171', level: 'REGENCY' } })
  const sambasDpc = await prisma.territory.findFirst({ where: { code: '6175', level: 'REGENCY' } })
  const bandungDpc = await prisma.territory.findFirst({ where: { code: '3217', level: 'REGENCY' } })
  
  const crisisZonesData = [
    {
      title: 'Isu Hoaks Pupuk Bersubsidi Langka di Sambas',
      description: 'Beredar informasi di grup WhatsApp warga Sambas bahwa pupuk bersubsidi habis dan tidak akan didistribusikan bulan ini. Hasil investigasi: HOAKS. Distribusi pupuk berjalan normal sesuai jadwal.',
      issueCategory: 'HOAX',
      issueSource: 'https://sambas.go.id/klarifikasi-pupuk',
      sentimentScore: -75,
      territoryId: sambasDpc?.id || kalbar.id,
      isLocked: true,
      status: 'MITIGATED',
      severity: 'HIGH',
      clarificationMessage: 'KLARIFIKASI RESMI LAPRA 08\n\nKepada warga Kabupaten Sambas,\n\nTerkait isu pupuk bersubsidi langka yang beredar di grup WhatsApp, kami sampaikan:\n\n1. Distribusi pupuk bersubsidi di Sambas BERJALAN NORMAL\n2. Stok pupuk tersedia di kios resmi\n3. Jadwal distribusi tidak berubah\n\nMohon tidak menyebarluaskan informasi yang belum diverifikasi.\n\nSekretariat DPC LAPRA 08 Sambas',
      clarificationVideoUrl: 'https://youtu.be/klarifikasi-pupuk-sambas',
      clarificationQuote: '"Pemerintah menjamin ketersediaan pupuk bersubsidi untuk seluruh petani Indonesia." - Presiden Prabowo Subianto',
      broadcastSentAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      broadcastRecipientCount: 1247,
      resolvedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      resolvedById: admin.id,
      resolutionNotes: 'Klarifikasi terkirim ke 1247 kontak WA di Sambas. Tidak ada eskalasi isu ke provinsi lain. Crisis berhasil dimitigasi.',
    },
    {
      title: 'Sentimen Negatif Tinggi: Ekonomi Milenial Jawa Barat',
      description: 'Hasil polling "Sentimen Milenial Jawa Barat" menunjukkan 70% sentimen negatif terkait isu ekonomi. Perlu klarifikasi terfokus ke wilayah Jawa Barat (khususnya Bandung Raya) sebelum isu diadopsi oposisi.',
      issueCategory: 'NEGATIVE_SENTIMENT',
      issueSource: 'https://app.lapra08.id/polls/sentimen-milenial-jabar',
      sentimentScore: -70,
      territoryId: bandungDpc?.id || jabar.id,
      isLocked: true,
      status: 'ACTIVE',
      severity: 'CRITICAL',
      clarificationMessage: 'PESAN KHUSUS UNTUK WARGA JAWA BARAT\n\nBapak/Ibu warga Jawa Barat yang kami hormati,\n\nKami mendengar aspirasi Bapak/Ibu terkait kondisi ekonomi. Presiden Prabowo Subianto telah memahami kekhawatiran tersebut dan saat ini sedang menyiapkan paket kebijakan ekonomi baru yang akan diumumkan minggu depan.\n\nMohon kesabaran dan dukungan Bapak/Ibu. Tim LAPRA 08 Jawa Barat siap menampung aspirasi melalui microsite aspirasi rakyat.\n\nHormat kami,\nDPD LAPRA 08 Jawa Barat',
      clarificationQuote: '"Saya mendengar suara rakyat. Kebijakan ekonomi akan disesuaikan untuk kesejahteraan seluruh rakyat Indonesia." - Presiden Prabowo Subianto',
      broadcastRecipientCount: 0, // belum broadcast
    },
    {
      title: 'Pemberitaan Negatif Media: Tuduhan Korupsi Program Sosial',
      description: 'Media tertentu menyiarkan tuduhan korupsi dana program sosial pemerintah. Investigasi: tuduhan tidak berdasar, data transparan. Perlu klarifikasi terfokus ke wilayah dengan penyebaran berita tertinggi.',
      issueCategory: 'MEDIA_HIT',
      issueSource: 'https://medialain.com/berita/tuduhan-korupsi-bansos',
      sentimentScore: -85,
      territoryId: pontianakDpc?.id || kalbar.id,
      isLocked: true,
      status: 'ACTIVE',
      severity: 'CRITICAL',
      clarificationMessage: 'KLARIFIKASI RESMI\n\nTerkait pemberitaan tuduhan korupsi dana bansos, kami sampaikan:\n\n1. Data transparan: cek di bansos transparansi\n2. Audit independen: tidak ditemukan penyimpangan\n3. Tuduhan tidak berdasar dan merupakan serangan terstruktur\n\nMohon warga tidak terprovokasi.\n\nSekretariat DPN LAPRA 08',
      clarificationQuote: '"Transparansi dana publik adalah prioritas kami. Setiap rupiah tercatat dan dapat diaudit." - Presiden Prabowo Subianto',
      broadcastRecipientCount: 0,
    },
  ]

  for (const cz of crisisZonesData) {
    const zone = await prisma.crisisZone.create({ data: cz })
    console.log(`  ✓ Crisis Zone: ${zone.title.substring(0, 50)}... [${zone.status}, ${zone.severity}]`)
  }

  // ===========================================
  // 4. SEED MORE ASPIRATIONS (clustered)
  // ===========================================
  console.log('\n--- Seeding Aspirations ---')

  const aspirationsData = [
    // PERTANIAN cluster
    { title: 'Pupuk Bersubsidi Mahal di Jawa Tengah', message: 'Saya petani di Jawa Tengah, pupuk bersubsidi susah didapat dan harganya mahal. Mohon Pak Prabowo perhatikan nasib petani.', senderName: 'Budi Petani', ageGroup: '46-55', gender: 'L', occupation: 'PETANI', provinceCode: '33', regencyCode: '3301' },
    { title: 'Irigasi Sawah Rusak di Banyumas', message: 'Irigasi sawah kami rusak parah, hasil panen menurun. Mohon perbaikan irigasi segera.', senderName: 'Sutrisno', ageGroup: '46-55', gender: 'L', occupation: 'PETANI', provinceCode: '33', regencyCode: '3302' },
    { title: 'Benih Bersertifikat Sulit Diakses', message: 'Petani kecil kesulitan akses benih bersertifikat. Harga benih naik tapi kualitas belum tentu baik.', senderName: 'Warga Tani', ageGroup: '36-45', gender: 'L', occupation: 'PETANI', provinceCode: '33', regencyCode: '3303' },
    
    // EKONOMI cluster
    { title: 'UMKM butuh modal di Bandung', message: 'Saya pemilik UMKM, kesulitan modal usaha. Harga bahan baku naik tapi margin kecil. Mohon bantuan modal UMKM.', senderName: 'Sari UMKM', ageGroup: '26-35', gender: 'P', occupation: 'PEDAGANG', provinceCode: '32', regencyCode: '3217' },
    { title: 'Harga Sembakok Tidak Stabil', message: 'Harga sembako naik turun tidak menentu. Pedagang kecil rugi. Mohon stabilisasi harga.', senderName: 'Pak Joko', ageGroup: '46-55', gender: 'L', occupation: 'PEDAGANG', provinceCode: '31', regencyCode: '3173' },
    { title: 'Inflasi Susut Daya Beli Milenial', message: 'Gaji tidak naik tapi harga naik terus. Sulit bagi milenial untuk menabung dan berinvestasi.', senderName: 'Andi Milenial', ageGroup: '26-35', gender: 'L', occupation: 'LAINNYA', provinceCode: '32', regencyCode: '3217' },
    
    // INFRASTRUKTUR cluster
    { title: 'Jalan Rusak Parah di Pontianak', message: 'Jalan di Pontianak banyak yang rusak parah dan berlubang. Mohon perbaikan jalan segera, sangat membahayakan pengendara.', senderName: 'Warga Pontianak', ageGroup: '36-45', gender: 'L', occupation: 'PEDAGANG', provinceCode: '61', regencyCode: '6171' },
    { title: 'Listrik Sering Padam di Sambas', message: 'Listrik di Sambas sering padam, mengganggu aktivitas ekonomi warga. Mohon perbaikan jaringan listrik.', senderName: 'Ibu Rumah Tangga', ageGroup: '36-45', gender: 'P', occupation: 'LAINNYA', provinceCode: '61', regencyCode: '6175' },
    { title: 'Air Bersih Sulit Diakses Pedesaan', message: 'Warga desa kesulitan akses air bersih. Harus beli air mahal. Mohon program air bersih desa.', senderName: 'Pak Yanto', ageGroup: '46-55', gender: 'L', occupation: 'PETANI', provinceCode: '35', regencyCode: '3501' },
    
    // PENDIDIKAN cluster
    { title: 'Beasiswa untuk Anak Petani', message: 'Mohon Pak Prabowo perbanyak beasiswa untuk anak petani. Banyak yang putus sekolah karena biaya.', senderName: 'Ibu Guru', ageGroup: '46-55', gender: 'P', occupation: 'GURU', provinceCode: '33', regencyCode: '3301' },
    { title: 'Fasilitas Sekolah Desa Kurang', message: 'Sekolah desa kami kurang fasilitas. Tidak ada lab komputer, perpustakaan kecil. Mohon perhatian.', senderName: 'Kepala Sekolah', ageGroup: '46-55', gender: 'L', occupation: 'GURU', provinceCode: '32', regencyCode: '3201' },
    
    // KESEHATAN cluster
    { title: 'BPJS Sulit Digunakan', message: 'BPJS sulit digunakan di rumah sakit swasta. Antrian panjang. Mohon perbaikan layanan kesehatan.', senderName: 'Warga Jakbar', ageGroup: '36-45', gender: 'P', occupation: 'PNS', provinceCode: '31', regencyCode: '3171' },
    { title: 'Puskesmas Kurang Obat', message: 'Puskesmas kami sering kehabisan obat. Warga harus beli obat sendiri. Mohon perhatian.', senderName: 'Ibu Mariah', ageGroup: '56-65', gender: 'P', occupation: 'LAINNYA', provinceCode: '61', regencyCode: '6171' },
    
    // POSITIVE feedback
    { title: 'Terima Kasih Program MBG', message: 'Saya ucapkan terima kasih untuk program MBG. Anak-anak di sekolah kami sangat terbantu. Semoga dilanjutkan.', senderName: 'Ibu Wati', ageGroup: '36-45', gender: 'P', occupation: 'GURU', provinceCode: '32', regencyCode: '3201' },
    { title: 'Apresiasi Asta Cita', message: 'Program Asta Cita sangat membantu masyarakat. Mohon dilanjutkan dan diperluas.', senderName: 'Pak Hadi', ageGroup: '46-55', gender: 'L', occupation: 'PNS', provinceCode: '31', regencyCode: '3171' },
    
    // URGENT
    { title: 'DARURAT: Banjir di Bekasi', message: 'Banjir besar di Bekasi, warga terendam. Mohon bantuan DARURAT dari pemerintah pusat.', senderName: 'Warga Bekasi', ageGroup: '26-35', gender: 'L', occupation: 'BURUH', provinceCode: '32', regencyCode: '3216' },
    { title: 'DARURAT: Longsor di Pekalongan', message: 'Longsor di Pekalongan menimbun rumah warga. Mohon evakuasi dan bantuan DARURAT.', senderName: 'Korban Longsor', ageGroup: '46-55', gender: 'L', occupation: 'PETANI', provinceCode: '33', regencyCode: '3311' },
  ]

  for (const a of aspirationsData) {
    // Re-use auto-detect logic from API
    const text = a.message.toLowerCase()
    let category = 'LAINNYA', subCategory = null, sentiment = 'NEUTRAL', priority = 'NORMAL'
    
    if (['pupuk', 'petani', 'sawah', 'panen', 'irigasi', 'benih'].some(kw => text.includes(kw))) {
      category = 'PERTANIAN'
      if (text.includes('pupuk')) subCategory = 'PUPUK'
      else if (text.includes('irigasi')) subCategory = 'IRIGASI'
      else if (text.includes('benih')) subCategory = 'BENIH'
    } else if (['harga', 'umkm', 'ekonomi', 'dagang', 'modal'].some(kw => text.includes(kw))) {
      category = 'EKONOMI'
      if (text.includes('harga')) subCategory = 'HARGA'
      else if (text.includes('umkm')) subCategory = 'UMKM'
    } else if (['sekolah', 'guru', 'siswa', 'beasiswa', 'pendidikan'].some(kw => text.includes(kw))) {
      category = 'PENDIDIKAN'
    } else if (['rumah sakit', 'puskesmas', 'obat', 'bpjs', 'kesehatan'].some(kw => text.includes(kw))) {
      category = 'KESEHATAN'
    } else if (['jalan', 'listrik', 'air', 'jembatan', 'drainase'].some(kw => text.includes(kw))) {
      category = 'INFRASTRUKTUR'
      if (text.includes('jalan')) subCategory = 'JALAN'
      else if (text.includes('listrik')) subCategory = 'LISTRIK'
      else if (text.includes('air')) subCategory = 'AIR_BERSIH'
    }
    
    if (['darurat', 'mendesak', 'segera', 'kritis', 'bahaya'].some(kw => text.includes(kw))) {
      sentiment = 'URGENT'
      priority = 'URGENT'
    } else if (['terima kasih', 'bagus', 'puas', 'apresiasi', 'membantu'].some(kw => text.includes(kw))) {
      sentiment = 'POSITIVE'
    } else if (['keluhan', 'lapor', 'marah', 'rusak', 'tidak', 'belum', 'gagal', 'parah'].some(kw => text.includes(kw))) {
      sentiment = 'NEGATIVE'
      priority = 'HIGH'
    }
    
    const aiCluster = `${a.occupation.toLowerCase()}-prov-${a.provinceCode}-kab-${a.regencyCode}-${category.toLowerCase()}${subCategory ? '-' + subCategory.toLowerCase() : ''}`
    
    // Time distribution - random within last 7 days
    const hoursAgo = randomInt(0, 24 * 7)
    
    await prisma.aspiration.create({
      data: {
        ...a,
        category,
        subCategory,
        sentiment,
        priority,
        aiCluster,
        status: priority === 'URGENT' ? 'REVIEWING' : 'NEW',
        submittedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
      },
    })
  }
  console.log(`  ✓ Inserted ${aspirationsData.length} aspirations`)

  // ===========================================
  // 5. SEED VOTER CONTACTS (sample - 100 voters)
  // ===========================================
  console.log('\n--- Seeding Voter Contacts ---')
  
  const voterNames = [
    'Budi Santoso', 'Siti Aminah', 'Ahmad Yani', 'Dewi Lestari', 'Eko Prasetyo',
    'Rina Marlina', 'Joko Widodo', 'Sri Mulyani', 'Bambang Pamungkas', 'Maya Sari',
    'Hendra Wijaya', 'Lia Anggraini', 'Agus Salim', 'Fitri Handayani', 'Rudi Hartono',
  ]
  
  for (let i = 0; i < 50; i++) {
    const name = `${randomChoice(voterNames)} ${i + 1}`
    const phone = `+628${randomInt(1000000000, 9999999999)}`
    const prov = randomChoice(PROVINCES)
    const regencyCode = prov.code + randomInt(1, 5).toString().padStart(2, '0') + '01'
    
    // Find territory
    const territory = await prisma.territory.findFirst({
      where: { code: prov.code, level: 'PROVINCE' }
    })
    
    if (!territory) continue
    
    const path = `ID.${prov.code}.${regencyCode}.${randomInt(1, 99).toString().padStart(3, '0')}.${randomInt(1, 20).toString().padStart(3, '0')}.${randomInt(1, 10).toString().padStart(2, '0')}`
    
    await prisma.voterContact.create({
      data: {
        name,
        phone,
        whatsappOptIn: Math.random() > 0.05, // 95% opt-in
        email: Math.random() > 0.7 ? `voter${i}@email.com` : null,
        ageGroup: randomChoice(AGE_GROUPS),
        gender: Math.random() < 0.55 ? 'L' : 'P',
        occupation: randomChoice(OCCUPATIONS),
        path,
        countryCode: 'ID',
        provinceCode: prov.code,
        regencyCode,
        districtCode: randomInt(1, 99).toString().padStart(3, '0'),
        villageCode: randomInt(1, 20).toString().padStart(3, '0'),
        rtCode: randomInt(1, 10).toString().padStart(2, '0'),
        rwCode: randomInt(1, 5).toString().padStart(2, '0'),
        territoryId: territory.id,
        isActive: Math.random() > 0.1, // 90% active
        isVerified: Math.random() > 0.3, // 70% verified
        lastContactedAt: Math.random() > 0.5 ? new Date(Date.now() - randomInt(1, 30) * 24 * 60 * 60 * 1000) : null,
        contactCount: randomInt(0, 15),
        responseCount: randomInt(0, 8),
      },
    }).catch(() => {}) // Skip if duplicate phone
  }
  
  const voterCount = await prisma.voterContact.count()
  console.log(`  ✓ Inserted ${voterCount} voter contacts`)

  // ===========================================
  // FINAL STATS
  // ===========================================
  console.log('\n=== FINAL STATS ===')
  console.log(`Polls: ${await prisma.poll.count()}`)
  console.log(`Poll Responses: ${await prisma.pollResponse.count()}`)
  console.log(`Crisis Zones: ${await prisma.crisisZone.count()}`)
  console.log(`Aspirations: ${await prisma.aspiration.count()}`)
  console.log(`Voter Contacts: ${await prisma.voterContact.count()}`)
  console.log('\n✅ SEED COMPLETE - Command Center siap demo')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
