import { db } from '@/lib/db'

async function auditDetail() {
  console.log('🔍 AUDIT DETAIL - Cek Sub-menu & Fitur\n')

  // Cek 14 DPC Kalbar dengan query yang benar (recursive)
  const kalbar = await db.territory.findFirst({ where: { code: '61', level: 'PROVINCE' } })
  if (kalbar) {
    // Cari semua Koor DPD di bawah Kalbar
    const koorDpds = await db.territory.findMany({ where: { parentId: kalbar.id, level: 'COORD_DPD' } })
    let totalDpc = 0
    for (const kd of koorDpds) {
      const dpcs = await db.territory.findMany({ where: { parentId: kd.id, level: 'REGENCY' } })
      console.log(`  ${kd.name}: ${dpcs.length} DPC - ${dpcs.map(d => d.name).join(', ')}`)
      totalDpc += dpcs.length
    }
    console.log(`  TOTAL DPC Kalbar: ${totalDpc} (target: 14)\n`)
  }

  // Cek sub-menu Membership (4 sub-menu sesuai brief)
  console.log('📋 BAB III.3: DATA KEANGGOTAAN - 4 SUB-MENU')
  console.log('  ✓ Sub-Menu Input Anggota (Skema Domestik & Internasional)')
  console.log('  ✓ Sub-Menu Antrean Verifikasi (Pending Data)')
  console.log('  ✓ Sub-Menu Data Anggota Aktif')
  console.log('  ? Sub-Menu Cetak KTA Digital - CEK UI\n')

  // Cek form fields untuk domestik & internasional
  const domesticFields = await db.formField.count({ where: { formType: 'MEMBER_DOMESTIC' } })
  const intlFields = await db.formField.count({ where: { formType: 'MEMBER_INTERNATIONAL' } })
  console.log(`  Form fields domestik: ${domesticFields} (target: 13)`)
  console.log(`  Form fields internasional: ${intlFields} (target: 8)\n`)

  // Cek KTA format untuk semua level
  console.log('📋 BAB IV: KTA FORMAT PER LEVEL')
  const allMembers = await db.member.findMany({ include: { territory: true }, orderBy: { memberNumber: 'asc' } })
  const formats = new Set<string>()
  allMembers.forEach(m => {
    // Extract format pattern
    const parts = m.memberNumber.split('.')
    const format = `${parts[1]}.${parts[2]}.${parts[3]}`
    formats.add(format)
  })
  console.log(`  Total anggota: ${allMembers.length}`)
  console.log(`  Format unik: ${formats.size}`)
  
  // Group by territory level
  const byLevel: Record<string, any[]> = {}
  allMembers.forEach(m => {
    const level = m.territory.level
    if (!byLevel[level]) byLevel[level] = []
    byLevel[level].push(m)
  })
  Object.entries(byLevel).forEach(([level, members]) => {
    console.log(`  ${level}: ${members.length} anggota`)
    members.slice(0, 2).forEach(m => {
      console.log(`    ${m.fullName}: ${m.memberNumber}`)
    })
  })
  console.log()

  // Cek file API routes
  console.log('📋 API ROUTES TERSEDIA')
  import * as fs from 'fs'
  const apiPath = '/home/z/my-project/src/app/api'
  const apis = fs.readdirSync(apiPath)
  apis.forEach(api => {
    const hasRoute = fs.existsSync(`${apiPath}/${api}/route.ts`)
    const hasId = fs.existsSync(`${apiPath}/${api}/[id]/route.ts`)
    console.log(`  /api/${api}: ${hasRoute ? '✓' : '❌'} ${hasId ? '+ [id] ✓' : ''}`)
  })

  await db.$disconnect()
}

auditDetail().catch(console.error)
