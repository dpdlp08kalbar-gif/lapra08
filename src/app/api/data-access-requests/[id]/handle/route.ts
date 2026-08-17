// LAPRA 08 - API: Handle Data Access Request (DPO only)
// PATCH /api/data-access-requests/[id]/handle — DPO handle DAR
//   body: { action: 'claim' | 'approve' | 'deny' | 'complete', notes?, response? }
//
// Workflow:
//   PENDING → claim → IN_REVIEW (DPO mengambil)
//   IN_REVIEW → approve → APPROVED (DPO setujui, eksekusi)
//   IN_REVIEW → deny → DENIED (DPO tolak dengan alasan)
//   APPROVED → complete → COMPLETED (eksekusi selesai)
//
// UU PDP Pasal 46: respons dalam 3×24 jam
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPO, logAccess } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_ACTIONS = ['claim', 'approve', 'deny', 'complete']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (!await isDPO(user)) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Hanya DPO yang bisa handle permintaan data.' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { action, notes, response } = body

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Action tidak valid. Pilih: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      )
    }

    const existing = await db.dataAccessRequest.findUnique({
      where: { id },
      select: { id: true, requestNumber: true, status: true, type: true, requestorId: true, requestorName: true },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Permintaan tidak ditemukan' }, { status: 404 })
    }

    // Validate state transition
    const transitions: Record<string, string> = {
      claim: 'IN_REVIEW',
      approve: 'APPROVED',
      deny: 'DENIED',
      complete: 'COMPLETED',
    }
    const newStatus = transitions[action]
    const validFrom: Record<string, string[]> = {
      IN_REVIEW: ['PENDING'],
      APPROVED: ['IN_REVIEW'],
      DENIED: ['IN_REVIEW'],
      COMPLETED: ['APPROVED'],
    }
    if (!validFrom[newStatus].includes(existing.status)) {
      return NextResponse.json(
        { success: false, error: `Tidak bisa ${action} dari status ${existing.status}. Status harus: ${validFrom[newStatus].join(' atau ')}` },
        { status: 400 }
      )
    }

    // For deny, require notes
    if (action === 'deny' && !notes) {
      return NextResponse.json(
        { success: false, error: 'Wajib isi notes untuk menolak permintaan (alasan penolakan)' },
        { status: 400 }
      )
    }

    const updateData: any = {
      status: newStatus,
      handlerId: user.id,
      handlerNotes: notes || undefined,
      response: response || undefined,
    }
    if (action === 'claim') updateData.reviewedAt = new Date()
    if (action === 'complete') updateData.completedAt = new Date()

    const updated = await db.dataAccessRequest.update({
      where: { id },
      data: updateData,
      select: {
        id: true, requestNumber: true, status: true, handlerNotes: true,
        reviewedAt: true, completedAt: true,
        handler: { select: { id: true, fullName: true } },
      },
    })

    // Audit log
    await logAccess({
      actor: user,
      action: 'UPDATE',
      resource: 'DATA_ACCESS_REQUEST',
      resourceId: id,
      resourceLabel: `${existing.requestNumber} (${existing.type}) → ${newStatus}`,
      request,
      detail: notes || action,
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Permintaan ${existing.requestNumber} → ${newStatus}`,
    })
  } catch (e: any) {
    console.error('[DataAccessRequest Handle PATCH] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal handle permintaan: ${e.message}` },
      { status: 500 }
    )
  }
}
