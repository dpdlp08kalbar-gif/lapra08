// LAPRA 08 - API: Auto-Survey Bridge (PILAR 1 - AI Early Warning)
// ============================================================
// POST /api/opinion-links/[id]/auto-survey
//   Trigger manual: konversi 1 berita (PublicOpinionLink) → draft EssayPoll
//
// PILAR 1 dari re-arsitektur Komunikasi & Command Center:
//   [Input Isu Berita] → [Validasi lewat Survei] → [Visualisasi] → [Aksi Broadcast]
//
// Trigger condition (validasi sebelum generate):
//   - sentiment = NEGATIVE
//   - priority = HIGH
//   - status != ARCHIVED
//   - Belum ada draft survei untuk opinionLink ini dalam 7 hari (dedup)
//
// Field mapping (berita → survei):
//   - opinionLink.title     → poll.sourceTopic
//   - opinionLink.content   → poll.sourceContent (truncated 1000 char)
//   - opinionLink.url       → poll.sourceUrl
//   - opinionLink.sentiment → poll.sourceSentiment
//   - opinionLink.category  → poll.targetOccupation (jika cocok)
//   - opinionLink.provinceCode → poll.provinceCode
//   - opinionLink.regencyCode  → poll.regencyCode
//
// Output:
//   - EssayPoll baru dengan status=DRAFT (perlu aktivasi manual admin)
//   - isAiGenerated=true
//   - territoryId = opinionLink reviewer (atau DPN pusat jika tidak ada)
//   - createdById = system user (pseudo) atau actor yang trigger
//
// RBAC:
//   - SUPERADMIN, ADMIN_DPN: bisa trigger untuk opinionLink manapun
//   - ADMIN_DPD: hanya untuk opinionLink di provinsinya
//   - ADMIN_DPC: hanya untuk opinionLink di kab/kotanya
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPNLevel, logAccess } from '@/lib/server-helpers'
import { aiGenerateEssayQuestionLLM } from '@/lib/ai-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Dedup window: 7 hari (jangan buat draft survei duplikat untuk isu yang sama)
const DEDUP_WINDOW_DAYS = 7
const DEDUP_WINDOW_MS = DEDUP_WINDOW_DAYS * 24 * 60 * 60 * 1000

// System user ID untuk audit log (pseudo-user "AI Early Warning System")
// Pakai ID user yang trigger sebagai createdById (lebih akuntabel)
// Tapi resourceLabel mencatat bahwa ini auto-generated

interface AutoSurveyResult {
  pollId: string
  pollTitle: string
  pollQuestion: string
  sourceOpinionLinkId: string
  sourceOpinionLinkTitle: string
  aiProvider: string
  deduped: boolean
}

// ============================================================
// Core function: generate draft survei dari 1 opinion link
// Dipakai oleh:
//   - POST /api/opinion-links/[id]/auto-survey (manual trigger)
//   - POST /api/opinion-links/auto-survey-batch (cron job)
// ============================================================
export async function generateAutoSurveyFromOpinion(
  opinionLink: any,
  actor: { id: string; role: string; fullName: string; territoryId: string },
  request?: NextRequest
): Promise<{ success: boolean; data?: AutoSurveyResult; error?: string; deduped?: boolean }> {
  try {
    // === Validasi trigger condition ===
    if (opinionLink.sentiment !== 'NEGATIVE') {
      return { success: false, error: `Trigger condition tidak terpenuhi: sentiment harus NEGATIVE (saat ini: ${opinionLink.sentiment})` }
    }
    if (opinionLink.priority !== 'HIGH') {
      return { success: false, error: `Trigger condition tidak terpenuhi: priority harus HIGH (saat ini: ${opinionLink.priority})` }
    }
    if (opinionLink.status === 'ARCHIVED') {
      return { success: false, error: 'Opinion link sudah diarsipkan, tidak bisa generate survei' }
    }

    // === Deduplication: cek apakah sudah ada draft survei untuk opinionLink ini dalam 7 hari ===
    // Cara cek: cari EssayPoll dengan sourceUrl === opinionLink.url DAN createdAt > 7 hari lalu
    const sevenDaysAgo = new Date(Date.now() - DEDUP_WINDOW_MS)
    const existingDraft = await db.essayPoll.findFirst({
      where: {
        sourceUrl: opinionLink.url,
        createdAt: { gt: sevenDaysAgo },
      },
      select: { id: true, title: true, status: true, createdAt: true },
    })
    if (existingDraft) {
      return {
        success: true,
        deduped: true,
        data: {
          pollId: existingDraft.id,
          pollTitle: existingDraft.title,
          pollQuestion: '', // tidak di-load untuk dedup
          sourceOpinionLinkId: opinionLink.id,
          sourceOpinionLinkTitle: opinionLink.title,
          aiProvider: 'dedup',
          deduped: true,
        },
      }
    }

    // === Field mapping ===
    const sourceTopic = opinionLink.title
    const sourceContent = (opinionLink.content || opinionLink.aiSummary || '').substring(0, 1000)
    const sourceUrl = opinionLink.url
    const sourceSentiment = opinionLink.sentiment

    // Determine targetScope dari opinionLink location
    let targetScope = 'NATIONAL'
    let provinceCode: string | null = opinionLink.provinceCode || null
    let regencyCode: string | null = opinionLink.regencyCode || null
    if (regencyCode) {
      targetScope = 'REGENCY'
    } else if (provinceCode) {
      targetScope = 'PROVINCE'
    }

    // === AI Generate pertanyaan ===
    let aiResult: any
    try {
      aiResult = await aiGenerateEssayQuestionLLM({
        sourceTopic,
        sourceContent,
        sourceUrl,
        detectedLocation: opinionLink.regencyName || opinionLink.provinceName,
        detectedSentiment: opinionLink.sentiment,
      })
    } catch (e: any) {
      console.error('[AutoSurvey] AI generate failed:', e.message)
      // Fallback: buat pertanyaan manual sederhana
      aiResult = {
        title: `Survei Opini: ${sourceTopic.substring(0, 80)}`,
        question: `Apa pendapat Anda tentang isu "${sourceTopic.substring(0, 100)}" yang sedang ramai dibicarakan? Mohon sampaikan pandangan Anda secara bebas dan jujur.`,
        description: `Survei ini di-generate otomatis dari monitoring berita (sentimen: ${sourceSentiment}). Tim admin akan mengaktifkan setelah review.`,
        approach: 'fallback',
        aiProvider: 'fallback',
      }
    }

    // === Tentukan territoryId & createdById ===
    // Pakai territory actor (lebih akuntabel)
    // Untuk scope NATIONAL, pakai territory DPN pusat ( Indonesia )
    let territoryId = actor.territoryId
    if (targetScope === 'NATIONAL') {
      // Cari territory DPN pusat (level=COUNTRY, code=ID)
      const pusat = await db.territory.findFirst({
        where: { level: 'COUNTRY', code: 'ID' },
        select: { id: true },
      })
      if (pusat) territoryId = pusat.id
    }

    // === Simpan EssayPoll ===
    const newPoll = await db.essayPoll.create({
      data: {
        title: aiResult.title,
        question: aiResult.question,
        description: aiResult.description || null,
        isAiGenerated: true,
        sourceTopic,
        sourceUrl,
        sourceSentiment,
        targetScope,
        provinceCode,
        regencyCode,
        // targetAgeGroup & targetOccupation dibiarkan null (admin isi manual saat review)
        status: 'DRAFT', // WAJIB DRAFT — perlu aktivasi manual admin (prinsip human-in-the-loop)
        // scheduledAt & closesAt dibiarkan null (admin isi manual)
        territoryId,
        createdById: actor.id,
      },
      select: { id: true, title: true, question: true },
    })

    // === Audit log ===
    await logAccess({
      actor: actor as any,
      action: 'CREATE',
      resource: 'SYSTEM_SETTING',
      resourceId: newPoll.id,
      resourceLabel: newPoll.title,
      request,
      detail: `Auto-survey dari opinion link "${opinionLink.title.substring(0, 60)}" (sentiment: ${sourceSentiment}, scope: ${targetScope})`,
    })

    return {
      success: true,
      data: {
        pollId: newPoll.id,
        pollTitle: newPoll.title,
        pollQuestion: newPoll.question,
        sourceOpinionLinkId: opinionLink.id,
        sourceOpinionLinkTitle: opinionLink.title,
        aiProvider: aiResult.aiProvider || 'llm',
        deduped: false,
      },
    }
  } catch (e: any) {
    console.error('[AutoSurvey] Error:', e)
    return { success: false, error: `Gagal generate auto-survey: ${e.message}` }
  }
}

// ============================================================
// POST /api/opinion-links/[id]/auto-survey — manual trigger
// ============================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params

    // Fetch opinion link
    const opinionLink = await db.publicOpinionLink.findUnique({
      where: { id },
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
    })
    if (!opinionLink) {
      return NextResponse.json({ success: false, error: 'Opinion link tidak ditemukan' }, { status: 404 })
    }

    // === RBAC: DPD/DPC hanya bisa trigger untuk opinionLink di wilayahnya ===
    if (!isDPNLevel(user.role)) {
      if (user.role === 'ADMIN_DPD' && opinionLink.provinceCode) {
        const userTerr = await db.territory.findUnique({
          where: { id: user.territoryId },
          select: { code: true, level: true },
        })
        if (userTerr?.level === 'PROVINCE' && userTerr.code !== opinionLink.provinceCode) {
          return NextResponse.json({ success: false, error: 'Akses ditolak. Opinion link di luar provinsi Anda.' }, { status: 403 })
        }
      } else if (user.role === 'ADMIN_DPC' && opinionLink.regencyCode) {
        const userTerr = await db.territory.findUnique({
          where: { id: user.territoryId },
          select: { code: true, level: true },
        })
        if (userTerr?.level === 'REGENCY' && userTerr.code !== opinionLink.regencyCode) {
          return NextResponse.json({ success: false, error: 'Akses ditolak. Opinion link di luar kab/kota Anda.' }, { status: 403 })
        }
      }
    }

    // === Generate auto-survey ===
    const actor = {
      id: user.id,
      role: user.role,
      fullName: user.fullName,
      territoryId: user.territoryId,
    }
    const result = await generateAutoSurveyFromOpinion(opinionLink, actor, request)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    const data = result.data!
    if (data.deduped) {
      return NextResponse.json({
        success: true,
        data,
        message: `Survei sudah ada untuk isu ini (dibuat ${DEDUP_WINDOW_DAYS} hari lalu). Tidak membuat duplikat.`,
      })
    }

    return NextResponse.json({
      success: true,
      data,
      message: `Draft survei "${data.pollTitle}" berhasil dibuat (status: DRAFT). Aktifkan manual di menu Survei & Polling.`,
    })
  } catch (e: any) {
    console.error('[AutoSurvey POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
