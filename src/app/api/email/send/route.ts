// LAPRA 08 - API: Kirim Email via Resend
// POST /api/email/send — kirim email (butuh login admin)
// Body: { to, subject, html, from? }
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/server-helpers'
import { sendEmail } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  // Hanya admin yang bisa kirim email
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN' && user.role !== 'ADMIN_DPD') {
    return NextResponse.json({ success: false, error: 'Hanya admin yang bisa kirim email' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { to, subject, html, from } = body

    if (!to || !subject || !html) {
      return NextResponse.json({ success: false, error: 'to, subject, html wajib diisi' }, { status: 400 })
    }

    const result = await sendEmail({ to, subject, html, from })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Email berhasil dikirim ke ${Array.isArray(to) ? to.join(', ') : to}`,
        messageId: result.messageId,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Gagal mengirim email',
      }, { status: 500 })
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
