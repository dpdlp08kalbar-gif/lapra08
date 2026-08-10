// Test DDG scraper
process.env.TZ = 'Asia/Jakarta'

import { scrapeSocialMediaViaDDG } from '../src/lib/ddg-scraper'

async function main() {
  console.log('=== Testing DuckDuckGo scraper for DIRECT social media URLs ===\n')
  const t0 = Date.now()
  const results = await scrapeSocialMediaViaDDG(['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'TWITTER_X'])
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(`✓ Fetched ${results.length} REAL direct social media URLs in ${elapsed}s\n`)

  const byPlatform: Record<string, number> = {}
  for (const r of results) {
    byPlatform[r.platform] = (byPlatform[r.platform] || 0) + 1
  }
  console.log('=== Results per platform ===')
  for (const [p, c] of Object.entries(byPlatform)) {
    console.log(`  ${p}: ${c}`)
  }

  console.log('\n=== First 10 REAL social media posts ===')
  for (const r of results.slice(0, 10)) {
    console.log(`\n[${r.platform}] ${r.author || 'unknown'}`)
    console.log(`  Title: ${r.title.substring(0, 120)}`)
    console.log(`  Snippet: ${r.snippet.substring(0, 200)}`)
    console.log(`  URL: ${r.url}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
