import { db } from '@/lib/db'

async function verify() {
  console.log('🔍 VERIFIKASI MASTER TERRITORY DATA\n')
  
  // DPD Domestik
  const dpdDomestic = await db.territory.findMany({
    where: { level: 'PROVINCE', category: 'DOMESTIC' },
    orderBy: { code: 'asc' },
  })
  console.log(`=== DPD DOMESTIK: ${dpdDomestic.length} (target: 38+IKN=39) ===`)
  dpdDomestic.forEach((p, i) => {
    console.log(`  ${String(i+1).padStart(2,'0')}. [${p.code}] ${p.name}`)
  })
  
  // DPD LN
  const dpdLn = await db.territory.findMany({
    where: { level: 'PROVINCE', category: 'INTERNATIONAL' },
  })
  console.log(`\n=== DPD LUAR NEGERI: ${dpdLn.length} ===`)
  dpdLn.forEach((p) => console.log(`  [${p.code}] ${p.name}`))
  
  // DPC per DPD
  console.log('\n=== DPC PER DPD ===')
  for (const dpd of [...dpdDomestic, ...dpdLn]) {
    const dpcCount = await db.territory.count({
      where: { parentId: dpd.id, level: 'REGENCY' },
    })
    if (dpcCount > 0) {
      console.log(`  [${dpd.code}] ${dpd.name}: ${dpcCount} DPC`)
    }
  }
  
  // Cek DPC yang code-nya TIDAK diawali kode DPD parent (VIOLATION)
  const allDpc = await db.territory.findMany({
    where: { level: 'REGENCY' },
    include: { parent: true },
  })
  const violations = allDpc.filter((dpc) => {
    if (!dpc.parent) return true // orphan!
    return !dpc.code.startsWith(dpc.parent.code)
  })
  console.log(`\n=== VIOLATION CHECK ===`)
  console.log(`  Total DPC: ${allDpc.length}`)
  console.log(`  Code format violations: ${violations.length}`)
  violations.forEach((v) => {
    console.log(`    ❌ [${v.code}] ${v.name} — parent: ${v.parent?.code || 'NONE'} (${v.parent?.name || 'ORPHAN'})`)
  })
  
  // Cek unique name within same DPD
  const nameCheck: Record<string, string[]> = {}
  for (const dpc of allDpc) {
    if (dpc.parent) {
      const key = dpc.parent.id
      if (!nameCheck[key]) nameCheck[key] = []
      nameCheck[key].push(dpc.name)
    }
  }
  const duplicates = Object.entries(nameCheck).filter(([_, names]) => {
    const set = new Set(names)
    return set.size < names.length
  })
  console.log(`  Duplicate name within DPD: ${duplicates.length}`)
  if (duplicates.length > 0) {
    duplicates.forEach(([parentId, names]) => {
      const dups = names.filter((n, i) => names.indexOf(n) !== i)
      console.log(`    ❌ DPD ${parentId}: duplicate names: ${dups.join(', ')}`)
    })
  }
  
  await db.$disconnect()
}

verify().catch(console.error)
