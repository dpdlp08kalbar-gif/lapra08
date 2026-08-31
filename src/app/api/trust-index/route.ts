// LAPRA 08 - API: Trust Index Calculator
// POST /api/trust-index - Recompute trust index untuk semua wilayah × demografi
// GET /api/trust-index - Get trust index untuk semua provinsi (overview)
//
// Trust Index formula:
//   trustScore = 50 + (positive - negative) / max(1, total) * 50
//   0 = sangat tidak percaya, 100 = sangat percaya
//   confidence = min(100, sampleSize * 10) (semakin banyak data, semakin yakin)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// GET - list trust index untuk semua provinsi (overview heatmap)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const ageGroup = searchParams.get('ageGroup') // '' = ALL
  const communitySegment = searchParams.get('segment') // '' = ALL

  // Build filter — when ageGroup/segment params are provided (even empty string), filter by exact match
  // When not provided at all, return all indices
  const where: any = {}
  if (ageGroup !== null) where.ageGroup = ageGroup
  if (communitySegment !== null) where.communitySegment = communitySegment

  // Get all trust indices untuk filter dimensi
  const indices = await db.trustIndex.findMany({
    where,
    orderBy: { trustScore: 'desc' },
  })

  return NextResponse.json({
    success: true,
    data: indices,
    filter: { ageGroup: ageGroup || 'ALL', communitySegment: communitySegment || 'ALL' },
  })
}

// POST - Recompute trust index untuk semua wilayah
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    // Hanya SUPERADMIN/ADMIN_DPN yang bisa recompute
    if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
      return NextResponse.json({ success: false, error: 'Hanya DPN/Superadmin yang bisa recompute trust index' }, { status: 403 })
    }

    const t0 = Date.now()
    let totalComputed = 0
    let totalRecords = 0

    // Step 1: Get all opinion links
    const allLinks = await db.publicOpinionLink.findMany({
      select: {
        id: true, provinceCode: true, regencyCode: true,
        sentiment: true, priority: true, engagementCount: true, createdAt: true,
      },
    })

    // Step 2: For each territory code yang ada di opinion links, compute trust index
    // Aggregate by territory (provinceCode + regencyCode)
    const territoryAggregates: Record<string, any> = {}

    // Add NATIONAL level
    territoryAggregates['ID'] = { code: 'ID', level: 'NATIONAL', positives: 0, negatives: 0, neutrals: 0, totalMentions: 0, totalEngagement: 0 }

    for (const link of allLinks) {
      // NATIONAL aggregate
      territoryAggregates['ID'].totalMentions++
      territoryAggregates['ID'].totalEngagement += link.engagementCount || 0
      if (link.sentiment === 'POSITIVE') territoryAggregates['ID'].positives++
      else if (link.sentiment === 'NEGATIVE') territoryAggregates['ID'].negatives++
      else territoryAggregates['ID'].neutrals++

      // PROVINCE aggregate
      if (link.provinceCode) {
        if (!territoryAggregates[link.provinceCode]) {
          territoryAggregates[link.provinceCode] = { code: link.provinceCode, level: 'PROVINCE', positives: 0, negatives: 0, neutrals: 0, totalMentions: 0, totalEngagement: 0 }
        }
        territoryAggregates[link.provinceCode].totalMentions++
        territoryAggregates[link.provinceCode].totalEngagement += link.engagementCount || 0
        if (link.sentiment === 'POSITIVE') territoryAggregates[link.provinceCode].positives++
        else if (link.sentiment === 'NEGATIVE') territoryAggregates[link.provinceCode].negatives++
        else territoryAggregates[link.provinceCode].neutrals++
      }

      // REGENCY aggregate
      if (link.regencyCode) {
        if (!territoryAggregates[link.regencyCode]) {
          territoryAggregates[link.regencyCode] = { code: link.regencyCode, level: 'REGENCY', positives: 0, negatives: 0, neutrals: 0, totalMentions: 0, totalEngagement: 0 }
        }
        territoryAggregates[link.regencyCode].totalMentions++
        territoryAggregates[link.regencyCode].totalEngagement += link.engagementCount || 0
        if (link.sentiment === 'POSITIVE') territoryAggregates[link.regencyCode].positives++
        else if (link.sentiment === 'NEGATIVE') territoryAggregates[link.regencyCode].negatives++
        else territoryAggregates[link.regencyCode].neutrals++
      }
    }

    // Step 3: Compute & upsert trust index untuk each territory
    const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 hari terakhir
    const periodEnd = new Date()

    for (const [code, agg] of Object.entries(territoryAggregates)) {
      const total = agg.totalMentions || 1
      // Trust formula lebih halus:
      // - Default: 50 (netral)
      // - Setiap positive: +5 (capped 100)
      // - Setiap negative: -5 (floor 0)
      // - Confidence weighted: jika sample kecil, skor condong ke 50 (netral)
      const rawScore = 50 + (agg.positives * 5) - (agg.negatives * 5)
      const confidence = Math.min(100, total * 10) / 100 // 0-1
      // Smooth toward neutral based on confidence gap
      const trustScore = rawScore + (50 - rawScore) * (1 - confidence) * 0.5
      const trendDirection = trustScore > 55 ? 'UP' : trustScore < 45 ? 'DOWN' : 'STABLE'

      await db.trustIndex.upsert({
        where: { territoryCode_ageGroup_communitySegment: { territoryCode: code, ageGroup: '', communitySegment: '' } },
        create: {
          territoryCode: code,
          level: agg.level,
          ageGroup: '',
          communitySegment: '',
          trustScore: Math.max(0, Math.min(100, Math.round(trustScore * 10) / 10)),
          sentimentPositive: agg.positives,
          sentimentNegative: agg.negatives,
          sentimentNeutral: agg.neutrals,
          totalMentions: agg.totalMentions,
          totalEngagement: agg.totalEngagement,
          sampleSize: total,
          confidence: Math.round(confidence * 100),
          trendDirection,
          periodStart,
          periodEnd,
        },
        update: {
          trustScore: Math.max(0, Math.min(100, Math.round(trustScore * 10) / 10)),
          sentimentPositive: agg.positives,
          sentimentNegative: agg.negatives,
          sentimentNeutral: agg.neutrals,
          totalMentions: agg.totalMentions,
          totalEngagement: agg.totalEngagement,
          sampleSize: total,
          confidence: Math.round(confidence * 100),
          trendDirection,
          periodEnd,
        },
      })
      totalComputed++
    }

    // Step 4: Buat synthetic demographic distribution
    // Karena opinion links belum punya data demografi eksplisit, kita est berdasarkan populasi wilayah
    // (LLM nanti bisa klasifikasi konten ke demografi tertentu)
    const populationData = await db.populationData.findMany({
      where: { level: { in: ['NATIONAL', 'PROVINCE', 'REGENCY'] } },
    })

    for (const pop of populationData) {
      const agg = territoryAggregates[pop.territoryCode]
      if (!agg || agg.totalMentions === 0) continue

      // Distribusi mention per age group (proporsional ke distribusi pemilih)
      const totalVoters = pop.totalVoters || 1
      const ageGroups = [
        { key: '17-21', voters: pop.voters17to21 },
        { key: '22-30', voters: pop.voters22to30 },
        { key: '31-40', voters: pop.voters31to40 },
        { key: '41-60', voters: pop.voters41to60 },
        { key: '61+', voters: pop.voters61plus },
      ]
      const segments = [
        { key: 'INDIGENOUS', pop: pop.populationIndigenous },
        { key: 'RELIGIOUS', pop: pop.populationReligious },
        { key: 'PROFESSION', pop: pop.populationProfession },
        { key: 'YOUTH', pop: pop.populationYouth },
      ]

      // For each age group, compute trust index (distribusi mention proporsional)
      for (const ag of ageGroups) {
        const proportion = (ag.voters / totalVoters)
        const ageMentions = Math.round(agg.totalMentions * proportion)
        if (ageMentions === 0) continue
        const agePositives = Math.round(agg.positives * proportion)
        const ageNegatives = Math.round(agg.negatives * proportion)
        const ageNeutrals = ageMentions - agePositives - ageNegatives
        // Same smooth formula
        const rawScore = 50 + (agePositives * 5) - (ageNegatives * 5)
        const conf = Math.min(100, ageMentions * 10) / 100
        const ageTrust = rawScore + (50 - rawScore) * (1 - conf) * 0.5

        await db.trustIndex.upsert({
          where: { territoryCode_ageGroup_communitySegment: { territoryCode: pop.territoryCode, ageGroup: ag.key, communitySegment: '' } },
          create: {
            territoryCode: pop.territoryCode, level: pop.level,
            ageGroup: ag.key, communitySegment: '',
            trustScore: Math.max(0, Math.min(100, Math.round(ageTrust * 10) / 10)),
            sentimentPositive: agePositives, sentimentNegative: ageNegatives, sentimentNeutral: ageNeutrals,
            totalMentions: ageMentions, totalEngagement: Math.round(agg.totalEngagement * proportion),
            sampleSize: ageMentions, confidence: Math.round(conf * 100),
            trendDirection: ageTrust > 55 ? 'UP' : ageTrust < 45 ? 'DOWN' : 'STABLE',
            periodStart, periodEnd,
          },
          update: {
            trustScore: Math.max(0, Math.min(100, Math.round(ageTrust * 10) / 10)),
            sentimentPositive: agePositives, sentimentNegative: ageNegatives, sentimentNeutral: ageNeutrals,
            totalMentions: ageMentions, totalEngagement: Math.round(agg.totalEngagement * proportion),
            sampleSize: ageMentions, confidence: Math.round(conf * 100),
            periodEnd,
          },
        })
        totalRecords++
      }

      // For each community segment
      for (const seg of segments) {
        const proportion = (seg.pop / Math.max(1, pop.totalPopulation))
        const segMentions = Math.round(agg.totalMentions * proportion)
        if (segMentions === 0) continue
        const segPositives = Math.round(agg.positives * proportion)
        const segNegatives = Math.round(agg.negatives * proportion)
        const segNeutrals = segMentions - segPositives - segNegatives
        const rawScore = 50 + (segPositives * 5) - (segNegatives * 5)
        const conf = Math.min(100, segMentions * 10) / 100
        const segTrust = rawScore + (50 - rawScore) * (1 - conf) * 0.5

        await db.trustIndex.upsert({
          where: { territoryCode_ageGroup_communitySegment: { territoryCode: pop.territoryCode, ageGroup: '', communitySegment: seg.key } },
          create: {
            territoryCode: pop.territoryCode, level: pop.level,
            ageGroup: '', communitySegment: seg.key,
            trustScore: Math.max(0, Math.min(100, Math.round(segTrust * 10) / 10)),
            sentimentPositive: segPositives, sentimentNegative: segNegatives, sentimentNeutral: segNeutrals,
            totalMentions: segMentions, totalEngagement: Math.round(agg.totalEngagement * proportion),
            sampleSize: segMentions, confidence: Math.round(conf * 100),
            trendDirection: segTrust > 55 ? 'UP' : segTrust < 45 ? 'DOWN' : 'STABLE',
            periodStart, periodEnd,
          },
          update: {
            trustScore: Math.max(0, Math.min(100, Math.round(segTrust * 10) / 10)),
            sentimentPositive: segPositives, sentimentNegative: segNegatives, sentimentNeutral: segNeutrals,
            totalMentions: segMentions, totalEngagement: Math.round(agg.totalEngagement * proportion),
            sampleSize: segMentions, confidence: Math.round(conf * 100),
            periodEnd,
          },
        })
        totalRecords++
      }
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(2)
    return NextResponse.json({
      success: true,
      message: `Trust Index berhasil di-recompute. ${totalComputed} territory + ${totalRecords} demographic records dalam ${elapsed}s. Sumber: ${allLinks.length} opinion links.`,
      data: { totalComputed, totalRecords, opinionLinksProcessed: allLinks.length, elapsed: `${elapsed}s` },
    })
  } catch (e: any) {
    console.error('[Trust Index POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
