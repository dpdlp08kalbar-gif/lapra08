const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  console.log('=== QUICK SYSTEM CHECK ===\n')
  const stats = {
    announcements: await prisma.announcement.count(),
    members: await prisma.member.count(),
    territories: await prisma.territory.count(),
    orgPositions: await prisma.orgPosition.count(),
    skDocuments: await prisma.sKDocument.count(),
    broadcasts: await prisma.broadcast.count(),
    financeTxns: await prisma.financeTransaction.count(),
    polls: await prisma.poll.count(),
    crisisZones: await prisma.crisisZone.count(),
    aspirations: await prisma.aspiration.count(),
    contacts: await prisma.contact.count(),
    voterContacts: await prisma.voterContact.count(),
    socialSources: await prisma.socialSource.count(),
    socialMentions: await prisma.socialMention.count(),
    alertNotifications: await prisma.alertNotification.count(),
    aIRecommendations: await prisma.aIRecommendation.count(),
    users: await prisma.user.count(),
    events: await prisma.event.count(),
    assets: await prisma.asset.count(),
  }
  console.log(JSON.stringify(stats, null, 2))
  
  // Check what APIs exist
  const fs = require('fs')
  const apiDirs = fs.readdirSync('src/app/api', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
  console.log('\nAPI directories:', apiDirs.length)
  console.log(apiDirs.join(', '))
}
main().catch(console.error).finally(() => prisma.$disconnect())
