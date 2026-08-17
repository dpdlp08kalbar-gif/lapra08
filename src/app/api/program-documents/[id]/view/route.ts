// LAPRA 08 - API: View Program Document File (v2 — dengan RBAC proper)
// GET /api/program-documents/[id]/view — stream file (PDF/image/video/doc) inline
//
// [id] adalah Prisma id (cuid)
// Cache: short TTL + ETag (untuk invalidasi setelah file di-replace)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getViewableTerritoryIds, isDPNLevel } from '@/lib/server-helpers'

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

    const doc = await db.programDocument.findUnique({
      where: { id },
      select: {
        id: true, title: true, level: true, territoryId: true, uploadedById: true,
        fileName: true, fileMimeType: true, fileData: true, fileHash: true, updatedAt: true,
      },
    })
    if (!doc || !doc.fileData) {
      return NextResponse.json(
        { success: false, error: 'Dokumen/file tidak ditemukan' },
        { status: 404 }
      )
    }

    // RBAC check: user harus punya akses view ke dokumen ini
    if (!isDPNLevel(user.role) && doc.uploadedById !== user.id) {
      // DPN-level doc → semua user bisa lihat
      if (doc.level !== 'DPN') {
        try {
          const viewScope = await getViewableTerritoryIds(user)
          if (!viewScope.isGlobalView) {
            if (!doc.territoryId || !viewScope.territoryIds.includes(doc.territoryId)) {
              return NextResponse.json(
                { success: false, error: 'Akses ditolak: Anda tidak punya hak lihat dokumen ini' },
                { status: 403 }
              )
            }
          }
        } catch (e: any) {
          console.error('[ProgramDocs View] RBAC check failed:', e.message)
          // Defensive: deny access kalau RBAC gagal
          return NextResponse.json(
            { success: false, error: 'Akses tidak dapat diverifikasi' },
            { status: 403 }
          )
        }
      }
    }

    // Parse data URL: data:[mime];base64,[content]
    const match = doc.fileData.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Format file tidak valid' },
        { status: 500 }
      )
    }

    const [, mimeType, base64Content] = match
    const buffer = Buffer.from(base64Content, 'base64')
    const fileName = doc.fileName || `dokumen-${id}.bin`

    // ETag untuk conditional GET (hemat bandwidth)
    const etag = `"${doc.fileHash || doc.updatedAt.getTime()}"`
    const ifNoneMatch = request.headers.get('if-none-match')
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } })
    }

    // Filename*: RFC 6266 untuk Unicode filename
    const encodedFileName = encodeURIComponent(fileName)
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
        'Content-Length': buffer.length.toString(),
        // Short TTL + must-revalidate supaya cepat invalidate kalau file diganti
        'Cache-Control': 'private, max-age=60, must-revalidate',
        'ETag': etag,
        'Vary': 'Authorization',
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
