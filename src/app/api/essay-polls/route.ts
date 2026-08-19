// LAPRA 08 - API: Essay Polls (LLM-powered AI)
// GET - List polls (with RBAC)
// POST - Create new essay poll (manual OR AI-generated via LLM)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import {
  analyzeSentiment, detectLocationFromDB, aiGenerateEssayQuestionLLM
} from '@/lib/ai-engine'

// 30-second cache per user (essay polls list rarely changes within 30s)
const _cache = new Map<string, { ts: number; data: any }>()
const CACHE_TTL_MS = 30 * 1000

// === FASE 0.7: Export invalidation function ===
// Dipanggil dari /api/essay-polls/[id]/route.ts (PUT/DELETE) untuk invalidate cache
// agar perubahan langsung terlihat di list endpoint (no stale data ≤30 detik)
export function invalidateEssayPollsCache(): void {
  _cache.clear()
}

// GET - List essay polls
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const territoryId = searchParams.get('territoryId')

  const cacheKey = `${user.id}|${user.territoryId}|${status || ''}|${territoryId || ''}`
  const cached = _cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, data: cached.data, cached: true })
  }

  const territory = await db.territory.findUnique({ where: { id: user.territoryId } })
  const where: any = {}

  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    if (territory?.level === 'PROVINCE') {
      where.OR = [{ targetScope: 'NATIONAL' }, { targetScope: 'PROVINCE', provinceCode: territory.code }]
    } else if (territory?.level === 'REGENCY') {
      where.OR = [
        { targetScope: 'NATIONAL' },
        { targetScope: 'PROVINCE', provinceCode: territory.parentId },
        { targetScope: 'REGENCY', regencyCode: territory.code },
      ]
    }
  }

  if (status) where.status = status
  if (territoryId) where.territoryId = territoryId

  const polls = await db.essayPoll.findMany({
    where,
    include: {
      createdBy: { select: { fullName: true } },
      _count: { select: { responses: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  _cache.set(cacheKey, { ts: Date.now(), data: polls })
  return NextResponse.json({ success: true, data: polls, cached: false })
}

// POST - Create essay poll (manual or AI-generate via LLM)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    // Invalidate cache on creation (pakai exported function untuk konsistensi)
    invalidateEssayPollsCache()

    // === AI Generate mode (LLM-powered) ===
    if (body.action === 'ai_generate') {
      const { sourceTopic, sourceUrl, sourceContent, selectedSuggestion } = body
      if (!sourceTopic && !sourceContent && !selectedSuggestion) {
        return NextResponse.json({ success: false, error: 'sourceTopic atau sourceContent atau selectedSuggestion wajib' }, { status: 400 })
      }

      const text = `${sourceTopic || ''} ${sourceContent || ''}`
      const sentimentResult = analyzeSentiment(text)
      const loc = await detectLocationFromDB(text)

      // Deteksi demografi target dari keyword matching
      let detectedOccupation = 'UMUM'
      if (/\b(pupuk|petani|sawah|panen|gabah|beras|pertanian|tani)\b/i.test(text)) detectedOccupation = 'PETANI'
      else if (/\b(nelayan|tangkapan|ikan|solar|pantai|laut|perikanan)\b/i.test(text)) detectedOccupation = 'NELAYAN'
      else if (/\b(umkm|usaha kecil|modal usaha|pelaku usaha|warung|toko|dagang)\b/i.test(text)) detectedOccupation = 'UMKM'
      else if (/\b(pelajar|mahasiswa|sekolah|kuliah|beasiswa|pendidikan|guru)\b/i.test(text)) detectedOccupation = 'PELAJAR'

      const locName = loc.regencyName || loc.provinceName || 'Indonesia'

      // === Jika user pilih suggestion dari multiple AI suggestions ===
      let aiTitle = ''
      let aiQuestion = ''
      let aiDescription = ''
      let targetOccupation = detectedOccupation
      let llmSuccess = false
      let approachLabel = 'direct'

      if (selectedSuggestion && selectedSuggestion.title && selectedSuggestion.question) {
        // Pakai selected suggestion dari multi-suggestions
        aiTitle = selectedSuggestion.title
        aiQuestion = selectedSuggestion.question
        aiDescription = selectedSuggestion.description || `Pertanyaan AI dengan pendekatan ${selectedSuggestion.approach || 'direct'}.`
        targetOccupation = selectedSuggestion.targetOccupation || detectedOccupation
        approachLabel = selectedSuggestion.approach || 'direct'
        llmSuccess = true
        // === NEUTRALITY FILTER: hapus nama organisasi dari pertanyaan yang dilihat publik ===
        aiTitle = aiTitle.replace(/LAPRA\s*08/gi, '').replace(/Laskar\s*Prabowo\s*08/gi, '').replace(/\s+/g, ' ').trim()
        aiQuestion = aiQuestion.replace(/LAPRA\s*08/gi, 'pemerintah dan pemimpin daerah').replace(/Laskar\s*Prabowo\s*08/gi, 'pemerintah dan pemimpin daerah').replace(/\s+/g, ' ').trim()
      } else {
        // Fallback: try LLM single generation (lama)
        try {
          const llmResult = await aiGenerateEssayQuestionLLM({
            sourceTopic: sourceTopic || sourceContent?.substring(0, 200) || 'isu terkini',
            sourceContent,
            sourceUrl,
            detectedLocation: locName,
            detectedOccupation,
            detectedSentiment: sentimentResult.sentiment,
          })
          aiTitle = llmResult.title
          aiQuestion = llmResult.question
          aiDescription = llmResult.description
          targetOccupation = llmResult.targetOccupation || detectedOccupation
          llmSuccess = true
        } catch (e: any) {
          console.error('[LLM] Essay question generation failed, using template fallback:', e.message)
          // Fallback ke template lama
          const sentimentLabel = sentimentResult.sentiment === 'NEGATIVE' ? 'keprihatinan' :
                                sentimentResult.sentiment === 'POSITIVE' ? 'apresiasi' : 'pandangan netral'
          aiTitle = `Survei Opini ${targetOccupation !== 'UMUM' ? targetOccupation.charAt(0) + targetOccupation.slice(1).toLowerCase() : 'Publik'}: ${sourceTopic || 'Isu Terkini'} di ${locName}`
          aiQuestion = `Sebagai ${targetOccupation !== 'UMUM' ? targetOccupation.toLowerCase() : 'warga'} di ${locName}, apa ${sentimentLabel} Anda tentang "${sourceTopic || 'isu terkini'}"? Jelaskan dampaknya pada kehidupan sehari-hari Anda, serta solusi konkret yang Anda harapkan dari pemerintah dan pemimpin daerah.`
          aiDescription = `Survei otomatis (fallback template). Sentimen: ${sentimentResult.sentiment}. Target: ${targetOccupation} di ${locName}. Sumber: ${sourceUrl || 'topik manual'}.`
        }
      }

      const targetScope = loc.regencyCode ? 'REGENCY' : loc.provinceCode ? 'PROVINCE' : 'NATIONAL'

      // === FINAL NEUTRALITY CHECK: hapus semua nama organisasi sebelum simpan ke DB ===
      aiTitle = aiTitle.replace(/LAPRA\s*08/gi, '').replace(/Laskar\s*Prabowo\s*08/gi, '').replace(/\s+/g, ' ').trim()
      aiQuestion = aiQuestion.replace(/LAPRA\s*08/gi, 'pemerintah dan pemimpin daerah').replace(/Laskar\s*Prabowo\s*08/gi, 'pemerintah dan pemimpin daerah').replace(/\s+/g, ' ').trim()

      const poll = await db.essayPoll.create({
        data: {
          title: aiTitle,
          question: aiQuestion,
          description: aiDescription + (llmSuccess ? ` [Generated by LLM, approach: ${approachLabel}]` : ' [Generated by template fallback]'),
          isAiGenerated: true,
          sourceTopic: sourceTopic || null,
          sourceUrl: sourceUrl || null,
          sourceSentiment: sentimentResult.sentiment,
          targetScope,
          provinceCode: loc.provinceCode,
          regencyCode: loc.regencyCode,
          targetOccupation,
          status: 'DRAFT',
          territoryId: user.territoryId,
          createdById: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        data: poll,
        message: `Pertanyaan essay ${llmSuccess ? `AI (LLM, approach: ${approachLabel})` : 'template fallback'} di-generate. Lokasi: ${locName}. Target: ${targetOccupation}. Sentimen: ${sentimentResult.sentiment}.`,
      })
    }

    // === Manual create mode ===
    const { title, question, description, targetScope, provinceCode, regencyCode, targetAgeGroup, targetOccupation, scheduledAt, closesAt } = body
    if (!title || !question) {
      return NextResponse.json({ success: false, error: 'Title dan question wajib' }, { status: 400 })
    }

    const poll = await db.essayPoll.create({
      data: {
        title: title.substring(0, 500),
        question: question.substring(0, 2000),
        description: (description || '').substring(0, 1000),
        isAiGenerated: false,
        targetScope: targetScope || 'NATIONAL',
        provinceCode: provinceCode || null,
        regencyCode: regencyCode || null,
        targetAgeGroup: targetAgeGroup || null,
        targetOccupation: targetOccupation || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        closesAt: closesAt ? new Date(closesAt) : null,
        status: 'DRAFT',
        territoryId: user.territoryId,
        createdById: user.id,
      },
    })

    return NextResponse.json({ success: true, data: poll, message: 'Essay poll dibuat' })
  } catch (e: any) {
    console.error('[Essay Polls POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
