// LAPRA 08 - API: Upload SK Document (FormData handler)
// =====================================================
// POST /api/sk/upload — multipart/form-data
//
// Form fields:
//   file         — File (PDF/JPG/PNG/DOC, max 5MB) — required
//   territoryId  — String (cuid) — required
//   skNumber     — String — optional (auto-generate if empty)
//   title        — String — required
//   issuedAt     — ISO date string — optional (default: now)
//   issuedBy     — String — optional
//
// Stores file as base64 in DB (fileData column) — Vercel-compatible.
// No filesystem needed.
//
// Returns: { success, data: SKDocument }
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds } from '@/lib/server-helpers'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']

function getFileExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/)
  return match ? match[1].toLowerCase() : 'pdf'
}

function getMimeType(filename: string): string {
  const ext = getFileExtension(filename)
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
  return mimeMap[ext] || 'application/octet-stream'
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()

    const file = formData.get('file') as File | null
    const territoryId = formData.get('territoryId') as string
    const skNumber = formData.get('skNumber') as string
    const title = formData.get('title') as string
    const issuedAt = formData.get('issuedAt') as string
    const issuedBy = formData.get('issuedBy') as string

    // === Validation ===
    if (!file) {
      return NextResponse.json({ success: false, error: 'File SK wajib diunggah' }, { status: 400 })
    }

    if (!territoryId) {
      return NextResponse.json({ success: false, error: 'Wilayah (territoryId) wajib diisi' }, { status: 400 })
    }

    if (!title) {
      return NextResponse.json({ success: false, error: 'Judul SK wajib diisi' }, { status: 400 })
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Ukuran file maksimal 5MB. File Anda: ${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 400 }
      )
    }

    // Check file type
    const ext = getFileExtension(file.name)
    if (!ALLOWED_EXTENSIONS.includes(`.${ext}`)) {
      return NextResponse.json(
        { success: false, error: `Tipe file tidak didukung: .${ext}. Didukung: PDF, JPG, PNG, DOC, DOCX` },
        { status: 400 }
      )
    }

    // Check RBAC
    const editScope = await getEditableTerritoryIds(user)
    if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(territoryId)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak untuk wilayah ini' }, { status: 403 })
    }

    // Generate unique SK number if not provided
    const finalSkNumber = skNumber || `SK-${territoryId.slice(-6).toUpperCase()}-${Date.now()}`

    // Check for duplicate SK number
    const existing = await db.sKDocument.findUnique({ where: { skNumber: finalSkNumber } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Nomor SK "${finalSkNumber}" sudah ada. Gunakan nomor lain.` },
        { status: 409 }
      )
    }

    // === Convert file to base64 data URL ===
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const mimeType = getMimeType(file.name)
    const base64Data = fileBuffer.toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64Data}`

    // === Create SK Document in DB ===
    const doc = await db.sKDocument.create({
      data: {
        skNumber: finalSkNumber,
        title: title.substring(0, 500),
        description: `Diunggah oleh ${user.fullName} (${user.role})`,
        fileUrl: `/api/sk/${`PLACEHOLDER_ID`}/download`, // will be updated below
        fileName: file.name,
        fileType: ext,
        fileSize: file.size,
        fileData: dataUrl,
        ocrStatus: 'PENDING',
        issuedAt: issuedAt ? new Date(issuedAt) : new Date(),
        issuedBy: issuedBy || user.fullName,
        territoryId,
      },
      include: { territory: true },
    })

    // Update fileUrl with actual doc id
    await db.sKDocument.update({
      where: { id: doc.id },
      data: { fileUrl: `/api/sk/${doc.id}/download` },
    })

    const finalDoc = await db.sKDocument.findUnique({
      where: { id: doc.id },
      include: { territory: true },
    })

    return NextResponse.json({
      success: true,
      data: finalDoc,
      message: `SK "${title}" berhasil diunggah. File tersimpan di database (${(file.size / 1024).toFixed(0)} KB).`,
    })
  } catch (e: any) {
    console.error('[SK Upload Error]', e)
    return NextResponse.json(
      { success: false, error: `Upload gagal: ${e.message}` },
      { status: 500 }
    )
  }
}
