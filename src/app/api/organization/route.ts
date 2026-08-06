// LAPRA 08 - API: Organization Structure (Pengurus)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getViewableTerritoryIds } from '@/lib/server-helpers'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const scope = await getViewableTerritoryIds(user)
  const where = scope.isGlobalView ? {} : { territoryId: { in: scope.territoryIds } }

  const positions = await db.orgPosition.findMany({
    where,
    include: { territory: true },
    orderBy: [{ level: 'asc' }, { order: 'asc' }],
  })

  return NextResponse.json({ success: true, data: positions })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    fullName,
    positionName,
    level,
    territoryId,
    phone,
    email,
    photoUrl,
    startDate,
    endDate,
    order = 0,
  } = body

  if (!fullName || !positionName || !level || !territoryId) {
    return NextResponse.json(
      { success: false, error: 'Nama, jabatan, level, dan wilayah wajib diisi' },
      { status: 400 }
    )
  }

  const scope = await getAccessibleTerritoryIds(user)
  if (!scope.isGlobal && !scope.territoryIds.includes(territoryId)) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  const position = await db.orgPosition.create({
    data: {
      fullName,
      positionName,
      level,
      territoryId,
      phone,
      email,
      photoUrl,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      order,
    },
    include: { territory: true },
  })

  return NextResponse.json({ success: true, data: position })
}
