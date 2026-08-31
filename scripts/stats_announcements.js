const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
;(async () => {
  const total = await prisma.announcement.count()
  const webSync = await prisma.announcement.count({ where: { source: 'WEB_SYNC' } })
  const manual = await prisma.announcement.count({ where: { source: 'MANUAL' } })
  console.log(`Total: ${total} | WEB_SYNC: ${webSync} | MANUAL: ${manual}`)
  
  // By source
  const all = await prisma.announcement.findMany({
    where: { source: 'WEB_SYNC' },
    select: { sourceName: true }
  })
  const counts = {}
  all.forEach(a => { counts[a.sourceName] = (counts[a.sourceName] || 0) + 1 })
  console.log('\n=== Sources (sorted) ===')
  Object.entries(counts).sort((a,b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v} - ${k}`))
})().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
