// LAPRA 08 - API: Essay Poll Responses (PUBLIC — no auth needed for submit)
// POST - Submit essay response (anonymous or with optional identity) + AI analysis via LLM
// Anti-spam: rate limit per IP + content validation
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  analyzeSentiment, calculatePriority, detectLocationFromDB,
  extractKeywords, aiAnalyzeEssayResponseLLM,
  checkRateLimit, detectSpam
} from '@/lib/ai-engine'

// POST - Submit essay response (public endpoint with rate limit + spam detection)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: pollId } = await params
    const poll = await db.essayPoll.findUnique({ where: { id: pollId } })
    if (!poll) return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })
    if (poll.status !== 'ACTIVE') return NextResponse.json({ success: false, error: 'Poll tidak aktif' }, { status: 400 })

    const body = await request.json()
    const { answer, respondentName, respondentPhone, ageGroup, gender, occupation, provinceCode, regencyCode, districtCode } = body

    if (!answer || answer.trim().length < 10) {
      return NextResponse.json({ success: false, error: 'Jawaban minimal 10 karakter' }, { status: 400 })
    }

    // === Anti-spam: rate limit per IP ===
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
    if (detectSpam(answer)) {
      return NextResponse.json({
        success: false,
        error: 'Jawaban terdeteksi sebagai spam. Mohon tulis jawaban yang substantif.',
      }, { status: 400 })
    }

    const wordCount = answer.trim().split(/\s+/).length

    // === AI ANALYSIS: LLM-first, lexicon fallback ===
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
      aiProvider = 'llm'
    } catch (e: any) {
      console.error('[LLM] Essay response analysis failed, using lexicon:', e.message)
    }

    const response = await db.essayResponse.create({
      data: {
        pollId,
        respondentName: respondentName?.trim() || null,
        respondentPhone: respondentPhone?.trim() || null,
        ageGroup: ageGroup || null,
        gender: gender || null,
        occupation: occupation || null,
        provinceCode: provinceCode || loc.provinceCode || null,
        regencyCode: regencyCode || loc.regencyCode || null,
        districtCode: districtCode || null,
        answer: answer.substring(0, 5000),
        wordCount,
        aiSentiment: finalSentiment,
        aiScore: finalScore,
        aiCategory: finalCategory,
        aiSummary: finalSummary,
        aiKeywords: JSON.stringify({ keywords: finalKeywords, provider: aiProvider }),
        isProcessed: true,
        ipAddress: clientIp,
      },
    })

    // === PILAR 2: Invalidate dashboard cache agar dashboard auto-refresh ===
    // Saat respon survei baru masuk → dashboard sentimen & elektabilitas harus update
    try {
      const { invalidateDecisionDashboardCache } = await import('@/app/api/decision-dashboard/route')
      invalidateDecisionDashboardCache()
    } catch (e) {
      console.warn('[Essay Response] Dashboard cache invalidation skipped:', (e as any).message)
    }

    // === PILAR 2: Invalidate essay-polls list cache juga ===
    try {
      const { invalidateEssayPollsCache } = await import('../../route')
      invalidateEssayPollsCache()
    } catch (e) {
      console.warn('[Essay Response] Essay polls cache invalidation skipped:', (e as any).message)
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Terima kasih! Jawaban essay Anda (${wordCount} kata) telah dikirim & dianalisis AI (${aiProvider}). Sentimen: ${finalSentiment}, urgency: ${finalScore}/100.`,
      rateLimit: { remaining: rateLimit.remaining - 1, resetInMs: rateLimit.resetInMs },
    })
  } catch (e: any) {
    console.error('[Essay Response POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
