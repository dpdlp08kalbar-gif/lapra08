// LAPRA 08 - API: Announcements (Pengumuman Internal)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getAccessibleTerritoryIds } from '@/lib/server-helpers'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const scope = await getAccessibleTerritoryIds(user)
  const where = scope.isGlobal
    ? { isActive: true }
    : { isActive: true, territoryId: { in: scope.territoryIds } }

  const announcements = await db.announcement.findMany({
    where,
    include: { territory: true, createdBy: true },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ success: true, data: announcements })
}

export async function POST(request: NextRequest) {
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
}
