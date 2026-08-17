// LAPRA 08 - API: DPO Assignment (UU PDP No. 27/2022 Pasal 53)
// GET /api/dpo — list semua DPO aktif (dari SystemSetting + join User)
// PATCH /api/dpo — body: { userId, assign: boolean } — toggle DPO via SystemSetting
//
// NOTE: DPO assignments disimpan di SystemSetting key='dpo_assignments' (JSON array of userIds)
// Tidak pakai field isDPO di User table untuk avoid DB migration
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, logAccess, isDPNLevel } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Helper: ambil daftar DPO IDs dari SystemSetting
async function getDpoIds(): Promise<string[]> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: 'dpo_assignments' },
      select: { value: true },
    })
    if (!setting) return []
    return JSON.parse(setting.value) as string[]
  } catch {
    return []
  }
}

// Helper: simpan daftar DPO IDs ke SystemSetting
async function saveDpoIds(ids: string[]): Promise<void> {
  const value = JSON.stringify(ids)
  await db.systemSetting.upsert({
    where: { key: 'dpo_assignments' },
    update: { value, category: 'DPO', description: 'DPO assignments (UU PDP No. 27/2022 Pasal 53)' },
    create: {
      key: 'dpo_assignments',
      value,
      category: 'DPO',
      description: 'DPO assignments (UU PDP No. 27/2022 Pasal 53)',
    },
  })
}

// GET /api/dpo — list semua DPO aktif
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!isDPNLevel(user.role)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }

    const dpoIds = await getDpoIds()
    const dpos = dpoIds.length === 0 ? [] : await db.user.findMany({
      where: { id: { in: dpoIds }, isActive: true },
      select: {
        id: true, username: true, fullName: true, email: true, phone: true,
        role: true, territory: { select: { name: true, code: true } },
        lastLogin: true, createdAt: true,
      },
      orderBy: { fullName: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: dpos,
      count: dpos.length,
      message: dpos.length === 0
        ? 'Belum ada DPO ditunjuk. Wajib tunjuk minimal 1 DPO sesuai UU PDP No. 27/2022 Pasal 53.'
        : `${dpos.length} DPO aktif`,
    })
  } catch (e: any) {
    console.error('[DPO List GET] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal memuat list DPO: ${e.message}` }, { status: 500 })
  }
}

// PATCH /api/dpo — body: { userId, assign: boolean }
export async function PATCH(request: NextRequest) {
  try {
    const actor = await getUserFromRequest(request)
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (actor.role !== 'SUPERADMIN') {
      return NextResponse.json({ success: false, error: 'Akses ditolak. Hanya SuperAdmin yang bisa assign DPO.' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, assign } = body
    if (!userId || typeof assign !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Field wajib: userId (string), assign (boolean)' }, { status: 400 })
    }

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, role: true, isActive: true },
    })
    if (!target) return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 })
    if (!target.isActive) {
      return NextResponse.json({ success: false, error: 'Tidak bisa assign DPO ke user nonaktif' }, { status: 400 })
    }

    const dpoIds = await getDpoIds()
    const isCurrentlyDPO = dpoIds.includes(userId)

    if (assign && !isCurrentlyDPO) {
      dpoIds.push(userId)
    } else if (!assign && isCurrentlyDPO) {
      // Safety: tidak bisa hapus DPO terakhir
      if (dpoIds.length <= 1) {
        return NextResponse.json(
          { success: false, error: 'Tidak bisa menghapus DPO terakhir. Wajib minimal 1 DPO aktif (UU PDP Pasal 53).' },
          { status: 400 }
        )
      }
      const idx = dpoIds.indexOf(userId)
      dpoIds.splice(idx, 1)
    } else {
      // Tidak ada perubahan
      return NextResponse.json({
        success: true,
        data: { id: target.id, fullName: target.fullName, isDPO: isCurrentlyDPO },
        message: 'Tidak ada perubahan',
      })
    }

    await saveDpoIds(dpoIds)

    // Audit log
    await logAccess({
      actor,
      action: 'UPDATE',
      resource: 'USER',
      resourceId: userId,
      resourceLabel: `${target.fullName} (${target.role})`,
      request,
      detail: assign ? 'Assign as DPO' : 'Unassign DPO',
    })

    return NextResponse.json({
      success: true,
      data: { id: target.id, fullName: target.fullName, isDPO: assign },
      message: `${target.fullName} ${assign ? 'ditunjuk sebagai' : 'dihapus dari peran'} DPO`,
    })
  } catch (e: any) {
    console.error('[DPO Assign PATCH] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal update DPO: ${e.message}` }, { status: 500 })
  }
}
