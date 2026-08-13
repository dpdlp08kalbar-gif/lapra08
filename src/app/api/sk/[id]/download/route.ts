// LAPRA 08 - API: Download SK Document
// GET /api/sk/[id]/download — stream the file from DB (base64) to browser
//
// Returns: binary file with proper Content-Type & Content-Disposition headers.
// Supports inline viewing (PDF in browser) and download (attachment).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getViewableTerritoryIds } from '@/lib/server-helpers'

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

    const doc = await db.sKDocument.findUnique({
      where: { id },
      include: { territory: true },
    })

    if (!doc) {
      return NextResponse.json({ success: false, error: 'SK tidak ditemukan' }, { status: 404 })
    }

    // RBAC check
    const scope = await getViewableTerritoryIds(user)
    if (!scope.isGlobalView && !scope.territoryIds.includes(doc.territoryId)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }

    // If no file data stored, redirect to fileUrl (legacy)
    if (!doc.fileData) {
      if (doc.fileUrl) {
        return NextResponse.redirect(doc.fileUrl)
      }
      return NextResponse.json({ success: false, error: 'File tidak tersedia' }, { status: 404 })
    }

    // Parse data URL: data:<mime>;base64,<content>
    const match = doc.fileData.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) {
      return NextResponse.json({ success: false, error: 'Format file tidak valid' }, { status: 500 })
    }

    const [, mimeType, base64Content] = match
    const buffer = Buffer.from(base64Content, 'base64')

    // Determine if inline (view) or attachment (download)
    const { searchParams } = new URL(request.url)
    const disposition = searchParams.get('download') === '1' ? 'attachment' : 'inline'

    const fileName = doc.fileName || `${doc.skNumber}.${doc.fileType || 'pdf'}`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `${disposition}; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // 1 hour cache
      },
    })
  } catch (e: any) {
    console.error('[SK Download Error]', e)
    return NextResponse.json(
      { success: false, error: `Download gagal: ${e.message}` },
      { status: 500 }
    )
  }
}
