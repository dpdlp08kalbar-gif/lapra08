// LAPRA 08 - API: Background Jobs management
// GET - List all background jobs + run due jobs
// POST - Create/update/toggle jobs
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { runScheduledJobs, initializeDefaultJobs } from '@/lib/agent-orchestrator'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  await initializeDefaultJobs()
  const jobs = await db.backgroundJob.findMany({ orderBy: { nextRunAt: 'asc' } })

  // Run due jobs in background (non-blocking)
  runScheduledJobs().catch(e => console.error('[Jobs API] Background run failed:', e.message))

  return NextResponse.json({ success: true, data: jobs })
}

// POST - toggle job active, run job immediately, or create new job
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    return NextResponse.json({ success: false, error: 'Hanya DPN/Superadmin' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action, jobId, jobType, jobName, intervalMinutes } = body

    if (action === 'toggle' && jobId) {
      const job = await db.backgroundJob.findUnique({ where: { id: jobId } })
      if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
      const updated = await db.backgroundJob.update({
        where: { id: jobId },
        data: { isActive: !job.isActive },
      })
      return NextResponse.json({ success: true, data: updated, message: `Job ${updated.isActive ? 'activated' : 'paused'}` })
    }

    if (action === 'run_now' && jobId) {
      // Trigger immediately by setting nextRunAt to now
      await db.backgroundJob.update({
        where: { id: jobId },
        data: { nextRunAt: new Date() },
      })
      // Run in background
      runScheduledJobs().catch(e => console.error('[Jobs API] Manual run failed:', e.message))
      return NextResponse.json({ success: true, message: 'Job triggered to run now' })
    }

    if (action === 'create' && jobType && jobName) {
      const job = await db.backgroundJob.create({
        data: {
          jobType,
          jobName,
          intervalMinutes: intervalMinutes || 60,
          nextRunAt: new Date(Date.now() + (intervalMinutes || 60) * 60 * 1000),
        },
      })
      return NextResponse.json({ success: true, data: job, message: 'Job created' })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
