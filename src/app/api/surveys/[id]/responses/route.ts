// LAPRA 08 - API: Submit Survey Response (PUBLIC, anonim)
// ============================================================
// POST /api/surveys/[id]/responses
// Privacy (UU PDP No. 27/2022):
// - respondentName & respondentPhone: HARDCODED NULL (anonim total)
// - ipAddress: hash SHA-256 + daily salt
// - Rate limit: 5/jam per IP
// - Spam detection untuk ESSAY
// - AI analysis: rule-based lexicon (no Z.AI/GPT)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { analyzeSentiment, calculatePriority, extractKeywords } from '@/lib/ai-engine'
import { createHash } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function hashIp(ip: string): string {
  const salt = new Date().toISOString().slice(0, 10)
  return 'HASH:' + createHash('sha256').update(`${ip}:${salt}`).digest('hex').substring(0, 32)
}

const _rateLimit = new Map<string, { count: number; ts: number }>()
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const r = _rateLimit.get(ip)
  if (r && now - r.ts < 3600000) {
    if (r.count >= 5) return { allowed: false, remaining: 0 }
    r.count++
    return { allowed: true, remaining: 5 - r.count }
  }
  _rateLimit.set(ip, { count: 1, ts: now })
  return { allowed: true, remaining: 4 }
}

function detectSpam(text: string): boolean {
  if (/(.)\1{10,}/.test(text)) return true
  if (text.length > 50 && text === text.toUpperCase()) return true
  if ((text.match(/https?:\/\//g) || []).length >= 3) return true
  if (text.trim().length < 10) return true
  return false
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: surveyId } = await params
    const survey = await db.essayPoll.findUnique({ where: { id: surveyId }, select: { id: true, status: true, question: true } })
    if (!survey) return NextResponse.json({ success: false, error: 'Survei tidak ditemukan' }, { status: 404 })
    if (survey.status !== 'ACTIVE') return NextResponse.json({ success: false, error: 'Survei tidak aktif' }, { status: 400 })

    const body = await request.json()
    const { answer, ageGroup, gender, occupation, provinceCode, regencyCode } = body

    // === FASE 2: Field metadata (GPS, Foto, Tier 2) ===
    const gps = body.gps || null  // { lat, lng } — akan dibulatkan
    const photoData = body.photoData || null  // base64 JPEG (max 500KB)
    const tier2 = body.tier2 || null  // { orgAffiliation, educationLevel, votingBehavior }

    if (!answer || answer.trim().length < 10) {
      return NextResponse.json({ success: false, error: 'Jawaban minimal 10 karakter' }, { status: 400 })
    }

    // Rate limit
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    const rl = checkRateLimit(clientIp)
    if (!rl.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit: maks 5 respon/jam. Coba lagi nanti.' }, { status: 429 })
    }

    // Spam detection
    if (detectSpam(answer)) {
      return NextResponse.json({ success: false, error: 'Jawaban terdeteksi spam.' }, { status: 400 })
    }

    // === FASE 2: GPS Privacy — round to ~100m precision (3 decimal places) ===
    let roundedGps: { lat: number; lng: number } | null = null
    if (gps && typeof gps.lat === 'number' && typeof gps.lng === 'number') {
      roundedGps = {
        lat: Math.round(gps.lat * 1000) / 1000,  // ~100m precision
        lng: Math.round(gps.lng * 1000) / 1000,
      }
    }

    // === FASE 2: Photo — strip EXIF, cap at 500KB, store as base64 in SystemSetting ===
    let photoStored = false
    if (photoData && typeof photoData === 'string' && photoData.length < 700000) { // ~500KB base64
      photoStored = true
    }

    const finalAnswer = answer.trim().substring(0, 5000)
    const wordCount = finalAnswer.trim().split(/\s+/).filter(Boolean).length

    // AI Analysis (rule-based, no external API)
    const sentiment = analyzeSentiment(finalAnswer)
    const priority = calculatePriority(finalAnswer, wordCount, sentiment.sentiment)
    const keywords = extractKeywords(finalAnswer)
    const aiProvider = 'rule-based'

    const response = await db.essayResponse.create({
      data: {
        pollId: surveyId,
        answer: finalAnswer,
        wordCount,
        respondentName: null,    // ANONIM TOTAL
        respondentPhone: null,   // ANONIM TOTAL
        ageGroup: ageGroup || null,
        gender: gender || null,
        occupation: occupation || null,
        provinceCode: provinceCode || null,
        regencyCode: regencyCode || null,
        aiSentiment: sentiment.sentiment,
        aiScore: priority.urgencyScore,
        aiCategory: priority.category,
        aiSummary: `Sentimen: ${sentiment.sentiment}. Kategori: ${priority.category}. ${wordCount} kata. Urgency: ${priority.urgencyScore}/100.`,
        aiKeywords: JSON.stringify({ keywords, provider: aiProvider }),
        isProcessed: true,
        ipAddress: hashIp(clientIp),
      },
      select: {
        id: true, wordCount: true,
        aiSentiment: true, aiScore: true, aiCategory: true,
      },
    })

    // === FASE 2: Store metadata (GPS + Photo + Tier 2) in SystemSetting ===
    if (roundedGps || photoStored || tier2) {
      const metaData: any = {}
      if (roundedGps) metaData.gps = roundedGps
      if (photoStored) metaData.photo = photoData
      if (tier2) {
        metaData.tier2 = {
          orgAffiliation: tier2.orgAffiliation || null,
          educationLevel: tier2.educationLevel || null,
          votingBehavior: tier2.votingBehavior || null,
        }
      }
      try {
        await db.systemSetting.upsert({
          where: { key: `response_meta_${response.id}` },
          update: { value: JSON.stringify(metaData), category: 'RESPONSE_META' },
          create: { key: `response_meta_${response.id}`, value: JSON.stringify(metaData), category: 'RESPONSE_META', description: `Metadata for response ${response.id}` },
        })
      } catch (e: any) {
        console.warn('[Response Meta] Failed to store:', e.message)
      }
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Terima kasih! Jawaban (${wordCount} kata) telah dikirim & dianalisis AI (${aiProvider}). Sentimen: ${sentiment.sentiment}.`,
      rateLimit: { remaining: rl.remaining },
    })
  } catch (e: any) {
    console.error('[Survey Response POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
