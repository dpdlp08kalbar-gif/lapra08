// LAPRA 08 - API: AI Recommendations
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// GET - List recommendations with RBAC
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const territory = await db.territory.findUnique({ where: { id: user.territoryId } })
  const where: any = {}

  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    if (territory?.level === 'PROVINCE') {
      where.OR = [{ scope: 'NATIONAL' }, { scope: 'PROVINCE', provinceCode: territory.code }]
    } else if (territory?.level === 'REGENCY') {
      where.OR = [{ scope: 'NATIONAL' }, { scope: 'PROVINCE', provinceCode: territory.parentId }, { scope: 'REGENCY', regencyCode: territory.code }]
    }
  }

  const recommendations = await db.aIRecommendation.findMany({
    where,
    include: { alert: true, approvedBy: { select: { fullName: true } } },
    orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  })

  return NextResponse.json({ success: true, data: recommendations })
}

// PUT - Approve/reject recommendation
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const body = await request.json()
    const { status, executionNotes } = body

    const updated = await db.aIRecommendation.update({
      where: { id },
      data: {
        status: status || undefined,
        executionNotes: executionNotes || undefined,
        approvedById: status === 'APPROVED' || status === 'EXECUTED' ? user.id : undefined,
        approvedAt: status === 'APPROVED' || status === 'EXECUTED' ? new Date() : undefined,
        executedAt: status === 'EXECUTED' ? new Date() : undefined,
      },
    })
    return NextResponse.json({ success: true, data: updated, message: `Rekomendasi ${status}` })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
