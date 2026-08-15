// LAPRA 08 - API: News Search (DuckDuckGo via ddg-scraper.ts — FOSS, gratis, no API key)
// POST /api/news/search { query } - search web, enrich with isRelevant & alreadyAdded
// GET  /api/news/search - return suggested queries
//
// === Z.AI SDK DIHAPUS — sesuai permintaan user (tidak diizinkan pakai Z.AI) ===
// Sekarang pakai DuckDuckGo HTML search via ddg-scraper.ts (100% gratis, no API key, no auth)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { searchViaDDG } from '@/lib/ddg-scraper'

// STRICT keywords - berita harus mengandung salah satu untuk dianggap relevan
const LAPRA_KEYWORDS = [
  'laskar prabowo 08',
  'laskar prabowo delapan',
  'laskar prabowo kosong delapan',
  'lapra 08',
  'lapra08',
  'laskarprabowo08',
  'devi taurisa',
  'hashim djojohadikusumo laskar',
  'hisar tambunan',
  'nurhadi laskar prabowo',
  'timmy rorimpandey',
  'sekretariat dpn laskar prabowo',
  'east tower laskar prabowo',
  'laskarprabowo08official',
]

const SUGGESTED_QUERIES = [
  'Laskar Prabowo 08 LAPRA 08 berita kegiatan terbaru',
  'Devi Taurisa Hashim pengurus Laskar Prabowo 08',
  'Laskar Prabowo 08 aksi sosial DPD DPC kegiatan',
  'LAPRA 08 peace walk peace forum deklarasi',
  'Laskar Prabowo 08 East Tower sekretariat DPN',
  'Laskar Prabowo 08 bantuan hukum advokasi rakyat',
  'Hisar Tambunan Laskar Prabowo 08 berita',
  'Timmy Rorimpandey Laskar Prabowo 08',
]

// GET - Return suggested queries
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Only DPN-level admin should access news sync features
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    return NextResponse.json(
      { success: false, error: 'Hanya Super Admin / Admin DPN yang dapat mengakses pencarian berita' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      queries: SUGGESTED_QUERIES,
      keywords: LAPRA_KEYWORDS,
    },
  })
}

// POST - Search web for news via DuckDuckGo (FOSS, no API key)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    return NextResponse.json(
      { success: false, error: 'Hanya Super Admin / Admin DPN yang dapat melakukan pencarian berita' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const query = (body.query || '').trim()
    const num = Math.min(parseInt(body.num || '15', 10) || 15, 30)

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query pencarian wajib diisi' },
        { status: 400 }
      )
    }

    // === HAPUS Z.AI — pakai DuckDuckGo HTML search (FOSS, gratis, no API key) ===
    console.log(`[News Search] Using DuckDuckGo (FOSS) for query: "${query}"`)
    const ddgResults = await searchViaDDG(query, num)

    if (ddgResults.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Tidak ada hasil pencarian',
      })
    }

    // Collect all URLs to check duplicates against existing announcements
    const urls = ddgResults.map((r) => r.url).filter(Boolean)

    const existingByUrl = await db.announcement.findMany({
      where: { sourceUrl: { in: urls } },
      select: { sourceUrl: true, id: true, title: true },
    })
    const existingUrlSet = new Set(existingByUrl.map((a) => a.sourceUrl))

    // Enrich each result with isRelevant & alreadyAdded
    const enriched = ddgResults.map((r) => {
      const title = r.title || ''
      const snippet = r.snippet || ''
      const host = r.hostName || ''
      const url = r.url || ''
      const haystack = `${title} ${snippet} ${host} ${url}`.toLowerCase()

      const matchedKeywords = LAPRA_KEYWORDS.filter((kw) => haystack.includes(kw.toLowerCase()))
      const isRelevant = matchedKeywords.length > 0
      const alreadyAdded = url ? existingUrlSet.has(url) : false

      return {
        title,
        snippet,
        url,
        hostName: host,
        date: r.date || '',
        isRelevant,
        alreadyAdded,
        matchedKeywords,
      }
    })

    return NextResponse.json({
      success: true,
      data: enriched,
      summary: {
        total: enriched.length,
        relevant: enriched.filter((r) => r.isRelevant).length,
        alreadyAdded: enriched.filter((r) => r.alreadyAdded).length,
        newRelevant: enriched.filter((r) => r.isRelevant && !r.alreadyAdded).length,
      },
    })
  } catch (e: any) {
    console.error('[News Search Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
