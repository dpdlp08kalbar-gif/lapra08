const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
;(async () => {
  // Delete all old sekretariat data (will be re-seeded with correct DPN East Tower)
  const deleted = await prisma.systemSetting.deleteMany({ where: { category: 'SEKRETARIAT' } })
  console.log(`Deleted ${deleted.count} old sekretariat locations`)
})().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
