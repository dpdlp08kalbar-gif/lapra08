// LAPRA 08 - Seed kontak WhatsApp untuk testing broadcast engine
// Buat 50 kontak sample dengan distribusi per wilayah + demografi
import { db } from '../src/lib/db'

async function main() {
  console.log('=== Seed WhatsApp Contacts untuk Testing Broadcast Engine ===\n')

  // Cek existing contacts
  const existing = await db.contact.count()
  if (existing > 0) {
    console.log(`Sudah ada ${existing} kontak. Skip seed.`)
    return
  }

  // Get some territories (provinces + regencies)
  const provinces = await db.territory.findMany({
    where: { level: 'PROVINCE' },
    select: { id: true, code: true, name: true },
    take: 10, // sample 10 provinces
  })

  const regencies = await db.territory.findMany({
    where: { level: 'REGENCY' },
    select: { id: true, code: true, name: true, parentId: true },
    take: 30, // sample 30 regencies
  })

  // Sample Indonesian names per occupation
  const sampleNames = {
    PETANI: ['Budi Santoso', 'Sukirman', 'Wahyudi', 'Sutrisno', 'Joko Widodo', 'Slamet Riyadi', 'Parmin', 'Sukarno'],
    NELAYAN: ['Arief Budiman', 'Hadi Pranoto', 'Bambang Sutrisno', 'Iwan Setiawan', 'Rudi Hartono'],
    UMKM: ['Siti Aminah', 'Dewi Lestari', 'Rina Wijaya', 'Maya Sari', 'Yuni Astuti', 'Lina Marlina'],
    PELAJAR: ['Ahmad Fauzan', 'Rizki Ramadhan', 'Fajar Nugroho', 'Dimas Anggara', 'Rangga Saputra'],
    GURU: ['Drs. Sutrisno, M.Pd', 'Siti Khodijah, S.Pd', 'Bambang Wijaya, M.Si', 'Hj. Nur Aini, S.Pd'],
    BURUH: ['Sumarni', 'Parto', 'Kasmini', 'Tukiman', 'Sumardi'],
    LAINNYA: ['Hendra Wijaya', 'Budi Hartono', 'Andi Suryadi', 'Maya Anggraini', 'Rina Marlina'],
  }

  const ageGroups = ['17-21', '22-30', '31-40', '41-60', '61+']
  const genders = ['L', 'P']
  const occupations = Object.keys(sampleNames)

  let createdCount = 0

  // Distribute contacts across provinces (5 per province)
  for (const prov of provinces) {
    const regenciesInProv = regencies.filter(r => r.parentId === prov.id)
    for (let i = 0; i < 5; i++) {
      const occupation = occupations[i % occupations.length]
      const nameList = sampleNames[occupation as keyof typeof sampleNames]
      const name = nameList[i % nameList.length]
      const ageGroup = ageGroups[i % ageGroups.length]
      const gender = i % 2 === 0 ? 'L' : 'P'

      // Generate phone number (62 prefix + 8XX XXXX XXXX)
      const phoneSuffix = Math.floor(100000000 + Math.random() * 900000000)
      const phone = `62812${phoneSuffix.toString().substring(0, 8)}`

      // Assign regency (round-robin in province)
      const regency = regenciesInProv.length > 0 ? regenciesInProv[i % regenciesInProv.length] : null

      try {
        await db.contact.create({
          data: {
            name,
            phone,
            email: null,
            whatsappOptIn: true,
            optInDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
            optInSource: 'FORM_REGISTRATION',
            ageGroup,
            gender,
            occupation,
            religion: 'ISLAM',
            path: `/data/contacts/${prov.code}/${regency?.code || 'NA'}`,
            countryCode: 'ID',
            provinceCode: prov.code,
            regencyCode: regency?.code || null,
            territoryId: regency?.id || prov.id,
            tags: JSON.stringify([occupation, ageGroup, 'WA_OPT_IN']),
            isActive: true,
            isVerified: Math.random() > 0.3,
            verifiedAt: Math.random() > 0.3 ? new Date() : null,
            source: 'MANUAL',
          },
        })
        createdCount++
      } catch (e: any) {
        // Skip if duplicate phone
        if (!e.message.includes('Unique constraint')) console.error(e.message)
      }
    }
  }

  // Also create some national-level contacts (DPN members)
  const dpnTerritory = await db.territory.findFirst({ where: { code: 'ID' } })
  if (dpnTerritory) {
    for (let i = 0; i < 10; i++) {
      const occupation = occupations[i % occupations.length]
      const nameList = sampleNames[occupation as keyof typeof sampleNames]
      const name = `DPN ${nameList[i % nameList.length]}`
      const phone = `62813${Math.floor(10000000 + Math.random() * 90000000)}`
      try {
        await db.contact.create({
          data: {
            name,
            phone,
            whatsappOptIn: true,
            optInDate: new Date(),
            optInSource: 'DPN_REGISTRATION',
            ageGroup: ageGroups[i % ageGroups.length],
            gender: i % 2 === 0 ? 'L' : 'P',
            occupation,
            religion: 'ISLAM',
            path: '/data/contacts/ID',
            countryCode: 'ID',
            territoryId: dpnTerritory.id,
            tags: JSON.stringify([occupation, 'DPN', 'WA_OPT_IN']),
            isActive: true,
            isVerified: true,
            verifiedAt: new Date(),
            source: 'DPN',
          },
        })
        createdCount++
      } catch (e: any) { /* skip duplicate */ }
    }
  }

  // Final summary
  const total = await db.contact.count()
  const optIn = await db.contact.count({ where: { whatsappOptIn: true } })
  const byOccupation = await db.contact.groupBy({ by: ['occupation'], _count: { _all: true } })
  console.log(`✓ Created ${createdCount} contacts`)
  console.log(`  Total in DB: ${total}, WA opt-in: ${optIn}`)
  console.log('\nBy occupation:')
  byOccupation.forEach(o => console.log(`  - ${o.occupation}: ${o._count._all}`))

  // By province
  const byProvince = await db.contact.groupBy({ by: ['provinceCode'], _count: { _all: true } })
  console.log('\nBy province:')
  byProvince.forEach(p => console.log(`  - ${p.provinceCode}: ${p._count._all} contacts`))
}

main().catch(e => { console.error(e); process.exit(1) })
.finally(async () => { await db.$disconnect() })
