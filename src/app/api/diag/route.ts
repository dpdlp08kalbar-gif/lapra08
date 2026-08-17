// LAPRA 08 - API: Diagnostik deploy — untuk verifikasi versi yang aktif di Vercel
// GET /api/diag — public, no auth needed
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      runtime: process.env.NEXT_RUNTIME || 'nodejs',
      vercelEnv: process.env.VERCEL_ENV || 'local',
      vercelRegion: process.env.VERCEL_REGION || '-',
      vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || '-',
      vercelGitCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || '-',
      vercelGitCommitAuthor: process.env.VERCEL_GIT_COMMIT_AUTHOR || '-',
      // Marker untuk verifikasi deploy terbaru (update nilai kalau ada fix baru)
      deployMarker: '8ddb0cd-rollback-isDPO',
      dbUrl: process.env.DATABASE_URL ? 'set' : 'NOT SET',
    },
  })
}
