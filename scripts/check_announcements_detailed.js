const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
;(async () => {
  const anns = await prisma.announcement.findMany({
    select: { id: true, title: true, source: true, sourceName: true, sourceUrl: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  })
  console.log(`Total: ${anns.length}`)
  console.log('--- All announcements ---')
  anns.forEach((a, i) => {
    console.log(`${i+1}. [${a.source}] ${a.title.substring(0, 90)}`)
    if (a.sourceUrl) console.log(`   URL: ${a.sourceUrl}`)
  })
  // Check if majalahreformasi URLs are there
  const majalah = anns.filter(a => a.sourceUrl?.includes('majalahreformasi'))
  console.log(`\n--- Majalahreformasi URLs found: ${majalah.length} ---`)
  majalah.forEach(m => console.log(`- ${m.title}`))
})().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
