// LAPRA 08 - API: Reply Tiket Laporan
// POST /api/tickets/[id]/reply — tambah balasan ke tiket (semua user login)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { message } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Pesan balasan wajib diisi' }, { status: 400 })
    }

    // Validasi: tiket harus ada
    const ticket = await db.supportTicket.findUnique({ where: { id } })
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Tiket tidak ditemukan' }, { status: 404 })
    }

    // Hanya pelapor atau admin (SuperAdmin/DPN) yang bisa reply
    const isReporter = ticket.reporterId === user.id
    const isAdmin = user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN'
    if (!isReporter && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }

    // Simpan balasan ke database
    const reply = await db.supportTicketReply.create({
      data: {
        ticketId: id,
        userId: user.id,
        message: message.trim(),
      },
      include: { user: { include: { territory: true } } },
    })

    // Jika admin yang reply → auto-update status ke IN_PROGRESS (sedang diproses)
    if (isAdmin && ticket.status === 'OPEN') {
      await db.supportTicket.update({
        where: { id },
        data: { status: 'IN_PROGRESS', assignedTo: user.id },
      })
    }

    return NextResponse.json({
      success: true,
      data: reply,
      message: 'Balasan berhasil dikirim',
    })
  } catch (e: any) {
    console.error('[Ticket Reply Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
