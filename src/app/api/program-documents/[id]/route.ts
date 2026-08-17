// LAPRA 08 - API: Program Documents [id] (v2 — pakai ProgramDocument table)
// PUT  /api/program-documents/[id]  — update metadata (JSON) atau replace file (multipart)
// DELETE /api/program-documents/[id] — soft-delete dokumen
//
// [id] di sini adalah **Prisma id** (cuid) — bukan docKey
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds, isDPNLevel } from '@/lib/server-helpers'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 4 * 1024 * 1024

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

const VALID_CATEGORIES = ['PROGRAM_KERJA', 'AKSI_SOSIAL', 'KEMITRAAN', 'AGENDA']
const VALID_LEVELS = ['DPN', 'DPD', 'DPC']
const VALID_STATUSES = ['DIRENCANAKAN', 'BERJALAN', 'SELESAI', 'DITUNDA']

function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

// Helper: cek apakah user boleh edit dokumen ini
async function canEditDoc(user: any, doc: any): Promise<{ allowed: boolean; reason?: string }> {
  // Owner selalu boleh edit dokumennya sendiri
  if (doc.uploadedById === user.id) return { allowed: true }
  // DPN/SuperAdmin boleh semua
  if (isDPNLevel(user.role)) return { allowed: true }
  // Untuk DPN-level doc, hanya DPN yang boleh
  if (doc.level === 'DPN') {
    return { allowed: false, reason: 'Hanya Admin DPN yang bisa edit dokumen DPN' }
  }
  // Untuk DPD/DPC doc, cek scope
  if (doc.territoryId) {
    const editScope = await getEditableTerritoryIds(user)
    if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(doc.territoryId)) {
      return { allowed: false, reason: 'Anda tidak punya hak edit di wilayah dokumen ini' }
    }
    // ADMIN_DPC hanya boleh edit DPC
    if (user.role === 'ADMIN_DPC' && doc.level !== 'DPC') {
      return { allowed: false, reason: 'Admin DPC hanya bisa edit dokumen level DPC' }
    }
    return { allowed: true }
  }
  // Dokumen DPD/DPC tanpa territoryId → deny (defensive)
  return { allowed: false, reason: 'Dokumen tidak punya territory, akses ditolak' }
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

    const existing = await db.programDocument.findUnique({
      where: { id },
      select: {
        id: true, docKey: true, title: true, level: true, territoryId: true,
        uploadedById: true, fileData: true,
      },
    })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ success: false, error: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    // RBAC check
    const editCheck = await canEditDoc(user, existing)
    if (!editCheck.allowed) {
      return NextResponse.json({ success: false, error: editCheck.reason }, { status: 403 })
    }

    const contentType = request.headers.get('content-type') || ''

    // === JSON mode (update metadata only) ===
    if (contentType.includes('application/json')) {
      const body = await request.json()
      const { title, description, location, eventDate, status, category, level, territoryCode, territoryName, territoryId } = body

      // Validate enums if provided
      if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
        return NextResponse.json({ success: false, error: 'Category tidak valid' }, { status: 400 })
      }
      if (level !== undefined && !VALID_LEVELS.includes(level)) {
        return NextResponse.json({ success: false, error: 'Level tidak valid' }, { status: 400 })
      }
      if (status !== undefined && !VALID_STATUSES.includes(status)) {
        return NextResponse.json({ success: false, error: 'Status tidak valid' }, { status: 400 })
      }

      // Kalau level/territoryId berubah, re-check RBAC untuk lokasi baru
      const newLevel = level ?? existing.level
      const newTerritoryId = territoryId !== undefined ? (territoryId || null) : existing.territoryId
      if ((level !== undefined || territoryId !== undefined) && newLevel !== existing.level || territoryId !== undefined) {
        // Allow changing within same scope (DPD → DPD di provinsi sama, atau DPC → DPC di kab/kota sama)
        // Tapi kalau ganti level/territory ke wilayah lain, harus punya akses di wilayah baru
        if (!isDPNLevel(user.role) && existing.uploadedById !== user.id) {
          const editScope = await getEditableTerritoryIds(user)
          if (newTerritoryId && !editScope.isGlobalEdit && !editScope.territoryIds.includes(newTerritoryId)) {
            return NextResponse.json(
              { success: false, error: 'Anda tidak punya hak edit di wilayah baru' },
              { status: 403 }
            )
          }
        }
      }

      const updated = await db.programDocument.update({
        where: { id },
        data: {
          title: title !== undefined ? String(title).substring(0, 500) : undefined,
          description: description !== undefined ? (String(description).substring(0, 5000) || null) : undefined,
          location: location !== undefined ? (String(location).substring(0, 200) || null) : undefined,
          eventDate: eventDate !== undefined ? (eventDate ? new Date(eventDate) : null) : undefined,
          status: status !== undefined ? status : undefined,
          category: category !== undefined ? category : undefined,
          level: level !== undefined ? level : undefined,
          territoryCode: territoryCode !== undefined ? (territoryCode || null) : undefined,
          territoryName: territoryName !== undefined ? (territoryName || null) : undefined,
          territoryId: territoryId !== undefined ? (territoryId || null) : undefined,
        },
        select: {
          id: true, docKey: true, title: true, description: true, category: true, level: true,
          territoryId: true, territoryCode: true, territoryName: true, location: true,
          eventDate: true, status: true, fileName: true, fileType: true, fileSize: true,
          uploadedBy: { select: { id: true, fullName: true } },
          uploadedAt: true, updatedAt: true,
        },
      })

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Metadata dokumen berhasil diperbarui',
      })
    }

    // === Multipart mode (replace file) ===
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string | null) || existing.title
    const description = (formData.get('description') as string | null) || undefined
    const location = (formData.get('location') as string | null) || undefined
    const eventDate = formData.get('eventDate') as string | null
    const status = (formData.get('status') as string | null) || undefined

    if (!file) {
      return NextResponse.json({ success: false, error: 'File wajib diupload' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Ukuran file melebihi 4MB. File Anda: ${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 413 }
      )
    }

    const ext = getFileExtension(file.name)
    if (!ALLOWED_EXTENSIONS[ext]) {
      return NextResponse.json(
        { success: false, error: `Format .${ext} tidak didukung` },
        { status: 415 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const mimeType = ALLOWED_EXTENSIONS[ext] || file.type || 'application/octet-stream'
    const base64Content = buffer.toString('base64')
    const fileData = `data:${mimeType};base64,${base64Content}`
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex')

    // Dedup check — tapi allow update file-nya sendiri
    const dup = await db.programDocument.findFirst({
      where: { fileHash, id: { not: id }, deletedAt: null },
      select: { id: true, title: true },
    })
    if (dup) {
      return NextResponse.json({
        success: false,
        error: `File duplikat: sudah ada di dokumen "${dup.title}"`,
      }, { status: 409 })
    }

    const updated = await db.programDocument.update({
      where: { id },
      data: {
        title: String(title).substring(0, 500),
        description: description !== undefined ? (description.substring(0, 5000) || null) : undefined,
        location: location !== undefined ? (location.substring(0, 200) || null) : undefined,
        eventDate: eventDate ? new Date(eventDate) : undefined,
        status: status || undefined,
        fileName: file.name.substring(0, 200),
        fileType: ext.toUpperCase(),
        fileMimeType: mimeType,
        fileSize: file.size,
        fileHash,
        fileData,
      },
      select: {
        id: true, docKey: true, title: true, fileName: true, fileType: true, fileSize: true,
        category: true, level: true, territoryCode: true, territoryName: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
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

// DELETE - soft-delete dokumen (set deletedAt = now)
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

    const existing = await db.programDocument.findUnique({
      where: { id },
      select: {
        id: true, docKey: true, title: true, level: true, territoryId: true,
        uploadedById: true, fileName: true,
      },
    })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ success: false, error: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    // RBAC check
    const editCheck = await canEditDoc(user, existing)
    if (!editCheck.allowed) {
      return NextResponse.json({ success: false, error: editCheck.reason }, { status: 403 })
    }

    // Soft delete: set deletedAt = now, simpan deletedById via audit (jika field tersedia)
    await db.programDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: `Dokumen "${existing.title}" berhasil dihapus`,
    })
  } catch (e: any) {
    console.error('[ProgramDocs DELETE] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal menghapus dokumen: ${e.message}` },
      { status: 500 }
    )
  }
}
