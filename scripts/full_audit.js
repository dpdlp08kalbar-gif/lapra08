const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAPI(name, url) {
  const admin = await prisma.user.findFirst({ where: { username: 'superadmin' } })
  if (!admin) { console.log(`❌ No admin user`); return }
  try {
    const res = await fetch(`http://localhost:3000${url}`, { headers: { 'x-user-id': admin.id } })
    const data = await res.json()
    const ok = res.status === 200 && data.success
    const len = Array.isArray(data.data) ? data.data.length : (typeof data.data === 'object' && data.data ? Object.keys(data.data).length : (data.data ? 1 : 0))
    console.log(`${ok ? '✅' : '❌'} ${url} → ${res.status} | ${len} items${data.error ? ' | ERR: ' + data.error.substring(0, 60) : ''}`)
  } catch (e) {
    console.log(`❌ ${url} → FETCH ERROR: ${e.message.substring(0, 60)}`)
  }
}

async function main() {
  console.log('=== PROFILE APIs ===')
  await checkAPI('profile-content', '/api/profile-content')
  await checkAPI('profile-docs-adart', '/api/profile-documents?type=AD_ART')
  await checkAPI('profile-docs-legal', '/api/profile-documents?type=LEGALITAS')
  
  console.log('\n=== COMMAND CENTER APIs ===')
  await checkAPI('command-center', '/api/command-center')
  await checkAPI('polls', '/api/polls')
  await checkAPI('crisis-zones', '/api/crisis-zones')
  await checkAPI('aspirations', '/api/aspirations')
  await checkAPI('aspirations-cluster', '/api/aspirations/cluster')
  await checkAPI('broadcasts', '/api/broadcasts')
  await checkAPI('announcements', '/api/announcements')
  
  console.log('\n=== DB STATS ===')
  const stats = {
    profileContent: await prisma.systemSetting.count({ where: { category: 'PROFILE_CONTENT' } }),
    profileDocs: await prisma.systemSetting.count({ where: { category: 'PROFILE_DOCUMENT' } }),
    polls: await prisma.poll.count(),
    pollResponses: await prisma.pollResponse.count(),
    crisisZones: await prisma.crisisZone.count(),
    aspirations: await prisma.aspiration.count(),
    broadcasts: await prisma.broadcast.count(),
    voterContacts: await prisma.voterContact.count(),
    announcements: await prisma.announcement.count(),
  }
  console.log(JSON.stringify(stats, null, 2))
  
  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
