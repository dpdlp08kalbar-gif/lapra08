// LAPRA 08 - API: WhatsApp Notifications Queue (Vercel Free compliant)
// ============================================================
// NOTIFIKASI WA ke admin DPN setiap auto-scan Google selesai dengan
// hasil URGENT/HIGH. Tetap 100% gratis (no API berbayar, no Baileys worker).
//
// Strategi:
// - Cron Vercel enqueue notifikasi ke SystemSetting (key='wa_notifications')
// - UI tampilkan badge counter + list notifikasi pending
// - User klik "Buka WhatsApp" → wa.me/{nomor}?text={pesan} (manual kirim)
//
// GET  /api/wa-notifications — list notifikasi (pending & sent)
// POST /api/wa-notifications — enqueue notifikasi baru (dipanggil oleh cron)
//   Body: { type: 'URGENT'|'HIGH', title, message, scanDate, elektabilitasScore, recommendations }
// PATCH /api/wa-notifications?id=xxx — mark as sent (klik tombol WA)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPNLevel, logAccess } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NOTIF_KEY = 'wa_notifications_queue'

async function getQueue(): Promise<any[]> {
  const r = await db.systemSetting.findUnique({ where: { key: NOTIF_KEY } })
  if (!r) return []
  try { return JSON.parse(r.value) } catch { return [] }
}

async function setQueue(queue: any[]): Promise<void> {
  // Keep max 100 notifikasi (rolling)
  const trimmed = queue.slice(0, 100)
  await db.systemSetting.upsert({
    where: { key: NOTIF_KEY },
    update: { value: JSON.stringify(trimmed) },
    create: { key: NOTIF_KEY, value: JSON.stringify(trimmed) },
  })
}

// ============================================================
// GET — list notifikasi (untuk UI badge + list)
// ============================================================
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all' // all | pending | sent
    const queue = await getQueue()

    let filtered = queue
    if (filter === 'pending') filtered = queue.filter(n => !n.sentAt)
    else if (filter === 'sent') filtered = queue.filter(n => n.sentAt)

    // Get admin DPN phone numbers untuk tombol WA
    const adminDpn = await db.user.findMany({
      where: { role: { in: ['SUPERADMIN', 'ADMIN_DPN'] }, isActive: true, phone: { not: null } },
      select: { id: true, fullName: true, phone: true },
    })
    const adminPhones = adminDpn
      .map(a => ({ name: a.fullName, phone: a.phone }))
      .filter(p => p.phone && p.phone.length >= 8)

    return NextResponse.json({
      success: true,
      data: {
        queue: filtered,
        totalPending: queue.filter(n => !n.sentAt).length,
        totalUrgent: queue.filter(n => n.type === 'URGENT' && !n.sentAt).length,
        totalHigh: queue.filter(n => n.type === 'HIGH' && !n.sentAt).length,
        adminDpn: adminPhones,
      },
    })
  } catch (e: any) {
    console.error('[WA Notif GET] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// POST — enqueue notifikasi baru (dipanggil oleh /api/google-scan cron)
// Body: { type, title, message, scanDate, elektabilitasScore, recommendations }
// ============================================================
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)

  // Auth: support cron trigger (tanpa x-user-id → fallback SUPERADMIN)
  let authedUser = user
  if (!authedUser) {
    const authHeader = request.headers.get('authorization') || ''
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader === `Bearer ${cronSecret}`) {
      try {
        const superadmin = await db.user.findFirst({
          where: { role: 'SUPERADMIN', isActive: true },
          select: { id: true, fullName: true, role: true },
        })
        if (superadmin) authedUser = superadmin as any
      } catch (e) { /* ignore */ }
    }
  }
  if (!authedUser) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { type, title, message, scanDate, elektabilitasScore, recommendations } = body

    if (!type || !title) {
      return NextResponse.json({ success: false, error: 'type dan title wajib diisi' }, { status: 400 })
    }
    if (!['URGENT', 'HIGH'].includes(type)) {
      return NextResponse.json({ success: false, error: 'type harus URGENT atau HIGH' }, { status: 400 })
    }

    const notif = {
      id: `wa_notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type, title, message: message || '',
      scanDate: scanDate || new Date().toISOString(),
      elektabilitasScore: elektabilitasScore || null,
      recommendations: recommendations || [],
      createdAt: new Date().toISOString(),
      sentAt: null,
      sentBy: null,
    }

    const queue = await getQueue()
    queue.unshift(notif)
    await setQueue(queue)

    await logAccess({
      actor: authedUser as any, action: 'CREATE', resource: 'SYSTEM_SETTING',
      resourceId: NOTIF_KEY, request, detail: `Notif WA ${type}: ${title}`,
    })

    return NextResponse.json({
      success: true,
      data: notif,
      message: `Notifikasi ${type} di-enqueue ke antrian WA`,
    })
  } catch (e: any) {
    console.error('[WA Notif POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// PATCH — mark as sent (dipanggil setelah user klik tombol WA)
// ?id=xxx → mark notifikasi sebagai terkirim
// ============================================================
export async function PATCH(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id wajib diisi' }, { status: 400 })

    const queue = await getQueue()
    const idx = queue.findIndex(n => n.id === id)
    if (idx === -1) return NextResponse.json({ success: false, error: 'Notifikasi tidak ditemukan' }, { status: 404 })

    queue[idx].sentAt = new Date().toISOString()
    queue[idx].sentBy = user.fullName
    await setQueue(queue)

    await logAccess({
      actor: user, action: 'UPDATE', resource: 'SYSTEM_SETTING',
      resourceId: NOTIF_KEY, request, detail: `Mark WA notif sent: ${queue[idx].title}`,
    })

    return NextResponse.json({ success: true, message: 'Notifikasi ditandai terkirim' })
  } catch (e: any) {
    console.error('[WA Notif PATCH] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// DELETE — hapus notifikasi
// ?id=xxx
// ============================================================
export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isDPNLevel(user.role)) {
    return NextResponse.json({ success: false, error: 'Hanya DPN yang bisa hapus notifikasi' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id wajib diisi' }, { status: 400 })

    const queue = await getQueue()
    const filtered = queue.filter(n => n.id !== id)
    await setQueue(filtered)

    await logAccess({
      actor: user, action: 'DELETE', resource: 'SYSTEM_SETTING',
      resourceId: NOTIF_KEY, request, detail: `Hapus WA notif: ${id}`,
    })

    return NextResponse.json({ success: true, message: 'Notifikasi dihapus' })
  } catch (e: any) {
    console.error('[WA Notif DELETE] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
