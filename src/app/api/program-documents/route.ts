// LAPRA 08 - API: Program Documents
// Upload & manage file bukti pelaksanaan untuk Program Kerja, Aksi Sosial, Kemitraan, Agenda
// Struktur hierarki: DPN → DPD → DPC
//
// GET  /api/program-documents?category=PROGRAM_KERJA&level=DPN
// POST /api/program-documents (multipart/form-data untuk upload file, atau JSON untuk metadata)
//
// Storage: SystemSetting key=`progdoc_<id>` value=JSON (incl. base64 fileData)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getViewableTerritoryIds, getEditableTerritoryIds } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// File size limit (Vercel free = 4.5MB body, kita batasi 4MB untuk safety)
const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB

// Ekstensi file yang diperbolehkan
const ALLOWED_EXTENSIONS: Record<string, string> = {
  // PDF
  pdf: 'application/pdf',
  // Images
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  // Documents
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Video
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  // Audio
  mp3: 'audio/mpeg', wav: 'audio/wav',
  // Text
  txt: 'text/plain', csv: 'text/csv',
}

function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

// GET - list program documents (dengan filter)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') // PROGRAM_KERJA | AKSI_SOSIAL | KEMITRAAN | AGENDA
    const level = searchParams.get('level') // DPN | DPD | DPC
    const territoryCode = searchParams.get('territoryCode')

    // Defensive scope
    let viewScope
    try {
      viewScope = await getViewableTerritoryIds(user)
    } catch (scopeErr: any) {
      console.error('[ProgramDocs GET] scope failed:', scopeErr.message)
      if (!user.territoryId) return NextResponse.json({ success: true, data: [] })
      viewScope = { isGlobalView: false, territoryIds: [user.territoryId], primaryTerritoryId: user.territoryId }
    }

    const items = await db.systemSetting.findMany({
      where: { category: 'PROGRAM_DOCUMENT' },
      orderBy: { updatedAt: 'desc' },
    })

    // Parse JSON value
    let docs = items.map((item) => {
      try { return JSON.parse(item.value) } catch { return null }
    }).filter(Boolean)

    // Filter berdasarkan parameter
    if (category) docs = docs.filter((d: any) => d.category === category)
    if (level) docs = docs.filter((d: any) => d.level === level)
    if (territoryCode) docs = docs.filter((d: any) => d.territoryCode === territoryCode)

    // RBAC filter: DPN bisa lihat semua, DPD lihat provinsi-nya + DPN, DPC lihat dirinya + DPD + DPN
    if (!viewScope.isGlobalView) {
      const allowedTerritoryIds = new Set(viewScope.territoryIds)
      docs = docs.filter((d: any) => {
        // DPN level → bisa diakses semua (teritori pusat)
        if (d.level === 'DPN') return true
        // Untuk DPD/DPC → cek territoryCode ada dalam scope view user
        // Karena territoryCode di ProgramDoc beda format dengan territoryId, kita relax check:
        // tampilkan kalau user DPD/DPC dan dokumen level DPC di provinsi yang sama, atau DPD di provinsi yang sama
        if (d.territoryCode) return allowedTerritoryIds.has(d.territoryId || '')
        // Kalau tidak ada territoryId, allow (defensive)
        return true
      })
    }

    // Strip fileData dari response list (terlalu besar untuk list, hanya dikirim saat view)
    const summaries = docs.map((d: any) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      category: d.category,
      level: d.level,
      territoryCode: d.territoryCode || null,
      territoryName: d.territoryName || null,
      territoryId: d.territoryId || null,
      fileName: d.fileName || null,
      fileType: d.fileType || null,
      fileSize: d.fileSize || 0,
      location: d.location || '',
      date: d.date || '',
      status: d.status || 'DIRENCANAKAN',
      uploadedBy: d.uploadedBy || 'Unknown',
      uploadedAt: d.uploadedAt,
      updatedAt: d.updatedAt,
    }))

    return NextResponse.json({ success: true, data: summaries })
  } catch (e: any) {
    console.error('[ProgramDocs GET] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal memuat dokumen program: ${e.message}` },
      { status: 500 }
    )
  }
}

// POST - upload dokumen baru (multipart/form-data atau JSON)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') || ''

    // === JSON mode (metadata only, tanpa file) ===
    if (contentType.includes('application/json')) {
      const body = await request.json()
      const { title, description, location, date, status, category, level, territoryCode, territoryName, territoryId } = body

      if (!title || !category || !level) {
        return NextResponse.json(
          { success: false, error: 'Field wajib: title, category, level' },
          { status: 400 }
        )
      }

      // Validate level
      if (!['DPN', 'DPD', 'DPC'].includes(level)) {
        return NextResponse.json(
          { success: false, error: 'Level harus DPN, DPD, atau DPC' },
          { status: 400 }
        )
      }

      // RBAC check untuk territory
      if (territoryId) {
        const editScope = await getEditableTerritoryIds(user)
        if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(territoryId)) {
          return NextResponse.json(
            { success: false, error: 'Akses ditolak: Anda tidak punya hak edit di wilayah ini' },
            { status: 403 }
          )
        }
      }

      const id = `progdoc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const nowIso = new Date().toISOString()
      const itemData = {
        id,
        title: title.substring(0, 500),
        description: (description || '').substring(0, 5000),
        category,
        level,
        territoryCode: territoryCode || null,
        territoryName: territoryName || null,
        territoryId: territoryId || null,
        location: (location || '').substring(0, 200),
        date: date || '',
        status: status || 'DIRENCANAKAN',
        fileName: null,
        fileType: null,
        fileSize: 0,
        fileData: null,
        uploadedBy: user.fullName,
        uploadedById: user.id,
        uploadedAt: nowIso,
        updatedAt: nowIso,
      }

      await db.systemSetting.create({
        data: {
          key: id,
          value: JSON.stringify(itemData),
          category: 'PROGRAM_DOCUMENT',
          description: `${category} ${level}: ${title.substring(0, 80)}`,
        },
      })

      return NextResponse.json({
        success: true,
        data: { ...itemData, fileData: undefined },
        message: 'Dokumen program berhasil dibuat (tanpa file)',
      })
    }

    // === Multipart mode (upload file) ===
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const level = formData.get('level') as string
    const territoryCode = formData.get('territoryCode') as string || ''
    const territoryName = formData.get('territoryName') as string || ''
    const territoryId = formData.get('territoryId') as string || ''
    const location = formData.get('location') as string || ''
    const date = formData.get('date') as string || ''
    const status = formData.get('status') as string || 'DIRENCANAKAN'

    // Validasi
    if (!title || !category || !level) {
      return NextResponse.json(
        { success: false, error: 'Field wajib: title, category, level' },
        { status: 400 }
      )
    }
    if (!['DPN', 'DPD', 'DPC'].includes(level)) {
      return NextResponse.json(
        { success: false, error: 'Level harus DPN, DPD, atau DPC' },
        { status: 400 }
      )
    }
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

    // Validasi ekstensi
    const ext = getFileExtension(file.name)
    if (!ALLOWED_EXTENSIONS[ext]) {
      return NextResponse.json(
        { success: false, error: `Format file .${ext} tidak didukung. Didukung: PDF, JPG, PNG, WebP, DOC, DOCX, XLS, XLSX, MP4, MOV, WebM, MP3, TXT, CSV` },
        { status: 400 }
      )
    }

    // RBAC check untuk territory
    if (territoryId) {
      const editScope = await getEditableTerritoryIds(user)
      if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(territoryId)) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak: Anda tidak punya hak upload di wilayah ini' },
          { status: 403 }
        )
      }
    }

    // Convert file ke base64 data URL
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const mimeType = ALLOWED_EXTENSIONS[ext] || file.type || 'application/octet-stream'
    const base64Content = buffer.toString('base64')
    const fileData = `data:${mimeType};base64,${base64Content}`

    const id = `progdoc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const nowIso = new Date().toISOString()
    const itemData = {
      id,
      title: title.substring(0, 500),
      description: (description || '').substring(0, 5000),
      category,
      level,
      territoryCode: territoryCode || null,
      territoryName: territoryName || null,
      territoryId: territoryId || null,
      location: location.substring(0, 200),
      date,
      status,
      fileName: file.name.substring(0, 200),
      fileType: ext.toUpperCase(),
      fileMimeType: mimeType,
      fileSize: file.size,
      fileData,
      uploadedBy: user.fullName,
      uploadedById: user.id,
      uploadedAt: nowIso,
      updatedAt: nowIso,
    }

    await db.systemSetting.create({
      data: {
        key: id,
        value: JSON.stringify(itemData),
        category: 'PROGRAM_DOCUMENT',
        description: `${category} ${level}: ${title.substring(0, 80)}`,
      },
    })

    return NextResponse.json({
      success: true,
      data: { ...itemData, fileData: undefined },
      message: `Dokumen "${title}" (${level}) berhasil diupload`,
    })
  } catch (e: any) {
    console.error('[ProgramDocs POST] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal upload dokumen: ${e.message}` },
      { status: 500 }
    )
  }
}
