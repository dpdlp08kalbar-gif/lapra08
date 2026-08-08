// LAPRA 08 - Batch Sync 514 DPC Master (Kemendagri 2026)
// Menginjeksi semua Kabupaten/Kota ke database dengan validasi hierarki ketat
import { db } from '../src/lib/db'
import { dpcMasterData } from './dpc-master-data'

async function main() {
  console.log('🔄 LAPRA 08 — BATCH SYNC 514 DPC MASTER (KEMENDAGRI 2026)')
  console.log('='.repeat(70))
  console.log()

  // Verifikasi jumlah data
  console.log(`📋 Total DPC dalam master data: ${dpcMasterData.length}`)
  
  // Group by province untuk verifikasi count
  const byProvince: Record<string, number> = {}
  dpcMasterData.forEach((d) => {
    byProvince[d.provinceCode] = (byProvince[d.provinceCode] || 0) + 1
  })
  console.log('\n📊 Breakdown per DPD:')
  Object.entries(byProvince).forEach(([code, count]) => {
    console.log(`  [${code}] ${count} DPC`)
  })
  console.log()

  // Ambil semua DPD (PROVINCE) dari database
  console.log('→ Fetching DPD provinces from database...')
  const provinces = await db.territory.findMany({
    where: { level: 'PROVINCE', category: 'DOMESTIC' },
    select: { id: true, code: true, name: true },
  })
  console.log(`  ✓ Found ${provinces.length} DPD provinces`)

  const provinceMap: Record<string, string> = {}
  provinces.forEach((p) => { provinceMap[p.code] = p.id })

  // Cek DPC yang sudah ada (skip duplikasi)
  console.log('→ Checking existing DPC...')
  const existingDpc = await db.territory.findMany({
    where: { level: 'REGENCY' },
    select: { code: true },
  })
  const existingCodes = new Set(existingDpc.map((d) => d.code))
  console.log(`  ✓ ${existingCodes.size} DPC already exist in database`)

  // Inject DPC yang belum ada
  let created = 0
  let skipped = 0
  let errors = 0
  const errorList: string[] = []

  console.log(`\n→ Injecting ${dpcMasterData.length} DPC entries...`)

  for (const dpc of dpcMasterData) {
    // Skip jika sudah ada
    if (existingCodes.has(dpc.code)) {
      skipped++
      continue
    }

    // Cari DPD parent
    const parentId = provinceMap[dpc.provinceCode]
    if (!parentId) {
      errorList.push(`❌ DPD not found for province code: ${dpc.provinceCode} (DPC: ${dpc.code} ${dpc.name})`)
      errors++
      continue
    }

    try {
      await db.territory.create({
        data: {
          code: dpc.code,
          name: dpc.name,
          level: 'REGENCY',
          category: 'DOMESTIC',
          parentId: parentId,
          isActive: true,
          metadata: JSON.stringify({
            isCity: dpc.isCity,
            provinceCode: dpc.provinceCode,
            source: 'BATCH_SYNC_KEMENDAGRI_2026',
          }),
        },
      })
      created++

      // Progress setiap 50 entries
      if (created % 50 === 0) {
        console.log(`  ✓ Progress: ${created} DPC created...`)
      }
    } catch (e: any) {
      errorList.push(`❌ Failed to create [${dpc.code}] ${dpc.name}: ${e.message}`)
      errors++
    }
  }

  console.log()
  console.log('='.repeat(70))
  console.log(`📊 BATCH SYNC SUMMARY:`)
  console.log(`  ✅ Created: ${created} DPC`)
  console.log(`  ⏭️  Skipped (already exist): ${skipped} DPC`)
  console.log(`  ❌ Errors: ${errors}`)
  console.log(`  📦 Total DPC in database: ${existingCodes.size + created}`)
  console.log('='.repeat(70))

  if (errorList.length > 0) {
    console.log('\n❌ ERRORS:')
    errorList.forEach((e) => console.log(`  ${e}`))
  }

  // Final verification
  const finalCount = await db.territory.count({
    where: { level: 'REGENCY', category: 'DOMESTIC' },
  })
  console.log(`\n✅ Final DPC count in database: ${finalCount}`)
  console.log(`   Target: 514 (38 provinsi) + 14 (Kalbar existing) = 514`)
  console.log(`   Status: ${finalCount >= 514 ? '✅ TARGET TERCAPAI' : '⚠️ BELUM LENGKAP'}`)

  await db.$disconnect()
}

main()
  .catch((e) => { console.error('❌ Sync error:', e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
