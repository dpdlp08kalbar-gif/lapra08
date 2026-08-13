import fs from 'fs'

(async () => {
  // Use the legacy build (CommonJS-compatible, works in Node.js without DOMMatrix)
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
  console.log('pdfjs-dist loaded')

  const buffer = fs.readFileSync('/home/z/my-project/upload/016 SK LP08 DPD KALIMANTAN BARAT (Rev)(1) 2.pdf')
  const data = new Uint8Array(buffer)

  const doc = await pdfjs.getDocument({ data }).promise
  console.log('PDF loaded, pages:', doc.numPages)

  let fullText = ''
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const text = content.items.map(item => item.str).join(' ')
    fullText += text + '\n'
  }

  console.log('Text length:', fullText.length)
  console.log('First 500 chars:', fullText.substring(0, 500))

  const lines = fullText.split('\n')
  const pengurusLines = lines.filter(l => /\b(Ketua|Sekretaris|Bendahara|Humas|Bidang|Wakil)\b/i.test(l))
  console.log('\n=== Pengurus Lines ===')
  pengurusLines.slice(0, 10).forEach(l => console.log('  ', l.trim().substring(0, 100)))
})()
