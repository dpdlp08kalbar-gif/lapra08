// Test web search dengan berbagai query LAPRA 08
const ZAI = require('z-ai-web-dev-sdk').default

async function main() {
  const zai = await ZAI.create()
  const queries = [
    'Laskar Prabowo 08 berita 2026',
    'LAPRA 08 sekretariat DPN',
    'Hashim Djojohadikusumo Laskar Prabowo 08',
    'Laskar Prabowo 08 majalahreformasi',
    'Laskar Prabowo tak pernah kirim proposal',
    'sekretariat DPN Laskar Prabowo 08 East Tower',
    'site:majalahreformasi.com Laskar Prabowo',
  ]
  for (const q of queries) {
    console.log(`\n=== Query: ${q} ===`)
    try {
      const results = await zai.functions.invoke('web_search', { query: q, num: 15 })
      console.log(`Found: ${results.length} results`)
      results.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i+1}. ${r.name?.substring(0, 80)}`)
        console.log(`     URL: ${r.url}`)
        console.log(`     Host: ${r.host_name}`)
        console.log(`     Snippet: ${r.snippet?.substring(0, 100)}`)
      })
    } catch (e) {
      console.log(`Error: ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 1500))
  }
}
main().catch(e => { console.error(e); process.exit(1) })
