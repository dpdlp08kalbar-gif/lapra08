// LAPRA 08 - API: Poll Detail / Update / Delete
// GET    /api/polls/[id]   - Poll detail with territory, createdBy, response counts
// PUT    /api/polls/[id]   - Update poll. When status changes DRAFT → ACTIVE:
//                            - set closesAt = now + 24h
//                            - count VoterContact (target territory)
//                            - create Broadcast with pollId
// DELETE /api/polls/[id]   - Delete poll
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getUserFromRequest,
  getViewableTerritoryIds,
  isDPNLevel,
} from '@/lib/server-helpers'

// GET - Poll detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const poll = await db.poll.findUnique({
      where: { id },
      include: {
        territory: true,
        createdBy: { select: { id: true, fullName: true, username: true } },
        _count: { select: { responses: true, aspirations: true } },
      },
    })

    if (!poll) {
      return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })
    }

    // View scope check
    const viewScope = await getViewableTerritoryIds(user)
    if (!viewScope.isGlobalView && !viewScope.territoryIds.includes(poll.territoryId)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }

    // Parse options JSON for convenience
    const pollWithParsed = {
      ...poll,
      optionsParsed: (() => {
        try { return JSON.parse(poll.options) } catch { return [] }
      })(),
      targetDemographicsParsed: (() => {
        try {
          return poll.targetDemographics ? JSON.parse(poll.targetDemographics) : null
        } catch { return null }
      })(),
    }

    return NextResponse.json({ success: true, data: pollWithParsed })
  } catch (e: any) {
    console.error('[Poll Detail GET Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// PUT - Update poll (with DRAFT → ACTIVE broadcast logic)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!isDPNLevel(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Akses ditolak: Hanya SUPERADMIN/ADMIN_DPN' },
      { status: 403 }
    )
  }

  try {
    const { id } = await params
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
      status,
      closesAt,
    } = body

    const existing = await db.poll.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (question !== undefined) updateData.question = question
    if (description !== undefined) updateData.description = description
    if (triggerEvent !== undefined) updateData.triggerEvent = triggerEvent
    if (triggerUrl !== undefined) updateData.triggerUrl = triggerUrl
    if (targetDemographics !== undefined) {
      updateData.targetDemographics = targetDemographics
        ? JSON.stringify(targetDemographics)
        : null
    }
    if (territoryId !== undefined) updateData.territoryId = territoryId
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null
    }
    if (options !== undefined && Array.isArray(options)) {
      const normalizedOptions = options.map((opt: any, idx: number) => ({
        id: opt.id || String(idx + 1),
        label: opt.label,
        sentiment: opt.sentiment || 'NEUTRAL',
      }))
      updateData.options = JSON.stringify(normalizedOptions)
    }

    // ====== STATUS CHANGE: DRAFT → ACTIVE ======
    // Trigger: broadcast poll to VoterContact database, set 24h closing
    let broadcastCreated: any = null
    if (status && status !== existing.status && existing.status === 'DRAFT' && status === 'ACTIVE') {
      updateData.status = 'ACTIVE'
      // Set closesAt to 24 hours from now
      updateData.closesAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

      // Count VoterContact (in target territory) for recipientCount
      const targetTerritoryId = updateData.territoryId || existing.territoryId
      const recipientCount = await db.voterContact.count({
        where: {
          isActive: true,
          whatsappOptIn: true,
          OR: [
            { territoryId: targetTerritoryId },
            // Also include voter contacts in sub-territories if territory is high-level
            { path: { startsWith: targetTerritoryId } },
          ],
        },
      })

      updateData.broadcastSentAt = new Date()
      updateData.broadcastRecipientCount = recipientCount

      // Create Broadcast record linking to this poll
      const pollTitle = updateData.title || existing.title
      const pollQuestion = updateData.question || existing.question
      broadcastCreated = await db.broadcast.create({
        data: {
          title: `[POLLING] ${pollTitle}`,
          message: pollQuestion,
          channel: 'WHATSAPP',
          status: 'SENT',
          targetScope: JSON.stringify({
            territoryId: targetTerritoryId,
            type: 'POLL_BROADCAST',
            pollId: id,
          }),
          recipientCount,
          pollId: id,
          sentById: user.id,
          sentAt: new Date(),
        },
        include: { sentBy: { select: { id: true, fullName: true, username: true } } },
      })

      console.log(
        `[POLL BROADCAST SIMULATION] Poll "${pollTitle}" broadcast to ${recipientCount} voter contacts`
      )
    } else if (status !== undefined) {
      // Other status transitions (ACTIVE → CLOSED, CLOSED → ARCHIVED, etc.)
      updateData.status = status
    }

    if (closesAt !== undefined) {
      updateData.closesAt = closesAt ? new Date(closesAt) : null
    }

    const updated = await db.poll.update({
      where: { id },
      data: updateData,
      include: {
        territory: true,
        createdBy: { select: { id: true, fullName: true, username: true } },
        _count: { select: { responses: true, aspirations: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      broadcastDetails: broadcastCreated,
      message:
        broadcastCreated
          ? `Poll diaktifkan. Broadcast terkirim ke ${broadcastCreated.recipientCount} kontak pemilih. Polling ditutup otomatis dalam 24 jam.`
          : undefined,
    })
  } catch (e: any) {
    console.error('[Poll PUT Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE - Delete poll
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!isDPNLevel(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Akses ditolak: Hanya SUPERADMIN/ADMIN_DPN' },
      { status: 403 }
    )
  }

  try {
    const { id } = await params
    const existing = await db.poll.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })
    }

    // Cascade delete responses & unlinked aspirations (pollId set null)
    await db.pollResponse.deleteMany({ where: { pollId: id } })
    await db.aspiration.updateMany({ where: { pollId: id }, data: { pollId: null } })
    // Unlink broadcasts
    await db.broadcast.updateMany({ where: { pollId: id }, data: { pollId: null } })
    await db.poll.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Poll berhasil dihapus' })
  } catch (e: any) {
    console.error('[Poll DELETE Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
