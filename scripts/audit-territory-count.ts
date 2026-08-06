import { db } from '@/lib/db'

async function audit() {
  console.log('📊 AUDIT WILAYAH LAPRA 08\n')
  console.log('='.repeat(60))
  
  // Count per level
  const countries = await db.territory.count({ where: { level: 'COUNTRY' } })
  const coordinators = await db.territory.count({ where: { level: 'COORDINATOR' } })
  const provinces = await db.territory.count({ where: { level: 'PROVINCE' } })
  const coordDpd = await db.territory.count({ where: { level: 'COORD_DPD' } })
  const regencies = await db.territory.count({ where: { level: 'REGENCY' } })
  
  // Domestic vs International
  const domesticTotal = await db.territory.count({ where: { category: 'DOMESTIC' } })
  const intlTotal = await db.territory.count({ where: { category: 'INTERNATIONAL' } })
  
  // Domestic provinces only
  const domesticProvinces = await db.territory.findMany({
    where: { level: 'PROVINCE', category: 'DOMESTIC' },
    select: { code: true, name: true },
    orderBy: { code: 'asc' }
  })
  const intlProvinces = await db.territory.findMany({
    where: { level: 'PROVINCE', category: 'INTERNATIONAL' },
    select: { code: true, name: true }
  })

  console.log('\n📋 BREAKDOWN PER LEVEL:')
  console.log(`  COUNTRY (Negara/DPN):    ${countries}`)
  console.log(`  COORDINATOR (Koorwil):   ${coordinators}`)
  console.log(`  PROVINCE (DPD):          ${provinces}`)
  console.log(`    - Domestik:            ${domesticProvinces.length}`)
  console.log(`    - Internasional:       ${intlProvinces.length}`)
  console.log(`  COORD_DPD (Koor DPD):    ${coordDpd}`)
  console.log(`  REGENCY (DPC):           ${regencies}`)
  
  console.log('\n🌍 TOTAL WILAYAH:')
  console.log(`  Domestik:    ${domesticTotal}`)
  console.log(`  Internasional: ${intlTotal}`)
  console.log(`  GRAND TOTAL: ${domesticTotal + intlTotal}`)
  
  console.log('\n📋 DAFTAR PROVINSI DOMESTIK (target: 38):')
  domesticProvinces.forEach((p, i) => {
    console.log(`  ${String(i+1).padStart(2,'0')}. [${p.code}] ${p.name}`)
  })
  
  console.log(`\n✅ Total provinsi domestik: ${domesticProvinces.length}`)
  console.log(`   Target nasional: 38 provinsi (termasuk 4 DOB Papua baru)`)
  console.log(`   Status: ${domesticProvinces.length === 38 ? '✅ SESUAI' : domesticProvinces.length > 38 ? '⚠️  LEBIH' : '❌ KURANG'}`)
  
  await db.$disconnect()
}

audit().catch(console.error)
