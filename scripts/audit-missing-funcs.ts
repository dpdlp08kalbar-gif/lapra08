import { db } from '@/lib/db'

async function audit() {
  console.log('🔍 AUDIT: FUNGSI YANG HILANG SETELAH RESTRUKTURISASI PORTAL\n')
  
  // Check menus in DB
  const menus = await db.menuItem.findMany({ orderBy: { order: 'asc' } })
  console.log('📋 Menu di DB saat ini:')
  menus.forEach(m => console.log(`  ${m.order}. [${m.key}] ${m.label} (visible: ${m.isVisible})`))
  
  // Check what was removed
  const removedMenus = ['help', 'events', 'membership', 'organization', 'territory']
  console.log('\n❌ Menu yang dihapus/dihilangkan:')
  removedMenus.forEach(key => {
    const found = menus.find(m => m.key === key)
    console.log(`  [${key}]: ${found ? 'MASIH ADA' : '❌ DIHAPUS'}`)
  })
  
  // Check portal-menus.tsx for empty placeholders
  console.log('\n⚠️ Portal menus yang hanya placeholder (EmptyState):')
  console.log('  - Pusat Media > Kabar Utama: ❌ EmptyState (no CRUD)')
  console.log('  - Pusat Media > Galeri: ❌ EmptyState')
  console.log('  - Pusat Media > Rilis Pers: ❌ EmptyState')
  console.log('  - Pusat Media > Majalah: ❌ EmptyState')
  console.log('  - Program > Program Kerja: ❌ EmptyState')
  console.log('  - Program > Aksi Sosial: ❌ EmptyState')
  console.log('  - Program > Kemitraan: ❌ EmptyState')
  console.log('  - Layanan > KTA Digital: ❌ EmptyState')
  console.log('  - Layanan > Pengaduan: ❌ EmptyState')
  console.log('  - Layanan > Bantuan Hukum: ❌ EmptyState')
  console.log('  - Kontak > Lokasi: ❌ EmptyState')
  console.log('  - Kontak > Hubungi: ❌ EmptyState')
  console.log('  - Kontak > FAQ: ❌ EmptyState')
  
  // Check existing functional components
  console.log('\n✅ Komponen yang sudah punya CRUD tapi TIDAK digunakan di portal:')
  console.log('  - CommunicationMenu (broadcast + pengumuman) → hanya di admin section')
  console.log('  - EventsMenu (agenda + absensi + laporan) → hanya sebagai tab di Program')
  console.log('  - HelpMenu (manual + tiket) → hanya sebagai tab di Layanan')
  console.log('  - FinanceMenu → hanya di admin section')
  console.log('  - LogisticsMenu → hanya di admin section')
  
  await db.$disconnect()
}
audit().catch(console.error)
