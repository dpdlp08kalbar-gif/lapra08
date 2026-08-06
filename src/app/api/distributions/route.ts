// LAPRA 08 - API: Distributions (Logistik distribusi)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getAccessibleTerritoryIds } from '@/lib/server-helpers'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const scope = await getAccessibleTerritoryIds(user)

  // Ambil distribusi yang from atau to ada di scope
  const where = scope.isGlobal
    ? {}
    : {
        OR: [
          { fromTerritoryId: { in: scope.territoryIds } },
          { toTerritoryId: { in: scope.territoryIds } },
        ],
      }

  const distributions = await db.distribution.findMany({
    where,
    include: {
      asset: true,
      fromTerritory: true,
      toTerritory: true,
      receivedBy: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: distributions })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { assetId, fromTerritoryId, toTerritoryId, quantity, notes, status = 'PENDING' } = body

  if (!assetId || !fromTerritoryId || !toTerritoryId || !quantity) {
    return NextResponse.json(
      { success: false, error: 'Aset, asal, tujuan, dan jumlah wajib diisi' },
      { status: 400 }
    )
  }

  const scope = await getAccessibleTerritoryIds(user)
  if (!scope.isGlobal && !scope.territoryIds.includes(fromTerritoryId)) {
    return NextResponse.json(
      { success: false, error: 'Akses ditolak ke wilayah asal' },
      { status: 403 }
    )
  }

  // Kurangi stok aset dari fromTerritory
  const asset = await db.asset.findFirst({
    where: { id: assetId, territoryId: fromTerritoryId },
  })
  if (!asset) {
    return NextResponse.json(
      { success: false, error: 'Aset tidak ditemukan di wilayah asal' },
      { status: 404 }
    )
  }
  if (asset.stock < quantity) {
    return NextResponse.json(
      { success: false, error: 'Stok tidak mencukupi' },
      { status: 400 }
    )
  }

  // Update stok asal
  await db.asset.update({
    where: { id: assetId },
    data: { stock: { decrement: quantity } },
  })

  // Tambah stok di tujuan (jika aset yang sama ada, update; jika tidak, buat baru)
  const destAsset = await db.asset.findFirst({
    where: { name: asset.name, category: asset.category, territoryId: toTerritoryId },
  })
  if (destAsset) {
    await db.asset.update({
      where: { id: destAsset.id },
      data: { stock: { increment: quantity } },
    })
  } else {
    await db.asset.create({
      data: {
        name: asset.name,
        category: asset.category,
        sku: asset.sku,
        stock: quantity,
        unit: asset.unit,
        minStock: asset.minStock,
        territoryId: toTerritoryId,
      },
    })
  }

  const distribution = await db.distribution.create({
    data: {
      assetId,
      fromTerritoryId,
      toTerritoryId,
      quantity,
      notes,
      status,
      sentAt: status !== 'PENDING' ? new Date() : null,
    },
    include: {
      asset: true,
      fromTerritory: true,
      toTerritory: true,
    },
  })

  return NextResponse.json({ success: true, data: distribution })
}
