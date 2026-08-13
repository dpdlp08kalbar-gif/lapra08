const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});

(async () => {
  const counts = {
    User: await prisma.user.count(),
    Territory: await prisma.territory.count(),
    PopulationData: await prisma.populationData.count(),
    Announcement: await prisma.announcement.count(),
    PublicOpinionLink: await prisma.publicOpinionLink.count(),
    AuditScan: await prisma.auditScan.count(),
    AuditComplaint: await prisma.auditComplaint.count(),
    TrustIndex: await prisma.trustIndex.count(),
    EssayPoll: await prisma.essayPoll.count(),
    Broadcast: await prisma.broadcast.count(),
    BroadcastMessage: await prisma.broadcastMessage.count(),
    Contact: await prisma.contact.count(),
    MessageTemplate: await prisma.messageTemplate.count(),
    ApiIntegration: await prisma.apiIntegration.count(),
    BroadcastEngineConfig: await prisma.broadcastEngineConfig.count(),
    BroadcastDeliveryLog: await prisma.broadcastDeliveryLog.count(),
    FinanceTransaction: await prisma.financeTransaction.count(),
    Asset: await prisma.asset.count(),
    OrgPosition: await prisma.orgPosition.count(),
    Member: await prisma.member.count(),
    Sk: await prisma.sk.count(),
    ProgramKerja: await prisma.programKerja.count(),
    Event: await prisma.event.count(),
    ContactMessage: await prisma.contactMessage.count(),
    FaqItem: await prisma.faqItem.count(),
    SystemSetting: await prisma.systemSetting.count(),
    Sekretariat: await prisma.systemSetting.count({ where: { category: 'SEKRETARIAT' } }),
    ProfileContent: await prisma.profileContent.count(),
    Gallery: await prisma.gallery.count(),
    GalleryVideo: await prisma.galleryVideo.count(),
    GalleryBookmark: await prisma.galleryBookmark.count(),
    SupportTicket: await prisma.supportTicket.count(),
    AgentLog: await prisma.agentLog.count(),
    BackgroundJob: await prisma.backgroundJob.count(),
    SyncEvent: await prisma.syncEvent.count(),
  };

  console.log('=== Production Data Counts ===');
  for (const [key, value] of Object.entries(counts)) {
    const empty = value === 0 ? ' ❌ EMPTY' : value < 5 ? ' ⚠️ LOW' : ' ✅';
    console.log(`  ${key.padEnd(25)} ${String(value).padStart(6)} ${empty}`);
  }

  await prisma.$disconnect();
})();
