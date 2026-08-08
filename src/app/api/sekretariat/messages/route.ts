// LAPRA 08 - API: Sekretariat Messages (Hubungi Kami, Pengaduan, Bantuan Hukum)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// GET /api/sekretariat/messages - List messages (optionally filter by category)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  const items = await db.systemSetting.findMany({
    where: { category: 'SEKRETARIAT_MESSAGE' },
    orderBy: { updatedAt: 'desc' },
  })

  let messages = items.map((item) => {
    try { return JSON.parse(item.value) } catch { return null }
  }).filter(Boolean)

  // Filter by message category (stored in message body)
  if (category) {
    messages = messages.filter((m: any) => m.category === category)
  }

  return NextResponse.json({ success: true, data: messages })
}

// POST /api/sekretariat/messages - Submit new message
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const msg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: body.name || 'Anonim',
      email: body.email || '',
      phone: body.phone || '',
      subject: body.subject || '',
      message: body.message || '',
      priority: body.priority || 'NORMAL',
      category: body.category || 'HUBUNGI',
      status: 'NEW',
      createdAt: new Date().toISOString(),
    }

    await db.systemSetting.create({
      data: {
        key: msg.id,
        value: JSON.stringify(msg),
        category: 'SEKRETARIAT_MESSAGE',
        description: `Message: ${msg.subject.substring(0, 60)}`,
      },
    })

    return NextResponse.json({
      success: true,
      data: msg,
      message: 'Pesan berhasil dikirim',
    })
  } catch (e: any) {
    console.error('[Message Submit Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
