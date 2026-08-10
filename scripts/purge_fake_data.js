// PURGE ALL FAKE/SIMULATED DATA from Broadcast & Command Center
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== PURGE ALL FAKE DATA ===\n')
  
  // 1. Delete all fake broadcasts (seed data)
  const bDeleted = await prisma.broadcast.deleteMany({})
  console.log(`✓ Deleted ${bDeleted.count} fake broadcasts`)
  
  // 2. Delete all fake poll responses (seed data)
  const prDeleted = await prisma.pollResponse.deleteMany({})
  console.log(`✓ Deleted ${prDeleted.count} fake poll responses`)
  
  // 3. Delete all fake polls (seed data)
  const pDeleted = await prisma.poll.deleteMany({})
  console.log(`✓ Deleted ${pDeleted.count} fake polls`)
  
  // 4. Delete all fake crisis zones (seed data)
  const czDeleted = await prisma.crisisZone.deleteMany({})
  console.log(`✓ Deleted ${czDeleted.count} fake crisis zones`)
  
  // 5. Delete all fake aspirations (seed data)
  const aDeleted = await prisma.aspiration.deleteMany({})
  console.log(`✓ Deleted ${aDeleted.count} fake aspirations`)
  
  // 6. Delete all fake voter contacts (seed data)
  const vcDeleted = await prisma.voterContact.deleteMany({})
  console.log(`✓ Deleted ${vcDeleted.count} fake voter contacts`)
  
  // 7. Delete fake PENGUMUMAN/SIRANAN_PERS announcements
  const anDeleted = await prisma.announcement.deleteMany({
    where: { category: { in: ['PENGUMUMAN', 'SIRANAN_PERS'] } }
  })
  console.log(`✓ Deleted ${anDeleted.count} fake pengumuman/siaran pers`)
  
  // 8. Delete fake announcements from news sync that are MANUAL source
  const manualDeleted = await prisma.announcement.deleteMany({
    where: { source: 'MANUAL' }
  })
  console.log(`✓ Deleted ${manualDeleted.count} fake MANUAL announcements`)
  
  console.log('\n=== AFTER PURGE - REAL DATA REMAINING ===')
  const stats = {
    announcements: await prisma.announcement.count(),
    members: await prisma.member.count(),
    territories: await prisma.territory.count(),
    orgPositions: await prisma.orgPosition.count(),
    skDocuments: await prisma.sKDocument.count(),
    broadcasts: await prisma.broadcast.count(),
    financeTxns: await prisma.financeTransaction.count(),
    polls: await prisma.poll.count(),
    pollResponses: await prisma.pollResponse.count(),
    crisisZones: await prisma.crisisZone.count(),
    aspirations: await prisma.aspiration.count(),
    voterContacts: await prisma.voterContact.count(),
    ktaApplications: await prisma.ktaApplication.count(),
    users: await prisma.user.count(),
    assets: await prisma.asset.count(),
    events: await prisma.event.count(),
    tickets: await prisma.supportTicket.count(),
  }
  console.log(JSON.stringify(stats, null, 2))
  console.log('\n✅ ALL FAKE DATA PURGED - System now starts from 0 for Broadcast & Command Center')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
