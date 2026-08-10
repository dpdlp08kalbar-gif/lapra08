// LAPRA 08 - API: Social Mentions (with RBAC)
// GET /api/social-listening/mentions - List stored mentions from DB (with RBAC filter)
// GET /api/social-listening/mentions?live=true - LIVE scrape from Google News RSS (REAL data)
// POST - Add mention manually
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { scrapeAllPlatforms, buildComplaint } from '@/lib/social-scraper'

// GET - List mentions (DB-stored OR live-scraped)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const sentiment = searchParams.get('sentiment')
  const platform = searchParams.get('platform')
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') || '50')
  const live = searchParams.get('live') === 'true'

  // === LIVE SCRAPE MODE: Fetch REAL mentions from Google News RSS ===
  if (live) {
    const territory = await db.territory.findUnique({ where: { id: user.territoryId } })
    let scope: { provinceCode?: string | null; regencyCode?: string | null } = {}
    if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
      if (territory?.level === 'PROVINCE') scope = { provinceCode: territory.code }
      else if (territory?.level === 'REGENCY') scope = { regencyCode: territory.code }
    }

    const platforms = platform ? [platform] : ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'TWITTER_X', 'GOOGLE']
    const mentions = await scrapeAllPlatforms(platforms, scope)

    // Build full complaint objects with sentiment + priority
    let results = mentions.map(m => {
      const c = buildComplaint(m)
      return {
        id: `live-${m.url}`,
        platform: c.platform,
        author: c.author,
        authorHandle: c.authorHandle,
        title: m.title,
        content: c.content,
        url: m.url,
        publishedAt: m.publishedAt,
        provinceCode: c.provinceCode,
        provinceName: c.provinceName,
        regencyCode: c.regencyCode,
        regencyName: c.regencyName,
        sentiment: c.sentiment,
        priority: c.priority,
        urgencyScore: c.urgencyScore,
        category: c.category,
        engagementCount: c.engagementCount,
        isLive: true, // Flag for UI to show "REAL" badge
      }
    })

    // Apply filters
    if (sentiment) results = results.filter(r => r.sentiment === sentiment)
    if (category) results = results.filter(r => r.category === category)
    if (platform) results = results.filter(r => r.platform === platform)

    return NextResponse.json({ success: true, data: results.slice(0, limit), isLive: true, source: 'Google News RSS (real-time)' })
  }

  // === DB MODE: Return stored mentions (with RBAC) ===
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

  return NextResponse.json({ success: true, data: mentions, isLive: false })
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
