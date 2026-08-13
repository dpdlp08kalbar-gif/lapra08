// LAPRA 08 - PHASE 1: Real Async Queue (BullMQ + Upstash Redis)
// =====================================================
// Replaces fragile setInterval() with production-grade job queue.
//
// ARCHITECTURE:
//   Vercel function (producer) ──enqueue──▶ Upstash Redis ──dequeue──▶ Worker process (consumer)
//                                                                       (Railway / Fly.io / VPS)
//
// WORKER DEPLOYMENT:
//   Worker is a separate Node.js process running `npm run worker`.
//   Deploy on Railway/Fly.io with these env vars:
//     - UPSTASH_REDIS_URL=redis://default:xxx@xxx.upstash.io:6379
//     - DATABASE_URL=postgresql://...  (same Neon DB as Vercel)
//     - BAILEYS_AUTH_DIR=./baileys-auth  (persistent volume)
//     - TRANSFORMERS_CACHE=./models     (persistent volume for Xenova models)
//
// FALLBACK MODE:
//   If UPSTASH_REDIS_URL is not set, queue functions return null.
//   Callers should fall back to synchronous execution (with timeout protection).
// =====================================================

import { Queue } from 'bullmq'
import IORedis from 'ioredis'

// === CONNECTION (singleton) ===
const REDIS_URL = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL

let _connection: IORedis | null = null

export function getRedisConnection(): IORedis | null {
  if (!REDIS_URL) return null
  if (!_connection) {
    _connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,  // required by BullMQ
      enableReadyCheck: false,
      tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
    })
    _connection.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message.substring(0, 100))
    })
  }
  return _connection
}

// === QUEUE SINGLETONS ===
let _opinionScrapeQueue: Queue | null = null
let _broadcastSendQueue: Queue | null = null
let _broadcastBulkQueue: Queue | null = null

export function getOpinionScrapeQueue(): Queue | null {
  const conn = getRedisConnection()
  if (!conn) return null
  if (!_opinionScrapeQueue) {
    _opinionScrapeQueue = new Queue('opinion-scrape', { connection: conn })
  }
  return _opinionScrapeQueue
}

export function getBroadcastSendQueue(): Queue | null {
  const conn = getRedisConnection()
  if (!conn) return null
  if (!_broadcastSendQueue) {
    _broadcastSendQueue = new Queue('broadcast-send', { connection: conn })
  }
  return _broadcastSendQueue
}

export function getBroadcastBulkQueue(): Queue | null {
  const conn = getRedisConnection()
  if (!conn) return null
  if (!_broadcastBulkQueue) {
    _broadcastBulkQueue = new Queue('broadcast-bulk', { connection: conn })
  }
  return _broadcastBulkQueue
}

// === FEATURE FLAG ===
export function isQueueEnabled(): boolean {
  return !!REDIS_URL
}

// === JOB TYPES ===
export interface OpinionScrapeJobData {
  trigger: 'manual' | 'scheduler' | 'audit-ai'
  userId: string
  scope?: 'NATIONAL' | 'PROVINCE' | 'REGENCY'
  provinceCode?: string | null
  regencyCode?: string | null
  scanId?: string | null // If triggered from AuditAIRespondingDialog
}

export interface BroadcastSendJobData {
  broadcastId: string
  messageId: string  // BroadcastMessage.id
  jid: string        // WhatsApp JID (e.g., 6281234567890@s.whatsapp.net)
  message: string    // personalized content (variables already resolved)
}

export interface BroadcastBulkJobData {
  broadcastId: string
  userId: string
  // Worker will iterate BroadcastMessage rows where status = QUEUED
  // and enqueue individual send jobs respecting rate limits
}

// === ENQUEUE HELPERS ===
// All return job ID (string) on success, null if queue not configured or failed.

export async function enqueueOpinionScrape(
  data: OpinionScrapeJobData
): Promise<string | null> {
  const queue = getOpinionScrapeQueue()
  if (!queue) return null

  try {
    const job = await queue.add('scrape', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }, // 5s, 10s, 20s
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    })
    return job.id ?? null
  } catch (e: any) {
    console.error('[Queue] enqueueOpinionScrape failed:', e.message)
    return null
  }
}

export async function enqueueBroadcastSend(
  data: BroadcastSendJobData
): Promise<string | null> {
  const queue = getBroadcastSendQueue()
  if (!queue) return null

  try {
    const job = await queue.add('send', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s, 8s
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 100 },
    })
    return job.id ?? null
  } catch (e: any) {
    console.error('[Queue] enqueueBroadcastSend failed:', e.message)
    return null
  }
}

export async function enqueueBroadcastBulk(
  data: BroadcastBulkJobData
): Promise<string | null> {
  const queue = getBroadcastBulkQueue()
  if (!queue) return null

  try {
    const job = await queue.add('bulk', data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 20 },
    })
    return job.id ?? null
  } catch (e: any) {
    console.error('[Queue] enqueueBroadcastBulk failed:', e.message)
    return null
  }
}

// === GRACEFUL SHUTDOWN (for worker process) ===
export async function closeRedisConnection(): Promise<void> {
  if (_connection) {
    await _connection.quit()
    _connection = null
  }
}
