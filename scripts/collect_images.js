const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

const files = ['/tmp/img1.json','/tmp/img2.json','/tmp/img3.json','/tmp/img4.json','/tmp/img5.json','/tmp/img6.json','/tmp/img7.json','/tmp/img8.json']
const allResults = []
for (const f of files) {
  try {
    const d = JSON.parse(fs.readFileSync(f,'utf8'))
    if (d.success && d.results) {
      console.log(`${f}: ${d.results.length} results`)
      d.results.forEach(r => allResults.push(r))
    } else {
      console.log(`${f}: failed or no results`)
    }
  } catch(e) { console.log(`${f} error: ${e.message}`) }
}
console.log(`Total unique images: ${allResults.length}`)
const seen = new Set()
const unique = allResults.filter(r => {
  if (seen.has(r.original_url)) return false
  seen.add(r.original_url)
  return true
})
console.log(`Unique: ${unique.length}`)
fs.writeFileSync('/tmp/all_images.json', JSON.stringify(unique, null, 2))
unique.forEach((r,i) => console.log(`${i+1}. ${r.original_url} | ${r.source} | ${r.original_width}x${r.original_height}`))
