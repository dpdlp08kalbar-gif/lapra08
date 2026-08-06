// LAPRA 08 - API: SK Documents (E-SK)
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

  const docs = await db.sKDocument.findMany({
    where,
    include: { territory: true },
    orderBy: { issuedAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: docs })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { skNumber, title, description, fileUrl, issuedAt, issuedBy, territoryId } = body

  if (!skNumber || !title || !fileUrl || !territoryId) {
    return NextResponse.json(
      { success: false, error: 'Nomor SK, judul, file, dan wilayah wajib diisi' },
      { status: 400 }
    )
  }

  const scope = await getAccessibleTerritoryIds(user)
  if (!scope.isGlobal && !scope.territoryIds.includes(territoryId)) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  const doc = await db.sKDocument.create({
    data: {
      skNumber,
      title,
      description,
      fileUrl,
      issuedAt: new Date(issuedAt),
      issuedBy,
      territoryId,
    },
    include: { territory: true },
  })

  return NextResponse.json({ success: true, data: doc })
}
