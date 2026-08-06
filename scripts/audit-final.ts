import { db } from '@/lib/db'
async function audit() {
  const countries = await db.territory.count({ where: { level: 'COUNTRY' } })
  const provinces = await db.territory.count({ where: { level: 'PROVINCE', category: 'DOMESTIC' } })
  const provincesLn = await db.territory.count({ where: { level: 'PROVINCE', category: 'INTERNATIONAL' } })
  const regencies = await db.territory.count({ where: { level: 'REGENCY' } })
  const koorwil = await db.territory.count({ where: { level: 'COORDINATOR' } })
  const koorDpd = await db.territory.count({ where: { level: 'COORD_DPD' } })
  
  console.log('=== AUDIT HIERARKI 3 LEVEL ===')
  console.log(`COUNTRY (DPN):        ${countries}`)
  console.log(`PROVINCE Domestik:    ${provinces} (target 38+IKN=39)`)
  console.log(`PROVINCE LN:          ${provincesLn}`)
  console.log(`REGENCY (DPC):        ${regencies}`)
  console.log(`Koorwil (HARUS 0):    ${koorwil}`)
  console.log(`Koor DPD (HARUS 0):   ${koorDpd}`)
  console.log('')
  
  // Cek Kalbar 14 DPC
  const kalbar = await db.territory.findFirst({ where: { code: '61', level: 'PROVINCE' } })
  if (kalbar) {
    const dpc = await db.territory.findMany({ where: { parentId: kalbar.id, level: 'REGENCY' } })
    console.log(`=== DPC KALBAR ===`)
    dpc.forEach((d, i) => console.log(`  ${String(i+1).padStart(2,'0')}. [${d.code}] ${d.name}`))
    console.log(`Total: ${dpc.length} (target 14: 12 kab + 2 kota)`)
  }
  
  // Cek role users
  const users = await db.user.findMany({ select: { role: true } })
  const roleCount = users.reduce((acc, u) => { acc[u.role] = (acc[u.role]||0)+1; return acc }, {} as Record<string, number>)
  console.log(`\n=== ROLE USERS ===`)
  Object.entries(roleCount).forEach(([r, c]) => console.log(`  ${r}: ${c}`))
  
  await db.$disconnect()
}
audit().catch(console.error)
