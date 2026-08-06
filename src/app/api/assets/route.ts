// LAPRA 08 - API: Assets (Logistik & Atribut)
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

  const assets = await db.asset.findMany({
    where,
    include: {
      territory: true,
      _count: { select: { distributions: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ success: true, data: assets })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, category, sku, stock, unit, minStock, description, photoUrl, territoryId } = body

  if (!name || !category || !territoryId) {
    return NextResponse.json(
      { success: false, error: 'Nama, kategori, dan wilayah wajib diisi' },
      { status: 400 }
    )
  }

  const scope = await getAccessibleTerritoryIds(user)
  if (!scope.isGlobal && !scope.territoryIds.includes(territoryId)) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  const asset = await db.asset.create({
    data: {
      name,
      category,
      sku,
      stock: stock || 0,
      unit: unit || 'pcs',
      minStock: minStock || 0,
      description,
      photoUrl,
      territoryId,
    },
    include: { territory: true },
  })

  return NextResponse.json({ success: true, data: asset })
}
