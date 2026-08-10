// LAPRA 08 - Deep Audit: Komunikasi & Command Center
// Bandingkan setiap angka di UI dengan data sebenarnya di DB
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== DEEP AUDIT: Komunikasi & Command Center ===\n')

  // ===========================================
  // 1. COMMAND CENTER OVERVIEW
  // ===========================================
  console.log('--- 1. COMMAND CENTER OVERVIEW ---\n')
  
  // Sentiment summary
  const totalResponses = await prisma.pollResponse.count()
  const positiveCount = await prisma.pollResponse.count({ where: { sentiment: 'POSITIVE' } })
  const neutralCount = await prisma.pollResponse.count({ where: { sentiment: 'NEUTRAL' } })
  const negativeCount = await prisma.pollResponse.count({ where: { sentiment: 'NEGATIVE' } })
  
  console.log('Sentiment Summary:')
  console.log(`  Total Responses: ${totalResponses}`)
  console.log(`  Positive: ${positiveCount} (${totalResponses > 0 ? (positiveCount/totalResponses*100).toFixed(1) : 0}%)`)
  console.log(`  Neutral: ${neutralCount} (${totalResponses > 0 ? (neutralCount/totalResponses*100).toFixed(1) : 0}%)`)
  console.log(`  Negative: ${negativeCount} (${totalResponses > 0 ? (negativeCount/totalResponses*100).toFixed(1) : 0}%)`)
  
  // Check: apakah ada poll dengan sentimen negatif >60% di region tertentu?
  console.log('\n  --- Checking High Negative Sentiment per Region ---')
  const polls = await prisma.poll.findMany({ where: { status: 'ACTIVE' }, select: { id: true, title: true } })
  let realAlerts = 0
  for (const poll of polls) {
    const responses = await prisma.pollResponse.findMany({
      where: { pollId: poll.id },
      select: { sentiment: true, regencyCode: true }
    })
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
        console.log(`  ⚠ ALERT: Poll "${poll.title.substring(0, 40)}" - Regency ${regency}: ${data.negative}/${data.total} (${(data.negative/data.total*100).toFixed(1)}%) negative`)
      }
    }
  }
  console.log(`  Total REAL alerts (negatif >60%): ${realAlerts}`)
  
  // Crisis zones
  const crisisActive = await prisma.crisisZone.count({ where: { status: 'ACTIVE' } })
  const crisisMitigated = await prisma.crisisZone.count({ where: { status: 'MITIGATED' } })
  const crisisResolved = await prisma.crisisZone.count({ where: { status: 'RESOLVED' } })
  const crisisCritical = await prisma.crisisZone.count({ where: { severity: 'CRITICAL', status: 'ACTIVE' } })
  console.log(`\nCrisis Summary:`)
  console.log(`  Active: ${crisisActive}, Mitigated: ${crisisMitigated}, Resolved: ${crisisResolved}, Critical: ${crisisCritical}`)
  
  // Crisis zones detail
  const zones = await prisma.crisisZone.findMany({ include: { territory: true } })
  console.log(`\n  Crisis Zones Detail:`)
  for (const z of zones) {
    console.log(`  - [${z.status}/${z.severity}] ${z.title.substring(0, 50)} | Territory: ${z.territory?.name || 'NULL'} | broadcastRecipientCount: ${z.broadcastRecipientCount}`)
  }
  
  // Aspirations
  const aspiTotal = await prisma.aspiration.count()
  const aspiNew = await prisma.aspiration.count({ where: { status: 'NEW' } })
  const aspiUrgent = await prisma.aspiration.count({ where: { priority: 'URGENT' } })
  const aspiActioned = await prisma.aspiration.count({ where: { status: 'ACTIONED' } })
  console.log(`\nAspiration Summary:`)
  console.log(`  Total: ${aspiTotal}, New: ${aspiNew}, Urgent: ${aspiUrgent}, Actioned: ${aspiActioned}`)
  
  // Voter contacts
  const voterTotal = await prisma.voterContact.count()
  const voterOptIn = await prisma.voterContact.count({ where: { whatsappOptIn: true, isActive: true } })
  console.log(`\nVoter Contacts:`)
  console.log(`  Total: ${voterTotal}, Opt-in: ${voterOptIn}`)
  console.log(`  Response Rate claimed: ${voterTotal > 0 ? (totalResponses/voterTotal*100).toFixed(1) : 0}%`)
  
  // Broadcasts
  const broadcasts = await prisma.broadcast.findMany({ select: { id: true, title: true, channels: true, channelStats: true, recipientCount: true, crisisZoneId: true, pollId: true } })
  console.log(`\nBroadcasts: ${broadcasts.length}`)
  let totalReachFromBroadcasts = 0
  for (const b of broadcasts) {
    let stats = {}
    try { stats = JSON.parse(b.channelStats || '{}') } catch {}
    const waReach = stats.WHATSAPP?.sent || b.recipientCount || 0
    const fbReach = stats.FACEBOOK?.reach || 0
    const igReach = stats.INSTAGRAM?.reach || 0
    const totalReach = waReach + fbReach + igReach
    totalReachFromBroadcasts += totalReach
    let channels = []
    try { channels = JSON.parse(b.channels) } catch { channels = [b.channel] }
    console.log(`  - "${b.title.substring(0, 40)}..." | channels: ${channels.join(',')} | reach: ${totalReach} | crisisZoneId: ${b.crisisZoneId || 'NULL'} | pollId: ${b.pollId || 'NULL'}`)
  }
  console.log(`  Total Reach from all broadcasts: ${totalReachFromBroadcasts}`)
  
  // ===========================================
  // 2. SENTIMEN PRESIDEN - Poll Analytics
  // ===========================================
  console.log('\n\n--- 2. SENTIMEN PRESIDEN - Poll Analytics ---\n')
  
  for (const poll of polls) {
    const responses = await prisma.pollResponse.findMany({
      where: { pollId: poll.id },
      select: { sentiment: true, optionId: true, ageGroup: true, gender: true, occupation: true, provinceCode: true, regencyCode: true, submittedAt: true }
    })
    
    const pPositive = responses.filter(r => r.sentiment === 'POSITIVE').length
    const pNeutral = responses.filter(r => r.sentiment === 'NEUTRAL').length
    const pNegative = responses.filter(r => r.sentiment === 'NEGATIVE').length
    
    // Demographic breakdown
    const byAge = {}
    const byGender = { L: 0, P: 0 }
    const byOccupation = {}
    const byProvince = {}
    for (const r of responses) {
      if (r.ageGroup) byAge[r.ageGroup] = (byAge[r.ageGroup] || 0) + 1
      if (r.gender) byGender[r.gender] = (byGender[r.gender] || 0) + 1
      if (r.occupation) byOccupation[r.occupation] = (byOccupation[r.occupation] || 0) + 1
      if (r.provinceCode) byProvince[r.provinceCode] = (byProvince[r.provinceCode] || 0) + 1
    }
    
    console.log(`Poll: "${poll.title.substring(0, 50)}..."`)
    console.log(`  Total: ${responses.length} | Pos: ${pPositive} (${responses.length > 0 ? (pPositive/responses.length*100).toFixed(1) : 0}%) | Neu: ${pNeutral} | Neg: ${pNegative}`)
    console.log(`  By Age: ${JSON.stringify(byAge)}`)
    console.log(`  By Gender: ${JSON.stringify(byGender)}`)
    console.log(`  By Occupation: ${JSON.stringify(byOccupation)}`)
    console.log(`  By Province: ${JSON.stringify(byProvince)}`)
    
    // Check if any regency has >60% negative
    const byRegency = {}
    for (const r of responses) {
      if (r.regencyCode) {
        if (!byRegency[r.regencyCode]) byRegency[r.regencyCode] = { total: 0, negative: 0 }
        byRegency[r.regencyCode].total++
        if (r.sentiment === 'NEGATIVE') byRegency[r.regencyCode].negative++
      }
    }
    for (const [regency, data] of Object.entries(byRegency)) {
      const pct = (data.negative / data.total * 100).toFixed(1)
      if (data.total >= 5) {
        console.log(`  Regency ${regency}: ${data.negative}/${data.total} (${pct}%) negative ${pct >= 60 ? '⚠ ALERT' : ''}`)
      }
    }
    console.log('')
  }
  
  // ===========================================
  // 3. ASPIRASI RAKYAT - AI Clustering
  // ===========================================
  console.log('--- 3. ASPIRASI RAKYAT - AI Clustering Verification ---\n')
  
  const aspirations = await prisma.aspiration.findMany({
    select: { id: true, title: true, message: true, category: true, subCategory: true, sentiment: true, priority: true, aiCluster: true, occupation: true, provinceCode: true, regencyCode: true }
  })
  
  console.log(`Total Aspirations: ${aspirations.length}`)
  
  // Verify AI clustering is correct
  let correctClusters = 0
  let wrongClusters = 0
  for (const a of aspirations) {
    const expectedCluster = `${(a.occupation || 'unknown').toLowerCase()}-prov-${a.provinceCode || '00'}-kab-${a.regencyCode || '0000'}-${a.category.toLowerCase()}${a.subCategory ? '-' + a.subCategory.toLowerCase() : ''}`
    if (a.aiCluster === expectedCluster) {
      correctClusters++
    } else {
      wrongClusters++
      console.log(`  ❌ WRONG CLUSTER: "${a.title.substring(0, 30)}..."`)
      console.log(`     Expected: ${expectedCluster}`)
      console.log(`     Got:      ${a.aiCluster || 'NULL'}`)
    }
  }
  console.log(`\nAI Cluster Verification: ${correctClusters} correct, ${wrongClusters} wrong`)
  
  // Category distribution
  const byCategory = {}
  for (const a of aspirations) {
    byCategory[a.category] = (byCategory[a.category] || 0) + 1
  }
  console.log(`\nCategory Distribution: ${JSON.stringify(byCategory)}`)
  
  // Sentiment distribution
  const bySentiment = {}
  for (const a of aspirations) {
    bySentiment[a.sentiment] = (bySentiment[a.sentiment] || 0) + 1
  }
  console.log(`Sentiment Distribution: ${JSON.stringify(bySentiment)}`)
  
  // Top clusters
  const byCluster = {}
  for (const a of aspirations) {
    if (a.aiCluster) byCluster[a.aiCluster] = (byCluster[a.aiCluster] || 0) + 1
  }
  const topClusters = Object.entries(byCluster).sort((a, b) => b[1] - a[1]).slice(0, 5)
  console.log(`\nTop 5 Clusters:`)
  for (const [cluster, count] of topClusters) {
    console.log(`  ${cluster}: ${count}`)
  }
  
  // ===========================================
  // 4. BROADCAST - Channel Stats Verification
  // ===========================================
  console.log('\n\n--- 4. BROADCAST - Channel Stats Verification ---\n')
  
  for (const b of broadcasts) {
    let channels = []
    let stats = {}
    try { channels = JSON.parse(b.channels) } catch { channels = [b.channel] }
    try { stats = JSON.parse(b.channelStats || '{}') } catch {}
    
    console.log(`Broadcast: "${b.title.substring(0, 50)}..."`)
    console.log(`  Channels: ${channels.join(', ')}`)
    console.log(`  Recipient Count: ${b.recipientCount}`)
    
    for (const ch of channels) {
      const chStats = stats[ch] || {}
      console.log(`  ${ch} stats: ${JSON.stringify(chStats)}`)
      
      // Verify: WA sent should equal recipientCount
      if (ch === 'WHATSAPP' && chStats.sent !== b.recipientCount) {
        console.log(`    ❌ MISMATCH: WA sent (${chStats.sent}) != recipientCount (${b.recipientCount})`)
      }
      // Verify: FB reach should be > WA sent (FB has higher organic reach)
      if (ch === 'FACEBOOK' && chStats.reach > 0 && b.recipientCount > 0) {
        const ratio = chStats.reach / b.recipientCount
        if (ratio < 1 || ratio > 10) {
          console.log(`    ⚠ SUSPICIOUS: FB reach (${chStats.reach}) / recipientCount (${b.recipientCount}) = ${ratio.toFixed(2)}`)
        }
      }
    }
    console.log('')
  }
  
  // ===========================================
  // 5. SUMMARY
  // ===========================================
  console.log('=== AUDIT SUMMARY ===\n')
  console.log(`Total Polls: ${polls.length}`)
  console.log(`Total Poll Responses: ${totalResponses}`)
  console.log(`Real Alerts (negatif >60%): ${realAlerts}`)
  console.log(`Crisis Zones: ${crisisActive + crisisMitigated + crisisResolved} (Active: ${crisisActive}, Mitigated: ${crisisMitigated}, Resolved: ${crisisResolved})`)
  console.log(`Aspirations: ${aspiTotal} (AI Clusters: ${correctClusters} correct, ${wrongClusters} wrong)`)
  console.log(`Broadcasts: ${broadcasts.length}`)
  console.log(`Voter Contacts: ${voterTotal}`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
