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

// TINGKATKAN: 10 detik cache (dari 30) — lebih real-time
const _cache = new Map<string, { ts: number; data: any }>()
const CACHE_TTL_MS = 10 * 1000

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
  const limit = parseInt(searchParams.get('limit') || '100') // TINGKATKAN: dari 50 ke 100
  // === FIX: bypass cache jika ada parameter _t (cache-bust dari frontend) ===
  const bypassCache = searchParams.get('_t')

  const cacheKey = `${user.id}|${user.territoryId}|${platform || ''}|${sentiment || ''}|${priority || ''}|${status || ''}|${provinceCode || ''}|${limit}`
  if (!bypassCache) {
    const cached = _cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cached.data, cached: true })
    }
  }

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
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })

  _cache.set(cacheKey, { ts: Date.now(), data: links })
  return NextResponse.json({ success: true, data: links, cached: false })
}

// POST - Auto-scrape & AI-analyze links
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    // Invalidate cache on any mutation
    _cache.clear()

    // === Auto-scrape mode (PHASE 1: async via BullMQ queue) ===
    if (body.action === 'scrape') {
      // Determine RBAC scope
      const territory = await db.territory.findUnique({ where: { id: user.territoryId } })
      let scope: 'NATIONAL' | 'PROVINCE' | 'REGENCY' = 'NATIONAL'
      let provinceCode: string | null = null
      let regencyCode: string | null = null

      if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
        if (territory?.level === 'PROVINCE') {
          scope = 'PROVINCE'; provinceCode = territory.code
        } else if (territory?.level === 'REGENCY') {
          scope = 'REGENCY'; regencyCode = territory.code
        }
      }

      // === PATH A: ASYNC via BullMQ (recommended for production) ===
      try {
        const { enqueueOpinionScrape, isQueueEnabled } = await import('@/lib/queue')
        if (isQueueEnabled()) {
          const jobId = await enqueueOpinionScrape({
            trigger: 'manual',
            userId: user.id,
            scope,
            provinceCode,
            regencyCode,
          })

          if (jobId) {
            return NextResponse.json({
              success: true,
              message: 'Scan dijadwalkan. Worker akan memproses dalam beberapa detik. Refresh halaman untuk melihat hasil.',
              data: { jobId, async: true, status: 'QUEUED' },
              status: 202,
            }, { status: 202 })
          }
        }
      } catch (e: any) {
        console.error('[opinion-links] Queue enqueue failed, falling back to sync:', e.message)
      }

      // === PATH B: SYNC fallback (worker not deployed OR Redis not configured) ===
      // WARNING: This may timeout on Vercel serverless (10s hobby, 60s pro).
      // Recommended to deploy worker for production.
      console.warn('[opinion-links] Running scrape SYNCHRONOUSLY (worker not deployed). May timeout on Vercel.')
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

        // Step 3: Try LLM for AI summary (rule-based, Z.AI removed)
        let aiSummary = `Sentimen: ${sentimentResult.sentiment}. Kategori: ${priorityResult.category}. Urgency: ${priorityResult.urgencyScore}/100. Lokasi: ${loc.regencyName || loc.provinceName || 'Nasional'}.`
        let finalSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = sentimentResult.sentiment
        let finalPriority: 'HIGH' | 'MEDIUM' | 'LOW' = priorityResult.priority
        let finalCategory = priorityResult.category
        let finalKeywords: string[] = []

        try {
          const llmResult = await aiGenerateOpinionSummaryLLM(post.title, post.content || '')
          aiSummary = llmResult.summary
          if (llmResult.sentiment && llmResult.sentiment !== 'NEUTRAL') {
            finalSentiment = llmResult.sentiment as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
          }
          if (llmResult.priority) {
            const order = { HIGH: 3, MEDIUM: 2, LOW: 1 }
            if (order[llmResult.priority as keyof typeof order] > order[finalPriority as keyof typeof order]) {
              finalPriority = llmResult.priority as 'HIGH' | 'MEDIUM' | 'LOW'
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
      if (savedCount > 0) {
        OrchestratorAgent.emitEvent({
          eventType: 'OPINION_LINKS_BATCH_CREATED',
          sourceAgent: 'OpinionLinksAPI',
          sourceMenu: 'opinion-links',
          targetMenu: 'geospatial-voice,decision-dashboard',
          payload: { savedCount, newHigh, newMedium },
          territoryCode: null,
        }).catch(e => console.error('[OpinionLinks] Sync event emit failed:', e.message))
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

    // === STRICT FILTER: HANYA simpan yang mengandung Laskar Prabowo 08 / LAPRA 08 ===
    const textLower = text.toLowerCase()
    const isLapra = textLower.includes('laskar prabowo 08') ||
                    textLower.includes('lapra 08') ||
                    textLower.includes('lapra08') ||
                    textLower.includes('relawan laskar prabowo 08') ||
                    textLower.includes('laskar prabowo delapan')
    if (!isLapra) {
      return NextResponse.json({
        success: false,
        error: 'Link ditolak: tidak mengandung keyword "Laskar Prabowo 08" atau "LAPRA 08". Sistem hanya menerima berita terkait LAPRA 08.'
      }, { status: 400 })
    }

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
