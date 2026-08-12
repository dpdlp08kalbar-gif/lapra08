// LAPRA 08 - API: Multi-Agent System Status
// GET /api/agents/status - Get status of all AI Agents + recent logs + sync events
// POST /api/agents/status - Trigger orchestrator pipeline manually
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { getAllAgentsStatus, agents, initializeDefaultJobs } from '@/lib/agent-orchestrator'

// 30-second in-memory cache to avoid hammering the DB on every render
let _cache: { ts: number; data: any } | null = null
const CACHE_TTL_MS = 30 * 1000

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  // Return cached data if fresh (subsequent tab clicks within 30s)
  if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, data: _cache.data, cached: true })
  }

  try {
    // Run init in background — don't block the response
    initializeDefaultJobs().catch(() => {})

    const [status, jobs] = await Promise.all([
      getAllAgentsStatus(),
      db.backgroundJob.findMany({
        orderBy: { nextRunAt: 'asc' },
        select: { id: true, jobType: true, jobName: true, intervalMinutes: true, isActive: true, lastRunAt: true, lastStatus: true, lastError: true, nextRunAt: true },
      }),
    ])

    const data = { ...status, jobs, timestamp: new Date().toISOString() }
    _cache = { ts: Date.now(), data }

    return NextResponse.json({ success: true, data, cached: false })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST - trigger orchestrator pipeline (scrape + recompute trust + sync)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    return NextResponse.json({ success: false, error: 'Hanya DPN/Superadmin' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { agent } = body

    if (agent === 'scraper') {
      const result = await agents.scraper.execute({ triggerSource: 'manual' })
      // Auto-trigger trust index recompute after scrape
      const trustResult = await agents.trustIndex.execute({ triggerSource: 'scraper-trigger' })
      return NextResponse.json({ success: true, data: { scraped: result, trustRecomputed: trustResult }, message: 'Scraper agent + trust index recompute completed' })
    }
    if (agent === 'trust') {
      const result = await agents.trustIndex.execute({ triggerSource: 'manual' })
      return NextResponse.json({ success: true, data: result, message: 'Trust index recomputed' })
    }
    if (agent === 'orchestrator') {
      const result = await agents.orchestrator.execute({ triggerSource: 'manual' })
      return NextResponse.json({ success: true, data: result, message: 'Full orchestrator pipeline completed' })
    }

    return NextResponse.json({ success: false, error: 'Invalid agent. Use: scraper | trust | orchestrator' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
