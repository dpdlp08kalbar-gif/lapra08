// LAPRA 08 - API: Polls (Presidential Sentiment Dashboard)
// GET  /api/polls          - List polls (with _count responses, scope filtered)
// POST /api/polls          - Create poll (SUPERADMIN/ADMIN_DPN only)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getUserFromRequest,
  getViewableTerritoryIds,
  isDPNLevel,
} from '@/lib/server-helpers'

// GET - List polls with _count responses
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const scope = await getViewableTerritoryIds(user)

    const where: any = {}
    if (!scope.isGlobalView) {
      where.territoryId = { in: scope.territoryIds }
    }
    if (status) {
      where.status = status
    }

    const polls = await db.poll.findMany({
      where,
      include: {
        territory: true,
        createdBy: { select: { id: true, fullName: true, username: true } },
        _count: { select: { responses: true, aspirations: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: polls })
  } catch (e: any) {
    console.error('[Polls GET Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST - Create poll (SUPERADMIN/ADMIN_DPN only)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!isDPNLevel(user.role)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Akses ditolak: Hanya SUPERADMIN/ADMIN_DPN yang dapat membuat poll',
      },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const {
      title,
      question,
      description,
      triggerEvent,
      triggerUrl,
      options,
      targetDemographics,
      territoryId,
      scheduledAt,
      status = 'DRAFT',
    } = body

    if (!title || !question || !territoryId) {
      return NextResponse.json(
        { success: false, error: 'Judul, pertanyaan, dan wilayah wajib diisi' },
        { status: 400 }
      )
    }

    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Poll harus memiliki minimal 2 opsi jawaban' },
        { status: 400 }
      )
    }

    // Validate options structure: [{ id, label, sentiment }]
    const normalizedOptions = options.map((opt: any, idx: number) => ({
      id: opt.id || String(idx + 1),
      label: opt.label,
      sentiment: opt.sentiment || 'NEUTRAL',
    }))

    const poll = await db.poll.create({
      data: {
        title,
        question,
        description: description || null,
        triggerEvent: triggerEvent || null,
        triggerUrl: triggerUrl || null,
        options: JSON.stringify(normalizedOptions),
        targetDemographics: targetDemographics ? JSON.stringify(targetDemographics) : null,
        territoryId,
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        createdById: user.id,
      },
      include: {
        territory: true,
        createdBy: { select: { id: true, fullName: true, username: true } },
        _count: { select: { responses: true, aspirations: true } },
      },
    })

    return NextResponse.json({ success: true, data: poll })
  } catch (e: any) {
    console.error('[Polls POST Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
