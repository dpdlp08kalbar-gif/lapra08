// LAPRA 08 - API: Google News Scan (komprehensif untuk LAPRA 08 + elektabilitas Prabowo)
// ============================================================
// POST /api/google-scan
// Body: {
//   query?: string,                       // custom query (kosong = pakai 31 keyword default)
//   period?: '24h'|'7d'|'30d',
//   maxResults?: number,                  // default 8
//   saveToPusatMedia?: boolean,           // default true
//   mediaFilter?: string[],               // filter berdasarkan nama media (cth: ['detik', 'kompas'])
//   triggeredBy?: 'manual'|'cron',        // deteksi trigger source
// }
//
// Cron support: jika dipanggil tanpa header x-user-id, fallback ke SUPERADMIN
// Filter media: hanya simpan berita yang source mengandung salah satu keyword mediaFilter
//
// 100% gratis (Google News RSS, no API key, Vercel Free compliant)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, logAccess } from '@/lib/server-helpers'
import Parser from 'rss-parser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const rssParser = new Parser({ timeout: 8000, headers: { 'User-Agent': 'LAPRA08-Bot/1.0' } })

// === Media populer untuk filter cepat (UI checkbox) ===
export const MEDIA_PRESETS = {
  nasional: ['detik', 'kompas', 'tribunnews', 'cnnindonesia', 'tempo', 'antaranews',
             'metrotvnews', 'republika', 'sindonews', 'okezone', 'merdeka',
             'liputan6', 'kumparan', 'jawapos', 'suara'],
  kalbar: ['mediakalbar', 'kalbar', 'pontianak', 'borneotribun', 'pontianakpost',
           'kalbarexpress', 'radarpontianak', 'prokal', 'wartakini', 'sintang',
           'singkawang', 'ketapang', 'sambas', 'mempawah'],
  siaranPers: ['siaran pers', 'press release', 'pelita', 'the jakarta post',
              'lembaga', 'pengumuman', 'humas', 'official'],
  internasional: ['reuters', 'ap news', 'afp', 'bbc', 'al jazeera', 'cna', 'the straits times'],
}

// === Keyword LAPRA 08 + elektabilitas Prabowo (comprehensive) ===
const LAPRA_QUERIES = [
  'Laskar Prabowo 08',
  'LAPRA 08',
  'LAPRA08',
  'Laskar Prabowo Delapan',
  'Relawan Laskar Prabowo 08',
  'DPN LAPRA 08',
  'DPD LAPRA 08',
  'DPC LAPRA 08',
  'Hashim Djojohadikusumo Laskar Prabowo',
  'Laskar Prabowo 08 Pontianak',
  'Laskar Prabowo 08 Kalimantan Barat',
  'Laskar Prabowo 08 Kalbar',
]

const ELEKTABILITAS_QUERIES = [
  'elektabilitas Prabowo',
  'Prabowo Subianto presiden',
  'kabinet merah putih Prabowo',
  'Prabowo Gibran',
  'Prabowo Asta Cita',
  'Asta Cita Prabowo',
  'program Prabowo makan bergizi',
  'Prabowo MBG',
  'Prabowo free meal',
  'Prabowo sejahtera',
  'Prabowo dukung ummat',
  'Prabowo kerja rakyat',
  'presiden Prabowo Subianto 2024',
  'pemerintahan Prabowo Gibran',
  'dukungan rakyat Prabowo',
  'survey elektabilitas Prabowo',
  'indikator elektabilitas Prabowo',
  'charta elektabilitas Prabowo',
  'LSM elektabilitas Prabowo',
]

// Keyword sentiment (rule-based, no LLM)
const POSITIVE_KW = ['apresiasi', 'puji', 'dukung', 'setuju', 'bagus', 'baik', 'hebat',
                     'sukses', 'berhasil', 'kompak', 'sambut', 'restu', 'merindu', 'janji',
                     'program', 'positif', 'kompak', 'solid', 'akrab', 'peduli', 'simpati',
                     'perstasi', 'cinta', 'rindu', 'kagum', 'support']
const NEGATIVE_KW = ['kritik', 'kecewa', 'tolak', 'gagal', 'buruk', 'protes', 'demo',
                     'korupsi', 'skandal', 'tersangka', 'konflik', 'mundur', 'demo tolak',
                     'hati-hati', 'kecewa', 'marah', 'kecolongan', 'salah', 'dustha',
                     'amanah gagal', 'blunder']

function sentiment(text: string): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
  const lower = (text || '').toLowerCase()
  const pos = POSITIVE_KW.some(kw => lower.includes(kw))
  const neg = NEGATIVE_KW.some(kw => lower.includes(kw))
  if (pos && !neg) return 'POSITIVE'
  if (neg && !pos) return 'NEGATIVE'
  return 'NEUTRAL'
}

// Detect topic dominan (16 topik)
function detectTopic(text: string): string {
  const t = (text || '').toLowerCase()
  if (t.includes('mbg') || t.includes('makan bergizi') || t.includes('makan gratis')) return 'MBG (Makan Bergizi)'
  if (t.includes('astacita') || t.includes('asta cita')) return 'Astacita'
  if (t.includes('kabinet merah putih')) return 'Kabinet Merah Putih'
  if (t.includes('prabowo gibran')) return 'Prabowo-Gibran'
  if (t.includes('lapra') || t.includes('laskar prabowo')) return 'LAPRA 08'
  if (t.includes('relawan')) return 'Relawan Prabowo'
  if (t.includes('bansos') || t.includes('bantuan sosial')) return 'Bansos'
  if (t.includes('infrastruktur') || t.includes('jalan') || t.includes('jembatan')) return 'Infrastruktur'
  if (t.includes('pendidikan') || t.includes('sekolah')) return 'Pendidikan'
  if (t.includes('kesehatan') || t.includes('bpjs')) return 'Kesehatan'
  if (t.includes('umkm') || t.includes('koperasi')) return 'UMKM/Koperasi'
  if (t.includes('pertanian') || t.includes('petani')) return 'Pertanian'
  if (t.includes('korupsi') || t.includes('skandal')) return 'Isu Korupsi'
  if (t.includes('demo') || t.includes('protes') || t.includes('tolak')) return 'Protes/Demo'
  if (t.includes('apresiasi') || t.includes('puji')) return 'Apresiasi Publik'
  if (t.includes('survey') || t.includes('elektabilitas')) return 'Survey Elektabilitas'
  return 'Isu Lainnya'
}

export async function POST(request: NextRequest) {
  // === Auth: support 2 mode ===
  // 1. Manual (dari UI): header 'x-user-id'
  // 2. Cron (dari Vercel Cron): tidak ada x-user-id, fallback ke SUPERADMIN
  let user = await getUserFromRequest(request)

  if (!user) {
    const authHeader = request.headers.get('authorization') || ''
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader === `Bearer ${cronSecret}`) {
      try {
        const superadmin = await db.user.findFirst({
          where: { role: 'SUPERADMIN', isActive: true },
          select: { id: true, username: true, fullName: true, role: true, territoryId: true, isActive: true },
        })
        if (superadmin) {
          const territory = await db.territory.findUnique({
            where: { id: superadmin.territoryId },
            select: { id: true, code: true, name: true, level: true },
          })
          user = {
            ...superadmin,
            email: null, phone: null, avatar: null,
            lastLogin: null, createdAt: new Date(), updatedAt: new Date(),
            territory: territory || { id: superadmin.territoryId, code: 'ID', name: 'Indonesia', level: 'COUNTRY' },
          } as any
        }
      } catch (e) { console.error('[Google Scan] Cron fallback auth failed:', e) }
    }
  }

  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const authedUser = user as NonNullable<typeof user>

  // Detect trigger source
  const isCron = !request.headers.get('x-user-id')
  const triggeredBy = isCron ? 'cron' : 'manual'

  try {
    const body = await request.json().catch(() => ({} as any))
    const customQuery = body?.query?.trim()
    const maxPerQuery = parseInt(body?.maxResults) || 8
    const saveToPusatMedia = body?.saveToPusatMedia !== false // default true
    const period = body?.period || '30d'
    const mediaFilter: string[] = Array.isArray(body?.mediaFilter)
      ? body.mediaFilter.filter((m: any) => typeof m === 'string' && m.trim())
      : []

    // === Build query list ===
    let queries: string[]
    if (customQuery) {
      // Custom query dari user (scan Google dengan query spesifik)
      queries = [customQuery]
    } else {
      // Default: scan dengan semua keyword LAPRA + elektabilitas
      queries = [...LAPRA_QUERIES, ...ELEKTABILITAS_QUERIES]
    }

    const allItems: any[] = []
    const sources: string[] = []
    const skipped: string[] = []
    let queriesScanned = 0

    // === Scan Google News RSS untuk setiap query ===
    for (const query of queries) {
      try {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=id&gl=ID&ceid=ID:id`
        const feed = await rssParser.parseURL(url)
        const items = feed.items?.slice(0, maxPerQuery) || []

        for (const item of items) {
          const title = item.title || ''
          const content = (item.contentSnippet || item.content || '').substring(0, 1000)
          const itemUrl = item.link || ''
          const date = item.isoDate ? new Date(item.isoDate) : new Date()
          // Detect source (Google News RSS punya format title: "Title - Source Name")
          // atau pakai creator/author
          const itemSource = (item.creator || item.author || feed.title || '').toString()
          // Parse source dari title pattern "Title - Source" jika ada
          const titleParts = title.split(' - ')
          const sourceFromTitle = titleParts.length > 1 ? titleParts[titleParts.length - 1].trim() : ''
          const finalSource = itemSource || sourceFromTitle || 'Google News'

          // === Filter media spesifik (jika mediaFilter di-set) ===
          if (mediaFilter.length > 0) {
            const sourceLower = finalSource.toLowerCase()
            const matchesFilter = mediaFilter.some(m => sourceLower.includes(m.toLowerCase()))
            if (!matchesFilter) continue // skip berita dari media yang tidak di-filter
          }

          // Skip jika sudah ada di allItems (dedupe by URL)
          if (itemUrl && allItems.some(i => i.url === itemUrl)) continue

          allItems.push({
            query,
            title,
            content,
            url: itemUrl,
            date: date.toISOString(),
            source: finalSource,
            sentiment: sentiment(`${title} ${content}`),
            topic: detectTopic(`${title} ${content}`),
            platform: 'GOOGLE_NEWS',
          })
        }
        queriesScanned++
        console.log(`[Google Scan] "${query}": ${items.length} items`)
      } catch (e: any) {
        skipped.push(`Query "${query}" failed: ${e.message?.substring(0, 60)}`)
      }
    }

    sources.push(`Google News RSS (${queriesScanned}/${queries.length} queries, ${allItems.length} berita)`)

    // === Simpan ke Pusat Media (Announcement) jika diaktifkan ===
    let savedToPusatMedia = 0
    let savedDuplicate = 0
    if (saveToPusatMedia && allItems.length > 0) {
      // Get Indonesia territory
      const indonesia = await db.territory.findFirst({ where: { code: 'ID', level: 'COUNTRY' } })
      if (indonesia) {
        // Get existing URLs untuk dedup
        const existingUrls = new Set(
          (await db.announcement.findMany({
            where: { source: 'WEB_SYNC', sourceUrl: { not: null } },
            select: { sourceUrl: true },
          })).map((a: any) => a.sourceUrl).filter(Boolean)
        )

        for (const item of allItems) {
          if (item.url && existingUrls.has(item.url)) { savedDuplicate++; continue }
          try {
            await db.announcement.create({
              data: {
                title: item.title,
                content: `${item.content}\n\nSumber: Google News (query: ${item.query})\nURL: ${item.url}`,
                type: 'INFO',
                category: 'BERITA',
                isPinned: false,
                isActive: true,
                photoUrl: null,
                publishDate: new Date(item.date),
                source: 'WEB_SYNC',
                sourceUrl: item.url,
                sourceName: item.source.substring(0, 200),
                territoryId: indonesia.id,
                createdById: authedUser.id,
              },
            })
            savedToPusatMedia++
            if (item.url) existingUrls.add(item.url)
          } catch (e) { savedDuplicate++ }
        }
      }
    }

    // === Cluster items berdasarkan topic ===
    const clusterMap = new Map<string, any>()
    allItems.forEach(item => {
      const key = item.topic
      const e = clusterMap.get(key) || { topic: key, items: [], positive: 0, neutral: 0, negative: 0, total: 0 }
      e.items.push(item)
      e.total++
      if (item.sentiment === 'POSITIVE') e.positive++
      else if (item.sentiment === 'NEGATIVE') e.negative++
      else e.neutral++
      clusterMap.set(key, e)
    })
    const clusters = Array.from(clusterMap.values()).sort((a, b) => b.total - a.total)

    // === Summary + Elektabilitas Score ===
    const totalPositive = allItems.filter(i => i.sentiment === 'POSITIVE').length
    const totalNegative = allItems.filter(i => i.sentiment === 'NEGATIVE').length
    const totalItems = allItems.length
    const totalNeutral = totalItems - totalPositive - totalNegative
    const elektabilitasScore = totalItems > 0
      ? Math.round(((totalPositive - totalNegative) / totalItems) * 50 + 50)
      : 50

    // Top source
    const sourceMap = new Map<string, number>()
    allItems.forEach(i => {
      const s = i.source || 'Unknown'
      sourceMap.set(s, (sourceMap.get(s) || 0) + 1)
    })
    const topSources = Array.from(sourceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([source, count]) => ({ source, count }))

    await logAccess({
      actor: authedUser, action: 'VIEW', resource: 'SYSTEM_SETTING', resourceId: 'google-scan',
      resourceLabel: `Google Scan (${queriesScanned} queries, ${totalItems} berita, ${triggeredBy})`,
      request, detail: `Filter: ${mediaFilter.length} media, saved: ${savedToPusatMedia}, duplikat: ${savedDuplicate}`,
    })

    // === Enqueue notifikasi WA ke admin DPN jika ada hasil URGENT/HIGH (cron only) ===
    // Aturan:
    // - Elektabilitas score < 50 (NEGATIF) → URGENT notif
    // - Ada cluster dengan sentimen negatif dominan → HIGH notif per cluster
    // - Ada cluster dengan engagement > 1000 → HIGH notif per cluster
    let waNotifEnqueued = 0
    if (triggeredBy === 'cron' && totalItems > 0) {
      const waQueueKey = 'wa_notifications_queue'

      // Get existing queue
      let waQueue: any[] = []
      try {
        const existing = await db.systemSetting.findUnique({ where: { key: waQueueKey } })
        if (existing) waQueue = JSON.parse(existing.value)
      } catch (e) { /* ignore */ }

      const scanDate = new Date().toISOString()

      // Case 1: Elektabilitas Score NEGATIF (< 45) → URGENT
      if (elektabilitasScore < 45) {
        const message = `⚠️ *AUTO-SCAN GOOGLE - PERHATIAN URGENT*

Elektabilitas Prabowo saat ini: *${elektabilitasScore}/100* (NEGATIF)

📊 Statistik scan ${scanDate}:
• Total berita: ${totalItems}
• Positif: ${totalPositive} | Netral: ${totalNeutral} | Negatif: ${totalNegative}
• Saved ke Pusat Media: ${savedToPusatMedia}

🔍 Top cluster (perlu klarifikasi):
${clusters.slice(0, 3).map((c: any, i: number) =>
  `${i + 1}. ${c.topic} (${c.total} berita, ${c.negative} negatif)`
).join('\n')}

⚠️ Tindakan: Buka Dashboard Analitik > Elektabilitas Prabowo untuk analisis lengkap.

— LAPRA 08 Sistem Auto-Scan`

        waQueue.unshift({
          id: `wa_notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          type: 'URGENT',
          title: `Elektabilitas NEGATIF (${elektabilitasScore}/100) — perlu klarifikasi`,
          message,
          scanDate,
          elektabilitasScore,
          recommendations: clusters.slice(0, 3).map((c: any) => ({
            topic: c.topic,
            itemCount: c.total,
            negativeCount: c.negative,
          })),
          createdAt: scanDate,
          sentAt: null, sentBy: null,
        })
        waNotifEnqueued++
      }

      // Case 2: Cluster dengan negatif dominan (>= 3 berita negatif) → HIGH per cluster
      const urgentClusters = clusters.filter((c: any) => c.negative >= 3 || c.totalEngagement > 1000)
      for (const c of urgentClusters.slice(0, 3)) {
        const message = `🔔 *AUTO-SCAN GOOGLE - ${c.negative >= 3 ? 'RISIKO NEGATIF' : 'TREND TINGGI'}*

Topik: *${c.topic}*
📊 Statistik cluster:
• ${c.total} berita (positif: ${c.positive}, netral: ${c.neutral}, negatif: ${c.negative})
• Engagement: ${c.totalEngagement.toLocaleString('id-ID')}

🔍 Sample berita:
${c.items?.slice(0, 2).map((it: any) => `• ${it.title}`).join('\n') || '-'}

💡 Rekomendasi: Cek Dashboard > Tactical Analysis untuk rekomendasi aksi taktis.

— LAPRA 08 Sistem Auto-Scan`

        waQueue.unshift({
          id: `wa_notif_${Date.now()}_${waNotifEnqueued}_${Math.random().toString(36).substring(2, 8)}`,
          type: 'HIGH',
          title: `Cluster "${c.topic}" — ${c.negative >= 3 ? `${c.negative} berita negatif` : `trend ${c.totalEngagement} engagement`}`,
          message,
          scanDate,
          elektabilitasScore,
          recommendations: [{
            topic: c.topic,
            itemCount: c.total,
            negativeCount: c.negative,
            totalEngagement: c.totalEngagement,
          }],
          createdAt: scanDate,
          sentAt: null, sentBy: null,
        })
        waNotifEnqueued++
      }

      // Save queue (max 100)
      if (waNotifEnqueued > 0) {
        const trimmed = waQueue.slice(0, 100)
        await db.systemSetting.upsert({
          where: { key: waQueueKey },
          update: { value: JSON.stringify(trimmed) },
          create: { key: waQueueKey, value: JSON.stringify(trimmed) },
        })
        console.log(`[Google Scan] Enqueued ${waNotifEnqueued} WA notifikasi ke admin DPN`)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalQueries: queries.length,
          queriesScanned,
          totalItems,
          totalPositive,
          totalNeutral: totalItems - totalPositive - totalNegative,
          totalNegative,
          elektabilitasScore,
          savedToPusatMedia,
          savedDuplicate,
          sources,
          skipped,
          mediaFilter: mediaFilter.length > 0 ? mediaFilter : null,
          triggeredBy,
          waNotifEnqueued,
        },
        clusters,
        topSources,
        items: allItems.slice(0, 50), // 50 item terbaru untuk preview
      },
      message: `Google Scan selesai: ${totalItems} berita dari ${queriesScanned}/${queries.length} query${mediaFilter.length > 0 ? ` (filter: ${mediaFilter.length} media)` : ''}. ${savedToPusatMedia} baru disimpan ke Pusat Media, ${savedDuplicate} duplikat skip. Trigger: ${triggeredBy}.${waNotifEnqueued > 0 ? ` ${waNotifEnqueued} notifikasi WA di-enqueue ke admin DPN.` : ''}`,
    })
  } catch (e: any) {
    console.error('[Google Scan API] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// GET: status scan terakhir
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    // Count berita Google di Pusat Media
    const googleCount = await db.announcement.count({
      where: { source: 'WEB_SYNC', sourceName: { contains: 'Google' } },
    })

    return NextResponse.json({
      success: true,
      data: {
        googleNewsInPusatMedia: googleCount,
        availableKeywords: {
          lapra: LAPRA_QUERIES.length,
          elektabilitas: ELEKTABILITAS_QUERIES.length,
          total: LAPRA_QUERIES.length + ELEKTABILITAS_QUERIES.length,
        },
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
