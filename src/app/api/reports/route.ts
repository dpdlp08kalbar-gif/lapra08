// LAPRA 08 - API: Event Reports (Laporan Kegiatan)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getAccessibleTerritoryIds } from '@/lib/server-helpers'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('eventId')

  const where = eventId ? { eventId } : {}
  const reports = await db.eventReport.findMany({
    where,
    include: { event: { include: { territory: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: reports })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { eventId, title, content, photoUrls, videoUrls, notes } = body

  if (!eventId || !title || !content) {
    return NextResponse.json(
      { success: false, error: 'Event, judul, dan konten wajib diisi' },
      { status: 400 }
    )
  }

  // Cek akses event
  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event) {
    return NextResponse.json({ success: false, error: 'Event tidak ditemukan' }, { status: 404 })
  }

  const scope = await getAccessibleTerritoryIds(user)
  if (!scope.isGlobal && !scope.territoryIds.includes(event.territoryId)) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  const report = await db.eventReport.create({
    data: {
      eventId,
      title,
      content,
      photoUrls: photoUrls ? JSON.stringify(photoUrls) : null,
      videoUrls: videoUrls ? JSON.stringify(videoUrls) : null,
      notes,
    },
    include: { event: true },
  })

  return NextResponse.json({ success: true, data: report })
}
