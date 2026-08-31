// LAPRA 08 - Extract Pengurus from SK PDF via VLM
const ZAI = require('z-ai-web-dev-sdk').default
const fs = require('fs')
const path = require('path')

async function extractFromPage(pagePath, pageNumber) {
  const zai = await ZAI.create()
  const imageBuffer = fs.readFileSync(pagePath)
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`

  const completion = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Anda adalah asisten ahli untuk ekstraksi data pengurus organisasi Laskar Prabowo 08 dari dokumen Surat Keputusan (SK). Halaman ini adalah halaman ${pageNumber} dari SK Pengurus DPD Kalimantan Barat.

Analisis gambar SK ini dan ekstrak:
1. Info SK (nomor SK, tanggal terbit, penerbit, subjek SK)
2. Daftar pengurus yang dilantik beserta jabatannya

Kembalikan HANYA JSON dengan format:
{
  "skInfo": {
    "nomorSK": "nomor SK jika tertera di halaman ini",
    "tanggalTerbit": "YYYY-MM-DD jika ada",
    "penerbit": "nama penerbit (cth: Dr. Hashim S. Djojohadikusumo)",
    "tentang": "subjek SK (cth: Pelantikan Pengurus DPD Kalbar Periode 2024-2029)"
  },
  "pengurus": [
    {
      "fullName": "nama lengkap pengurus dengan gelar",
      "positionName": "jabatan lengkap (cth: Ketua DPD, Wakil Ketua, Sekretaris, Bendahara, Koordinator Bidang, dll)",
      "phone": "nomor telepon jika ada, atau null",
      "email": "email jika ada, atau null"
    }
  ],
  "notes": "Catatan tambahan jika ada (cth: masa bakti, pelantikan, lokasi)"
}

Jika halaman ini hanya cover/pengantar, kembalikan array pengurus kosong tapi tetap isi skInfo. Hanya kembalikan JSON, tanpa teks tambahan.`,
          },
          {
            type: 'image_url',
            image_url: { url: base64Image },
          },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })

  return completion.choices[0]?.message?.content || ''
}

async function main() {
  const pagesDir = '/tmp/sk_pages'
  const pages = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jpg')).sort()
  console.log(`Found ${pages.length} pages:`, pages)

  const allPengurus = []
  const skInfo = { nomorSK: '', tanggalTerbit: '', penerbit: '', tentang: '' }
  const notes = []

  for (const page of pages) {
    const pageNum = parseInt(page.match(/page-(\d+)/)?.[1] || '0')
    console.log(`\n=== Processing page ${pageNum} ===`)
    const response = await extractFromPage(path.join(pagesDir, page), pageNum)
    console.log(`Response (first 500 chars):`, response.substring(0, 500))
    
    // Try to parse JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.pengurus && Array.isArray(parsed.pengurus)) {
          allPengurus.push(...parsed.pengurus)
          console.log(`  Found ${parsed.pengurus.length} pengurus`)
        }
        if (parsed.skInfo) {
          if (parsed.skInfo.nomorSK) skInfo.nomorSK = parsed.skInfo.nomorSK
          if (parsed.skInfo.tanggalTerbit) skInfo.tanggalTerbit = parsed.skInfo.tanggalTerbit
          if (parsed.skInfo.penerbit) skInfo.penerbit = parsed.skInfo.penerbit
          if (parsed.skInfo.tentang) skInfo.tentang = parsed.skInfo.tentang
        }
        if (parsed.notes) notes.push(parsed.notes)
      } catch (e) {
        console.log(`  JSON parse failed: ${e.message}`)
      }
    }
  }

  console.log('\n=== FINAL EXTRACTION ===')
  console.log('SK Info:', JSON.stringify(skInfo, null, 2))
  console.log(`Total pengurus extracted: ${allPengurus.length}`)
  console.log('Pengurus:')
  allPengurus.forEach((p, i) => {
    console.log(`  ${i+1}. ${p.positionName || '-'}: ${p.fullName}${p.phone ? ' | ' + p.phone : ''}`)
  })
  if (notes.length > 0) console.log('Notes:', notes)

  // Save to JSON file for next step
  const result = { skInfo, pengurus: allPengurus, notes }
  fs.writeFileSync('/tmp/sk_extracted.json', JSON.stringify(result, null, 2))
  console.log('\n✅ Saved to /tmp/sk_extracted.json')
}

main().catch(e => { console.error(e); process.exit(1) })
