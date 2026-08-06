// LAPRA 08 - API: Approve/Reject pengurus (Super Admin only)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// PATCH /api/organization/approve - Approve or reject pending pengurus
export async function PATCH(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Hanya SUPERADMIN & ADMIN_DPN yang bisa approve
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    return NextResponse.json(
      { success: false, error: 'Hanya Super Admin / Admin DPN yang dapat menyetujui data' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { positionId, action } = body // action: APPROVE | REJECT

    if (!positionId || !action) {
      return NextResponse.json(
        { success: false, error: 'positionId dan action wajib diisi' },
        { status: 400 }
      )
    }

    const position = await db.orgPosition.findUnique({ where: { id: positionId } })
    if (!position) {
      return NextResponse.json({ success: false, error: 'Pengurus tidak ditemukan' }, { status: 404 })
    }

    if (position.approvalStatus !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Pengurus ini tidak dalam status Pending' },
        { status: 400 }
      )
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
    const updateData: any = {
      approvalStatus: newStatus,
      approvedById: user.id,
      approvedAt: new Date(),
      isActive: action === 'APPROVE',
    }

    const updated = await db.orgPosition.update({
      where: { id: positionId },
      data: updateData,
      include: { territory: true },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Pengurus "${updated.fullName}" ${action === 'APPROVE' ? 'disetujui' : 'ditolak'}`,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// GET /api/organization/approve - List pending pengurus for approval queue
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    return NextResponse.json(
      { success: false, error: 'Hanya Super Admin / Admin DPN yang dapat melihat antrean persetujuan' },
      { status: 403 }
    )
  }

  const pending = await db.orgPosition.findMany({
    where: { approvalStatus: 'PENDING' },
    include: { territory: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: pending })
}
