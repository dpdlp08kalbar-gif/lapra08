// LAPRA 08 - API: Social Mentions (AUTO SCRAPER, ZERO CONFIG)
// GET /api/social-listening/mentions - List stored mentions from DB (with RBAC filter)
// GET /api/social-listening/mentions?live=true - AUTO SCRAPE YouTube + Google News (no API key needed)
// POST - Add mention manually
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { scrapeAuto } from '@/lib/auto-scraper'
import { analyzeSentiment, calculatePriority, detectLocation } from '@/lib/social-scraper'

// GET - List mentions (DB-stored OR auto-scraped)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const sentiment = searchParams.get('sentiment')
  const platform = searchParams.get('platform')
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') || '50')
  const live = searchParams.get('live') === 'true'

  // === LIVE MODE: Auto-scrape YouTube + Google News (no API key needed) ===
  if (live) {
    const { posts, sources, skipped } = await scrapeAuto()

    let results = posts.map(p => {
      const text = `${p.title} ${p.content}`
      const sent = analyzeSentiment(text)
      const pri = calculatePriority(text, p.engagementCount, sent.sentiment)
      const loc = detectLocation(text)
      return {
        id: `live-${p.postId}`,
        platform: p.platform,
        author: p.author,
        authorHandle: p.authorHandle,
        title: p.title,
        content: p.content,
        url: p.url,
        publishedAt: p.publishedAt,
        provinceCode: loc.provinceCode,
        provinceName: loc.provinceName,
        regencyCode: loc.regencyCode,
        regencyName: loc.regencyName,
        sentiment: sent.sentiment,
        priority: pri.priority,
        urgencyScore: pri.urgencyScore,
        category: pri.category,
        engagementCount: p.engagementCount,
        isLive: true,
        source: p.source,
      }
    })

    // Apply filters
    if (sentiment) results = results.filter(r => r.sentiment === sentiment)
    if (category) results = results.filter(r => r.category === category)
    if (platform) results = results.filter(r => r.platform === platform)

    return NextResponse.json({
      success: true,
      data: results.slice(0, limit),
      isLive: true,
      sources,
      skipped,
      message: `${results.length} REAL mentions via ${sources.join(' + ')}`,
    })
  }

  // === DB MODE: Return stored mentions (with RBAC) ===
  const territory = await db.territory.findUnique({ where: { id: user.territoryId } })
  const where: any = {}

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
        isProcessed: false,
      },
    })
    return NextResponse.json({ success: true, data: mention, message: 'Mention ditambahkan' })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}

