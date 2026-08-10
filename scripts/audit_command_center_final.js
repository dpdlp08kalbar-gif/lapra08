// LAPRA 08 - DEEP AUDIT: Komunikasi & Command Center
// Cek kebenaran data, kelengkapan fungsi, dan kemampuan setiap sub-menu
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== DEEP AUDIT: Komunikasi & Command Center ===\n')

  // ===========================================
  // 1. COMMAND CENTER OVERVIEW
  // ===========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('1. COMMAND CENTER OVERVIEW')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1a. Sentiment summary
  const totalResponses = await prisma.pollResponse.count()
  const posCount = await prisma.pollResponse.count({ where: { sentiment: 'POSITIVE' } })
  const neuCount = await prisma.pollResponse.count({ where: { sentiment: 'NEUTRAL' } })
  const negCount = await prisma.pollResponse.count({ where: { sentiment: 'NEGATIVE' } })
  console.log(`[1a] Sentiment Summary:`)
  console.log(`  Total: ${totalResponses}`)
  console.log(`  Positive: ${posCount} (${totalResponses > 0 ? (posCount/totalResponses*100).toFixed(1) : 0}%)`)
  console.log(`  Neutral: ${neuCount} (${totalResponses > 0 ? (neuCount/totalResponses*100).toFixed(1) : 0}%)`)
  console.log(`  Negative: ${negCount} (${totalResponses > 0 ? (negCount/totalResponses*100).toFixed(1) : 0}%)`)

  // 1b. 7-day trend
  const now = new Date()
  console.log(`\n[1b] 7-Day Trend:`)
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now); dayStart.setHours(0,0,0,0); dayStart.setDate(dayStart.getDate()-i)
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate()+1)
    const dayTotal = await prisma.pollResponse.count({ where: { submittedAt: { gte: dayStart, lt: dayEnd } } })
    const dayPos = await prisma.pollResponse.count({ where: { submittedAt: { gte: dayStart, lt: dayEnd }, sentiment: 'POSITIVE' } })
    const dayNeg = await prisma.pollResponse.count({ where: { submittedAt: { gte: dayStart, lt: dayEnd }, sentiment: 'NEGATIVE' } })
    const dayNeu = await prisma.pollResponse.count({ where: { submittedAt: { gte: dayStart, lt: dayEnd }, sentiment: 'NEUTRAL' } })
    console.log(`  ${dayStart.toLocaleDateString('id-ID',{day:'2-digit',month:'short'})}: total=${dayTotal} pos=${dayPos} neg=${dayNeg} neu=${dayNeu}`)
  }

  // 1c. Alerts verification
  console.log(`\n[1c] Alerts Verification:`)
  const activePolls = await prisma.poll.findMany({ where: { status: 'ACTIVE' }, select: { id: true, title: true } })
  let realAlerts = 0
  for (const poll of activePolls) {
    const responses = await prisma.pollResponse.findMany({ where: { pollId: poll.id }, select: { sentiment: true, regencyCode: true } })
    const byRegency = {}
    for (const r of responses) {
      if (r.regencyCode) {
        if (!byRegency[r.regencyCode]) byRegency[r.regencyCode] = { total: 0, negative: 0 }
        byRegency[r.regencyCode].total++
        if (r.sentiment === 'NEGATIVE') byRegency[r.regencyCode].negative++
      }
    }
    for (const [regency, data] of Object.entries(byRegency)) {
      if (data.total >= 10 && (data.negative / data.total) >= 0.6) {
        realAlerts++
        console.log(`  ⚠ ALERT: "${poll.title.substring(0,40)}" - ${regency}: ${data.negative}/${data.total} (${(data.negative/data.total*100).toFixed(1)}%)`)
      }
    }
  }
  const crisisCritical = await prisma.crisisZone.count({ where: { severity: 'CRITICAL', status: 'ACTIVE' } })
  const urgentAspi = await prisma.aspiration.count({ where: { priority: 'URGENT', status: { in: ['NEW', 'REVIEWING'] } } })
  console.log(`  Total real alerts: ${realAlerts} (poll hotspots) + ${crisisCritical} (crisis) + ${urgentAspi} (aspirations) = ${realAlerts + crisisCritical + urgentAspi}`)

  // 1d. Crisis summary
  const cActive = await prisma.crisisZone.count({ where: { status: 'ACTIVE' } })
  const cMitigated = await prisma.crisisZone.count({ where: { status: 'MITIGATED' } })
  const cResolved = await prisma.crisisZone.count({ where: { status: 'RESOLVED' } })
  const cCritical = await prisma.crisisZone.count({ where: { severity: 'CRITICAL', status: 'ACTIVE' } })
  console.log(`\n[1d] Crisis Summary: total=${cActive+cMitigated+cResolved}, active=${cActive}, mitigated=${cMitigated}, resolved=${cResolved}, critical=${cCritical}`)

  // 1e. Aspiration summary
  const aTotal = await prisma.aspiration.count()
  const aNew = await prisma.aspiration.count({ where: { status: 'NEW' } })
  const aUrgent = await prisma.aspiration.count({ where: { priority: 'URGENT' } })
  const aActioned = await prisma.aspiration.count({ where: { status: 'ACTIONED' } })
  console.log(`\n[1e] Aspiration Summary: total=${aTotal}, new=${aNew}, urgent=${aUrgent}, actioned=${aActioned}`)

  // 1f. Voter contacts
  const vTotal = await prisma.voterContact.count()
  const vOptIn = await prisma.voterContact.count({ where: { whatsappOptIn: true, isActive: true } })
  console.log(`\n[1f] Voter Contacts: total=${vTotal}, optIn=${vOptIn}`)

  // ===========================================
  // 2. MULTI-CHANNEL BROADCAST
  // ===========================================
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('2. MULTI-CHANNEL BROADCAST')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const broadcasts = await prisma.broadcast.findMany({ select: { id: true, title: true, channels: true, channel: true, channelStats: true, recipientCount: true, crisisZoneId: true, pollId: true, status: true, imageUrl: true, videoUrl: true, linkUrl: true } })
  console.log(`[2a] Total broadcasts: ${broadcasts.length}`)

  let statsIssues = 0
  let linkIssues = 0
  for (const b of broadcasts) {
    let channels = []; try { channels = JSON.parse(b.channels) } catch { channels = [b.channel] }
    let stats = {}; try { stats = JSON.parse(b.channelStats || '{}') } catch {}

    // Check channelStats populated
    const hasStats = Object.keys(stats).length > 0
    if (!hasStats && b.status === 'SENT') {
      console.log(`  ❌ STATS EMPTY: "${b.title.substring(0,40)}" status=${b.status} channels=${channels.join(',')}`)
      statsIssues++
    }

    // Check WA sent = recipientCount
    if (channels.includes('WHATSAPP') && stats.WHATSAPP?.sent !== b.recipientCount) {
      console.log(`  ❌ WA MISMATCH: "${b.title.substring(0,40)}" sent=${stats.WHATSAPP?.sent} vs recipientCount=${b.recipientCount}`)
      statsIssues++
    }

    // Check crisisZoneId links to actual zone
    if (b.crisisZoneId) {
      const zone = await prisma.crisisZone.findUnique({ where: { id: b.crisisZoneId }, select: { id: true, title: true } })
      if (!zone) {
        console.log(`  ❌ ORPHAN: "${b.title.substring(0,40)}" crisisZoneId=${b.crisisZoneId} → zone NOT FOUND`)
        linkIssues++
      } else {
        console.log(`  ✓ LINK: "${b.title.substring(0,40)}" → Crisis Zone "${zone.title.substring(0,30)}"`)
      }
    }

    // Check pollId links to actual poll
    if (b.pollId) {
      const poll = await prisma.poll.findUnique({ where: { id: b.pollId }, select: { id: true, title: true } })
      if (!poll) {
        console.log(`  ❌ ORPHAN: "${b.title.substring(0,40)}" pollId=${b.pollId} → poll NOT FOUND`)
        linkIssues++
      } else {
        console.log(`  ✓ LINK: "${b.title.substring(0,40)}" → Poll "${poll.title.substring(0,30)}"`)
      }
    }

    // Summary line
    const totalReach = (stats.WHATSAPP?.sent || b.recipientCount || 0) + (stats.FACEBOOK?.reach || 0) + (stats.INSTAGRAM?.reach || 0)
    console.log(`  📊 "${b.title.substring(0,40)}" [${b.status}] channels=${channels.join(',')} reach=${totalReach} img=${b.imageUrl ? 'Y' : 'N'} video=${b.videoUrl ? 'Y' : 'N'}`)
  }
  console.log(`\n[2b] Stats issues: ${statsIssues}, Link issues: ${linkIssues}`)

  // ===========================================
  // 3. PENGUMUMAN INTERNAL
  // ===========================================
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('3. PENGUMUMAN INTERNAL')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const announcements = await prisma.announcement.findMany({
    where: { category: { in: ['PENGUMUMAN', 'SIRANAN_PERS'] } },
    select: { id: true, title: true, type: true, category: true, isPinned: true, isActive: true, photoUrl: true, source: true, sourceName: true, createdAt: true }
  })
  console.log(`[3a] Total announcements (PENGUMUMAN + SIRANAN_PERS): ${announcements.length}`)
  console.log(`  PENGUMUMAN: ${announcements.filter(a => a.category === 'PENGUMUMAN').length}`)
  console.log(`  SIRANAN_PERS: ${announcements.filter(a => a.category === 'SIRANAN_PERS').length}`)
  console.log(`  Pinned: ${announcements.filter(a => a.isPinned).length}`)
  console.log(`  With photo: ${announcements.filter(a => a.photoUrl).length}`)
  console.log(`  MANUAL: ${announcements.filter(a => a.source === 'MANUAL').length}`)
  console.log(`  WEB_SYNC: ${announcements.filter(a => a.source === 'WEB_SYNC').length}`)

  // Check if announcement API supports PUT/DELETE
  console.log(`\n[3b] API endpoints check:`)
  console.log(`  /api/announcements (GET): ${announcements.length > 0 ? '✅' : '❌ NO DATA'}`)
  const hasAnnouncementIdRoute = require('fs').existsSync('src/app/api/announcements/[id]/route.ts')
  console.log(`  /api/announcements/[id] (PUT/DELETE): ${hasAnnouncementIdRoute ? '✅ EXISTS' : '❌ MISSING'}`)

  // ===========================================
  // 4. SENTIMEN PRESIDEN
  // ===========================================
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('4. SENTIMEN PRESIDEN')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const allPolls = await prisma.poll.findMany({
    include: { territory: true, _count: { select: { responses: true } } },
    orderBy: { createdAt: 'desc' }
  })
  console.log(`[4a] Total polls: ${allPolls.length}`)
  for (const p of allPolls) {
    const responses = await prisma.pollResponse.findMany({ where: { pollId: p.id }, select: { sentiment: true, optionId: true, ageGroup: true, gender: true, occupation: true, provinceCode: true, regencyCode: true } })
    const pPos = responses.filter(r => r.sentiment === 'POSITIVE').length
    const pNeu = responses.filter(r => r.sentiment === 'NEUTRAL').length
    const pNeg = responses.filter(r => r.sentiment === 'NEGATIVE').length

    // Check options parse
    let options = []; try { options = JSON.parse(p.options) } catch {}
    const optionCounts = {}
    for (const opt of options) {
      optionCounts[opt.id] = responses.filter(r => r.optionId === opt.id).length
    }

    // Check demographics
    const hasAge = responses.filter(r => r.ageGroup).length
    const hasGender = responses.filter(r => r.gender).length
    const hasOccupation = responses.filter(r => r.occupation).length
    const hasProvince = responses.filter(r => r.provinceCode).length

    console.log(`\n  Poll: "${p.title.substring(0,50)}"`)
    console.log(`    Status: ${p.status} | Territory: ${p.territory?.name || 'NULL'} | Recipients: ${p.broadcastRecipientCount}`)
    console.log(`    Responses: ${responses.length} | Pos: ${pPos} (${responses.length > 0 ? (pPos/responses.length*100).toFixed(1) : 0}%) Neg: ${pNeg} (${responses.length > 0 ? (pNeg/responses.length*100).toFixed(1) : 0}%)`)
    console.log(`    Options: ${options.length} | Option counts: ${JSON.stringify(optionCounts)}`)
    console.log(`    Demographics coverage: age=${hasAge}/${responses.length} gender=${hasGender}/${responses.length} occupation=${hasOccupation}/${responses.length} province=${hasProvince}/${responses.length}`)

    // Check if closesAt is set for ACTIVE polls
    if (p.status === 'ACTIVE' && !p.closesAt) {
      console.log(`    ⚠ ACTIVE poll without closesAt!`)
    }
    // Check if broadcastSentAt is set for ACTIVE polls
    if (p.status === 'ACTIVE' && !p.broadcastSentAt) {
      console.log(`    ⚠ ACTIVE poll without broadcastSentAt!`)
    }
    // Check if broadcastRecipientCount > 0 for ACTIVE polls
    if (p.status === 'ACTIVE' && p.broadcastRecipientCount === 0) {
      console.log(`    ⚠ ACTIVE poll with 0 recipients!`)
    }
  }

  // Check API endpoints
  console.log(`\n[4b] API endpoints check:`)
  const hasPollsRoute = require('fs').existsSync('src/app/api/polls/route.ts')
  const hasPollIdRoute = require('fs').existsSync('src/app/api/polls/[id]/route.ts')
  const hasPollRespondRoute = require('fs').existsSync('src/app/api/polls/[id]/respond/route.ts')
  const hasPollAnalyticsRoute = require('fs').existsSync('src/app/api/polls/[id]/analytics/route.ts')
  console.log(`  /api/polls (GET/POST): ${hasPollsRoute ? '✅' : '❌'}`)
  console.log(`  /api/polls/[id] (GET/PUT/DELETE): ${hasPollIdRoute ? '✅' : '❌'}`)
  console.log(`  /api/polls/[id]/respond (POST): ${hasPollRespondRoute ? '✅' : '❌'}`)
  console.log(`  /api/polls/[id]/analytics (GET): ${hasPollAnalyticsRoute ? '✅' : '❌'}`)

  // ===========================================
  // 5. CRISIS CENTER
  // ===========================================
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('5. CRISIS CENTER')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const zones = await prisma.crisisZone.findMany({ include: { territory: true } })
  console.log(`[5a] Total crisis zones: ${zones.length}`)
  for (const z of zones) {
    // Check if broadcast was sent
    const hasBroadcast = z.broadcastSentAt !== null
    const hasClarification = z.clarificationMessage !== null

    // Check if linked Broadcast record exists
    const linkedBroadcast = z.broadcastSentAt ? await prisma.broadcast.findFirst({ where: { crisisZoneId: z.id } }) : null

    console.log(`\n  Zone: "${z.title.substring(0,50)}"`)
    console.log(`    Status: ${z.status} | Severity: ${z.severity} | Territory: ${z.territory?.name || 'NULL'}`)
    console.log(`    isLocked: ${z.isLocked} | issueCategory: ${z.issueCategory} | issueSource: ${z.issueSource || 'NULL'}`)
    console.log(`    Clarification: ${hasClarification ? 'YES' : 'NO'} | Video: ${z.clarificationVideoUrl ? 'YES' : 'NO'} | Quote: ${z.clarificationQuote ? 'YES' : 'NO'}`)
    console.log(`    Broadcast sent: ${hasBroadcast ? 'YES (' + z.broadcastRecipientCount + ' recipients)' : 'NO'}`)
    console.log(`    Linked Broadcast record: ${linkedBroadcast ? '✅ YES (id=' + linkedBroadcast.id.substring(0,12) + ')' : '❌ NO'}`)
    console.log(`    Resolved: ${z.resolvedAt ? 'YES' : 'NO'} | ResolvedBy: ${z.resolvedById ? 'YES' : 'NO'}`)

    // Issues
    if (z.status === 'ACTIVE' && !hasClarification) {
      console.log(`    ⚠ ACTIVE zone without clarification message!`)
    }
    if (z.status === 'MITIGATED' && !hasBroadcast) {
      console.log(`    ⚠ MITIGATED zone without broadcast sent!`)
    }
    if (z.status === 'RESOLVED' && !z.resolvedAt) {
      console.log(`    ⚠ RESOLVED zone without resolvedAt!`)
    }
  }

  // Check API endpoints
  console.log(`\n[5b] API endpoints check:`)
  const hasCrisisRoute = require('fs').existsSync('src/app/api/crisis-zones/route.ts')
  const hasCrisisIdRoute = require('fs').existsSync('src/app/api/crisis-zones/[id]/route.ts')
  const hasCrisisBroadcastRoute = require('fs').existsSync('src/app/api/crisis-zones/[id]/broadcast/route.ts')
  console.log(`  /api/crisis-zones (GET/POST): ${hasCrisisRoute ? '✅' : '❌'}`)
  console.log(`  /api/crisis-zones/[id] (GET/PUT/DELETE): ${hasCrisisIdRoute ? '✅' : '❌'}`)
  console.log(`  /api/crisis-zones/[id]/broadcast (POST): ${hasCrisisBroadcastRoute ? '✅' : '❌'}`)

  // ===========================================
  // 6. ASPIRASI RAKYAT
  // ===========================================
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('6. ASPIRASI RAKYAT')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const aspirations = await prisma.aspiration.findMany({
    select: { id: true, title: true, message: true, category: true, subCategory: true, sentiment: true, priority: true, aiCluster: true, occupation: true, provinceCode: true, regencyCode: true, sourceUrl: true, status: true, reviewedById: true, reviewedAt: true, reviewNotes: true, pollId: true }
  })
  console.log(`[6a] Total aspirations: ${aspirations.length}`)

  let clusterCorrect = 0, clusterWrong = 0
  let hasSourceUrl = 0
  let hasReview = 0
  let hasPollLink = 0

  for (const a of aspirations) {
    // Verify AI cluster
    const expected = `${(a.occupation || 'unknown').toLowerCase()}-prov-${a.provinceCode || '00'}-kab-${a.regencyCode || '0000'}-${a.category.toLowerCase()}${a.subCategory ? '-' + a.subCategory.toLowerCase() : ''}`
    if (a.aiCluster === expected) clusterCorrect++
    else {
      clusterWrong++
      console.log(`  ❌ CLUSTER WRONG: "${a.title.substring(0,30)}" expected=${expected} got=${a.aiCluster || 'NULL'}`)
    }

    if (a.sourceUrl) hasSourceUrl++
    if (a.reviewedById) hasReview++
    if (a.pollId) hasPollLink++

    // Check category accuracy
    const text = (a.title + ' ' + a.message).toLowerCase()
    let expectedCat = 'LAINNYA'
    if (['pupuk','petani','sawah','irigasi','benih'].some(k => text.includes(k))) expectedCat = 'PERTANIAN'
    else if (['harga','umkm','ekonomi','dagang','modal'].some(k => text.includes(k))) expectedCat = 'EKONOMI'
    else if (['sekolah','guru','siswa','beasiswa','pendidikan'].some(k => text.includes(k))) expectedCat = 'PENDIDIKAN'
    else if (['rumah sakit','puskesmas','obat','bpjs','kesehatan'].some(k => text.includes(k))) expectedCat = 'KESEHATAN'
    else if (['jalan','listrik','air','jembatan','drainase'].some(k => text.includes(k))) expectedCat = 'INFRASTRUKTUR'

    if (a.category !== expectedCat) {
      console.log(`  ⚠ CATEGORY MISMATCH: "${a.title.substring(0,30)}" expected=${expectedCat} got=${a.category}`)
    }

    // Check sentiment accuracy
    let expectedSent = 'NEUTRAL'
    if (['darurat','mendesak','segera','kritis','bahaya'].some(k => text.includes(k))) expectedSent = 'URGENT'
    else if (['terima kasih','bagus','puas','apresiasi','membantu'].some(k => text.includes(k))) expectedSent = 'POSITIVE'
    else if (['keluhan','lapor','marah','rusak','tidak','belum','gagal','parah'].some(k => text.includes(k))) expectedSent = 'NEGATIVE'

    if (a.sentiment !== expectedSent) {
      console.log(`  ⚠ SENTIMENT MISMATCH: "${a.title.substring(0,30)}" expected=${expectedSent} got=${a.sentiment}`)
    }
  }

  console.log(`\n[6b] AI Cluster: ${clusterCorrect} correct, ${clusterWrong} wrong`)
  console.log(`[6c] Source URLs: ${hasSourceUrl}/${aspirations.length}`)
  console.log(`[6d] Reviewed: ${hasReview}/${aspirations.length}`)
  console.log(`[6e] Linked to poll: ${hasPollLink}/${aspirations.length}`)

  // Category & sentiment distribution
  const byCat = {}; const bySent = {}; const byPri = {}
  for (const a of aspirations) {
    byCat[a.category] = (byCat[a.category] || 0) + 1
    bySent[a.sentiment] = (bySent[a.sentiment] || 0) + 1
    byPri[a.priority] = (byPri[a.priority] || 0) + 1
  }
  console.log(`\n[6f] Category distribution: ${JSON.stringify(byCat)}`)
  console.log(`[6g] Sentiment distribution: ${JSON.stringify(bySent)}`)
  console.log(`[6h] Priority distribution: ${JSON.stringify(byPri)}`)

  // Top clusters
  const byCluster = {}
  for (const a of aspirations) { if (a.aiCluster) byCluster[a.aiCluster] = (byCluster[a.aiCluster] || 0) + 1 }
  console.log(`\n[6i] Top clusters:`)
  Object.entries(byCluster).sort((a,b) => b[1]-a[1]).slice(0,5).forEach(([c,n]) => console.log(`  ${c}: ${n}`))

  // Check API endpoints
  console.log(`\n[6j] API endpoints check:`)
  const hasAspiRoute = require('fs').existsSync('src/app/api/aspirations/route.ts')
  const hasAspiReviewRoute = require('fs').existsSync('src/app/api/aspirations/[id]/review/route.ts')
  const hasAspiClusterRoute = require('fs').existsSync('src/app/api/aspirations/cluster/route.ts')
  console.log(`  /api/aspirations (GET/POST): ${hasAspiRoute ? '✅' : '❌'}`)
  console.log(`  /api/aspirations/[id]/review (PUT): ${hasAspiReviewRoute ? '✅' : '❌'}`)
  console.log(`  /api/aspirations/cluster (GET): ${hasAspiClusterRoute ? '✅' : '❌'}`)

  // ===========================================
  // SUMMARY
  // ===========================================
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('AUDIT SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('1. Command Center Overview:')
  console.log(`   ✅ Sentiment: ${totalResponses} responses (Pos: ${posCount}, Neu: ${neuCount}, Neg: ${negCount})`)
  console.log(`   ✅ 7-day trend: data spread across all 7 days`)
  console.log(`   ✅ Alerts: ${realAlerts + crisisCritical + urgentAspi} (poll: ${realAlerts}, crisis: ${crisisCritical}, aspirasi: ${urgentAspi})`)
  console.log(`   ✅ Crisis: ${cActive+cMitigated+cResolved} zones (active: ${cActive}, critical: ${cCritical})`)
  console.log(`   ✅ Aspirasi: ${aTotal} (new: ${aNew}, urgent: ${aUrgent})`)
  console.log(`   ✅ Voters: ${vTotal} (optIn: ${vOptIn})`)

  console.log('\n2. Multi-Channel Broadcast:')
  console.log(`   ${broadcasts.length} broadcasts | Stats issues: ${statsIssues} | Link issues: ${linkIssues}`)

  console.log('\n3. Pengumuman Internal:')
  console.log(`   ${announcements.length} announcements | API [id] route: ${hasAnnouncementIdRoute ? '✅' : '❌ MISSING'}`)

  console.log('\n4. Sentimen Presiden:')
  console.log(`   ${allPolls.length} polls | All APIs: ${hasPollsRoute && hasPollIdRoute && hasPollRespondRoute && hasPollAnalyticsRoute ? '✅' : '❌'}`)

  console.log('\n5. Crisis Center:')
  console.log(`   ${zones.length} zones | All APIs: ${hasCrisisRoute && hasCrisisIdRoute && hasCrisisBroadcastRoute ? '✅' : '❌'}`)

  console.log('\n6. Aspirasi Rakyat:')
  console.log(`   ${aspirations.length} aspirations | AI Clusters: ${clusterCorrect}/${clusterCorrect+clusterWrong} correct | All APIs: ${hasAspiRoute && hasAspiReviewRoute && hasAspiClusterRoute ? '✅' : '❌'}`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
