// LAPRA 08 - API: View Program Kerja PDF (stream base64 from DB)
// GET /api/program-kerja/[id]/view — inline view PDF in browser
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
    if (!item || item.category !== 'PROGRAM_PDF') {
      return NextResponse.json({ success: false, error: 'PDF tidak ditemukan' }, { status: 404 })
    }

    const data = JSON.parse(item.value)
    if (!data.fileData) {
      return NextResponse.json({ success: false, error: 'File tidak tersedia' }, { status: 404 })
    }

    // Parse data URL
    const match = data.fileData.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) {
      return NextResponse.json({ success: false, error: 'Format file tidak valid' }, { status: 500 })
    }

    const [, mimeType, base64Content] = match
    const buffer = Buffer.from(base64Content, 'base64')
    const fileName = data.fileName || 'program-kerja.pdf'

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
    console.error('[View PDF Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
