import { db } from '@/lib/db'

async function fix() {
  console.log('🔧 FIXING AUDIT ISSUES\n')
  
  // Fix 1: Add missing 'pusat-data' menu
  const existing = await db.menuItem.findUnique({ where: { key: 'pusat-data' } })
  if (!existing) {
    await db.menuItem.create({
      data: {
        key: 'pusat-data',
        label: 'Pusat Data Organisasi',
        icon: 'Database',
        order: 7.5,
        roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC',
        isVisible: true,
        isActive: true,
      },
    })
    console.log('✅ Fixed: Added missing "pusat-data" menu')
  } else {
    console.log('  "pusat-data" menu already exists')
  }
  
  // Fix 2: Remove old 'help' menu if exists (replaced by 'layanan')
  const oldHelp = await db.menuItem.findUnique({ where: { key: 'help' } })
  if (oldHelp) {
    await db.menuItem.delete({ where: { key: 'help' } })
    console.log('✅ Fixed: Removed old "help" menu (replaced by "layanan")')
  }
  
  // Verify
  const menus = await db.menuItem.findMany({ orderBy: { order: 'asc' } })
  console.log(`\n📋 Current menus (${menus.length}):`)
  menus.forEach(m => console.log(`  ${m.order}. ${m.key.padEnd(15)} ${m.label}`))
  
  await db.$disconnect()
}
fix().catch(console.error)
