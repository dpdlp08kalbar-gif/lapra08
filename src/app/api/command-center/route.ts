// LAPRA 08 - API: Command Center Dashboard
// GET /api/command-center - Aggregate overview for LAPRA 08 Command Center
//   - sentiment summary + 7-day trend (across all polls)
//   - crisis summary (active/critical/resolved counts, by severity)
//   - aspirasi summary (total, NEW, URGENT, by status, by priority)
//   - voter count (total VoterContact)
//   - alerts engine:
//       * per ACTIVE poll: group responses by regencyCode, if negative >60% AND total >=10 → alert
//       * CRITICAL crisis zones → alert
//       * URGENT aspirations → alert
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getUserFromRequest,
  getViewableTerritoryIds,
  isDPNLevel,
} from '@/lib/server-helpers'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // View scope - filters for territory-linked models (Polls, CrisisZones, VoterContacts)
    const viewScope = await getViewableTerritoryIds(user)
    const territoryWhere = viewScope.isGlobalView
      ? {}
      : { territoryId: { in: viewScope.territoryIds } }

    // ===== 1. POLLS & POLL RESPONSES =====
    const activePolls = await db.poll.findMany({
      where: { ...territoryWhere, status: 'ACTIVE' },
      include: {
        territory: true,
        _count: { select: { responses: true } },
      },
    })

    // All poll responses within scope (for sentiment summary + 7-day trend)
    const scopedPollIds = (
      await db.poll.findMany({
        where: territoryWhere,
        select: { id: true },
      })
    ).map((p) => p.id)

    const allResponses = scopedPollIds.length
      ? await db.pollResponse.findMany({
          where: { pollId: { in: scopedPollIds } },
          select: {
            sentiment: true,
            submittedAt: true,
            pollId: true,
            regencyCode: true,
          },
        })
      : []

    const totalResponses = allResponses.length

    // Sentiment summary
    const sentimentCounts: Record<string, number> = {
      POSITIVE: 0,
      NEGATIVE: 0,
      NEUTRAL: 0,
      URGENT: 0,
    }
    for (const r of allResponses) {
      const key = (r.sentiment || 'NEUTRAL').toUpperCase()
      sentimentCounts[key] = (sentimentCounts[key] || 0) + 1
    }
    const sentimentSummary = Object.entries(sentimentCounts).map(([key, count]) => ({
      sentiment: key,
      count,
      percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 1000) / 10 : 0,
    }))

    // 7-day trend (daily buckets)
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const trend: Array<{
      date: string
      dateLabel: string
      total: number
      POSITIVE: number
      NEGATIVE: number
      NEUTRAL: number
      URGENT: number
    }> = []

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now)
      dayStart.setHours(0, 0, 0, 0)
      dayStart.setDate(dayStart.getDate() - i)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const dayResponses = allResponses.filter((r) => {
        return r.submittedAt >= dayStart && r.submittedAt < dayEnd
      })
      type SentimentBucket = { POSITIVE: number; NEGATIVE: number; NEUTRAL: number; URGENT: number }
      const bucketSentiment: SentimentBucket = {
        POSITIVE: 0,
        NEGATIVE: 0,
        NEUTRAL: 0,
        URGENT: 0,
      }
      for (const r of dayResponses) {
        const key = (r.sentiment || 'NEUTRAL').toUpperCase() as keyof SentimentBucket
        bucketSentiment[key] = (bucketSentiment[key] || 0) + 1
      }
      const dateLabel = dayStart.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
      })
      trend.push({
        date: dayStart.toISOString(),
        dateLabel,
        total: dayResponses.length,
        POSITIVE: bucketSentiment.POSITIVE,
        NEGATIVE: bucketSentiment.NEGATIVE,
        NEUTRAL: bucketSentiment.NEUTRAL,
        URGENT: bucketSentiment.URGENT,
      })
    }

    // ===== 2. CRISIS ZONES =====
    const allCrisisZones = await db.crisisZone.findMany({
      where: territoryWhere,
      select: {
        id: true,
        title: true,
        status: true,
        severity: true,
        issueCategory: true,
        territoryId: true,
        createdAt: true,
        resolvedAt: true,
        broadcastSentAt: true,
      },
    })

    const crisisSummary = {
      total: allCrisisZones.length,
      active: allCrisisZones.filter((c) => c.status === 'ACTIVE').length,
      resolved: allCrisisZones.filter((c) => c.status === 'RESOLVED').length,
      critical: allCrisisZones.filter((c) => c.severity === 'CRITICAL' && c.status === 'ACTIVE')
        .length,
      high: allCrisisZones.filter((c) => c.severity === 'HIGH' && c.status === 'ACTIVE').length,
      medium: allCrisisZones.filter((c) => c.severity === 'MEDIUM' && c.status === 'ACTIVE')
        .length,
      low: allCrisisZones.filter((c) => c.severity === 'LOW' && c.status === 'ACTIVE').length,
      broadcastSent: allCrisisZones.filter((c) => c.broadcastSentAt !== null).length,
      bySeverity: {
        CRITICAL: allCrisisZones.filter((c) => c.severity === 'CRITICAL').length,
        HIGH: allCrisisZones.filter((c) => c.severity === 'HIGH').length,
        MEDIUM: allCrisisZones.filter((c) => c.severity === 'MEDIUM').length,
        LOW: allCrisisZones.filter((c) => c.severity === 'LOW').length,
      },
    }

    // ===== 3. ASPIRATIONS =====
    // Aspirations don't have territoryId; scope by province/regency code if non-DPN
    const aspirationWhere: any = {}
    if (!isDPNLevel(user.role)) {
      const userCode = user.territory?.code
      if (user.role === 'ADMIN_DPD' && user.territory?.level === 'PROVINCE') {
        aspirationWhere.provinceCode = userCode
      } else if (user.role === 'ADMIN_DPC' && user.territory?.level === 'REGENCY') {
        aspirationWhere.regencyCode = userCode
      } else if (userCode) {
        aspirationWhere.OR = [{ provinceCode: userCode }, { regencyCode: userCode }]
      }
    }

    const allAspirations = await db.aspiration.findMany({
      where: aspirationWhere,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        category: true,
        sentiment: true,
        provinceCode: true,
        regencyCode: true,
        submittedAt: true,
      },
    })

    const aspirasiSummary = {
      total: allAspirations.length,
      new: allAspirations.filter((a) => a.status === 'NEW').length,
      reviewing: allAspirations.filter((a) => a.status === 'REVIEWING').length,
      addressed: allAspirations.filter((a) => a.status === 'ADDRESSED').length,
      resolved: allAspirations.filter((a) => a.status === 'RESOLVED').length,
      urgent: allAspirations.filter((a) => a.priority === 'URGENT').length,
      high: allAspirations.filter((a) => a.priority === 'HIGH').length,
      normal: allAspirations.filter((a) => a.priority === 'NORMAL').length,
      low: allAspirations.filter((a) => a.priority === 'LOW').length,
      bySentiment: {
        POSITIVE: allAspirations.filter((a) => a.sentiment === 'POSITIVE').length,
        NEGATIVE: allAspirations.filter((a) => a.sentiment === 'NEGATIVE').length,
        NEUTRAL: allAspirations.filter((a) => a.sentiment === 'NEUTRAL').length,
        URGENT: allAspirations.filter((a) => a.sentiment === 'URGENT').length,
      },
    }

    // ===== 4. VOTER COUNT =====
    const voterCount = await db.voterContact.count({
      where: { ...territoryWhere, isActive: true },
    })

    const voterCountByProvinceRaw = await db.voterContact.groupBy({
      by: ['provinceCode'],
      where: { ...territoryWhere, isActive: true },
      _count: { provinceCode: true },
    })
    const voterCountByProvince = voterCountByProvinceRaw
      .sort((a, b) => b._count.provinceCode - a._count.provinceCode)
      .slice(0, 10)

    // ===== 5. ALERTS ENGINE =====
    const alerts: Array<{
      type: string
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      title: string
      message: string
      source: 'POLL' | 'CRISIS' | 'ASPIRATION'
      sourceId?: string
      metadata?: any
    }> = []

    // 5a. Per-poll negative sentiment hotspot by regency (>60% neg & >=10 total)
    for (const poll of activePolls) {
      const pollResponses = allResponses.filter((r) => r.pollId === poll.id)
      const regencyGroups: Record<string, typeof pollResponses> = {}
      for (const r of pollResponses) {
        const key = r.regencyCode || 'UNKNOWN'
        if (!regencyGroups[key]) regencyGroups[key] = []
        regencyGroups[key].push(r)
      }
      for (const [regencyCode, regencyResponses] of Object.entries(regencyGroups)) {
        const regencyTotal = regencyResponses.length
        if (regencyTotal < 10) continue
        const negativeCount = regencyResponses.filter(
          (r) => (r.sentiment || '').toUpperCase() === 'NEGATIVE'
        ).length
        const negativePct = (negativeCount / regencyTotal) * 100
        if (negativePct > 60) {
          alerts.push({
            type: 'POLL_NEGATIVE_HOTSPOT',
            severity: 'HIGH',
            title: `Sentimen Negatif Tinggi - ${poll.title}`,
            message: `${negativePct.toFixed(1)}% sentimen NEGATIF (${negativeCount}/${regencyTotal}) di kabupaten kode ${regencyCode}. Segera lakukan klarifikasi.`,
            source: 'POLL',
            sourceId: poll.id,
            metadata: {
              pollId: poll.id,
              pollTitle: poll.title,
              regencyCode,
              total: regencyTotal,
              negativeCount,
              negativePercentage: Math.round(negativePct * 10) / 10,
            },
          })
        }
      }
    }

    // 5b. CRITICAL crisis zones
    const criticalCrisisZones = allCrisisZones.filter(
      (c) => c.severity === 'CRITICAL' && c.status === 'ACTIVE'
    )
    for (const cz of criticalCrisisZones) {
      alerts.push({
        type: 'CRISIS_CRITICAL',
        severity: 'CRITICAL',
        title: `Crisis Zone KRITIS: ${cz.title}`,
        message: `Crisis zone "${cz.title}" memiliki severity CRITICAL dan masih ACTIVE. Wajib klarifikasi segera.`,
        source: 'CRISIS',
        sourceId: cz.id,
        metadata: {
          crisisZoneId: cz.id,
          title: cz.title,
          severity: cz.severity,
          issueCategory: cz.issueCategory,
        },
      })
    }

    // 5c. URGENT aspirations
    const urgentAspirations = allAspirations.filter(
      (a) => a.priority === 'URGENT' && (a.status === 'NEW' || a.status === 'REVIEWING')
    )
    for (const a of urgentAspirations) {
      alerts.push({
        type: 'ASPIRATION_URGENT',
        severity: 'HIGH',
        title: `Aspirasi URGENT: ${a.title}`,
        message: `Aspirasi berprioritas URGENT: "${a.title}" (kategori ${a.category}). Perlu tindak lanjut segera.`,
        source: 'ASPIRATION',
        sourceId: a.id,
        metadata: {
          aspirationId: a.id,
          title: a.title,
          category: a.category,
          sentiment: a.sentiment,
          provinceCode: a.provinceCode,
          regencyCode: a.regencyCode,
        },
      })
    }

    // Sort alerts by severity: CRITICAL → HIGH → MEDIUM → LOW
    const severityRank: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    }
    alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])

    // ===== COMPOSE FINAL RESPONSE =====
    return NextResponse.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        scope: {
          isGlobalView: viewScope.isGlobalView,
          primaryTerritoryId: viewScope.primaryTerritoryId,
          territoryName: user.territory?.name || null,
        },
        sentiment: {
          totalResponses,
          summary: sentimentSummary,
          trend7Days: trend,
        },
        polls: {
          active: activePolls.length,
          activePolls: activePolls.map((p) => ({
            id: p.id,
            title: p.title,
            responseCount: p._count.responses,
            territoryName: p.territory?.name || null,
            closesAt: p.closesAt,
          })),
        },
        crisis: crisisSummary,
        aspirasi: aspirasiSummary,
        voters: {
          total: voterCount,
          topProvinces: voterCountByProvince.map((v) => ({
            provinceCode: v.provinceCode || 'UNKNOWN',
            count: v._count,
          })),
        },
        alerts: {
          total: alerts.length,
          critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
          high: alerts.filter((a) => a.severity === 'HIGH').length,
          items: alerts,
        },
      },
    })
  } catch (e: any) {
    console.error('[Command Center Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
