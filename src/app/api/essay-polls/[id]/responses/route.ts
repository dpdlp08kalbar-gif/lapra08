// LAPRA 08 - API: Essay Poll Responses (PUBLIC — no auth needed for submit)
// POST - Submit essay response (anonymous or with optional identity)
// PUT - Re-analyze responses with AI
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { analyzeSentiment, calculatePriority, detectLocation } from '@/lib/social-scraper'

// POST - Submit essay response (public endpoint)
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

    const wordCount = answer.trim().split(/\s+/).length

    // === AI auto-analyze the answer ===
    const sentimentResult = analyzeSentiment(answer)
    const priorityResult = calculatePriority(answer, wordCount, sentimentResult.sentiment)
    const loc = detectLocation(answer)

    const response = await db.essayResponse.create({
      data: {
        pollId,
        respondentName: respondentName || null,
        respondentPhone: respondentPhone || null,
        ageGroup: ageGroup || null,
        gender: gender || null,
        occupation: occupation || null,
        provinceCode: provinceCode || loc.provinceCode || null,
        regencyCode: regencyCode || loc.regencyCode || null,
        districtCode: districtCode || null,
        answer: answer.substring(0, 5000),
        wordCount,
        aiSentiment: sentimentResult.sentiment,
        aiScore: priorityResult.urgencyScore,
        aiCategory: priorityResult.category,
        aiSummary: `Sentimen: ${sentimentResult.sentiment}. Kategori: ${priorityResult.category}. ${wordCount} kata. Urgency: ${priorityResult.urgencyScore}/100.`,
        aiKeywords: JSON.stringify({ keywords: extractKeywords(answer) }),
        isProcessed: true,
        ipAddress: request.headers.get('x-forwarded-for') || null,
      },
    })

    return NextResponse.json({
      success: true,
      data: response,
      message: 'Terima kasih! Jawaban essay Anda telah dikirim dan dianalisis AI.',
    })
  } catch (e: any) {
    console.error('[Essay Response POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'dengan', 'atau', 'ini', 'itu', 'saya', 'kita', 'kami', 'mereka', 'akan', 'telah', 'sudah', 'belum', 'tidak', 'ada', 'juga', 'lebih', 'sangat', 'agar', 'supaya', 'karena', 'sebab', 'jika', 'kalau', 'apabila', 'bila', 'tetapi', 'namun', 'melainkan', 'sedangkan', 'padahal', 'sehingga', 'maka', 'karenanya', 'dengan', 'tanpa', 'dalam', 'pada', 'atas', 'bawah', 'depan', 'belakang', 'samping'])
  const words = text.toLowerCase().match(/\b[a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿāăąćĉċčďđēĕėęěĝğğĥīĭįıĵķĺļľņōŏőœŕŗřśŝşšţťŧūŭůűųŵŷźżž]{3,}\b/g) || []
  const freq: Record<string, number> = {}
  for (const w of words) {
    if (!stopWords.has(w)) {
      freq[w] = (freq[w] || 0) + 1
    }
  }
  return Object.entries(freq).sort(([, a], [, b]) => b - a).slice(0, 10).map(([w]) => w)
}
