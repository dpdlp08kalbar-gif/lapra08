// LAPRA 08 — Inject berita asli dari web search ke database
import { db } from '../src/lib/db'

async function injectNews() {
  console.log('📰 Injecting real LAPRA 08 news...\n')

  // Get DPN territory (Indonesia)
  const indonesia = await db.territory.findFirst({
    where: { code: 'ID', level: 'COUNTRY' },
  })
  if (!indonesia) {
    console.error('Indonesia territory not found!')
    process.exit(1)
  }

  // Get superadmin user
  const superadmin = await db.user.findFirst({
    where: { username: 'superadmin' },
  })

  const berita = [
    {
      title: 'Hashim Djojohadikusumo Lantik Pengurus Laskar Prabowo 08 Periode 2024-2029',
      content: `JAKARTA — Wakil Ketua Dewan Pembina Partai Gerindra, Hashim Djojohadikusumo, secara resmi melantik pengurus Laskar Prabowo 08 (LAPRA 08) untuk periode 2024-2029 dalam acara yang digelar secara hybrid di Auditorium RRI Jakarta, Jumat (21/3/2025).

Acara pelantikan ini dihadiri oleh seluruh pengurus Dewan Pimpinan Nasional (DPN), 27 Dewan Pimpinan Daerah (DPD), dan 77 Dewan Pimpinan Cabang (DPC) dari seluruh Indonesia.

Dalam sambutannya, Hashim yang juga Ketua Dewan Pembina LAPRA 08 mengingatkan para pengurus untuk terus mengawal program-program pemerintah Presiden Prabowo Subianto menuju Indonesia Emas 2045.

Sementara itu, Ketua Umum DPN LAPRA 08, Devi Taurisa, S.H., M.H., C.L.D., menyatakan siap menerima kepercayaan dan tanggung jawab sebagai pemimpin untuk menjalankan visi dan misi organisasi.

"Saya siap menerima kepercayaan dan tanggung jawab sebagai Ketua Umum, untuk menjalankan visi dan misi Laskar Prabowo 08 dalam mengawal serta berpartisipasi secara aktif dalam mendukung program-program Presiden Prabowo Subianto menuju Indonesia Emas 2045," ujar Devi Taurisa.

Struktur kepengurusan yang dilantik mencakup DPN, DPD, dan DPC dengan pengurus inti terdiri dari Devi Taurisa sebagai Ketua Umum, Hisar Tambunan sebagai Ketua Harian, Raymond Simamora sebagai Sekretaris Jenderal, dan Riyad sebagai Bendahara Umum.

Sumber: RRI.co.id, BusinessAsia.co.id, MetroTV News`,
      type: 'INFO',
      category: 'BERITA',
      isPinned: true,
      photoUrl: null,
      publishDate: '2025-03-21',
      territoryId: indonesia.id,
      createdById: superadmin?.id,
    },
    {
      title: 'Laskar Prabowo 08 Gelar Peace Walk dan Peace Forum Dukung Program Prioritas Prabowo',
      content: `JAKARTA — Laskar Prabowo 08 menggelar acara Peace Walk dan Peace Forum pada Minggu, 23 Februari 2025, di kawasan Bundaran Hotel Indonesia (HI), Jakarta. Acara ini diselenggarakan untuk mendukung program prioritas Presiden Prabowo Subianto.

Ketua Umum DPN Laskar Prabowo 08, Devi Taurisa, mengatakan kegiatan ini bertujuan untuk membawa pesan perdamaian serta menjaga situasi tetap kondusif, khususnya di level akar rumput.

"Visi misi kami sekarang ini adalah mengawal pemerintahan Prabowo, ikut aktif dalam program-program Prabowo, berusaha meyakinkan Prabowo bekerja dengan baik dan Prabowo dapat menjalankan janji-janji kampanyenya untuk mendukung Indonesia Emas 2045," ujar Devi Taurisa.

Peace Walk dimulai dari Bundaran HI dan berakhir di Monumen Nasal (Monas), diikuti oleh ribuan anggota Laskar Prabowo 08 dari berbagai daerah.

"Kami mengajak semua pihak untuk berpartisipasi dan memahami lebih jauh tentang Laskar Prabowo 08 dan dukungan kami terhadap program pemerintahan Prabowo-Gibran," tambah Devi.

Acara Peace Forum yang digelar setelah Peace Walk menghadirkan berbagai pembicara yang membahas program prioritas pemerintah dan peran relawan dalam mensosialisasikan kebijakan kepada masyarakat.

Sumber: MetroTV News, BusinessAsia.co.id, TVRi News`,
      type: 'INFO',
      category: 'BERITA',
      isPinned: false,
      photoUrl: null,
      publishDate: '2025-02-23',
      territoryId: indonesia.id,
      createdById: superadmin?.id,
    },
    {
      title: 'DPN Laskar Prabowo 08 Serahkan Seragam Kehormatan kepada Hashim Djojohadikusumo',
      content: `JAKARTA — Dewan Pimpinan Nasional (DPN) Laskar Prabowo 08 secara resmi menyerahkan seragam kehormatan kepada Ketua Dewan Pembina, Bapak Dr. (HC) Hashim S. Djojohadikusumo, dalam acara khusus yang berlangsung di Jakarta, Rabu (12/3/2025).

Ketua Umum DPN LAPRA 08, Devi Taurisa, menyampaikan bahwa pemberian seragam ini merupakan simbol penghormatan dan dukungan penuh kepada Bapak Hashim Djojohadikusumo atas peran strategisnya dalam membina dan mengarahkan perjuangan Laskar Prabowo 08.

"Pemberian seragam kehormatan ini adalah bentuk penghormatan kami kepada Bapak Hashim yang telah menjadi pembina dan pengarah utama dalam setiap langkah Laskar Prabowo 08. Beliau adalah inspirasi bagi seluruh pengurus dan anggota," ujar Devi Taurisa.

Bapak Hashim Djojohadikusumo menyambut baik penyerahan seragam ini dan mengapresiasi kerja keras serta dedikasi Laskar Prabowo 08 dalam mendukung perjuangan politik dan sosial.

Acara ini dihadiri oleh berbagai tokoh serta anggota Laskar Prabowo 08 dari berbagai daerah, termasuk pengurus DPN, DPD, dan DPC se-Indonesia.

Dengan adanya dukungan kuat dari berbagai elemen, Laskar Prabowo 08 berkomitmen untuk terus berkontribusi dalam mewujudkan cita-cita besar bagi kemajuan Indonesia.

Sumber: Katababel.com`,
      type: 'INFO',
      category: 'BERITA',
      isPinned: false,
      photoUrl: null,
      publishDate: '2025-03-12',
      territoryId: indonesia.id,
      createdById: superadmin?.id,
    },
    {
      title: 'Laskar Prabowo 08 Kukuhkan Pengurus Baru dan Luncurkan Pusat Bantuan Hukum',
      content: `JAKARTA — Laskar Prabowo 08 menggelar acara pengukuhan pengurus baru sekaligus peluncuran Pusat Bantuan Hukum (PBH) dalam acara hybrid yang digelar di 33 provinsi se-Indonesia, Sabtu (7/3/2026).

Acara ini menjadi momen penting bagi LAPRA 08 karena tidak hanya mengumumkan pembaruan susunan pengurus inti DPN, tetapi juga meluncurkan Pusat Bantuan Hukum sebagai wujud nyata pengabdian organisasi kepada masyarakat.

Adapun susunan pengurus inti Laskar Prabowo 08 setelah pembaruan struktural terdiri dari:
- Ketua Umum: Devi Taurisa
- Sekretaris Jenderal: Brigjen. Pol. (Purn) Dr. R. Nurhadi, S.I.K., M.Si., CHRMP
- Bendahara Umum: Timmy Rorimpandey, S.E., M.M.

Pusat Bantuan Hukum (PBH) LAPRA 08 diluncurkan untuk memberikan advokasi hukum bagi anggota dan masyarakat yang membutuhkan. Hal ini sejalan dengan visi organisasi yang tidak hanya bergerak dalam bidang politik, tetapi juga pengabdian sosial.

Dalam sambutannya, Ketua Umum Devi Taurisa menyampaikan ucapan selamat kepada para pengurus baru dan menekankan pentingnya kerja nyata, pengabdian, dan kepatuhan hukum dalam setiap program organisasi.

Acara ini dihadiri oleh 155 Kabupaten/Kota dan berlangsung secara hybrid, menandai komitmen LAPRA 08 untuk terus memperluas jangkauan dan meningkatkan kualitas pengabdian kepada bangsa dan negara.

Sumber: Detikzone.id, MajalahReformasi.com`,
      type: 'INFO',
      category: 'BERITA',
      isPinned: false,
      photoUrl: null,
      publishDate: '2026-03-07',
      territoryId: indonesia.id,
      createdById: superadmin?.id,
    },
    {
      title: 'Laskar Prabowo 08 Sukseskan Asta Cita Presiden Prabowo, Garaf 13 Problematika Bali',
      content: `DENPASAR — DPD Bali Laskar Prabowo 08 melakukan audensi dan melaporkan keberadaan organisasi kepada Kesbangpol Provinsi Bali dalam rangka menyukseskan program Asta Cita Presiden Prabowo Subianto.

Nengah Tamba, Ketua DPD Bali Laskar Prabowo 08, menyampaikan laporan keberadaan Organisasi Kemasyarakatan (Ormas) DPD Bali Laskar Prabowo (LAPRA) 08 kepada Kaban Kesbangpol Bali, Gede Suralaga.

"Kami menjaga Integritas, Etika dan Moral serta Kebijakan Laskar Prabowo 08 dan diharapkan membangun sinergi yang kuat dengan masyarakat, pemerintah maupun semua pihak terkait dalam mewujudkan pembangunan yang berkelanjutan, berkeadilan dan berdaya saing untuk kepentingan Provinsi Bali maupun kepentingan nasional," papar Nengah Tamba.

DPD Bali LAPRA 08 juga telah merancang Program Kerja dengan 13 Problematika Bali yang meliputi: Overtourism, Birokrasi, WNA Illegal, Kriminalitas, Ketersediaan Air Bersih, Keseimbangan Budaya dan Modernisasi, Pengelolaan Sampah, Pengalihan Fungsi Lahan, Kemacetan Lalu Lintas, dan lainnya.

Laskar Prabowo 08 terus mengawal program Asta Cita agar berjalan dengan transparansi dan akuntabel, dengan cara aktif dalam mengawasi dan turut mengawal pelaksanaan program yang bertujuan untuk pembangunan yang berkeadilan.

Sumber: AtNews.id, BaliPolitika.com`,
      type: 'INFO',
      category: 'BERITA',
      isPinned: false,
      photoUrl: null,
      publishDate: '2025-07-19',
      territoryId: indonesia.id,
      createdById: superadmin?.id,
    },
    {
      title: 'Hashim Resmikan Markas Baru Laskar Prabowo 08 di Jakarta',
      content: `JAKARTA — Ketua Dewan Pembina Laskar Prabowo 08, Dr. (HC) Hashim S. Djojohadikusumo, meresmikan markas baru Laskar Prabowo 08 di Jakarta. Acara peresmian ini menandai babak baru bagi organisasi dalam mendukung program pemerintah Presiden Prabowo Subianto.

Ketua Umum DPN Laskar Prabowo 08, Devi Taurisa, dalam sambutannya menyampaikan bahwa markas baru ini akan menjadi pusat koordinasi nasional untuk seluruh kegiatan LAPRA 08 di tingkat DPN, DPD, dan DPC.

Devi menambahkan, Laskar Prabowo 08 juga akan berperan dalam meluruskan informasi hoaks terkait program pemerintah. Para anggota organisasi akan disebar di berbagai daerah untuk memberikan sosialisasi yang akurat kepada masyarakat.

"Kami berkomitmen untuk menjadi jembatan antara pemerintah dan masyarakat, memastikan bahwa program-program Presiden Prabowo dapat dipahami dan didukung oleh seluruh lapisan masyarakat," kata Devi Taurisa.

Markas baru ini dilengkapi dengan ruang sekretariat, ruang rapat, dan fasilitas untuk kegiatan sosial dan pelatihan kader.

Sumber: MetroTV News`,
      type: 'INFO',
      category: 'BERITA',
      isPinned: false,
      photoUrl: null,
      publishDate: '2026-08-08',
      territoryId: indonesia.id,
      createdById: superadmin?.id,
    },
    {
      title: 'DPD Laskar Prabowo 08 Bangka Belitung Gelar Aksi Berbagi Takjil di Momentum Ramadan',
      content: `PANGKALPINANG — DPD Laskar Prabowo 08 Bangka Belitung menggelar aksi berbagi takjil dalam momentum Ramadan 1447 H. Kegiatan berbagi paket Iftar Ramadhan ini merupakan kali kedua, menyusul penyelenggaraan kegiatan serupa pada tahun 2025.

Aksi sosial ini diikuti oleh anggota DPD dan DPC Laskar Prabowo 08 se-Bangka Belitung, yang membagikan ratusan paket takjil kepada masyarakat yang melintas di titik-titik strategis di Pangkalpinang.

Ketua DPD Bangka Belitung LAPRA 08 menyampaikan bahwa kegiatan ini merupakan wujud nyata pengabdian sosial organisasi kepada masyarakat, terutama di bulan suci Ramadan.

"Kami ingin menunjukkan bahwa Laskar Prabowo 08 tidak hanya bergerak di bidang politik, tetapi juga peduli dengan kesejahteraan sosial masyarakat. Kegiatan seperti ini akan terus kami lakukan secara konsisten," ujar Ketua DPD.

Kegiatan berbagi takjil ini mendapat apresiasi positif dari masyarakat Bangka Belitung dan menjadi rutinitas tahunan LAPRA 08 di bulan Ramadan.

Sumber: Katababel.com, Instagram @laskarprabowo08official`,
      type: 'INFO',
      category: 'BERITA',
      isPinned: false,
      photoUrl: null,
      publishDate: '2026-03-03',
      territoryId: indonesia.id,
      createdById: superadmin?.id,
    },
    {
      title: 'Laskar Prabowo 08 Komit Dukung Pemerintahan Prabowo-Gibran Menuju Indonesia Emas',
      content: `JAKARTA — Laskar Prabowo 08 menyatakan komitmen penuh untuk mendukung pemerintahan Presiden Prabowo Subianto dan Wakil Presiden Gibran Rakabuming Raka dalam mewujudkan visi Indonesia Emas 2045.

Salah satu kegiatan yang diselenggarakan oleh Laskar Prabowo 08 adalah mengadakan Peace Walk Forum pada Minggu, 23 Februari 2025, di kawasan Bundaran HI, Jakarta.

Organisasi ini juga aktif dalam program sosialisasi kebijakan pemerintah, termasuk program Makan Bergizi Gratis (MBG), hilirisasi sumber daya alam, dan pembangunan infrastruktur.

"Kami akan terus mendukung program-program pemerintah dan memastikan bahwa kebijakan Presiden Prabowo dapat sampai dan dipahami oleh masyarakat di seluruh daerah," kata pengurus DPN LAPRA 08.

Dengan jaringan yang mencakup 39 DPD (38 provinsi + IKN) dan 5 DPD luar negeri, serta 514 DPC terhubung, Laskar Prabowo 08 menjadi salah satu relawan terbesar pendukung pemerintahan Prabowo-Gibran.

Sumber: TVRi News, MetroTV News`,
      type: 'INFO',
      category: 'BERITA',
      isPinned: false,
      photoUrl: null,
      publishDate: '2025-02-21',
      territoryId: indonesia.id,
      createdById: superadmin?.id,
    },
  ]

  // Hapus pengumuman lama (sample data) untuk hindari duplikasi
  await db.announcement.deleteMany({
    where: { title: { contains: 'Selamat Datang' } },
  })

  let created = 0
  for (const b of berita) {
    // Cek apakah sudah ada
    const existing = await db.announcement.findFirst({
      where: { title: b.title },
    })
    if (existing) {
      console.log(`  ⏭️  Skip (already exists): ${b.title.substring(0, 60)}...`)
      continue
    }

    await db.announcement.create({
      data: {
        title: b.title,
        content: b.content,
        type: b.type,
        category: b.category,
        isPinned: b.isPinned,
        isActive: true,
        photoUrl: b.photoUrl,
        publishDate: new Date(b.publishDate),
        expiresAt: null,
        territoryId: b.territoryId,
        createdById: b.createdById || superadmin?.id || '',
      },
    })
    console.log(`  ✅ Created: ${b.title.substring(0, 70)}...`)
    created++
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 SUMMARY: ${created} berita baru diinject`)
  console.log(`   Total berita di database: ${await db.announcement.count()}`)
  console.log('='.repeat(60))

  await db.$disconnect()
}

injectNews().catch(console.error)
