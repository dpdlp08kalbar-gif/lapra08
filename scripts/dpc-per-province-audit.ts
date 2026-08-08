import { db } from '@/lib/db'
async function audit() {
  const provinces = await db.territory.findMany({
    where: { level: 'PROVINCE', category: 'DOMESTIC', isActive: true },
    orderBy: { code: 'asc' },
  })
  console.log('📊 DPC PER PROVINCE AUDIT\n')
  let total = 0
  const expected: Record<string, number> = {
    '11': 23, '12': 33, '13': 19, '14': 12, '15': 11, '16': 17, '17': 10, '18': 15,
    '19': 7, '21': 7, '31': 6, '32': 27, '33': 35, '34': 5, '35': 38, '36': 8,
    '51': 9, '52': 10, '53': 22, '61': 14, '62': 14, '63': 13, '64': 10, '65': 5,
    '71': 15, '72': 13, '73': 24, '74': 17, '75': 6, '76': 6, '81': 11, '82': 10,
    '91': 9, '92': 7, '93': 4, '94': 8, '95': 8, '96': 6,
  }
  let mismatches = 0
  for (const p of provinces) {
    const count = await db.territory.count({ where: { parentId: p.id, level: 'REGENCY' } })
    const exp = expected[p.code] || 0
    const status = count === exp ? '✅' : '❌'
    if (count !== exp) {
      console.log(`  ${status} [${p.code}] ${p.name}: ${count} DPC (expected: ${exp})`)
      mismatches++
    }
    total += count
  }
  console.log(`\n${'='.repeat(50)}`)
  console.log(`Total DPC: ${total} (target: 514)`)
  console.log(`Mismatches: ${mismatches}`)
  if (mismatches === 0) console.log('✅ ALL DPC COUNTS MATCH EXPECTED')
  else console.log('❌ SOME PROVINCES HAVE MISMATCHED DPC COUNTS')
  
  // Also check IKN
  const ikn = await db.territory.findFirst({ where: { code: 'IKN', level: 'PROVINCE' } })
  if (ikn) {
    const iknDpc = await db.territory.count({ where: { parentId: ikn.id, level: 'REGENCY' } })
    console.log(`\nIKN DPC count: ${iknDpc} (IKN is special - may have 0 or custom DPC)`)
  }
  
  await db.$disconnect()
}
audit().catch(console.error)
