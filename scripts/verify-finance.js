const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});

(async () => {
  const txns = await prisma.financeTransaction.findMany({
    include: { territory: true },
    orderBy: { transactionDate: 'desc' },
    take: 5,
  });
  console.log('=== 5 Transaksi Terbaru ===');
  txns.forEach(t => {
    console.log(`  [${t.type}] ${t.category} - Rp ${t.amount.toLocaleString('id-ID')} - ${t.territory.name}`);
    console.log(`    ${t.description}`);
    console.log(`    Tanggal: ${t.transactionDate.toISOString().slice(0,10)} | Recorded by: ${t.recordedById}`);
  });
  console.log('\n=== Breakdown by Territory ===');
  const all = await prisma.financeTransaction.findMany({ include: { territory: true } });
  const byTerr = {};
  all.forEach(t => {
    const k = t.territory?.name || 'N/A';
    if (!byTerr[k]) byTerr[k] = { count: 0, income: 0, expense: 0 };
    byTerr[k].count++;
    if (t.type === 'INCOME') byTerr[k].income += t.amount;
    else byTerr[k].expense += t.amount;
  });
  Object.entries(byTerr).forEach(([k, v]) => {
    console.log(`  ${k}: ${v.count} txns | In: Rp ${v.income.toLocaleString('id-ID')} | Out: Rp ${v.expense.toLocaleString('id-ID')}`);
  });
  await prisma.$disconnect();
})();
