// Test FOSS SK extractor with real PDF
import { extractPengurusFromPdfBuffer } from '../src/lib/sk-extractor'
import * as fs from 'fs'

async function test() {
  const pdfPath = '/home/z/my-project/upload/016 SK LP08 DPD KALIMANTAN BARAT (Rev)(1) 2.pdf'
  console.log(`Testing: ${pdfPath}\n`)

  const buffer = fs.readFileSync(pdfPath)
  console.log(`File size: ${buffer.length} bytes\n`)

  try {
    const result = await extractPengurusFromPdfBuffer(buffer)
    console.log('=== SK Info ===')
    console.log(JSON.stringify(result.skInfo, null, 2))
    console.log('\n=== Pengurus Extracted ===')
    console.log(`Count: ${result.pengurus.length}`)
    result.pengurus.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.fullName} — ${p.positionName}${p.phone ? ` (${p.phone})` : ''}${p.email ? ` <${p.email}>` : ''}`)
    })
    console.log('\n=== Raw Text (first 1500 chars) ===')
    console.log(result.rawText.substring(0, 1500))
    console.log('\n... (truncated)')
  } catch (e: any) {
    console.error('Test failed:', e.message)
    console.error(e.stack)
  }
}

test()
