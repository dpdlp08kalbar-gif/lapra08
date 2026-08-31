const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
;(async () => {
  const targets = [
    'https://majalahreformasi.com/sekretariat-dpn-laskar-prabowo-08-diresmikan-hashim-s-djojohadikusumo-di-east-tower',
    'https://majalahreformasi.com/hashim-laskar-prabowo-08-tak-pernah-kirim-proposal-dan-minta-uang',
  ]
  for (const url of targets) {
    const found = await prisma.announcement.findFirst({ where: { sourceUrl: url } })
    console.log(`\n${found ? '✅ FOUND' : '❌ NOT FOUND'}: ${url.substring(0, 80)}...`)
    if (found) console.log(`   Title: ${found.title}\n   Source: ${found.sourceName}\n   Created: ${found.createdAt.toISOString()}`)
  }
})().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
