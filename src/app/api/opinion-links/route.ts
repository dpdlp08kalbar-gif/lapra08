// LAPRA 08 - API: Public Opinion Links (AI ENGINE: Lexicon + LLM)
// GET - List all analyzed public opinion links (with RBAC + filters)
// POST - Add link manually OR auto-scrape + AI analysis (lexicon + LLM hybrid)
//
// INTEGRATED: Multi-Agent System — auto-trigger TrustIndexAgent after new opinion links
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { scrapeAuto } from '@/lib/auto-scraper'
import {
  analyzeSentiment, calculatePriority, detectLocationFromDB,
  aiGenerateOpinionSummaryLLM
} from '@/lib/ai-engine'
import { OrchestratorAgent } from '@/lib/agent-orchestrator'

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

// POST - Auto-scrape & AI-analyze links
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
      let aiProcessed = 0
      let aiFailed = 0

      for (const post of posts) {
        // Skip if URL already exists
        const existing = await db.publicOpinionLink.findUnique({ where: { url: post.url } })
        if (existing) {
          duplicateCount++
          continue
        }

        const text = `${post.title} ${post.content}`
        
        // Step 1: Lexicon-based sentiment + priority (instant)
        const sentimentResult = analyzeSentiment(text)
        const priorityResult = calculatePriority(text, post.engagementCount, sentimentResult.sentiment)
        
        // Step 2: Location detection from DB (comprehensive 515 DPC)
        const loc = await detectLocationFromDB(text)
        
        // Step 3: Try LLM for AI summary (more contextual, may fail gracefully)
        // Sequential to avoid 429 rate limit. Wait 1s between calls.
        let aiSummary = `Sentimen: ${sentimentResult.sentiment}. Kategori: ${priorityResult.category}. Urgency: ${priorityResult.urgencyScore}/100. Lokasi: ${loc.regencyName || loc.provinceName || 'Nasional'}.`
        let finalSentiment = sentimentResult.sentiment
        let finalPriority = priorityResult.priority
        let finalCategory = priorityResult.category
        let finalKeywords: string[] = []
        
        try {
          const llmResult = await aiGenerateOpinionSummaryLLM(post.title, post.content || '')
          aiSummary = llmResult.summary
          // LLM result overrides lexicon if LLM is confident
          if (llmResult.sentiment && llmResult.sentiment !== 'NEUTRAL') {
            finalSentiment = llmResult.sentiment
          }
          if (llmResult.priority) {
            const order = { HIGH: 3, MEDIUM: 2, LOW: 1 }
            if (order[llmResult.priority as keyof typeof order] > order[finalPriority as keyof typeof order]) {
              finalPriority = llmResult.priority
            }
          }
          if (llmResult.category && llmResult.category !== 'LAINNYA') {
            finalCategory = llmResult.category
          }
          finalKeywords = llmResult.keywords
          aiProcessed++
        } catch (e: any) {
          console.error('[LLM] Opinion summary failed, using lexicon:', e.message)
          aiFailed++
        }
        // Wait 1s before next LLM call to avoid rate limit
        await new Promise(r => setTimeout(r, 1000))

        await db.publicOpinionLink.create({
          data: {
            url: post.url,
            platform: post.platform,
            title: post.title.substring(0, 500),
            content: (post.content || '').substring(0, 1000),
            author: post.author,
            authorHandle: post.authorHandle,
            publishedAt: post.publishedAt,
            engagementCount: post.engagementCount,
            provinceCode: loc.provinceCode,
            provinceName: loc.provinceName,
            regencyCode: loc.regencyCode,
            regencyName: loc.regencyName,
            sentiment: finalSentiment,
            priority: finalPriority,
            urgencyScore: priorityResult.urgencyScore,
            category: finalCategory,
            keywords: JSON.stringify({ lexicon: sentimentResult.matchedNegative.concat(sentimentResult.matchedPositive).slice(0, 8), llm: finalKeywords }),
            aiSummary,
            status: 'NEW',
            sourceMethod: 'AUTO',
          },
        })
        savedCount++
        if (finalPriority === 'HIGH') newHigh++
        else if (finalPriority === 'MEDIUM') newMedium++
      }

      // === AUTO-TRIGGER TrustIndexAgent (background, non-blocking) ===
      // Sinkronisasi real-time: data baru di opinion-links langsung update ke geospatial voice & decision dashboard
      if (savedCount > 0) {
        OrchestratorAgent.emitEvent({
          eventType: 'OPINION_LINKS_BATCH_CREATED',
          sourceAgent: 'OpinionLinksAPI',
          sourceMenu: 'opinion-links',
          targetMenu: 'geospatial-voice,decision-dashboard',
          payload: { savedCount, newHigh, newMedium },
          territoryCode: null,
        }).catch(e => console.error('[OpinionLinks] Sync event emit failed:', e.message))
        // Fire-and-forget: trigger trust index recompute in background
        import('@/lib/agent-orchestrator').then(async ({ agents }) => {
          try {
            await agents.trustIndex.execute({ triggerSource: 'opinion-links-auto' })
          } catch (e: any) {
            console.error('[OpinionLinks] Auto trust index recompute failed:', e.message)
          }
        })
      }

      return NextResponse.json({
        success: true,
        message: `Scan otomatis + AI analisis selesai. ${savedCount} link baru, ${duplicateCount} duplikat. ${newHigh} HIGH, ${newMedium} MEDIUM. AI berhasil: ${aiProcessed}, AI gagal (fallback lexicon): ${aiFailed}. Sumber: ${sources.join(', ')}.`,
        data: { saved: savedCount, duplicates: duplicateCount, newHigh, newMedium, aiProcessed, aiFailed, sources },
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
    const loc = await detectLocationFromDB(text)

    // Try LLM for better summary
    let aiSummary = `Sentimen: ${sentimentResult.sentiment}. Kategori: ${priorityResult.category}. Urgency: ${priorityResult.urgencyScore}/100. Lokasi: ${loc.regencyName || loc.provinceName || 'Nasional'}.`
    try {
      const llmResult = await aiGenerateOpinionSummaryLLM(title, content || '')
      aiSummary = llmResult.summary
    } catch (e: any) { /* fallback to lexicon */ }

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
        aiSummary,
        status: 'NEW',
        sourceMethod: 'MANUAL',
      },
    })

    return NextResponse.json({ success: true, data: link, message: 'Link ditambahkan & dianalisis AI' })
  } catch (e: any) {
    console.error('[Opinion Links POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
