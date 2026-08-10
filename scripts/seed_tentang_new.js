const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const tentangContent = {
    heroTitle: 'Laskar Prabowo 08 (LAPRA 08)',
    heroSubtitle: 'Organisasi Kemasyarakatan & Wadah Relawan Resmi Prabowo Subianto',
    heroDescription: 'Laskar Prabowo 08—yang secara resmi disingkat sebagai LAPRA 08—adalah organisasi kemasyarakatan sekaligus wadah relawan resmi Prabowo Subianto yang bergerak aktif di tingkat nasional.',
    misiStrategis1: 'Organisasi ini mengemban misi strategis dalam mengawal serta mengawasi implementasi program-program nasional, baik di tingkat pusat maupun daerah. Hal ini dilakukan guna memastikan keberhasilan pembangunan menuju Indonesia Emas yang merupakan cita-cita mulia Presiden Prabowo Subianto.',
    misiStrategis2: 'Dalam pergerakannya, LAPRA 08 bertumpu pada fokus utama yang meliputi pengawasan program pemerintah, pelaksanaan kaderisasi yang terstruktur, serta penyelenggaraan aksi sosial kemanusiaan yang berdampak nyata bagi masyarakat dan negara.',
    pelantikanDate: '21 Maret 2025',
    pelantikanTempat: 'Auditorium RRI Jakarta',
    pelantik: 'Dr. (HC) Hashim S. Djojohadikusumo (Ketua Dewan Pembina)',
    ketuaUmum: 'Devi Taurisa, SH, MH, CLD',
    pilar1Title: 'Pengawasan Kebijakan',
    pilar1Desc: 'Mengawal, memantau, dan memastikan seluruh program strategis pemerintah berjalan tepat sasaran demi kesejahteraan rakyat.',
    pilar2Title: 'Kaderisasi Nasionalis',
    pilar2Desc: 'Membentuk, membina, dan melahirkan kader-kader berkualitas yang memiliki integritas tinggi dan berjiwa kepemimpinan nasional.',
    pilar3Title: 'Aksi Sosial Nyata',
    pilar3Desc: 'Menginisiasi pengabdian masyarakat dan aksi kemanusiaan secara aktif di seluruh penjuru wilayah.',
  }
  
  await prisma.systemSetting.upsert({
    where: { key: 'profil.tentang' },
    update: { value: JSON.stringify(tentangContent), category: 'PROFILE_CONTENT' },
    create: { key: 'profil.tentang', value: JSON.stringify(tentangContent), category: 'PROFILE_CONTENT', description: 'Profile content: tentang' },
  })
  console.log('✅ profil.tentang updated with new narrative')
  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
