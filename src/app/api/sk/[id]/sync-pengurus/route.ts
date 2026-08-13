// LAPRA 08 - API: Sync Pengurus dari SK yang sudah diupload
// =====================================================
// POST /api/sk/[id]/sync-pengurus
//
// 100% FOSS: pakai pdf-parse untuk extract text dari PDF
// + pattern matching Indonesia untuk deteksi pengurus.
// TIDAK BUTUH ZAI SDK / API key apapun.
//
// Frontend akan terima daftar pengurus → tampilkan preview dialog →
// user klik "Sinkronkan ke Struktur Pengurus" → bulk create ke OrgPosition.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds } from '@/lib/server-helpers'
import { extractPengurusFromDataUrl } from '@/lib/sk-extractor'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    // Ambil SK dari DB
    const sk = await db.sKDocument.findUnique({
      where: { id },
      include: { territory: true },
    })

    if (!sk) {
      return NextResponse.json({ success: false, error: 'SK tidak ditemukan' }, { status: 404 })
    }

    // Cek akses edit territory
    const editScope = await getEditableTerritoryIds(user)
    if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(sk.territoryId)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }

    // Tentukan level berdasarkan territory
    const orgLevel = sk.territory.level === 'COUNTRY' ? 'DPN' :
                    sk.territory.level === 'PROVINCE' ? 'DPD' : 'DPC'

    if (!sk.fileData) {
      return NextResponse.json({
        success: false,
        error: 'File SK tidak tersedia di database. Upload ulang SK.',
      }, { status: 400 })
    }

    // === EXTRACTION: 100% FOSS (pdf-parse + pattern matching) ===
    let pengurus: any[] = []
    let extractedText = ''
    let skInfo: any = {}

    try {
      const result = await extractPengurusFromDataUrl(sk.fileData)
      pengurus = result.pengurus
      extractedText = result.rawText
      skInfo = result.skInfo
    } catch (extractErr: any) {
      console.error('[Sync Pengurus Extract Error]', extractErr)
      return NextResponse.json({
        success: false,
        error: `Gagal extract pengurus: ${extractErr.message}`,
      }, { status: 500 })
    }

    // Update SK dengan info yang diekstrak (kalau ada skInfo baru)
    if (Object.keys(skInfo).length > 0 || pengurus.length > 0) {
      await db.sKDocument.update({
        where: { id: sk.id },
        data: {
          ocrStatus: 'COMPLETED',
          extractedText: extractedText.substring(0, 5000), // cap to 5KB
          ocrMetadata: JSON.stringify({
            ...skInfo,
            pengurusCount: pengurus.length,
            extractor: 'pdf-parse + pattern-matching (FOSS)',
            processedAt: new Date().toISOString(),
          }),
          ...(skInfo.nomorSK ? { skNumber: skInfo.nomorSK } : {}),
          ...(skInfo.tentang ? { title: skInfo.tentang.substring(0, 500) } : {}),
          ...(skInfo.penerbit ? { issuedBy: skInfo.penerbit } : {}),
          ...(skInfo.tanggalTerbit ? { issuedAt: new Date(skInfo.tanggalTerbit) } : {}),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        skId: sk.id,
        skNumber: sk.skNumber,
        fileName: sk.fileName,
        pengurus,
        orgLevel,
        territoryId: sk.territoryId,
        territoryName: sk.territory.name,
        extractedText: extractedText.substring(0, 2000), // for preview
        skInfo,
        extractor: 'FOSS (pdf-parse + pattern matching)',
      },
      message: pengurus.length > 0
        ? `Berhasil ekstrak ${pengurus.length} pengurus dari SK "${sk.fileName}" (via FOSS pdf-parse).`
        : `Tidak ada pengurus terdeteksi dari SK ini. Kemungkinan format SK tidak cocok dengan pattern matching. Anda bisa input manual via menu Tambah Pengurus.`,
    })
  } catch (e: any) {
    console.error('[Sync Pengurus Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
