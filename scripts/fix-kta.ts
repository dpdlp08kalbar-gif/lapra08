import { db } from '@/lib/db'
import { generateMemberNumber } from '@/lib/server-helpers'

async function test() {
  // Delete the test member with wrong KTA
  await db.member.deleteMany({ where: { fullName: 'Test KTA Generator' } })
  await db.member.deleteMany({ where: { fullName: 'Test KTA Generator Via API' } })

  const pontianak = await db.territory.findFirst({ where: { code: '71', level: 'REGENCY' } })
  const sambas = await db.territory.findFirst({ where: { code: '75', level: 'REGENCY' } })
  const losAngeles = await db.territory.findFirst({ where: { code: 'LAX', level: 'REGENCY' } })
  const bengkayang = await db.territory.findFirst({ where: { code: '76', level: 'REGENCY' } })

  console.log('Testing KTA Generator (after fix):')
  console.log('  Pontianak (71):', await generateMemberNumber(pontianak!.id))
  console.log('  Sambas (75):', await generateMemberNumber(sambas!.id))
  console.log('  Bengkayang (76):', await generateMemberNumber(bengkayang!.id))
  console.log('  Los Angeles (LAX):', await generateMemberNumber(losAngeles!.id))

  await db.$disconnect()
}

test().catch(console.error)
