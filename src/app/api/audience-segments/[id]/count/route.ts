// LAPRA 08 - API: Audience Segment [id] - Count contacts matching filter
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const segment = await db.audienceSegment.findUnique({ where: { id } })
  if (!segment) return NextResponse.json({ success: false, error: 'Segment tidak ditemukan' }, { status: 404 })

  const filter = JSON.parse(segment.filterCriteria)
  const where: any = { isActive: true }
  if (filter.whatsappOptIn) where.whatsappOptIn = true
  if (filter.provinceCode) where.provinceCode = filter.provinceCode
  if (filter.regencyCode) where.regencyCode = filter.regencyCode
  if (filter.ageGroup) where.ageGroup = filter.ageGroup
  if (filter.gender) where.gender = filter.gender
  if (filter.occupation) where.occupation = filter.occupation

  const count = await db.contact.count({ where })
  await db.audienceSegment.update({ where: { id }, data: { contactCount: count } })
  return NextResponse.json({ success: true, data: { count, filter } })
}
