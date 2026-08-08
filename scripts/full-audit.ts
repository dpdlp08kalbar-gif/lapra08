import { db } from '@/lib/db'

async function audit() {
  console.log('🔍 LAPRA 08 — FULL SYSTEM AUDIT\n')
  console.log('='.repeat(70))
  let issues = 0

  // === 1. DATABASE INTEGRITY ===
  console.log('\n📦 1. DATABASE INTEGRITY')
  console.log('-'.repeat(40))
  
  const dpdDomestic = await db.territory.count({ where: { level: 'PROVINCE', category: 'DOMESTIC', isActive: true } })
  const dpdLn = await db.territory.count({ where: { level: 'PROVINCE', category: 'INTERNATIONAL', isActive: true } })
  const dpc = await db.territory.count({ where: { level: 'REGENCY', category: 'DOMESTIC', isActive: true } })
  const members = await db.member.count()
  const orgPositions = await db.orgPosition.count()
  const skDocs = await db.sKDocument.count()
  const users = await db.user.count({ where: { isActive: true } })
  const events = await db.event.count()
  const assets = await db.asset.count()
  const finance = await db.financeTransaction.count()
  const announcements = await db.announcement.count()
  const tickets = await db.supportTicket.count()
  const broadcasts = await db.broadcast.count()
  const distributions = await db.distribution.count()
  const menus = await db.menuItem.count()
  
  console.log(`  DPD Domestik:  ${dpdDomestic} (target: 39) ${dpdDomestic === 39 ? '✅' : '❌'}`)
  console.log(`  DPD LN:        ${dpdLn} (target: 5) ${dpdLn === 5 ? '✅' : '❌'}`)
  console.log(`  DPC:           ${dpc} (target: 514) ${dpc === 514 ? '✅' : '❌'}`)
  console.log(`  Anggota:       ${members}`)
  console.log(`  Pengurus:      ${orgPositions}`)
  console.log(`  SK Dokumen:    ${skDocs}`)
  console.log(`  Users:         ${users}`)
  console.log(`  Events:        ${events}`)
  console.log(`  Assets:        ${assets}`)
  console.log(`  Finance:       ${finance}`)
  console.log(`  Announcements: ${announcements}`)
  console.log(`  Tickets:       ${tickets}`)
  console.log(`  Broadcasts:    ${broadcasts}`)
  console.log(`  Distributions: ${distributions}`)
  console.log(`  Menus:         ${menus}`)

  // === 2. HIERARCHY VALIDATION ===
  console.log('\n📐 2. HIERARCHY VALIDATION')
  console.log('-'.repeat(40))
  
  const allDpc = await db.territory.findMany({ where: { level: 'REGENCY' }, include: { parent: true } })
  const orphans = allDpc.filter(d => !d.parent || !d.parent.isActive)
  const codeViolations = allDpc.filter(d => {
    if (!d.parent || d.parent.category !== 'DOMESTIC' || d.parent.level !== 'PROVINCE') return false
    return !d.code.startsWith(d.parent.code)
  })
  
  // Check unique name per DPD
  const byDpd: Record<string, string[]> = {}
  allDpc.forEach(d => {
    if (d.parentId) {
      if (!byDpd[d.parentId]) byDpd[d.parentId] = []
      byDpd[d.parentId].push(d.name)
    }
  })
  const dupNames = Object.entries(byDpd).filter(([_, names]) => new Set(names).size < names.length)
  
  console.log(`  Orphans (no active parent):  ${orphans.length} ${orphans.length === 0 ? '✅' : '❌'}`)
  console.log(`  Code format violations:      ${codeViolations.length} ${codeViolations.length === 0 ? '✅' : '❌'}`)
  console.log(`  Duplicate names per DPD:    ${dupNames.length} ${dupNames.length === 0 ? '✅' : '❌'}`)

  // === 3. MENU STRUCTURE ===
  console.log('\n📋 3. MENU STRUCTURE')
  console.log('-'.repeat(40))
  
  const menuList = await db.menuItem.findMany({ orderBy: { order: 'asc' } })
  const portalMenus = ['beranda','profil','pusat-media','program','layanan','kontak']
  const adminMenus = ['dashboard','pusat-data','logistics','communication','finance','users']
  
  portalMenus.forEach(key => {
    const exists = menuList.find(m => m.key === key)
    console.log(`  Portal: ${key.padEnd(15)} ${exists ? '✅' : '❌ MISSING'}`)
    if (!exists) issues++
  })
  adminMenus.forEach(key => {
    const exists = menuList.find(m => m.key === key)
    console.log(`  Admin:  ${key.padEnd(15)} ${exists ? '✅' : '❌ MISSING'}`)
    if (!exists) issues++
  })
  // Check if old 'help' menu still exists (should be replaced by 'layanan')
  const oldHelp = menuList.find(m => m.key === 'help')
  if (oldHelp) {
    console.log(`  Old 'help' menu still exists: ⚠️ (should be replaced by layanan)`)
  }

  // === 4. PENGURUS DPN REAL DATA ===
  console.log('\n👥 4. PENGURUS DPN (REAL DATA)')
  console.log('-'.repeat(40))
  
  const dpnPositions = await db.orgPosition.findMany({
    where: { level: 'DPN', approvalStatus: 'APPROVED' },
    orderBy: { order: 'asc' },
  })
  console.log(`  Total DPN positions: ${dpnPositions.length}`)
  dpnPositions.forEach(p => {
    console.log(`  ${p.order}. ${p.fullName} — ${p.positionName}`)
  })
  
  const expectedNames = ['Hashim', 'Devi Taurisa', 'Nurhadi', 'Timmy']
  expectedNames.forEach(name => {
    const found = dpnPositions.find(p => p.fullName.includes(name))
    console.log(`  Contains "${name}": ${found ? '✅' : '❌ MISSING'}`)
    if (!found) issues++
  })

  // === 5. SK DOCUMENTS WITH OCR ===
  console.log('\n📄 5. SK DOCUMENTS & OCR')
  console.log('-'.repeat(40))
  
  const skWithOcr = await db.sKDocument.count({ where: { ocrStatus: 'COMPLETED' } })
  const skPending = await db.sKDocument.count({ where: { ocrStatus: 'PENDING' } })
  const skFailed = await db.sKDocument.count({ where: { ocrStatus: 'FAILED' } })
  const skProcessing = await db.sKDocument.count({ where: { ocrStatus: 'PROCESSING' } })
  
  console.log(`  OCR Completed:  ${skWithOcr} ${skWithOcr > 0 ? '✅' : '⚠️'}`)
  console.log(`  OCR Pending:    ${skPending}`)
  console.log(`  OCR Processing: ${skProcessing}`)
  console.log(`  OCR Failed:     ${skFailed}`)

  // === 6. APPROVAL SYSTEM ===
  console.log('\n🔐 6. APPROVAL SYSTEM')
  console.log('-'.repeat(40))
  
  const pendingCount = await db.orgPosition.count({ where: { approvalStatus: 'PENDING' } })
  const approvedCount = await db.orgPosition.count({ where: { approvalStatus: 'APPROVED' } })
  const rejectedCount = await db.orgPosition.count({ where: { approvalStatus: 'REJECTED' } })
  
  console.log(`  Pending:   ${pendingCount}`)
  console.log(`  Approved:  ${approvedCount}`)
  console.log(`  Rejected:  ${rejectedCount}`)
  console.log(`  Approval system: ${pendingCount >= 0 && approvedCount > 0 ? '✅ Active' : '⚠️ Check'}`)

  // === 7. UNIQUE CONSTRAINTS (Anti-Duplikasi) ===
  console.log('\n🔒 7. ANTI-DUPLIKASI CONSTRAINTS')
  console.log('-'.repeat(40))
  
  // Check for duplicate NIKs
  const allMembers = await db.member.findMany({ select: { nik: true, phone: true } })
  const niks = allMembers.filter(m => m.nik).map(m => m.nik)
  const phones = allMembers.map(m => m.phone)
  const dupNiks = niks.filter((n, i) => niks.indexOf(n) !== i)
  const dupPhones = phones.filter((p, i) => phones.indexOf(p) !== i)
  
  console.log(`  Duplicate NIKs:    ${dupNiks.length} ${dupNiks.length === 0 ? '✅' : '❌'}`)
  console.log(`  Duplicate Phones:   ${dupPhones.length} ${dupPhones.length === 0 ? '✅' : '❌'}`)
  
  // Check duplicate SK numbers
  const allSks = await db.sKDocument.findMany({ select: { skNumber: true } })
  const skNumbers = allSks.map(s => s.skNumber)
  const dupSk = skNumbers.filter((s, i) => skNumbers.indexOf(s) !== i)
  console.log(`  Duplicate SK No:    ${dupSk.length} ${dupSk.length === 0 ? '✅' : '❌'}`)

  // === 8. KTA FORMAT VERIFICATION ===
  console.log('\n🪪 8. KTA FORMAT VERIFICATION')
  console.log('-'.repeat(40))
  
  const allMems = await db.member.findMany({ include: { territory: { include: { parent: true } } } })
  let ktaIssues = 0
  allMems.forEach(m => {
    const parts = m.memberNumber.split('.')
    if (parts.length !== 6 || parts[0] !== 'LAPRA08') {
      console.log(`  ❌ ${m.fullName}: ${m.memberNumber} (bad format)`)
      ktaIssues++
    }
  })
  console.log(`  KTA format issues: ${ktaIssues} ${ktaIssues === 0 ? '✅' : '❌'}`)
  console.log(`  Sample KTAs:`)
  allMems.slice(0, 5).forEach(m => {
    console.log(`    ${m.fullName}: ${m.memberNumber}`)
  })

  // === 9. API ROUTES CHECK ===
  console.log('\n🌐 9. API ROUTES')
  console.log('-'.repeat(40))
  
  const fs = require('fs')
  const apiPath = '/home/z/my-project/src/app/api'
  const apis = fs.readdirSync(apiPath)
  let apiCount = 0
  apis.forEach(api => {
    const hasRoute = fs.existsSync(`${apiPath}/${api}/route.ts`)
    const hasId = fs.existsSync(`${apiPath}/${api}/[id]/route.ts`)
    if (hasRoute) apiCount++
    console.log(`  /api/${api.padEnd(20)} ${hasRoute ? '✅' : '❌'} ${hasId ? '+ [id] ✅' : ''}`)
  })
  console.log(`  Total API routes: ${apiCount}`)

  // === 10. SECURITY SETTINGS ===
  console.log('\n🛡️ 10. SECURITY SETTINGS (Dev Mode)')
  console.log('-'.repeat(40))
  
  const secSettings = await db.securitySetting.findMany()
  const activeSec = secSettings.filter(s => s.isActive)
  console.log(`  Total settings:  ${secSettings.length}`)
  console.log(`  Active (should be 0 in dev mode): ${activeSec.length} ${activeSec.length === 0 ? '✅' : '⚠️'}`)

  // === SUMMARY ===
  console.log('\n' + '='.repeat(70))
  console.log(`📊 AUDIT SUMMARY: ${issues} issues found`)
  if (issues === 0) {
    console.log('✅ SISTEM DALAM KONDISI BAIK')
  } else {
    console.log('⚠️ ADA ITEM YANG PERLU DIPERBAIKI')
  }
  console.log('='.repeat(70))

  await db.$disconnect()
}

audit().catch(console.error)
