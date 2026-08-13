// LAPRA 08 - API: Audit AI Responding Otomatis (LEXICON + LLM hybrid)
// POST: Trigger scan — automatically scrapes YouTube + Google News, AI analysis via LLM
// GET: List scan results with RBAC
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { scrapeAuto, ScrapedPost } from '@/lib/auto-scraper'
import {
  analyzeSentiment, calculatePriority, detectLocationFromDB,
  aiGenerateOpinionSummaryLLM
} from '@/lib/ai-engine'

// GET - List scans with RBAC
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const territory = await db.territory.findUnique({ where: { id: user.territoryId } })
  const where: any = {}

  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    if (territory?.level === 'PROVINCE') {
      where.OR = [{ scope: 'NATIONAL' }, { scope: 'PROVINCE', provinceCode: territory.code }]
    } else if (territory?.level === 'REGENCY') {
      where.OR = [{ scope: 'NATIONAL' }, { scope: 'PROVINCE', provinceCode: territory.parentId }, { scope: 'REGENCY', regencyCode: territory.code }]
    }
  }

  const scans = await db.auditScan.findMany({
    where,
    include: { triggeredBy: { select: { fullName: true } }, _count: { select: { complaints: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({ success: true, data: scans })
}

// POST - Trigger new AUTO scan (lexicon + LLM hybrid)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    void body // platforms parameter ignored; auto-scrape uses all available free sources

    const territory = await db.territory.findUnique({ where: { id: user.territoryId } })
    let scope = 'NATIONAL'
    let provinceCode: string | null = null
    let regencyCode: string | null = null

    if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
      if (territory?.level === 'PROVINCE') {
        scope = 'PROVINCE'; provinceCode = territory.code
      } else if (territory?.level === 'REGENCY') {
        scope = 'REGENCY'; regencyCode = territory.code
      }
    }

    const scan = await db.auditScan.create({
      data: {
        triggeredById: user.id,
        platforms: 'AUTO (Invidious + Google News RSS + Xenova AI)',
        scope, provinceCode, regencyCode,
        status: 'RUNNING',
      },
    })

    console.log(`[Audit AI] Scan ${scan.id} started by ${user.fullName} | Scope: ${scope}`)

    // === PATH A: ASYNC via BullMQ (recommended) ===
    try {
      const { enqueueOpinionScrape, isQueueEnabled } = await import('@/lib/queue')
      if (isQueueEnabled()) {
        const jobId = await enqueueOpinionScrape({
          trigger: 'audit-ai',
          userId: user.id,
          scope: scope as 'NATIONAL' | 'PROVINCE' | 'REGENCY',
          provinceCode,
          regencyCode,
          scanId: scan.id,
        })

        if (jobId) {
          // Update scan with job ID for tracking
          await db.auditScan.update({
            where: { id: scan.id },
            data: {
              platforms: `AUTO async job ${jobId} (Invidious + Google News RSS + Xenova AI)`,
            },
          })
          return NextResponse.json({
            success: true,
            data: { id: scan.id, async: true, jobId, status: 'QUEUED' },
            message: 'Scan dijadwalkan. Worker akan memproses dalam beberapa detik.',
          }, { status: 202 })
        }
      }
    } catch (e: any) {
      console.error('[Audit AI] Queue enqueue failed, falling back to sync:', e.message)
    }

    // === PATH B: SYNC fallback (worker not deployed) ===
    console.warn('[Audit AI] Running scan SYNCHRONOUSLY (worker not deployed). May timeout on Vercel.')
    const { posts, sources, skipped } = await scrapeAuto()
    console.log(`[Audit AI] Scan ${scan.id}: ${posts.length} REAL posts from ${sources.length} sources`)

    let needsResponse = 0
    let ignoredCount = 0
    let aiProcessed = 0
    let aiFailed = 0

    for (const post of posts) {
      const text = `${post.title} ${post.content}`

      // Step 1: Lexicon analysis (instant)
      const sentimentResult = analyzeSentiment(text)
      const priorityResult = calculatePriority(text, post.engagementCount, sentimentResult.sentiment)
      const loc = await detectLocationFromDB(text)

      // Apply RBAC location filter
      if (scope === 'PROVINCE' && provinceCode && loc.provinceCode && loc.provinceCode !== provinceCode) continue
      if (scope === 'REGENCY' && regencyCode && loc.regencyCode && loc.regencyCode !== regencyCode) continue

      // Step 2: LLM for AI summary (deeper, more contextual)
      let aiSummary = `Sentimen: ${sentimentResult.sentiment}. Kategori: ${priorityResult.category}. Urgency: ${priorityResult.urgencyScore}/100. Lokasi: ${loc.regencyName || loc.provinceName || 'Nasional'}.`
      let finalSentiment = sentimentResult.sentiment
      let finalPriority = priorityResult.priority
      let finalCategory = priorityResult.category

      try {
        const llmResult = await aiGenerateOpinionSummaryLLM(post.title, post.content || '')
        aiSummary = llmResult.summary
        // LLM override if more confident
        if (llmResult.sentiment && llmResult.sentiment !== 'NEUTRAL') {
          finalSentiment = llmResult.sentiment
        }
        const order = { HIGH: 3, MEDIUM: 2, LOW: 1 }
        if (llmResult.priority && order[llmResult.priority as keyof typeof order] > order[finalPriority as keyof typeof order]) {
          finalPriority = llmResult.priority
        }
        if (llmResult.category && llmResult.category !== 'LAINNYA') {
          finalCategory = llmResult.category
        }
        aiProcessed++
      } catch (e: any) {
        aiFailed++
      }
      // Wait 1s before next LLM call to avoid rate limit
      await new Promise(r => setTimeout(r, 1000))

      // AI Recommendation (template-based, contextual)
      const locName = loc.regencyName || loc.provinceName || 'Nasional'
      let aiAction = 'MONITOR'
      let aiRec = `Prioritas ${finalPriority === 'HIGH' ? 'TINGGI' : finalPriority === 'MEDIUM' ? 'SEDANG' : 'RENDAH'} (AI analysis): Lokasi: ${locName}. `

      if (finalPriority === 'HIGH') {
        aiAction = finalCategory === 'INFRASTRUKTUR' ? 'FIELD_VISIT' : 'CLARIFICATION'
        aiRec += `Tim DPC ${locName} wajib turun ke lapangan dalam 1x24 jam. ${post.platform === 'YOUTUBE' ? 'Video YouTube tentang LAPRA 08 yang perlu direspon.' : 'Artikel berita yang menyebut LAPRA 08.'} Laporkan ke DPD dalam 2x24 jam.`
      } else if (finalPriority === 'MEDIUM') {
        aiAction = 'COORDINATE'
        aiRec += `Tim DPC ${locName} disarankan koordinasi dengan dinas terkait dalam 3x24 jam.`
      } else {
        aiRec += `Monitor perkembangan dan dokumentasikan untuk laporan bulanan.`
      }

      if (finalSentiment === 'NEGATIVE' || finalPriority !== 'LOW') needsResponse++
      ignoredCount++

      await db.auditComplaint.create({
        data: {
          scanId: scan.id,
          platform: post.platform,
          author: post.author,
          authorHandle: post.authorHandle,
          content: post.content.substring(0, 800),
          url: post.url,
          publishedAt: post.publishedAt,
          provinceCode: loc.provinceCode,
          provinceName: loc.provinceName,
          regencyCode: loc.regencyCode,
          regencyName: loc.regencyName,
          priority: finalPriority,
          urgencyScore: priorityResult.urgencyScore,
          category: finalCategory,
          sentiment: finalSentiment,
          keywords: JSON.stringify({ source: post.source, originalPlatform: post.platform, lexicon_neg: sentimentResult.matchedNegative, lexicon_pos: sentimentResult.matchedPositive }),
          responseStatus: (finalSentiment === 'NEGATIVE' || finalPriority !== 'LOW') ? 'IGNORED' : 'NO_RESPONSE_NEEDED',
          aiRecommendation: aiRec,
          aiActionType: aiAction,
          engagementCount: post.engagementCount,
        },
      })

      // Sync to PublicOpinionLink
      try {
        const existingLink = await db.publicOpinionLink.findUnique({ where: { url: post.url } })
        if (!existingLink) {
          await db.publicOpinionLink.create({
            data: {
              url: post.url,
              platform: post.platform,
              title: (post.title || post.content || '').substring(0, 500),
              content: post.content.substring(0, 1000),
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
              keywords: JSON.stringify({ source: post.source, scanId: scan.id }),
              aiSummary,
              status: 'NEW',
              sourceMethod: 'AUTO',
              scanId: scan.id,
            },
          })
        }
      } catch (e: any) {
        console.error('[Audit AI] Sync to PublicOpinionLink failed:', e.message)
      }
    }

    // Update scan stats
    const updated = await db.auditScan.update({
      where: { id: scan.id },
      data: {
        totalMentions: posts.length,
        totalComplaints: ignoredCount,
        needsResponse,
        ignoredCount,
        status: 'COMPLETED',
      },
      include: { _count: { select: { complaints: true } } },
    })

    const summary = `Audit OTOMATIS + AI (LLM + lexicon) selesai. ${posts.length} REAL mention. AI berhasil: ${aiProcessed}, fallback lexicon: ${aiFailed}. ${needsResponse} wajib direspon.`

    return NextResponse.json({
      success: true,
      data: updated,
      message: summary,
      sources,
      skipped,
      aiStats: { llmProcessed: aiProcessed, lexiconFallback: aiFailed },
    })
  } catch (e: any) {
    console.error('[Audit AI Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
