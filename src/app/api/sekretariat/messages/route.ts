// LAPRA 08 - API: Sekretariat Messages (Hubungi Kami, Pengaduan, Bantuan Hukum)
// FIX PRIVASI (UU PDP No. 27/2022):
// - POST: simpen submittedById + submittedByName
// - GET: user biasa HANYA lihat pesan sendiri; admin (SUPERADMIN/ADMIN_DPN) lihat semua
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPNLevel } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/sekretariat/messages - List messages
// Query: ?category=PENGADUAN|HUBUNGI|BANTUAN_HUKUM (optional)
// RBAC: user biasa HANYA lihat pesan sendiri; admin lihat semua
export async function GET(request: NextRequest) {
  try {
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

    // === RBAC FILTER (FIX PRIVASI) ===
    // Admin (SUPERADMIN/ADMIN_DPN) bisa lihat SEMUA pesan (untuk triage)
    // User biasa HANYA lihat pesan yang dia kirim sendiri
    if (!isDPNLevel(user.role)) {
      messages = messages.filter((m: any) => m.submittedById === user.id)
    }

    return NextResponse.json({ success: true, data: messages })
  } catch (e: any) {
    console.error('[Sekretariat Messages GET] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal memuat pesan: ${e.message}` },
      { status: 500 }
    )
  }
}

// POST /api/sekretariat/messages - Submit new message
// Simpan submittedById + submittedByName untuk filter privasi
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const msg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: body.name || user.fullName || 'Anonim',
      email: body.email || user.email || '',
      phone: body.phone || user.phone || '',
      subject: body.subject || '',
      message: body.message || '',
      priority: body.priority || 'NORMAL',
      category: body.category || 'HUBUNGI',
      status: 'NEW',
      createdAt: new Date().toISOString(),
      // === FIX PRIVASI: simpen userId pengirim ===
      submittedById: user.id,
      submittedByName: user.fullName,
      submittedByTerritoryId: user.territoryId,
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
    return NextResponse.json(
      { success: false, error: `Gagal mengirim pesan: ${e.message}` },
      { status: 500 }
    )
  }
}
