// LAPRA 08 - API: Security Settings (Saklar Keamanan)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await db.securitySetting.findMany({
    orderBy: { key: 'asc' },
  })

  return NextResponse.json({ success: true, data: settings })
}

// PATCH - Toggle security switch (hanya SUPERADMIN)
export async function PATCH(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user || user.role !== 'SUPERADMIN') {
    return NextResponse.json(
      { success: false, error: 'Hanya Super Admin yang dapat mengatur saklar keamanan' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { key, isActive } = body

  const setting = await db.securitySetting.update({
    where: { key },
    data: { isActive },
  })

  return NextResponse.json({ success: true, data: setting })
}
