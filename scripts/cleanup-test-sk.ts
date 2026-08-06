import { db } from '@/lib/db'
async function cleanup() {
  const deleted = await db.sKDocument.deleteMany({ where: { title: { contains: 'Test' } } })
  console.log(`Deleted ${deleted.count} test SK docs`)
  await db.$disconnect()
}
cleanup()
