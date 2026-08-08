import { db } from '@/lib/db'
async function cleanup() {
  const deleted = await db.territory.deleteMany({
    where: { code: { in: ['6199', '6198', '0000'] } }
  })
  console.log(`Deleted ${deleted.count} test territories`)
  await db.$disconnect()
}
cleanup()
