// LAPRA 08 - API: AI Analysis Survei (100% rule-based, no LLM)
// ============================================================
// POST /api/surveys/ai-analysis
// Body: { surveyId: string, analysisType: 'summary'|'cluster'|'anomaly'|'location'|'action' }
//
// 5 jenis analisis AI:
// 1. Summary — ringkasan multi-respon
// 2. Cluster — grouping respon serupa
// 3. Anomaly — deteksi spam/duplikat
// 4. Location — tagging lokasi dari jawaban
// 5. Action — rekomendasi aksi dari hasil
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, logAccess } from '@/lib/server-helpers'
import {
  generateSurveySummary,
  clusterResponses,
  detectAnomalies,
  autoTagLocation,
  generateActionRecommendation,
  extractKeywords,
  detectCategory,
  analyzeSentiment,
} from '@/lib/ai-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { surveyId, analysisType } = body

    if (!surveyId || !analysisType) {
      return NextResponse.json({ success: false, error: 'surveyId dan analysisType wajib diisi' }, { status: 400 })
    }

    // Fetch survey + responses
    const survey = await db.essayPoll.findUnique({
      where: { id: surveyId },
      include: {
        responses: {
          orderBy: { submittedAt: 'desc' },
          take: 200,
          select: {
            id: true, answer: true, aiSentiment: true, aiCategory: true,
            ageGroup: true, gender: true, occupation: true,
            provinceCode: true, regencyCode: true, wordCount: true,
            submittedAt: true, isProcessed: true,
          },
        },
      },
    })

    if (!survey) return NextResponse.json({ success: false, error: 'Survei tidak ditemukan' }, { status: 404 })

    const responses = survey.responses || []
    const total = responses.length
    const positive = responses.filter(r => r.aiSentiment === 'POSITIVE').length
    const negative = responses.filter(r => r.aiSentiment === 'NEGATIVE').length
    const neutral = total - positive - negative

    await logAccess({
      actor: user, action: 'VIEW', resource: 'SYSTEM_SETTING', resourceId: `ai-analysis-${analysisType}`,
      resourceLabel: `AI ${analysisType} untuk survei "${survey.title}" (${total} respon)`,
      request, detail: `Type: ${analysisType}, Responses: ${total}`,
    })

    // === 1. SUMMARY ===
    if (analysisType === 'summary') {
      const summaryText = generateSurveySummary(responses)
      return NextResponse.json({ success: true, data: { type: 'summary', summary: summaryText, stats: { total, positive, neutral, negative } } })
    }

    // === 2. CLUSTER ===
    if (analysisType === 'cluster') {
      const clusters = clusterResponses(responses, 5)
      return NextResponse.json({ success: true, data: { type: 'cluster', clusters, stats: { total, clusterCount: clusters.length } } })
    }

    // === 3. ANOMALY ===
    if (analysisType === 'anomaly') {
      const anomalies = detectAnomalies(responses)
      return NextResponse.json({ success: true, data: { type: 'anomaly', anomalies, stats: { total, anomalyCount: anomalies.length } } })
    }

    // === 4. LOCATION ===
    if (analysisType === 'location') {
      const locationTags = responses.map(r => ({
        responseId: r.id,
        location: autoTagLocation(r.answer || ''),
        sentiment: r.aiSentiment || analyzeSentiment(r.answer || '').sentiment,
      })).filter(lt => lt.location.matched)

      // Group by province
      const byProvince = new Map<string, { province: string; count: number; positive: number; negative: number }>()
      locationTags.forEach(lt => {
        const prov = lt.location.province || 'Unknown'
        const e = byProvince.get(prov) || { province: prov, count: 0, positive: 0, negative: 0 }
        e.count++
        if (lt.sentiment === 'POSITIVE') e.positive++
        else if (lt.sentiment === 'NEGATIVE') e.negative++
        byProvince.set(prov, e)
      })

      return NextResponse.json({
        success: true,
        data: {
          type: 'location',
          taggedCount: locationTags.length,
          untaggedCount: total - locationTags.length,
          byProvince: Array.from(byProvince.values()).sort((a, b) => b.count - a.count),
        },
      })
    }

    // === 5. ACTION ===
    if (analysisType === 'action') {
      const allText = responses.map(r => r.answer || '').join(' ')
      const topKeywords = extractKeywords(allText).slice(0, 5)
      const categories = new Map<string, number>()
      responses.forEach(r => {
        const cat = r.aiCategory || detectCategory(r.answer || '')
        categories.set(cat, (categories.get(cat) || 0) + 1)
      })
      const topCategory = Array.from(categories.entries()).sort((a, b) => b[1] - a[1])[0]

      const summary = {
        totalResponses: total,
        positivePct: total > 0 ? Math.round((positive / total) * 100) : 0,
        negativePct: total > 0 ? Math.round((negative / total) * 100) : 0,
        topCategory: topCategory ? topCategory[0] : null,
        topKeywords,
      }

      const recommendations = generateActionRecommendation(summary)
      return NextResponse.json({ success: true, data: { type: 'action', recommendations, summary } })
    }

    // === 6. ALL — jalankan semua analisis sekaligus ===
    if (analysisType === 'all') {
      const summaryText = generateSurveySummary(responses)
      const clusters = clusterResponses(responses, 5)
      const anomalies = detectAnomalies(responses)

      const locationTags = responses.map(r => ({
        location: autoTagLocation(r.answer || ''),
      })).filter(lt => lt.location.matched)

      const allText = responses.map(r => r.answer || '').join(' ')
      const topKeywords = extractKeywords(allText).slice(0, 5)
      const categories = new Map<string, number>()
      responses.forEach(r => {
        const cat = r.aiCategory || detectCategory(r.answer || '')
        categories.set(cat, (categories.get(cat) || 0) + 1)
      })
      const topCategory = Array.from(categories.entries()).sort((a, b) => b[1] - a[1])[0]

      const summaryStats = {
        totalResponses: total,
        positivePct: total > 0 ? Math.round((positive / total) * 100) : 0,
        negativePct: total > 0 ? Math.round((negative / total) * 100) : 0,
        topCategory: topCategory ? topCategory[0] : null,
        topKeywords,
      }
      const recommendations = generateActionRecommendation(summaryStats)

      return NextResponse.json({
        success: true,
        data: {
          type: 'all',
          summary: summaryText,
          clusters,
          anomalies,
          locationTagged: locationTags.length,
          recommendations,
          stats: { total, positive, neutral, negative, clusterCount: clusters.length, anomalyCount: anomalies.length },
        },
      })
    }

    return NextResponse.json({ success: false, error: `analysisType tidak dikenal: ${analysisType}` }, { status: 400 })
  } catch (e: any) {
    console.error('[AI Analysis] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
