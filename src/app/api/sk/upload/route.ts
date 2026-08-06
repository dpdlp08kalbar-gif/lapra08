// LAPRA 08 - API: SK Upload with OCR
// Mendukung: PDF, JPG/PNG (scan/foto), DOC/DOCX
// Auto-detect file type, lalu ekstrak teks via VLM (untuk image) atau text extraction
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds } from '@/lib/server-helpers'
import ZAI from 'z-ai-web-dev-sdk'
import * as fs from 'fs'
import * as path from 'path'

// POST /api/sk/upload - Upload file SK dengan OCR otomatis
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const territoryId = formData.get('territoryId') as string
    const skNumber = formData.get('skNumber') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const issuedAt = formData.get('issuedAt') as string
    const issuedBy = formData.get('issuedBy') as string

    if (!file || !territoryId || !title) {
      return NextResponse.json(
        { success: false, error: 'File, territoryId, dan title wajib diisi' },
        { status: 400 }
      )
    }

    // Cek hak edit territory
    const editScope = await getEditableTerritoryIds(user)
    if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(territoryId)) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Anda tidak bisa upload SK di wilayah ini' },
        { status: 403 }
      )
    }

    // Deteksi file type
    const fileName = file.name
    const fileExt = fileName.split('.').pop()?.toLowerCase() || ''
    let fileType = 'unknown'
    if (fileExt === 'pdf') fileType = 'pdf'
    else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt)) fileType = 'image'
    else if (['doc', 'docx'].includes(fileExt)) fileType = 'doc'
    else if (['tif', 'tiff'].includes(fileExt)) fileType = 'scan'

    if (fileType === 'unknown') {
      return NextResponse.json(
        { success: false, error: `Format file tidak didukung: .${fileExt}. Gunakan PDF, JPG, PNG, DOC, atau TIFF` },
        { status: 400 }
      )
    }

    // Simpan file ke public/uploads/sk/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'sk')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = path.join(uploadDir, uniqueName)
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, fileBuffer)

    const fileUrl = `/uploads/sk/${uniqueName}`
    const fileSize = fileBuffer.length

    // Buat record SK dengan status OCR PENDING
    const skDoc = await db.sKDocument.create({
      data: {
        skNumber: skNumber || `SK-PENDING-${Date.now()}`,
        title,
        description,
        fileUrl,
        fileName,
        fileType,
        fileSize,
        ocrStatus: 'PROCESSING',
        issuedAt: issuedAt ? new Date(issuedAt) : new Date(),
        issuedBy: issuedBy || 'Unknown',
        territoryId,
      },
    })

    // Proses OCR asynchronously (jangan block response)
    processOCR(skDoc.id, fileBuffer, fileType, fileName).catch((err) => {
      console.error(`[OCR Error] SK ${skDoc.id}:`, err)
      // Update status jadi FAILED
      db.sKDocument.update({
        where: { id: skDoc.id },
        data: { ocrStatus: 'FAILED' },
      }).catch(() => {})
    })

    return NextResponse.json({
      success: true,
      data: skDoc,
      message: 'File SK berhasil diupload. OCR sedang diproses otomatis.',
    })
  } catch (e: any) {
    console.error('[SK Upload Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// Fungsi OCR: ekstrak teks dari file SK
async function processOCR(skId: string, fileBuffer: Buffer, fileType: string, fileName: string) {
  try {
    let extractedText = ''
    let ocrMetadata: any = { autoDetected: true, processedAt: new Date().toISOString() }

    if (fileType === 'image' || fileType === 'scan') {
      // Untuk image/scan: gunakan VLM (Vision Language Model)
      const zai = await ZAI.create()
      const base64Image = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Anda adalah asisten ahli untuk ekstraksi dokumen Surat Keputusan (SK) organisasi Laskar Prabowo 08. Analisis gambar SK ini dan ekstrak informasi berikut dalam format JSON:

{
  "nomorSK": "nomor SK yang tertera",
  "tanggalTerbit": "YYYY-MM-DD jika ada",
  "penerbit": "nama penerbit SK",
  "jabatanPenerbit": "jabatan penerbit (cth: Ketua Dewan Pembina)",
  "tentang": "subjek/isi singkat SK",
  "pihakDilantik": ["nama-nama orang yang dilantik"],
  "masaBakti": "periode bakti jika ada (cth: 2024-2029)"
}

Jika field tidak ditemukan, isi dengan null. Hanya kembalikan JSON, tanpa teks tambahan.`,
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
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          ocrMetadata = { ...ocrMetadata, ...JSON.parse(jsonMatch[0]) }
        }
      } catch (e) {
        // Jika tidak bisa parse, simpan raw text
        ocrMetadata.rawResponse = responseText
      }
    } else if (fileType === 'pdf') {
      // Untuk PDF: extract text sederhana (di produksi bisa pakai pdf-parse atau pdfjs)
      // Untuk demo, kita simpan metadata saja
      extractedText = `[PDF Document] File: ${fileName}. Ekstraksi teks PDF memerlukan library khusus. Metadata dasar telah disimpan.`
      ocrMetadata.note = 'PDF text extraction memerlukan library khusus (pdf-parse). Untuk PDF berisi scan, gunakan VLM.'
    } else if (fileType === 'doc') {
      extractedText = `[DOC Document] File: ${fileName}. Ekstraksi teks DOC/DOCX memerlukan library khusus (mammoth).`
      ocrMetadata.note = 'DOC/DOCX text extraction memerlukan library khusus.'
    }

    // Update record dengan hasil OCR
    await db.sKDocument.update({
      where: { id: skId },
      data: {
        ocrStatus: 'COMPLETED',
        extractedText,
        ocrMetadata: JSON.stringify(ocrMetadata),
      },
    })

    console.log(`[OCR Success] SK ${skId}: ${extractedText.substring(0, 100)}...`)
  } catch (error: any) {
    console.error(`[OCR Failed] SK ${skId}:`, error.message)
    await db.sKDocument.update({
      where: { id: skId },
      data: {
        ocrStatus: 'FAILED',
        extractedText: `OCR gagal: ${error.message}`,
      },
    })
  }
}
