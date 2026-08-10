// LAPRA 08 - Seed data lengkap: Events + Assets + Finance
// Isi data realistis untuk testing & demo
import { db } from '../src/lib/db'

async function main() {
  console.log('=== SEED DATA LAPRA 08 ===\n')

  // Get territories & users
  const dpnTerritory = await db.territory.findFirst({ where: { code: 'ID' } })
  const kalbarTerritory = await db.territory.findFirst({ where: { code: '61' } })
  const pontianakTerritory = await db.territory.findFirst({ where: { code: '6171' } })
  const superadmin = await db.user.findFirst({ where: { username: 'superadmin' } })
  const dpnUser = await db.user.findFirst({ where: { username: 'dpn' } })
  const dpdKalbar = await db.user.findFirst({ where: { username: 'dpd.kalbar' } })

  if (!dpnTerritory || !superadmin || !dpnUser) {
    console.error('Missing base data (territory/user)')
    return
  }

  // ============================================================
  // 1. SEED EVENTS (10 events LAPRA 08)
  // ============================================================
  console.log('=== 1. SEED EVENTS ===')
  
  // Clear existing (keep 1 that already exists)
  const existingEvents = await db.event.count()
  console.log(`Existing events: ${existingEvents}`)
  
  const events = [
    {
      title: 'Rapat Pleno DPN LAPRA 08 — Evaluasi Kinerja Q3 2026',
      description: 'Rapat pleno Dewan Pimpinan Pusat LAPRA 08 untuk evaluasi kinerja kuartal 3 tahun 2026. Membahas progress program Asta Cita, capaian DPD se-Indonesia, dan strategi kuartal 4.',
      type: 'RAPAT',
      startDate: new Date('2026-08-20T09:00:00+07:00'),
      endDate: new Date('2026-08-20T15:00:00+07:00'),
      location: 'Auditorium Sekretariat DPN, Jakarta',
      status: 'SCHEDULED',
      targetAttendance: 150,
    },
    {
      title: 'Pelantikan Pengurus DPC Pontianak Kota',
      description: 'Pelantikan resmi pengurus DPC Kota Pontianak periode 2026-2031 oleh Ketua DPD Kalimantan Barat.',
      type: 'PELANTIKAN',
      startDate: new Date('2026-08-15T10:00:00+07:00'),
      endDate: new Date('2026-08-15T13:00:00+07:00'),
      location: 'Aula Pendopo Daerah Pontianak',
      status: 'SCHEDULED',
      targetAttendance: 200,
    },
    {
      title: 'Bakti Sosial donor darah DPD Kalbar',
      description: 'Kegiatan bakti sosial donor darah massal bersama PMI Pontianak. Target 200 kantong darah untuk membantu stok PMI Kalbar.',
      type: 'SOSIAL',
      startDate: new Date('2026-08-25T08:00:00+07:00'),
      endDate: new Date('2026-08-25T14:00:00+07:00'),
      location: 'Kantor PMI Pontianak, Jl. Tanjungpura',
      status: 'SCHEDULED',
      targetAttendance: 300,
    },
    {
      title: 'Deklarasi DPD LAPRA 08 Jawa Timur',
      description: 'Deklarasi resmi DPD Laskar Prabowo 08 Jawa Timur dihadiri Hashim Djojohadikusumo. Membawahi 38 DPC se-Jawa Timur.',
      type: 'PELANTIKAN',
      startDate: new Date('2026-09-01T13:00:00+07:00'),
      endDate: new Date('2026-09-01T17:00:00+07:00'),
      location: 'JX International Expo, Surabaya',
      status: 'SCHEDULED',
      targetAttendance: 5000,
    },
    {
      title: 'Mobilisasi Kader — Sosialisasi Asta Cita Presiden',
      description: 'Mobilisasi kader DPC se-Kalimantan Barat untuk sosialisasi 8 program Asta Cita Presiden Prabowo Subianto ke masyarakat.',
      type: 'MOBILISASI',
      startDate: new Date('2026-08-28T07:00:00+07:00'),
      endDate: new Date('2026-08-28T16:00:00+07:00'),
      location: 'Lapangan Pancasila, Pontianak',
      status: 'SCHEDULED',
      targetAttendance: 1000,
    },
    {
      title: 'Workshop Digitalisasi Sistem Informasi LAPRA 08',
      description: 'Pelatihan penggunaan sistem informasi internal LAPRA 08 untuk admin DPD dan DPC. Materi: dashboard, pengelolaan data anggota, broadcast WA, polling essay.',
      type: 'LAINNYA',
      startDate: new Date('2026-09-05T09:00:00+07:00'),
      endDate: new Date('2026-09-05T16:00:00+07:00'),
      location: 'Sekretariat DPN, Jakarta (Hybrid Zoom)',
      status: 'SCHEDULED',
      targetAttendance: 80,
    },
    {
      title: 'Halal Bi Halal DPN-DPD-DPC se-Indonesia 2026',
      description: 'Halal bi halal akbar LAPRA 08 se-Indonesia. Mengundang seluruh pengurus DPN, DPD 38 provinsi, dan perwakilan DPC.',
      type: 'SOSIAL',
      startDate: new Date('2026-09-10T18:00:00+07:00'),
      endDate: new Date('2026-09-10T21:00:00+07:00'),
      location: 'Istora Senayan, Jakarta',
      status: 'SCHEDULED',
      targetAttendance: 10000,
    },
    {
      title: 'Rapat Koordinasi DPD Kalimantan Barat',
      description: 'Rapat koordinasi DPD Kalbar dengan 14 DPC untuk evaluasi program kaderisasi dan persiapan Pilkada 2026.',
      type: 'RAPAT',
      startDate: new Date('2026-08-18T10:00:00+07:00'),
      endDate: new Date('2026-08-18T14:00:00+07:00'),
      location: 'Sekretariat DPD Kalbar, Pontianak',
      status: 'SCHEDULED',
      targetAttendance: 50,
    },
    {
      title: 'Aksi Sosial — Distribusi Sembako ke Warga Terdampak',
      description: 'Distribusi paket sembako untuk 500 KK warga terdampak di 5 kelurahan Pontianak. Kerja sama DPC Pontianak dengan Dinas Sosial Kota.',
      type: 'SOSIAL',
      startDate: new Date('2026-09-15T08:00:00+07:00'),
      endDate: new Date('2026-09-15T12:00:00+07:00'),
      location: '5 Kelurahan di Kota Pontianak',
      status: 'SCHEDULED',
      targetAttendance: 100,
    },
    {
      title: 'Bakti Sosial gratis gunting rambut untuk lansia',
      description: 'Kegiatan bakti sosial potong rambut gratis untuk 200 lansia di panti werdha Pontianak. DPC Pontianak bekerjasama dengan komunitas tukang cukur.',
      type: 'SOSIAL',
      startDate: new Date('2026-10-01T09:00:00+07:00'),
      endDate: new Date('2026-10-01T15:00:00+07:00'),
      location: 'Panti Werdha Bahagia, Pontianak',
      status: 'SCHEDULED',
      targetAttendance: 50,
    },
  ]

  let eventCount = 0
  for (const e of events) {
    // Assign territory: mix of DPN, DPD Kalbar, DPC Pontianak
    let territory = dpnTerritory
    if (e.location?.includes('Pontianak') || e.location?.includes('Kalbar')) {
      territory = kalbarTerritory || dpnTerritory
    }
    if (e.location?.includes('DPC Pontianak') || e.title.includes('DPC Pontianak')) {
      territory = pontianakTerritory || kalbarTerritory || dpnTerritory
    }
    
    await db.event.create({
      data: {
        ...e,
        territoryId: territory.id,
        createdById: dpnUser.id,
      },
    })
    eventCount++
  }
  console.log(`✅ Inserted ${eventCount} events`)

  // ============================================================
  // 2. SEED ASSETS/LOGISTIK (6 atribut LAPRA 08)
  // ============================================================
  console.log('\n=== 2. SEED ASSETS/LOGISTIK ===')
  
  const existingAssets = await db.asset.count()
  console.log(`Existing assets: ${existingAssets}`)
  
  const assets = [
    {
      name: 'Kemeja Seragam Hitam LAPRA 08',
      category: 'KEMEJA',
      sku: 'LAPRA-KM-HITAM',
      stock: 5000,
      unit: 'pcs',
      minStock: 500,
      description: 'Kemeja seragam resmi warna hitam dengan logo LAPRA 08 bordir. Ukuran S, M, L, XL, XXL, XXXL. Distribusi ke seluruh DPC.',
      photoUrl: null,
    },
    {
      name: 'Bendera LAPRA 08 (Ukuran 3x2 meter)',
      category: 'BENDERA',
      sku: 'LAPRA-BD-3X2',
      stock: 600,
      unit: 'pcs',
      minStock: 50,
      description: 'Bendera resmi LAPRA 08 ukuran 3x2 meter, bahan parasonic, warna oranye-merah dengan logo LAPRA 08. Untuk upacara & acara resmi.',
      photoUrl: null,
    },
    {
      name: 'Pin/Lencana LAPRA 08',
      category: 'PIN',
      sku: 'LAPRA-PIN-01',
      stock: 10000,
      unit: 'pcs',
      minStock: 1000,
      description: 'Pin logam dengan logo LAPRA 08, ukuran 3cm, finishing emas. Dipakai oleh seluruh pengurus DPN, DPD, DPC.',
      photoUrl: null,
    },
    {
      name: 'Banner Spanduk LAPRA 08 (Custom)',
      category: 'BANNER',
      sku: 'LAPRA-BN-CUSTOM',
      stock: 200,
      unit: 'lembar',
      minStock: 20,
      description: 'Banner flexi ukuran custom (max 5x2 meter), cetak digital full color, untuk acara & kegiatan. Bisa custom teks per DPC.',
      photoUrl: null,
    },
    {
      name: 'Lanyard ID Card LAPRA 08',
      category: 'LAINNYA',
      sku: 'LAPRA-LY-01',
      stock: 8000,
      unit: 'pcs',
      minStock: 800,
      description: 'Lanyard dengan logo LAPRA 08, warna oranye-merah, klip logam. Dipakai bersama KTA digital untuk identifikasi pengurus.',
      photoUrl: null,
    },
    {
      name: 'Plakat Penghargaan LAPRA 08',
      category: 'PLAKAT',
      sku: 'LAPRA-PK-01',
      stock: 150,
      unit: 'pcs',
      minStock: 20,
      description: 'Plakat akrilik ukuran 25x30cm dengan ukiran logo LAPRA 08. Untuk penghargaan DPD/DPC berprestasi.',
      photoUrl: null,
    },
  ]

  let assetCount = 0
  for (const a of assets) {
    await db.asset.create({
      data: {
        ...a,
        territoryId: dpnTerritory.id,
      },
    })
    assetCount++
  }
  console.log(`✅ Inserted ${assetCount} assets`)

  // ============================================================
  // 3. SEED FINANCE TRANSACTIONS (20 transaksi)
  // ============================================================
  console.log('\n=== 3. SEED FINANCE TRANSACTIONS ===')
  
  const existingTxns = await db.financeTransaction.count()
  console.log(`Existing transactions: ${existingTxns}`)
  
  const transactions = [
    // INCOME - Iuran
    { type: 'INCOME', category: 'IURAN', amount: 5000000, description: 'Iuran bulanan pengurus DPD Kalbar (Juli 2026)', date: '2026-07-05' },
    { type: 'INCOME', category: 'IURAN', amount: 2500000, description: 'Iuran anggota DPC Pontianak (Juli 2026)', date: '2026-07-10' },
    { type: 'INCOME', category: 'IURAN', amount: 5000000, description: 'Iuran bulanan pengurus DPD Kalbar (Agustus 2026)', date: '2026-08-05' },
    { type: 'INCOME', category: 'IURAN', amount: 2500000, description: 'Iuran anggota DPC Pontianak (Agustus 2026)', date: '2026-08-10' },
    { type: 'INCOME', category: 'IURAN', amount: 12500000, description: 'Iuran DPN pusat dari 5 DPD wilayah (Q3 2026)', date: '2026-08-01' },
    // INCOME - Donasi
    { type: 'INCOME', category: 'DONASI', amount: 10000000, description: 'Donasi Hashim Djojohadikusumo untuk bakti sosial', date: '2026-07-15' },
    { type: 'INCOME', category: 'DONASI', amount: 5000000, description: 'Donasi sponsor BUMN untuk program kaderisasi', date: '2026-07-20' },
    { type: 'INCOME', category: 'DONASI', amount: 3000000, description: 'Donasi pengusaha lokal Pontianak untuk sembako', date: '2026-08-12' },
    // INCOME - Lainnya
    { type: 'INCOME', category: 'LAINNYA', amount: 2000000, description: 'Pendapatan merchandising (penjualan pin & lanyard)', date: '2026-07-25' },
    
    // EXPENSE - Sewa
    { type: 'EXPENSE', category: 'SEWA', amount: 1500000, description: 'Sewa sekretariat DPD Kalbar (Juli 2026)', date: '2026-07-01' },
    { type: 'EXPENSE', category: 'SEWA', amount: 1500000, description: 'Sewa sekretariat DPD Kalbar (Agustus 2026)', date: '2026-08-01' },
    { type: 'EXPENSE', category: 'SEWA', amount: 5000000, description: 'Sewa Istora Senayan untuk Halal Bi Halal', date: '2026-08-15' },
    // EXPENSE - Cetak
    { type: 'EXPENSE', category: 'CETAK', amount: 2500000, description: 'Cetak 500 kemeja seragam hitam LAPRA 08', date: '2026-07-18' },
    { type: 'EXPENSE', category: 'CETAK', amount: 750000, description: 'Cetak 200 banner spanduk untuk DPC se-Kalbar', date: '2026-08-03' },
    { type: 'EXPENSE', category: 'CETAK', amount: 1500000, description: 'Cetak 100 plakat penghargaan', date: '2026-07-22' },
    // EXPENSE - Operasional
    { type: 'EXPENSE', category: 'OPERASIONAL', amount: 800000, description: 'Listrik, internet, & ATK sekretariat (Juli 2026)', date: '2026-07-31' },
    { type: 'EXPENSE', category: 'OPERASIONAL', amount: 800000, description: 'Listrik, internet, & ATK sekretariat (Agustus 2026)', date: '2026-08-31' },
    { type: 'EXPENSE', category: 'OPERASIONAL', amount: 5000000, description: 'Konsumsi & akomodasi rapat pleno DPN', date: '2026-08-20' },
    // EXPENSE - Sosial
    { type: 'EXPENSE', category: 'LAINNYA', amount: 3000000, description: 'Pembelian 500 paket sembako untuk bakti sosial', date: '2026-09-10' },
    { type: 'EXPENSE', category: 'LAINNYA', amount: 1000000, description: 'Biaya transporter donor darah PMI', date: '2026-08-25' },
  ]

  let txnCount = 0
  for (const t of transactions) {
    await db.financeTransaction.create({
      data: {
        type: t.type,
        category: t.category,
        amount: t.amount,
        description: t.description,
        transactionDate: new Date(t.date + 'T10:00:00+07:00'),
        territoryId: dpnTerritory.id,
        recordedById: dpnUser.id,
      },
    })
    txnCount++
  }
  console.log(`✅ Inserted ${txnCount} finance transactions`)

  // Summary
  const totalEvents = await db.event.count()
  const totalAssets = await db.asset.count()
  const totalTxns = await db.financeTransaction.count()
  console.log('\n=== FINAL SUMMARY ===')
  console.log(`Total events: ${totalEvents}`)
  console.log(`Total assets: ${totalAssets}`)
  console.log(`Total finance transactions: ${totalTxns}`)
  
  // Finance summary
  const income = await db.financeTransaction.aggregate({ _sum: { amount: true }, where: { type: 'INCOME' } })
  const expense = await db.financeTransaction.aggregate({ _sum: { amount: true }, where: { type: 'EXPENSE' } })
  console.log(`Total income: Rp ${income._sum.amount?.toLocaleString('id-ID')}`)
  console.log(`Total expense: Rp ${expense._sum.amount?.toLocaleString('id-ID')}`)
  console.log(`Balance: Rp ${(income._sum.amount || 0) - (expense._sum.amount || 0)}`)
}

main().catch(e => { console.error(e); process.exit(1) })
.finally(async () => { await db.$disconnect() })
