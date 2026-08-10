// LAPRA 08 - API: Social Source [id] - Update & Delete
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  const { id } = await params
  try {
    const body = await request.json()
    const updated = await db.socialSource.update({ where: { id }, data: { ...body, keywords: body.keywords ? JSON.stringify(body.keywords) : undefined } })
    return NextResponse.json({ success: true, data: updated, message: 'Sumber diperbarui' })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  const { id } = await params
  try {
    await db.socialSource.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true, message: 'Sumber dinonaktifkan' })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
