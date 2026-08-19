// LAPRA 08 - API: Surveyor Feed (JSON feed untuk HP Surveyor)
// ============================================================
// Endpoint ini diakses oleh aplikasi HP surveyor di lapangan untuk:
//   1. Pull daftar survei aktif yang ditugaskan ke surveyor
//   2. POST untuk record sync event + kirim respon survei
//
// URL format: /api/surveyor-feed/[userId]
//
// Keamanan:
//   - Endpoint publik (tidak perlu x-user-id header)
//   - Tapi userId harus terdaftar sebagai surveyor aktif
//   - Rate limit alami: hanya surveyor terdaftar yang dapat data
//
// Response GET:
//   {
//     success: true,
//     data: {
//       surveyor: { ... },
//       activeSurveys: [...],
//       lastSyncAt,
//       serverTime,
//       feedVersion: '1.0',
//     }
//   }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAccess } from '@/lib/server-helpers'
import {
  analyzeSentiment, calculatePriority, detectLocationFromDB,
  extractKeywords, aiAnalyzeEssayResponseLLM,
  detectSpam,
} from '@/lib/ai-engine'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SETTING_KEY = 'surveyor_assignments'
const SETTING_CATEGORY = 'SURVEYOR'

// === FASE 0.6: Rate limit khusus surveyor (per userId + IP) ===
const _surveyorRateLimit: Map<string, { count: number; windowStart: number }> = new Map()
const SURVEYOR_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 jam
const SURVEYOR_RATE_LIMIT_MAX = 30

function checkSurveyorRateLimit(key: string): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now()
  const record = _surveyorRateLimit.get(key)
  if (record && (now - record.windowStart) > SURVEYOR_RATE_LIMIT_WINDOW_MS) {
    _surveyorRateLimit.delete(key)
  }
  const current = _surveyorRateLimit.get(key) || { count: 0, windowStart: now }
  current.count++
  if (current.count > SURVEYOR_RATE_LIMIT_MAX) {
    const resetInMs = SURVEYOR_RATE_LIMIT_WINDOW_MS - (now - current.windowStart)
    return { allowed: false, remaining: 0, resetInMs }
  }
  _surveyorRateLimit.set(key, current)
  const remaining = SURVEYOR_RATE_LIMIT_MAX - current.count
  const resetInMs = SURVEYOR_RATE_LIMIT_WINDOW_MS - (now - current.windowStart)
  return { allowed: true, remaining, resetInMs }
}

// === FASE 0.6: Validasi enum respondentInfo ===
const VALID_AGE_GROUPS = ['18-25', '26-35', '36-50', '51+']
const VALID_GENDERS = ['LAKI-LAKI', 'PEREMPUAN']
const VALID_OCCUPATIONS = [
  'PETANI', 'NELAYAN', 'UMKM', 'PELAJAR', 'MAHASISWA', 'GURU', 'PNS',
  'TNI_POLRI', 'PEDAGANG', 'BURUH', 'SWASTA', 'IRT', 'LAINNYA',
]

function validateRespondentInfo(info: any): { valid: boolean; error?: string; cleaned?: any } {
  if (!info) return { valid: true, cleaned: {} }
  if (info.ageGroup && !VALID_AGE_GROUPS.includes(info.ageGroup)) {
    return { valid: false, error: `ageGroup tidak valid. Harus salah satu: ${VALID_AGE_GROUPS.join(', ')}` }
  }
  if (info.gender && !VALID_GENDERS.includes(info.gender)) {
    return { valid: false, error: `gender tidak valid. Harus salah satu: ${VALID_GENDERS.join(', ')}` }
  }
  if (info.occupation && !VALID_OCCUPATIONS.includes(info.occupation)) {
    return { valid: false, error: `occupation tidak valid. Harus salah satu: ${VALID_OCCUPATIONS.join(', ')}` }
  }
  return {
    valid: true,
    cleaned: {
      ageGroup: info.ageGroup || null,
      gender: info.gender || null,
      occupation: info.occupation || null,
      provinceCode: info.provinceCode || null,
      regencyCode: info.regencyCode || null,
      districtCode: info.districtCode || null,
    },
  }
}

interface SurveyorAssignment {
  id: string
  userId: string
  fullName: string
  phone: string | null
  territoryIds: string[]
  territoryNames: string[]
  assignedPollIds: string[]
  isActive: boolean
  deviceInfo?: { userAgent?: string; platform?: string; lastSeen?: string }
  lastSyncAt?: string
  responsesCount: number
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

async function loadAssignments(): Promise<SurveyorAssignment[]> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: SETTING_KEY },
      select: { value: true },
    })
    if (!setting) return []
    const parsed = JSON.parse(setting.value)
    if (!Array.isArray(parsed)) return []
    return parsed as SurveyorAssignment[]
  } catch {
    return []
  }
}

async function saveAssignments(items: SurveyorAssignment[]): Promise<void> {
  const value = JSON.stringify(items)
  await db.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value, category: 'SURVEYOR', description: 'Surveyor assignments (akun + wilayah + survei yang ditugaskan)' },
    create: {
      key: SETTING_KEY,
      value,
      category: 'SURVEYOR',
      description: 'Surveyor assignments (akun + wilayah + survei yang ditugaskan)',
    },
  })
}

// GET /api/surveyor-feed/[userId] — pull feed
// PUBLIC endpoint (tidak perlu x-user-id header) — surveyor akses via URL unik
// Next.js 16: params adalah Promise, harus di-await
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    if (!userId) return NextResponse.json({ success: false, error: 'userId wajib' }, { status: 400 })

    const items = await loadAssignments()
    const assignment = items.find(a => a.userId === userId)

    if (!assignment) {
      return NextResponse.json({
        success: false,
        error: 'Anda belum terdaftar sebagai surveyor. Hubungi admin DPN/DPD untuk pendaftaran.',
      }, { status: 403 })
    }

    if (!assignment.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Akun surveyor Anda dinonaktifkan. Hubungi admin.',
      }, { status: 403 })
    }

    // Update lastSyncAt & deviceInfo
    const now = new Date().toISOString()
    const userAgent = request.headers.get('user-agent') || undefined
    assignment.lastSyncAt = now
    assignment.deviceInfo = {
      userAgent: userAgent?.substring(0, 500),
      platform: assignment.deviceInfo?.platform,
      lastSeen: now,
    }
    assignment.updatedAt = now
    const idx = items.findIndex(a => a.id === assignment.id)
    items[idx] = assignment
    await saveAssignments(items)

    // Fetch active surveys untuk surveyor ini
    const activePolls = assignment.assignedPollIds.length > 0
      ? await db.essayPoll.findMany({
          where: {
            id: { in: assignment.assignedPollIds },
            status: 'ACTIVE',
          },
          select: {
            id: true,
            title: true,
            question: true,
            description: true,
            targetScope: true,
            targetAgeGroup: true,
            targetOccupation: true,
            provinceCode: true,
            regencyCode: true,
            closesAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : []

    return NextResponse.json({
      success: true,
      data: {
        surveyor: {
          id: assignment.id,
          userId: assignment.userId,
          fullName: assignment.fullName,
          // === C3 FIX: Mask phone untuk privacy (sebelumnya: plaintext) ===
          // Format: 0812****1234 — cukup untuk identifikasi, tidak expose nomor lengkap
          // Endpoint ini PUBLIC (no auth), siapa saja dengan URL bisa lihat
          phoneMasked: assignment.phone
            ? assignment.phone.replace(/(\d{4})\d{4,}(\d{4})/, '$1****$2')
            : null,
          territoryNames: assignment.territoryNames,
          notes: assignment.notes,
          responsesCount: assignment.responsesCount,
        },
        activeSurveys: activePolls.map(p => ({
          ...p,
          // Hint untuk HP surveyor: ini poll tipe essay (model saat ini hanya essay)
          pollType: 'ESSAY',
          expiresAt: p.closesAt,
        })),
        lastSyncAt: now,
        serverTime: now,
        feedVersion: '1.0',
      },
      message: `Sync berhasil. ${activePolls.length} survei aktif menunggu.`,
    })
  } catch (e: any) {
    console.error('[SurveyorFeed GET] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal sync: ${e.message}` }, { status: 500 })
  }
}

// POST /api/surveyor-feed/[userId] — submit response from surveyor
// Body: {
//   pollId,
//   answer,                    // jawaban essay
//   respondentInfo?: {
//     ageGroup?,               // 18-25 | 26-35 | 36-50 | 51+
//     gender?,                 // LAKI-LAKI | PEREMPUAN
//     occupation?,             // PETANI | NELAYAN | UMKM | PELAJAR | etc
//     provinceCode?,
//     regencyCode?,
//     districtCode?,
//   }
// }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    if (!userId) return NextResponse.json({ success: false, error: 'userId wajib' }, { status: 400 })

    const items = await loadAssignments()
    const assignment = items.find(a => a.userId === userId)
    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Bukan surveyor terdaftar' }, { status: 403 })
    }
    if (!assignment.isActive) {
      return NextResponse.json({ success: false, error: 'Akun surveyor nonaktif' }, { status: 403 })
    }

    const body = await request.json()
    const { pollId, answer, respondentInfo } = body
    if (!pollId) return NextResponse.json({ success: false, error: 'Field wajib: pollId' }, { status: 400 })
    if (!answer || typeof answer !== 'string' || answer.trim().length < 10) {
      return NextResponse.json({ success: false, error: 'Field wajib: answer (minimal 10 karakter)' }, { status: 400 })
    }

    // === FASE 0.6: Validasi enum respondentInfo ===
    const infoValidation = validateRespondentInfo(respondentInfo)
    if (!infoValidation.valid) {
      return NextResponse.json({ success: false, error: infoValidation.error }, { status: 400 })
    }
    const cleanedInfo = infoValidation.cleaned

    // === FASE 0.6: Spam detection ===
    if (detectSpam(answer)) {
      return NextResponse.json({
        success: false,
        error: 'Jawaban terdeteksi sebagai spam. Mohon tulis jawaban yang substantif.',
      }, { status: 400 })
    }

    // === FASE 0.6: Rate limit per (surveyor userId + IP) ===
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `surveyor:${userId}:${clientIp}`
    const rateLimit = checkSurveyorRateLimit(rateLimitKey)
    if (!rateLimit.allowed) {
      const minutes = Math.ceil(rateLimit.resetInMs / 60000)
      return NextResponse.json({
        success: false,
        error: `Rate limit tercapai. Maks 30 respon per jam per surveyor. Coba lagi dalam ${minutes} menit.`,
      }, { status: 429 })
    }

    // Cek poll exists & aktif
    const poll = await db.essayPoll.findUnique({
      where: { id: pollId },
      select: { id: true, status: true, title: true, question: true },
    })
    if (!poll) return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })
    if (poll.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, error: `Poll status: ${poll.status}. Tidak menerima respon.` }, { status: 400 })
    }

    // Cek apakah surveyor ditugaskan untuk poll ini
    if (!assignment.assignedPollIds.includes(pollId)) {
      return NextResponse.json({ success: false, error: 'Anda tidak ditugaskan untuk poll ini' }, { status: 403 })
    }

    // Hitung word count
    const wordCount = answer.trim().split(/\s+/).filter(Boolean).length

    // === FASE 0.6: AI ANALYSIS (lexicon + LLM fallback) — sama seperti public endpoint ===
    // Tanpa ini, field responses tidak masuk ke sentimen stats di dashboard (Critical #7 dari audit)
    const lexiconSentiment = analyzeSentiment(answer)
    const lexiconPriority = calculatePriority(answer, wordCount, lexiconSentiment.sentiment)
    const loc = await detectLocationFromDB(answer)

    let finalSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = lexiconSentiment.sentiment
    let finalScore = lexiconPriority.urgencyScore
    let finalCategory = lexiconPriority.category
    let finalSummary = `Sentimen: ${lexiconSentiment.sentiment}. Kategori: ${lexiconPriority.category}. ${wordCount} kata. Urgency: ${lexiconPriority.urgencyScore}/100.`
    let finalKeywords = extractKeywords(answer)
    let aiProvider = 'lexicon'

    // Try LLM for deeper analysis (fallback ke lexicon jika gagal)
    try {
      const llmResult = await aiAnalyzeEssayResponseLLM(answer, poll.question)
      finalSentiment = llmResult.sentiment as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
      finalScore = llmResult.score
      finalCategory = llmResult.category
      finalSummary = llmResult.summary
      finalKeywords = llmResult.keywords.length > 0 ? llmResult.keywords : finalKeywords
      // === H3 FIX: Label akurat — rule-based, bukan 'llm' ===
      // aiAnalyzeEssayResponseLLM pakai rule-based lexicon (Z.AI removed per constraint no API berbayar)
      aiProvider = 'rule-based'
    } catch (e: any) {
      console.error('[SurveyorFeed] LLM analysis failed, using lexicon:', e.message)
    }

    // Simpan response dengan AI analysis lengkap
    await db.essayResponse.create({
      data: {
        pollId,
        answer: answer.substring(0, 5000),
        wordCount,
        // Identitas responden — anonim untuk PDP compliance
        respondentName: null,
        respondentPhone: null,
        ageGroup: cleanedInfo.ageGroup,
        gender: cleanedInfo.gender,
        occupation: cleanedInfo.occupation,
        provinceCode: cleanedInfo.provinceCode || loc.provinceCode || null,
        regencyCode: cleanedInfo.regencyCode || loc.regencyCode || null,
        districtCode: cleanedInfo.districtCode,
        // AI analysis fields
        aiSentiment: finalSentiment,
        aiScore: finalScore,
        aiCategory: finalCategory,
        aiSummary: finalSummary,
        aiKeywords: JSON.stringify({ keywords: finalKeywords, provider: aiProvider }),
        isProcessed: true,
        // Tandai channel sebagai field surveyor (pakai ipAddress field)
        ipAddress: `FIELD:${assignment.id}`,
      },
    })

    // Update counter surveyor
    const idx = items.findIndex(a => a.id === assignment.id)
    items[idx].responsesCount = (items[idx].responsesCount || 0) + 1
    items[idx].updatedAt = new Date().toISOString()
    await saveAssignments(items)

    // === PILAR 2: Invalidate caches agar dashboard & list auto-refresh ===
    try {
      const { invalidateDecisionDashboardCache } = await import('@/app/api/decision-dashboard/route')
      invalidateDecisionDashboardCache()
    } catch (e) {
      console.warn('[SurveyorFeed] Dashboard cache invalidation skipped:', (e as any).message)
    }
    try {
      const { invalidateEssayPollsCache } = await import('@/app/api/essay-polls/route')
      invalidateEssayPollsCache()
    } catch (e) {
      console.warn('[SurveyorFeed] Essay polls cache invalidation skipped:', (e as any).message)
    }

    // === FASE 0.5: Audit log ===
    // Buat pseudo-actor untuk surveyor (logAccess butuh field 'id', 'role', 'fullName', 'territory')
    await logAccess({
      actor: {
        id: assignment.userId,
        role: 'SURVEYOR' as any,
        fullName: assignment.fullName,
        territory: { code: assignment.territoryNames[0] || 'FIELD' } as any,
      } as any,
      action: 'CREATE',
      resource: 'SYSTEM_SETTING',
      resourceId: pollId,
      resourceLabel: poll.title,
      request,
      detail: `Surveyor submit response (${wordCount} kata, sentimen: ${finalSentiment}, ${aiProvider})`,
    })

    return NextResponse.json({
      success: true,
      data: {
        pollId,
        pollTitle: poll.title,
        responsesCount: items[idx].responsesCount,
        aiSentiment: finalSentiment,
        aiProvider,
      },
      message: `Respon berhasil dikirim & dianalisis AI (${aiProvider}). Sentimen: ${finalSentiment}.`,
      rateLimit: { remaining: rateLimit.remaining - 1, resetInMs: rateLimit.resetInMs },
    })
  } catch (e: any) {
    console.error('[SurveyorFeed POST] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal kirim respon: ${e.message}` }, { status: 500 })
  }
}
