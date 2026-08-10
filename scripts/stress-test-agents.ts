// LAPRA 08 - Stress Test untuk Multi-Agent System
// Simulate concurrent access: 10 users hit audit + map + decision simultaneously
// Verify data consistency: angka di opinion-links harus sama dengan di geospatial-voice & decision-dashboard

const BASE_URL = 'http://localhost:3000'
const USER_ID = 'cmsk0pe09003hot0gy9mfequ8' // superadmin
const HEADERS = { 'x-user-id': USER_ID, 'Content-Type': 'application/json' }

async function fetchJson(url: string, options?: any) {
  const t0 = Date.now()
  try {
    const res = await fetch(url, { ...options, headers: { ...HEADERS, ...(options?.headers || {}) }, signal: AbortSignal.timeout(60000) })
    const data = await res.json()
    return { success: res.ok, status: res.status, data, durationMs: Date.now() - t0 }
  } catch (e: any) {
    return { success: false, error: e.message, durationMs: Date.now() - t0 }
  }
}

async function main() {
  console.log('=== STRESS TEST: Multi-Agent System ===')
  console.log('Simulating 10 concurrent users hitting audit + geospatial + decision + agents endpoints\n')

  const t0 = Date.now()

  // === WAVE 1: 10 concurrent GET requests ===
  console.log('WAVE 1: 10 concurrent GET (read operations)...')
  const wave1 = await Promise.all([
    fetchJson(`${BASE_URL}/api/geospatial-voice?code=ID`),
    fetchJson(`${BASE_URL}/api/geospatial-voice?code=61`),
    fetchJson(`${BASE_URL}/api/decision-dashboard`),
    fetchJson(`${BASE_URL}/api/opinion-links?limit=20`),
    fetchJson(`${BASE_URL}/api/demographics-analytics?code=ID`),
    fetchJson(`${BASE_URL}/api/agents/status`),
    fetchJson(`${BASE_URL}/api/essay-polls`),
    fetchJson(`${BASE_URL}/api/trust-index`),
    fetchJson(`${BASE_URL}/api/opinion-map?level=PROVINCE`),
    fetchJson(`${BASE_URL}/api/audit-ai/scans`),
  ])
  
  let wave1Success = 0
  let wave1TotalMs = 0
  wave1.forEach((r, i) => {
    if (r.success) wave1Success++
    wave1TotalMs += r.durationMs
    const endpoints = ['geospatial-voice?ID', 'geospatial-voice?61', 'decision-dashboard', 'opinion-links', 'demographics', 'agents/status', 'essay-polls', 'trust-index', 'opinion-map', 'audit-ai/scans']
    console.log(`  [${r.success ? 'OK' : 'FAIL'}] ${endpoints[i]}: ${r.status || 'ERR'} ${r.durationMs}ms`)
  })
  console.log(`Wave 1: ${wave1Success}/10 success, avg ${Math.round(wave1TotalMs/10)}ms\n`)

  // === WAVE 2: Concurrent WRITE + READ mix ===
  console.log('WAVE 2: 5 concurrent reads + 2 concurrent triggers (agents/status POST + opinion-links POST)...')
  const wave2 = await Promise.all([
    fetchJson(`${BASE_URL}/api/decision-dashboard`),
    fetchJson(`${BASE_URL}/api/geospatial-voice?code=ID`),
    fetchJson(`${BASE_URL}/api/opinion-links?limit=50`),
    fetchJson(`${BASE_URL}/api/demographics-analytics?code=ID`),
    fetchJson(`${BASE_URL}/api/agents/status`),
    // Write operations
    fetchJson(`${BASE_URL}/api/agents/status`, { method: 'POST', body: JSON.stringify({ agent: 'trust' }) }),
    fetchJson(`${BASE_URL}/api/opinion-links`, { method: 'POST', body: JSON.stringify({ action: 'scrape' }) }),
  ])
  
  let wave2Success = 0
  wave2.forEach((r, i) => {
    if (r.success) wave2Success++
    const ops = ['GET decision', 'GET geospatial', 'GET opinion-links', 'GET demographics', 'GET agents', 'POST trust-recompute', 'POST opinion-scrape']
    console.log(`  [${r.success ? 'OK' : 'FAIL'}] ${ops[i]}: ${r.status || 'ERR'} ${r.durationMs}ms`)
  })
  console.log(`Wave 2: ${wave2Success}/7 success\n`)

  // === WAVE 3: Data Consistency Check ===
  console.log('WAVE 3: Data Consistency Check (cross-menu sync verification)...')
  const [opinionLinks, geospatialID, decision, demographics, trustIdx] = await Promise.all([
    fetchJson(`${BASE_URL}/api/opinion-links?limit=100`),
    fetchJson(`${BASE_URL}/api/geospatial-voice?code=ID`),
    fetchJson(`${BASE_URL}/api/decision-dashboard`),
    fetchJson(`${BASE_URL}/api/demographics-analytics?code=ID`),
    fetchJson(`${BASE_URL}/api/trust-index`),
  ])

  // Get totals from each menu
  const opinionLinksData = opinionLinks.data?.data || []
  const opinionLinksCount = opinionLinksData.length
  const opinionLinksPositives = opinionLinksData.filter((l: any) => l.sentiment === 'POSITIVE').length
  const opinionLinksNegatives = opinionLinksData.filter((l: any) => l.sentiment === 'NEGATIVE').length

  const geospatialTrustScore = geospatialID.data?.data?.trustIndex?.trustScore
  const geospatialMentions = geospatialID.data?.data?.trustIndex?.totalMentions
  const geospatialPositives = geospatialID.data?.data?.trustIndex?.sentimentPositive
  const geospatialNegatives = geospatialID.data?.data?.trustIndex?.sentimentNegative

  const decisionStats = decision.data?.data?.stats
  const decisionOpinionLinks = decisionStats?.totalOpinionLinks
  const decisionSentiment = decision.data?.data?.sentimentTrend

  const demoOverall = demographics.data?.data?.overall

  const trustIdxData = trustIdx.data?.data || []
  const trustIdxNational = trustIdxData.find((t: any) => t.territoryCode === 'ID' && !t.ageGroup && !t.communitySegment)

  console.log('  Cross-menu data comparison:')
  console.log(`    opinion-links: ${opinionLinksCount} total, +${opinionLinksPositives} -${opinionLinksNegatives}`)
  console.log(`    geospatial-voice (ID): trust=${geospatialTrustScore}, mentions=${geospatialMentions}, +${geospatialPositives} -${geospatialNegatives}`)
  console.log(`    decision-dashboard: totalOpinionLinks=${decisionOpinionLinks}, sentiment=${JSON.stringify(decisionSentiment)}`)
  console.log(`    demographics-analytics: overall trust=${demoOverall?.trustScore}, mentions=${demoOverall?.totalMentions}`)
  console.log(`    trust-index (ID): trustScore=${trustIdxNational?.trustScore}, mentions=${trustIdxNational?.totalMentions}, +${trustIdxNational?.sentimentPositive} -${trustIdxNational?.sentimentNegative}`)
  console.log()
  
  // Verify consistency
  const consistentMentions = opinionLinksCount === (geospatialMentions || 0) && opinionLinksCount === (decisionOpinionLinks || 0)
  const consistentPositives = opinionLinksPositives === (geospatialPositives || 0)
  const consistentNegatives = opinionLinksNegatives === (geospatialNegatives || 0)
  const consistentTrust = geospatialTrustScore === trustIdxNational?.trustScore && geospatialTrustScore === demoOverall?.trustScore
  
  console.log('  CONSISTENCY VERIFICATION:')
  console.log(`    ✅ Mentions count: ${consistentMentions ? 'CONSISTENT' : 'INCONSISTENT'} (opinion-links=${opinionLinksCount}, geospatial=${geospatialMentions}, decision=${decisionOpinionLinks})`)
  console.log(`    ${consistentPositives ? '✅' : '❌'} Positives count: ${consistentPositives ? 'CONSISTENT' : `opinion-links=${opinionLinksPositives}, geospatial=${geospatialPositives}`}`)
  console.log(`    ${consistentNegatives ? '✅' : '❌'} Negatives count: ${consistentNegatives ? 'CONSISTENT' : `opinion-links=${opinionLinksNegatives}, geospatial=${geospatialNegatives}`}`)
  console.log(`    ${consistentTrust ? '✅' : '⚠️'} Trust Score: ${consistentTrust ? 'CONSISTENT' : `geospatial=${geospatialTrustScore}, trust-index=${trustIdxNational?.trustScore}, demographics=${demoOverall?.trustScore}`}`)
  console.log()

  // === WAVE 4: Burst 15 simultaneous GET geospatial ===
  console.log('WAVE 4: Burst 15 simultaneous GET geospatial-voice (hot path)...')
  const wave4 = await Promise.all(Array.from({ length: 15 }, () => fetchJson(`${BASE_URL}/api/geospatial-voice?code=ID`)))
  const wave4Success = wave4.filter(r => r.success).length
  const wave4MaxMs = Math.max(...wave4.map(r => r.durationMs))
  const wave4AvgMs = Math.round(wave4.reduce((s, r) => s + r.durationMs, 0) / 15)
  console.log(`  ${wave4Success}/15 success | max ${wave4MaxMs}ms | avg ${wave4AvgMs}ms\n`)

  // === Final summary ===
  const totalElapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log('=== STRESS TEST SUMMARY ===')
  console.log(`Total elapsed: ${totalElapsed}s`)
  console.log(`Wave 1 (10 concurrent GET): ${wave1Success}/10 success`)
  console.log(`Wave 2 (mixed R/W): ${wave2Success}/7 success`)
  console.log(`Wave 3 (consistency): ${consistentMentions && consistentPositives && consistentNegatives ? 'PASS' : 'PARTIAL'} (mentions/positives/negatives cross-menu)`)
  console.log(`Wave 4 (burst 15): ${wave4Success}/15 success, avg ${wave4AvgMs}ms`)
  console.log()
  if (wave1Success === 10 && wave2Success === 7 && wave4Success === 15) {
    console.log('✅ STRESS TEST PASSED — System stable under concurrent load')
  } else {
    console.log('⚠️  STRESS TEST PARTIAL — Some requests failed')
  }
  if (consistentMentions && consistentPositives && consistentNegatives) {
    console.log('✅ DATA SYNC VERIFIED — Cross-menu data consistent (real-time sync working)')
  } else {
    console.log('❌ DATA SYNC ISSUE — Cross-menu data inconsistent')
  }
}

main().catch(e => { console.error('Stress test failed:', e); process.exit(1) })
