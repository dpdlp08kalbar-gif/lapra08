// LAPRA 08 - API: Essay Polls Analytics (Aggregated)
// ============================================================
// GET /api/essay-polls/analytics
//   Agregasi data untuk SurveyOutputDashboard:
//   - Sentimen stats (POSITIVE/NEUTRAL/NEGATIVE) dari semua responses
//   - Word cloud (top keywords dari aiKeywords)
//   - Demografi (ageGroup, gender, occupation, topLocations)
//   - Channel split (ONLINE vs FIELD)
//   - AI summary aspirasi (top categories)
//
// Query params:
//   ?scope=medsos|online|lapangan|all (default: all)
//   ?territoryId=xxx (filter by territory — RBAC)
//
// RBAC:
//   - DPN/SUPERADMIN: global view
//   - DPD: provinsi sendiri + DPC di bawahnya
//   - DPC: kab/kota sendiri
//
// Performance:
//   - Aggregate di DB level (groupBy) — avoid loading all responses
//   - Cache 30 detik (same pattern dengan list endpoint)
//   - Invalidate saat ada response baru (PILAR 2)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getViewableTerritoryIds } from '@/lib/server-helpers'
import { invalidateEssayPollsCache } from '../route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cache 30 detik (mirip list endpoint)
const _analyticsCache = new Map<string, { ts: number; data: any }>()
const CACHE_TTL_MS = 30 * 1000

export function invalidateAnalyticsCache(): void {
  _analyticsCache.clear()
}

// Re-use invalidateEssayPollsCache hook (dipanggil dari responses POST)
// Tapi karena module terpisah, kita expose function sendiri
// dan panggil juga invalidateEssayPollsCache untuk konsistensi

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') || 'all' // medsos | online | lapangan | all

    // Cache key per user + scope
    const cacheKey = `${user.id}|${user.territoryId}|${scope}`
    const cached = _analyticsCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cached.data, cached: true })
    }

    // === RBAC: build where clause untuk poll filter ===
    const viewScope = await getViewableTerritoryIds(user)
    const pollWhere: any = {}
    if (!viewScope.isGlobalView) {
      // DPD/DPC: filter poll berdasarkan targetScope + territory
      const userTerr = await db.territory.findUnique({
        where: { id: user.territoryId },
        select: { code: true, level: true },
      })
      if (userTerr?.level === 'PROVINCE') {
        pollWhere.OR = [
          { targetScope: 'NATIONAL' },
          { targetScope: 'PROVINCE', provinceCode: userTerr.code },
        ]
      } else if (userTerr?.level === 'REGENCY') {
        pollWhere.OR = [
          { targetScope: 'NATIONAL' },
          { targetScope: 'PROVINCE', provinceCode: (await db.territory.findFirst({ where: { id: user.territoryId }, select: { parentId: true } }))?.parentId ? await (async () => {
            const t = await db.territory.findUnique({ where: { id: user.territoryId }, select: { parent: { select: { code: true } } } })
            return t?.parent?.code || ''
          })() : '' },
          { targetScope: 'REGENCY', regencyCode: userTerr.code },
        ]
      }
    }

    // Filter scope channel (ONLINE vs FIELD)
    // ONLINE = ipAddress tidak diawali 'FIELD:'
    // FIELD = ipAddress diawali 'FIELD:'
    let responseWhere: any = {}
    if (scope === 'online') {
      responseWhere.NOT = { ipAddress: { startsWith: 'FIELD:' } }
    } else if (scope === 'lapangan') {
      responseWhere.ipAddress = { startsWith: 'FIELD:' }
    }
    // scope='medsos' atau 'all' = semua channel

    // === Ambil pollIds yang visible ke user ===
    const visiblePolls = await db.essayPoll.findMany({
      where: pollWhere,
      select: { id: true, title: true, status: true, isAiGenerated: true, _count: { select: { responses: true } } },
    })
    const visiblePollIds = visiblePolls.map(p => p.id)

    if (visiblePollIds.length === 0) {
      const emptyData = {
        totalPolls: 0,
        activePolls: 0,
        aiGenerated: 0,
        totalResponses: 0,
        sentimentStats: { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0, UNPROCESSED: 0 },
        wordCloud: [],
        demography: { ageGroups: {}, genders: {}, occupations: {} },
        topLocations: [],
        channelSplit: { online: 0, field: 0 },
        aspirasiTop: [],
        polls: [],
      }
      _analyticsCache.set(cacheKey, { ts: Date.now(), data: emptyData })
      return NextResponse.json({ success: true, data: emptyData, cached: false })
    }

    responseWhere.pollId = { in: visiblePollIds }

    // === Parallel aggregate queries (DB-level, efficient) ===
    const [
      sentimentAgg,
      ageAgg,
      genderAgg,
      occupationAgg,
      locationAgg,
      channelAgg,
      keywordSample,
      categoryAgg,
      totalResponses,
    ] = await Promise.all([
      // 1. Sentimen stats (groupBy aiSentiment)
      db.essayResponse.groupBy({
        by: ['aiSentiment'],
        where: responseWhere,
        _count: true,
      }),

      // 2. Age group stats
      db.essayResponse.groupBy({
        by: ['ageGroup'],
        where: { ...responseWhere, NOT: { ageGroup: null } },
        _count: true,
      }),

      // 3. Gender stats
      db.essayResponse.groupBy({
        by: ['gender'],
        where: { ...responseWhere, NOT: { gender: null } },
        _count: true,
      }),

      // 4. Occupation stats
      db.essayResponse.groupBy({
        by: ['occupation'],
        where: { ...responseWhere, NOT: { occupation: null } },
        _count: true,
      }),

      // 5. Top locations (groupBy regencyCode + provinceCode)
      db.essayResponse.groupBy({
        by: ['regencyCode', 'provinceCode'],
        where: { ...responseWhere, NOT: { regencyCode: null } },
        _count: true,
        orderBy: { _count: { regencyCode: 'desc' } },
        take: 10,
      }),

      // 6. Channel split (ONLINE vs FIELD)
      db.essayResponse.groupBy({
        by: ['ipAddress'],
        where: responseWhere,
        _count: true,
      }),

      // 7. Sample responses untuk extract keywords (ambil 100 terbaru)
      db.essayResponse.findMany({
        where: { ...responseWhere, NOT: { aiKeywords: null } },
        select: { aiKeywords: true },
        orderBy: { submittedAt: 'desc' },
        take: 100,
      }),

      // 8. Category stats (untuk aspirasi top)
      db.essayResponse.groupBy({
        by: ['aiCategory'],
        where: { ...responseWhere, NOT: { aiCategory: null } },
        _count: true,
        orderBy: { _count: { aiCategory: 'desc' } },
        take: 5,
      }),

      // 9. Total responses count
      db.essayResponse.count({ where: responseWhere }),
    ])

    // === Format sentiment stats ===
    const sentimentStats: any = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0, UNPROCESSED: 0 }
    for (const s of sentimentAgg) {
      if (s.aiSentiment) {
        sentimentStats[s.aiSentiment] = s._count
      } else {
        sentimentStats.UNPROCESSED += s._count
      }
    }

    // === Format demography ===
    const demography = {
      ageGroups: ageAgg.reduce((acc, a) => ({ ...acc, [a.ageGroup || 'unknown']: a._count }), {}),
      genders: genderAgg.reduce((acc, g) => ({ ...acc, [g.gender || 'unknown']: g._count }), {}),
      occupations: occupationAgg.reduce((acc, o) => ({ ...acc, [o.occupation || 'unknown']: o._count }), {}),
    }

    // === Format top locations ===
    // Untuk setiap location code, lookup nama wilayah
    const locationCodes = locationAgg
      .map(l => l.regencyCode)
      .filter((c): c is string => c !== null && c !== undefined)
    const territories = locationCodes.length > 0
      ? await db.territory.findMany({
          where: { code: { in: locationCodes }, level: 'REGENCY' },
          select: {
            code: true,
            name: true,
            parent: { select: { name: true } },
          },
        })
      : []
    const terrMap = new Map(territories.map(t => [t.code, t]))
    const topLocations = locationAgg.map(l => {
      const terr = l.regencyCode ? terrMap.get(l.regencyCode) : undefined
      return {
        regencyCode: l.regencyCode,
        regencyName: terr?.name || l.regencyCode,
        provinceName: terr?.parent?.name || l.provinceCode,
        count: l._count,
      }
    })

    // === Format channel split ===
    let onlineCount = 0
    let fieldCount = 0
    for (const c of channelAgg) {
      if (c.ipAddress?.startsWith('FIELD:')) {
        fieldCount += c._count
      } else {
        onlineCount += c._count
      }
    }

    // === Format word cloud (aggregate keywords) ===
    const keywordCounts = new Map<string, number>()
    for (const sample of keywordSample) {
      try {
        const parsed = JSON.parse(sample.aiKeywords || '{}')
        const keywords: string[] = parsed.keywords || []
        for (const kw of keywords) {
          const normalized = kw.trim().toLowerCase()
          if (normalized.length >= 3) {
            keywordCounts.set(normalized, (keywordCounts.get(normalized) || 0) + 1)
          }
        }
      } catch {}
    }
    const wordCloud = Array.from(keywordCounts.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30)

    // === Format aspirasi top (categories) ===
    const aspirasiTop = categoryAgg.map(c => ({
      category: c.aiCategory,
      count: c._count,
    }))

    // === Format polls list (untuk feed viral display) ===
    const pollsList = visiblePolls
      .filter(p => p._count.responses > 0)
      .sort((a, b) => b._count.responses - a._count.responses)
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        title: p.title,
        responseCount: p._count.responses,
        isAiGenerated: p.isAiGenerated,
        status: p.status,
      }))

    const data = {
      totalPolls: visiblePolls.length,
      activePolls: visiblePolls.filter(p => p.status === 'ACTIVE').length,
      aiGenerated: visiblePolls.filter(p => p.isAiGenerated).length,
      totalResponses,
      sentimentStats,
      wordCloud,
      demography,
      topLocations,
      channelSplit: { online: onlineCount, field: fieldCount },
      aspirasiTop,
      polls: pollsList,
    }

    _analyticsCache.set(cacheKey, { ts: Date.now(), data })

    return NextResponse.json({
      success: true,
      data,
      cached: false,
    })
  } catch (e: any) {
    console.error('[Analytics GET] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
