// LAPRA 08 - API: Crisis Zone Detail / Update / Delete
// GET    /api/crisis-zones/[id]   - Crisis zone detail
// PUT    /api/crisis-zones/[id]   - Update (when status → RESOLVED, set resolvedAt + resolvedById)
// DELETE /api/crisis-zones/[id]   - Delete (SUPERADMIN/ADMIN_DPN only)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getUserFromRequest,
  getViewableTerritoryIds,
  isDPNLevel,
} from '@/lib/server-helpers'

// GET - Crisis zone detail
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
    const crisisZone = await db.crisisZone.findUnique({
      where: { id },
      include: {
        territory: true,
        resolvedBy: { select: { id: true, fullName: true, username: true } },
      },
    })

    if (!crisisZone) {
      return NextResponse.json(
        { success: false, error: 'Crisis zone tidak ditemukan' },
        { status: 404 }
      )
    }

    // View scope check
    const viewScope = await getViewableTerritoryIds(user)
    if (!viewScope.isGlobalView && !viewScope.territoryIds.includes(crisisZone.territoryId)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: crisisZone })
  } catch (e: any) {
    console.error('[CrisisZone GET Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// PUT - Update crisis zone (RESOLVED triggers resolvedAt + resolvedById)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const {
      title,
      description,
      issueCategory,
      issueSource,
      sentimentScore,
      territoryId,
      severity,
      status,
      isLocked,
      clarificationMessage,
      clarificationVideoUrl,
      clarificationQuote,
      resolutionNotes,
    } = body

    const existing = await db.crisisZone.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Crisis zone tidak ditemukan' },
        { status: 404 }
      )
    }

    // Edit permission: SUPERADMIN/ADMIN_DPN, or admin in the territory (DPD/DPC scope)
    const viewScope = await getViewableTerritoryIds(user)
    if (!viewScope.isGlobalView && !viewScope.territoryIds.includes(existing.territoryId)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (issueCategory !== undefined) updateData.issueCategory = issueCategory
    if (issueSource !== undefined) updateData.issueSource = issueSource
    if (sentimentScore !== undefined) updateData.sentimentScore = sentimentScore
    if (territoryId !== undefined) updateData.territoryId = territoryId
    if (severity !== undefined) updateData.severity = severity
    if (clarificationMessage !== undefined) updateData.clarificationMessage = clarificationMessage
    if (clarificationVideoUrl !== undefined) updateData.clarificationVideoUrl = clarificationVideoUrl
    if (clarificationQuote !== undefined) updateData.clarificationQuote = clarificationQuote
    if (resolutionNotes !== undefined) updateData.resolutionNotes = resolutionNotes

    // Status transition: RESOLVED → set resolvedAt + resolvedById (only DPN-level can resolve)
    if (status && status !== existing.status) {
      if (status === 'RESOLVED') {
        if (!isDPNLevel(user.role)) {
          return NextResponse.json(
            { success: false, error: 'Hanya SUPERADMIN/ADMIN_DPN yang dapat menandai crisis zone sebagai RESOLVED' },
            { status: 403 }
          )
        }
        updateData.status = 'RESOLVED'
        updateData.resolvedAt = new Date()
        updateData.resolvedById = user.id
        updateData.isLocked = false
      } else if (status === 'ACTIVE' && existing.status === 'RESOLVED') {
        // Reopen: clear resolution
        updateData.status = 'ACTIVE'
        updateData.resolvedAt = null
        updateData.resolvedById = null
        updateData.isLocked = true
      } else {
        updateData.status = status
      }
    }

    if (typeof isLocked === 'boolean') updateData.isLocked = isLocked

    const updated = await db.crisisZone.update({
      where: { id },
      data: updateData,
      include: {
        territory: true,
        resolvedBy: { select: { id: true, fullName: true, username: true } },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) {
    console.error('[CrisisZone PUT Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE - Delete crisis zone (SUPERADMIN/ADMIN_DPN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!isDPNLevel(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Akses ditolak: Hanya SUPERADMIN/ADMIN_DPN' },
      { status: 403 }
    )
  }

  try {
    const { id } = await params
    const existing = await db.crisisZone.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Crisis zone tidak ditemukan' },
        { status: 404 }
      )
    }

    // Unlink any broadcasts
    await db.broadcast.updateMany({
      where: { crisisZoneId: id },
      data: { crisisZoneId: null },
    })
    await db.crisisZone.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Crisis zone berhasil dihapus' })
  } catch (e: any) {
    console.error('[CrisisZone DELETE Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
