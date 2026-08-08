// LAPRA 08 — Inject berita asli dengan SOURCE URL (READ-ONLY, no edit)
import { db } from '../src/lib/db'

async function injectNews() {
  console.log('📰 Injecting LAPRA 08 news with source URLs...\n')

  const indonesia = await db.territory.findFirst({ where: { code: 'ID', level: 'COUNTRY' } })
  if (!indonesia) { console.error('Indonesia not found!'); process.exit(1) }
  const superadmin = await db.user.findFirst({ where: { username: 'superadmin' } })

  // Hapus berita lama (re-inject dengan source URL)
  await db.announcement.deleteMany({ where: { source: 'WEB_SYNC' } })
  await db.announcement.deleteMany({ where: { title: { contains: 'Selamat Datang' } } })

  const berita = [
    {
      title: 'Hashim Djojohadikusumo Lantik Pengurus Laskar Prabowo 08 Periode 2024-2029',
      content: `JAKARTA — Wakil Ketua Dewan Pembina Partai Gerindra, Hashim Djojohadikusumo, secara resmi melantik pengurus Laskar Prabowo 08 (LAPRA 08) untuk periode 2024-2029 dalam acara yang digelar secara hybrid di Auditorium RRI Jakarta, Jumat (21/3/2025).

Acara pelantikan ini dihadiri oleh seluruh pengurus DPN, 27 DPD, dan 77 DPC dari seluruh Indonesia. Hashim mengingatkan para pengurus untuk terus mengawal program-program pemerintah Presiden Prabowo Subianto menuju Indonesia Emas 2045.

Ketua Umum DPN LAPRA 08, Devi Taurisa, menyatakan siap menerima kepercayaan dan tanggung jawab sebagai pemimpin untuk menjalankan visi dan misi organisasi dalam mendukung program-program Presiden Prabowo Subianto.`,
      sourceUrl: 'https://rri.co.id/nasional/1408403/hashim-djojohadikusumo-lantik-pengurus-laskar-prabowo-08',
      sourceName: 'RRI.co.id',
      publishDate: '2025-03-21',
    },
    {
      title: 'Laskar Prabowo 08 Gelar Peace Walk dan Peace Forum Dukung Program Prioritas Prabowo',
      content: `JAKARTA — Laskar Prabowo 08 menggelar acara Peace Walk dan Peace Forum pada Minggu, 23 Februari 2025, di kawasan Bundaran Hotel Indonesia (HI), Jakarta.

Ketua Umum DPN Laskar Prabowo 08, Devi Taurisa, mengatakan kegiatan ini bertujuan untuk membawa pesan perdamaian serta menjaga situasi tetap kondusif, khususnya di level akar rumput.

"Visi misi kami adalah mengawal pemerintahan Prabowo, ikut aktif dalam program-program Prabowo, berusaha meyakinkan Prabowo bekerja dengan baik dan menjalankan janji-janji kampanyenya untuk mendukung Indonesia Emas 2045," ujar Devi Taurisa.`,
      sourceUrl: 'https://www.metrotvnews.com/play/bmRCE3wn-laskar-prabowo-08-gelar-peace-walk-dukung-program-prioritas-presiden',
      sourceName: 'MetroTV News',
      publishDate: '2025-02-23',
    },
    {
      title: 'DPN Laskar Prabowo 08 Serahkan Seragam Kehormatan kepada Hashim Djojohadikusumo',
      content: `JAKARTA — DPN Laskar Prabowo 08 secara resmi menyerahkan seragam kehormatan kepada Ketua Dewan Pembina, Bapak Dr. (HC) Hashim S. Djojohadikusumo, dalam acara khusus di Jakarta, Rabu (12/3/2025).

Ketua Umum DPN LAPRA 08, Devi Taurisa, menyampaikan bahwa pemberian seragam ini merupakan simbol penghormatan dan dukungan penuh kepada Bapak Hashim atas peran strategisnya dalam membina dan mengarahkan perjuangan Laskar Prabowo 08.

Acara ini dihadiri oleh berbagai tokoh serta anggota Laskar Prabowo 08 dari berbagai daerah.`,
      sourceUrl: 'https://katababel.com/2025/03/dpn-laskar-prabowo-08-serahkan-seragam-kehormatan-kepada-ketua-dewan-pembina-hashim-djojoh',
      sourceName: 'Katababel.com',
      publishDate: '2025-03-12',
    },
    {
      title: 'Laskar Prabowo 08 Kukuhkan Pengurus Baru dan Luncurkan Pusat Bantuan Hukum',
      content: `JAKARTA — Laskar Prabowo 08 menggelar acara pengukuhan pengurus baru sekaligus peluncuran Pusat Bantuan Hukum (PBH) dalam acara hybrid di 33 provinsi, Sabtu (7/3/2026).

Susunan pengurus inti setelah pembaruan: Ketua Umum Devi Taurisa, Sekretaris Jenderal Brigjen. Pol. (Purn) Dr. R. Nurhadi, dan Bendahara Umum Timmy Rorimpandey.

Pusat Bantuan Hukum (PBH) LAPRA 08 diluncurkan untuk memberikan advokasi hukum bagi anggota dan masyarakat. Acara dihadiri oleh 155 Kabupaten/Kota.`,
      sourceUrl: 'https://detikzone.id/2026/03/07/laskar-prabowo-08-kukuhkan-pengurus-baru-dan-luncurkan-pusat-bantuan-hukum-di-jakarta-relawan-siap',
      sourceName: 'Detikzone.id',
      publishDate: '2026-03-07',
    },
    {
      title: 'Laskar Prabowo 08 Sukseskan Asta Cita Presiden Prabowo, 13 Problematika Bali',
      content: `DENPASAR — DPD Bali Laskar Prabowo 08 melakukan audensi dan melaporkan keberadaan organisasi kepada Kesbangpol Provinsi Bali dalam rangka menyukseskan program Asta Cita Presiden Prabowo Subianto.

Nengah Tamba, Ketua DPD Bali LAPRA 08, menyampaikan laporan keberadaan organisasi kepada Kaban Kesbangpol Bali. DPD Bali LAPRA 08 juga merancang Program Kerja dengan 13 Problematika Bali meliputi Overtourism, Birokrasi, WNA Illegal, Kriminalitas, Pengelolaan Sampah, dan lainnya.`,
      sourceUrl: 'https://www.atnews.id/portal/news/25949/laskar-prabowo-08-sukseskan-asta-cita-presiden-prabowogaraf-13-problematika-bali',
      sourceName: 'AtNews.id',
      publishDate: '2025-07-19',
    },
    {
      title: 'Hashim Resmikan Markas Baru Laskar Prabowo 08 di Jakarta',
      content: `JAKARTA — Ketua Dewan Pembina Laskar Prabowo 08, Dr. (HC) Hashim S. Djojohadikusumo, meresmikan markas baru Laskar Prabowo 08 di Jakarta.

Ketua Umum DPN, Devi Taurisa, menyampaikan bahwa markas baru ini akan menjadi pusat koordinasi nasional. Devi menambahkan, Laskar Prabowo 08 juga akan berperan dalam meluruskan informasi hoaks terkait program pemerintah.`,
      sourceUrl: 'https://www.metrotvnews.com/play/b7WCmvYz-hashim-resmikan-markas-baru-laskar-prabowo-08-di-jakarta',
      sourceName: 'MetroTV News',
      publishDate: '2026-08-08',
    },
    {
      title: 'DPD Laskar Prabowo 08 Bangka Belitung Gelar Aksi Berbagi Takjil Ramadan',
      content: `PANGKALPINANG — DPD Laskar Prabowo 08 Bangka Belitung menggelar aksi berbagi takjil dalam momentum Ramadan 1447 H. Kegiatan berbagi paket Iftar Ramadhan ini merupakan kali kedua, menyusul kegiatan serupa pada tahun 2025.

Aksi sosial ini diikuti oleh anggota DPD dan DPC Laskar Prabowo 08 se-Bangka Belitung yang membagikan ratusan paket takjil kepada masyarakat.`,
      sourceUrl: 'https://katababel.com/2025/03/dpn-laskar-prabowo-08-serahkan-seragam-kehormatan-kepada-ketua-dewan-pembina-hashim-djojoh',
      sourceName: 'Katababel.com',
      publishDate: '2026-03-03',
    },
    {
      title: 'Laskar Prabowo 08 Komit Dukung Pemerintahan Prabowo-Gibran Menuju Indonesia Emas',
      content: `JAKARTA — Laskar Prabowo 08 menyatakan komitmen penuh untuk mendukung pemerintahan Presiden Prabowo Subianto dan Wakil Presiden Gibran Rakabuming Raka dalam mewujudkan visi Indonesia Emas 2045.

Salah satu kegiatan yang diselenggarakan adalah mengadakan Peace Walk Forum pada Minggu, 23 Februari 2025, di kawasan Bundaran HI, Jakarta. Organisasi ini juga aktif dalam program sosialisasi kebijakan pemerintah.`,
      sourceUrl: 'https://nasional.tvrinews.com/berita/txum5tf-laskar-prabowo-08-komit-dukung-pemerintahan-prabowo-gibran-menuju-indonesia',
      sourceName: 'TVRi News',
      publishDate: '2025-02-21',
    },
  ]

  let created = 0
  for (const b of berita) {
    await db.announcement.create({
      data: {
        title: b.title,
        content: b.content,
        type: 'INFO',
        category: 'BERITA',
        isPinned: b.sourceName === 'RRI.co.id', // Pin berita utama
        isActive: true,
        photoUrl: null,
        publishDate: new Date(b.publishDate),
        source: 'WEB_SYNC', // READ-ONLY — tidak bisa diedit
        sourceUrl: b.sourceUrl,
        sourceName: b.sourceName,
        territoryId: indonesia.id,
        createdById: superadmin?.id || '',
      },
    })
    console.log(`  ✅ ${b.sourceName}: ${b.title.substring(0, 60)}...`)
    created++
  }

  console.log(`\n✅ ${created} berita WEB_SYNC (READ-ONLY) diinject`)
  console.log(`   Setiap berita punya link "Baca Selengkapnya" ke sumber asli`)
  console.log(`   Admin TIDAK bisa edit berita dari web lain — hanya berita MANUAL yang bisa diedit`)

  await db.$disconnect()
}

injectNews().catch(console.error)
