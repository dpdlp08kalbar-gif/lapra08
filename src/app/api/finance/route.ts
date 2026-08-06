// LAPRA 08 - API: Finance (Kas & Keuangan)
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

  const txns = await db.financeTransaction.findMany({
    where,
    include: { territory: true, recordedBy: true },
    orderBy: { transactionDate: 'desc' },
  })

  return NextResponse.json({ success: true, data: txns })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { type, category, amount, description, receiptUrl, transactionDate, territoryId } = body

  if (!type || !category || !amount || !transactionDate || !territoryId) {
    return NextResponse.json(
      { success: false, error: 'Tipe, kategori, jumlah, tanggal, dan wilayah wajib diisi' },
      { status: 400 }
    )
  }

  const scope = await getAccessibleTerritoryIds(user)
  if (!scope.isGlobal && !scope.territoryIds.includes(territoryId)) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  const txn = await db.financeTransaction.create({
    data: {
      type,
      category,
      amount: parseFloat(amount),
      description,
      receiptUrl,
      transactionDate: new Date(transactionDate),
      territoryId,
      recordedById: user.id,
    },
    include: { territory: true, recordedBy: true },
  })

  return NextResponse.json({ success: true, data: txn })
}
