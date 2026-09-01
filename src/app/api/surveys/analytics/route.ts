// LAPRA 08 - API: Survey Analytics (Fase 4 — Cross-tab + Tren + Zonasi)
// ============================================================
// GET /api/surveys/analytics
// Agregasi data untuk dashboard analitik:
// 1. Sentimen trend (harian, 30 hari terakhir)
// 2. Cross-tabulation (demografi vs sentimen)
// 3. Zonasi wilayah (Hijau/Kuning/Merah berdasarkan sentimen)
// 4. Summary stats (total response, sentimen breakdown)
//
// Vercel Free: DB-level aggregate (groupBy), cache 30s, no heavy compute
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const _cache = new Map<string, { ts: number; data: any }>()
const CACHE_TTL = 30 * 1000

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const cacheKey = user.id
    const cached = _cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cached.data, cached: true })
    }

    // === 1. Sentimen Trend (harian, 30 hari) ===
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const dailySentiment = await db.essayResponse.findMany({
      where: { submittedAt: { gt: thirtyDaysAgo } },
      select: { aiSentiment: true, submittedAt: true },
      orderBy: { submittedAt: 'asc' },
      take: 500,
    })

    // Group by day
    const trendMap: Record<string, { date: string; positive: number; neutral: number; negative: number }> = {}
    for (const r of dailySentiment) {
      const day = r.submittedAt.toISOString().slice(0, 10)
      if (!trendMap[day]) trendMap[day] = { date: day, positive: 0, neutral: 0, negative: 0 }
      if (r.aiSentiment === 'POSITIVE') trendMap[day].positive++
      else if (r.aiSentiment === 'NEGATIVE') trendMap[day].negative++
      else trendMap[day].neutral++
    }
    const sentimenTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date))

    // === 2. Cross-tabulation (demografi vs sentimen) ===
    const allResponses = await db.essayResponse.findMany({
      select: {
        aiSentiment: true, ageGroup: true, gender: true, occupation: true, provinceCode: true,
      },
      take: 1000,
    })

    // Age group cross-tab
    const ageCrossTab: Record<string, { positive: number; neutral: number; negative: number }> = {}
    const genderCrossTab: Record<string, { positive: number; neutral: number; negative: number }> = {}
    const occupationCrossTab: Record<string, { positive: number; neutral: number; negative: number }> = {}

    for (const r of allResponses) {
      const s = r.aiSentiment || 'NEUTRAL'
      const sentKey = s.toLowerCase() as 'positive' | 'neutral' | 'negative'

      if (r.ageGroup) {
        if (!ageCrossTab[r.ageGroup]) ageCrossTab[r.ageGroup] = { positive: 0, neutral: 0, negative: 0 }
        ageCrossTab[r.ageGroup][sentKey]++
      }
      if (r.gender) {
        if (!genderCrossTab[r.gender]) genderCrossTab[r.gender] = { positive: 0, neutral: 0, negative: 0 }
        genderCrossTab[r.gender][sentKey]++
      }
      if (r.occupation) {
        if (!occupationCrossTab[r.occupation]) occupationCrossTab[r.occupation] = { positive: 0, neutral: 0, negative: 0 }
        occupationCrossTab[r.occupation][sentKey]++
      }
    }

    // === 3. Zonasi Wilayah (Hijau/Kuning/Merah) ===
    const provinceStats: Record<string, { positive: number; neutral: number; negative: number; total: number }> = {}
    for (const r of allResponses) {
      const prov = r.provinceCode || 'UNKNOWN'
      if (!provinceStats[prov]) provinceStats[prov] = { positive: 0, neutral: 0, negative: 0, total: 0 }
      provinceStats[prov].total++
      if (r.aiSentiment === 'POSITIVE') provinceStats[prov].positive++
      else if (r.aiSentiment === 'NEGATIVE') provinceStats[prov].negative++
      else provinceStats[prov].neutral++
    }

    // Lookup province names
    const provCodes = Object.keys(provinceStats).filter(c => c !== 'UNKNOWN')
    const territories = provCodes.length > 0
      ? await db.territory.findMany({ where: { code: { in: provCodes }, level: 'PROVINCE' }, select: { code: true, name: true } })
      : []
    const terrMap = new Map(territories.map(t => [t.code, t.name]))

    // Calculate zonasi
    const zonasi = Object.entries(provinceStats).map(([code, stats]) => {
      const posRate = stats.total > 0 ? (stats.positive / stats.total) * 100 : 0
      const negRate = stats.total > 0 ? (stats.negative / stats.total) * 100 : 0
      let zone = 'KUNING'
      let zoneColor = 'amber'
      let zoneIcon = '🟡'
      if (posRate >= 60) { zone = 'HIJAU'; zoneColor = 'emerald'; zoneIcon = '🟢' }
      else if (negRate >= 40) { zone = 'MERAH'; zoneColor = 'red'; zoneIcon = '🔴' }
      return {
        code,
        name: terrMap.get(code) || code,
        ...stats,
        posRate: Math.round(posRate),
        negRate: Math.round(negRate),
        zone, zoneColor, zoneIcon,
      }
    }).sort((a, b) => b.total - a.total)

    // === 4. Summary Stats ===
    const totalResponses = allResponses.length
    const summary = {
      totalResponses,
      positive: allResponses.filter(r => r.aiSentiment === 'POSITIVE').length,
      neutral: allResponses.filter(r => r.aiSentiment === 'NEUTRAL').length,
      negative: allResponses.filter(r => r.aiSentiment === 'NEGATIVE').length,
      totalProvinces: zonasi.filter(z => z.code !== 'UNKNOWN').length,
      greenZones: zonasi.filter(z => z.zone === 'HIJAU').length,
      yellowZones: zonasi.filter(z => z.zone === 'KUNING').length,
      redZones: zonasi.filter(z => z.zone === 'MERAH').length,
    }

    const data = {
      summary,
      sentimenTrend,
      crossTab: {
        ageGroup: ageCrossTab,
        gender: genderCrossTab,
        occupation: occupationCrossTab,
      },
      zonasi,
    }

    _cache.set(cacheKey, { ts: Date.now(), data })

    return NextResponse.json({ success: true, data, cached: false })
  } catch (e: any) {
    console.error('[Analytics GET] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
