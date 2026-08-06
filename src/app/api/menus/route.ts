// LAPRA 08 - API: Menus (Dynamic Menu Builder)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { canAccess } from '@/lib/types'

// GET /api/menus - List menu yang bisa diakses user
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const menus = await db.menuItem.findMany({
    where: { isActive: true, isVisible: true, parentId: null },
    include: {
      children: {
        where: { isActive: true, isVisible: true },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  })

  // Filter berdasarkan role
  const filtered = menus.filter((m) => canAccess(user.role as any, m.roles))
    .map((m) => ({
      ...m,
      children: m.children.filter((c) => canAccess(user.role as any, c.roles)),
    }))

  return NextResponse.json({ success: true, data: filtered })
}

// POST /api/menus - Tambah menu baru (SUPERADMIN/ADMIN_DPN only)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN')) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  const body = await request.json()
  const { key, label, icon, order, parentId, roles, isVisible = true } = body

  if (!key || !label) {
    return NextResponse.json({ success: false, error: 'Key dan label wajib diisi' }, { status: 400 })
  }

  const menu = await db.menuItem.create({
    data: {
      key,
      label,
      icon: icon || 'Circle',
      order: order || 0,
      parentId: parentId || null,
      roles: roles || 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC',
      isVisible,
    },
  })

  return NextResponse.json({ success: true, data: menu })
}
