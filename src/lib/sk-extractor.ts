// LAPRA 08 - FOSS SK Pengurus Extractor (NO ZAI, NO external API)
// =====================================================
// Extract daftar pengurus dari SK PDF menggunakan:
//   1. pdfjs-dist (legacy build, works in Node.js serverless — no DOMMatrix)
//   2. Pattern matching Indonesia → deteksi nama + jabatan
//
// Pattern matching handles 7 format:
//   - "Ketua: Budi Santoso"
//   - "1. Budi Santoso - Ketua"
//   - LAPRA format: "1 Bun Hon Khiong 081234567890 Ketua"
//   - dll
//
// Akurasi: ~70-80% (user bisa edit di preview dialog)
// =====================================================

// === Known LAPRA 08 positions (untuk matching) ===
const KNOWN_POSITIONS = [
  // Struktur inti
  'ketua umum', 'ketua', 'wakil ketua', 'wakil ketua umum',
  'sekretaris umum', 'sekretaris', 'wakil sekretaris',
  'bendahara umum', 'bendahara', 'wakil bendahara',
  // Koordinator
  'koordinator wilayah', 'koordinator', 'koordinator bidang',
  'ketua koordinator', 'ketua bidang',
  // Bidang
  'ketua departemen', 'sekretaris departemen',
  'ketua bidang', 'sekretaris bidang',
  // Khusus
  'ketua harian', 'ketua pelaksana', 'ketua pelaksana harian',
  'penasihat', 'pembina', 'dewan pembina', 'dewan penasihat',
  'pelindung', 'penasehat',
  // Bidang fungsional
  'humas', 'propaganda', 'kaderisasi', 'pemberdayaan perempuan',
  'pemuda', 'tani', 'nelayan', 'buruh', 'umkm', 'profesi',
  'media', 'teknologi', 'politik', 'hukum', 'sosial',
  // Staf
  'anggota', 'staf', 'eksekutif', 'operasional',
]

// === Pattern untuk ekstrak nama orang Indonesia ===
// Format: 2-4 kata, dimulai huruf besar, bisa ada gelar
const NAME_PATTERNS = [
  // "Budi Santoso" / "Siti Aminah" (2-4 kata Capitalized)
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g,
  // "Drs. Budi Santoso, M.Si" (dengan gelar)
  /\b(?:Drs\.|Dr\.|Ir\.|H\.|Hj\.|Prof\.|KH\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/g,
]

// === Pattern untuk deteksi pasangan Jabatan-Nama ===
const POSITION_NAME_PATTERNS = [
  // "Ketua: Budi Santoso" atau "Ketua Umum: Budi Santoso"
  /(?:(?:Ketua|Sekretaris|Bendahara|Koordinator|Humas|Kaderisasi|Pemuda|Anggota|Penasihat|Pembina|Bidang|Wakil)(?:\s+(?:Umum|Wakil|Harian|Pelaksana|Bidang|Wilayah|Departemen|Sekretariat|Humas|Antar Lembaga|I|II|III|IV|V))?)\s*[:\-–]\s*([A-Z][A-Za-z.\s,']+?)(?:\s*(?:,|\.|$|\n|sebagai|menjadi))/g,
  // "Budi Santoso sebagai Ketua"
  /([A-Z][A-Za-z.\s,']+?)\s+(?:sebagai|menjadi|sebagai\s+\w+)\s+((?:Ketua|Sekretaris|Bendahara|Koordinator|Humas|Kaderisasi|Pemuda|Anggota|Penasihat|Pembina|Bidang|Wakil)(?:\s+\w+)?)/g,
  // "1. Budi Santoso - Ketua" (numbered list)
  /\b\d+\.\s+([A-Z][A-Za-z.\s,']+?)\s*[-–]\s*((?:Ketua|Sekretaris|Bendahara|Koordinator|Humas|Kaderisasi|Pemuda|Anggota|Penasihat|Pembina|Bidang|Wakil)(?:\s+\w+)?)/g,
  // "Budi Santoso - Ketua" (no number)
  /\b([A-Z][A-Za-z.\s,']+?)\s*[-–]\s*((?:Ketua|Sekretaris|Bendahara|Koordinator|Humas|Kaderisasi|Pemuda|Anggota|Penasihat|Pembina|Bidang|Wakil)(?:\s+\w+)?)/g,
  // "Menetapkan Budi Santoso sebagai Ketua DPD"
  /(?:Menetapkan|mengangkat)\s+([A-Z][A-Za-z.\s,']+?)\s+(?:sebagai|menjadi|pada)\s+((?:Ketua|Sekretaris|Bendahara|Koordinator|Humas|Kaderisasi|Pemuda|Anggota|Penasihat|Pembina|Bidang|Wakil)(?:\s+\w+)?)/g,
  // LAPRA SK format: "1 Bun Hon Khiong 081234567890 Ketua" (nomor + nama + phone + jabatan)
  // Phone pattern accepts spaces between digits (pdfjs-dist splits "08 7842151443")
  /\b(\d+)\s+([A-Z][A-Za-z.\s,.'+]+?)\s+(\+?\d[\d\s]{6,18}\d)\s+((?:Ketua|Sekretaris|Bendahara|Koordinator|Humas|Kaderisasi|Pemuda|Anggota|Penasihat|Pembina|Bidang|Wakil)(?:\s+\w+)?)/g,
  // LAPRA SK format: "1 Bun Hon Khiong Ketua" (nomor + nama + jabatan, no phone)
  /\b(\d+)\s+([A-Z][A-Za-z.\s,.'+]+?)\s+((?:Ketua|Sekretaris|Bendahara|Koordinator|Humas|Kaderisasi|Pemuda|Anggota|Penasihat|Pembina|Bidang|Wakil)(?:\s+\w+)?)/g,
]

// === Helper: capitalize first letter ===
function capitalize(s: string): string {
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

// === Helper: clean name (remove titles, trailing punctuation) ===
function cleanName(raw: string): string {
  let name = raw.trim()
  // Remove leading/trailing commas, periods
  name = name.replace(/^[,.\s]+|[,.\s]+$/g, '')
  // Remove titles from start: "Drs. ", "Dr. ", "Ir. ", "H. ", "Hj. "
  name = name.replace(/^(?:Drs\.|Dr\.|Ir\.|H\.|Hj\.|Prof\.|KH\.)\s+/g, '')
  // Remove trailing titles: ", M.Si", ", S.H.", ", Ph.D"
  name = name.replace(/,\s*(?:M\.\w+|S\.\w+|Ph\.D\.?|ST\.|MT\.)\s*$/g, '')
  // Trim to max 4 words (avoid run-on)
  const words = name.split(/\s+/).slice(0, 4).join(' ')
  return words
}

// === Helper: normalize position name ===
function normalizePosition(raw: string): string {
  const lower = raw.toLowerCase().trim()
  // Find best match in KNOWN_POSITIONS
  const match = KNOWN_POSITIONS.find(p => lower.includes(p))
  if (match) {
    return capitalize(match)
  }
  // Default: capitalize first letter
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
}

// === Main extractor: extract pengurus from PDF buffer ===
export async function extractPengurusFromPdfBuffer(
  pdfBuffer: Buffer
): Promise<{
  pengurus: Array<{ fullName: string; positionName: string; phone: string | null; email: string | null }>
  rawText: string
  skInfo: { nomorSK?: string; tanggalTerbit?: string; penerbit?: string; tentang?: string }
}> {
  // Step 1: Extract text from PDF using pdfjs-dist (legacy build — works in Node.js serverless)
  // The legacy build doesn't require DOMMatrix (browser API), so it works on Vercel.
  let rawText = ''
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
    const data = new Uint8Array(pdfBuffer)
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      // Use hasEOL to reconstruct lines properly
      // pdfjs-dist returns text items with hasEOL flag — when true, the item ends a line
      let pageText = ''
      for (const item of content.items as any[]) {
        pageText += item.str
        if (item.hasEOL) pageText += '\n'
      }
      rawText += pageText + '\n'
    }
  } catch (e: any) {
    throw new Error(`PDF parse gagal: ${e.message}`)
  }

  if (!rawText || rawText.trim().length < 50) {
    return { pengurus: [], rawText, skInfo: {} }
  }

  // Normalize whitespace: collapse multiple spaces into single space
  // pdfjs-dist returns text fragments joined with multiple spaces
  const normalizedText = rawText.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')

  // Step 2: Extract SK info (nomor SK, tanggal, penerbit)
  const skInfo: any = {}

  // Pattern: "Nomor SK: 01/SK/LAPRA-08/2026" atau "SK No. 01/..."
  const nomorMatch = normalizedText.match(/(?:Nomor|No\.?|Nomor SK)\s*[:\-]?\s*([0-9]+\/[A-Z0-9\-\/]+\/\d{4})/i)
  if (nomorMatch) skInfo.nomorSK = nomorMatch[1]

  // Pattern: tanggal dalam format DD MMMMMMMM YYYY atau DD-MM-YYYY
  const tanggalMatch = normalizedText.match(/(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})/i)
  if (tanggalMatch) {
    const months: Record<string, string> = {
      'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
      'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
      'september': '09', 'oktober': '10', 'november': '11', 'desember': '12',
    }
    const m = tanggalMatch[1].toLowerCase().match(/(\d{1,2})\s+(\w+)\s+(\d{4})/)
    if (m && months[m[2]]) {
      skInfo.tanggalTerbit = `${m[3]}-${months[m[2]]}-${m[1].padStart(2, '0')}`
    }
  }

  // Pattern: "Tentang: ..." atau "PERIHAL: ..."
  const tentangMatch = normalizedText.match(/(?:Tentang|Perihal|PERIHAL)\s*[:\-]?\s*([^\n]{5,100})/i)
  if (tentangMatch) skInfo.tentang = tentangMatch[1].trim()

  // Pattern: "Ditetapkan di: Jakarta" atau "Ditetapkan oleh: ..."
  const penerbitMatch = normalizedText.match(/(?:Ditetapkan|Di sahkan|Disahkan)\s*(?:di|di\s+|oleh)?\s*[:\-]?\s*([A-Z][a-zA-Z\s,]+?)(?:\n|,|$)/i)
  if (penerbitMatch) skInfo.penerbit = penerbitMatch[1].trim()

  // Step 3: Extract pengurus using pattern matching
  const pengurusMap = new Map<string, { fullName: string; positionName: string; phone: string | null }>()

  for (let pi = 0; pi < POSITION_NAME_PATTERNS.length; pi++) {
    const pattern = POSITION_NAME_PATTERNS[pi]
    // Reset regex lastIndex (because of /g flag)
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(normalizedText)) !== null) {
      let name = ''
      let position = ''
      let phone: string | null = null

      if (pi === 0) {
        // Pattern 1: "Ketua: Budi Santoso"
        name = match[1]
        position = match[0].split(/[:\-–]/)[0].trim()
      } else if (pi === 5) {
        // Pattern 6: "1 Name 0812345 Ketua" — match[1]=number, match[2]=name, match[3]=phone, match[4]=position
        name = match[2]
        phone = match[3]?.replace(/\s/g, '') // remove spaces from phone (pdfjs-dist splits "08 7842...")
        position = match[4]
      } else if (pi === 6) {
        // Pattern 7: "1 Name Ketua" — match[1]=number, match[2]=name, match[3]=position
        name = match[2]
        position = match[3]
      } else {
        // Pattern 2, 3, 4, 5: name + position in groups
        name = match[1]
        position = match[2] || ''
      }

      name = cleanName(name)
      position = normalizePosition(position || 'Pengurus')

      // Validate name (2-50 chars, at least 1 space for full name)
      if (name.length < 3 || name.length > 50) continue
      if (!/\s/.test(name)) continue // must have at least 1 space (first + last name)
      // Skip common false positives
      if (['Laskar Prabowo', 'Dewan Pimpinan', 'Surat Keputusan', 'Dengan Rahmat', 'Republik Indonesia'].some(s => name.includes(s))) continue

      // Dedup by name (case insensitive) — keep first occurrence
      const key = name.toLowerCase()
      if (!pengurusMap.has(key)) {
        pengurusMap.set(key, { fullName: name, positionName: position, phone })
      }
    }
  }

  // Step 4: Try to extract phone & email from text near each pengurus name
  const pengurus = Array.from(pengurusMap.values()).map(p => {
    // If phone was already extracted from pattern matching, use it
    if (p.phone) {
      // Still try to find email
      const nameIdx = normalizedText.indexOf(p.fullName)
      let email: string | null = null
      if (nameIdx >= 0) {
        const context = normalizedText.substring(nameIdx, nameIdx + 200)
        const emailMatch = context.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
        if (emailMatch) email = emailMatch[0]
      }
      return {
        fullName: p.fullName,
        positionName: p.positionName,
        phone: p.phone,
        email,
      }
    }

    // Otherwise look for phone number within 200 chars after the name
    const nameIdx = normalizedText.indexOf(p.fullName)
    let phone: string | null = null
    let email: string | null = null

    if (nameIdx >= 0) {
      const context = normalizedText.substring(nameIdx, nameIdx + 200)
      const phoneMatch = context.match(/(?:08|\+62)[\d\s\-]{8,15}/)
      if (phoneMatch) phone = phoneMatch[0].replace(/[\s\-]/g, '')

      const emailMatch = context.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
      if (emailMatch) email = emailMatch[0]
    }

    return {
      fullName: p.fullName,
      positionName: p.positionName,
      phone,
      email,
    }
  })

  return { pengurus, rawText, skInfo }
}

// === Wrapper: extract from base64 data URL (untuk SK yang sudah di DB) ===
export async function extractPengurusFromDataUrl(
  dataUrl: string
): Promise<{
  pengurus: Array<{ fullName: string; positionName: string; phone: string | null; email: string | null }>
  rawText: string
  skInfo: { nomorSK?: string; tanggalTerbit?: string; penerbit?: string; tentang?: string }
}> {
  // Parse data URL: data:<mime>;base64,<content>
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    throw new Error('Invalid data URL format')
  }

  const [, mimeType, base64Content] = match
  const buffer = Buffer.from(base64Content, 'base64')

  // For images (jpg/png), pdf-parse won't work directly.
  // For now, return empty (FOSS image OCR needs tesseract.js — heavy dep).
  // Most SK uploads are PDF anyway.
  if (!mimeType.includes('pdf')) {
    return {
      pengurus: [],
      rawText: `[Image-based SK detected (${mimeType}). FOSS image OCR not yet supported. Please upload PDF version for auto-extraction.]`,
      skInfo: {},
    }
  }

  return extractPengurusFromPdfBuffer(buffer)
}
