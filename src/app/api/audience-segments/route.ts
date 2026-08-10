// LAPRA 08 - API: Audience Segments
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const segments = await db.audienceSegment.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ success: true, data: segments })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { name, description, filterCriteria } = body
    if (!name || !filterCriteria) return NextResponse.json({ success: false, error: 'Nama dan filter wajib' }, { status: 400 })
    const segment = await db.audienceSegment.create({
      data: { name, description: description || null, filterCriteria: JSON.stringify(filterCriteria), createdById: user.id },
    })
    return NextResponse.json({ success: true, data: segment, message: 'Segment audiens dibuat' })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
