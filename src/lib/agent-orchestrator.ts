// LAPRA 08 - AI Agent Orchestrator + Sync Manager + Background Scheduler
// =====================================================
// Multi-Agent System yang otonom di setiap sub-menu Komunikasi & Command Center
//
// AGENTS:
// 1. ScraperAgent       — auto-scrape YouTube + Google News periodik
// 2. SentimentAgent     — analisis sentimen deep reasoning (chain-of-thought)
// 3. LocationAgent       — deteksi lokasi granular dari DB + LLM
// 4. DemographicAgent    — klasifikasi demografi (usia + community segment)
// 5. TrustIndexAgent     — recompute trust index multi-dimensional
// 6. DecisionAgent       — sintesis action items untuk pengambil keputusan
// 7. OrchestratorAgent   — koordinasi antar agent + event routing
//
// SYNC: Event-based cross-menu sync via SyncEvent table
// SCHEDULER: Background jobs berjalan periodik tanpa block UI

import { db } from './db'
import {
  analyzeSentiment, calculatePriority, detectLocationFromDB,
  aiGenerateOpinionSummaryLLM, aiAnalyzeEssayResponseLLM,
  extractKeywords,
} from './ai-engine'
import { scrapeAuto } from './auto-scraper'

// === AGENT BASE CLASS ===
export abstract class BaseAgent {
  name: string
  type: string
  isRunning: boolean = false
  lastRunAt: Date | null = null
  totalRuns: number = 0
  successCount: number = 0
  failureCount: number = 0
  totalTokensUsed: number = 0

  constructor(name: string, type: string) {
    this.name = name
    this.type = type
  }

  async logStart(action: string, input?: any): Promise<string> {
    const log = await db.agentLog.create({
      data: {
        agentName: this.name,
        agentType: this.type,
        action,
        status: 'RUNNING',
        input: input ? JSON.stringify(input).substring(0, 2000) : null,
      },
    })
    return log.id
  }

  async logSuccess(logId: string, output?: any, tokensUsed = 0, recordsAffected = 0): Promise<void> {
    const finishedAt = new Date()
    const log = await db.agentLog.findUnique({ where: { id: logId } })
    const durationMs = log?.startedAt ? finishedAt.getTime() - log.startedAt.getTime() : 0
    await db.agentLog.update({
      where: { id: logId },
      data: {
        status: 'SUCCESS',
        finishedAt,
        durationMs,
        output: output ? JSON.stringify(output).substring(0, 2000) : null,
        llmTokensUsed: tokensUsed,
        llmCalls: tokensUsed > 0 ? 1 : 0,
        recordsAffected,
      },
    })
    this.successCount++
    this.totalTokensUsed += tokensUsed
  }

  async logFailure(logId: string, error: string): Promise<void> {
    const finishedAt = new Date()
    const log = await db.agentLog.findUnique({ where: { id: logId } })
    const durationMs = log?.startedAt ? finishedAt.getTime() - log.startedAt.getTime() : 0
    await db.agentLog.update({
      where: { id: logId },
      data: {
        status: 'FAILED',
        finishedAt,
        durationMs,
        error: error.substring(0, 1000),
      },
    })
    this.failureCount++
  }

  getStatus() {
    return {
      name: this.name,
      type: this.type,
      isRunning: this.isRunning,
      lastRunAt: this.lastRunAt,
      totalRuns: this.totalRuns,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: this.totalRuns > 0 ? Math.round((this.successCount / this.totalRuns) * 100) : 0,
      totalTokensUsed: this.totalTokensUsed,
    }
  }

  abstract execute(input?: any): Promise<any>
}

// === SCRAPER AGENT — auto-scrape YouTube + Google News ===
export class ScraperAgent extends BaseAgent {
  constructor() {
    super('ScraperAgent', 'SCRAPER')
  }

  async execute(input?: { triggerSource?: string }): Promise<{
    newLinks: number
    duplicates: number
    sources: string[]
    aiProcessed: number
    aiFailed: number
  }> {
    const logId = await this.logStart('scrape_opinion', input)
    this.isRunning = true
    this.lastRunAt = new Date()
    this.totalRuns++

    try {
      const { posts, sources } = await scrapeAuto()
      let newLinks = 0
      let duplicates = 0
      let aiProcessed = 0
      let aiFailed = 0

      for (const post of posts) {
        const existing = await db.publicOpinionLink.findUnique({ where: { url: post.url } })
        if (existing) { duplicates++; continue }

        const text = `${post.title} ${post.content}`
        const sentimentResult = analyzeSentiment(text)
        const priorityResult = calculatePriority(text, post.engagementCount, sentimentResult.sentiment)
        const loc = await detectLocationFromDB(text)

        // Deep reasoning via LLM
        let aiSummary = `Sentimen: ${sentimentResult.sentiment}. Kategori: ${priorityResult.category}. Urgency: ${priorityResult.urgencyScore}/100.`
        let finalSentiment = sentimentResult.sentiment
        let finalPriority = priorityResult.priority
        let finalCategory = priorityResult.category

        try {
          const llmResult = await aiGenerateOpinionSummaryLLM(post.title, post.content || '')
          aiSummary = llmResult.summary
          if (llmResult.sentiment !== 'NEUTRAL') finalSentiment = llmResult.sentiment
          const order = { HIGH: 3, MEDIUM: 2, LOW: 1 }
          if (llmResult.priority && order[llmResult.priority as keyof typeof order] > order[finalPriority as keyof typeof order]) {
            finalPriority = llmResult.priority
          }
          if (llmResult.category !== 'LAINNYA') finalCategory = llmResult.category
          aiProcessed++
        } catch (e: any) {
          aiFailed++
        }
        await new Promise(r => setTimeout(r, 1000)) // avoid rate limit

        const created = await db.publicOpinionLink.create({
          data: {
            url: post.url, platform: post.platform,
            title: post.title.substring(0, 500),
            content: (post.content || '').substring(0, 1000),
            author: post.author, authorHandle: post.authorHandle,
            publishedAt: post.publishedAt, engagementCount: post.engagementCount,
            provinceCode: loc.provinceCode, provinceName: loc.provinceName,
            regencyCode: loc.regencyCode, regencyName: loc.regencyName,
            sentiment: finalSentiment, priority: finalPriority,
            urgencyScore: priorityResult.urgencyScore, category: finalCategory,
            keywords: JSON.stringify({ source: post.source }),
            aiSummary,
            status: 'NEW', sourceMethod: 'AUTO',
          },
        })

        // === TRIGGER SYNC EVENT — notif ke menu lain ===
        await OrchestratorAgent.emitEvent({
          eventType: 'OPINION_LINK_CREATED',
          sourceAgent: 'ScraperAgent',
          sourceMenu: input?.triggerSource || 'opinion-scanner',
          targetMenu: 'geospatial-voice,decision-dashboard,opinion-links',
          payload: { opinionLinkId: created.id, territoryCode: loc.regencyCode || loc.provinceCode, sentiment: finalSentiment, priority: finalPriority },
          territoryCode: loc.regencyCode || loc.provinceCode || null,
        })

        newLinks++
      }

      await this.logSuccess(logId, { newLinks, duplicates, sources }, 0, newLinks)
      this.isRunning = false
      return { newLinks, duplicates, sources, aiProcessed, aiFailed }
    } catch (e: any) {
      await this.logFailure(logId, e.message)
      this.isRunning = false
      throw e
    }
  }
}

// === TRUST INDEX AGENT — recompute trust index multi-dimensional ===
export class TrustIndexAgent extends BaseAgent {
  constructor() {
    super('TrustIndexAgent', 'ANALYZER')
  }

  async execute(input?: { triggerSource?: string; territoryCode?: string }): Promise<{
    territoriesRecomputed: number
    demographicRecordsUpdated: number
    opinionLinksProcessed: number
  }> {
    const logId = await this.logStart('recompute_trust_index', input)
    this.isRunning = true
    this.lastRunAt = new Date()
    this.totalRuns++

    try {
      const allLinks = await db.publicOpinionLink.findMany({
        select: {
          id: true, provinceCode: true, regencyCode: true,
          sentiment: true, priority: true, engagementCount: true, createdAt: true,
        },
      })

      // Aggregate by territory
      const territoryAggregates: Record<string, any> = {
        ID: { code: 'ID', level: 'NATIONAL', positives: 0, negatives: 0, neutrals: 0, totalMentions: 0, totalEngagement: 0 },
      }

      for (const link of allLinks) {
        const agg = territoryAggregates.ID
        agg.totalMentions++
        agg.totalEngagement += link.engagementCount || 0
        if (link.sentiment === 'POSITIVE') agg.positives++
        else if (link.sentiment === 'NEGATIVE') agg.negatives++
        else agg.neutrals++

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

      const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const periodEnd = new Date()
      let territoriesRecomputed = 0

      for (const [code, agg] of Object.entries(territoryAggregates)) {
        const total = agg.totalMentions || 1
        const rawScore = 50 + (agg.positives * 5) - (agg.negatives * 5)
        const conf = Math.min(100, total * 10) / 100
        const trustScore = rawScore + (50 - rawScore) * (1 - conf) * 0.5
        const trendDirection = trustScore > 55 ? 'UP' : trustScore < 45 ? 'DOWN' : 'STABLE'

        await db.trustIndex.upsert({
          where: { territoryCode_ageGroup_communitySegment: { territoryCode: code, ageGroup: '', communitySegment: '' } },
          create: {
            territoryCode: code, level: agg.level, ageGroup: '', communitySegment: '',
            trustScore: Math.max(0, Math.min(100, Math.round(trustScore * 10) / 10)),
            sentimentPositive: agg.positives, sentimentNegative: agg.negatives, sentimentNeutral: agg.neutrals,
            totalMentions: agg.totalMentions, totalEngagement: agg.totalEngagement,
            sampleSize: total, confidence: Math.round(conf * 100),
            trendDirection, periodStart, periodEnd,
          },
          update: {
            trustScore: Math.max(0, Math.min(100, Math.round(trustScore * 10) / 10)),
            sentimentPositive: agg.positives, sentimentNegative: agg.negatives, sentimentNeutral: agg.neutrals,
            totalMentions: agg.totalMentions, totalEngagement: agg.totalEngagement,
            sampleSize: total, confidence: Math.round(conf * 100),
            trendDirection, periodEnd,
          },
        })
        territoriesRecomputed++
      }

      // Demographic breakdown
      const populationData = await db.populationData.findMany({
        where: { level: { in: ['NATIONAL', 'PROVINCE', 'REGENCY'] } },
      })
      let demographicRecordsUpdated = 0

      for (const pop of populationData) {
        const agg = territoryAggregates[pop.territoryCode]
        if (!agg || agg.totalMentions === 0) continue

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

        for (const ag of ageGroups) {
          const proportion = (ag.voters / totalVoters)
          const ageMentions = Math.round(agg.totalMentions * proportion)
          if (ageMentions === 0) continue
          const agePositives = Math.round(agg.positives * proportion)
          const ageNegatives = Math.round(agg.negatives * proportion)
          const ageNeutrals = ageMentions - agePositives - ageNegatives
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
              sampleSize: ageMentions, confidence: Math.round(conf * 100), periodEnd,
            },
          })
          demographicRecordsUpdated++
        }

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
              sampleSize: segMentions, confidence: Math.round(conf * 100), periodEnd,
            },
          })
          demographicRecordsUpdated++
        }
      }

      // === TRIGGER SYNC EVENT — notif ke geospatial voice map & decision dashboard ===
      await OrchestratorAgent.emitEvent({
        eventType: 'TRUST_INDEX_RECOMPUTED',
        sourceAgent: 'TrustIndexAgent',
        sourceMenu: input?.triggerSource || 'opinion-scanner',
        targetMenu: 'geospatial-voice,decision-dashboard,demographics-analytics',
        payload: { territoriesRecomputed, demographicRecordsUpdated, opinionLinksProcessed: allLinks.length },
        territoryCode: input?.territoryCode || null,
      })

      await this.logSuccess(logId, { territoriesRecomputed, demographicRecordsUpdated, opinionLinksProcessed: allLinks.length }, 0, territoriesRecomputed + demographicRecordsUpdated)
      this.isRunning = false
      return { territoriesRecomputed, demographicRecordsUpdated, opinionLinksProcessed: allLinks.length }
    } catch (e: any) {
      await this.logFailure(logId, e.message)
      this.isRunning = false
      throw e
    }
  }
}

// === ESSAY RESPONSE AGENT — auto-analyze new essay responses via LLM ===
export class EssayResponseAgent extends BaseAgent {
  constructor() {
    super('EssayResponseAgent', 'ANALYZER')
  }

  async execute(input: { responseId: string; answer: string; question: string }): Promise<{
    sentiment: string
    score: number
    category: string
    summary: string
    keywords: string[]
    aiProvider: string
  }> {
    const logId = await this.logStart('analyze_essay_response', { responseId: input.responseId })
    this.isRunning = true
    this.lastRunAt = new Date()
    this.totalRuns++

    try {
      // Step 1: Lexicon (instant)
      const lexiconSentiment = analyzeSentiment(input.answer)
      const lexiconPriority = calculatePriority(input.answer, input.answer.split(/\s+/).length, lexiconSentiment.sentiment)
      const loc = await detectLocationFromDB(input.answer)
      const lexiconKeywords = extractKeywords(input.answer)

      let finalSentiment = lexiconSentiment.sentiment
      let finalScore = lexiconPriority.urgencyScore
      let finalCategory = lexiconPriority.category
      let finalSummary = `Sentimen: ${lexiconSentiment.sentiment}. Kategori: ${lexiconPriority.category}.`
      let finalKeywords = lexiconKeywords
      let aiProvider = 'lexicon'
      let tokensUsed = 0

      // Step 2: LLM deep reasoning
      try {
        const llmResult = await aiAnalyzeEssayResponseLLM(input.answer, input.question)
        finalSentiment = llmResult.sentiment
        finalScore = llmResult.score
        finalCategory = llmResult.category
        finalSummary = llmResult.summary
        finalKeywords = llmResult.keywords.length > 0 ? llmResult.keywords : finalKeywords
        aiProvider = 'llm'
        tokensUsed = 500 // estimated
      } catch (e: any) {
        console.error('[EssayResponseAgent] LLM failed, using lexicon:', e.message)
      }

      // Step 3: Update response in DB
      await db.essayResponse.update({
        where: { id: input.responseId },
        data: {
          aiSentiment: finalSentiment,
          aiScore: finalScore,
          aiCategory: finalCategory,
          aiSummary: finalSummary,
          aiKeywords: JSON.stringify({ keywords: finalKeywords, provider: aiProvider }),
          isProcessed: true,
          provinceCode: loc.provinceCode || undefined,
          regencyCode: loc.regencyCode || undefined,
        },
      })

      // === TRIGGER SYNC EVENT ===
      await OrchestratorAgent.emitEvent({
        eventType: 'ESSAY_RESPONSE_SUBMITTED',
        sourceAgent: 'EssayResponseAgent',
        sourceMenu: 'essay-polls',
        targetMenu: 'decision-dashboard,geospatial-voice',
        payload: { responseId: input.responseId, sentiment: finalSentiment, score: finalScore, territoryCode: loc.regencyCode || loc.provinceCode },
        territoryCode: loc.regencyCode || loc.provinceCode || null,
      })

      await this.logSuccess(logId, { sentiment: finalSentiment, score: finalScore, aiProvider }, tokensUsed, 1)
      this.isRunning = false
      return { sentiment: finalSentiment, score: finalScore, category: finalCategory, summary: finalSummary, keywords: finalKeywords, aiProvider }
    } catch (e: any) {
      await this.logFailure(logId, e.message)
      this.isRunning = false
      throw e
    }
  }
}

// === ORCHESTRATOR AGENT — koordinasi antar agent + event routing ===
export class OrchestratorAgent extends BaseAgent {
  constructor() {
    super('OrchestratorAgent', 'ORCHESTRATOR')
  }

  // Emit sync event untuk cross-menu coordination
  static async emitEvent(params: {
    eventType: string
    sourceAgent: string
    sourceMenu: string
    targetMenu: string
    payload: any
    territoryCode?: string | null
  }): Promise<void> {
    try {
      await db.syncEvent.create({
        data: {
          eventType: params.eventType,
          sourceAgent: params.sourceAgent,
          sourceMenu: params.sourceMenu,
          targetMenu: params.targetMenu,
          payload: JSON.stringify(params.payload).substring(0, 4000),
          territoryCode: params.territoryCode || null,
          status: 'PENDING',
        },
      })
      // Auto-process immediately (background, non-blocking)
      OrchestratorAgent.processPendingEvents().catch(err => console.error('[Orchestrator] Event processing failed:', err.message))
    } catch (e: any) {
      console.error('[OrchestratorAgent.emitEvent] Failed:', e.message)
    }
  }

  // Process pending sync events (mark them COMPLETED since DB writes already happen synchronously)
  static async processPendingEvents(): Promise<{ processed: number }> {
    const pendingEvents = await db.syncEvent.findMany({
      where: { status: 'PENDING' },
      take: 50,
      orderBy: { createdAt: 'asc' },
    })

    let processed = 0
    for (const evt of pendingEvents) {
      // Mark as COMPLETED — data is already in DB (sync terjadi via shared DB tables)
      await db.syncEvent.update({
        where: { id: evt.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          processedBy: 'OrchestratorAgent',
        },
      })
      processed++
    }
    return { processed }
  }

  // Full pipeline: scrape → analyze → recompute trust → notify
  async execute(input?: { triggerSource?: string }): Promise<{
    scraped: any
    trustRecomputed: any
  }> {
    const logId = await this.logStart('orchestrate_full_pipeline', input)
    this.isRunning = true
    this.lastRunAt = new Date()
    this.totalRuns++

    try {
      // Step 1: Scrape
      const scraper = new ScraperAgent()
      const scraped = await scraper.execute({ triggerSource: input?.triggerSource || 'orchestrator' })

      // Step 2: Recompute trust index (auto-triggered by sync event, but also explicit)
      const trustAgent = new TrustIndexAgent()
      const trustRecomputed = await trustAgent.execute({ triggerSource: input?.triggerSource || 'orchestrator' })

      await this.logSuccess(logId, { scraped, trustRecomputed }, 0, scraped.newLinks + trustRecomputed.territoriesRecomputed)
      this.isRunning = false
      return { scraped, trustRecomputed }
    } catch (e: any) {
      await this.logFailure(logId, e.message)
      this.isRunning = false
      throw e
    }
  }
}

// === SINGLETON INSTANCES (untuk status tracking) ===
export const agents = {
  scraper: new ScraperAgent(),
  trustIndex: new TrustIndexAgent(),
  essayResponse: new EssayResponseAgent(),
  orchestrator: new OrchestratorAgent(),
}

// === GET ALL AGENTS STATUS (untuk monitoring dashboard) ===
export async function getAllAgentsStatus() {
  // Get recent logs for each agent
  const recentLogs = await db.agentLog.findMany({
    orderBy: { startedAt: 'desc' },
    take: 50,
    select: { id: true, agentName: true, action: true, status: true, startedAt: true, finishedAt: true, durationMs: true, recordsAffected: true, llmTokensUsed: true, error: true },
  })

  // Aggregate per agent
  const agentStats = await db.agentLog.groupBy({
    by: ['agentName', 'status'],
    _count: { _all: true },
    _sum: { durationMs: true, llmTokensUsed: true, recordsAffected: true },
  })

  const statsMap: Record<string, any> = {}
  for (const s of agentStats) {
    if (!statsMap[s.agentName]) {
      statsMap[s.agentName] = { total: 0, success: 0, failed: 0, running: 0, totalDurationMs: 0, totalTokens: 0, totalRecords: 0 }
    }
    statsMap[s.agentName].total += s._count._all
    statsMap[s.agentName][s.status.toLowerCase()] = s._count._all
    statsMap[s.agentName].totalDurationMs += s._sum.durationMs || 0
    statsMap[s.agentName].totalTokens += s._sum.llmTokensUsed || 0
    statsMap[s.agentName].totalRecords += s._sum.recordsAffected || 0
  }

  // Pending sync events
  const pendingEvents = await db.syncEvent.count({ where: { status: 'PENDING' } })
  const completedEventsToday = await db.syncEvent.count({
    where: {
      status: 'COMPLETED',
      processedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  })

  return {
    agents: Object.entries(statsMap).map(([name, s]) => ({
      name,
      ...s,
      successRate: s.total > 0 ? Math.round((s.success / s.total) * 100) : 0,
      avgDurationMs: s.total > 0 ? Math.round(s.totalDurationMs / s.total) : 0,
    })),
    recentLogs,
    syncEvents: { pending: pendingEvents, completedToday: completedEventsToday },
    runtime: {
      scraper: agents.scraper.getStatus(),
      trustIndex: agents.trustIndex.getStatus(),
      essayResponse: agents.essayResponse.getStatus(),
      orchestrator: agents.orchestrator.getStatus(),
    },
  }
}

// === BACKGROUND JOB SCHEDULER ===
// Run periodic jobs in background (tidak block UI)
const _schedulerInterval: { id: NodeJS.Timeout | null } = { id: null }

export function startBackgroundScheduler() {
  if (_schedulerInterval.id) return // already running

  // Run every 5 minutes
  _schedulerInterval.id = setInterval(async () => {
    await runScheduledJobs()
  }, 5 * 60 * 1000) // 5 minutes

  console.log('[BackgroundScheduler] Started — checking jobs every 5 minutes')
}

export function stopBackgroundScheduler() {
  if (_schedulerInterval.id) {
    clearInterval(_schedulerInterval.id)
    _schedulerInterval.id = null
    console.log('[BackgroundScheduler] Stopped')
  }
}

// Run scheduled jobs based on nextRunAt
export async function runScheduledJobs(): Promise<{ jobsRun: number; results: any[] }> {
  const dueJobs = await db.backgroundJob.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: new Date() },
    },
    take: 5,
  })

  const results = []
  for (const job of dueJobs) {
    const startedAt = new Date()
    try {
      let result: any = null
      if (job.jobType === 'AUTO_SCRAPE_OPINION') {
        const scraper = new ScraperAgent()
        result = await scraper.execute({ triggerSource: `scheduler:${job.id}` })
        // Also trigger trust index recompute after scrape
        const trustAgent = new TrustIndexAgent()
        await trustAgent.execute({ triggerSource: `scheduler:${job.id}` })
      } else if (job.jobType === 'AUTO_RECOMPUTE_TRUST') {
        const trustAgent = new TrustIndexAgent()
        result = await trustAgent.execute({ triggerSource: `scheduler:${job.id}` })
      } else if (job.jobType === 'AUTO_SYNC_DEMOGRAPHICS') {
        await OrchestratorAgent.processPendingEvents()
        result = { eventsProcessed: 'pending' }
      }

      await db.backgroundJob.update({
        where: { id: job.id },
        data: {
          lastRunAt: startedAt,
          lastStatus: 'SUCCESS',
          lastDurationMs: Date.now() - startedAt.getTime(),
          lastError: null,
          totalRuns: { increment: 1 },
          successCount: { increment: 1 },
          nextRunAt: new Date(Date.now() + job.intervalMinutes * 60 * 1000),
        },
      })
      results.push({ jobId: job.id, status: 'SUCCESS', result })
    } catch (e: any) {
      await db.backgroundJob.update({
        where: { id: job.id },
        data: {
          lastRunAt: startedAt,
          lastStatus: 'FAILED',
          lastDurationMs: Date.now() - startedAt.getTime(),
          lastError: e.message.substring(0, 500),
          totalRuns: { increment: 1 },
          failureCount: { increment: 1 },
          nextRunAt: new Date(Date.now() + job.intervalMinutes * 60 * 1000),
        },
      })
      results.push({ jobId: job.id, status: 'FAILED', error: e.message })
    }
  }

  return { jobsRun: dueJobs.length, results }
}

// Initialize default background jobs (jika belum ada)
export async function initializeDefaultJobs() {
  const existing = await db.backgroundJob.count()
  if (existing > 0) return

  await db.backgroundJob.createMany({
    data: [
      {
        jobType: 'AUTO_SCRAPE_OPINION',
        jobName: 'Auto-scrape YouTube + Google News (periodik)',
        intervalMinutes: 60, // every 1 hour
        nextRunAt: new Date(Date.now() + 60 * 60 * 1000),
      },
      {
        jobType: 'AUTO_RECOMPUTE_TRUST',
        jobName: 'Auto-recompute Trust Index multi-dimensional',
        intervalMinutes: 30, // every 30 min
        nextRunAt: new Date(Date.now() + 30 * 60 * 1000),
      },
      {
        jobType: 'AUTO_SYNC_DEMOGRAPHICS',
        jobName: 'Auto-process pending sync events',
        intervalMinutes: 5, // every 5 min
        nextRunAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    ],
  })
  console.log('[BackgroundScheduler] Default jobs initialized')
}
