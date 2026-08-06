import { db } from '@/lib/db'
async function cleanup() {
  const deleted = await db.member.deleteMany({
    where: { fullName: { contains: 'Test' } }
  })
  console.log(`Deleted ${deleted.count} test members`)
  await db.$disconnect()
}
cleanup()
