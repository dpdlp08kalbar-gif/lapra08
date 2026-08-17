// LAPRA 08 - API: Program Documents (v2 — pakai ProgramDocument table)
// Upload & manage file bukti pelaksanaan untuk Program Kerja, Aksi Sosial, Kemitraan, Agenda
// Struktur hierarki: DPN → DPD → DPC
//
// GET  /api/program-documents?category=&level=&territoryCode=&status=&page=&pageSize=&search=&sort=
// POST /api/program-documents (multipart untuk upload, atau JSON untuk metadata)
//
// Storage: fileData tetap base64 inline (Vercel Free 4MB limit OK)
//          — tapi di SELECT list, fileData TIDAK di-load (use Prisma select)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getViewableTerritoryIds, getEditableTerritoryIds, isDPNLevel } from '@/lib/server-helpers'
import crypto from 'crypto'

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

const VALID_CATEGORIES = ['PROGRAM_KERJA', 'AKSI_SOSIAL', 'KEMITRAAN', 'AGENDA']
const VALID_LEVELS = ['DPN', 'DPD', 'DPC']
const VALID_STATUSES = ['DIRENCANAKAN', 'BERJALAN', 'SELESAI', 'DITUNDA']

function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

// Helper: cek apakah user boleh write di suatu level+territoryId
async function canWriteAtLevel(
  user: any,
  level: string,
  territoryId: string | null
): Promise<{ allowed: boolean; reason?: string }> {
  // DPN/SuperAdmin → boleh semua
  if (isDPNLevel(user.role)) return { allowed: true }

  // Untuk DPN-level doc, hanya DPN yang boleh
  if (level === 'DPN') {
    return { allowed: false, reason: 'Hanya Admin DPN yang bisa tambah/edit dokumen DPN' }
  }

  if (!territoryId) {
    return { allowed: false, reason: `territoryId wajib untuk dokumen level ${level}` }
  }

  const editScope = await getEditableTerritoryIds(user)
  if (editScope.isGlobalEdit) return { allowed: true }
  if (!editScope.territoryIds.includes(territoryId)) {
    return { allowed: false, reason: 'Anda tidak punya hak edit di wilayah ini' }
  }

  // ADMIN_DPC hanya boleh level DPC
  if (user.role === 'ADMIN_DPC' && level !== 'DPC') {
    return { allowed: false, reason: 'Admin DPC hanya bisa tambah dokumen level DPC' }
  }
  // ADMIN_DPD boleh DPD & DPC di scope-nya
  if (user.role === 'ADMIN_DPD' && !['DPD', 'DPC'].includes(level)) {
    return { allowed: false, reason: 'Admin DPD hanya bisa tambah dokumen level DPD/DPC' }
  }

  return { allowed: true }
}

// Helper: dapatkan list territoryId yang bisa dilihat user
async function getViewableTerritoryFilter(user: any): Promise<{
  isGlobal: boolean
  territoryIds: string[]
}> {
  try {
    const scope = await getViewableTerritoryIds(user)
    return {
      isGlobal: scope.isGlobalView,
      territoryIds: scope.territoryIds,
    }
  } catch (e: any) {
    console.error('[ProgramDocs] getViewableTerritoryIds failed:', e.message)
    if (!user.territoryId) return { isGlobal: false, territoryIds: [] }
    return { isGlobal: false, territoryIds: [user.territoryId] }
  }
}

// GET - list program documents (dengan pagination + filter + RBAC proper)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const level = searchParams.get('level')
    const territoryCode = searchParams.get('territoryCode')
    const status = searchParams.get('status')
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'updatedAt_desc' // updatedAt_desc | updatedAt_asc | title_asc | title_desc | fileSize_desc | eventDate_desc
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(5, parseInt(searchParams.get('pageSize') || '20')))

    // Validate enums
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ success: false, error: `Category tidak valid: ${category}` }, { status: 400 })
    }
    if (level && !VALID_LEVELS.includes(level)) {
      return NextResponse.json({ success: false, error: `Level tidak valid: ${level}` }, { status: 400 })
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: `Status tidak valid: ${status}` }, { status: 400 })
    }

    // Build where clause
    const where: any = { deletedAt: null }
    if (category) where.category = category
    if (level) where.level = level
    if (territoryCode) where.territoryCode = territoryCode
    if (status) where.status = status
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ]
    }

    // RBAC filter: DPN bisa lihat semua; non-DPN hanya lihat scope-nya
    const viewScope = await getViewableTerritoryFilter(user)
    if (!viewScope.isGlobal) {
      // DPN-level doc selalu visible ke semua user (program pusat publik)
      // DPD/DPC: hanya yang di scope user
      const allowedIds = viewScope.territoryIds
      where.OR = [
        { level: 'DPN' },
        ...(allowedIds.length > 0 ? [{ territoryId: { in: allowedIds } }] : []),
      ]
      // merge dengan search OR jika ada
      if (search) {
        const searchOr = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ]
        where.OR = [
          ...where.OR.map((cond: any) => ({ AND: [cond, { OR: searchOr }] })),
        ]
      }
    }

    // Build sort
    const orderBy: any[] = []
    switch (sort) {
      case 'updatedAt_asc': orderBy.push({ updatedAt: 'asc' }); break
      case 'title_asc': orderBy.push({ title: 'asc' }); break
      case 'title_desc': orderBy.push({ title: 'desc' }); break
      case 'fileSize_desc': orderBy.push({ fileSize: 'desc' }); break
      case 'eventDate_desc': orderBy.push({ eventDate: 'desc' }); break
      case 'updatedAt_desc':
      default:
        orderBy.push({ updatedAt: 'desc' }); break
    }
    // Secondary sort untuk konsistensi
    orderBy.push({ id: 'asc' })

    // Get total count untuk pagination
    const total = await db.programDocument.count({ where })

    // SELECT — TIDAK termasuk fileData (mencegah OOM)
    const docs = await db.programDocument.findMany({
      where,
      select: {
        id: true,
        docKey: true,
        title: true,
        description: true,
        category: true,
        level: true,
        territoryId: true,
        territoryCode: true,
        territoryName: true,
        location: true,
        eventDate: true,
        status: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        fileHash: true,
        uploadedById: true,
        uploadedBy: { select: { id: true, fullName: true } },
        uploadedAt: true,
        updatedAt: true,
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: docs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    })
  } catch (e: any) {
    console.error('[ProgramDocs GET] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal memuat dokumen program: ${e.message}` },
      { status: 500 }
    )
  }
}

// POST - upload dokumen baru
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') || ''
    const userId = user.id

    // === JSON mode (metadata only, tanpa file) ===
    if (contentType.includes('application/json')) {
      const body = await request.json()
      const { title, description, location, eventDate, status, category, level, territoryCode, territoryName, territoryId } = body

      if (!title || !category || !level) {
        return NextResponse.json(
          { success: false, error: 'Field wajib: title, category, level' },
          { status: 400 }
        )
      }
      if (!VALID_CATEGORIES.includes(category)) {
        return NextResponse.json({ success: false, error: `Category tidak valid: ${category}` }, { status: 400 })
      }
      if (!VALID_LEVELS.includes(level)) {
        return NextResponse.json({ success: false, error: `Level tidak valid: ${level}` }, { status: 400 })
      }
      if (status && !VALID_STATUSES.includes(status)) {
        return NextResponse.json({ success: false, error: `Status tidak valid: ${status}` }, { status: 400 })
      }

      // RBAC check
      const writeCheck = await canWriteAtLevel(user, level, territoryId || null)
      if (!writeCheck.allowed) {
        return NextResponse.json({ success: false, error: writeCheck.reason }, { status: 403 })
      }

      const docKey = `progdoc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
      const created = await db.programDocument.create({
        data: {
          docKey,
          title: title.substring(0, 500),
          description: (description || '').substring(0, 5000) || null,
          category,
          level,
          territoryId: territoryId || null,
          territoryCode: territoryCode || null,
          territoryName: territoryName || null,
          location: (location || '').substring(0, 200) || null,
          eventDate: eventDate ? new Date(eventDate) : null,
          status: status || 'DIRENCANAKAN',
          uploadedById: userId,
        },
        select: { id: true, docKey: true },
      })

      return NextResponse.json({
        success: true,
        data: { id: created.id, docKey: created.docKey },
        message: 'Dokumen program (metadata) berhasil dibuat',
      }, { status: 201 })
    }

    // === Multipart mode (upload file) ===
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string || '').trim()
    const description = (formData.get('description') as string || '').trim()
    const category = (formData.get('category') as string || '').trim()
    const level = (formData.get('level') as string || '').trim()
    const territoryCode = (formData.get('territoryCode') as string || '').trim()
    const territoryName = (formData.get('territoryName') as string || '').trim()
    const territoryId = (formData.get('territoryId') as string || '').trim() || null
    const location = (formData.get('location') as string || '').trim()
    const eventDate = formData.get('eventDate') as string || ''
    const status = (formData.get('status') as string || 'DIRENCANAKAN').trim()

    // Validasi
    if (!title || !category || !level) {
      return NextResponse.json(
        { success: false, error: 'Field wajib: title, category, level' },
        { status: 400 }
      )
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ success: false, error: `Category tidak valid` }, { status: 400 })
    }
    if (!VALID_LEVELS.includes(level)) {
      return NextResponse.json({ success: false, error: `Level tidak valid` }, { status: 400 })
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: `Status tidak valid` }, { status: 400 })
    }
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

    // RBAC check
    const writeCheck = await canWriteAtLevel(user, level, territoryId)
    if (!writeCheck.allowed) {
      return NextResponse.json({ success: false, error: writeCheck.reason }, { status: 403 })
    }

    // Convert file → base64 data URL + compute SHA-256 hash
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const mimeType = ALLOWED_EXTENSIONS[ext] || file.type || 'application/octet-stream'
    const base64Content = buffer.toString('base64')
    const fileData = `data:${mimeType};base64,${base64Content}`
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex')

    // Dedup check: kalau hash sama untuk same category+level+territoryCode → reject
    const existing = await db.programDocument.findFirst({
      where: { fileHash, category, level, deletedAt: null },
      select: { id: true, docKey: true, title: true },
    })
    if (existing) {
      return NextResponse.json({
        success: false,
        error: `File duplikat: sudah ada dokumen "${existing.title}" dengan konten yang sama`,
        existing: { id: existing.id, docKey: existing.docKey },
      }, { status: 409 })
    }

    const docKey = `progdoc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    const created = await db.programDocument.create({
      data: {
        docKey,
        title: title.substring(0, 500),
        description: description.substring(0, 5000) || null,
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
        uploadedById: userId,
      },
      select: {
        id: true, docKey: true, title: true, fileName: true, fileType: true, fileSize: true,
        category: true, level: true, territoryCode: true, territoryName: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: created,
      message: `Dokumen "${title}" (${level}) berhasil diupload`,
    }, { status: 201 })
  } catch (e: any) {
    console.error('[ProgramDocs POST] Error:', e)
    // P2002 = unique constraint violation
    if (e.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Konflik: ID/dockey sudah ada. Coba lagi.' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, error: `Gagal upload dokumen: ${e.message}` },
      { status: 500 }
    )
  }
}
