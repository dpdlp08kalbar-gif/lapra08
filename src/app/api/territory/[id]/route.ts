// LAPRA 08 - API: Territory [id] - Update & Delete
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds, isDPNLevel } from '@/lib/server-helpers'

// PUT - Update territory (hanya jika bisa edit)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  // Hanya DPN yang bisa edit territory
  if (!isDPNLevel(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Hanya Admin DPN yang dapat mengedit wilayah' },
      { status: 403 }
    )
  }
  const { id } = await params

  try {
    const body = await request.json()
    const { code, name, level, category, parentId, isActive, metadata } = body

    const existing = await db.territory.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Wilayah tidak ditemukan' }, { status: 404 })
    }

    // Cek duplikasi code jika diubah
    if (code && code !== existing.code) {
      const dup = await db.territory.findUnique({ where: { code } })
      if (dup) {
        return NextResponse.json(
          { success: false, error: 'Kode wilayah sudah digunakan' },
          { status: 400 }
        )
      }
    }

    // ===== VALIDASI HIERARKI KETAT saat EDIT =====
    const effectiveLevel = level || existing.level
    const effectiveParentId = parentId !== undefined ? parentId : existing.parentId

    if (effectiveLevel === 'REGENCY' && effectiveParentId) {
      const parent = await db.territory.findUnique({ where: { id: effectiveParentId } })
      if (!parent) {
        return NextResponse.json(
          { success: false, error: '❌ ORPHAN PREVENTION: DPD Parent tidak ditemukan.' },
          { status: 400 }
        )
      }
      if (!parent.isActive) {
        return NextResponse.json(
          { success: false, error: `❌ ORPHAN PREVENTION: DPD Parent "${parent.name}" tidak aktif.` },
          { status: 400 }
        )
      }
      // RULE 1: Code format untuk domestik
      if (parent.category === 'DOMESTIC' && parent.level === 'PROVINCE' && code) {
        if (!code.startsWith(parent.code)) {
          return NextResponse.json(
            { success: false, error: `❌ CODE FORMAT VIOLATION: Kode DPC "${code}" harus diawali "${parent.code}".` },
            { status: 400 }
          )
        }
      }
      // RULE 3: Unique name within DPD
      if (name && name !== existing.name) {
        const dupName = await db.territory.findFirst({
          where: { name, parentId: effectiveParentId, level: 'REGENCY', id: { not: id } },
        })
        if (dupName) {
          return NextResponse.json(
            { success: false, error: `❌ UNIQUE CONSTRAINT: Nama "${name}" sudah ada dalam DPD ini.` },
            { status: 400 }
          )
        }
      }
    }

    const updated = await db.territory.update({
      where: { id },
      data: {
        code: code || undefined,
        name: name || undefined,
        level: level || undefined,
        category: category || undefined,
        parentId: parentId === null ? null : parentId || undefined,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
      include: {
        parent: true,
        _count: { select: { children: true, members: true, users: true } },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE - Hapus territory (hanya jika tidak punya children/members)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (!isDPNLevel(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Hanya Admin DPN yang dapat menghapus wilayah' },
      { status: 403 }
    )
  }
  const { id } = await params

  const existing = await db.territory.findUnique({
    where: { id },
    include: {
      _count: { select: { children: true, members: true, users: true, orgPositions: true } },
    },
  })
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Wilayah tidak ditemukan' }, { status: 404 })
  }

  // Cek apakah wilayah punya children/members/users
  if (existing._count.children > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Tidak bisa menghapus wilayah yang masih memiliki ${existing._count.children} sub-wilayah. Hapus sub-wilayah terlebih dahulu.`,
      },
      { status: 400 }
    )
  }
  if (existing._count.members > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Tidak bisa menghapus wilayah yang masih memiliki ${existing._count.members} anggota. Hapus atau pindahkan anggota terlebih dahulu.`,
      },
      { status: 400 }
    )
  }
  if (existing._count.users > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Tidak bisa menghapus wilayah yang masih memiliki ${existing._count.users} user. Hapus user terlebih dahulu.`,
      },
      { status: 400 }
    )
  }

  try {
    // Hapus orgPositions terkait dulu (jika ada)
    await db.orgPosition.deleteMany({ where: { territoryId: id } })
    await db.territory.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Wilayah berhasil dihapus' })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
