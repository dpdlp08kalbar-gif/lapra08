// LAPRA 08 - API: Organization [id] - Update & Delete
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds } from '@/lib/server-helpers'

// PUT - Update org position
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
      fullName,
      positionName,
      level,
      territoryId,
      phone,
      email,
      photoUrl,
      startDate,
      endDate,
      order,
      isActive,
    } = body

    const existing = await db.orgPosition.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Pengurus tidak ditemukan' }, { status: 404 })
    }

    // Cek hak edit territory
    const editScope = await getEditableTerritoryIds(user)
    if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(existing.territoryId)) {
      // Jika pindah territory, cek hak di territory baru juga
      if (territoryId && territoryId !== existing.territoryId) {
        if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(territoryId)) {
          return NextResponse.json(
            { success: false, error: 'Akses ditolak: Anda tidak bisa edit di wilayah ini' },
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak: Read-only untuk wilayah ini' },
          { status: 403 }
        )
      }
    }

    const updated = await db.orgPosition.update({
      where: { id },
      data: {
        fullName: fullName || undefined,
        positionName: positionName || undefined,
        level: level || undefined,
        territoryId: territoryId || undefined,
        phone,
        email,
        photoUrl,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        order: typeof order === 'number' ? order : undefined,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
      },
      include: { territory: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE - Hapus org position
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const existing = await db.orgPosition.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Pengurus tidak ditemukan' }, { status: 404 })
  }

  // Cek hak edit territory
  const editScope = await getEditableTerritoryIds(user)
  if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(existing.territoryId)) {
    return NextResponse.json(
      { success: false, error: 'Akses ditolak: Read-only untuk wilayah ini' },
      { status: 403 }
    )
  }

  await db.orgPosition.delete({ where: { id } })
  return NextResponse.json({ success: true, message: 'Pengurus berhasil dihapus' })
}
