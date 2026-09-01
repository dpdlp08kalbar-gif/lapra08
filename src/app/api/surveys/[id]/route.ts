// LAPRA 08 - API: Survey [id] — Detail, Update, Delete
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPNLevel, logAccess } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/surveys/[id] — Detail survey + responses + sentimen stats
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    const survey = await db.essayPoll.findUnique({
      where: { id },
      include: {
        createdBy: { select: { fullName: true } },
        responses: {
          orderBy: { submittedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true, answer: true, wordCount: true,
            aiSentiment: true, aiScore: true, aiCategory: true, aiSummary: true,
            isProcessed: true, submittedAt: true,
            ageGroup: true, gender: true, occupation: true,
            provinceCode: true, regencyCode: true,
          },
        },
        _count: { select: { responses: true } },
      },
    })

    if (!survey) return NextResponse.json({ success: false, error: 'Survei tidak ditemukan' }, { status: 404 })

    // Load poll config
    const config = await db.systemSetting.findUnique({ where: { key: `poll_config_${id}` }, select: { value: true } })
    const pollConfig = config ? JSON.parse(config.value) : { pollType: 'ESSAY' }

    // Sentimen stats
    const sentimentStats = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0, UNPROCESSED: 0 }
    const allResponses = await db.essayResponse.findMany({ where: { pollId: id }, select: { aiSentiment: true, isProcessed: true } })
    for (const r of allResponses) {
      if (r.aiSentiment) sentimentStats[r.aiSentiment as keyof typeof sentimentStats]++
      else sentimentStats.UNPROCESSED++
    }

    return NextResponse.json({
      success: true,
      data: {
        ...survey,
        pollType: pollConfig.pollType || 'ESSAY',
        options: pollConfig.options || null,
        sentimentStats,
        totalResponses: survey._count.responses,
        pagination: {
          page, limit,
          total: survey._count.responses,
          totalPages: Math.ceil(survey._count.responses / limit),
          hasNext: page * limit < survey._count.responses,
          hasPrev: page > 1,
        },
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// PUT /api/surveys/[id] — Update status (DRAFT→ACTIVE→CLOSED)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const { status } = await request.json()
    const VALID = ['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED']
    if (status && !VALID.includes(status)) {
      return NextResponse.json({ success: false, error: `Status tidak valid: ${VALID.join(', ')}` }, { status: 400 })
    }

    const survey = await db.essayPoll.update({ where: { id }, data: { status }, select: { id: true, title: true, status: true } })
    await logAccess({ actor: user, action: 'UPDATE', resource: 'SYSTEM_SETTING', resourceId: id, resourceLabel: survey.title, request, detail: `Status → ${status}` })

    return NextResponse.json({ success: true, data: survey, message: `Status: ${status}` })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE /api/surveys/[id] — Delete permanent
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const existing = await db.essayPoll.findUnique({ where: { id }, select: { title: true } })
    if (!existing) return NextResponse.json({ success: false, error: 'Survei tidak ditemukan' }, { status: 404 })

    await db.essayPoll.delete({ where: { id } })
    await db.systemSetting.deleteMany({ where: { key: `poll_config_${id}` } }).catch(() => {})
    await logAccess({ actor: user, action: 'DELETE', resource: 'SYSTEM_SETTING', resourceId: id, resourceLabel: existing.title, request, detail: 'Delete survey + responses' })

    return NextResponse.json({ success: true, message: 'Survei dihapus permanen' })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
