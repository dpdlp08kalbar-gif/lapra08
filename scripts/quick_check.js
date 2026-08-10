const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const stats = {
    polls: await prisma.poll.count(),
    pollResponses: await prisma.pollResponse.count(),
    crisisZones: await prisma.crisisZone.count(),
    aspirations: await prisma.aspiration.count(),
    broadcasts: await prisma.broadcast.count(),
    voterContacts: await prisma.voterContact.count(),
    announcements: await prisma.announcement.count(),
    galleryPhotos: await prisma.systemSetting.count({ where: { category: 'GALLERY' } }),
    galleryVideos: await prisma.systemSetting.count({ where: { category: 'GALLERY_VIDEO' } }),
    sekretariatLocs: await prisma.systemSetting.count({ where: { category: 'SEKRETARIAT' } }),
    programContent: await prisma.systemSetting.count({ where: { category: 'PROGRAM_CONTENT' } }),
  }
  console.log(JSON.stringify(stats, null, 2))
  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
