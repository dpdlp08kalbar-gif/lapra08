// LAPRA 08 - API: Program Documents [id] — Update & Delete
// PUT  /api/program-documents/[id]  — update metadata (JSON) atau replace file (multipart)
// DELETE /api/program-documents/[id] — hapus dokumen
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB

const ALLOWED_EXTENSIONS: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  mp3: 'audio/mpeg', wav: 'audio/wav',
  txt: 'text/plain', csv: 'text/csv',
}

function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

// PUT - update metadata atau replace file
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params

    // Ambil dokumen lama
    const existing = await db.systemSetting.findUnique({ where: { key: id } })
    if (!existing || existing.category !== 'PROGRAM_DOCUMENT') {
      return NextResponse.json(
        { success: false, error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    let existingData: any
    try {
      existingData = JSON.parse(existing.value)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Data dokumen korup (JSON tidak valid)' },
        { status: 500 }
      )
    }

    // RBAC: cek hak edit
    const isOwner = existingData.uploadedById === user.id
    const isDPN = user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN'
    if (!isOwner && !isDPN) {
      if (existingData.territoryId) {
        const editScope = await getEditableTerritoryIds(user)
        if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(existingData.territoryId)) {
          return NextResponse.json(
            { success: false, error: 'Akses ditolak: Anda tidak bisa edit dokumen ini' },
            { status: 403 }
          )
        }
      }
    }

    const contentType = request.headers.get('content-type') || ''

    // === JSON mode (update metadata only) ===
    if (contentType.includes('application/json')) {
      const body = await request.json()
      const updatedData = {
        ...existingData,
        title: body.title !== undefined ? body.title.substring(0, 500) : existingData.title,
        description: body.description !== undefined ? body.description.substring(0, 5000) : existingData.description,
        location: body.location !== undefined ? body.location.substring(0, 200) : existingData.location,
        date: body.date !== undefined ? body.date : existingData.date,
        status: body.status !== undefined ? body.status : existingData.status,
        category: body.category !== undefined ? body.category : existingData.category,
        level: body.level !== undefined ? body.level : existingData.level,
        territoryCode: body.territoryCode !== undefined ? body.territoryCode : existingData.territoryCode,
        territoryName: body.territoryName !== undefined ? body.territoryName : existingData.territoryName,
        territoryId: body.territoryId !== undefined ? body.territoryId : existingData.territoryId,
        updatedAt: new Date().toISOString(),
      }

      await db.systemSetting.update({
        where: { key: id },
        data: {
          value: JSON.stringify(updatedData),
          description: `${updatedData.category} ${updatedData.level}: ${updatedData.title.substring(0, 80)}`,
        },
      })

      return NextResponse.json({
        success: true,
        data: { ...updatedData, fileData: undefined },
        message: 'Dokumen berhasil diperbarui',
      })
    }

    // === Multipart mode (replace file) ===
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const location = formData.get('location') as string || ''
    const date = formData.get('date') as string || ''
    const status = formData.get('status') as string || 'DIRENCANAKAN'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File wajib diupload' },
        { status: 400 }
      )
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Ukuran file maksimal 4MB. File Anda: ${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 400 }
      )
    }

    const ext = getFileExtension(file.name)
    if (!ALLOWED_EXTENSIONS[ext]) {
      return NextResponse.json(
        { success: false, error: `Format file .${ext} tidak didukung` },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const mimeType = ALLOWED_EXTENSIONS[ext] || file.type || 'application/octet-stream'
    const base64Content = buffer.toString('base64')
    const fileData = `data:${mimeType};base64,${base64Content}`

    const updatedData = {
      ...existingData,
      title: title ? title.substring(0, 500) : existingData.title,
      description: description !== null ? (description || '').substring(0, 5000) : existingData.description,
      location: location || existingData.location,
      date: date || existingData.date,
      status: status || existingData.status,
      fileName: file.name.substring(0, 200),
      fileType: ext.toUpperCase(),
      fileMimeType: mimeType,
      fileSize: file.size,
      fileData,
      updatedAt: new Date().toISOString(),
    }

    await db.systemSetting.update({
      where: { key: id },
      data: {
        value: JSON.stringify(updatedData),
        description: `${updatedData.category} ${updatedData.level}: ${updatedData.title.substring(0, 80)}`,
      },
    })

    return NextResponse.json({
      success: true,
      data: { ...updatedData, fileData: undefined },
      message: 'File & metadata berhasil diperbarui',
    })
  } catch (e: any) {
    console.error('[ProgramDocs PUT] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal update dokumen: ${e.message}` },
      { status: 500 }
    )
  }
}

// DELETE - hapus dokumen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params

    const existing = await db.systemSetting.findUnique({ where: { key: id } })
    if (!existing || existing.category !== 'PROGRAM_DOCUMENT') {
      return NextResponse.json(
        { success: false, error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    let existingData: any = {}
    try { existingData = JSON.parse(existing.value) } catch {}

    // RBAC
    const isOwner = existingData.uploadedById === user.id
    const isDPN = user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN'
    if (!isOwner && !isDPN) {
      if (existingData.territoryId) {
        const editScope = await getEditableTerritoryIds(user)
        if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(existingData.territoryId)) {
          return NextResponse.json(
            { success: false, error: 'Akses ditolak: Anda tidak bisa menghapus dokumen ini' },
            { status: 403 }
          )
        }
      }
    }

    await db.systemSetting.delete({ where: { key: id } })

    return NextResponse.json({
      success: true,
      message: 'Dokumen berhasil dihapus',
    })
  } catch (e: any) {
    console.error('[ProgramDocs DELETE] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal menghapus dokumen: ${e.message}` },
      { status: 500 }
    )
  }
}
