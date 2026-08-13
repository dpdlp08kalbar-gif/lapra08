// LAPRA 08 - DB schema check
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});

(async () => {
  try {
    console.log('=== DB Stats ===');
    const opinionLinks = await prisma.publicOpinionLink.count();
    const scans = await prisma.auditScan.count();
    const broadcasts = await prisma.broadcast.count();
    const messages = await prisma.broadcastMessage.count();
    const contacts = await prisma.contact.count();
    const trustIdx = await prisma.trustIndex.count();
    const polls = await prisma.essayPoll.count();
    const agentLogs = await prisma.agentLog.count();
    const backgroundJobs = await prisma.backgroundJob.count();
    const broadcastEngineConfigs = await prisma.broadcastEngineConfig.count();
    const apiIntegrations = await prisma.apiIntegration.count();

    console.log(`PublicOpinionLink: ${opinionLinks}`);
    console.log(`AuditScan: ${scans}`);
    console.log(`Broadcast: ${broadcasts}`);
    console.log(`BroadcastMessage: ${messages}`);
    console.log(`Contact: ${contacts}`);
    console.log(`TrustIndex: ${trustIdx}`);
    console.log(`EssayPoll: ${polls}`);
    console.log(`AgentLog: ${agentLogs}`);
    console.log(`BackgroundJob: ${backgroundJobs}`);
    console.log(`BroadcastEngineConfig: ${broadcastEngineConfigs}`);
    console.log(`ApiIntegration: ${apiIntegrations}`);

    // Sample 1 row each
    console.log('\n=== PublicOpinionLink sample ===');
    const sampleLink = await prisma.publicOpinionLink.findFirst({ select: { id: true, platform: true, sentiment: true, priority: true, urgencyScore: true, category: true, status: true, createdAt: true, provinceName: true, regencyName: true } });
    console.log(JSON.stringify(sampleLink, null, 2));

    console.log('\n=== Broadcast sample ===');
    const sampleBc = await prisma.broadcast.findFirst({ select: { id: true, title: true, channel: true, status: true, recipientCount: true, sentAt: true } });
    console.log(JSON.stringify(sampleBc, null, 2));

    console.log('\n=== Contact sample ===');
    const sampleContact = await prisma.contact.findFirst({ select: { id: true, name: true, phone: true, whatsappOptIn: true, occupation: true, ageGroup: true, provinceCode: true } });
    console.log(JSON.stringify(sampleContact, null, 2));

    console.log('\n=== ApiIntegration list ===');
    const integrations = await prisma.apiIntegration.findMany({ select: { platform: true, status: true, displayName: true, lastConnectedAt: true } });
    console.log(JSON.stringify(integrations, null, 2));

    // RAW query for PostGIS extension check
    console.log('\n=== PostgreSQL extensions ===');
    const extensions = await prisma.$queryRaw`SELECT extname FROM pg_extension ORDER BY extname`;
    console.log(JSON.stringify(extensions, null, 2));

    // RAW query for table list
    console.log('\n=== Tables related to Komunikasi & Broadcast ===');
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('PublicOpinionLink', 'AuditScan', 'AuditComplaint', 'Broadcast', 'BroadcastMessage', 'BroadcastDeliveryLog', 'BroadcastEngineConfig', 'Contact', 'MessageTemplate', 'ApiIntegration', 'TrustIndex', 'PopulationData', 'EssayPoll', 'AgentLog', 'BackgroundJob', 'SyncEvent')
      ORDER BY table_name
    `;
    console.log(JSON.stringify(tables, null, 2));

    // Check for PostGIS specifically
    console.log('\n=== PostGIS extension check ===');
    const postgis = await prisma.$queryRaw`SELECT extname, extversion FROM pg_extension WHERE extname IN ('postgis', 'postgis_topology', 'pg_trgm', 'unaccent', 'vector')`;
    console.log(JSON.stringify(postgis, null, 2));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
