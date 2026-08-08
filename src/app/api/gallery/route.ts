// LAPRA 08 - API: Gallery (Upload & Manage Photos)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds } from '@/lib/server-helpers'
import * as fs from 'fs'
import * as path from 'path'

// Simple in-memory gallery storage (would use DB in production)
// For now, store gallery items in SystemSetting with key prefix 'gallery_'

// GET /api/gallery - List gallery items
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Get all gallery items from SystemSetting
  const items = await db.systemSetting.findMany({
    where: { category: 'GALLERY' },
    orderBy: { updatedAt: 'desc' },
  })

  const gallery = items.map((item) => {
    try {
      return JSON.parse(item.value)
    } catch {
      return null
    }
  }).filter(Boolean)

  return NextResponse.json({ success: true, data: gallery })
}

// POST /api/gallery - Upload photo to gallery
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string || 'KEGIATAN'
    const linkedAnnouncementId = formData.get('linkedAnnouncementId') as string || null

    if (!file || !file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File harus berupa gambar' },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Ukuran file maksimal 10MB' },
        { status: 400 }
      )
    }

    // Save file
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'gallery')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = path.join(uploadDir, fileName)
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, fileBuffer)

    const fileUrl = `/uploads/gallery/${fileName}`

    // Store gallery item in SystemSetting
    const galleryItem = {
      id: `gallery_${Date.now()}`,
      title: title || file.name,
      description: description || '',
      category,
      fileUrl,
      fileName: file.name,
      fileSize: fileBuffer.length,
      uploadedBy: user.fullName,
      uploadedAt: new Date().toISOString(),
      linkedAnnouncementId,
    }

    await db.systemSetting.create({
      data: {
        key: galleryItem.id,
        value: JSON.stringify(galleryItem),
        category: 'GALLERY',
        description: `Gallery: ${galleryItem.title}`,
      },
    })

    return NextResponse.json({
      success: true,
      data: galleryItem,
      message: 'Foto berhasil diupload ke galeri',
    })
  } catch (e: any) {
    console.error('[Gallery Upload Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE /api/gallery - Delete gallery item
export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get('id')

  if (!itemId) {
    return NextResponse.json({ success: false, error: 'ID item wajib diisi' }, { status: 400 })
  }

  // Get item to find file URL
  const item = await db.systemSetting.findUnique({ where: { key: itemId } })
  if (!item) {
    return NextResponse.json({ success: false, error: 'Item tidak ditemukan' }, { status: 404 })
  }

  // Delete file from disk
  try {
    const galleryData = JSON.parse(item.value)
    if (galleryData.fileUrl) {
      const filePath = path.join(process.cwd(), 'public', galleryData.fileUrl.replace(/^\//, ''))
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }
  } catch {}

  // Delete from DB
  await db.systemSetting.delete({ where: { key: itemId } })

  return NextResponse.json({ success: true, message: 'Foto berhasil dihapus dari galeri' })
}
