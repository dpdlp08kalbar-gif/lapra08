// LAPRA 08 - API: Broadcasts (WhatsApp Broadcast)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getAccessibleTerritoryIds } from '@/lib/server-helpers'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const scope = await getAccessibleTerritoryIds(user)
  const where = scope.isGlobal ? {} : { territoryId: { in: scope.territoryIds } }

  // Broadcasts tidak punya territoryId langsung, gunakan sentBy.territoryId
  const broadcasts = await db.broadcast.findMany({
    where: scope.isGlobal ? {} : { sentBy: { territoryId: { in: scope.territoryIds } } },
    include: { sentBy: { include: { territory: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: broadcasts })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { title, message, channel = 'WHATSAPP', targetScope, scheduledAt } = body

  if (!title || !message || !targetScope) {
    return NextResponse.json(
      { success: false, error: 'Judul, pesan, dan target wajib diisi' },
      { status: 400 }
    )
  }

  // Hitung recipient count berdasarkan scope
  const scope = await getAccessibleTerritoryIds(user)
  let memberWhere: any = {}
  if (targetScope.territoryId) {
    memberWhere.territoryId = targetScope.territoryId
    if (!scope.isGlobal && !scope.territoryIds.includes(targetScope.territoryId)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }
  } else if (!scope.isGlobal) {
    memberWhere.territoryId = { in: scope.territoryIds }
  }
  memberWhere.status = 'ACTIVE'

  const recipientCount = await db.member.count({ where: memberWhere })

  const broadcast = await db.broadcast.create({
    data: {
      title,
      message,
      channel,
      status: scheduledAt ? 'QUEUED' : 'SENT',
      targetScope: JSON.stringify(targetScope),
      recipientCount,
      sentById: user.id,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      sentAt: scheduledAt ? null : new Date(),
    },
    include: { sentBy: { include: { territory: true } } },
  })

  // Catat log "pesan dikirim" (simulasi - di produksi akan koneksi WhatsApp API)
  console.log(`[BROADCAST SIMULATION] "${title}" sent to ${recipientCount} recipients`)

  return NextResponse.json({ success: true, data: broadcast })
}
