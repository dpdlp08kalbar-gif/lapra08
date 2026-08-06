// LAPRA 08 - API: Events
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getAccessibleTerritoryIds } from '@/lib/server-helpers'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const scope = await getAccessibleTerritoryIds(user)
  const where = scope.isGlobal ? {} : { territoryId: { in: scope.territoryIds } }

  const events = await db.event.findMany({
    where,
    include: {
      territory: true,
      createdBy: true,
      _count: { select: { attendance: true, reports: true } },
    },
    orderBy: { startDate: 'desc' },
  })

  return NextResponse.json({ success: true, data: events })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    title,
    description,
    type,
    startDate,
    endDate,
    location,
    territoryId,
    targetAttendance,
  } = body

  if (!title || !type || !startDate || !territoryId) {
    return NextResponse.json(
      { success: false, error: 'Judul, tipe, tanggal mulai, dan wilayah wajib diisi' },
      { status: 400 }
    )
  }

  const scope = await getAccessibleTerritoryIds(user)
  if (!scope.isGlobal && !scope.territoryIds.includes(territoryId)) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  const event = await db.event.create({
    data: {
      title,
      description,
      type,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      location,
      territoryId,
      createdById: user.id,
      status: 'SCHEDULED',
      targetAttendance,
    },
    include: { territory: true, createdBy: true },
  })

  return NextResponse.json({ success: true, data: event })
}
