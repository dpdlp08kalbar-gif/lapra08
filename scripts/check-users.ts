import { db } from '@/lib/db'
async function check() {
  const users = await db.user.findMany({ select: { username: true, role: true, territory: { select: { name: true, level: true, code: true } } } })
  console.log('Users in DB:')
  users.forEach(u => console.log(`  ${u.username} (${u.role}) - ${u.territory.name} [${u.territory.level}]`))
  await db.$disconnect()
}
check()
