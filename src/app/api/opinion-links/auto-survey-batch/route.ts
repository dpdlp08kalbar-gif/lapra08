// LAPRA 08 - API: Auto-Survey Batch (PILAR 1 - AI Early Warning)
// ============================================================
// POST /api/opinion-links/auto-survey-batch
//   Cron job endpoint: proses semua opinion link yang memenuhi trigger condition
//   Dipanggil oleh Vercel Cron setiap 5 menit (atau manual trigger oleh admin DPN)
//
// Trigger condition (filter di DB):
//   - sentiment = NEGATIVE
//   - priority = HIGH
//   - status IN (NEW, REVIEWED)  — skip ADDRESSED & ARCHIVED
//   - Belum punya draft survei dalam 7 hari (dedup via sourceUrl check)
//
// Output:
//   - Array of generated drafts
//   - Stats: total processed, generated, deduped, skipped, errors
//
// Security:
//   - Hanya DPN/SUPERADMIN yang bisa trigger manual
//   - Cron trigger pakai CRON_SECRET header (Vercel env var)
//   - Limit max 10 opinion link per run (anti-overload)
//
// Cron config (vercel.json):
//   {
//     "crons": [
//       { "path": "/api/opinion-links/auto-survey-batch", "schedule": "*/5 * * * *" }
//     ]
//   }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPNLevel, logAccess } from '@/lib/server-helpers'
import { generateAutoSurveyFromOpinion } from '../[id]/auto-survey/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BATCH_SIZE = 10 // anti-overload: max 10 opinion link per run
const CRON_SECRET = process.env.CRON_SECRET // optional: jika set, cron harus kirim header ini

// System actor placeholder untuk cron job — TIDAK dipakai langsung sebagai createdById
// karena EssayPoll.createdById adalah FK ke User.id. Resolve ke SUPERADMIN real di handler.
const SYSTEM_ACTOR_PLACEHOLDER = {
  id: 'system-cron',  // placeholder, akan di-override
  role: 'SUPERADMIN',
  fullName: 'AI Early Warning System (Cron)',
  territoryId: '',
}

export async function POST(request: NextRequest) {
  try {
    // === Auth: cek apakah Vercel Cron atau user auth ===
    // Vercel Cron kirim header Authorization: Bearer <CRON_SECRET> otomatis (jika env var diset)
    // Atau manual header x-cron-secret untuk backward compat
    const authHeader = request.headers.get('authorization') || ''
    const cronSecretHeader = request.headers.get('x-cron-secret')
    const isCronCall = (CRON_SECRET && (
      authHeader === `Bearer ${CRON_SECRET}` ||
      cronSecretHeader === CRON_SECRET
    ))

    let actor: { id: string; role: string; fullName: string; territoryId: string } | null = null

    if (isCronCall) {
      // === C1 FIX: Cron job harus pakai SUPERADMIN real (FK constraint EssayPoll.createdById → User.id) ===
      // SYSTEM_ACTOR_PLACEHOLDER.id='system-cron' BUKAN user valid → Prisma akan throw FK violation
      // Resolve: cari SUPERADMIN aktif pertama di DB
      const admin = await db.user.findFirst({
        where: { role: 'SUPERADMIN', isActive: true },
        select: { id: true, fullName: true, territoryId: true },
      })
      if (!admin) {
        console.error('[AutoSurveyBatch] Tidak ada SUPERADMIN aktif di DB untuk menjadi creator auto-survey')
        return NextResponse.json({
          success: false,
          error: 'Tidak ada SUPERADMIN aktif di DB. Auto-survey cron butuh minimal 1 SUPERADMIN aktif sebagai creator.',
        }, { status: 500 })
      }
      actor = {
        id: admin.id,  // ← FK valid
        role: 'SUPERADMIN',
        fullName: `${admin.fullName} (via Cron)`,
        territoryId: admin.territoryId,
      }
    } else {
      // Manual trigger: harus login sebagai DPN/SUPERADMIN
      const user = await getUserFromRequest(request)
      if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      if (!isDPNLevel(user.role)) {
        return NextResponse.json({ success: false, error: 'Akses ditolak. Hanya admin DPN yang bisa trigger batch.' }, { status: 403 })
      }
      actor = {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        territoryId: user.territoryId,
      }
    }

    // === Fetch candidate opinion links ===
    // Filter: NEGATIVE + HIGH + (NEW or REVIEWED) + limit MAX_BATCH_SIZE
    const candidates = await db.publicOpinionLink.findMany({
      where: {
        sentiment: 'NEGATIVE',
        priority: 'HIGH',
        status: { in: ['NEW', 'REVIEWED'] },
      },
      select: {
        id: true,
        url: true,
        title: true,
        content: true,
        aiSummary: true,
        sentiment: true,
        priority: true,
        status: true,
        category: true,
        provinceCode: true,
        provinceName: true,
        regencyCode: true,
        regencyName: true,
      },
      orderBy: { urgencyScore: 'desc' }, // proses paling urgent dulu
      take: MAX_BATCH_SIZE,
    })

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        data: { generated: [], stats: { total: 0, generated: 0, deduped: 0, errors: 0 } },
        message: 'Tidak ada opinion link yang memenuhi trigger condition (NEGATIVE + HIGH).',
      })
    }

    // === Dedup batch: filter out opinion links yang sudah punya draft dalam 7 hari ===
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const existingDrafts = await db.essayPoll.findMany({
      where: {
        sourceUrl: { in: candidates.map(c => c.url) },
        createdAt: { gt: sevenDaysAgo },
      },
      select: { sourceUrl: true, id: true, title: true },
    })
    const existingUrlSet = new Set(existingDrafts.map(d => d.sourceUrl))

    // === Process each candidate ===
    const results: any[] = []
    let generatedCount = 0
    let dedupedCount = 0
    let errorCount = 0

    for (const candidate of candidates) {
      // Skip jika sudah ada draft (dedup)
      if (existingUrlSet.has(candidate.url)) {
        dedupedCount++
        results.push({
          opinionLinkId: candidate.id,
          opinionLinkTitle: candidate.title,
          status: 'deduped',
        })
        continue
      }

      // Resolve territoryId untuk actor
      // Kalau actor.territoryId kosong (mis. cron pakai SUPERADMIN tanpa territory),
      // fallback ke DPN pusat ( Indonesia )
      let territoryId = actor.territoryId
      if (!territoryId) {
        const pusat = await db.territory.findFirst({
          where: { level: 'COUNTRY', code: 'ID' },
          select: { id: true },
        })
        territoryId = pusat?.id || actor.territoryId
      }

      const result = await generateAutoSurveyFromOpinion(
        candidate,
        { ...actor, territoryId },
        request
      )

      if (result.success && result.data) {
        if (result.data.deduped) {
          dedupedCount++
          results.push({
            opinionLinkId: candidate.id,
            opinionLinkTitle: candidate.title,
            status: 'deduped',
          })
        } else {
          generatedCount++
          results.push({
            opinionLinkId: candidate.id,
            opinionLinkTitle: candidate.title,
            status: 'generated',
            pollId: result.data.pollId,
            pollTitle: result.data.pollTitle,
          })
        }
      } else {
        errorCount++
        results.push({
          opinionLinkId: candidate.id,
          opinionLinkTitle: candidate.title,
          status: 'error',
          error: result.error,
        })
      }
    }

    // === Audit log untuk batch run ===
    await logAccess({
      actor: actor as any,
      action: 'CREATE',
      resource: 'SYSTEM_SETTING',
      resourceId: 'auto-survey-batch',
      resourceLabel: `Batch auto-survey run (${generatedCount} generated, ${dedupedCount} deduped, ${errorCount} errors)`,
      request,
      detail: `Cron run: ${candidates.length} candidates, ${generatedCount} new drafts, ${dedupedCount} deduped`,
    })

    return NextResponse.json({
      success: true,
      data: {
        generated: results.filter(r => r.status === 'generated'),
        deduped: results.filter(r => r.status === 'deduped'),
        errors: results.filter(r => r.status === 'error'),
      },
      stats: {
        total: candidates.length,
        generated: generatedCount,
        deduped: dedupedCount,
        errors: errorCount,
      },
      message: `Batch selesai: ${generatedCount} draft survei baru, ${dedupedCount} dedup, ${errorCount} error.`,
    })
  } catch (e: any) {
    console.error('[AutoSurveyBatch POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// GET endpoint untuk health check / status preview (tanpa generate)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const candidates = await db.publicOpinionLink.findMany({
      where: {
        sentiment: 'NEGATIVE',
        priority: 'HIGH',
        status: { in: ['NEW', 'REVIEWED'] },
      },
      select: {
        id: true,
        title: true,
        sentiment: true,
        priority: true,
        urgencyScore: true,
        provinceName: true,
        regencyName: true,
        url: true,
      },
      orderBy: { urgencyScore: 'desc' },
      take: MAX_BATCH_SIZE,
    })

    // Cek dedup status untuk setiap candidate
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const existingDrafts = await db.essayPoll.findMany({
      where: {
        sourceUrl: { in: candidates.map(c => c.url) },
        createdAt: { gt: sevenDaysAgo },
      },
      select: { sourceUrl: true },
    })
    const existingUrlSet = new Set(existingDrafts.map(d => d.sourceUrl))

    const preview = candidates.map(c => ({
      ...c,
      alreadyHasDraft: existingUrlSet.has(c.url),
    }))

    return NextResponse.json({
      success: true,
      data: preview,
      stats: {
        total: preview.length,
        readyToGenerate: preview.filter(p => !p.alreadyHasDraft).length,
        deduped: preview.filter(p => p.alreadyHasDraft).length,
      },
      message: `${preview.length} kandidat ditemukan (${preview.filter(p => !p.alreadyHasDraft).length} siap generate)`,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
