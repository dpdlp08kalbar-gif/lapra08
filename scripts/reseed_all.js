// LAPRA 08 - Re-seed ALL Command Center + Broadcast data
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

const AGE_GROUPS = ['17-25', '26-35', '36-45', '46-55', '56-65', '65+']
const OCCUPATIONS = ['PETANI', 'NELAYAN', 'PELAJAR', 'GURU', 'PEDAGANG', 'PNS', 'TNI_POLRI', 'BURUH', 'LAINNYA']
const PROVINCES = [{code:'31'},{code:'32'},{code:'33'},{code:'35'},{code:'61'}]

async function main() {
  console.log('=== RE-SEED COMMAND CENTER ===')
  const admin = await prisma.user.findFirst({ where: { username: 'superadmin' } })
  if (!admin) throw new Error('superadmin not found')
  const indonesia = await prisma.territory.findFirst({ where: { code: 'ID', level: 'COUNTRY' } })
  const jakarta = await prisma.territory.findFirst({ where: { code: '31', level: 'PROVINCE' } })
  const jabar = await prisma.territory.findFirst({ where: { code: '32', level: 'PROVINCE' } })
  const jateng = await prisma.territory.findFirst({ where: { code: '33', level: 'PROVINCE' } })
  const kalbar = await prisma.territory.findFirst({ where: { code: '61', level: 'PROVINCE' } })
  if (!indonesia) throw new Error('Indonesia not found')

  // Cleanup
  await prisma.pollResponse.deleteMany()
  await prisma.poll.deleteMany()
  await prisma.crisisZone.deleteMany()
  await prisma.aspiration.deleteMany()
  await prisma.voterContact.deleteMany()
  await prisma.broadcast.deleteMany()

  const options5 = JSON.stringify([
    { id: 'a', label: 'Sangat Puas', sentiment: 'POSITIVE' },
    { id: 'b', label: 'Puas', sentiment: 'POSITIVE' },
    { id: 'c', label: 'Netral', sentiment: 'NEUTRAL' },
    { id: 'd', label: 'Tidak Puas', sentiment: 'NEGATIVE' },
    { id: 'e', label: 'Sangat Tidak Puas', sentiment: 'NEGATIVE' },
  ])

  // 1. POLLS
  const pollsData = [
    { title: 'Survei Kepuasan Program MBG Bulan Agustus 2026', question: 'Bagaimana penilaian Bapak/Ibu terhadap program MBG?', triggerEvent: 'Laporan MBG Juli 2026', territoryId: indonesia.id, status: 'ACTIVE', broadcastRecipientCount: 5000, closesAt: new Date(Date.now() + 12*3600000) },
    { title: 'Sentimen Pidato Kenegaraan 16 Agustus 2026', question: 'Apa tanggapan Bapak/Ibu terhadap pidato kenegaraan?', triggerEvent: 'Pidato Kenegaraan HUT RI ke-81', territoryId: indonesia.id, status: 'ACTIVE', broadcastRecipientCount: 8000, closesAt: new Date(Date.now() + 18*3600000) },
    { title: 'Kepuasan Program Asta Cita Bidang Pangan', question: 'Bagaimana penilaian Anda terhadap swasembada pangan?', triggerEvent: 'Konferensi Pers Asta Cita', territoryId: jateng.id, status: 'ACTIVE', broadcastRecipientCount: 3000, closesAt: new Date(Date.now() + 6*3600000) },
    { title: 'Sentimen Milenial Jawa Barat: Isu Ekonomi', question: 'Bagaimana persepsi Anda terhadap kondisi ekonomi di Jawa Barat?', triggerEvent: 'Rilis Data Ekonomi Jabar Q2', territoryId: jabar.id, status: 'ACTIVE', broadcastRecipientCount: 4000, closesAt: new Date(Date.now() + 8*3600000) },
    { title: 'Survei MBG Juli 2026', question: 'Bagaimana penilaian MBG bulan Juli?', territoryId: indonesia.id, status: 'CLOSED', broadcastRecipientCount: 5000, closesAt: new Date(Date.now() - 7*86400000), broadcastSentAt: new Date(Date.now() - 8*86400000) },
  ]
  const polls = []
  for (const p of pollsData) {
    const poll = await prisma.poll.create({ data: { ...p, options: options5, broadcastSentAt: p.broadcastSentAt || (p.status === 'ACTIVE' ? new Date(Date.now() - randomInt(1,20)*3600000) : null), createdById: admin.id } })
    polls.push(poll)
    console.log(`  ✓ Poll: ${poll.title.substring(0,40)}... [${poll.status}]`)
  }

  // 2. POLL RESPONSES
  for (const poll of polls) {
    let count, dist
    if (poll.title.includes('Milenial Jawa Barat')) { count = 847; dist = { p: 0.15, n: 0.15, neg: 0.70 } }
    else if (poll.status === 'CLOSED') { count = randomInt(800, 1200); dist = { p: 0.65, n: 0.20, neg: 0.15 } }
    else { count = randomInt(300, 800); dist = { p: 0.60, n: 0.25, neg: 0.15 } }

    const responses = []
    for (let i = 0; i < count; i++) {
      const r = Math.random()
      let sentiment, optionId
      if (r < dist.p) { sentiment = 'POSITIVE'; optionId = Math.random() < 0.4 ? 'a' : 'b' }
      else if (r < dist.p + dist.n) { sentiment = 'NEUTRAL'; optionId = 'c' }
      else { sentiment = 'NEGATIVE'; optionId = Math.random() < 0.3 ? 'e' : 'd' }

      const prov = randomChoice(PROVINCES)
      responses.push({
        pollId: poll.id, optionId, sentiment,
        respondentName: `Responden ${i+1}`,
        ageGroup: randomChoice(AGE_GROUPS),
        gender: Math.random() < 0.55 ? 'L' : 'P',
        occupation: randomChoice(OCCUPATIONS),
        provinceCode: prov.code,
        regencyCode: prov.code + randomInt(1,5).toString().padStart(2,'0') + '01',
        submittedAt: new Date(Date.now() - randomInt(0,23)*3600000 - randomInt(0,59)*60000),
      })
    }
    for (let i = 0; i < responses.length; i += 100) {
      await prisma.pollResponse.createMany({ data: responses.slice(i, i+100) })
    }
    console.log(`  → ${count} responses for "${poll.title.substring(0,30)}..."`)
  }

  // 3. CRISIS ZONES
  const pontianakDpc = await prisma.territory.findFirst({ where: { code: '6171', level: 'REGENCY' } })
  const sambasDpc = await prisma.territory.findFirst({ where: { code: '6175', level: 'REGENCY' } })
  const bandungDpc = await prisma.territory.findFirst({ where: { code: '3217', level: 'REGENCY' } })

  const crisisZones = [
    { title: 'Isu Hoaks Pupuk Bersubsidi Langka di Sambas', description: 'Beredar info di WA warga Sambas bahwa pupuk bersubsidi habis. HOAKS - distribusi berjalan normal.', issueCategory: 'HOAX', issueSource: 'https://sambas.go.id/klarifikasi-pupuk', sentimentScore: -75, territoryId: sambasDpc?.id || kalbar.id, isLocked: true, status: 'MITIGATED', severity: 'HIGH', clarificationMessage: 'KLARIFIKASI RESMI: Distribusi pupuk bersubsidi di Sambas BERJALAN NORMAL. Mohon tidak menyebarluaskan info yang belum diverifikasi.', clarificationVideoUrl: 'https://youtu.be/klarifikasi-pupuk-sambas', clarificationQuote: '"Pemerintah menjamin ketersediaan pupuk bersubsidi" - Presiden Prabowo', broadcastSentAt: new Date(Date.now()-3*3600000), broadcastRecipientCount: 1247, resolvedAt: new Date(Date.now()-1*3600000), resolvedById: admin.id, resolutionNotes: 'Klarifikasi terkirim ke 1247 kontak. Crisis berhasil dimitigasi.' },
    { title: 'Sentimen Negatif Tinggi: Ekonomi Milenial Jawa Barat', description: 'Polling menunjukkan 70% sentimen negatif terkait isu ekonomi di Jawa Barat. Perlu klarifikasi terfokus.', issueCategory: 'NEGATIVE_SENTIMENT', issueSource: '', sentimentScore: -70, territoryId: bandungDpc?.id || jabar.id, isLocked: true, status: 'ACTIVE', severity: 'CRITICAL', clarificationMessage: 'PESAN KHUSUS WARGA JAWA BARAT: Presiden Prabowo sedang menyiapkan paket kebijakan ekonomi baru. Mohon kesabaran.', clarificationQuote: '"Saya mendengar suara rakyat" - Presiden Prabowo' },
    { title: 'Pemberitaan Negatif Media: Tuduhan Korupsi Bansos', description: 'Media tertentu menyiarkan tuduhan korupsi dana bansos. Investigasi: tuduhan tidak berdasar.', issueCategory: 'MEDIA_HIT', issueSource: 'https://medialain.com/berita/tuduhan-korupsi', sentimentScore: -85, territoryId: pontianakDpc?.id || kalbar.id, isLocked: true, status: 'ACTIVE', severity: 'CRITICAL', clarificationMessage: 'KLARIFIKASI: Data transparan, audit independen tidak menemukan penyimpangan. Tuduhan tidak berdasar.', clarificationQuote: '"Transparansi dana publik adalah prioritas kami" - Presiden Prabowo' },
  ]
  for (const cz of crisisZones) {
    await prisma.crisisZone.create({ data: cz })
    console.log(`  ✓ Crisis: ${cz.title.substring(0,40)}... [${cz.status}, ${cz.severity}]`)
  }

  // 4. ASPIRATIONS
  const aspirationsData = [
    { title: 'Pupuk Bersubsidi Mahal di Jawa Tengah', message: 'Saya petani di Jawa Tengah, pupuk bersubsidi susah didapat dan mahal.', senderName: 'Budi Petani', ageGroup: '46-55', gender: 'L', occupation: 'PETANI', provinceCode: '33', regencyCode: '3301' },
    { title: 'UMKM butuh modal di Bandung', message: 'Saya pemilik UMKM, kesulitan modal. Harga bahan baku naik.', senderName: 'Sari UMKM', ageGroup: '26-35', gender: 'P', occupation: 'PEDAGANG', provinceCode: '32', regencyCode: '3217' },
    { title: 'Jalan Rusak Parah di Pontianak', message: 'Jalan di Pontianak banyak yang rusak parah dan berlubang. Berbahaya!', senderName: 'Warga Pontianak', ageGroup: '36-45', gender: 'L', occupation: 'PEDAGANG', provinceCode: '61', regencyCode: '6171' },
    { title: 'DARURAT: Banjir di Bekasi', message: 'Banjir besar di Bekasi, warga terendam. Mohon bantuan DARURAT!', senderName: 'Warga Bekasi', ageGroup: '26-35', gender: 'L', occupation: 'BURUH', provinceCode: '32', regencyCode: '3216' },
    { title: 'Irigasi Sawah Rusak di Banyumas', message: 'Irigasi sawah rusak parah, hasil panen menurun.', senderName: 'Sutrisno', ageGroup: '46-55', gender: 'L', occupation: 'PETANI', provinceCode: '33', regencyCode: '3302' },
    { title: 'Listrik Sering Padam di Sambas', message: 'Listrik sering padam, mengganggu aktivitas ekonomi warga.', senderName: 'Ibu Rumah Tangga', ageGroup: '36-45', gender: 'P', occupation: 'LAINNYA', provinceCode: '61', regencyCode: '6175' },
    { title: 'Beasiswa untuk Anak Petani', message: 'Mohon perbanyak beasiswa untuk anak petani. Banyak putus sekolah.', senderName: 'Ibu Guru', ageGroup: '46-55', gender: 'P', occupation: 'GURU', provinceCode: '33', regencyCode: '3301' },
    { title: 'Terima Kasih Program MBG', message: 'Terima kasih untuk program MBG. Anak-anak sangat terbantu.', senderName: 'Ibu Wati', ageGroup: '36-45', gender: 'P', occupation: 'GURU', provinceCode: '32', regencyCode: '3201' },
    { title: 'DARURAT: Longsor di Pekalongan', message: 'Longsor menimbun rumah warga. Mohon evakuasi DARURAT!', senderName: 'Korban Longsor', ageGroup: '46-55', gender: 'L', occupation: 'PETANI', provinceCode: '33', regencyCode: '3311' },
    { title: 'Air Bersih Sulit Diakses Pedesaan', message: 'Warga desa kesulitan akses air bersih. Harus beli air mahal.', senderName: 'Pak Yanto', ageGroup: '46-55', gender: 'L', occupation: 'PETANI', provinceCode: '35', regencyCode: '3501' },
    { title: 'BPJS Sulit Digunakan', message: 'BPJS sulit digunakan di rumah sakit swasta. Antrian panjang.', senderName: 'Warga Jakbar', ageGroup: '36-45', gender: 'P', occupation: 'PNS', provinceCode: '31', regencyCode: '3171' },
    { title: 'Harga Sembako Tidak Stabil', message: 'Harga sembako naik turun tidak menentu. Pedagang kecil rugi.', senderName: 'Pak Joko', ageGroup: '46-55', gender: 'L', occupation: 'PEDAGANG', provinceCode: '31', regencyCode: '3173' },
  ]
  for (const a of aspirationsData) {
    const text = a.message.toLowerCase()
    let category = 'LAINNYA', subCategory = null, sentiment = 'NEUTRAL', priority = 'NORMAL'
    if (['pupuk','petani','sawah','irigasi','benih'].some(kw => text.includes(kw))) { category = 'PERTANIAN'; if (text.includes('pupuk')) subCategory = 'PUPUK'; else if (text.includes('irigasi')) subCategory = 'IRIGASI' }
    else if (['harga','umkm','dagang','modal'].some(kw => text.includes(kw))) { category = 'EKONOMI'; if (text.includes('harga')) subCategory = 'HARGA'; else if (text.includes('umkm')) subCategory = 'UMKM' }
    else if (['sekolah','guru','beasiswa'].some(kw => text.includes(kw))) { category = 'PENDIDIKAN' }
    else if (['bpjs','kesehatan'].some(kw => text.includes(kw))) { category = 'KESEHATAN' }
    else if (['jalan','listrik','air'].some(kw => text.includes(kw))) { category = 'INFRASTRUKTUR'; if (text.includes('jalan')) subCategory = 'JALAN'; else if (text.includes('listrik')) subCategory = 'LISTRIK'; else if (text.includes('air')) subCategory = 'AIR_BERSIH' }
    if (['darurat','mendesak','segera','bahaya'].some(kw => text.includes(kw))) { sentiment = 'URGENT'; priority = 'URGENT' }
    else if (['terima kasih','bagus','puas'].some(kw => text.includes(kw))) { sentiment = 'POSITIVE' }
    else if (['keluhan','rusak','tidak','belum','parah','mahal'].some(kw => text.includes(kw))) { sentiment = 'NEGATIVE'; priority = 'HIGH' }
    const aiCluster = `${a.occupation.toLowerCase()}-prov-${a.provinceCode}-kab-${a.regencyCode}-${category.toLowerCase()}${subCategory ? '-' + subCategory.toLowerCase() : ''}`
    await prisma.aspiration.create({ data: { ...a, category, subCategory, sentiment, priority, aiCluster, status: priority === 'URGENT' ? 'REVIEWING' : 'NEW', submittedAt: new Date(Date.now() - randomInt(0, 168) * 3600000) } })
  }
  console.log(`  ✓ ${aspirationsData.length} aspirations seeded`)

  // 5. VOTER CONTACTS
  const voterNames = ['Budi Santoso','Siti Aminah','Ahmad Yani','Dewi Lestari','Eko Prasetyo','Rina Marlina','Joko Widodo','Sri Mulyani','Bambang P.','Maya Sari']
  for (let i = 0; i < 50; i++) {
    const prov = randomChoice(PROVINCES)
    const regencyCode = prov.code + randomInt(1,5).toString().padStart(2,'0') + '01'
    const territory = await prisma.territory.findFirst({ where: { code: prov.code, level: 'PROVINCE' } })
    if (!territory) continue
    const path = `ID.${prov.code}.${regencyCode}.${randomInt(1,99).toString().padStart(3,'0')}.${randomInt(1,20).toString().padStart(3,'0')}.${randomInt(1,10).toString().padStart(2,'0')}`
    await prisma.voterContact.create({ data: { name: `${randomChoice(voterNames)} ${i+1}`, phone: `+628${randomInt(1000000000,9999999999)}`, whatsappOptIn: Math.random() > 0.05, ageGroup: randomChoice(AGE_GROUPS), gender: Math.random() < 0.55 ? 'L' : 'P', occupation: randomChoice(OCCUPATIONS), path, countryCode: 'ID', provinceCode: prov.code, regencyCode, districtCode: randomInt(1,99).toString().padStart(3,'0'), villageCode: randomInt(1,20).toString().padStart(3,'0'), rtCode: randomInt(1,10).toString().padStart(2,'0'), rwCode: randomInt(1,5).toString().padStart(2,'0'), territoryId: territory.id, isActive: Math.random() > 0.1, isVerified: Math.random() > 0.3, contactCount: randomInt(0,15), responseCount: randomInt(0,8) } }).catch(() => {})
  }
  console.log(`  ✓ 50 voter contacts seeded`)

  // 6. BROADCASTS
  const broadcasts = [
    { title: 'Klarifikasi Isu Pupuk Sambas', message: 'KLARIFIKASI RESMI: Distribusi pupuk di Sambas BERJALAN NORMAL.', channels: '["WHATSAPP","FACEBOOK","INSTAGRAM"]', channel: 'WHATSAPP', status: 'SENT', targetScope: '{"territoryId":"crisis"}', recipientCount: 1247, imageUrl: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/5f139c90784f.jpeg', channelStats: '{"WHATSAPP":{"sent":1247,"delivered":1185,"read":897,"failed":62},"FACEBOOK":{"reach":3992,"likes":287,"comments":45,"shares":89},"INSTAGRAM":{"reach":3492,"likes":412,"comments":67,"saves":156}}', channelPostIds: '{"WHATSAPP":"wa_1247","FACEBOOK":"fb_3992","INSTAGRAM":"ig_3492"}', crisisZoneId: null, sentById: admin.id, sentAt: new Date(Date.now()-3*3600000) },
    { title: 'Survei MBG - Ikuti Polling!', message: 'LAPRA 08 mengadakan survei kepuasan MBG. Suara Anda berarti bagi Pak Prabowo.', channels: '["WHATSAPP","FACEBOOK","INSTAGRAM"]', channel: 'WHATSAPP', status: 'SENT', targetScope: '{"all":true}', recipientCount: 5000, imageUrl: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3651d2c23fb2.jpg', linkUrl: 'https://app.lapra08.id/poll/mbg', channelStats: '{"WHATSAPP":{"sent":5000,"delivered":4750,"read":3120,"failed":250},"FACEBOOK":{"reach":18500,"likes":1240,"comments":234,"shares":567},"INSTAGRAM":{"reach":14200,"likes":1872,"comments":312,"saves":580}}', channelPostIds: '{"WHATSAPP":"wa_5000","FACEBOOK":"fb_18500","INSTAGRAM":"ig_14200"}', pollId: null, sentById: admin.id, sentAt: new Date(Date.now()-12*3600000) },
    { title: 'Pengumuman Pelantikan DPD Kalbar', message: 'Pengurus DPD LAPRA 08 Kalbar dilantik. Ketua: Bun Hon Khiong.', channels: '["WHATSAPP","FACEBOOK"]', channel: 'WHATSAPP', status: 'SENT', targetScope: '{"territoryId":"kalbar"}', recipientCount: 850, imageUrl: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/5f139c90784f.jpeg', channelStats: '{"WHATSAPP":{"sent":850,"delivered":812,"read":567,"failed":38},"FACEBOOK":{"reach":2850,"likes":425,"comments":89,"shares":178}}', channelPostIds: '{"WHATSAPP":"wa_850","FACEBOOK":"fb_2850"}', sentById: admin.id, sentAt: new Date(Date.now()-2*86400000) },
    { title: 'Reminder: Peace Walk Jakarta', message: 'Peace Walk 16 Agustus di Monas. Mari bergabung!', channels: '["WHATSAPP","FACEBOOK","INSTAGRAM"]', channel: 'WHATSAPP', status: 'SENT', targetScope: '{"all":true}', recipientCount: 8000, imageUrl: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3651d2c23fb2.jpg', channelStats: '{"WHATSAPP":{"sent":8000,"delivered":7620,"read":5120,"failed":380},"FACEBOOK":{"reach":32400,"likes":2340,"comments":456,"shares":1234},"INSTAGRAM":{"reach":28900,"likes":3120,"comments":567,"saves":892}}', channelPostIds: '{"WHATSAPP":"wa_8000","FACEBOOK":"fb_32400","INSTAGRAM":"ig_28900"}', sentById: admin.id, sentAt: new Date(Date.now()-5*3600000) },
    { title: 'Aspirasi Langsung ke Pak Prabowo', message: 'LAPRA 08 buka microsite aspirasi rakyat. Sampaikan aspirasi langsung ke Pak Prabowo!', channels: '["FACEBOOK","INSTAGRAM"]', channel: 'FACEBOOK', status: 'SENT', targetScope: '{"all":true}', recipientCount: 0, imageUrl: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3651d2c23fb2.jpg', linkUrl: 'https://app.lapra08.id/aspirasi', channelStats: '{"FACEBOOK":{"reach":45200,"likes":3420,"comments":892,"shares":1567},"INSTAGRAM":{"reach":38700,"likes":4890,"comments":723,"saves":1340}}', channelPostIds: '{"FACEBOOK":"fb_45200","INSTAGRAM":"ig_38700"}', sentById: admin.id, sentAt: new Date(Date.now()-86400000) },
    { title: 'Aksi Sosial Santunan Anak Yatim', message: 'Santunan 95 anak yatim di Pasar Pejaten bersama PD Pasar Jaya.', channels: '["WHATSAPP","INSTAGRAM"]', channel: 'WHATSAPP', status: 'SENT', targetScope: '{"territoryId":"jakarta"}', recipientCount: 320, imageUrl: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/31933e5cf281.jpg', channelStats: '{"WHATSAPP":{"sent":320,"delivered":305,"read":245,"failed":15},"INSTAGRAM":{"reach":12400,"likes":1872,"comments":234,"saves":678}}', channelPostIds: '{"WHATSAPP":"wa_320","INSTAGRAM":"ig_12400"}', sentById: admin.id, sentAt: new Date(Date.now()-7*86400000) },
    { title: 'Pidato Kenegaraan - Live Streaming', message: 'Live streaming pidato kenegaraan 16 Agustus 10:00 WIB via TVRI/YouTube.', channels: '["WHATSAPP","FACEBOOK","INSTAGRAM"]', channel: 'WHATSAPP', status: 'QUEUED', targetScope: '{"all":true}', recipientCount: 10000, imageUrl: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3651d2c23fb2.jpg', linkUrl: 'https://youtube.com/watch?v=setkab-live', channelStats: '{}', channelPostIds: '{}', sentById: admin.id, scheduledAt: new Date(Date.now()+6*3600000) },
  ]
  for (const b of broadcasts) {
    await prisma.broadcast.create({ data: b })
  }
  console.log(`  ✓ ${broadcasts.length} broadcasts seeded`)

  // FINAL STATS
  const stats = {
    polls: await prisma.poll.count(),
    pollResponses: await prisma.pollResponse.count(),
    crisisZones: await prisma.crisisZone.count(),
    aspirations: await prisma.aspiration.count(),
    broadcasts: await prisma.broadcast.count(),
    voterContacts: await prisma.voterContact.count(),
  }
  console.log('\n=== FINAL STATS ===')
  console.log(JSON.stringify(stats, null, 2))
  console.log('\n✅ RE-SEED COMPLETE')
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
