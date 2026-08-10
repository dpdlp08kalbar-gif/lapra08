// LAPRA 08 - API: Social Listening Alerts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// GET - List alerts with RBAC
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const territory = await db.territory.findUnique({ where: { id: user.territoryId } })
  const where: any = {}

  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    if (territory?.level === 'PROVINCE') {
      where.OR = [{ provinceCode: territory.code }, { provinceCode: null }]
    } else if (territory?.level === 'REGENCY') {
      where.OR = [{ regencyCode: territory.code }, { regencyCode: null }]
    }
  }

  const alerts = await db.alertNotification.findMany({
    where,
    include: { rule: true, recommendations: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 50,
  })

  return NextResponse.json({ success: true, data: alerts })
}

// POST - Create alert (SUPERADMIN/DPN)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })

  try {
    const body = await request.json()
    const { type, severity, title, message, provinceCode, regencyCode, mentionCount, negativePercentage } = body
    if (!title || !message) return NextResponse.json({ success: false, error: 'Judul dan pesan wajib' }, { status: 400 })

    const alert = await db.alertNotification.create({
      data: {
        type: type || 'SENTIMENT_SPIKE',
        severity: severity || 'HIGH',
        title, message,
        provinceCode: provinceCode || null,
        regencyCode: regencyCode || null,
        mentionCount: mentionCount || 0,
        negativePercentage: negativePercentage || null,
        recipientId: user.id,
      },
    })
    return NextResponse.json({ success: true, data: alert, message: 'Alert dibuat' })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
