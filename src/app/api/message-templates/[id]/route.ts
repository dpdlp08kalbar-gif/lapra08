// LAPRA 08 - API: Message Template [id] - Update & Delete
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const body = await request.json()
    const updated = await db.messageTemplate.update({ where: { id }, data: { ...body, variables: body.variables ? JSON.stringify(body.variables) : undefined } })
    return NextResponse.json({ success: true, data: updated, message: 'Template diperbarui' })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    await db.messageTemplate.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Template dihapus' })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
