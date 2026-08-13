// LAPRA 08 - HAPUS data fiktif FinanceTransaction
// Run: DATABASE_URL=<neon> node scripts/cleanup-fictive-finance.js
const { PrismaClient } = require('@prisma/client');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL || !DATABASE_URL.startsWith('postgresql://')) {
  console.error('❌ DATABASE_URL harus PostgreSQL (Neon).');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

(async () => {
  try {
    const before = await prisma.financeTransaction.count();
    console.log(`📊 FinanceTransaction sebelum: ${before} rows`);

    // Hapus SEMUA transaksi yang dibuat oleh superadmin pada 12 Agustus 2026
    // (yg di-seed oleh scripts/seed-finance-transactions.js — semua fiktif)
    const deleted = await prisma.financeTransaction.deleteMany({});
    console.log(`🗑️ Dihapus: ${deleted.count} transaksi fiktif`);

    const after = await prisma.financeTransaction.count();
    console.log(`📊 FinanceTransaction setelah: ${after} rows`);

    // Verify
    const income = await prisma.financeTransaction.aggregate({ _sum: { amount: true }, where: { type: 'INCOME' } });
    const expense = await prisma.financeTransaction.aggregate({ _sum: { amount: true }, where: { type: 'EXPENSE' } });
    console.log(`   Pemasukan: Rp ${(income._sum.amount || 0).toLocaleString('id-ID')}`);
    console.log(`   Pengeluaran: Rp ${(expense._sum.amount || 0).toLocaleString('id-ID')}`);
    console.log(`   Saldo: Rp ${((income._sum.amount || 0) - (expense._sum.amount || 0)).toLocaleString('id-ID')}`);

    console.log('\n✅ Cleanup selesai. Menu Kas & Keuangan sekarang KOSONG (seharusnya).');
    console.log('   Transaksi hanya akan muncul setelah input real oleh admin DPN/DPD/DPC.');
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
