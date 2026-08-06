// LAPRA 08 - API: Auth (Login/Logout/Me)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/types'

// POST /api/auth - Login (Development Mode: password plain text)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username dan password wajib diisi' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { username: username.toLowerCase() },
      include: { territory: true },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Akun tidak ditemukan atau tidak aktif' },
        { status: 401 }
      )
    }

    // Development Mode: plain text password comparison
    // (sesuai brief: tidak ada security ketat selama masa pembangunan)
    if (user.password !== password) {
      return NextResponse.json(
        { success: false, error: 'Username atau password salah' },
        { status: 401 }
      )
    }

    // Update lastLogin
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as SessionUser['role'],
      territoryId: user.territoryId,
      territoryName: user.territory.name,
      territoryCode: user.territory.code,
      territoryLevel: user.territory.level as SessionUser['territoryLevel'],
      avatar: user.avatar,
    }

    return NextResponse.json({ success: true, data: sessionUser })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || 'Server error' },
      { status: 500 }
    )
  }
}

// GET /api/auth - Cek sesi by header x-user-id
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { territory: true },
  })
  if (!user || !user.isActive) {
    return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
  }
  const sessionUser: SessionUser = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role as SessionUser['role'],
    territoryId: user.territoryId,
    territoryName: user.territory.name,
    territoryCode: user.territory.code,
    territoryLevel: user.territory.level as SessionUser['territoryLevel'],
    avatar: user.avatar,
  }
  return NextResponse.json({ success: true, data: sessionUser })
}
