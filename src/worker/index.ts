// LAPRA 08 - PHASE 1 WORKER PROCESS (BullMQ consumer + Baileys + Xenova)
// =====================================================
// This file is the entry point for the worker process.
// Deploy SEPARATELY from Vercel — on Railway / Fly.io / VPS / Docker.
//
// START:
//   npm run worker
//
// REQUIRED ENV VARS:
//   UPSTASH_REDIS_URL=redis://default:xxx@xxx.upstash.io:6379
//   DATABASE_URL=postgresql://...  (same Neon DB as Vercel)
//
// OPTIONAL (for persistent state):
//   BAILEYS_AUTH_DIR=./baileys-auth  (persistent volume for WhatsApp auth)
//   TRANSFORMERS_CACHE=./models      (persistent volume for Xenova models)
//   INVIDIOUS_HOST=https://your-invidious.example.com  (self-hosted for reliability)
//
// RESPONSIBILITIES:
//   1. Process 'opinion-scrape' jobs:
//      → run scrapeAuto() (Invidious + Google News RSS)
//      → analyze each post with Xenova (sentiment + embedding + summary)
//      → save to PublicOpinionLink with embedding column populated
//      → dedup by cosine similarity (>= 0.92) instead of URL match
//
//   2. Process 'broadcast-send' jobs:
//      → connect to Baileys (singleton, persistent WebSocket)
//      → send real WhatsApp message via Baileys
//      → update BroadcastMessage.status (SENT / FAILED)
//      → honor rate limits (5/min, 100/hr, 500/day)
//
//   3. Process 'broadcast-bulk' jobs:
//      → iterate BroadcastMessage rows where status = QUEUED
//      → enqueue individual 'broadcast-send' jobs with random delay
//        (anti-banned: 3-10s between jobs, batch of 20 then 60s pause)
// =====================================================

import 'dotenv/config'
import { Worker, type Job } from 'bullmq'
import IORedis from 'ioredis'
import { db } from '../lib/db'
import { scrapeAuto, type ScrapedPost } from '../lib/auto-scraper'
import {
  analyzeSentiment,
  calculatePriority,
  detectLocationFromDB,
  aiGenerateOpinionSummaryLLM,
} from '../lib/ai-engine'
import {
  generateEmbedding,
  embeddingToPgVector,
  analyzeSentimentXenova,
} from '../lib/xenova-engine'
import { getBaileysClient, sendWhatsAppMessage, closeBaileysClient } from '../lib/baileys-client'

const REDIS_URL = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL

if (!REDIS_URL) {
  console.error('❌ UPSTASH_REDIS_URL not set. Worker cannot start.')
  console.error('   Set it in your Railway/Fly.io environment variables.')
  process.exit(1)
}

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
})

console.log('🚀 LAPRA 08 Worker starting...')
console.log(`   Redis: ${REDIS_URL.replace(/:[^:@]+@/, ':****@')}`)

// === OPINION SCRAPE WORKER ===
const scrapeWorker = new Worker(
  'opinion-scrape',
  async (job: Job) => {
    const { trigger, userId, scope, provinceCode, regencyCode, scanId } = job.data
    console.log(`\n[ScrapeWorker] Job ${job.id} | trigger=${trigger} | scope=${scope || 'NATIONAL'}`)

    // Step 1: Scrape
    const { posts, sources, skipped } = await scrapeAuto()
    console.log(`[ScrapeWorker] Scraped ${posts.length} posts | sources: ${sources.join(', ')}`)

    if (posts.length === 0) {
      // Update scan status if from AuditAI
      if (scanId) {
        await db.auditScan.update({
          where: { id: scanId },
          data: { status: 'COMPLETED', totalMentions: 0 },
        })
      }
      return { postsProcessed: 0, sources, skipped }
    }

    // Step 2: Process each post (Xenova AI + DB save)
    let savedCount = 0
    let duplicateCount = 0
    let failedCount = 0

    for (const post of posts) {
      try {
        const text = `${post.title} ${post.content}`

        // 2a. Lexicon analysis (instant)
        const lexiconSentiment = analyzeSentiment(text)
        const priorityResult = calculatePriority(text, post.engagementCount, lexiconSentiment.sentiment)
        const loc = await detectLocationFromDB(text)

        // 2b. Apply RBAC scope filter
        if (scope === 'PROVINCE' && provinceCode && loc.provinceCode && loc.provinceCode !== provinceCode) {
          continue
        }
        if (scope === 'REGENCY' && regencyCode && loc.regencyCode && loc.regencyCode !== regencyCode) {
          continue
        }

        // 2c. Check URL-based dedup first (fast path)
        const existingByUrl = await db.publicOpinionLink.findUnique({ where: { url: post.url } })
        if (existingByUrl) {
          duplicateCount++
          continue
        }

        // 2d. Generate embedding (for semantic dedup + similarity search)
        let embedding: Float32Array | null = null
        try {
          embedding = await generateEmbedding(text)
        } catch (e: any) {
          console.warn(`[ScrapeWorker] Embedding failed for "${post.title.substring(0, 40)}...":`, e.message.substring(0, 80))
        }

        // 2e. Semantic dedup: if any existing opinion has cosine similarity > 0.92, skip
        if (embedding) {
          const pgVec = embeddingToPgVector(embedding)
          const similar = await db.$queryRaw`
            SELECT id, title, 1 - ("embedding" <=> ${pgVec}::vector) AS similarity
            FROM "PublicOpinionLink"
            WHERE "embedding" IS NOT NULL
            ORDER BY "embedding" <=> ${pgVec}::vector
            LIMIT 1
          ` as any[]
          if (similar.length > 0 && similar[0].similarity > 0.92) {
            console.log(`[ScrapeWorker] Skip semantic duplicate (sim=${similar[0].similarity.toFixed(3)}): "${post.title.substring(0, 50)}..."`)
            duplicateCount++
            continue
          }
        }

        // 2f. AI summary (Xenova extractive + lexicon hybrid)
        const aiResult = await aiGenerateOpinionSummaryLLM(post.title, post.content || '')

        // 2g. Determine geoPoint from detected location
        let geoPointSql: string | null = null
        const territoryCode = loc.regencyCode || loc.provinceCode
        if (territoryCode) {
          // Look up coordinates from PopulationData
          const popData = await db.populationData.findUnique({
            where: { territoryCode },
            select: { geoCenter: true },
          })
          if (popData?.geoCenter) {
            try {
              const geo = JSON.parse(popData.geoCenter)
              if (geo.lat && geo.lng) {
                geoPointSql = `ST_SetSRID(ST_MakePoint(${geo.lng}, ${geo.lat}), 4326)::geography`
              }
            } catch { /* ignore parse error */ }
          }
        }

        // 2h. Insert with raw SQL (because Prisma can't write Unsupported types)
        const id = `pol_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
        const embeddingSql = embedding ? embeddingToPgVector(embedding) : null

        await db.$executeRaw`
          INSERT INTO "PublicOpinionLink" (
            "id", "url", "platform", "title", "content",
            "author", "authorHandle", "publishedAt", "engagementCount",
            "provinceCode", "provinceName", "regencyCode", "regencyName",
            "sentiment", "priority", "urgencyScore", "category",
            "keywords", "aiSummary",
            "status", "sourceMethod", "scanId",
            "language", "rawPayload", "confidenceScore",
            "embedding", "geoPoint",
            "createdAt", "updatedAt"
          ) VALUES (
            ${id},
            ${post.url},
            ${post.platform},
            ${post.title},
            ${post.content || null},
            ${post.author || null},
            ${post.authorHandle},
            ${post.publishedAt},
            ${post.engagementCount},
            ${loc.provinceCode || null},
            ${loc.provinceName || null},
            ${loc.regencyCode || null},
            ${loc.regencyName || null},
            ${aiResult.sentiment},
            ${aiResult.priority},
            ${priorityResult.urgencyScore},
            ${aiResult.category},
            ${JSON.stringify(aiResult.keywords)},
            ${aiResult.summary},
            'NEW',
            'AUTO',
            ${scanId || null},
            'id',
            ${JSON.stringify(post.rawPayload || {})}::jsonb,
            ${(aiResult as any).confidenceScore || 0},
            ${embeddingSql ? db.$queryRaw`${embeddingSql}::vector` : null},
            ${geoPointSql ? db.$queryRaw`${geoPointSql}` : null},
            NOW(),
            NOW()
          )
          ON CONFLICT ("url") DO NOTHING
        `
        savedCount++
        console.log(`[ScrapeWorker] ✅ Saved: ${post.title.substring(0, 50)}...`)
      } catch (e: any) {
        console.error(`[ScrapeWorker] ❌ Failed: ${post.title.substring(0, 50)}... — ${e.message.substring(0, 100)}`)
        failedCount++
      }
    }

    // Step 3: Update scan if from AuditAI
    if (scanId) {
      await db.auditScan.update({
        where: { id: scanId },
        data: {
          status: 'COMPLETED',
          totalMentions: savedCount,
          needsResponse: savedCount > 0 ? Math.min(savedCount, 5) : 0,
        },
      })
    }

    console.log(`[ScrapeWorker] Job ${job.id} DONE — saved=${savedCount} dup=${duplicateCount} fail=${failedCount}`)
    return { postsProcessed: savedCount, duplicates: duplicateCount, failed: failedCount, sources, skipped }
  },
  { connection, concurrency: 1 }
)

// === BROADCAST SEND WORKER ===
const broadcastWorker = new Worker(
  'broadcast-send',
  async (job: Job) => {
    const { broadcastId, messageId, jid, message } = job.data
    console.log(`[BroadcastWorker] Job ${job.id} → sending to ${jid}`)

    // Send via Baileys
    const result = await sendWhatsAppMessage(jid, message)

    // Update DB
    if (result.success) {
      await db.broadcastMessage.update({
        where: { id: messageId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          baileysMessageId: result.messageId,
          jid,
        },
      })

      // Update contact lastContactedAt
      const msg = await db.broadcastMessage.findUnique({
        where: { id: messageId },
        select: { contactId: true },
      })
      if (msg?.contactId) {
        await db.contact.update({
          where: { id: msg.contactId },
          data: { lastContactedAt: new Date(), contactCount: { increment: 1 } },
        })
      }

      console.log(`[BroadcastWorker] ✅ Sent to ${jid}`)
      return { success: true, messageId: result.messageId }
    } else {
      // Mark as FAILED (BullMQ will retry based on attempts config)
      await db.broadcastMessage.update({
        where: { id: messageId },
        data: {
          status: 'FAILED',
          errorMessage: result.error,
          retryCount: { increment: 1 },
        },
      })
      console.error(`[BroadcastWorker] ❌ Failed ${jid}: ${result.error}`)
      throw new Error(result.error || 'Send failed') // triggers BullMQ retry
    }
  },
  { connection, concurrency: 5 } // 5 concurrent sends (within rate limit of 5/min)
)

// === BROADCAST BULK WORKER (processes a queue of N messages with anti-banned delays) ===
const bulkWorker = new Worker(
  'broadcast-bulk',
  async (job: Job) => {
    const { broadcastId, userId } = job.data
    console.log(`[BulkWorker] Job ${job.id} — processing broadcast ${broadcastId}`)

    const messages = await db.broadcastMessage.findMany({
      where: { broadcastId, status: 'QUEUED' },
      orderBy: { queueOrder: 'asc' },
      select: { id: true, recipientPhone: true, personalizedContent: true, queueOrder: true },
    })

    console.log(`[BulkWorker] Found ${messages.length} queued messages`)

    const { enqueueBroadcastSend } = await import('../lib/queue')
    let enqueued = 0
    let batchCount = 0

    for (const msg of messages) {
      // Convert phone to JID
      let normalizedPhone = msg.recipientPhone.replace(/\D/g, '')
      if (normalizedPhone.startsWith('0')) normalizedPhone = '62' + normalizedPhone.substring(1)
      else if (normalizedPhone.startsWith('8')) normalizedPhone = '62' + normalizedPhone
      const jid = `${normalizedPhone}@s.whatsapp.net`

      // Enqueue individual send job
      const jobId = await enqueueBroadcastSend({
        broadcastId,
        messageId: msg.id,
        jid,
        message: msg.personalizedContent,
      })

      if (jobId) {
        enqueued++
        batchCount++

        // Anti-banned: random delay 3-10s between enqueues
        const delay = 3000 + Math.random() * 7000
        await new Promise(r => setTimeout(r, delay))

        // Batch pause: every 20 messages, wait 60s
        if (batchCount >= 20) {
          console.log(`[BulkWorker] Batch pause (60s) after ${enqueued} messages`)
          await new Promise(r => setTimeout(r, 60000))
          batchCount = 0
        }
      }
    }

    // Update broadcast status
    await db.broadcast.update({
      where: { id: broadcastId },
      data: {
        queueStatus: 'PROCESSING',
        queueJobId: job.id,
      },
    })

    console.log(`[BulkWorker] Done. Enqueued ${enqueued} send jobs.`)
    return { enqueued, totalMessages: messages.length }
  },
  { connection, concurrency: 1 } // only 1 bulk job at a time (rate limit)
)

// === WORKER EVENT HANDLERS ===
scrapeWorker.on('completed', (job) => console.log(`✅ ScrapeWorker job ${job.id} completed`))
scrapeWorker.on('failed', (job, err) => console.error(`❌ ScrapeWorker job ${job?.id} failed:`, err.message))
broadcastWorker.on('completed', (job) => console.log(`✅ BroadcastWorker job ${job.id} completed`))
broadcastWorker.on('failed', (job, err) => console.error(`❌ BroadcastWorker job ${job?.id} failed:`, err.message))
bulkWorker.on('completed', (job) => console.log(`✅ BulkWorker job ${job.id} completed`))
bulkWorker.on('failed', (job, err) => console.error(`❌ BulkWorker job ${job?.id} failed:`, err.message))

// === GRACEFUL SHUTDOWN ===
async function shutdown(signal: string) {
  console.log(`\n🛑 ${signal} received. Shutting down worker...`)
  await scrapeWorker.close()
  await broadcastWorker.close()
  await bulkWorker.close()
  await closeBaileysClient()
  await connection.quit()
  await db.$disconnect()
  console.log('✅ Worker shut down cleanly.')
  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

// === INITIALIZE BAILEYS (lazy: only when first broadcast job arrives) ===
// We don't init Baileys at startup — only when needed.
// First broadcast job will trigger getBaileysClient() lazily.
console.log('\n📋 Worker ready. Waiting for jobs...')
console.log('   - opinion-scrape queue: listening')
console.log('   - broadcast-send queue: listening (concurrency=5)')
console.log('   - broadcast-bulk queue: listening')
console.log('   - Baileys client: will initialize on first broadcast job')
