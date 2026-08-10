// LAPRA 08 - API: Crisis Zones (Geo-Fencing klarifikasi isu negatif)
// GET  /api/crisis-zones   - List crisis zones (view scope filtered)
// POST /api/crisis-zones   - Create crisis zone (SUPERADMIN/ADMIN_DPN only)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getUserFromRequest,
  getViewableTerritoryIds,
  isDPNLevel,
} from '@/lib/server-helpers'

// GET - List crisis zones (scoped)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const scope = await getViewableTerritoryIds(user)

    const where: any = {}
    if (!scope.isGlobalView) {
      where.territoryId = { in: scope.territoryIds }
    }
    if (status) where.status = status
    if (severity) where.severity = severity

    const crisisZones = await db.crisisZone.findMany({
      where,
      include: {
        territory: true,
        resolvedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ success: true, data: crisisZones })
  } catch (e: any) {
    console.error('[CrisisZones GET Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST - Create crisis zone (SUPERADMIN/ADMIN_DPN only)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!isDPNLevel(user.role)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Akses ditolak: Hanya SUPERADMIN/ADMIN_DPN yang dapat membuat crisis zone',
      },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const {
      title,
      description,
      issueCategory,
      issueSource,
      sentimentScore = 0,
      territoryId,
      severity = 'MEDIUM',
      clarificationMessage,
      clarificationVideoUrl,
      clarificationQuote,
      status = 'ACTIVE',
    } = body

    if (!title || !description || !issueCategory || !territoryId) {
      return NextResponse.json(
        { success: false, error: 'Judul, deskripsi, kategori isu, dan wilayah wajib diisi' },
        { status: 400 }
      )
    }

    const crisisZone = await db.crisisZone.create({
      data: {
        title,
        description,
        issueCategory,
        issueSource: issueSource || null,
        sentimentScore: typeof sentimentScore === 'number' ? sentimentScore : 0,
        territoryId,
        severity,
        status,
        isLocked: status !== 'RESOLVED',
        clarificationMessage: clarificationMessage || null,
        clarificationVideoUrl: clarificationVideoUrl || null,
        clarificationQuote: clarificationQuote || null,
      },
      include: {
        territory: true,
        resolvedBy: { select: { id: true, fullName: true, username: true } },
      },
    })

    return NextResponse.json({ success: true, data: crisisZone })
  } catch (e: any) {
    console.error('[CrisisZones POST Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
