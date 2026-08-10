// LAPRA 08 - API: Broadcast Stats
// GET /api/broadcast-composer/[id]/stats - Get broadcast progress + sample messages
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { getBroadcastStats } from '@/lib/broadcast-engine'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const stats = await getBroadcastStats(id)

    const failedMessages = await db.broadcastMessage.findMany({
      where: { broadcastId: id, status: { in: ['FAILED', 'BLOCKED'] } },
      take: 10,
      select: { recipientName: true, recipientPhone: true, errorCode: true, errorMessage: true, retryCount: true, status: true },
    })

    const sentMessages = await db.broadcastMessage.findMany({
      where: { broadcastId: id, status: 'SENT' },
      take: 5,
      select: { recipientName: true, recipientTerritory: true, personalizedContent: true, sentAt: true, platformMessageId: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        stats,
        failedMessages: failedMessages.map(m => ({
          ...m,
          recipientPhone: m.recipientPhone.replace(/(\d{4})\d{4}(\d{4})/, '$1****$2'),
        })),
        sentMessages: sentMessages.map(m => ({
          ...m,
          personalizedContent: m.personalizedContent.substring(0, 250),
        })),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
