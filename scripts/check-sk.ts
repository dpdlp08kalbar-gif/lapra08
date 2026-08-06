import { db } from '@/lib/db'
async function check() {
  const sk = await db.sKDocument.findMany({ include: { territory: true } })
  console.log(`Total SK: ${sk.length}`)
  sk.forEach(s => console.log(`  ${s.skNumber}: ${s.title} (${s.territory.name}) - OCR: ${s.ocrStatus}`))
  const org = await db.orgPosition.count({ where: { level: 'DPN' } })
  console.log(`DPN positions: ${org}`)
  await db.$disconnect()
}
check()
