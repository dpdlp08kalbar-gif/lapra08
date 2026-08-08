// LAPRA 08 - API: Auto-Sync Berita dari Web (No Duplicate)
// POST /api/news/sync — Search web for latest LAPRA 08 news, inject if not exists
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Hanya SUPERADMIN & ADMIN_DPN yang bisa sync
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    return NextResponse.json(
      { success: false, error: 'Hanya Super Admin / Admin DPN yang dapat sync berita' },
      { status: 403 }
    )
  }

  try {
    const zai = await ZAI.create()

    // Search queries untuk berita terbaru
    const queries = [
      'Laskar Prabowo 08 berita kegiatan 2025 2026',
      'LAPRA 08 Devi Taurisa Hashim berita terbaru',
      'Laskar Prabowo 08 aksi sosial DPD DPC kegiatan',
    ]

    const allResults: any[] = []
    for (const query of queries) {
      const results = await zai.functions.invoke('web_search', { query, num: 10 })
      allResults.push(...results)
    }

    // Deduplicate by URL
    const seenUrls = new Set<string>()
    const uniqueResults = allResults.filter((r) => {
      if (seenUrls.has(r.url)) return false
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

    // Filter results that are actually about LAPRA 08
    const lapraKeywords = ['laskar prabowo 08', 'lapra 08', 'lapra08', 'laskarprabowo08', 'devi taurisa', 'hashim djojohadikusumo laskar']
    const lapraResults = uniqueResults.filter((r) => {
      const text = ((r.name || '') + ' ' + (r.snippet || '')).toLowerCase()
      return lapraKeywords.some((kw) => text.includes(kw))
    })

    let newCount = 0
    let skippedCount = 0
    const newBerita: any[] = []

    for (const result of lapraResults) {
      // Check duplicate by title (first 80 chars)
      const titleKey = (result.name || '').toLowerCase().substring(0, 80)
      if (existingTitles.has(titleKey)) {
        skippedCount++
        continue
      }

      // Build content from snippet
      const content = `${result.snippet || ''}\n\nSumber: ${result.host_name || ''}\nURL: ${result.url || ''}`

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
            territoryId: indonesia.id,
            createdById: user.id,
          },
        })
        newBerita.push({
          id: created.id,
          title: created.title,
          url: result.url,
          date: result.date,
        })
        newCount++
        existingTitles.add(titleKey) // Prevent dupes within same batch
      } catch (e) {
        // Skip on error (e.g., constraint violation)
        skippedCount++
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalFound: lapraResults.length,
        newCreated: newCount,
        skippedDuplicate: skippedCount,
        newBerita,
      },
      message: `Sync selesai: ${newCount} berita baru ditemukan, ${skippedCount} duplikat di-skip.`,
    })
  } catch (e: any) {
    console.error('[News Sync Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// GET /api/news/sync — Check sync status (last sync, total berita)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const totalBerita = await db.announcement.count()
  const latestBerita = await db.announcement.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { title: true, createdAt: true },
  })

  return NextResponse.json({
    success: true,
    data: {
      totalBerita,
      lastSync: latestBerita?.createdAt || null,
      lastBeritaTitle: latestBerita?.title || null,
    },
  })
}
