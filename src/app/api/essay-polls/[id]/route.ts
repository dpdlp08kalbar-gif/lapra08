// LAPRA 08 - API: Essay Poll [id] - manage single poll
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// GET - Poll detail with responses + AI analysis stats
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const poll = await db.essayPoll.findUnique({
      where: { id },
      include: {
        createdBy: { select: { fullName: true } },
        responses: {
          orderBy: { submittedAt: 'desc' },
          take: 100,
        },
        _count: { select: { responses: true } },
      },
    })
    if (!poll) return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })

    // Aggregate sentiment stats
    const sentimentStats = {
      POSITIVE: poll.responses.filter(r => r.aiSentiment === 'POSITIVE').length,
      NEUTRAL: poll.responses.filter(r => r.aiSentiment === 'NEUTRAL').length,
      NEGATIVE: poll.responses.filter(r => r.aiSentiment === 'NEGATIVE').length,
      UNPROCESSED: poll.responses.filter(r => !r.isProcessed).length,
    }

    // Aggregate location stats (top 5 regencies)
    const locMap: Record<string, number> = {}
    for (const r of poll.responses) {
      if (r.regencyCode) {
        locMap[r.regencyCode] = (locMap[r.regencyCode] || 0) + 1
      } else if (r.provinceCode) {
        locMap[r.provinceCode] = (locMap[r.provinceCode] || 0) + 1
      }
    }
    const topLocations = Object.entries(locMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }))

    return NextResponse.json({
      success: true,
      data: {
        ...poll,
        sentimentStats,
        topLocations,
        totalResponses: poll.responses.length,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// PUT - Update poll status (DRAFT → ACTIVE → CLOSED)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()
    const { status, broadcastSentAt, broadcastRecipientCount } = body

    const updateData: any = {}
    if (status) updateData.status = status
    if (broadcastSentAt) updateData.broadcastSentAt = new Date(broadcastSentAt)
    if (broadcastRecipientCount !== undefined) updateData.broadcastRecipientCount = broadcastRecipientCount

    const poll = await db.essayPoll.update({ where: { id }, data: updateData })
    return NextResponse.json({ success: true, data: poll, message: `Status poll: ${status}` })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    await db.essayPoll.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Poll dihapus' })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
