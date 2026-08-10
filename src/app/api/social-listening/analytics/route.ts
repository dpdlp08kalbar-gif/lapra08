// LAPRA 08 - API: Social Analytics (Reputation Index + Sentiment Aggregation)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// GET - Analytics dashboard with RBAC
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

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

  // Mention stats
  const mentions = await db.socialMention.findMany({ where, select: { sentiment: true, category: true, platform: true, publishedAt: true, isProcessed: true } })
  const total = mentions.length
  const positive = mentions.filter(m => m.sentiment === 'POSITIVE').length
  const negative = mentions.filter(m => m.sentiment === 'NEGATIVE').length
  const neutral = mentions.filter(m => m.sentiment === 'NEUTRAL').length
  const unprocessed = mentions.filter(m => !m.isProcessed).length

  // By platform
  const byPlatform: Record<string, number> = {}
  mentions.forEach(m => { byPlatform[m.platform] = (byPlatform[m.platform] || 0) + 1 })

  // By category
  const byCategory: Record<string, number> = {}
  mentions.forEach(m => { if (m.category) byCategory[m.category] = (byCategory[m.category] || 0) + 1 })

  // 7-day trend
  const now = new Date()
  const trend = []
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now); dayStart.setHours(0,0,0,0); dayStart.setDate(dayStart.getDate()-i)
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate()+1)
    const dayMentions = mentions.filter(m => m.publishedAt >= dayStart && m.publishedAt < dayEnd)
    trend.push({
      date: dayStart.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      total: dayMentions.length,
      positive: dayMentions.filter(m => m.sentiment === 'POSITIVE').length,
      negative: dayMentions.filter(m => m.sentiment === 'NEGATIVE').length,
      neutral: dayMentions.filter(m => m.sentiment === 'NEUTRAL').length,
    })
  }

  // Reputation Index (last 7 days)
  const repIndex = total > 0 ? Math.round(((positive + neutral * 0.5) / total) * 100) : 50
  const repTrend = trend.length >= 2 ? (trend[trend.length-1].positive - trend[0].positive > 0 ? 'UP' : trend[trend.length-1].positive < trend[0].positive ? 'DOWN' : 'STABLE') : 'STABLE'

  return NextResponse.json({
    success: true,
    data: {
      total,
      positive, negative, neutral, unprocessed,
      positivePct: total > 0 ? (positive/total*100).toFixed(1) : '0',
      negativePct: total > 0 ? (negative/total*100).toFixed(1) : '0',
      neutralPct: total > 0 ? (neutral/total*100).toFixed(1) : '0',
      byPlatform, byCategory, trend,
      reputationIndex: repIndex,
      reputationTrend: repTrend,
      scope: user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN' ? 'NATIONAL' : territory?.name,
    },
  })
}
