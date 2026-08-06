import { db } from '@/lib/db'
import { generateMemberNumber } from '@/lib/server-helpers'

async function test() {
  const pontianak = await db.territory.findFirst({ where: { code: '71', level: 'REGENCY' } })
  const sambas = await db.territory.findFirst({ where: { code: '75', level: 'REGENCY' } })
  const losAngeles = await db.territory.findFirst({ where: { code: 'LAX', level: 'REGENCY' } })

  console.log('Testing KTA Generator:')
  console.log('  Pontianak (71):', await generateMemberNumber(pontianak!.id))
  console.log('  Sambas (75):', await generateMemberNumber(sambas!.id))
  console.log('  Los Angeles (LAX):', await generateMemberNumber(losAngeles!.id))

  // Count existing
  const total = await db.member.count()
  console.log('\nTotal members in DB:', total)

  // Create test member for Pontianak
  const member = await db.member.create({
    data: {
      memberNumber: await generateMemberNumber(pontianak!.id),
      fullName: 'Test KTA Generator',
      nik: '6101710101909999',
      phone: '628999888777',
      shirtSize: 'L',
      gender: 'L',
      territoryId: pontianak!.id,
      status: 'PENDING',
    },
  })
  console.log('\nCreated member:')
  console.log('  Name:', member.fullName)
  console.log('  KTA Number:', member.memberNumber)
  console.log('  Status:', member.status)

  await db.$disconnect()
}

test().catch(console.error)
