// LAPRA 08 - API: Contacts [id] - Update & Delete
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const body = await request.json()
    const updated = await db.contact.update({ where: { id }, data: { ...body, tags: body.tags ? JSON.stringify(body.tags) : undefined }, include: { territory: true } })
    return NextResponse.json({ success: true, data: updated, message: 'Kontak diperbarui' })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    await db.contact.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Kontak dihapus' })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
