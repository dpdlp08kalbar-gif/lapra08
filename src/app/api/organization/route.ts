// LAPRA 08 - API: Organization Structure (Pengurus)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getViewableTerritoryIds } from '@/lib/server-helpers'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const scope = await getViewableTerritoryIds(user)
  const where: any = scope.isGlobalView ? {} : { territoryId: { in: scope.territoryIds } }

  // Non-superadmin hanya lihat APPROVED; Super Admin lihat semua
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    where.approvalStatus = 'APPROVED'
  }

  const positions = await db.orgPosition.findMany({
    where,
    include: { territory: true },
    orderBy: [{ level: 'asc' }, { order: 'asc' }],
  })

  return NextResponse.json({ success: true, data: positions })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    fullName,
    positionName,
    level,
    territoryId,
    phone,
    email,
    photoUrl,
    ktaPhotoUrl,
    biodataUrl,
    startDate,
    endDate,
    order = 0,
  } = body

  if (!fullName || !positionName || !level || !territoryId) {
    return NextResponse.json(
      { success: false, error: 'Nama, jabatan, level, dan wilayah wajib diisi' },
      { status: 400 }
    )
  }

  const scope = await getAccessibleTerritoryIds(user)
  if (!scope.isGlobal && !scope.territoryIds.includes(territoryId)) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  // Sistem Perizinan: non-superadmin → status PENDING (butuh approval)
  const isSuperAdmin = user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN'
  const approvalStatus = isSuperAdmin ? 'APPROVED' : 'PENDING'
  const isActive = isSuperAdmin // PENDING = tidak aktif sampai di-approve

  const position = await db.orgPosition.create({
    data: {
      fullName,
      positionName,
      level,
      territoryId,
      phone,
      email,
      photoUrl,
      ktaPhotoUrl,
      biodataUrl,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      order,
      approvalStatus,
      isActive,
      source: body.source || 'MANUAL',
    },
    include: { territory: true },
  })

  return NextResponse.json({
    success: true,
    data: position,
    message: isSuperAdmin
      ? 'Pengurus berhasil ditambahkan.'
      : 'Pengurus ditambahkan dengan status PENDING. Menunggu persetujuan Admin DPN.',
  })
}
