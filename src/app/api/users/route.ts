// LAPRA 08 - API: Users (User Management)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getAccessibleTerritoryIds } from '@/lib/server-helpers'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN' && user.role !== 'ADMIN_DPD') {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  const scope = await getAccessibleTerritoryIds(user)
  const where = scope.isGlobal ? {} : { territoryId: { in: scope.territoryIds } }

  const users = await db.user.findMany({
    where,
    include: { territory: true },
    orderBy: { createdAt: 'desc' },
    // Jangan return password
  })

  // Strip password
  const safe = users.map(({ password, ...u }) => u)

  return NextResponse.json({ success: true, data: safe })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN' && user.role !== 'ADMIN_DPD')) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  const body = await request.json()
  const { username, password, fullName, email, phone, role, territoryId, isActive = true } = body

  if (!username || !password || !fullName || !role || !territoryId) {
    return NextResponse.json(
      { success: false, error: 'Username, password, nama, role, dan wilayah wajib diisi' },
      { status: 400 }
    )
  }

  // DPD hanya bisa buat user DPC di scope-nya
  if (user.role === 'ADMIN_DPD' && role !== 'ADMIN_DPC') {
    return NextResponse.json(
      { success: false, error: 'DPD hanya bisa membuat akun DPC' },
      { status: 403 }
    )
  }

  const scope = await getAccessibleTerritoryIds(user)
  if (!scope.isGlobal && !scope.territoryIds.includes(territoryId)) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  // Cek duplikasi username
  const existing = await db.user.findUnique({ where: { username: username.toLowerCase() } })
  if (existing) {
    return NextResponse.json(
      { success: false, error: 'Username sudah digunakan' },
      { status: 400 }
    )
  }

  const newUser = await db.user.create({
    data: {
      username: username.toLowerCase(),
      password, // Development mode: plain text
      fullName,
      email,
      phone,
      role,
      territoryId,
      isActive,
    },
    include: { territory: true },
  })

  const { password: _, ...safe } = newUser
  return NextResponse.json({ success: true, data: safe })
}
