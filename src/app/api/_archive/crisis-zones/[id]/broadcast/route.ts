// LAPRA 08 - API: Crisis Zone Broadcast (klarifikasi via WhatsApp)
// POST /api/crisis-zones/[id]/broadcast
//   Body: { clarificationMessage, clarificationVideoUrl?, clarificationQuote? }
//   - Update crisis zone with clarification fields
//   - Count VoterContact (target territory) for recipientCount
//   - Create Broadcast record with crisisZoneId
//   - Return: { success, data: { crisisZone, broadcastDetails } }
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getUserFromRequest,
  getViewableTerritoryIds,
  isDPNLevel,
} from '@/lib/server-helpers'

export async function POST(
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
      clarificationMessage,
      clarificationVideoUrl,
      clarificationQuote,
      channel = 'WHATSAPP',
    } = body

    const crisisZone = await db.crisisZone.findUnique({
      where: { id },
      include: { territory: true },
    })

    if (!crisisZone) {
      return NextResponse.json(
        { success: false, error: 'Crisis zone tidak ditemukan' },
        { status: 404 }
      )
    }

    // View scope check
    const viewScope = await getViewableTerritoryIds(user)
    if (!viewScope.isGlobalView && !viewScope.territoryIds.includes(crisisZone.territoryId)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }

    if (!clarificationMessage) {
      return NextResponse.json(
        { success: false, error: 'Pesan klarifikasi wajib diisi' },
        { status: 400 }
      )
    }

    // Count VoterContact recipients in target territory (and sub-territories)
    const recipientCount = await db.voterContact.count({
      where: {
        isActive: true,
        whatsappOptIn: true,
        OR: [
          { territoryId: crisisZone.territoryId },
          { path: { startsWith: crisisZone.territoryId } },
        ],
      },
    })

    // Build broadcast message
    const broadcastMessage = [
      ` klarifikasi resmi - ${crisisZone.title}`,
      ``,
      clarificationMessage,
      clarificationQuote ? `\n"${clarificationQuote}"` : '',
    ].join('\n')

    // Create Broadcast record linked to this crisis zone
    const broadcast = await db.broadcast.create({
      data: {
        title: `[KLARIFIKASI] ${crisisZone.title}`,
        message: broadcastMessage,
        channel,
        status: 'SENT',
        targetScope: JSON.stringify({
          territoryId: crisisZone.territoryId,
          type: 'CRISIS_CLARIFICATION',
          crisisZoneId: id,
        }),
        recipientCount,
        crisisZoneId: id,
        videoUrl: clarificationVideoUrl || null,
        sentById: user.id,
        sentAt: new Date(),
      },
      include: {
        sentBy: { select: { id: true, fullName: true, username: true } },
      },
    })

    // Update crisis zone: store clarification + broadcast info
    const updatedCrisisZone = await db.crisisZone.update({
      where: { id },
      data: {
        clarificationMessage,
        clarificationVideoUrl: clarificationVideoUrl || null,
        clarificationQuote: clarificationQuote || null,
        broadcastSentAt: new Date(),
        broadcastRecipientCount: recipientCount,
        // Unlock the zone since clarification has been broadcast
        isLocked: false,
      },
      include: {
        territory: true,
        resolvedBy: { select: { id: true, fullName: true, username: true } },
      },
    })

    console.log(
      `[CRISIS BROADCAST SIMULATION] Klarifikasi untuk "${crisisZone.title}" dikirim ke ${recipientCount} kontak pemilih`
    )

    // Return data with broadcastDetails NESTED inside data
    return NextResponse.json({
      success: true,
      data: {
        crisisZone: updatedCrisisZone,
        broadcastDetails: broadcast,
      },
      message: `Klarifikasi berhasil disiarkan ke ${recipientCount} kontak pemilih di wilayah ${crisisZone.territory?.name || 'terkait'}.`,
    })
  } catch (e: any) {
    console.error('[CrisisZone Broadcast Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
