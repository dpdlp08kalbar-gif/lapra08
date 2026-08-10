// LAPRA 08 - API: Opinion Map - geographic aggregate of public opinion
// GET - Returns opinion counts + sentiment breakdown per province/regency
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// GET - Geographic opinion aggregate
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const level = searchParams.get('level') || 'PROVINCE' // PROVINCE | REGENCY
  const platform = searchParams.get('platform')
  const sentiment = searchParams.get('sentiment')

  // Get all opinion links (with RBAC)
  const territory = await db.territory.findUnique({ where: { id: user.territoryId } })
  const where: any = {}

  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    if (territory?.level === 'PROVINCE') {
      where.OR = [{ provinceCode: territory.code }, { provinceCode: null }]
    } else if (territory?.level === 'REGENCY') {
      where.OR = [{ regencyCode: territory.code }, { regencyCode: null }]
    }
  }

  if (platform) where.platform = platform
  if (sentiment) where.sentiment = sentiment

  const links = await db.publicOpinionLink.findMany({
    where,
    select: {
      provinceCode: true, provinceName: true,
      regencyCode: true, regencyName: true,
      sentiment: true, priority: true, platform: true,
      engagementCount: true, url: true, title: true,
    },
  })

  // Aggregate by location
  const map: Record<string, any> = {}

  for (const link of links) {
    const code = level === 'PROVINCE' ? link.provinceCode : link.regencyCode
    const name = level === 'PROVINCE' ? link.provinceName : link.regencyName
    if (!code) continue

    if (!map[code]) {
      map[code] = {
        code,
        name: name || code,
        level,
        total: 0,
        POSITIVE: 0,
        NEUTRAL: 0,
        NEGATIVE: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        totalEngagement: 0,
        sampleLinks: [] as any[],
      }
    }

    map[code].total++
    map[code][link.sentiment] = (map[code][link.sentiment] || 0) + 1
    map[code][link.priority] = (map[code][link.priority] || 0) + 1
    map[code].totalEngagement += link.engagementCount || 0

    // Keep top 3 sample links per location
    if (map[code].sampleLinks.length < 3) {
      map[code].sampleLinks.push({
        url: link.url,
        title: link.title,
        platform: link.platform,
        sentiment: link.sentiment,
        priority: link.priority,
      })
    }
  }

  // Convert to array + add heat score (0-100)
  const result = Object.values(map).map((m: any) => ({
    ...m,
    heatScore: Math.min(100, m.NEGATIVE * 25 + m.HIGH * 30 + m.MEDIUM * 15 + Math.floor(m.totalEngagement / 100)),
    avgSentiment: m.total > 0 ? ((m.POSITIVE - m.NEGATIVE) / m.total) : 0,
  })).sort((a: any, b: any) => b.heatScore - a.heatScore)

  // Summary stats
  const summary = {
    totalLocations: result.length,
    totalLinks: links.length,
    totalPositive: links.filter(l => l.sentiment === 'POSITIVE').length,
    totalNeutral: links.filter(l => l.sentiment === 'NEUTRAL').length,
    totalNegative: links.filter(l => l.sentiment === 'NEGATIVE').length,
    totalHigh: links.filter(l => l.priority === 'HIGH').length,
    totalEngagement: links.reduce((sum, l) => sum + (l.engagementCount || 0), 0),
  }

  return NextResponse.json({
    success: true,
    data: {
      locations: result,
      summary,
      level,
    },
  })
}
