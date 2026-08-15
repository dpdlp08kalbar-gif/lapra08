// LAPRA 08 - API: Announcements (Pengumuman Internal)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getAccessibleTerritoryIds } from '@/lib/server-helpers'

// Pastikan route berjalan di Node.js runtime (bukan Edge), selalu dynamic
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Defensive: jika user tidak punya territoryId (data korup), fallback ke scope user itu sendiri
    let scope
    try {
      scope = await getAccessibleTerritoryIds(user)
    } catch (scopeErr: any) {
      console.error('[Announcements GET] getAccessibleTerritoryIds failed:', scopeErr)
      // Fallback: anggap user cuma bisa lihat territory sendiri
      if (!user.territoryId) {
        return NextResponse.json({ success: true, data: [] })
      }
      scope = {
        isGlobal: false,
        territoryIds: [user.territoryId],
        primaryTerritoryId: user.territoryId,
      }
    }

    // Build where clause — handle empty territoryIds (jangan kirim `in: []` karena bisa return 0 hasil menyesatkan)
    const where: any = { isActive: true }
    if (!scope.isGlobal) {
      if (scope.territoryIds && scope.territoryIds.length > 0) {
        where.territoryId = { in: scope.territoryIds }
      } else if (user.territoryId) {
        // Defensive fallback kalau scope kosong tapi user punya territory
        where.territoryId = user.territoryId
      } else {
        // User tanpa territory & non-global → return kosong (jangan throw)
        return NextResponse.json({ success: true, data: [] })
      }
    }

    const announcements = await db.announcement.findMany({
      where,
      include: { territory: true, createdBy: true },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ success: true, data: announcements })
  } catch (e: any) {
    console.error('[Announcements GET] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal memuat pengumuman: ${e.message}` },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, content, type = 'INFO', isPinned = false, territoryId, expiresAt } = body

    if (!title || !content || !territoryId) {
      return NextResponse.json(
        { success: false, error: 'Judul, konten, dan wilayah wajib diisi' },
        { status: 400 }
      )
    }

    const scope = await getAccessibleTerritoryIds(user)
    if (!scope.isGlobal && !scope.territoryIds.includes(territoryId)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        type,
        isPinned,
        isActive: true,
        territoryId,
        createdById: user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: { territory: true, createdBy: true },
    })

    return NextResponse.json({ success: true, data: announcement })
  } catch (e: any) {
    console.error('[Announcements POST] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal menyimpan pengumuman: ${e.message}` },
      { status: 500 }
    )
  }
}
