const fs = require('fs')
const files = []
for (let i = 1; i <= 12; i++) files.push(`scripts/img${i}.json`)

const allResults = []
for (const f of files) {
  try {
    const raw = fs.readFileSync(f, 'utf8')
    // Strip emoji progress lines, keep only JSON portion
    const jsonStart = raw.indexOf('{')
    const jsonEnd = raw.lastIndexOf('}')
    if (jsonStart < 0 || jsonEnd < 0) { console.log(`${f}: no JSON`); continue }
    const jsonStr = raw.substring(jsonStart, jsonEnd + 1)
    const d = JSON.parse(jsonStr)
    if (d.success && d.results) {
      console.log(`${f}: ${d.results.length} results`)
      d.results.forEach(r => allResults.push({ ...r, _q: d.query }))
    } else {
      console.log(`${f}: failed - ${d.error || 'no results'}`)
    }
  } catch(e) { console.log(`${f} error: ${e.message}`) }
}

const seen = new Set()
const unique = allResults.filter(r => {
  if (seen.has(r.original_url)) return false
  seen.add(r.original_url)
  return true
})
console.log(`\nTotal: ${allResults.length}, Unique: ${unique.length}`)
fs.writeFileSync('scripts/all_images.json', JSON.stringify(unique, null, 2))
unique.forEach((r,i) => console.log(`${i+1}. [${r.original_width}x${r.original_height}] ${r.source} | ${r.original_url}`))
