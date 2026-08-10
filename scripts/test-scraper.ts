// Quick test: scrapeAllPlatforms and report what we got
process.env.TZ = 'Asia/Jakarta'

import { scrapeAllPlatforms, buildComplaint } from '../src/lib/social-scraper'

async function main() {
  console.log('=== Testing REAL scraper ===')
  console.log('Fetching from Google News RSS with site: filters per platform...\n')

  const t0 = Date.now()
  const mentions = await scrapeAllPlatforms(
    ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'TWITTER_X', 'GOOGLE'],
    {},
  )
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(`✓ Fetched ${mentions.length} REAL mentions in ${elapsed}s\n`)

  // Group by platform
  const byPlatform: Record<string, number> = {}
  for (const m of mentions) {
    byPlatform[m.platform] = (byPlatform[m.platform] || 0) + 1
  }
  console.log('=== Mentions per platform ===')
  for (const [p, c] of Object.entries(byPlatform)) {
    console.log(`  ${p}: ${c}`)
  }

  // Build complaints and report
  console.log('\n=== First 10 complaints (REAL data) ===')
  const complaints = mentions.slice(0, 10).map(buildComplaint)
  complaints.forEach((c, i) => {
    console.log(`\n--- #${i + 1} ---`)
    console.log(`Platform: ${c.platform}`)
    console.log(`Author: ${c.author}`)
    console.log(`Title/Content: ${c.content.substring(0, 120)}...`)
    console.log(`URL: ${c.url}`)
    console.log(`Location: ${c.provinceName || '-'} / ${c.regencyName || '-'}`)
    console.log(`Priority: ${c.priority} (urgency ${c.urgencyScore})`)
    console.log(`Category: ${c.category} | Sentiment: ${c.sentiment}`)
    console.log(`Engagement est: ${c.engagementCount}`)
    console.log(`AI Rec: ${c.aiRecommendation?.substring(0, 100)}...`)
  })

  // Sentiment / priority distribution
  const all = mentions.map(buildComplaint)
  const neg = all.filter(c => c.sentiment === 'NEGATIVE').length
  const pos = all.filter(c => c.sentiment === 'POSITIVE').length
  const neu = all.filter(c => c.sentiment === 'NEUTRAL').length
  const high = all.filter(c => c.priority === 'HIGH').length
  const med = all.filter(c => c.priority === 'MEDIUM').length
  const low = all.filter(c => c.priority === 'LOW').length
  console.log(`\n=== Distribution ===`)
  console.log(`Sentiment: ${neg} NEGATIVE, ${neu} NEUTRAL, ${pos} POSITIVE`)
  console.log(`Priority:  ${high} HIGH, ${med} MEDIUM, ${low} LOW`)
}

main().catch(e => { console.error(e); process.exit(1) })
