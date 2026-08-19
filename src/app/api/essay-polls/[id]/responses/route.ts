// LAPRA 08 - API: Essay Poll Responses (PUBLIC — no auth needed for submit)
// POST - Submit essay response (ANONYMOUS — no PII stored) + AI analysis
// Anti-spam: rate limit per IP hash + content validation
//
// === C2 FIX (Privacy Compliance UU PDP No. 27/2022) ===
// Sebelumnya: terima & simpan respondentName, respondentPhone, ipAddress (plaintext)
//   → Banner "anonim" berbohong, PII bisa di-trace ke individu
// Sekarang:
//   - respondentName & respondentPhone: TIDAK diterima dari body, hardcoded null
//   - ipAddress: hash SHA-256 + daily salt (tidak bisa reverse ke real IP)
//   - Response: hanya return field aman (no PII)
//   - Attacker yang POST dengan PII → PII di-ignore, tetap anonim
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  analyzeSentiment, calculatePriority, detectLocationFromDB,
  extractKeywords, aiAnalyzeEssayResponseLLM,
  checkRateLimit, detectSpam
} from '@/lib/ai-engine'
import { createHash } from 'crypto'
import {
  invalidateDecisionDashboardCache,
} from '@/app/api/decision-dashboard/route'
import { invalidateEssayPollsCache } from '../../route'

// Hash IP dengan daily salt — tidak bisa reverse ke real IP, tapi tetap konsisten
// untuk rate limit & analytics (mis. "IP ini submit 5x hari ini")
function hashIp(ip: string): string {
  const salt = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (daily rotation)
  const hashed = createHash('sha256').update(`${ip}:${salt}`).digest('hex')
  return `HASH:${hashed.substring(0, 32)}` // 32 char hex (cukup unik, hemat storage)
}

// POST - Submit essay response (public endpoint with rate limit + spam detection)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: pollId } = await params
    const poll = await db.essayPoll.findUnique({ where: { id: pollId } })
    if (!poll) return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })
    if (poll.status !== 'ACTIVE') return NextResponse.json({ success: false, error: 'Poll tidak aktif' }, { status: 400 })

    const body = await request.json()

    // === C2 FIX: Hanya accept field anonim ===
    // respondentName & respondentPhone DITOLAK (selalu null) — privacy compliance
    const { answer, ageGroup, gender, occupation, provinceCode, regencyCode, districtCode } = body

    // Catatan: jika client kirim respondentName/respondentPhone, kita ignore (no error)
    // Ini untuk mencegah attacker inject PII via API langsung

    // === Validasi jawaban (ESSAY only — pilihan ganda/likert dihapus) ===
    if (!answer || answer.trim().length < 10) {
      return NextResponse.json({ success: false, error: 'Jawaban minimal 10 karakter' }, { status: 400 })
    }
    const finalAnswer = answer.trim().substring(0, 5000)

    // === Anti-spam: rate limit per IP (pakai real IP untuk rate limit, bukan hash) ===
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     'unknown'
    const rateLimit = checkRateLimit(clientIp)
    if (!rateLimit.allowed) {
      const minutes = Math.ceil(rateLimit.resetInMs / 60000)
      return NextResponse.json({
        success: false,
        error: `Rate limit tercapai. Maks 5 respon per jam per IP. Coba lagi dalam ${minutes} menit.`,
      }, { status: 429 })
    }

    // === Anti-spam: content validation ===
    if (detectSpam(finalAnswer)) {
      return NextResponse.json({
        success: false,
        error: 'Jawaban terdeteksi sebagai spam. Mohon tulis jawaban yang substantif.',
      }, { status: 400 })
    }

    const wordCount = finalAnswer.trim().split(/\s+/).length

    // === AI ANALYSIS: rule-based lexicon (Z.AI removed, no external API berbayar) ===
    const lexiconSentiment = analyzeSentiment(finalAnswer)
    const lexiconPriority = calculatePriority(finalAnswer, wordCount, lexiconSentiment.sentiment)
    const loc = await detectLocationFromDB(finalAnswer)

    let finalSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = lexiconSentiment.sentiment
    let finalScore = lexiconPriority.urgencyScore
    let finalCategory = lexiconPriority.category
    let finalSummary = `Sentimen: ${lexiconSentiment.sentiment}. Kategori: ${lexiconPriority.category}. ${wordCount} kata. Urgency: ${lexiconPriority.urgencyScore}/100.`
    let finalKeywords = extractKeywords(finalAnswer)
    let aiProvider = 'lexicon'

    // Try rule-based LLM-like analysis (sesuai constraint no API berbayar)
    try {
      const llmResult = await aiAnalyzeEssayResponseLLM(finalAnswer, poll.question)
      finalSentiment = llmResult.sentiment as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
      finalScore = llmResult.score
      finalCategory = llmResult.category
      finalSummary = llmResult.summary
      finalKeywords = llmResult.keywords.length > 0 ? llmResult.keywords : finalKeywords
      aiProvider = 'rule-based'
    } catch (e: any) {
      console.error('[Essay Response] AI analysis failed, using lexicon:', e.message)
    }

    // === Simpan response (ANONYMOUS — no PII) ===
    const response = await db.essayResponse.create({
      data: {
        pollId,
        answer: finalAnswer,  // sudah di-substring di validateAnswerByPollType
        wordCount,
        // === C2 FIX: PII ditolak ===
        respondentName: null,    // hardcoded null (UI tidak minta, attacker tidak bisa inject)
        respondentPhone: null,   // hardcoded null
        ageGroup: ageGroup || null,
        gender: gender || null,
        occupation: occupation || null,
        provinceCode: provinceCode || loc.provinceCode || null,
        regencyCode: regencyCode || loc.regencyCode || null,
        districtCode: districtCode || null,
        aiSentiment: finalSentiment,
        aiScore: finalScore,
        aiCategory: finalCategory,
        aiSummary: finalSummary,
        aiKeywords: JSON.stringify({ keywords: finalKeywords, provider: aiProvider }),
        isProcessed: true,
        // === C2 FIX: Hash IP — tidak bisa reverse ke real IP ===
        // Format: HASH:<32-char-hex> + daily salt
        // Rate limit masih pakai real IP (di checkRateLimit), tapi storage pakai hash
        ipAddress: hashIp(clientIp),
      },
    })

    // === PILAR 2: Invalidate caches (static import, no dynamic overhead) ===
    try {
      invalidateDecisionDashboardCache()
    } catch (e) {
      console.warn('[Essay Response] Dashboard cache invalidation skipped:', (e as any).message)
    }
    try {
      invalidateEssayPollsCache()
    } catch (e) {
      console.warn('[Essay Response] Essay polls cache invalidation skipped:', (e as any).message)
    }
    // === FASE 3.4: Invalidate analytics cache juga (dashboard pakai analytics) ===
    try {
      const { invalidateAnalyticsCache } = await import('@/app/api/essay-polls/analytics/route')
      invalidateAnalyticsCache()
    } catch (e) {
      console.warn('[Essay Response] Analytics cache invalidation skipped:', (e as any).message)
    }

    // === C2 FIX: Return hanya field aman (no PII) ===
    return NextResponse.json({
      success: true,
      data: {
        id: response.id,
        pollId: response.pollId,
        wordCount: response.wordCount,
        aiSentiment: response.aiSentiment,
        aiScore: response.aiScore,
        aiCategory: response.aiCategory,
        aiSummary: response.aiSummary,
        // JANGAN return: respondentName, respondentPhone, ipAddress
      },
      message: `Terima kasih! Jawaban essay Anda (${wordCount} kata) telah dikirim & dianalisis AI (${aiProvider}). Sentimen: ${finalSentiment}, urgency: ${finalScore}/100.`,
      rateLimit: { remaining: rateLimit.remaining - 1, resetInMs: rateLimit.resetInMs },
    })
  } catch (e: any) {
    console.error('[Essay Response POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
