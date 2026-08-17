// LAPRA 08 - API: Program Documents Bulk — bulk upload + bulk delete
// POST /api/program-documents/bulk  (multipart: multiple files + shared metadata)
//   - body: FormData { files: File[], title_prefix, category, level, territoryCode, ... }
//   - returns: { success: boolean, data: { uploaded: [...], failed: [...] } }
//
// DELETE /api/program-documents/bulk?ids=id1,id2,id3  OR  body { ids: string[] }
//   - returns: { success: boolean, data: { deleted: number, failed: [...] } }
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds, isDPNLevel } from '@/lib/server-helpers'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 4 * 1024 * 1024
const MAX_FILES_PER_BATCH = 10

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

async function canWriteAtLevel(user: any, level: string, territoryId: string | null) {
  if (isDPNLevel(user.role)) return { allowed: true }
  if (level === 'DPN') return { allowed: false, reason: 'Hanya Admin DPN yang bisa tambah dokumen DPN' }
  if (!territoryId) return { allowed: false, reason: `territoryId wajib untuk dokumen level ${level}` }
  const editScope = await getEditableTerritoryIds(user)
  if (editScope.isGlobalEdit) return { allowed: true }
  if (!editScope.territoryIds.includes(territoryId)) {
    return { allowed: false, reason: 'Anda tidak punya hak edit di wilayah ini' }
  }
  if (user.role === 'ADMIN_DPC' && level !== 'DPC') {
    return { allowed: false, reason: 'Admin DPC hanya bisa tambah dokumen level DPC' }
  }
  if (user.role === 'ADMIN_DPD' && !['DPD', 'DPC'].includes(level)) {
    return { allowed: false, reason: 'Admin DPD hanya bisa tambah dokumen level DPD/DPC' }
  }
  return { allowed: true }
}

// POST - bulk upload multiple files with shared metadata
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files').filter(f => f instanceof File) as File[]
    const titlePrefix = (formData.get('titlePrefix') as string || '').trim()
    const category = (formData.get('category') as string || '').trim()
    const level = (formData.get('level') as string || '').trim()
    const territoryCode = (formData.get('territoryCode') as string || '').trim()
    const territoryName = (formData.get('territoryName') as string || '').trim()
    const territoryId = (formData.get('territoryId') as string || '').trim() || null
    const location = (formData.get('location') as string || '').trim()
    const eventDate = formData.get('eventDate') as string || ''
    const status = (formData.get('status') as string || 'DIRENCANAKAN').trim()

    if (!files.length) {
      return NextResponse.json({ success: false, error: 'Tidak ada file untuk diupload' }, { status: 400 })
    }
    if (files.length > MAX_FILES_PER_BATCH) {
      return NextResponse.json(
        { success: false, error: `Maksimal ${MAX_FILES_PER_BATCH} file per batch. Anda upload ${files.length}.` },
        { status: 400 }
      )
    }
    if (!category || !level) {
      return NextResponse.json({ success: false, error: 'Field wajib: category, level' }, { status: 400 })
    }
    if (!VALID_CATEGORIES.includes(category) || !VALID_LEVELS.includes(level)) {
      return NextResponse.json({ success: false, error: 'Category/level tidak valid' }, { status: 400 })
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: 'Status tidak valid' }, { status: 400 })
    }

    // RBAC check sekali untuk semua file
    const writeCheck = await canWriteAtLevel(user, level, territoryId)
    if (!writeCheck.allowed) {
      return NextResponse.json({ success: false, error: writeCheck.reason }, { status: 403 })
    }

    const uploaded: any[] = []
    const failed: { fileName: string; reason: string }[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        if (file.size > MAX_FILE_SIZE) {
          failed.push({ fileName: file.name, reason: `Ukuran > 4MB (${(file.size / 1024 / 1024).toFixed(2)}MB)` })
          continue
        }
        const ext = getFileExtension(file.name)
        if (!ALLOWED_EXTENSIONS[ext]) {
          failed.push({ fileName: file.name, reason: `Format .${ext} tidak didukung` })
          continue
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const mimeType = ALLOWED_EXTENSIONS[ext] || file.type || 'application/octet-stream'
        const base64Content = buffer.toString('base64')
        const fileData = `data:${mimeType};base64,${base64Content}`
        const fileHash = crypto.createHash('sha256').update(buffer).digest('hex')

        // Dedup check
        const dup = await db.programDocument.findFirst({
          where: { fileHash, deletedAt: null },
          select: { id: true, title: true },
        })
        if (dup) {
          failed.push({ fileName: file.name, reason: `Duplikat dengan "${dup.title}"` })
          continue
        }

        const docKey = `progdoc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${i}`
        const title = titlePrefix
          ? `${titlePrefix} (${i + 1})`
          : file.name.replace(/\.[^.]+$/, '').substring(0, 500)

        const created = await db.programDocument.create({
          data: {
            docKey,
            title,
            description: null,
            category,
            level,
            territoryId,
            territoryCode: territoryCode || null,
            territoryName: territoryName || null,
            location: location.substring(0, 200) || null,
            eventDate: eventDate ? new Date(eventDate) : null,
            status,
            fileName: file.name.substring(0, 200),
            fileType: ext.toUpperCase(),
            fileMimeType: mimeType,
            fileSize: file.size,
            fileHash,
            fileData,
            uploadedById: user.id,
          },
          select: {
            id: true, docKey: true, title: true, fileName: true, fileType: true, fileSize: true,
          },
        })
        uploaded.push(created)
      } catch (e: any) {
        failed.push({ fileName: file.name, reason: e.message })
      }
    }

    return NextResponse.json({
      success: true,
      data: { uploaded, failed },
      message: `Upload selesai: ${uploaded.length} berhasil, ${failed.length} gagal`,
    }, { status: 201 })
  } catch (e: any) {
    console.error('[ProgramDocs Bulk POST] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal bulk upload: ${e.message}` },
      { status: 500 }
    )
  }
}

// DELETE - bulk delete (soft-delete) multiple docs by id
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    let ids: string[] = []
    const url = new URL(request.url)
    const idsParam = url.searchParams.get('ids')
    if (idsParam) {
      ids = idsParam.split(',').map(s => s.trim()).filter(Boolean)
    } else {
      try {
        const body = await request.json()
        if (Array.isArray(body?.ids)) {
          ids = body.ids.filter((x: any) => typeof x === 'string')
        }
      } catch {}
    }

    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Parameter ids wajib' }, { status: 400 })
    }
    if (ids.length > 100) {
      return NextResponse.json({ success: false, error: 'Maksimal 100 dokumen per request' }, { status: 400 })
    }

    const docs = await db.programDocument.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, level: true, territoryId: true, uploadedById: true, title: true },
    })

    let deletedCount = 0
    const failed: { id: string; reason: string }[] = []
    const editScope = await getEditableTerritoryIds(user)

    for (const doc of docs) {
      const canDelete =
        doc.uploadedById === user.id ||
        isDPNLevel(user.role) ||
        (doc.level !== 'DPN' && doc.territoryId && (editScope.isGlobalEdit || editScope.territoryIds.includes(doc.territoryId)))

      if (!canDelete) {
        failed.push({ id: doc.id, reason: 'Tidak punya hak hapus' })
        continue
      }
      try {
        await db.programDocument.update({
          where: { id: doc.id },
          data: { deletedAt: new Date() },
        })
        deletedCount++
      } catch (e: any) {
        failed.push({ id: doc.id, reason: e.message })
      }
    }

    const notFound = ids.filter(id => !docs.find(d => d.id === id))
    notFound.forEach(id => failed.push({ id, reason: 'Tidak ditemukan' }))

    return NextResponse.json({
      success: true,
      data: { deleted: deletedCount, failed },
      message: `${deletedCount} dokumen dihapus, ${failed.length} gagal`,
    })
  } catch (e: any) {
    console.error('[ProgramDocs Bulk DELETE] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal bulk delete: ${e.message}` },
      { status: 500 }
    )
  }
}
