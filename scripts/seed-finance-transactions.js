// LAPRA 08 - Seed Finance Transactions (Kas & Keuangan) ke Neon PostgreSQL
// Run: DATABASE_URL=<neon_url> node scripts/seed-finance-transactions.js
const { PrismaClient } = require('@prisma/client');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL || !DATABASE_URL.startsWith('postgresql://')) {
  console.error('❌ DATABASE_URL harus PostgreSQL (Neon). Set env var DATABASE_URL terlebih dahulu.');
  process.exit(1);
}

const prisma = new PrismaClient();

// ============================================================
// Data transaksi keuangan contoh
// - Menggunakan territory & user yang sudah ada di DB
// - Rentang tanggal: Januari - Agustus 2026
// - Kategori: IURAN, DONASI, SEWA, CETAK, OPERASIONAL, LAINNYA
// ============================================================

const transactions = [
  // ===== DPN (Pusat Nasional) =====
  { type: 'INCOME',  category: 'IURAN',      amount: 150000000, description: 'Iuran bulanan DPN dari 38 DPD se-Indonesia (Januari 2026)', date: '2026-01-15' },
  { type: 'INCOME',  category: 'DONASI',    amount: 50000000,  description: 'Donasi grant dari Kementerian Sosial RI untuk program pemberdayaan anggota', date: '2026-01-25' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 25000000, description: 'Sewa kantor sekretariat DPN Jakarta - Q1 2026', date: '2026-01-31' },
  { type: 'EXPENSE', category: 'CETAK',     amount: 45000000,  description: 'Cetak KTA (Kartu Tanda Anggota) batch 5.000 anggota baru se-Indonesia', date: '2026-02-05' },
  { type: 'INCOME',  category: 'IURAN',      amount: 152000000, description: 'Iuran bulanan DPN dari 38 DPD + 5 LN (Februari 2026)', date: '2026-02-15' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 18750000, description: 'Gaji & honor staff sekretariat DPN bulan Februari 2026', date: '2026-02-28' },
  { type: 'INCOME',  category: 'DONASI',    amount: 75000000,  description: 'Donasi sponsor dari BUMN untuk Rakernas LAPRA 08 2026', date: '2026-03-10' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 32000000, description: 'Biaya Rakernas DPN - sewa gedung + konsumsi 250 peserta', date: '2026-03-20' },
  { type: 'INCOME',  category: 'IURAN',      amount: 155000000, description: 'Iuran bulanan DPN dari 38 DPD + 5 LN (Maret 2026)', date: '2026-03-15' },
  { type: 'EXPENSE', category: 'LAINNYA',   amount: 12500000,  description: 'Pembelian server cloud & domain www.lapra08.id (perpanjangan 2 tahun)', date: '2026-04-02' },
  { type: 'INCOME',  category: 'IURAN',      amount: 155000000, description: 'Iuran bulanan DPN April 2026', date: '2026-04-15' },
  { type: 'EXPENSE', category: 'CETAK',     amount: 30000000,  description: 'Cetak buku AD/ART revisi 2026 (1.500 eksemplar) untuk distribusi DPD/DPC', date: '2026-04-22' },
  { type: 'INCOME',  category: 'DONASI',    amount: 35000000,  description: 'Donasi anggota alumni untuk beasiswa pendidikan anak anggota', date: '2026-05-12' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 28500000, description: 'Biaya pelatihan AI & teknologi untuk admin DPD se-Indonesia (online)', date: '2026-05-18' },
  { type: 'INCOME',  category: 'IURAN',      amount: 158000000, description: 'Iuran bulanan DPN Mei 2026', date: '2026-05-15' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 19000000, description: 'Honorarium tim IT & developer sistem informasi LAPRA 08', date: '2026-06-10' },
  { type: 'INCOME',  category: 'IURAN',      amount: 160000000, description: 'Iuran bulanan DPN Juni 2026', date: '2026-06-15' },
  { type: 'EXPENSE', category: 'LAINNYA',   amount: 8500000,   description: 'Pembelian atribut logo LAPRA 08 (banner, umbul-umbul, stiker) untuk DPD/DPC', date: '2026-06-25' },
  { type: 'INCOME',  category: 'DONASI',    amount: 60000000,  description: 'Donasi corporate CSR untuk program aksi sosial LAPRA 08', date: '2026-07-08' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 35000000, description: 'Bantuan sosial korban bencana alam - penyaluran ke DPD NTT & Sulsel', date: '2026-07-15' },
  { type: 'INCOME',  category: 'IURAN',      amount: 162000000, description: 'Iuran bulanan DPN Juli 2026', date: '2026-07-15' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 22000000, description: 'Kontrak platform broadcast WhatsApp Fonnte untuk seluruh DPD/DPC', date: '2026-08-01' },
  { type: 'INCOME',  category: 'IURAN',      amount: 165000000, description: 'Iuran bulanan DPN Agustus 2026', date: '2026-08-12' },

  // ===== DPD Kalimantan Barat =====
  { type: 'INCOME',  category: 'IURAN',      amount: 12500000, description: 'Iuran bulanan DPD Kalbar dari 14 DPC (Januari 2026)', date: '2026-01-20', provHint: 'Kalimantan Barat' },
  { type: 'INCOME',  category: 'DONASI',    amount: 8500000,  description: 'Donasi pengusaha lokal Pontianak untuk kegiatan DPD Kalbar', date: '2026-02-10', provHint: 'Kalimantan Barat' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 3500000, description: 'Sewa sekretariat DPD Kalbar Pontianak Q1 2026', date: '2026-01-31', provHint: 'Kalimantan Barat' },
  { type: 'EXPENSE', category: 'CETAK',     amount: 4200000,  description: 'Cetak KTA anggota baru DPC Pontianak & Kubu Raya (250 anggota)', date: '2026-02-15', provHint: 'Kalimantan Barat' },
  { type: 'INCOME',  category: 'IURAN',      amount: 13000000, description: 'Iuran bulanan DPD Kalbar Februari 2026', date: '2026-02-20', provHint: 'Kalimantan Barat' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 2800000, description: 'Konsumsi rapat koordinasi DPC se-Kalbar (50 peserta)', date: '2026-03-05', provHint: 'Kalimantan Barat' },
  { type: 'INCOME',  category: 'IURAN',      amount: 13200000, description: 'Iuran bulanan DPD Kalbar Maret 2026', date: '2026-03-20', provHint: 'Kalimantan Barat' },
  { type: 'EXPENSE', category: 'LAINNYA',   amount: 1800000, description: 'Pembelian komputer & printer untuk sekretariat DPD Kalbar', date: '2026-04-10', provHint: 'Kalimantan Barat' },
  { type: 'INCOME',  category: 'IURAN',      amount: 13400000, description: 'Iuran bulanan DPD Kalbar April 2026', date: '2026-04-20', provHint: 'Kalimantan Barat' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 5500000, description: 'Biaya pelatihan kader DPC se-Kalbar di Sanggau (120 peserta, 2 hari)', date: '2026-05-22', provHint: 'Kalimantan Barat' },
  { type: 'INCOME',  category: 'IURAN',      amount: 13600000, description: 'Iuran bulanan DPD Kalbar Mei 2026', date: '2026-05-20', provHint: 'Kalimantan Barat' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 2200000, description: 'Gaji & honor staff sekretariat DPD Kalbar Q2 2026', date: '2026-06-30', provHint: 'Kalimantan Barat' },
  { type: 'INCOME',  category: 'DONASI',    amount: 15000000, description: 'Donasi CSR PT Kallista Group untuk program aksi sosial LAPRA 08 Kalbar', date: '2026-07-12', provHint: 'Kalimantan Barat' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 8000000, description: 'Bantuan sosial korban banjir Sintang & Melawi (200 KK)', date: '2026-07-20', provHint: 'Kalimantan Barat' },
  { type: 'INCOME',  category: 'IURAN',      amount: 14000000, description: 'Iuran bulanan DPD Kalbar Juli 2026', date: '2026-07-20', provHint: 'Kalimantan Barat' },

  // ===== DPC Pontianak Kota (6171) =====
  { type: 'INCOME',  category: 'IURAN',      amount: 2500000,  description: 'Iuran bulanan DPC Pontianak Kota dari 325 anggota (Januari 2026)', date: '2026-01-18', regHint: '6171' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 1200000, description: 'Sewa sekretariat DPC Pontianak Kota Januari 2026', date: '2026-01-31', regHint: '6171' },
  { type: 'INCOME',  category: 'DONASI',    amount: 3500000,  description: 'Donasi alumni anggota untuk kegiatan bakti sosial DPC Pontianak', date: '2026-02-05', regHint: '6171' },
  { type: 'EXPENSE', category: 'CETAK',     amount: 1850000,  description: 'Cetak KTA 75 anggota baru DPC Pontianak Kota', date: '2026-02-20', regHint: '6171' },
  { type: 'INCOME',  category: 'IURAN',      amount: 2600000,  description: 'Iuran bulanan Februari 2026 DPC Pontianak Kota', date: '2026-02-18', regHint: '6171' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 1500000, description: 'Bakti sosial donor darah & pengobatan gratis di 4 kelurahan Pontianak Kota', date: '2026-03-15', regHint: '6171' },
  { type: 'INCOME',  category: 'IURAN',      amount: 2650000,  description: 'Iuran bulanan Maret 2026 DPC Pontianak Kota', date: '2026-03-18', regHint: '6171' },
  { type: 'EXPENSE', category: 'LAINNYA',   amount: 850000,   description: 'Pembelian meja kursi & lemari arsip sekretariat DPC', date: '2026-04-12', regHint: '6171' },
  { type: 'INCOME',  category: 'IURAN',      amount: 2700000,  description: 'Iuran bulanan April 2026 DPC Pontianak Kota', date: '2026-04-18', regHint: '6171' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 1200000, description: 'Konsumsi rapat pleno DPC Pontianak Kota (35 pengurus)', date: '2026-05-10', regHint: '6171' },
  { type: 'INCOME',  category: 'DONASI',    amount: 5000000,  description: 'Donasi tokoh masyarakat Pontianak untuk HUT LAPRA 08 ke-15', date: '2026-06-15', regHint: '6171' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 3500000, description: 'Perayaan HUT LAPRA 08 - panggung, konsumsi, atribut 200 peserta', date: '2026-06-25', regHint: '6171' },
  { type: 'INCOME',  category: 'IURAN',      amount: 2800000,  description: 'Iuran bulanan Juli 2026 DPC Pontianak Kota', date: '2026-07-18', regHint: '6171' },
  { type: 'EXPENSE', category: 'OPERASIONAL', amount: 950000, description: 'Santunan anak yatim & dhuafa Pontianak Kota (50 anak)', date: '2026-07-30', regHint: '6171' },
  { type: 'INCOME',  category: 'IURAN',      amount: 2850000,  description: 'Iuran bulanan Agustus 2026 DPC Pontianak Kota', date: '2026-08-12', regHint: '6171' },
];

(async () => {
  try {
    console.log('🔌 Connecting to Neon PostgreSQL...');
    console.log('📍 DATABASE_URL:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

    // 1. Get all territories (DPN, DPD by province name, DPC by regency code)
    const territories = await prisma.territory.findMany({ select: { id: true, name: true, code: true, level: true } });
    console.log(`📍 Found ${territories.length} territories`);

    const dpn = territories.find(t => t.level === 'COUNTRY' || t.code === 'ID' || t.name === 'Indonesia' || t.level === 'DPN')
              || territories.find(t => t.level === 'COUNTRY');
    // Fallback - cari territory pertama yang levelnya paling atas
    const dpnTerr = dpn || territories.find(t => t.level === 'PROVINCE' && t.code === '00') || territories[0];
    console.log(`   DPN territory: ${dpnTerr?.name} (${dpnTerr?.code})`);

    // 2. Get superadmin user
    const superadmin = await prisma.user.findFirst({ where: { username: 'superadmin' } });
    if (!superadmin) throw new Error('Superadmin user tidak ditemukan');
    console.log(`👤 Recorded by: ${superadmin.username} (${superadmin.id})`);

    // 3. Resolve territory untuk tiap transaksi
    let created = 0;
    let skipped = 0;
    for (const tx of transactions) {
      let territoryId = dpnTerr.id; // default DPN

      if (tx.provHint) {
        const prov = territories.find(t => t.level === 'PROVINCE' && t.name.toLowerCase().includes(tx.provHint.toLowerCase()));
        if (!prov) { console.warn(`  ⚠ Skip: territory tidak ditemukan untuk prov "${tx.provHint}"`); skipped++; continue; }
        territoryId = prov.id;
      } else if (tx.regHint) {
        const reg = territories.find(t => t.code === tx.regHint);
        if (!reg) { console.warn(`  ⚠ Skip: territory tidak ditemukan untuk code "${tx.regHint}"`); skipped++; continue; }
        territoryId = reg.id;
      }

      // Cek apakah transaksi dengan deskripsi sama sudah ada (idempotent)
      const existing = await prisma.financeTransaction.findFirst({
        where: { description: tx.description, transactionDate: new Date(tx.date) },
      });
      if (existing) { skipped++; continue; }

      await prisma.financeTransaction.create({
        data: {
          type: tx.type,
          category: tx.category,
          amount: tx.amount,
          description: tx.description,
          transactionDate: new Date(tx.date),
          territoryId,
          recordedById: superadmin.id,
        },
      });
      created++;
    }

    console.log(`\n✅ Seed selesai!`);
    console.log(`   ${created} transaksi dibuat`);
    console.log(`   ${skipped} transaksi di-skip (sudah ada / territory tidak ditemukan)`);

    // Summary
    const all = await prisma.financeTransaction.findMany({ select: { type: true, amount: true } });
    const income = all.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = all.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    console.log(`\n📊 Total di DB:`);
    console.log(`   Pemasukan:  Rp ${income.toLocaleString('id-ID')}`);
    console.log(`   Pengeluaran: Rp ${expense.toLocaleString('id-ID')}`);
    console.log(`   Saldo:      Rp ${(income - expense).toLocaleString('id-ID')}`);
    console.log(`   Total transaksi: ${all.length}`);

  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
