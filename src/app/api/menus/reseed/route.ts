// LAPRA 08 - API: Re-seed Menu Sidebar
// POST /api/menus/reseed — SuperAdmin only
// Hapus menu 'dashboard' & 'users', tambah 'pusat-admin'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { DEFAULT_MENUS } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { success: false, error: 'Hanya Super Admin yang bisa re-seed menu' },
        { status: 403 }
      )
    }

    const result = {
      deleted: [] as string[],
      created: [] as string[],
      updated: [] as string[],
      skipped: [] as string[],
    }

    // 1. Hapus menu lama yang sudah digabung: 'dashboard' dan 'users'
    for (const oldKey of ['dashboard', 'users']) {
      const existing = await db.menuItem.findUnique({ where: { key: oldKey } })
      if (existing) {
        await db.menuItem.delete({ where: { key: oldKey } })
        result.deleted.push(oldKey)
      } else {
        result.skipped.push(`${oldKey} (not found)`)
      }
    }

    // 2. Upsert semua menu dari DEFAULT_MENUS
    for (const m of DEFAULT_MENUS) {
      const existing = await db.menuItem.findUnique({ where: { key: m.key } })
      if (existing) {
        await db.menuItem.update({
          where: { key: m.key },
          data: {
            label: m.label,
            icon: m.icon,
            order: m.order,
            roles: m.roles,
          },
        })
        result.updated.push(m.key)
      } else {
        await db.menuItem.create({
          data: {
            key: m.key,
            label: m.label,
            icon: m.icon,
            order: m.order,
            roles: m.roles,
            isVisible: true,
            isActive: true,
            parentId: null,
          },
        })
        result.created.push(m.key)
      }
    }

    // 3. Return list menu final untuk verifikasi
    const finalMenus = await db.menuItem.findMany({
      where: { isActive: true, isVisible: true, parentId: null },
      orderBy: { order: 'asc' },
      select: { key: true, label: true, icon: true, order: true, roles: true },
    })

    return NextResponse.json({
      success: true,
      data: { result, finalMenus },
      message: `Re-seed selesai. Dihapus: ${result.deleted.length}. Dibuat: ${result.created.length}. Diupdate: ${result.updated.length}.`,
    })
  } catch (e: any) {
    console.error('[Menus Reseed] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal re-seed menu: ${e.message}` },
      { status: 500 }
    )
  }
}
