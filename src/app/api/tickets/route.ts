// LAPRA 08 - API: Support Tickets (Help Desk)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// Pastikan route berjalan di Node.js runtime (bukan Edge), selalu dynamic
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // SUPERADMIN/ADMIN_DPN lihat semua, lainnya hanya ticket miliknya
    const where =
      user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN'
        ? {}
        : { reporterId: user.id }

    const tickets = await db.supportTicket.findMany({
      where,
      include: {
        reporter: { include: { territory: true } },
        replies: { include: { user: true }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: tickets })
  } catch (e: any) {
    console.error('[Tickets GET] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal memuat tiket: ${e.message}` }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, category = 'BUG', priority = 'MEDIUM', screenshotUrl } = body

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: 'Judul dan deskripsi wajib diisi' },
        { status: 400 }
      )
    }

    // Generate ticket number: TK-YYYYMMDD-XXX
    const today = new Date()
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    const todayCount = await db.supportTicket.count({
      where: { ticketNumber: { startsWith: `TK-${dateStr}` } },
    })
    const ticketNumber = `TK-${dateStr}-${String(todayCount + 1).padStart(3, '0')}`

    const ticket = await db.supportTicket.create({
      data: {
        ticketNumber,
        title,
        description,
        category,
        priority,
        status: 'OPEN',
        reporterId: user.id,
        screenshotUrl,
      },
      include: { reporter: { include: { territory: true } } },
    })

    return NextResponse.json({ success: true, data: ticket })
  } catch (e: any) {
    console.error('[Tickets POST] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal membuat tiket: ${e.message}` }, { status: 500 })
  }
}
