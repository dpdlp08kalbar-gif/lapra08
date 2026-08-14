// LAPRA 08 - API: Upload PDF Program Kerja + FOSS Extract
// POST /api/program-kerja/upload-pdf
// 100% FOSS: pdfjs-dist + pattern matching (NO ZAI, NO API key)
//
// Flow:
// 1. DPN/DPD/DPC upload PDF Program Kerja
// 2. pdfjs-dist extract plain text dari PDF
// 3. Pattern matching: deteksi program, timeline, target, anggaran
// 4. Return hasil untuk preview → user konfirmasi → simpan
// 5. Simpan PDF asli sebagai base64 di SystemSetting (untuk view/download)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getAccessibleTerritoryIds } from '@/lib/server-helpers'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const level = formData.get('level') as string // DPN | DPD | DPC
    const territoryCode = formData.get('territoryCode') as string
    const territoryName = formData.get('territoryName') as string

    if (!file) return NextResponse.json({ success: false, error: 'File PDF wajib' }, { status: 400 })
    if (!file.type.includes('pdf')) return NextResponse.json({ success: false, error: 'File harus PDF' }, { status: 400 })
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ success: false, error: 'Ukuran PDF maksimal 20MB' }, { status: 400 })

    // === Step 1: Extract text from PDF using pdfjs-dist (FOSS, no API key) ===
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    let rawText = ''

    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
      const data = new Uint8Array(fileBuffer)
      const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const content = await page.getTextContent()
        let pageText = ''
        for (const item of content.items as any[]) {
          pageText += item.str
          if (item.hasEOL) pageText += '\n'
        }
        rawText += pageText + '\n'
      }
    } catch (e: any) {
      return NextResponse.json({
        success: false,
        error: `Gagal membaca PDF: ${e.message}`,
      }, { status: 500 })
    }

    // Normalize text
    const normalizedText = rawText.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')

    // === Step 2: Extract program info via pattern matching ===
    const result = extractProgramsFromText(normalizedText, file.name)

    // === Step 3: Save PDF as base64 in SystemSetting (for view/download) ===
    const pdfId = `pdf_prog_${Date.now()}`
    const pdfDataUrl = `data:application/pdf;base64,${fileBuffer.toString('base64')}`

    await db.systemSetting.create({
      data: {
        key: pdfId,
        value: JSON.stringify({
          id: pdfId,
          fileName: file.name,
          fileSize: file.size,
          fileData: pdfDataUrl,
          level,
          territoryCode,
          territoryName,
          uploadedBy: user.fullName,
          uploadedAt: new Date().toISOString(),
          extractedPrograms: result.programs,
          extractedTitle: result.title,
          aiSummary: result.aiSummary,
          rawTextLength: normalizedText.length,
        }),
        category: 'PROGRAM_PDF',
        description: `Program Kerja PDF: ${file.name} (${level} ${territoryName})`,
      },
    })

    // === Step 4: Auto-save extracted programs as Gallery items ===
    let savedCount = 0
    if (result.programs.length > 0) {
      for (const prog of result.programs) {
        try {
          const itemData = {
            id: `prog_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            title: prog.name,
            description: prog.description,
            category: 'PROGRAM_KERJA',
            level,
            territoryCode,
            territoryName,
            location: prog.location || '',
            date: prog.timeline || '',
            status: 'DIRENCANAKAN',
            pdfId,
          }
          await db.systemSetting.create({
            data: {
              key: itemData.id,
              value: JSON.stringify(itemData),
              category: 'GALLERY',
              description: `Program: ${prog.name}`,
            },
          })
          savedCount++
        } catch (e) {
          // skip on error
        }
      }
    } else {
      // No programs detected — save as single summary item
      const itemData = {
        id: `prog_${Date.now()}`,
        title: result.title || file.name.replace(/\.pdf$/i, ''),
        description: result.aiSummary || 'Program kerja diupload, namun tidak ada program spesifik terdeteksi. Lihat PDF asli untuk detail.',
        category: 'PROGRAM_KERJA',
        level, territoryCode, territoryName,
        location: '', date: '', status: 'DIRENCANAKAN', pdfId,
      }
      await db.systemSetting.create({
        data: {
          key: itemData.id,
          value: JSON.stringify(itemData),
          category: 'GALLERY',
          description: `Program: ${itemData.title}`,
        },
      })
      savedCount = 1
    }

    return NextResponse.json({
      success: true,
      data: {
        pdfId,
        title: result.title,
        programs: result.programs,
        aiSummary: result.aiSummary,
        rawTextPreview: normalizedText.substring(0, 2000),
        savedCount,
        fileName: file.name,
        level,
        territoryCode,
        territoryName,
        viewUrl: `/api/program-kerja/${pdfId}/view`,
      },
      message: `PDF "${file.name}" berhasil diupload & diproses. ${result.programs.length} program terdeteksi, ${savedCount} program disimpan. Klik "Lihat Hasil" untuk preview.`,
    })
  } catch (e: any) {
    console.error('[Program Kerja Upload Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// FOSS Pattern Matching: Extract programs from PDF text
// ============================================================
function extractProgramsFromText(text: string, fileName: string): {
  title: string
  programs: Array<{
    name: string
    description: string
    timeline: string
    target: string
    budget: string
    priority: number
    category: string
    location: string
  }>
  aiSummary: string
} {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const programs: any[] = []

  // Extract document title (first meaningful line or from filename)
  let title = fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
  // Try to find title in text (usually first few lines, often "PROGRAM KERJA" or "RENJA")
  for (const line of lines.slice(0, 10)) {
    if (line.match(/^(PROGRAM|RENCANA|KERJA|REJA|ANGGARAN|KEGIATAN)/i) && line.length > 5) {
      title = line
      break
    }
  }

  // Program detection patterns
  // Pattern 1: Numbered list "1. Program ABC" or "1) Program ABC" or "1 Program ABC"
  const numberedPattern = /^\s*(\d+)[.)]\s+(.+)/

  // Pattern 2: "Program:" or "Program Kerja:" prefix
  const programPrefixPattern = /^(?:Program|Program Kerja|Kegiatan|Bidang)\s*[:\-]\s*(.+)/i

  // Pattern 3: Lines containing keywords that indicate a program/activity
  const keywordPattern = /\b(?:pelatihan|sosialisasi|workshop|seminar|bakti\s+sosial|baksos|penyuluhan|pendampingan|advokasi|kampanye|pelantikan|deklarasi|rapat|musyawarah|kegiatan|program|aksi|turnamen|festival|donasi|bantuan|pemberdayaan|kaderisasi|rekrutmen|pendaftaran)\b/i

  // Timeline patterns
  const timelinePattern = /\b(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})\b/i
  const quarterPattern = /\b(?:Q[1-4]|Kuartal\s+[1-4]|Triwulan\s+[1-4])\b/i
  const monthYearPattern = /\b((?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})\b/i

  // Budget patterns
  const budgetPattern = /(?:Rp\.?\s*[\d.,]+(?:\s*(?:juta|miliar|ribu)?(?:\s*(?:rupiah)?)?)|anggaran\s*[:\-]?\s*[\d.,]+)/i

  // Target/peserta patterns
  const targetPattern = /(?:target|peserta|penerima|manfaat)\s*[:\-]?\s*(\d+(?:\s*(?:orang|peserta|KK|jiwa|unit)?))/i

  // Location patterns
  const locationPattern = /\b(?:di|lokasi|tempat)\s*[:\-]?\s*([A-Z][a-zA-Z\s,]{3,50})/

  let currentProgram: any = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let isProgramLine = false
    let programName = ''

    // Check numbered pattern
    const numMatch = line.match(numberedPattern)
    if (numMatch && numMatch[2] && numMatch[2].length > 3) {
      programName = numMatch[2].trim()
      isProgramLine = true
    }

    // Check program prefix pattern
    if (!isProgramLine) {
      const prefixMatch = line.match(programPrefixPattern)
      if (prefixMatch && prefixMatch[1] && prefixMatch[1].length > 3) {
        programName = prefixMatch[1].trim()
        isProgramLine = true
      }
    }

    // Check keyword pattern (lines that contain activity keywords)
    if (!isProgramLine && line.length > 10 && line.length < 200) {
      if (keywordPattern.test(line) && !line.match(/^(?:Menimbang|Mengingat|Memperhatikan|Dengan|Berdasarkan)/i)) {
        programName = line.replace(/^\s*(?:-\s*|\*\s*|•\s*)/, '').trim()
        isProgramLine = true
      }
    }

    if (isProgramLine && programName.length > 3) {
      // Save previous program
      if (currentProgram) {
        programs.push(currentProgram)
      }

      // Start new program — collect context from next few lines
      const contextLines = lines.slice(i + 1, Math.min(i + 8, lines.length)).join(' ')

      // Extract timeline from context
      let timeline = ''
      const tlMatch = contextLines.match(timelinePattern)
      if (tlMatch) timeline = tlMatch[1]
      else {
        const qMatch = contextLines.match(quarterPattern)
        if (qMatch) timeline = qMatch[0]
        else {
          const myMatch = contextLines.match(monthYearPattern)
          if (myMatch) timeline = myMatch[1]
        }
      }

      // Extract budget from context
      let budget = ''
      const bMatch = contextLines.match(budgetPattern)
      if (bMatch) budget = bMatch[0]

      // Extract target from context
      let target = ''
      const tMatch = contextLines.match(targetPattern)
      if (tMatch) target = tMatch[1]

      // Extract location from context
      let location = ''
      const lMatch = contextLines.match(locationPattern)
      if (lMatch) location = lMatch[1].trim()

      // Determine category from keywords
      let category = 'LAINNYA'
      const lowerName = programName.toLowerCase()
      if (/pelatihan|workshop|seminar|penyuluhan|kaderisasi/.test(lowerName)) category = 'KADERISASI'
      else if (/bakti|sosial|baksos|donasi|bantuan|pemberdayaan/.test(lowerName)) category = 'SOSIAL'
      else if (/advokasi|hukum|litigasi/.test(lowerName)) category = 'ADVOKASI'
      else if (/kampanye|sosialisasi|publikasi|humas/.test(lowerName)) category = 'HUMAS'
      else if (/pelantikan|deklarasi|rapat|musyawarah/.test(lowerName)) category = 'KEORGANISASIAN'
      else if (/turnamen|festival|olahraga|seni|budaya/.test(lowerName)) category = 'OLAHRAGA_SENI'

      currentProgram = {
        name: programName.substring(0, 200),
        description: contextLines.substring(0, 500).trim() || `Program terdeteksi dari PDF: ${programName}`,
        timeline: timeline || '',
        target: target || '',
        budget: budget || '',
        priority: programs.length + 1,
        category,
        location,
      }
    }
  }

  // Don't forget the last program
  if (currentProgram) {
    programs.push(currentProgram)
  }

  // Generate AI summary (rule-based, no LLM)
  const totalPrograms = programs.length
  const categories = [...new Set(programs.map(p => p.category))]
  const withBudget = programs.filter(p => p.budget).length
  const withTimeline = programs.filter(p => p.timeline).length

  const aiSummary = `Dokumen "${title}" berisi ${totalPrograms} program kerja yang terdeteksi. ` +
    `Kategori: ${categories.join(', ')}. ` +
    `${withTimeline} program memiliki timeline, ${withBudget} program memiliki anggaran. ` +
    (totalPrograms > 0 ? `Program pertama: "${programs[0]?.name}". ` : '') +
    `Dokumen ini diextract otomatis menggunakan FOSS pdfjs-dist + pattern matching (tanpa API berbayar).`

  return {
    title: title.substring(0, 300),
    programs: programs.slice(0, 30), // max 30 programs
    aiSummary,
  }
}
