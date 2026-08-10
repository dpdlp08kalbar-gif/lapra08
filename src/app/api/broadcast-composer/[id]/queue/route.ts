// LAPRA 08 - API: Broadcast Queue Processor
// POST /api/broadcast-composer/[id]/queue - Process pending queue (anti-banned batch)
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/server-helpers'
import { processBroadcastQueue, initDefaultEngineConfig } from '@/lib/broadcast-engine'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    return NextResponse.json({ success: false, error: 'Hanya DPN/Superadmin' }, { status: 403 })
  }

  try {
    const { id } = await params
    await initDefaultEngineConfig()

    const result = await processBroadcastQueue(id)

    return NextResponse.json({
      success: true,
      data: result,
      message: `Queue processed: ${result.processed} messages (${result.sent} sent, ${result.failed} failed, ${result.blocked} blocked)`,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
