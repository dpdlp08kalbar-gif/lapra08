// LAPRA 08 - CLEANUP: Hapus semua data SEEDED/FAKE
// Pertahankan HANYA data REAL: Territory, Announcements (berita sync), 
// PublicOpinionLink (auto-scrape), GalleryVideo (auto-sync), EssayPoll (AI-generated),
// PopulationData (estimasi BPS), BackgroundJob, AgentLog, AuditScan/Complaint
//
// HAPUS: Finance, Events, Assets, Contacts, Broadcast, BroadcastMessage,
//        Members, OrgPositions, Sekretariat, Gallery Foto, EssayResponse (test)

import { db } from '../src/lib/db'

async function main() {
  console.log('=== CLEANUP: HAPUS SEMUA DATA FAKE ===\n')

  // 1. FinanceTransaction — HAPUS SEMUA
  const fin = await db.financeTransaction.deleteMany({})
  console.log(`✅ Finance: ${fin.count} transaksi dihapus (ALL FAKE)`)

  // 2. Event — HAPUS SEMUA (semua seeded)
  const events = await db.event.deleteMany({})
  console.log(`✅ Events: ${events.count} events dihapus (ALL SEEDED)`)

  // 3. Asset — HAPUS SEMUA
  const assets = await db.asset.deleteMany({})
  console.log(`✅ Assets: ${assets.count} atribut dihapus (ALL SEEDED)`)

  // 4. Distribution (related to assets) — HAPUS
  const dist = await db.distribution.deleteMany({})
  console.log(`✅ Distributions: ${dist.count} records dihapus`)

  // 5. Contact — HAPUS SEMUA (semua seeded dummy WA)
  const contacts = await db.contact.deleteMany({})
  console.log(`✅ Contacts: ${contacts.count} kontak dihapus (ALL DUMMY WA)`)

  // 6. BroadcastMessage (queue) — HAPUS SEMUA (dari kontak fake)
  const bm = await db.broadcastMessage.deleteMany({})
  console.log(`✅ BroadcastMessage: ${bm.count} queue messages dihapus`)

  // 7. Broadcast — HAPUS SEMUA (dari kontak fake)
  const broadcasts = await db.broadcast.deleteMany({})
  console.log(`✅ Broadcasts: ${broadcasts.count} broadcasts dihapus`)

  // 8. BroadcastDeliveryLog — HAPUS
  const bdl = await db.broadcastDeliveryLog.deleteMany({})
  console.log(`✅ BroadcastDeliveryLog: ${bdl.count} logs dihapus`)

  // 9. Member — HAPUS SEMUA (dummy anggota)
  const members = await db.member.deleteMany({})
  console.log(`✅ Members: ${members.count} anggota dihapus (DUMMY)`)

  // 10. OrgPosition — HAPUS SEMUA (dummy pengurus)
  const positions = await db.orgPosition.deleteMany({})
  console.log(`✅ OrgPositions: ${positions.count} pengurus dihapus (DUMMY)`)

  // 11. SKDocument — HAPUS (dummy SK uploads)
  const sk = await db.sKDocument.deleteMany({})
  console.log(`✅ SKDocuments: ${sk.count} dokumen SK dihapus`)

  // 12. KtaApplication — HAPUS (dummy KTA)
  const kta = await db.ktaApplication.deleteMany({})
  console.log(`✅ KtaApplications: ${kta.count} aplikasi KTA dihapus`)

  // 13. Sekretariat locations — HAPUS (dummy alamat)
  const sek = await db.systemSetting.deleteMany({ where: { category: 'SEKRETARIAT' } })
  console.log(`✅ Sekretariat: ${sek.count} lokasi dihapus (DUMMY)`)

  // 14. Gallery Foto (GALLERY category) — HAPUS (dummy photos)
  const galFoto = await db.systemSetting.deleteMany({ where: { category: 'GALLERY' } })
  console.log(`✅ Gallery Foto: ${galFoto.count} foto dihapus (DUMMY)`)

  // 15. Program Content — HAPUS (dummy program kerja)
  const prog = await db.systemSetting.deleteMany({ where: { category: 'PROGRAM_CONTENT' } })
  console.log(`✅ Program Content: ${prog.count} items dihapus (DUMMY)`)

  // 16. EssayResponse — HAPUS test responses (keep polls, they're AI-generated from real data)
  const er = await db.essayResponse.deleteMany({})
  console.log(`✅ EssayResponse: ${er.count} test responses dihapus`)

  // 17. TrustIndex — HAPUS (akan di-recompute dari opinion links real)
  const ti = await db.trustIndex.deleteMany({})
  console.log(`✅ TrustIndex: ${ti.count} records dihapus (will recompute from real data)`)

  // 18. AuditScan & AuditComplaint — HAPUS (dari scraping test, keep opinion links)
  const ac = await db.auditComplaint.deleteMany({})
  console.log(`✅ AuditComplaint: ${ac.count} complaints dihapus`)
  const as_ = await db.auditScan.deleteMany({})
  console.log(`✅ AuditScan: ${as_.count} scans dihapus`)

  // 19. SyncEvent — HAPUS old events (akan auto-create baru)
  const se = await db.syncEvent.deleteMany({})
  console.log(`✅ SyncEvent: ${se.count} events dihapus`)

  // 20. AgentLog — keep (real agent execution logs)

  console.log('\n=== DATA YANG DIPERTAHANKAN (REAL) ===')
  
  const territory = await db.territory.count()
  console.log(`✅ Territory: ${territory} (BPS resmi: 44 DPD + 515 DPC)`)

  const announcements = await db.announcement.count()
  console.log(`✅ Announcements: ${announcements} berita (auto-sync Google News)`)

  const opinions = await db.publicOpinionLink.count()
  console.log(`✅ PublicOpinionLink: ${opinions} (auto-scrape yt-dlp + RSS)`)

  const videos = await db.systemSetting.count({ where: { category: 'GALLERY_VIDEO' } })
  console.log(`✅ GalleryVideo: ${videos} (auto-sync YouTube LAPRA 08)`)

  const polls = await db.essayPoll.count()
  console.log(`✅ EssayPoll: ${polls} (AI-generated dari opinion links real)`)

  const pop = await db.populationData.count()
  console.log(`✅ PopulationData: ${pop} (estimasi BPS 2024)`)

  const users = await db.user.count()
  console.log(`⚠️ Users: ${users} (demo login accounts — keep untuk akses sistem)`)

  const jobs = await db.backgroundJob.count()
  console.log(`✅ BackgroundJob: ${jobs} (system config)`)

  const alogs = await db.agentLog.count()
  console.log(`✅ AgentLog: ${alogs} (real agent execution logs)`)

  const config = await db.broadcastEngineConfig.count()
  console.log(`✅ BroadcastEngineConfig: ${config} (system config)`)

  const integrations = await db.apiIntegration.count()
  console.log(`✅ ApiIntegration: ${integrations} (WA Gateway config)`)

  const security = await db.securitySetting.count()
  console.log(`⚠️ SecuritySetting: ${security} (system config)`)

  console.log('\n=== CLEANUP SELESAI ===')
  console.log('Sistem sekarang bersih dari data fake.')
  console.log('Hanya data REAL yang tersisa.')
  console.log('User dapat mulai input data nyata: keuangan, events, assets, kontak, dll.')
}

main().catch(e => { console.error(e); process.exit(1) })
.finally(async () => { await db.$disconnect() })
