// LAPRA 08 - API: Audit Complaint [id] - Update response status
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const body = await request.json()
    const { responseStatus, responseType } = body

    const complaint = await db.auditComplaint.findUnique({ where: { id } })
    if (!complaint) return NextResponse.json({ success: false, error: 'Keluhan tidak ditemukan' }, { status: 404 })

    const now = new Date()
    const responseTime = complaint.publishedAt ? Math.round((now.getTime() - new Date(complaint.publishedAt).getTime()) / 60000) : null

    const updated = await db.auditComplaint.update({
      where: { id },
      data: {
        responseStatus: responseStatus || 'IN_PROGRESS',
        responseType: responseType || null,
        responseBy: user.fullName,
        respondedAt: now,
        responseTime,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Keluhan ditandai sebagai ${responseStatus}${responseTime ? ` (waktu respon: ${responseTime} menit)` : ''}`,
    })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
