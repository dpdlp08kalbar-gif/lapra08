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

  // Get all gallery items AND program content items from SystemSetting
  // Gallery: photo gallery items; PROGRAM_CONTENT: program/aksi/kemitraan items
  const items = await db.systemSetting.findMany({
    where: { category: { in: ['GALLERY', 'PROGRAM_CONTENT'] } },
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

// POST /api/gallery - Upload photo to gallery OR create program content (JSON)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') || ''

  // JSON mode (for ProgramContentManager - store program/aksi/kemitraan items without image upload)
  if (contentType.includes('application/json')) {
    try {
      const body = await request.json()
      const itemData = {
        id: body.id || `prog_${Date.now()}`,
        title: body.title || '',
        description: body.description || '',
        location: body.location || '',
        date: body.date || '',
        status: body.status || 'DIRENCANAKAN',
        category: body.category || 'PROGRAM_KERJA',
        uploadedBy: user.fullName,
        uploadedAt: new Date().toISOString(),
      }

      await db.systemSetting.upsert({
        where: { key: itemData.id },
        update: { value: JSON.stringify(itemData), category: 'PROGRAM_CONTENT' },
        create: {
          key: itemData.id,
          value: JSON.stringify(itemData),
          category: 'PROGRAM_CONTENT',
          description: `Program: ${itemData.title}`,
        },
      })

      return NextResponse.json({ success: true, data: itemData, message: 'Program content disimpan' })
    } catch (e: any) {
      console.error('[Program Content Error]', e)
      return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
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

    // === Vercel-compatible: convert file to base64 data URL (no filesystem) ===
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.toLowerCase().match(/\.([^.]+)$/)?.[1] || 'jpg'
    const mimeType = ext === 'png' ? 'image/png'
                   : ext === 'webp' ? 'image/webp'
                   : ext === 'gif' ? 'image/gif'
                   : 'image/jpeg'
    const base64DataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`

    // Store gallery item in SystemSetting (with embedded base64 fileData)
    const galleryItem = {
      id: `gallery_${Date.now()}`,
      title: title || file.name,
      description: description || '',
      category,
      fileUrl: base64DataUrl, // direct data URL — works in <img src>
      fileName: file.name,
      fileSize: fileBuffer.length,
      fileType: ext,
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

    // Return without fileData (avoid huge response) — UI uses fileUrl directly
    return NextResponse.json({
      success: true,
      data: { ...galleryItem, fileUrl: base64DataUrl.substring(0, 50) + '...[base64]' },
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

  // Get item to find file URL (just for logging now — no disk file to delete)
  const item = await db.systemSetting.findUnique({ where: { key: itemId } })
  if (!item) {
    return NextResponse.json({ success: false, error: 'Item tidak ditemukan' }, { status: 404 })
  }

  // File is stored as base64 in DB value — no disk file to delete
  // Just delete the DB record

  // Delete from DB
  await db.systemSetting.delete({ where: { key: itemId } })

  return NextResponse.json({ success: true, message: 'Foto berhasil dihapus dari galeri' })
}
