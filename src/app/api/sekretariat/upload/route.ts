// LAPRA 08 - API: Sekretariat Upload Photo
// POST /api/sekretariat/upload (FormData)
//   - locationId: string (required) - key in SystemSetting category=SEKRETARIAT
//   - file: File (image, 10MB)
//   Save to /public/uploads/sekretariat/. Update location.photoUrl.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import * as fs from 'fs'
import * as path from 'path'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const locationId = formData.get('locationId') as string | null
    const file = formData.get('file') as File | null

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'locationId wajib diisi' },
        { status: 400 }
      )
    }

    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'File foto wajib diupload' },
        { status: 400 }
      )
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'File harus berupa gambar (JPG, PNG, WEBP, GIF)' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Ukuran foto maksimal 10MB' },
        { status: 400 }
      )
    }

    // Find existing location record
    const existing = await db.systemSetting.findUnique({ where: { key: locationId } })
    if (!existing || existing.category !== 'SEKRETARIAT') {
      return NextResponse.json(
        { success: false, error: 'Lokasi sekretariat tidak ditemukan' },
        { status: 404 }
      )
    }

    // Save new file
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'sekretariat')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${Date.now()}-${safeName}`
    const filePath = path.join(uploadDir, fileName)
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, fileBuffer)

    const fileUrl = `/uploads/sekretariat/${fileName}`

    // Parse existing location & remove old photo if any
    let prev: any = {}
    try {
      prev = JSON.parse(existing.value)
    } catch {
      prev = {}
    }

    if (prev.photoUrl) {
      try {
        const oldPath = path.join(
          process.cwd(),
          'public',
          prev.photoUrl.replace(/^\//, '')
        )
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath)
        }
      } catch {
        // ignore
      }
    }

    // Update record with new photoUrl
    const merged: any = {
      ...prev,
      id: prev.id || locationId,
      photoUrl: fileUrl,
      updatedAt: new Date().toISOString(),
    }

    const updated = await db.systemSetting.update({
      where: { key: locationId },
      data: {
        value: JSON.stringify(merged),
        category: 'SEKRETARIAT',
        description: `Sekretariat: ${merged.name || ''}`,
      },
    })

    return NextResponse.json({
      success: true,
      data: merged,
      photoUrl: fileUrl,
      message: 'Foto sekretariat berhasil diupload',
    })
  } catch (e: any) {
    console.error('[Sekretariat Upload Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
