// LAPRA 08 - API: Essay Polls
// GET - List polls (with RBAC)
// POST - Create new essay poll (manual OR AI-generated)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { analyzeSentiment, detectLocation } from '@/lib/social-scraper'

// GET - List essay polls
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const territoryId = searchParams.get('territoryId')

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

  return NextResponse.json({ success: true, data: polls })
}

// POST - Create essay poll (manual or AI-generate)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    // === AI Generate mode ===
    // Body: { action: 'ai_generate', sourceTopic, sourceUrl?, sourceContent? }
    // System reads the source content, detects sentiment + location + category,
    // then auto-generates an essay question that targets the right demographics.
    if (body.action === 'ai_generate') {
      const { sourceTopic, sourceUrl, sourceContent } = body
      if (!sourceTopic && !sourceContent) {
        return NextResponse.json({ success: false, error: 'sourceTopic atau sourceContent wajib' }, { status: 400 })
      }

      const text = `${sourceTopic || ''} ${sourceContent || ''}`
      const sentimentResult = analyzeSentiment(text)
      const loc = detectLocation(text)

      // AI question generator (rule-based template)
      // In production: call LLM (z-ai-web-dev-sdk) for higher quality
      const sentimentLabel = sentimentResult.sentiment === 'NEGATIVE' ? 'keprihatinan' :
                              sentimentResult.sentiment === 'POSITIVE' ? 'apresiasi' : 'pandangan netral'
      const locName = loc.regencyName || loc.provinceName || 'Indonesia'

      let aiTitle = ''
      let aiQuestion = ''
      let aiDescription = ''
      let targetOccupation = ''

      if (text.toLowerCase().match(/\b(pupuk|petani|irigasi|panen|sawah|gabah|harga pangan|beras)\b/)) {
        targetOccupation = 'PETANI'
        aiTitle = `Survei Opini Petani: ${sourceTopic || 'Isu Pertanian'} di ${locName}`
        aiQuestion = `Sebagai petani di ${locName}, bagaimana pendapat Anda tentang "${sourceTopic || 'isu pertanian saat ini'}"? Jelaskan dampaknya pada hasil panen dan pendapatan keluarga Anda, serta solusi yang Anda harapkan dari pemerintah dan LAPRA 08.`
      } else if (text.toLowerCase().match(/\b(nelayan|tangkapan|ikan|solar|cuaca|pantai)\b/)) {
        targetOccupation = 'NELAYAN'
        aiTitle = `Survei Opini Nelayan: ${sourceTopic || 'Isu Perikanan'} di ${locName}`
        aiQuestion = `Sebagai nelayan di ${locName}, apa tanggapan Anda tentang "${sourceTopic || 'isu perikanan saat ini'}"? Bagaimana kondisi ini mempengaruhi hasil tangkapan dan kesejahteraan keluarga Anda, dan apa bantuan konkret yang Anda butuhkan dari LAPRA 08?`
      } else if (text.toLowerCase().match(/\b(umkm|usaha kecil|modal usaha|pelaku usaha|warung|toko)\b/)) {
        targetOccupation = 'UMKM'
        aiTitle = `Survei Opini UMKM: ${sourceTopic || 'Isu Ekonomi'} di ${locName}`
        aiQuestion = `Sebagai pelaku UMKM di ${locName}, bagaimana Anda menilai "${sourceTopic || 'isu ekonomi saat ini'}"? Apa tantangan terbesar yang Anda hadapi dalam mengembangkan usaha, dan bentuk dukungan apa yang paling Anda harapkan dari pemerintah dan LAPRA 08?`
      } else if (text.toLowerCase().match(/\b(pelajar|mahasiswa|sekolah|kuliah|beasiswa|pendidikan|guru)\b/)) {
        targetOccupation = 'PELAJAR'
        aiTitle = `Survei Opini Pelajar: ${sourceTopic || 'Isu Pendidikan'} di ${locName}`
        aiQuestion = `Sebagai pelajar/mahasiswa di ${locName}, apa pendapat Anda tentang "${sourceTopic || 'isu pendidikan saat ini'}"? Bagaimana hal ini mempengaruhi semangat belajar dan masa depan Anda, serta program konkret apa yang Anda inginkan dari LAPRA 08?`
      } else {
        targetOccupation = ''
        aiTitle = `Survei Opini Publik: ${sourceTopic || 'Isu Terkini'} di ${locName}`
        aiQuestion = `Sebagai warga ${locName}, apa ${sentimentLabel} Anda tentang "${sourceTopic || 'isu terkini'}"? Jelaskan dampaknya pada kehidupan sehari-hari Anda, serta solusi konkret yang Anda harapkan dari pemerintah dan LAPRA 08.`
      }

      aiDescription = `Pertanyaan ini di-generate otomatis oleh AI berdasarkan analisis sentimen (${sentimentResult.sentiment}, skor ${sentimentResult.score}) dan lokasi terdeteksi (${locName}). Target responden: ${targetOccupation || 'umum'} di ${locName}. Sumber inspirasi: ${sourceUrl || 'topik manual'}.`

      const territory = await db.territory.findFirst({ where: { id: user.territoryId } })

      const poll = await db.essayPoll.create({
        data: {
          title: aiTitle,
          question: aiQuestion,
          description: aiDescription,
          isAiGenerated: true,
          sourceTopic: sourceTopic || null,
          sourceUrl: sourceUrl || null,
          sourceSentiment: sentimentResult.sentiment,
          targetScope: loc.provinceCode ? (loc.regencyCode ? 'REGENCY' : 'PROVINCE') : 'NATIONAL',
          provinceCode: loc.provinceCode,
          regencyCode: loc.regencyCode,
          targetOccupation: targetOccupation || null,
          status: 'DRAFT',
          territoryId: user.territoryId,
          createdById: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        data: poll,
        message: `Pertanyaan essay AI di-generate. Lokasi: ${locName}. Target: ${targetOccupation || 'umum'}. Sentimen: ${sentimentResult.sentiment}.`,
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
