// LAPRA 08 - API: Extract Pengurus from SK via FOSS pdf-parse + pattern matching
// Upload SK → simpan ke DB → extract text PDF → pattern matching → return pengurus
// 100% FOSS, TIDAK BUTUH ZAI SDK / API KEY APAPUN
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds } from '@/lib/server-helpers'

// POST /api/sk/extract-pengurus - Upload SK, OCR, return extracted pengurus for preview
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const territoryId = formData.get('territoryId') as string
    const level = formData.get('level') as string // DPN | DPD | DPC

    if (!file || !territoryId) {
      return NextResponse.json(
        { success: false, error: 'File dan territoryId wajib diisi' },
        { status: 400 }
      )
    }

    // Cek hak edit territory
    const editScope = await getEditableTerritoryIds(user)
    if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(territoryId)) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: tidak bisa upload SK di wilayah ini' },
        { status: 403 }
      )
    }

    // === Vercel-compatible: store file as base64 in DB (no filesystem) ===
    // OLD CODE (broken on Vercel):
    //   const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'sk')
    //   fs.writeFileSync(filePath, fileBuffer)
    // NEW: file content stored in DB column fileData (base64 data URL)
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.toLowerCase().endsWith('.pdf') ? 'pdf'
              : file.name.toLowerCase().match(/\.(jpg|jpeg|png)$/) ? 'image'
              : 'unknown'
    const mimeType = file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf'
                   : file.name.toLowerCase().endsWith('.png') ? 'image/png'
                   : 'image/jpeg'
    const base64DataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`
    const fileUrl = `/api/sk/PLACEHOLDER_ID/download` // updated below after SK record created

    // Tentukan level territory
    const territory = await db.territory.findUnique({ where: { id: territoryId } })
    if (!territory) {
      return NextResponse.json({ success: false, error: 'Territory tidak ditemukan' }, { status: 404 })
    }

    const orgLevel = level || (
      territory.level === 'COUNTRY' ? 'DPN' :
      territory.level === 'PROVINCE' ? 'DPD' : 'DPC'
    )

    // Simpan SK record dengan OCR PROCESSING + file data
    const skDoc = await db.sKDocument.create({
      data: {
        skNumber: `SK-OCR-${Date.now()}`,
        title: file.name,
        fileUrl,
        fileName: file.name,
        fileType: ext,
        fileSize: fileBuffer.length,
        fileData: base64DataUrl, // PHASE 1: store file content in DB
        ocrStatus: 'PROCESSING',
        issuedAt: new Date(),
        issuedBy: 'Upload via OCR Extract',
        territoryId,
      },
    })

    // Update fileUrl with real SK id (so download endpoint works)
    await db.sKDocument.update({
      where: { id: skDoc.id },
      data: { fileUrl: `/api/sk/${skDoc.id}/download` },
    })

    // === EXTRACTION: 100% FOSS (pdf-parse + pattern matching) ===
    // TIDAK BUTUH ZAI SDK / API KEY APAPUN
    let extractedPengurus: any[] = []
    let extractedText = ''
    let ocrStatus = 'PENDING'
    let ocrMessage = 'File SK tersimpan. Extract pengurus ditunda.'
    let skInfo: any = {}

    try {
      // Pakai FOSS extractor (pdf-parse + pattern matching)
      const { extractPengurusFromDataUrl } = await import('@/lib/sk-extractor')
      const result = await extractPengurusFromDataUrl(`data:${mimeType};base64,${fileBuffer.toString('base64')}`)

      extractedPengurus = result.pengurus
      extractedText = result.rawText
      skInfo = result.skInfo

      if (extractedPengurus.length > 0) {
        ocrStatus = 'COMPLETED'
        ocrMessage = `Berhasil ekstrak ${extractedPengurus.length} pengurus via FOSS (pdf-parse).`

        // Update SK dengan info yang diekstrak
        await db.sKDocument.update({
          where: { id: skDoc.id },
          data: {
            ocrStatus: 'COMPLETED',
            extractedText: extractedText.substring(0, 5000),
            ocrMetadata: JSON.stringify({
              ...skInfo,
              pengurusCount: extractedPengurus.length,
              extractor: 'pdf-parse + pattern-matching (FOSS)',
              processedAt: new Date().toISOString(),
            }),
            ...(skInfo.nomorSK ? { skNumber: skInfo.nomorSK } : {}),
            ...(skInfo.tentang ? { title: skInfo.tentang.substring(0, 500) } : {}),
            ...(skInfo.penerbit ? { issuedBy: skInfo.penerbit } : {}),
            ...(skInfo.tanggalTerbit ? { issuedAt: new Date(skInfo.tanggalTerbit) } : {}),
          },
        })
      } else {
        ocrStatus = 'COMPLETED'
        ocrMessage = `Extract selesai, tidak ada pengurus terdeteksi. Kemungkinan format SK tidak cocok dengan pattern matching. File tetap tersimpan.`
        await db.sKDocument.update({
          where: { id: skDoc.id },
          data: {
            ocrStatus: 'COMPLETED',
            extractedText: extractedText.substring(0, 5000),
            ocrMetadata: JSON.stringify({
              extractor: 'pdf-parse (FOSS)',
              pengurusCount: 0,
              note: 'Tidak ada pattern pengurus terdeteksi',
              processedAt: new Date().toISOString(),
            }),
          },
        })
      }
    } catch (extractError: any) {
      console.error('[SK Extract Error]', extractError)
      ocrStatus = 'FAILED'
      ocrMessage = `Extract gagal: ${extractError.message}. File tetap tersimpan sebagai arsip.`
      await db.sKDocument.update({
        where: { id: skDoc.id },
        data: { ocrStatus: 'FAILED', extractedText: `Extract gagal: ${extractError.message}` },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        skId: skDoc.id,
        skNumber: skDoc.skNumber,
        fileUrl: `/api/sk/${skDoc.id}/download`,
        fileName: file.name,
        pengurus: extractedPengurus,
        orgLevel,
        territoryId,
        territoryName: territory.name,
        extractedText,
        ocrStatus,
      },
      message: extractedPengurus.length > 0
        ? `Berhasil mengekstrak ${extractedPengurus.length} pengurus dari SK. Silakan verifikasi sebelum disimpan.`
        : ocrStatus === 'PENDING'
        ? `SK "${file.name}" berhasil disimpan ke arsip. FOSS extractor selesai. Anda bisa lihat & download SK kapan saja.`
        : ocrStatus === 'FAILED'
        ? `SK "${file.name}" tersimpan, tapi OCR gagal. Anda tetap bisa lihat & download SK.`
        : 'OCR selesai namun tidak ada pengurus terdeteksi. SK tetap tersimpan sebagai arsip.',
    })
  } catch (e: any) {
    console.error('[Extract Pengurus Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
