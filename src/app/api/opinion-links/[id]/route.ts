// LAPRA 08 - API: Opinion Link [id] - review & manage
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()
    const { status, reviewNotes } = body

    const link = await db.publicOpinionLink.update({
      where: { id },
      data: {
        status: status || 'REVIEWED',
        reviewNotes: reviewNotes || null,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: link, message: `Link ditandai: ${status}` })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    await db.publicOpinionLink.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Link dihapus' })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
