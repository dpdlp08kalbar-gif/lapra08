// LAPRA 08 - API: Event Attendance
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getAccessibleTerritoryIds } from '@/lib/server-helpers'

// GET /api/attendance?eventId=xxx
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('eventId')
  if (!eventId) {
    return NextResponse.json({ success: false, error: 'eventId wajib diisi' }, { status: 400 })
  }

  const records = await db.eventAttendance.findMany({
    where: { eventId },
    include: { member: { include: { territory: true } }, recordedBy: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: records })
}

// POST - Tandai kehadiran (massal atau perorangan)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { eventId, memberIds, status = 'PRESENT', notes } = body

  if (!eventId || !Array.isArray(memberIds) || memberIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'eventId dan memberIds[] wajib diisi' },
      { status: 400 }
    )
  }

  // Cek akses event
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { territory: true },
  })
  if (!event) {
    return NextResponse.json({ success: false, error: 'Event tidak ditemukan' }, { status: 404 })
  }

  const scope = await getAccessibleTerritoryIds(user)
  if (!scope.isGlobal && !scope.territoryIds.includes(event.territoryId)) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  // Upsert attendance
  const results = []
  for (const memberId of memberIds) {
    const existing = await db.eventAttendance.findFirst({
      where: { eventId, memberId },
    })
    if (existing) {
      const updated = await db.eventAttendance.update({
        where: { id: existing.id },
        data: { status, notes, checkInTime: status === 'PRESENT' ? new Date() : null, recordedById: user.id },
      })
      results.push(updated)
    } else {
      const created = await db.eventAttendance.create({
        data: {
          eventId,
          memberId,
          status,
          notes,
          checkInTime: status === 'PRESENT' ? new Date() : null,
          recordedById: user.id,
        },
      })
      results.push(created)
    }
  }

  return NextResponse.json({ success: true, data: results })
}
