// LAPRA 08 - API: Organization Upload (Photo / ID Card for OrgPosition)
// POST /api/organization/upload - FormData:
//   - positionId: string (required)
//   - fileType:   "photo" | "idCard" (required)
//   - file:       File (image, 5MB) for photo | (image/PDF, 10MB) for idCard
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds } from '@/lib/server-helpers'
import * as fs from 'fs'
import * as path from 'path'

const MAX_PHOTO = 5 * 1024 * 1024 // 5MB
const MAX_IDCARD = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_IDCARD = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const positionId = formData.get('positionId') as string | null
    const fileType = (formData.get('fileType') as string | null) || 'photo'
    const file = formData.get('file') as File | null

    if (!positionId) {
      return NextResponse.json(
        { success: false, error: 'positionId wajib diisi' },
        { status: 400 }
      )
    }

    if (!fileType || (fileType !== 'photo' && fileType !== 'idCard')) {
      return NextResponse.json(
        { success: false, error: 'fileType harus "photo" atau "idCard"' },
        { status: 400 }
      )
    }

    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'File wajib diupload' },
        { status: 400 }
      )
    }

    // Validate file type & size
    const isPhoto = fileType === 'photo'
    const allowed = isPhoto ? ALLOWED_IMAGE : ALLOWED_IDCARD
    const maxSize = isPhoto ? MAX_PHOTO : MAX_IDCARD

    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: isPhoto
            ? 'File foto harus berupa gambar (JPG, PNG, WEBP, GIF)'
            : 'File identitas harus berupa gambar atau PDF',
        },
        { status: 400 }
      )
    }

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: isPhoto
            ? 'Ukuran foto maksimal 5MB'
            : 'Ukuran identitas maksimal 10MB',
        },
        { status: 400 }
      )
    }

    // Find existing position
    const existing = await db.orgPosition.findUnique({ where: { id: positionId } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Pengurus tidak ditemukan' },
        { status: 404 }
      )
    }

    // Permission: editable territory
    const editScope = await getEditableTerritoryIds(user)
    if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(existing.territoryId)) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Anda tidak bisa edit pengurus di wilayah ini' },
        { status: 403 }
      )
    }

    // Save file
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pengurus')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${Date.now()}-${fileType}-${safeName}`
    const filePath = path.join(uploadDir, fileName)
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, fileBuffer)

    const fileUrl = `/uploads/pengurus/${fileName}`

    // Delete old file (if any) to keep storage clean
    const oldUrl = isPhoto ? existing.photoUrl : existing.idCardUrl
    if (oldUrl) {
      try {
        const oldPath = path.join(process.cwd(), 'public', oldUrl.replace(/^\//, ''))
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      } catch {
        // ignore
      }
    }

    // Update position
    const updateData = isPhoto ? { photoUrl: fileUrl } : { idCardUrl: fileUrl }
    const updated = await db.orgPosition.update({
      where: { id: positionId },
      data: updateData,
      include: { territory: true },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      fileUrl,
      message: isPhoto ? 'Foto pengurus berhasil diupload' : 'Identitas pengurus berhasil diupload',
    })
  } catch (e: any) {
    console.error('[Organization Upload Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
