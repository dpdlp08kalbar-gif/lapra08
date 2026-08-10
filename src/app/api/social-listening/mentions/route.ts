// LAPRA 08 - API: Social Mentions (with RBAC)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// GET - List mentions with RBAC filtering
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const sentiment = searchParams.get('sentiment')
  const platform = searchParams.get('platform')
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') || '50')

  const territory = await db.territory.findUnique({ where: { id: user.territoryId } })
  const where: any = {}

  // RBAC
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    if (territory?.level === 'PROVINCE') {
      where.OR = [{ provinceCode: territory.code }, { provinceCode: null }]
    } else if (territory?.level === 'REGENCY') {
      where.OR = [{ regencyCode: territory.code }, { regencyCode: null }]
    }
  }

  if (sentiment) where.sentiment = sentiment
  if (platform) where.platform = platform
  if (category) where.category = category

  const mentions = await db.socialMention.findMany({
    where,
    include: { source: true },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })

  return NextResponse.json({ success: true, data: mentions })
}

// POST - Add mention manually (or from scraper)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { sourceId, platform, title, content, url, author, publishedAt, engagementCount, provinceCode, regencyCode } = body
    if (!sourceId || !title || !content) return NextResponse.json({ success: false, error: 'Source ID, judul, dan konten wajib' }, { status: 400 })

    const mention = await db.socialMention.create({
      data: {
        sourceId, platform, title, content, url, author: author || null,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        engagementCount: engagementCount || 0,
        provinceCode: provinceCode || null, regencyCode: regencyCode || null,
        isProcessed: false, // Will be processed by NLP engine
      },
    })
    return NextResponse.json({ success: true, data: mention, message: 'Mention ditambahkan' })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
