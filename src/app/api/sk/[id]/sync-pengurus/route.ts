// LAPRA 08 - API: Sync Pengurus dari SK yang sudah diupload
// =====================================================
// POST /api/sk/[id]/sync-pengurus
//
// Ambil SK yang sudah ada (dari DB), jalankan OCR ulang (kalau ZAI aktif)
// atau pakai hasil OCR yang sudah ada, lalu return daftar pengurus.
//
// Frontend akan terima daftar pengurus → tampilkan preview dialog →
// user klik "Sinkronkan ke Struktur Pengurus" → bulk create ke OrgPosition.
//
// Response:
//   { success, data: { skId, fileName, pengurus: [...], orgLevel, territoryId, territoryName } }
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds } from '@/lib/server-helpers'
import { requireZaiConfig } from '@/lib/zai-init'
import ZAI from 'z-ai-web-dev-sdk'

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

    let pengurus: any[] = []
    let extractedText = ''
    let ocrStatus = sk.ocrStatus || 'PENDING'

    // === STRATEGI 1: Pakai hasil OCR yang sudah ada (kalau ada pengurus tersimpan) ===
    if (sk.ocrMetadata) {
      try {
        const meta = JSON.parse(sk.ocrMetadata)
        if (meta.pengurusCount > 0 || Array.isArray(meta.pengurus)) {
          // Hmm, kita tidak simpan pengurus di metadata — hanya count
          // Jadi kita perlu re-OCR kalau mau dapat pengurus
        }
      } catch {}
    }

    // === STRATEGI 2: Re-OCR pakai ZAI (kalau fileData ada & ZAI aktif) ===
    if (sk.fileData && requireZaiConfig()) {
      try {
        const zai = await ZAI.create()

        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Anda adalah asisten ahli untuk ekstraksi data pengurus organisasi Laskar Prabowo 08 dari dokumen Surat Keputusan (SK). Analisis dokumen SK ini dan ekstrak DAFTAR PENGURUS yang dilantik.

Kembalikan HANYA JSON dengan format:
{
  "skInfo": {
    "nomorSK": "nomor SK jika tertera",
    "tanggalTerbit": "YYYY-MM-DD jika ada",
    "penerbit": "nama penerbit",
    "tentang": "subjek SK"
  },
  "pengurus": [
    {
      "fullName": "nama lengkap pengurus",
      "positionName": "jabatan (cth: Ketua, Sekretaris, Bendahara)",
      "phone": "nomor telepon jika ada, atau null",
      "email": "email jika ada, atau null"
    }
  ]
}

Jika tidak ada pengurus yang terdeteksi, kembalikan array "pengurus" kosong. Hanya kembalikan JSON, tanpa teks tambahan.`,
                },
                {
                  type: 'image_url',
                  image_url: { url: sk.fileData },
                },
              ],
            },
          ],
        } as any)

        const responseText = completion.choices[0]?.message?.content || ''
        extractedText = responseText
        ocrStatus = 'COMPLETED'

        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          pengurus = parsed.pengurus || []

          // Update SK dengan info yang diekstrak
          await db.sKDocument.update({
            where: { id: sk.id },
            data: {
              ocrStatus: 'COMPLETED',
              extractedText: responseText,
              ocrMetadata: JSON.stringify({
                ...parsed.skInfo,
                pengurusCount: pengurus.length,
                autoDetected: true,
                processedAt: new Date().toISOString(),
              }),
            },
          })
        }
      } catch (ocrError: any) {
        console.error('[Sync Pengurus OCR Error]', ocrError)
        ocrStatus = 'FAILED'
        extractedText = `OCR gagal: ${ocrError.message}`
      }
    } else if (!sk.fileData) {
      return NextResponse.json({
        success: false,
        error: 'File SK tidak tersedia di database. Upload ulang SK dengan tombol "Upload SK + Extract".',
      }, { status: 400 })
    } else if (!requireZaiConfig()) {
      // fileData ada tapi ZAI tidak dikonfigurasi
      return NextResponse.json({
        success: false,
        error: 'ZAI SDK tidak dikonfigurasi di server. Tidak bisa OCR otomatis. Set env vars ZAI_BASE_URL, ZAI_API_KEY, ZAI_CHAT_ID, ZAI_TOKEN, ZAI_USER_ID di Vercel Project Settings untuk aktifkan OCR.',
        data: {
          skId: sk.id,
          fileName: sk.fileName,
          ocrStatus: 'PENDING',
          needsZaiConfig: true,
        },
      }, { status: 503 })
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
        extractedText,
        ocrStatus,
      },
      message: pengurus.length > 0
        ? `Berhasil ekstrak ${pengurus.length} pengurus dari SK "${sk.fileName}".`
        : 'OCR selesai namun tidak ada pengurus terdeteksi. Anda bisa input manual via menu Tambah Pengurus.',
    })
  } catch (e: any) {
    console.error('[Sync Pengurus Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
