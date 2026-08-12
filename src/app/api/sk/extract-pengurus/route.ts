// LAPRA 08 - API: Extract Pengurus from SK via OCR
// Upload SK → OCR via VLM → Parse pengurus data → Return for preview
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds } from '@/lib/server-helpers'
import ZAI from 'z-ai-web-dev-sdk'
import { requireZaiConfig } from '@/lib/zai-init'
import * as fs from 'fs'
import * as path from 'path'

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

    // Simpan file
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'sk')
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = path.join(uploadDir, fileName)
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, fileBuffer)
    const fileUrl = `/uploads/sk/${fileName}`

    // Tentukan level territory
    const territory = await db.territory.findUnique({ where: { id: territoryId } })
    if (!territory) {
      return NextResponse.json({ success: false, error: 'Territory tidak ditemukan' }, { status: 404 })
    }

    const orgLevel = level || (
      territory.level === 'COUNTRY' ? 'DPN' :
      territory.level === 'PROVINCE' ? 'DPD' : 'DPC'
    )

    // Simpan SK record dengan OCR PROCESSING
    const skDoc = await db.sKDocument.create({
      data: {
        skNumber: `SK-OCR-${Date.now()}`,
        title: file.name,
        fileUrl,
        fileName: file.name,
        fileType: file.name.endsWith('.pdf') ? 'pdf' : 'image',
        fileSize: fileBuffer.length,
        ocrStatus: 'PROCESSING',
        issuedAt: new Date(),
        issuedBy: 'Upload via OCR Extract',
        territoryId,
      },
    })

    // Proses OCR via VLM
    let extractedPengurus: any[] = []
    let extractedText = ''

    try {
      // === Init ZAI config dari env vars (untuk Vercel serverless) ===
      if (!requireZaiConfig()) {
        return NextResponse.json({
          success: false,
          error: 'Konfigurasi ZAI SDK belum lengkap. Set env vars: ZAI_BASE_URL, ZAI_API_KEY, ZAI_CHAT_ID, ZAI_TOKEN, ZAI_USER_ID di Vercel Project Settings.',
        }, { status: 500 })
      }

      const zai = await ZAI.create()
      const base64Image = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Anda adalah asisten ahli untuk ekstraksi data pengurus organisasi Laskar Prabowo 08 dari dokumen Surat Keputusan (SK). Analisis gambar SK ini dan ekstrak DAFTAR PENGURUS yang dilantik.

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
                image_url: { url: base64Image },
              },
            ],
          },
        ],
      })

      const responseText = completion.choices[0]?.message?.content || ''
      extractedText = responseText

      // Parse JSON dari response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        extractedPengurus = parsed.pengurus || []
        
        // Update SK dengan info yang diekstrak
        await db.sKDocument.update({
          where: { id: skDoc.id },
          data: {
            ocrStatus: 'COMPLETED',
            extractedText: responseText,
            ocrMetadata: JSON.stringify({
              ...parsed.skInfo,
              pengurusCount: extractedPengurus.length,
              autoDetected: true,
              processedAt: new Date().toISOString(),
            }),
            skNumber: parsed.skInfo?.nomorSK || skDoc.skNumber,
            title: parsed.skInfo?.tentang || file.name,
            issuedBy: parsed.skInfo?.penerbit || 'Unknown',
            issuedAt: parsed.skInfo?.tanggalTerbit ? new Date(parsed.skInfo.tanggalTerbit) : new Date(),
          },
        })
      } else {
        await db.sKDocument.update({
          where: { id: skDoc.id },
          data: { ocrStatus: 'COMPLETED', extractedText: responseText },
        })
      }
    } catch (ocrError: any) {
      console.error('[OCR Error]', ocrError)
      await db.sKDocument.update({
        where: { id: skDoc.id },
        data: { ocrStatus: 'FAILED', extractedText: `OCR gagal: ${ocrError.message}` },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        skId: skDoc.id,
        skNumber: skDoc.skNumber,
        fileUrl,
        fileName: file.name,
        pengurus: extractedPengurus,
        orgLevel,
        territoryId,
        territoryName: territory.name,
        extractedText,
      },
      message: extractedPengurus.length > 0
        ? `Berhasil mengekstrak ${extractedPengurus.length} pengurus dari SK. Silakan verifikasi sebelum disimpan.`
        : 'OCR selesai namun tidak ada pengurus terdeteksi. SK tetap tersimpan sebagai arsip.',
    })
  } catch (e: any) {
    console.error('[Extract Pengurus Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
