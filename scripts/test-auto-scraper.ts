process.env.TZ = 'Asia/Jakarta'

import { scrapeAuto } from '../src/lib/auto-scraper'

async function main() {
  console.log('=== Testing AUTO SCRAPER (zero config, no API keys) ===\n')
  const t0 = Date.now()
  const { posts, sources, skipped } = await scrapeAuto()
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(`✓ Fetched ${posts.length} REAL posts in ${elapsed}s\n`)
  console.log('=== SOURCES ===')
  sources.forEach(s => console.log(`  ✅ ${s}`))
  console.log('\n=== SKIPPED (honest) ===')
  skipped.forEach(s => console.log(`  ❌ ${s}`))

  console.log('\n=== First 5 posts ===')
  posts.slice(0, 5).forEach((p, i) => {
    console.log(`\n[${p.platform}] ${p.author}`)
    console.log(`  Title: ${p.title.substring(0, 100)}`)
    console.log(`  URL: ${p.url}`)
    console.log(`  Views/Engagement: ${p.engagementCount}`)
    console.log(`  Date: ${p.publishedAt.toISOString().split('T')[0]}`)
    console.log(`  Source: ${p.source}`)
  })
}

main().catch(e => { console.error(e); process.exit(1) })
