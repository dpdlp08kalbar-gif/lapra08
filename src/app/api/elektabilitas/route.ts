// LAPRA 08 - API: Analisis Elektabilitas Prabowo (100% rule-based, no LLM)
// ============================================================
// GET /api/elektabilitas?period=30d
//
// Sumber: gabung Announcement (Pusat Media) + PublicOpinionLink (Monitoring Berita)
// Analisis keyword-based: filter Prabowo + sentiment
// Output: score 0-100 + trend + top wilayah + tabel detail
// Vercel Free compliant: no LLM, no API berbayar
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, logAccess } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRABOWO_KW = ['prabowo', 'presiden prabowo', 'prabowo subianto', 'astacita', 'asta cita',
                   'kabinet merah putih', 'prabowo gibran', 'mbg', 'makan bergizi',
                   'lapra 08', 'lapra08', 'laskar prabowo 08', 'laskar prabowo', 'relawan prabowo']
const POSITIVE_KW = ['apresiasi', 'puji', 'dukung', 'setuju', 'bagus', 'baik', 'hebat',
                     'sukses', 'berhasil', 'kompak', 'sambut', 'restu']
const NEGATIVE_KW = ['kritik', 'kecewa', 'tolak', 'gagal', 'buruk', 'protes', 'demo',
                     'korupsi', 'skandal', 'tersangka', 'konflik', 'mundur']

function sentiment(text: string): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
  const lower = (text || '').toLowerCase()
  const pos = POSITIVE_KW.some(kw => lower.includes(kw))
  const neg = NEGATIVE_KW.some(kw => lower.includes(kw))
  if (pos && !neg) return 'POSITIVE'
  if (neg && !pos) return 'NEGATIVE'
  return 'NEUTRAL'
}

function isPrabowo(text: string): boolean {
  const lower = (text || '').toLowerCase()
  return PRABOWO_KW.some(kw => lower.includes(kw))
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'
    const days = parseInt(period.replace('d', '')) || 30
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Fetch dari Pusat Media (Announcement)
    const announcements = await db.announcement.findMany({
      where: { OR: [{ publishDate: { gte: since } }, { publishDate: null, createdAt: { gte: since } }] },
      select: { id: true, title: true, content: true, publishDate: true, createdAt: true, sourceName: true, sourceUrl: true },
      orderBy: { createdAt: 'desc' }, take: 500,
    })

    // Fetch dari Monitoring Berita (PublicOpinionLink)
    const opinionLinks = await db.publicOpinionLink.findMany({
      where: { OR: [{ publishedAt: { gte: since } }, { publishedAt: null, createdAt: { gte: since } }] },
      select: { id: true, url: true, platform: true, title: true, content: true,
                publishedAt: true, createdAt: true, engagementCount: true,
                provinceName: true, sentiment: true },
      orderBy: { createdAt: 'desc' }, take: 500,
    })

    // Analisis: filter Prabowo + sentiment untuk Announcement
    const allItems: any[] = []
    for (const a of announcements) {
      const text = `${a.title} ${a.content || ''}`
      if (!isPrabowo(text)) continue
      allItems.push({
        id: a.id, title: a.title, date: a.publishDate || a.createdAt,
        sourceType: 'PUSAT_MEDIA', sourceName: a.sourceName || 'Pusat Media',
        url: a.sourceUrl, sentiment: sentiment(text), engagement: 0, provinceName: null, platform: null,
      })
    }
    for (const o of opinionLinks) {
      const text = `${o.title} ${o.content || ''}`
      if (!isPrabowo(text)) continue
      allItems.push({
        id: o.id, title: o.title, date: o.publishedAt || o.createdAt,
        sourceType: 'MONITORING_BERITA', sourceName: o.platform,
        url: o.url, sentiment: o.sentiment as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE',
        engagement: o.engagementCount || 0, provinceName: o.provinceName, platform: o.platform,
      })
    }

    // Trend per hari
    const trendMap = new Map<string, any>()
    allItems.forEach(item => {
      const d = new Date(item.date).toISOString().slice(0, 10)
      const e = trendMap.get(d) || { date: d, positive: 0, neutral: 0, negative: 0, total: 0 }
      e.total++; if (item.sentiment === 'POSITIVE') e.positive++
      else if (item.sentiment === 'NEGATIVE') e.negative++; else e.neutral++
      trendMap.set(d, e)
    })
    const trend = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    // Summary
    const totalPositive = allItems.filter(i => i.sentiment === 'POSITIVE').length
    const totalNegative = allItems.filter(i => i.sentiment === 'NEGATIVE').length
    const totalItems = allItems.length
    const elektabilitasScore = totalItems > 0
      ? Math.round(((totalPositive - totalNegative) / totalItems) * 50 + 50)
      : 50

    // Top wilayah
    const provMap = new Map<string, any>()
    allItems.forEach(i => {
      if (!i.provinceName) return
      const e = provMap.get(i.provinceName) || { province: i.provinceName, positive: 0, neutral: 0, negative: 0, total: 0 }
      e.total++; if (i.sentiment === 'POSITIVE') e.positive++
      else if (i.sentiment === 'NEGATIVE') e.negative++; else e.neutral++
      provMap.set(i.provinceName, e)
    })
    const topWilayah = Array.from(provMap.values()).sort((a, b) => b.total - a.total).slice(0, 10)

    // Top sources
    const srcMap = new Map<string, any>()
    allItems.forEach(i => {
      const s = i.sourceName || 'Unknown'
      const e = srcMap.get(s) || { source: s, positive: 0, neutral: 0, negative: 0, total: 0 }
      e.total++; if (i.sentiment === 'POSITIVE') e.positive++
      else if (i.sentiment === 'NEGATIVE') e.negative++; else e.neutral++
      srcMap.set(s, e)
    })
    const topSources = Array.from(srcMap.values()).sort((a, b) => b.total - a.total).slice(0, 10)

    // Detail 50 terbaru
    const detail = [...allItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50)

    await logAccess({
      actor: user, action: 'VIEW', resource: 'SYSTEM_SETTING', resourceId: 'elektabilitas',
      resourceLabel: `Elektabilitas ${period}`, request, detail: `${totalItems} items`,
    })

    return NextResponse.json({
      success: true,
      data: {
        period, since: since.toISOString(),
        summary: {
          totalItems, totalPositive, totalNeutral: totalItems - totalPositive - totalNegative, totalNegative,
          elektabilitasScore,
          sourcePusatMedia: allItems.filter(i => i.sourceType === 'PUSAT_MEDIA').length,
          sourceMonitoringBerita: allItems.filter(i => i.sourceType === 'MONITORING_BERITA').length,
        },
        trend, topWilayah, topSources, detail,
      },
    })
  } catch (e: any) {
    console.error('[Elektabilitas] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
