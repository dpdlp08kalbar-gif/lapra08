// LAPRA 08 - API: Public Opinion Links
// GET - List all analyzed public opinion links (with RBAC + filters)
// POST - Add link manually OR auto-scrape from YouTube + Google News (saves to DB)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { scrapeAuto } from '@/lib/auto-scraper'
import { analyzeSentiment, calculatePriority, detectLocation } from '@/lib/social-scraper'

// GET - List opinion links
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform')
  const sentiment = searchParams.get('sentiment')
  const priority = searchParams.get('priority')
  const status = searchParams.get('status')
  const provinceCode = searchParams.get('provinceCode')
  const limit = parseInt(searchParams.get('limit') || '50')

  const territory = await db.territory.findUnique({ where: { id: user.territoryId } })
  const where: any = {}

  // RBAC filter
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    if (territory?.level === 'PROVINCE') {
      where.OR = [{ provinceCode: territory.code }, { provinceCode: null }]
    } else if (territory?.level === 'REGENCY') {
      where.OR = [{ regencyCode: territory.code }, { regencyCode: null }]
    }
  }

  if (platform) where.platform = platform
  if (sentiment) where.sentiment = sentiment
  if (priority) where.priority = priority
  if (status) where.status = status
  if (provinceCode) where.provinceCode = provinceCode

  const links = await db.publicOpinionLink.findMany({
    where,
    include: { reviewedBy: { select: { fullName: true } } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  })

  return NextResponse.json({ success: true, data: links })
}

// POST - Auto-scrape & save links
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    // === Auto-scrape mode ===
    if (body.action === 'scrape') {
      const { posts, sources } = await scrapeAuto()
      let savedCount = 0
      let duplicateCount = 0
      let newHigh = 0
      let newMedium = 0

      for (const post of posts) {
        const text = `${post.title} ${post.content}`
        const sentimentResult = analyzeSentiment(text)
        const priorityResult = calculatePriority(text, post.engagementCount, sentimentResult.sentiment)
        const loc = detectLocation(text)

        const existing = await db.publicOpinionLink.findUnique({ where: { url: post.url } })
        if (existing) {
          duplicateCount++
          continue
        }

        await db.publicOpinionLink.create({
          data: {
            url: post.url,
            platform: post.platform,
            title: post.title.substring(0, 500),
            content: post.content.substring(0, 1000),
            author: post.author,
            authorHandle: post.authorHandle,
            publishedAt: post.publishedAt,
            engagementCount: post.engagementCount,
            provinceCode: loc.provinceCode,
            provinceName: loc.provinceName,
            regencyCode: loc.regencyCode,
            regencyName: loc.regencyName,
            sentiment: sentimentResult.sentiment,
            priority: priorityResult.priority,
            urgencyScore: priorityResult.urgencyScore,
            category: priorityResult.category,
            keywords: JSON.stringify({ source: post.source }),
            aiSummary: `Sentimen: ${sentimentResult.sentiment}. Kategori: ${priorityResult.category}. Urgency: ${priorityResult.urgencyScore}/100. Lokasi: ${loc.regencyName || loc.provinceName || 'Nasional'}.`,
            status: 'NEW',
            sourceMethod: 'AUTO',
          },
        })
        savedCount++
        if (priorityResult.priority === 'HIGH') newHigh++
        else if (priorityResult.priority === 'MEDIUM') newMedium++
      }

      return NextResponse.json({
        success: true,
        message: `Scan otomatis selesai. ${savedCount} link baru disimpan, ${duplicateCount} duplikat dilewati. ${newHigh} HIGH priority, ${newMedium} MEDIUM priority. Sumber: ${sources.join(', ')}.`,
        data: { saved: savedCount, duplicates: duplicateCount, newHigh, newMedium, sources },
      })
    }

    // === Manual add mode ===
    const { url, title, platform, content } = body
    if (!url || !title || !platform) {
      return NextResponse.json({ success: false, error: 'URL, title, dan platform wajib' }, { status: 400 })
    }

    const text = `${title} ${content || ''}`
    const sentimentResult = analyzeSentiment(text)
    const priorityResult = calculatePriority(text, 0, sentimentResult.sentiment)
    const loc = detectLocation(text)

    const link = await db.publicOpinionLink.create({
      data: {
        url, title: title.substring(0, 500), platform,
        content: (content || '').substring(0, 1000),
        provinceCode: loc.provinceCode,
        provinceName: loc.provinceName,
        regencyCode: loc.regencyCode,
        regencyName: loc.regencyName,
        sentiment: sentimentResult.sentiment,
        priority: priorityResult.priority,
        urgencyScore: priorityResult.urgencyScore,
        category: priorityResult.category,
        status: 'NEW',
        sourceMethod: 'MANUAL',
      },
    })

    return NextResponse.json({ success: true, data: link, message: 'Link ditambahkan' })
  } catch (e: any) {
    console.error('[Opinion Links POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
