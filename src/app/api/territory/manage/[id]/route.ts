// LAPRA 08 - API: Territory [id] — Update & Delete
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPNLevel, logAccess } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// PUT — Update territory
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()
    const { name, code, isActive, metadata } = body

    const existing = await db.territory.findUnique({ where: { id }, select: { id: true, name: true, level: true, code: true } })
    if (!existing) return NextResponse.json({ success: false, error: 'Wilayah tidak ditemukan' }, { status: 404 })

    if ((existing.level === 'COUNTRY' || existing.level === 'PROVINCE') && !isDPNLevel(user.role)) {
      return NextResponse.json({ success: false, error: 'Hanya admin DPN yang bisa ubah level ini' }, { status: 403 })
    }

    const data: any = {}
    if (name?.trim()) data.name = name.trim()
    if (code?.trim()) data.code = code.trim()
    if (typeof isActive === 'boolean') data.isActive = isActive
    if (metadata) data.metadata = JSON.stringify(metadata)

    const updated = await db.territory.update({ where: { id }, data })
    await logAccess({ actor: user, action: 'UPDATE', resource: 'SYSTEM_SETTING', resourceId: id, resourceLabel: updated.name, request, detail: `Update: ${existing.name}` })
    return NextResponse.json({ success: true, data: updated, message: 'Wilayah diperbarui' })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}

// DELETE — Delete territory + children recursively
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const existing = await db.territory.findUnique({ where: { id }, select: { id: true, name: true, level: true } })
    if (!existing) return NextResponse.json({ success: false, error: 'Wilayah tidak ditemukan' }, { status: 404 })

    if ((existing.level === 'COUNTRY' || existing.level === 'PROVINCE') && !isDPNLevel(user.role)) {
      return NextResponse.json({ success: false, error: 'Hanya admin DPN yang bisa hapus level ini' }, { status: 403 })
    }

    await deleteChildren(id)
    await db.territory.delete({ where: { id } })
    await logAccess({ actor: user, action: 'DELETE', resource: 'SYSTEM_SETTING', resourceId: id, resourceLabel: existing.name, request, detail: `Delete: ${existing.name}` })
    return NextResponse.json({ success: true, message: `${existing.name} dihapus` })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}

async function deleteChildren(parentId: string) {
  const children = await db.territory.findMany({ where: { parentId }, select: { id: true } })
  for (const child of children) {
    await deleteChildren(child.id)
    await db.territory.delete({ where: { id: child.id } }).catch(() => {})
  }
}
