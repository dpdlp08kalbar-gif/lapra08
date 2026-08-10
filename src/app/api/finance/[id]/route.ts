// LAPRA 08 - API: Finance [id] - Update & Delete Transaction
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds } from '@/lib/server-helpers'
import * as fs from 'fs'
import * as path from 'path'

// PUT - Update finance transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const body = await request.json()
    const {
      type,
      category,
      amount,
      description,
      receiptUrl,
      transactionDate,
      territoryId,
    } = body

    const existing = await db.financeTransaction.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check edit permission on existing territory
    const editScope = await getEditableTerritoryIds(user)
    if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(existing.territoryId)) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Read-only untuk wilayah ini' },
        { status: 403 }
      )
    }

    // If territoryId is being changed, check new territory as well
    if (territoryId && territoryId !== existing.territoryId) {
      if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(territoryId)) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak: Tidak bisa pindah ke wilayah ini' },
          { status: 403 }
        )
      }
    }

    // Build update payload (only update provided fields)
    const updateData: any = {}
    if (type !== undefined) updateData.type = type
    if (category !== undefined) updateData.category = category
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (description !== undefined) updateData.description = description
    if (receiptUrl !== undefined) updateData.receiptUrl = receiptUrl
    if (transactionDate !== undefined) updateData.transactionDate = new Date(transactionDate)
    if (territoryId !== undefined) updateData.territoryId = territoryId

    const updated = await db.financeTransaction.update({
      where: { id },
      data: updateData,
      include: { territory: true, recordedBy: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) {
    console.error('[Finance PUT Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE - Delete finance transaction (also delete receipt file if owned)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const existing = await db.financeTransaction.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check edit permission
    const editScope = await getEditableTerritoryIds(user)
    if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(existing.territoryId)) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Read-only untuk wilayah ini' },
        { status: 403 }
      )
    }

    // Delete receipt file (if stored locally)
    if (existing.receiptUrl) {
      try {
        const filePath = path.join(
          process.cwd(),
          'public',
          existing.receiptUrl.replace(/^\//, '')
        )
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch {
        // ignore file deletion errors
      }
    }

    await db.financeTransaction.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: 'Transaksi keuangan berhasil dihapus',
    })
  } catch (e: any) {
    console.error('[Finance DELETE Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
