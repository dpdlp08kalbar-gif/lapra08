// LAPRA 08 - API: View Profile Document (AD/ART, Legalitas)
// GET /api/profile-documents/[id]/view — stream PDF/image/doc dengan header Content-Type
//
// FIX: Sebelumnya fileUrl pakai data URL (base64) → browser buka blank page
// Sekarang: API ini stream file dengan Content-Type yang benar, inline disposition
//
// Akses: pelapor/admin yang sudah login (dokumen publik untuk anggota LAPRA 08)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const item = await db.systemSetting.findUnique({ where: { key: id } })
    if (!item || item.category !== 'PROFILE_DOCUMENT') {
      return NextResponse.json({ success: false, error: 'Dokumen tidak ditemukan' }, { status: 404 })
    }

    const data = JSON.parse(item.value)
    if (!data.fileUrl) {
      return NextResponse.json({ success: false, error: 'File tidak tersedia' }, { status: 404 })
    }

    // Parse data URL: data:[mime];base64,[content]
    const match = data.fileUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) {
      return NextResponse.json({ success: false, error: 'Format file tidak valid' }, { status: 500 })
    }

    const [, mimeType, base64Content] = match
    const buffer = Buffer.from(base64Content, 'base64')
    const fileName = data.fileName || `dokumen-${id}.bin`

    // Inline disposition agar PDF/image render di browser, bukan download
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (e: any) {
    console.error('[View Profile Document Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
