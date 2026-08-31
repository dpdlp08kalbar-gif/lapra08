const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
;(async () => {
  // Get DPD Kalbar
  const kalbar = await prisma.territory.findFirst({ where: { code: '61', level: 'PROVINCE' } })
  // Check current DPD Kalbar pengurus
  const all = await prisma.orgPosition.findMany({
    where: { territoryId: kalbar.id, level: 'DPD' },
    select: { id: true, fullName: true, positionName: true, source: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  })
  console.log(`Total DPD Kalbar pengurus: ${all.length}`)
  console.log('--- Latest 5 (newly added): ---')
  all.slice(0, 5).forEach(p => console.log(`- [${p.source}] ${p.positionName}: ${p.fullName}`))
  console.log('--- Oldest 5 (seed?): ---')
  all.slice(-5).forEach(p => console.log(`- [${p.source}] ${p.positionName}: ${p.fullName} | created=${p.createdAt.toISOString()}`))
  // Delete pengurus with source=MANUAL (seed data, replaced by OCR_EXTRACT)
  const deleted = await prisma.orgPosition.deleteMany({
    where: { territoryId: kalbar.id, level: 'DPD', source: 'MANUAL' }
  })
  console.log(`\nDeleted ${deleted.count} old MANUAL pengurus`)
  const remain = await prisma.orgPosition.count({ where: { territoryId: kalbar.id, level: 'DPD' } })
  console.log(`Remaining pengurus: ${remain}`)
})().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
