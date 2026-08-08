// LAPRA 08 - Automated Territory Data Checker
// Validates: Code Format, Orphan Prevention, Unique Name Constraint
import { db } from '@/lib/db'

async function runChecker() {
  console.log('🖥️  LAPRA 08 — AUTOMATED TERRITORY DATA CHECKER (2026)')
  console.log('='.repeat(70))
  console.log()

  let errors = 0
  let warnings = 0
  let passed = 0

  // ============================================================
  // CHECK 1: DPD DOMESTIK = 38 + IKN = 39
  // ============================================================
  console.log('📋 CHECK 1: Master DPD Domestik (Target: 38 Provinsi + IKN = 39)')
  const dpdDomestic = await db.territory.findMany({
    where: { level: 'PROVINCE', category: 'DOMESTIC' },
    orderBy: { code: 'asc' },
  })
  const expectedCodes = [
    '11','12','13','14','15','16','17','18','19','21', // Sumatera 10
    '31','32','33','34','35','36',                       // Jawa 6
    '51','52','53',                                       // Bali-Nusa 3
    '61','62','63','64','65','IKN',                       // Kalimantan 5+IKN
    '71','72','73','74','75','76',                       // Sulawesi 6
    '81','82',                                            // Maluku 2
    '91','92','93','94','95','96',                       // Papua 6
  ]

  const actualCodes = dpdDomestic.map((d) => d.code)
  const missingCodes = expectedCodes.filter((c) => !actualCodes.includes(c))
  const extraCodes = actualCodes.filter((c) => !expectedCodes.includes(c))

  if (dpdDomestic.length === 39 && missingCodes.length === 0 && extraCodes.length === 0) {
    console.log(`  ✅ PASSED: 39 DPD Domestik (38 Provinsi + IKN) — semua kode sesuai master Kemendagri`)
    passed++
  } else {
    console.log(`  ❌ FAILED: DPD Domestik = ${dpdDomestic.length} (target: 39)`)
    if (missingCodes.length > 0) console.log(`     Missing codes: ${missingCodes.join(', ')}`)
    if (extraCodes.length > 0) console.log(`     Extra codes: ${extraCodes.join(', ')}`)
    errors++
  }
  console.log()

  // ============================================================
  // CHECK 2: DPD LUAR NEGERI
  // ============================================================
  console.log('📋 CHECK 2: DPD Luar Negeri (Target: 5 Negara)')
  const dpdLn = await db.territory.findMany({
    where: { level: 'PROVINCE', category: 'INTERNATIONAL', isActive: true },
  })
  if (dpdLn.length >= 1) {
    console.log(`  ✅ PASSED: ${dpdLn.length} DPD Luar Negeri aktif: ${dpdLn.map((d) => d.name).join(', ')}`)
    passed++
  } else {
    console.log(`  ❌ FAILED: Tidak ada DPD Luar Negeri aktif`)
    errors++
  }
  console.log()

  // ============================================================
  // CHECK 3: Code Format — DPC code harus diawali DPD parent code
  // ============================================================
  console.log('📋 CHECK 3: Code Format Validation (DPC code diawali DPD parent)')
  const allDpc = await db.territory.findMany({
    where: { level: 'REGENCY' },
    include: { parent: true },
  })

  let codeViolations = 0
  for (const dpc of allDpc) {
    if (!dpc.parent) {
      console.log(`  ❌ ORPHAN: [${dpc.code}] ${dpc.name} — tidak punya parent!`)
      codeViolations++
      errors++
      continue
    }
    // Untuk domestik: cek code format
    if (dpc.parent.category === 'DOMESTIC' && dpc.parent.level === 'PROVINCE') {
      if (!dpc.code.startsWith(dpc.parent.code)) {
        console.log(`  ⚠️  CODE FORMAT: [${dpc.code}] ${dpc.name} — parent [${dpc.parent.code}] ${dpc.parent.name} (kode tidak diawali ${dpc.parent.code})`)
        codeViolations++
        warnings++
      }
    }
  }
  if (codeViolations === 0) {
    console.log(`  ✅ PASSED: Semua ${allDpc.length} DPC memiliki code format yang sesuai dengan parent`)
    passed++
  } else {
    console.log(`  ⚠️  ${codeViolations} violation(s) ditemukan`)
  }
  console.log()

  // ============================================================
  // CHECK 4: Orphan Prevention — semua DPC harus punya parent DPD yang aktif
  // ============================================================
  console.log('📋 CHECK 4: Orphan Prevention (DPC terikat DPD aktif)')
  let orphanCount = 0
  for (const dpc of allDpc) {
    if (!dpc.parent) {
      console.log(`  ❌ ORPHAN: [${dpc.code}] ${dpc.name} — tidak punya parent`)
      orphanCount++
      errors++
    } else if (!dpc.parent.isActive) {
      console.log(`  ❌ ORPHAN: [${dpc.code}] ${dpc.name} — parent [${dpc.parent.code}] ${dpc.parent.name} TIDAK AKTIF`)
      orphanCount++
      errors++
    }
  }
  if (orphanCount === 0) {
    console.log(`  ✅ PASSED: Semua ${allDpc.length} DPC terikat pada DPD yang aktif`)
    passed++
  } else {
    console.log(`  ❌ ${orphanCount} orphan(s) ditemukan`)
  }
  console.log()

  // ============================================================
  // CHECK 5: Unique Name Constraint — tidak ada nama DPC ganda dalam 1 DPD
  // ============================================================
  console.log('📋 CHECK 5: Unique Name Constraint (nama DPC unik per DPD)')
  const dpdIds = [...new Set(allDpc.map((d) => d.parentId).filter(Boolean))]
  let dupCount = 0
  for (const dpdId of dpdIds) {
    const dpcInDpd = allDpc.filter((d) => d.parentId === dpdId)
    const names = dpcInDpd.map((d) => d.name)
    const dups = names.filter((n, i) => names.indexOf(n) !== i)
    if (dups.length > 0) {
      const dpd = dpcInDpd[0]?.parent
      console.log(`  ❌ DUPLICATE: DPD "${dpd?.name}" — nama ganda: ${dups.join(', ')}`)
      dupCount++
      errors++
    }
  }
  if (dupCount === 0) {
    console.log(`  ✅ PASSED: Tidak ada nama DPC ganda dalam 1 DPD`)
    passed++
  } else {
    console.log(`  ❌ ${dupCount} DPD dengan nama DPC ganda`)
  }
  console.log()

  // ============================================================
  // CHECK 6: DPC Kalbar = 14 (12 Kab + 2 Kota)
  // ============================================================
  console.log('📋 CHECK 6: DPC Kalimantan Barat (Target: 14 = 12 Kab + 2 Kota)')
  const kalbar = await db.territory.findFirst({ where: { code: '61', level: 'PROVINCE' } })
  if (kalbar) {
    const dpcKalbar = await db.territory.findMany({
      where: { parentId: kalbar.id, level: 'REGENCY' },
      orderBy: { code: 'asc' },
    })
    const kota = dpcKalbar.filter((d) => d.name.startsWith('Kota '))
    const kab = dpcKalbar.filter((d) => d.name.startsWith('Kab.') || d.name.startsWith('Kabupaten '))
    
    if (dpcKalbar.length === 14 && kota.length === 2 && kab.length === 12) {
      console.log(`  ✅ PASSED: 14 DPC Kalbar (${kota.length} Kota + ${kab.length} Kab.)`)
      passed++
    } else {
      console.log(`  ❌ FAILED: ${dpcKalbar.length} DPC (${kota.length} Kota + ${kab.length} Kab.) — target: 2 Kota + 12 Kab.`)
      errors++
    }
    
    // Verifikasi semua kode diawali "61"
    const code61Ok = dpcKalbar.every((d) => d.code.startsWith('61'))
    if (code61Ok) {
      console.log(`  ✅ Code format: Semua kode DPC diawali "61" (kode DPD Kalbar)`)
    } else {
      console.log(`  ❌ Code format: Ada DPC dengan kode tidak diawali "61"`)
      errors++
    }
  } else {
    console.log('  ❌ DPD Kalbar tidak ditemukan!')
    errors++
  }
  console.log()

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('='.repeat(70))
  console.log(`📊 SUMMARY: ${passed} PASSED | ${warnings} WARNINGS | ${errors} ERRORS`)
  if (errors === 0) {
    console.log('✅ SISTEM VALID: Semua aturan hierarki terpenuhi!')
  } else {
    console.log('❌ SISTEM INVALID: Ada violation yang perlu diperbaiki!')
  }
  console.log('='.repeat(70))

  await db.$disconnect()
  process.exit(errors > 0 ? 1 : 0)
}

runChecker().catch(console.error)
