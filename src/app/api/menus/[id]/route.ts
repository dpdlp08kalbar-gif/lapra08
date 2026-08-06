// LAPRA 08 - API: Menus [id] - Update, Delete
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN')) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }
  const { id } = await params

  const body = await request.json()
  const { label, icon, order, roles, isVisible, isActive } = body

  const menu = await db.menuItem.update({
    where: { id },
    data: {
      label,
      icon,
      order,
      roles,
      isVisible,
      isActive,
    },
  })

  return NextResponse.json({ success: true, data: menu })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN')) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }
  const { id } = await params

  await db.menuItem.delete({ where: { id } })
  return NextResponse.json({ success: true, message: 'Menu deleted' })
}
