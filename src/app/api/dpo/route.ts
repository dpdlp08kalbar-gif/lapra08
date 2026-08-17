// LAPRA 08 - API: DPO Assignment (UU PDP No. 27/2022 Pasal 53)
// GET /api/dpo — list semua DPO aktif
// PATCH /api/dpo — body: { userId, assign: boolean } — toggle isDPO
// RBAC: SUPERADMIN only untuk PATCH, DPN untuk GET
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, logAccess, isDPNLevel } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!isDPNLevel(user.role)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }
    const dpos = await db.user.findMany({
      where: { isDPO: true, isActive: true },
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
      select: { id: true, fullName: true, role: true, isActive: true, isDPO: true },
    })
    if (!target) return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 })
    if (!target.isActive) {
      return NextResponse.json({ success: false, error: 'Tidak bisa assign DPO ke user nonaktif' }, { status: 400 })
    }
    if (!assign && target.isDPO) {
      const dpoCount = await db.user.count({ where: { isDPO: true, isActive: true } })
      if (dpoCount <= 1) {
        return NextResponse.json({ success: false, error: 'Tidak bisa menghapus DPO terakhir. Wajib minimal 1 DPO aktif (UU PDP Pasal 53).' }, { status: 400 })
      }
    }
    const updated = await db.user.update({
      where: { id: userId },
      data: { isDPO: assign },
      select: { id: true, fullName: true, isDPO: true, role: true },
    })
    await logAccess({
      actor, action: 'UPDATE', resource: 'USER',
      resourceId: userId, resourceLabel: `${target.fullName} (${target.role})`,
      request, detail: assign ? 'Assign as DPO' : 'Unassign DPO',
    })
    return NextResponse.json({
      success: true, data: updated,
      message: `${target.fullName} ${assign ? 'ditunjuk sebagai' : 'dihapus dari peran'} DPO`,
    })
  } catch (e: any) {
    console.error('[DPO Assign PATCH] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal update DPO: ${e.message}` }, { status: 500 })
  }
}
