// LAPRA 08 - API: Auto-Sync Berita dari Web (STRICT FILTER)
// POST /api/news/sync — Search web for latest LAPRA 08 news, inject if not exists
// HANYA sinkron berita terkait:
//   1. Laskar Prabowo 08 / LAPRA 08
//   2. Agenda kegiatan positif Presiden Prabowo
// Berita lain DILARANG disinkron kecuali atas izin admin (manual entry)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { requireZaiConfig } from '@/lib/zai-init'

// STRICT keywords - berita harus mengandung salah satu untuk disinkron
const LAPRA_KEYWORDS = [
  'laskar prabowo 08',
  'lapra 08',
  'lapra08',
  'laskarprabowo08',
  'laskar prabowo delapan',
  'devi taurisa',
  'hashim djojohadikusumo laskar',
  'hisar tambunan',
  'nurhadi laskar prabowo',
  'timmy rorimpandey',
]

// Positive agenda Presiden Prabowo yang relevan
const POSITIVE_PRABOWO_KEYWORDS = [
  'prabowo astacita',
  'prabowo sejahtera',
  'prabowo mbg', // makan bergizi gratis
  'prabowo program sosial',
  'presiden prabowo positif',
  'pemerintahan prabowo gibran',
  'prabowo dukung ummat',
  'prabowo kerja rakyat',
]

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Hanya SUPERADMIN & ADMIN_DPN yang bisa sync berita dari medsos
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    return NextResponse.json(
      { success: false, error: 'Hanya Super Admin / Admin DPN yang dapat sync berita dari medsos' },
      { status: 403 }
    )
  }

  // === Init ZAI config dari env vars (untuk Vercel serverless) ===
  const configReady = requireZaiConfig()
  if (!configReady) {
    return NextResponse.json({
      success: false,
      error: 'Konfigurasi ZAI SDK belum lengkap. Set env vars: ZAI_BASE_URL, ZAI_API_KEY, ZAI_CHAT_ID, ZAI_TOKEN, ZAI_USER_ID di Vercel Project Settings.',
    }, { status: 500 })
  }

  // Lazy import setelah config siap
  const ZAI = (await import('z-ai-web-dev-sdk')).default

  try {
    const zai = await ZAI.create()

    // Search queries untuk berita terbaru - HANYA terkait LAPRA 08 & agenda positif Presiden Prabowo
    const queries = [
      'Laskar Prabowo 08 LAPRA 08 berita kegiatan terbaru 2026',
      'LAPRA 08 Devi Taurisa Hashim pengurus berita',
      'Laskar Prabowo 08 aksi sosial DPD DPC kegiatan',
      'Presiden Prabowo astacita program positif 2026',
      'Laskar Prabowo 08 peace walk peace forum',
      'LAPRA 08 deklarasi dukung pemerintahan Prabowo',
    ]

    const allResults: any[] = []
    for (const query of queries) {
      try {
        const results = await zai.functions.invoke('web_search', { query, num: 10 })
        if (Array.isArray(results)) allResults.push(...results)
      } catch (e: any) {
        // Graceful: log per-query error but continue to next query
        console.error('[News Sync] Search failed for query:', query, e?.message || e)
      }
    }

    // If all searches failed (e.g. web_search function unavailable), return helpful message
    if (allResults.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tidak ada hasil pencarian. Kemungkinan ZAI web_search function sedang tidak tersedia atau token expired. Coba lagi nanti.',
      }, { status: 502 })
    }

    // Deduplicate by URL
    const seenUrls = new Set<string>()
    const uniqueResults = allResults.filter((r) => {
      if (!r.url || seenUrls.has(r.url)) return false
      seenUrls.add(r.url)
      return true
    })

    // Get existing announcement titles for dedup
    const existing = await db.announcement.findMany({ select: { title: true } })
    const existingTitles = new Set(existing.map((e) => e.title.toLowerCase().substring(0, 80)))

    // Get Indonesia territory
    const indonesia = await db.territory.findFirst({
      where: { code: 'ID', level: 'COUNTRY' },
    })
    if (!indonesia) {
      return NextResponse.json({ success: false, error: 'Territory Indonesia not found' }, { status: 500 })
    }

    // STRICT FILTER: berita harus mengandung keyword LAPRA 08 ATAU agenda positif Prabowo
    const isRelevant = (r: any): boolean => {
      const text = ((r.name || '') + ' ' + (r.snippet || '')).toLowerCase()
      const hasLapra = LAPRA_KEYWORDS.some((kw) => text.includes(kw))
      const hasPositivePrabowo = POSITIVE_PRABOWO_KEYWORDS.some((kw) => text.includes(kw))
      return hasLapra || hasPositivePrabowo
    }

    const relevantResults = uniqueResults.filter(isRelevant)

    // Anti-filter: exclude berita negatif / konflik / sensitif
    const NEGATIVE_KEYWORDS = [
      'korupsi', 'tersangka', 'kasus pidana', 'skandal', 'dugaan',
      'demonstrasi tolak', 'protes', 'mogok', 'konflik', 'bentrok',
      'kriminal', 'pelanggaran hukum',
    ]
    const isNegative = (r: any): boolean => {
      const text = ((r.name || '') + ' ' + (r.snippet || '')).toLowerCase()
      return NEGATIVE_KEYWORDS.some((kw) => text.includes(kw))
    }

    const filteredResults = relevantResults.filter(r => !isNegative(r))

    let newCount = 0
    let skippedDuplicate = 0
    let skippedIrrelevant = uniqueResults.length - relevantResults.length
    let skippedNegative = relevantResults.length - filteredResults.length
    const newBerita: any[] = []

    for (const result of filteredResults) {
      const titleKey = (result.name || '').toLowerCase().substring(0, 80)
      if (existingTitles.has(titleKey)) {
        skippedDuplicate++
        continue
      }

      const content = `${result.snippet || ''}\n\nSumber: ${result.host_name || ''}\nURL: ${result.url || ''}`

      let sourceName = result.host_name || 'Web'
      sourceName = sourceName.replace(/^www\./, '').replace(/\/$/, '')

      try {
        const created = await db.announcement.create({
          data: {
            title: result.name || 'Berita LAPRA 08',
            content,
            type: 'INFO',
            category: 'BERITA',
            isPinned: false,
            isActive: true,
            photoUrl: null,
            publishDate: result.date ? new Date(result.date) : new Date(),
            source: 'WEB_SYNC',
            sourceUrl: result.url,
            sourceName,
            territoryId: indonesia.id,
            createdById: user.id,
          },
        })
        newBerita.push({
          id: created.id,
          title: created.title,
          url: result.url,
          sourceName,
        })
        newCount++
        existingTitles.add(titleKey)
      } catch (e) {
        skippedDuplicate++
      }
    }

    const summary = `Sync berita selesai: ${newCount} berita baru, ${skippedDuplicate} duplikat, ${skippedIrrelevant} tidak relevan, ${skippedNegative} negatif di-block`

    return NextResponse.json({
      success: true,
      data: {
        totalFound: uniqueResults.length,
        totalRelevant: filteredResults.length,
        newCreated: newCount,
        skippedDuplicate,
        skippedIrrelevant,
        skippedNegative,
        newBerita,
      },
      message: summary,
    })
  } catch (e: any) {
    console.error('[News Sync Error]', e)
    return NextResponse.json({
      success: false,
      error: `Sync gagal: ${e.message}. Pastikan env vars ZAI_* sudah dikonfigurasi di Vercel.`,
    }, { status: 500 })
  }
}

// GET /api/news/sync — Check sync status (last sync, total berita)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const totalBerita = await db.announcement.count()
  const webSyncCount = await db.announcement.count({ where: { source: 'WEB_SYNC' } })
  const manualCount = await db.announcement.count({ where: { source: 'MANUAL' } })
  const latestBerita = await db.announcement.findFirst({
    where: { source: 'WEB_SYNC' },
    orderBy: { createdAt: 'desc' },
    select: { title: true, createdAt: true, sourceName: true },
  })

  return NextResponse.json({
    success: true,
    data: {
      totalBerita,
      webSyncCount,
      manualCount,
      lastSync: latestBerita?.createdAt || null,
      lastBeritaTitle: latestBerita?.title || null,
      lastBeritaSource: latestBerita?.sourceName || null,
    },
  })
}
