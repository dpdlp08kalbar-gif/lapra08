// LAPRA 08 - API: Update Status Tiket
// PATCH /api/tickets/[id]/status — ubah status tiket (SuperAdmin/DPN only)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Hanya SuperAdmin/DPN yang bisa ubah status
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    return NextResponse.json({
      success: false,
      error: 'Akses ditolak. Hanya admin yang dapat mengubah status tiket.'
    }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { status, assignedTo } = body

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({
        success: false,
        error: `Status tidak valid. Pilihan: ${VALID_STATUSES.join(', ')}`
      }, { status: 400 })
    }

    const updateData: any = { status }
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null
    // Auto-assign ke admin yang resolve/close
    if ((status === 'RESOLVED' || status === 'CLOSED') && !assignedTo) {
      updateData.assignedTo = user.id
    }

    const ticket = await db.supportTicket.update({
      where: { id },
      data: updateData,
      include: { reporter: { include: { territory: true } } },
    })

    return NextResponse.json({
      success: true,
      data: ticket,
      message: `Status tiket diubah ke ${status}`,
    })
  } catch (e: any) {
    console.error('[Ticket Status Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
