// LAPRA 08 - API: Upload Dokumen Warga (KK / KTP / Pas Foto)
// ============================================================
// POST /api/warga/upload
// Body: { file: <base64 data URL>, type: 'kk' | 'ktp' | 'photo', kkId?, residentId? }
// Returns: { url: <base64 data URL> } untuk disimpan ke KK/Resident
//
// Catatan:
// - File disimpan sebagai base64 data URL di kolom DB (kkDocumentUrl/photoUrl/idCardUrl)
// - Vercel Free compatible (no filesystem write)
// - Max size: 2MB (validate client-side)
// - Allowed types: PDF, JPG, PNG
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, logAccess } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { file, type } = body

    if (!file || typeof file !== 'string') {
      return NextResponse.json({ success: false, error: 'File wajib diisi (base64 data URL)' }, { status: 400 })
    }

    if (!['kk', 'ktp', 'photo'].includes(type)) {
      return NextResponse.json({ success: false, error: `Type tidak valid: ${type} (harus kk/ktp/photo)` }, { status: 400 })
    }

    // Parse data URL: "data:<mime>;base64,<data>"
    const match = file.match(/^data:([a-zA-Z0-9/.+-]+);base64,(.+)$/)
    if (!match) {
      return NextResponse.json({ success: false, error: 'Format file harus data URL (data:<mime>;base64,...)' }, { status: 400 })
    }

    const mimeType = match[1]
    const base64Data = match[2]

    if (!ALLOWED_MIME.includes(mimeType)) {
      return NextResponse.json({ success: false, error: `Tipe file tidak diizinkan: ${mimeType}. Hanya PDF, JPG, PNG.` }, { status: 400 })
    }

    // Size check: base64 string length * 3/4 = byte size
    const byteSize = Math.ceil(base64Data.length * 3 / 4)
    if (byteSize > MAX_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: `Ukuran file ${(byteSize / 1024 / 1024).toFixed(2)}MB melebihi batas 2MB` }, { status: 413 })
    }

    // Type-specific validation: photo must be image
    if (type === 'photo' && !mimeType.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Pas Foto harus berupa gambar (JPG/PNG)' }, { status: 400 })
    }

    await logAccess({
      actor: user,
      action: 'CREATE',
      resource: type === 'kk' ? 'FAMILY_CARD' : 'RESIDENT',
      resourceId: 'upload',
      resourceLabel: `Upload ${type} (${mimeType}, ${(byteSize / 1024).toFixed(1)}KB)`,
      request,
      detail: `Type: ${type}; MIME: ${mimeType}; Size: ${byteSize} bytes`,
    })

    return NextResponse.json({
      success: true,
      data: { url: file }, // Return the same data URL — client store as-is in KK/Resident field
      message: `File ${type} berhasil di-upload (${(byteSize / 1024).toFixed(1)}KB)`,
    })
  } catch (e: any) {
    console.error('[Warga Upload] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
