// LAPRA 08 - API: Auto-Sync Berita dari Web (100% FREE, no API keys)
// POST /api/news/sync — scrape YouTube + Google News via scrapeAuto(), inject if not exists
//
// KOMPATIBILITAS Vercel: Menggunakan scrapeAuto() yang pakai yt-dlp + Google News RSS.
// Tidak butuh ZAI SDK, tidak butuh API key berbayar.
//
// CATATAN: yt-dlp biner hanya tersedia di dev environment. Di Vercel production,
// hanya Google News RSS yang berfungsi (yt-dlp tidak bisa diinstall di serverless).
// Tapi itu sudah cukup — RSS Google News mengembalikan berita real LAPRA 08.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { scrapeAuto } from '@/lib/auto-scraper'

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
  'prabowo mbg',
  'prabowo program sosial',
  'presiden prabowo positif',
  'pemerintahan prabowo gibran',
  'prabowo dukung ummat',
  'prabowo kerja rakyat',
]

// Anti-filter: exclude berita negatif / konflik / sensitif
const NEGATIVE_KEYWORDS = [
  'korupsi', 'tersangka', 'kasus pidana', 'skandal', 'dugaan',
  'demonstrasi tolak', 'protes', 'mogok', 'konflik', 'bentrok',
  'kriminal', 'pelanggaran hukum',
]

function isRelevant(title: string, snippet: string): boolean {
  const text = (title + ' ' + snippet).toLowerCase()
  const hasLapra = LAPRA_KEYWORDS.some((kw) => text.includes(kw))
  const hasPositivePrabowo = POSITIVE_PRABOWO_KEYWORDS.some((kw) => text.includes(kw))
  return hasLapra || hasPositivePrabowo
}

function isNegative(title: string, snippet: string): boolean {
  const text = (title + ' ' + snippet).toLowerCase()
  return NEGATIVE_KEYWORDS.some((kw) => text.includes(kw))
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    return NextResponse.json(
      { success: false, error: 'Hanya Super Admin / Admin DPN yang dapat sync berita' },
      { status: 403 }
    )
  }

  try {
    // === SCRAPE via yt-dlp + Google News RSS (100% free, no API key) ===
    const { posts, sources, skipped } = await scrapeAuto()

    if (posts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalFound: 0,
          totalRelevant: 0,
          newCreated: 0,
          skippedDuplicate: 0,
          skippedIrrelevant: 0,
          skippedNegative: 0,
          sources,
          skipped,
          newBerita: [],
        },
        message: 'Tidak ada berita baru ditemukan. Sumber: ' + sources.join(', ') + '. Skipped: ' + skipped.join(', '),
      })
    }

    // Get existing announcement titles & URLs for dedup
    const existing = await db.announcement.findMany({
      where: { source: 'WEB_SYNC' },
      select: { title: true, sourceUrl: true },
    })
    const existingTitles = new Set(existing.map((e) => e.title.toLowerCase().substring(0, 80)))
    const existingUrls = new Set(existing.map((e) => e.sourceUrl).filter(Boolean))

    // Get Indonesia territory
    const indonesia = await db.territory.findFirst({
      where: { code: 'ID', level: 'COUNTRY' },
    })
    if (!indonesia) {
      return NextResponse.json({ success: false, error: 'Territory Indonesia not found' }, { status: 500 })
    }

    let newCount = 0
    let skippedDuplicate = 0
    let skippedIrrelevant = 0
    let skippedNegative = 0
    const newBerita: any[] = []

    for (const post of posts) {
      const title = post.title || 'Berita LAPRA 08'
      const snippet = post.content || ''
      const url = post.url || ''

      // Strict filter: harus relevan dengan LAPRA 08 atau agenda positif Prabowo
      if (!isRelevant(title, snippet)) {
        skippedIrrelevant++
        continue
      }

      // Anti-filter: skip berita negatif
      if (isNegative(title, snippet)) {
        skippedNegative++
        continue
      }

      // Dedup by title or URL
      const titleKey = title.toLowerCase().substring(0, 80)
      if (existingTitles.has(titleKey) || (url && existingUrls.has(url))) {
        skippedDuplicate++
        continue
      }

      // Determine source name from platform
      const sourceName = post.platform === 'YOUTUBE'
        ? (post.authorHandle || post.author || 'YouTube').toString()
        : post.platform === 'GOOGLE'
        ? 'Google News'
        : post.platform

      try {
        const created = await db.announcement.create({
          data: {
            title,
            content: `${snippet}\n\nSumber: ${sourceName}\nURL: ${url}`,
            type: 'INFO',
            category: 'BERITA',
            isPinned: false,
            isActive: true,
            photoUrl: null,
            publishDate: post.publishedAt || new Date(),
            source: 'WEB_SYNC',
            sourceUrl: url,
            sourceName: sourceName.substring(0, 200),
            territoryId: indonesia.id,
            createdById: user.id,
          },
        })
        newBerita.push({
          id: created.id,
          title: created.title,
          url,
          sourceName,
        })
        newCount++
        existingTitles.add(titleKey)
        if (url) existingUrls.add(url)
      } catch (e) {
        skippedDuplicate++
      }
    }

    const summary = `Sync berita selesai: ${newCount} baru, ${skippedDuplicate} duplikat, ${skippedIrrelevant} tidak relevan, ${skippedNegative} negatif di-block. Sumber: ${sources.join(', ')}.`

    return NextResponse.json({
      success: true,
      data: {
        totalFound: posts.length,
        totalRelevant: newCount + skippedDuplicate,
        newCreated: newCount,
        skippedDuplicate,
        skippedIrrelevant,
        skippedNegative,
        sources,
        skipped,
        newBerita,
      },
      message: summary,
    })
  } catch (e: any) {
    console.error('[News Sync Error]', e)
    return NextResponse.json({
      success: false,
      error: `Sync gagal: ${e.message}`,
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
