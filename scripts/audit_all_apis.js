// Comprehensive API audit - check all endpoints return success
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAPI(name, url, method = 'GET', body = null) {
  const USER_ID = (await prisma.user.findFirst({ where: { username: 'superadmin' } }))?.id
  if (!USER_ID) { console.log('❌ No superadmin user'); return }
  
  try {
    const opts = { method, headers: { 'x-user-id': USER_ID, 'Content-Type': 'application/json' } }
    if (body) opts.body = JSON.stringify(body)
    const res = await fetch(`http://localhost:3000${url}`, opts)
    const data = await res.json()
    const status = res.status
    const hasData = data.success && (data.data !== undefined)
    const dataLen = Array.isArray(data.data) ? data.data.length : (typeof data.data === 'object' ? Object.keys(data.data || {}).length : 1)
    console.log(`${status === 200 && hasData ? '✅' : '❌'} ${method} ${url} → ${status} | ${hasData ? `${dataLen} items` : 'NO DATA'} ${data.error ? '| ERROR: ' + data.error.substring(0, 80) : ''}`)
  } catch (e) {
    console.log(`❌ ${method} ${url} → FETCH ERROR: ${e.message.substring(0, 80)}`)
  }
}

async function main() {
  console.log('=== LAPRA 08 API AUDIT ===\n')
  
  console.log('--- Portal APIs ---')
  await checkAPI('announcements', '/api/announcements')
  await checkAPI('gallery', '/api/gallery')
  await checkAPI('gallery-videos', '/api/gallery/videos')
  await checkAPI('gallery-bookmarks', '/api/gallery/bookmarks')
  await checkAPI('stats', '/api/stats')
  await checkAPI('territory', '/api/territory')
  await checkAPI('profile-content', '/api/profile-content')
  await checkAPI('profile-docs', '/api/profile-documents?type=AD_ART')
  await checkAPI('profile-docs-legal', '/api/profile-documents?type=LEGALITAS')
  await checkAPI('sekretariat', '/api/sekretariat')
  await checkAPI('sekretariat-messages', '/api/sekretariat/messages')
  
  console.log('\n--- Admin APIs ---')
  await checkAPI('menus', '/api/menus')
  await checkAPI('organization', '/api/organization')
  await checkAPI('members', '/api/members')
  await checkAPI('finance', '/api/finance')
  await checkAPI('broadcasts', '/api/broadcasts')
  await checkAPI('sk', '/api/sk')
  await checkAPI('assets', '/api/assets')
  await checkAPI('events', '/api/events')
  await checkAPI('tickets', '/api/tickets')
  await checkAPI('users', '/api/users')
  await checkAPI('security', '/api/security')
  
  console.log('\n--- Command Center APIs ---')
  await checkAPI('command-center', '/api/command-center')
  await checkAPI('polls', '/api/polls')
  await checkAPI('crisis-zones', '/api/crisis-zones')
  await checkAPI('aspirations', '/api/aspirations')
  await checkAPI('aspirations-cluster', '/api/aspirations/cluster')
  await checkAPI('kta-applications', '/api/kta-applications')
  
  console.log('\n--- News APIs ---')
  await checkAPI('news-sync-status', '/api/news/sync')
  
  // DB stats
  console.log('\n--- DB Stats ---')
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
  
  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
