// LAPRA 08 - API: AI Essay Poll Suggestions (preview, no save)
// POST - Generate 4-6 varian pertanyaan essay yang bisa dipilih user
// Body: { sourceTopic, sourceContent?, sourceUrl? }
// Returns: array of questions dengan approach berbeda (direct/comparative/solution/emotional/analytical)
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/server-helpers'
import {
  analyzeSentiment, detectLocationFromDB,
  aiGenerateMultipleEssayQuestionsLLM, generateMultipleEssayQuestionsTemplate
} from '@/lib/ai-engine'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { sourceTopic, sourceContent, sourceUrl, count } = body
    if (!sourceTopic && !sourceContent) {
      return NextResponse.json({ success: false, error: 'sourceTopic atau sourceContent wajib' }, { status: 400 })
    }

    const text = `${sourceTopic || ''} ${sourceContent || ''}`
    const sentimentResult = analyzeSentiment(text)
    const loc = await detectLocationFromDB(text)

    // Deteksi demografi target
    let detectedOccupation = 'UMUM'
    if (/\b(pupuk|petani|sawah|panen|gabah|beras|pertanian|tani)\b/i.test(text)) detectedOccupation = 'PETANI'
    else if (/\b(nelayan|tangkapan|ikan|solar|pantai|laut|perikanan)\b/i.test(text)) detectedOccupation = 'NELAYAN'
    else if (/\b(umkm|usaha kecil|modal usaha|pelaku usaha|warung|toko|dagang)\b/i.test(text)) detectedOccupation = 'UMKM'
    else if (/\b(pelajar|mahasiswa|sekolah|kuliah|beasiswa|pendidikan|guru)\b/i.test(text)) detectedOccupation = 'PELAJAR'

    const locName = loc.regencyName || loc.provinceName || 'Indonesia'

    // Try AI generate (rule-based template, Z.AI removed per constraint)
    let questions: any[] = []
    let aiProvider = 'rule-based'  // H3 FIX: label akurat
    let llmError: string | null = null

    try {
      const llmResult = await aiGenerateMultipleEssayQuestionsLLM({
        sourceTopic: sourceTopic || sourceContent?.substring(0, 200) || 'isu terkini',
        sourceContent,
        sourceUrl,
        detectedLocation: locName,
        detectedOccupation,
        detectedSentiment: sentimentResult.sentiment,
        count: count || 5,
      })
      questions = llmResult.questions
    } catch (e: any) {
      console.error('[LLM] Multiple questions failed, using template fallback:', e.message)
      llmError = e.message
      questions = generateMultipleEssayQuestionsTemplate({
        sourceTopic: sourceTopic || 'isu terkini',
        detectedLocation: locName,
        detectedOccupation,
        detectedSentiment: sentimentResult.sentiment,
      })
      aiProvider = 'template'
    }

    return NextResponse.json({
      success: true,
      data: {
        questions,
        detectedLocation: locName,
        detectedOccupation,
        detectedSentiment: sentimentResult.sentiment,
        aiProvider,
        llmError,
      },
      message: `${questions.length} varian pertanyaan AI di-generate via ${aiProvider}. Lokasi: ${locName}. Target: ${detectedOccupation}. Sentimen: ${sentimentResult.sentiment}. Pilih satu untuk dibuat poll.`,
    })
  } catch (e: any) {
    console.error('[AI Suggestions POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
