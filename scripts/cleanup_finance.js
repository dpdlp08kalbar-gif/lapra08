const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
;(async () => {
  // Hapus semua transaksi sample (start from 0)
  const deleted = await prisma.financeTransaction.deleteMany({})
  console.log(`Deleted ${deleted.count} old transactions - system now starts from Rp 0`)
})().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
