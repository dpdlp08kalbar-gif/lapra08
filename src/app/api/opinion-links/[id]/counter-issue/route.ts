// LAPRA 08 - API: Counter-Issue Draft Generator (Anti-Viral Response)
// POST /api/opinion-links/[id]/counter-issue
//
// FAN-OUT #2: Generate draf konter isu otomatis dari link HIGH+NEGATIVE
// Simpan sebagai draft broadcast di SystemSetting (category=COUNTER_ISSUE_DRAFT)
//
// Strategi:
// 1. Pakai rule-based template (gratis, instant) — DEFAULT
// 2. Optional: panggil Gemini API kalau ada GEMINI_API_KEY di env (hemat token)
// 3. Anti 429: jeda 4 detik antar LLM call via simple lock
// 4. Anti 504: timeout 8 detik untuk LLM, fallback rule-based kalau timeout
//
// Output: draf pesan siap pakai untuk Broadcast Composer
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { analyzeSentiment, extractKeywords, detectCategory } from '@/lib/ai-engine'
import { OrchestratorAgent } from '@/lib/agent-orchestrator'

// Simple in-process lock untuk rate limiting (anti 429)
let _lastGeminiCall = 0
const GEMINI_MIN_INTERVAL_MS = 4500 // 4.5 detik → ≤ 13 RPM (safe margin di 15 RPM)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Hanya admin yang bisa generate draft konter
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN' && user.role !== 'ADMIN_DPD') {
    return NextResponse.json({
      success: false,
      error: 'Akses ditolak. Hanya admin yang dapat generate draft konter isu.'
    }, { status: 403 })
  }

  try {
    const { id } = await params

    // Ambil link opinion
    const link = await db.publicOpinionLink.findUnique({ where: { id } })
    if (!link) {
      return NextResponse.json({ success: false, error: 'Link opini tidak ditemukan' }, { status: 404 })
    }

    // === Step 1: Generate draf via rule-based (default, gratis, instant) ===
    const keywords = extractKeywords(`${link.title} ${link.content}`)
    const sentimentResult = analyzeSentiment(`${link.title} ${link.content}`)
    const category = detectCategory(`${link.title} ${link.content}`)
    const wilayah = link.regencyName || link.provinceName || 'Nasional'

    // === Rule-based draft (DEFAULT — 100% gratis, no API key) ===
    let draftTitle = `Klarifikasi Resmi LAPRA 08 ${wilayah} — ${link.title.substring(0, 60)}${link.title.length > 60 ? '...' : ''}`

    // 3 poin klarifikasi rule-based (pakai keywords + category)
    const clarifications = generateRuleBasedClarifications(link, keywords, category, wilayah)

    // Tentukan aksi berdasarkan kategori + sentiment
    const recommendedAction = recommendAction(link.sentiment, link.priority, category)

    // Susun draf lengkap
    const draftMessage = composeDraftMessage({
      title: draftTitle,
      wilayah,
      isuSummary: link.title,
      clarifications,
      action: recommendedAction,
      sourceUrl: link.url,
    })

    // === Step 2: Optional Gemini enhancement (kalau ada API key + belum rate limit) ===
    let aiEnhanced = false
    let aiProvider = 'rule-based'
    if (
      process.env.GEMINI_API_KEY &&
      Date.now() - _lastGeminiCall > GEMINI_MIN_INTERVAL_MS
    ) {
      try {
        _lastGeminiCall = Date.now()
        const geminiDraft = await callGeminiForCounterIssue(link, keywords, category, wilayah)
        if (geminiDraft) {
          // Override dengan hasil Gemini (lebih kontekstual)
          draftMessage.body = geminiDraft.body
          draftMessage.clarifications = geminiDraft.clarifications
          aiEnhanced = true
          aiProvider = 'gemini-free'
        }
      } catch (e: any) {
        console.warn('[Counter-Issue] Gemini fallback to rule-based:', e.message)
        // Tetap pakai rule-based draft (sudah di-generate di atas)
      }
    }

    // === Step 3: Simpan draf ke SystemSetting ===
    const draftId = `cid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const draftData = {
      id: draftId,
      type: 'COUNTER_ISSUE_DRAFT',
      opinionLinkId: link.id,
      title: draftMessage.title,
      body: draftMessage.body,
      clarifications: draftMessage.clarifications,
      recommendedAction,
      targetWilayah: wilayah,
      targetScope: link.regencyCode ? 'REGENCY' : link.provinceCode ? 'PROVINCE' : 'NATIONAL',
      provinceCode: link.provinceCode,
      regencyCode: link.regencyCode,
      generatedBy: user.fullName,
      generatedAt: new Date().toISOString(),
      aiProvider,
      aiEnhanced,
      status: 'DRAFT', // DRAFT | READY | SENT | ARCHIVED
      sourceLink: {
        url: link.url,
        title: link.title,
        platform: link.platform,
        sentiment: link.sentiment,
        priority: link.priority,
      },
    }

    await db.systemSetting.create({
      data: {
        key: draftId,
        value: JSON.stringify(draftData),
        category: 'COUNTER_ISSUE_DRAFT',
        description: `Draft Konter: ${draftMessage.title.substring(0, 80)}`,
      },
    })

    // === Step 4: Update link status + emit Fan-Out event ===
    await db.publicOpinionLink.update({
      where: { id: link.id },
      data: {
        status: 'ADDRESSED',
        reviewNotes: `Auto-generate draft konter isu (ID: ${draftId})`,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    })

    // Emit Fan-Out event → trigger Decision Dashboard invalidate + AI Agent Monitor log
    OrchestratorAgent.emitEvent({
      eventType: 'COUNTER_ISSUE_DRAFT_GENERATED',
      sourceAgent: 'CounterIssueAPI',
      sourceMenu: 'opinion-links',
      targetMenu: 'broadcast-composer,decision-dashboard',
      payload: { draftId, opinionLinkId: link.id, wilayah, aiProvider },
      territoryCode: link.regencyCode || link.provinceCode,
    }).catch(() => {})

    // === FAN-OUT #4: Invalidate Decision Dashboard cache (real-time refresh) ===
    try {
      const { invalidateDecisionDashboardCache } = await import('@/app/api/decision-dashboard/route')
      invalidateDecisionDashboardCache()
    } catch (e) {
      // ignore — cache will expire naturally in 5s
    }

    return NextResponse.json({
      success: true,
      data: draftData,
      message: `Draft konter isu berhasil dibuat (${aiProvider}). Tersimpan di Broadcast Composer > Draft Konter.`,
    })
  } catch (e: any) {
    console.error('[Counter-Issue Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// RULE-BASED CLARIFICATION GENERATOR (Gratis, instant, no API)
// ============================================================
function generateRuleBasedClarifications(
  link: any,
  keywords: string[],
  category: string,
  wilayah: string
): string[] {
  const points: string[] = []

  // Poin 1: Fakta utama berdasarkan kategori isu
  if (category === 'KEBIJAKAN') {
    points.push(`LAPRA 08 ${wilayah} menegaskan kebijakan yang beredar belum tentu akurat. Kami telah memverifikasi dengan sumber resmi.`)
  } else if (category === 'ORGANISASI') {
    points.push(`Informasi terkait internal LAPRA 08 yang beredar belum sesuai fakta. Susunan kepengurusan resmi dapat diverifikasi di sekretariat DPC setempat.`)
  } else if (category === 'SOSIAL') {
    points.push(`Aktivitas sosial LAPRA 08 ${wilayah} dilakukan transparan dan terdokumentasi. Laporan kegiatan dapat diakses oleh publik.`)
  } else if (category === 'KEAMANAN') {
    points.push(`LAPRA 08 ${wilayah} berkomitmen pada jalur hukum dan tidak terlibat tindakan yang melanggar. Kami mendukung penegakan hukum yang adil.`)
  } else {
    points.push(`Pernyataan yang beredar belum merepresentasikan posisi resmi LAPRA 08 ${wilayah}. Mohon menunggu clarification resmi dari kami.`)
  }

  // Poin 2: Keywords utama (tampilkan apa yang kami tangkap)
  if (keywords.length > 0) {
    const topKeywords = keywords.slice(0, 3).join(', ')
    points.push(`Terkait isu "${topKeywords}" yang disebutkan, kami sedang melakukan verifikasi mendalam bersama tim legal dan humas DPC.`)
  } else {
    points.push(`Kami sedang mengkaji isi informasi yang beredar dan akan memberikan klarifikasi lengkap dalam waktu 1x24 jam.`)
  }

  // Poin 3: Call to action / solusi
  points.push(`Bagi warga ${wilayah}, mohon tidak menyebarkan informasi yang belum diverifikasi. Hubungi sekretariat DPC ${wilayah} untuk konfirmasi resmi.`)

  return points
}

// ============================================================
// RECOMMEND ACTION berdasarkan sentimen + priority + kategori
// ============================================================
function recommendAction(
  sentiment: string,
  priority: string,
  category: string
): { type: string; label: string; target: string } {
  if (priority === 'HIGH' && sentiment === 'NEGATIVE') {
    if (category === 'KEAMANAN') {
      return { type: 'ESKALASI_DPC', label: 'Eskalasi ke DPC + Broadcast WA Urgent', target: 'DPC + DPD setempat' }
    }
    return { type: 'BROADCAST_WA', label: 'Broadcast WA Urgent ke Wilayah Terkait', target: 'Wilayah terdampak' }
  }
  if (priority === 'MEDIUM' && sentiment === 'NEGATIVE') {
    return { type: 'KLARIFIKASI_FAKTA', label: 'Klarifikasi Fakta via FB/IG', target: 'Media sosial LAPRA 08' }
  }
  if (sentiment === 'POSITIVE') {
    return { type: 'AMPRESIASI', label: 'Apresiasi + Amplifikasi Positif', target: 'Broadcast internal' }
  }
  return { type: 'MONITORING', label: 'Monitoring Lanjutan (no urgent action)', target: 'Internal log' }
}

// ============================================================
// COMPOSE DRAFT MESSAGE — format siap kirim WA/FB/IG
// ============================================================
function composeDraftMessage(params: {
  title: string
  wilayah: string
  isuSummary: string
  clarifications: string[]
  action: { type: string; label: string; target: string }
  sourceUrl: string
}): { title: string; body: string; clarifications: string[] } {
  const { title, wilayah, isuSummary, clarifications, action, sourceUrl } = params

  const body = `*${title}*

📍 Wilayah: ${wilayah}
📌 Isu terkait: ${isuSummary.substring(0, 120)}${isuSummary.length > 120 ? '...' : ''}
🔗 Sumber: ${sourceUrl.substring(0, 80)}

*Klarifikasi Resmi:*

1️⃣ ${clarifications[0] || '-'}

2️⃣ ${clarifications[1] || '-'}

3️⃣ ${clarifications[2] || '-'}

*Rekomendasi Aksi:* ${action.label}
*Target:* ${action.target}

— Sekretariat LAPRA 08 ${wilayah}`

  return { title, body, clarifications }
}

// ============================================================
// GEMINI FREE API CALLER (optional, anti 429 + anti 504)
// ============================================================
async function callGeminiForCounterIssue(
  link: any,
  keywords: string[],
  category: string,
  wilayah: string
): Promise<{ body: string; clarifications: string[] } | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  // Hemat token: prompt singkat, output JSON only
  const prompt = `Anda analis isu politik LAPRA 08. Untuk isu berikut, keluarkan HANYA JSON valid:

{
  "clarifications": ["3 poin klarifikasi, masing-masing max 100 karakter"],
  "body": "draft pesan WA singkat max 400 karakter, format siap kirim"
}

JUDUL: ${link.title}
ISU: ${(link.content || '').substring(0, 300)}
SENTIMEN: ${link.sentiment}
LOKASI: ${wilayah}
KATEGORI: ${category}

Tidak ada teks lain di luar JSON.`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000) // 8 detik timeout (anti 504)

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
        }),
        signal: controller.signal,
      }
    )

    clearTimeout(timeout)

    if (!res.ok) {
      const errText = await res.text()
      console.warn(`[Gemini] HTTP ${res.status}:`, errText.substring(0, 200))
      return null
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Extract JSON dari response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    return {
      body: parsed.body?.substring(0, 500) || '',
      clarifications: Array.isArray(parsed.clarifications)
        ? parsed.clarifications.slice(0, 3).map((c: any) => String(c).substring(0, 150))
        : [],
    }
  } catch (e: any) {
    clearTimeout(timeout)
    console.warn('[Gemini] Call failed:', e.message)
    return null
  }
}
