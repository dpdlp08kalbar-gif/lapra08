// LAPRA 08 - API: View Program Document File (stream inline)
// GET /api/program-documents/[id]/view — stream file (PDF/image/video/doc) inline
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const item = await db.systemSetting.findUnique({ where: { key: id } })
    if (!item || item.category !== 'PROGRAM_DOCUMENT') {
      return NextResponse.json(
        { success: false, error: 'Dokumen tidak ditemukan' },
        { status: 404 }
      )
    }

    let data: any
    try {
      data = JSON.parse(item.value)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Data dokumen korup' },
        { status: 500 }
      )
    }

    if (!data.fileData) {
      return NextResponse.json(
        { success: false, error: 'File belum diupload' },
        { status: 404 }
      )
    }

    // Parse data URL: data:[mime];base64,[content]
    const match = data.fileData.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Format file tidak valid' },
        { status: 500 }
      )
    }

    const [, mimeType, base64Content] = match
    const buffer = Buffer.from(base64Content, 'base64')
    const fileName = data.fileName || `dokumen-${id}.bin`

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
    console.error('[ProgramDocs View Error]', e)
    return NextResponse.json(
      { success: false, error: `Gagal membuka file: ${e.message}` },
      { status: 500 }
    )
  }
}
