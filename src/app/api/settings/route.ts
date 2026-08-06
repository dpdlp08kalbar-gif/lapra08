// LAPRA 08 - API: System Settings
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await db.systemSetting.findMany({
    orderBy: { category: 'asc' },
  })

  return NextResponse.json({ success: true, data: settings })
}
