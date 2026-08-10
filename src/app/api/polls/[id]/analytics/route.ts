// LAPRA 08 - API: Poll Analytics
// GET /api/polls/[id]/analytics - Aggregate poll response analytics
//   - sentiment summary (POSITIVE/NEGATIVE/NEUTRAL/URGENT counts + %)
//   - demographic breakdown (ageGroup, gender, occupation, provinceCode, regencyCode)
//   - time series 24h (hourly bucket)
//   - alerts for >60% negative per regency (with >=10 total)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getUserFromRequest,
  getViewableTerritoryIds,
} from '@/lib/server-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const poll = await db.poll.findUnique({
      where: { id },
      include: {
        territory: true,
        _count: { select: { responses: true } },
      },
    })

    if (!poll) {
      return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })
    }

    // View scope check
    const viewScope = await getViewableTerritoryIds(user)
    if (!viewScope.isGlobalView && !viewScope.territoryIds.includes(poll.territoryId)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }

    // Pull all responses (polling analytics - typically bounded)
    const responses = await db.pollResponse.findMany({
      where: { pollId: id },
      select: {
        sentiment: true,
        ageGroup: true,
        gender: true,
        occupation: true,
        provinceCode: true,
        regencyCode: true,
        submittedAt: true,
      },
    })

    const total = responses.length

    // 1. Sentiment summary
    const sentimentCounts: Record<string, number> = {
      POSITIVE: 0,
      NEGATIVE: 0,
      NEUTRAL: 0,
      URGENT: 0,
    }
    for (const r of responses) {
      const key = (r.sentiment || 'NEUTRAL').toUpperCase()
      sentimentCounts[key] = (sentimentCounts[key] || 0) + 1
    }
    const sentimentSummary = Object.entries(sentimentCounts).map(([key, count]) => ({
      sentiment: key,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))

    // 2. Demographic breakdown
    const breakdownByAge: Record<string, number> = {}
    const breakdownByGender: Record<string, number> = {}
    const breakdownByOccupation: Record<string, number> = {}
    const breakdownByProvince: Record<string, number> = {}
    const breakdownByRegency: Record<string, number> = {}

    for (const r of responses) {
      if (r.ageGroup) breakdownByAge[r.ageGroup] = (breakdownByAge[r.ageGroup] || 0) + 1
      if (r.gender) breakdownByGender[r.gender] = (breakdownByGender[r.gender] || 0) + 1
      if (r.occupation) breakdownByOccupation[r.occupation] = (breakdownByOccupation[r.occupation] || 0) + 1
      if (r.provinceCode) breakdownByProvince[r.provinceCode] = (breakdownByProvince[r.provinceCode] || 0) + 1
      if (r.regencyCode) breakdownByRegency[r.regencyCode] = (breakdownByRegency[r.regencyCode] || 0) + 1
    }

    const toBreakdown = (map: Record<string, number>) =>
      Object.entries(map)
        .map(([key, count]) => ({
          label: key,
          count,
          percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.count - a.count)

    const demographicBreakdown = {
      ageGroup: toBreakdown(breakdownByAge),
      gender: toBreakdown(breakdownByGender),
      occupation: toBreakdown(breakdownByOccupation),
      provinceCode: toBreakdown(breakdownByProvince),
      regencyCode: toBreakdown(breakdownByRegency),
    }

    // 3. Time series (last 24 hours, hourly buckets)
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const timeSeriesBuckets: Array<{
      hour: string
      hourLabel: string
      total: number
      POSITIVE: number
      NEGATIVE: number
      NEUTRAL: number
      URGENT: number
    }> = []

    // Build 24 hourly buckets from oldest to newest
    for (let i = 23; i >= 0; i--) {
      const bucketStart = new Date(now.getTime() - i * 60 * 60 * 1000)
      const bucketEnd = new Date(bucketStart.getTime() + 60 * 60 * 1000)
      const hourLabel = `${String(bucketStart.getHours()).padStart(2, '0')}:00`
      const responsesInBucket = responses.filter((r) => {
        const t = r.submittedAt
        return t >= bucketStart && t < bucketEnd
      })
      type SentimentBucket = { POSITIVE: number; NEGATIVE: number; NEUTRAL: number; URGENT: number }
      const bucketSentiment: SentimentBucket = {
        POSITIVE: 0,
        NEGATIVE: 0,
        NEUTRAL: 0,
        URGENT: 0,
      }
      for (const r of responsesInBucket) {
        const key = (r.sentiment || 'NEUTRAL').toUpperCase() as keyof SentimentBucket
        bucketSentiment[key] = (bucketSentiment[key] || 0) + 1
      }
      timeSeriesBuckets.push({
        hour: bucketStart.toISOString(),
        hourLabel,
        total: responsesInBucket.length,
        POSITIVE: bucketSentiment.POSITIVE,
        NEGATIVE: bucketSentiment.NEGATIVE,
        NEUTRAL: bucketSentiment.NEUTRAL,
        URGENT: bucketSentiment.URGENT,
      })
    }

    // Only keep buckets after poll activation if possible
    const timeSeries = timeSeriesBuckets.filter((b) => new Date(b.hour) >= twentyFourHoursAgo)

    // 4. Alerts: per regencyCode, if negative > 60% AND total >= 10
    const alerts: Array<{
      type: string
      severity: string
      title: string
      message: string
      regencyCode: string
      total: number
      negativeCount: number
      negativePercentage: number
    }> = []

    const regencyGroups: Record<string, typeof responses> = {}
    for (const r of responses) {
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
      const negativePercentage = (negativeCount / regencyTotal) * 100
      if (negativePercentage > 60) {
        alerts.push({
          type: 'NEGATIVE_SENTIMENT_HOTSPOT',
          severity: 'HIGH',
          title: `Sentimen Negatif Tinggi di Kab/Kode ${regencyCode}`,
          message: `Deteksi ${negativePercentage.toFixed(1)}% sentimen NEGATIF (${negativeCount} dari ${regencyTotal} respons) di wilayah ${regencyCode}. Disarankan klarifikasi segera.`,
          regencyCode,
          total: regencyTotal,
          negativeCount,
          negativePercentage: Math.round(negativePercentage * 10) / 10,
        })
      }
    }

    // Sort alerts by severity descending
    alerts.sort((a, b) => b.negativePercentage - a.negativePercentage)

    // Build options info
    let optionsParsed: any[] = []
    try {
      optionsParsed = JSON.parse(poll.options)
    } catch {
      optionsParsed = []
    }

    return NextResponse.json({
      success: true,
      data: {
        poll: {
          id: poll.id,
          title: poll.title,
          question: poll.question,
          status: poll.status,
          closesAt: poll.closesAt,
          options: optionsParsed,
          territory: poll.territory,
          totalResponses: total,
        },
        sentimentSummary,
        demographicBreakdown,
        timeSeries,
        alerts,
      },
    })
  } catch (e: any) {
    console.error('[Poll Analytics Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
