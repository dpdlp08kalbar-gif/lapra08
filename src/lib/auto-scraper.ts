// LAPRA 08 - AUTO SCRAPER (100% FOSS, no API keys, Vercel-compatible)
// =====================================================
// PHASE 1 REFACTOR:
//   ❌ REMOVED: yt-dlp child process (hardcoded to /home/z/.venv/bin/yt-dlp)
//   ✅ ADDED:   Invidious API (FOSS YouTube frontend, JSON API, no key)
//   ✅ KEPT:    Google News RSS via rss-parser (FOSS, no key)
//
// Vercel serverless compatible — pure fetch + RSS, no child_process spawn.
// Invidious instances are tried in order with health-check fallback.
//
// SELF-HOST OPTION (recommended for production):
//   Deploy your own Invidious instance on Railway/Fly.io for reliable
//   YouTube access. Set INVIDIOUS_HOST env var to override the fallback list.
// =====================================================

import Parser from 'rss-parser'

export type ScrapedPost = {
  platform: 'YOUTUBE' | 'GOOGLE' | 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'TWITTER_X'
  postId: string
  author: string
  authorHandle: string | null
  title: string
  content: string
  url: string
  publishedAt: Date
  engagementCount: number
  source: 'invidious' | 'google-news-rss'
  rawPayload?: any // full JSON response from source (saved to PublicOpinionLink.rawPayload)
}

const rssParser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'LAPRA08-Bot/1.0 (+https://lapra08.vercel.app)',
    'Accept': 'application/rss+xml, application/xml, text/xml',
  },
})

// === SEARCH QUERIES (EXPANDED: 38 provinsi + aktivitas daerah + tokoh) ===
// FIX: Sebelumnya hanya 4 query nasional → data daerah tidak terjaring
// Sekarang: query per provinsi + aktivitas + tokoh daerah
const LAPRA_QUERIES_NASIONAL = [
  '"LAPRA 08" OR "Laskar Prabowo 08"',
  'LAPRA 08 Devi Taurisa Hashim pengurus',
  'Laskar Prabowo 08 aksi sosial kegiatan',
  'Presiden Prabowo astacita program positif',
]

// === 38 PROVINSI NKRI — query per daerah ===
const PROVINSI_QUERIES = [
  'Laskar Prabowo 08 Aceh OR LAPRA 08 Aceh',
  'Laskar Prabowo 08 Sumatera Utara OR LAPRA 08 Sumut',
  'Laskar Prabowo 08 Sumatera Barat OR LAPRA 08 Sumbar',
  'Laskar Prabowo 08 Riau OR LAPRA 08 Riau',
  'Laskar Prabowo 08 Kepulauan Riau OR LAPRA 08 Kepri',
  'Laskar Prabowo 08 Jambi OR LAPRA 08 Jambi',
  'Laskar Prabowo 08 Sumatera Selatan OR LAPRA 08 Sumsel',
  'Laskar Prabowo 08 Bangka Belitung OR LAPRA 08 Babel',
  'Laskar Prabowo 08 Bengkulu OR LAPRA 08 Bengkulu',
  'Laskar Prabowo 08 Lampung OR LAPRA 08 Lampung',
  'Laskar Prabowo 08 Banten OR LAPRA 08 Banten',
  'Laskar Prabowo 08 DKI Jakarta OR LAPRA 08 Jakarta',
  'Laskar Prabowo 08 Jawa Barat OR LAPRA 08 Jabar',
  'Laskar Prabowo 08 Jawa Tengah OR LAPRA 08 Jateng',
  'Laskar Prabowo 08 DI Yogyakarta OR LAPRA 08 Jogja',
  'Laskar Prabowo 08 Jawa Timur OR LAPRA 08 Jatim',
  'Laskar Prabowo 08 Bali OR LAPRA 08 Bali',
  'Laskar Prabowo 08 Nusa Tenggara Barat OR LAPRA 08 NTB',
  'Laskar Prabowo 08 Nusa Tenggara Timur OR LAPRA 08 NTT',
  'Laskar Prabowo 08 Kalimantan Barat OR LAPRA 08 Kalbar',
  'Laskar Prabowo 08 Kalimantan Tengah OR LAPRA 08 Kalteng',
  'Laskar Prabowo 08 Kalimantan Selatan OR LAPRA 08 Kalsel',
  'Laskar Prabowo 08 Kalimantan Timur OR LAPRA 08 Kaltim',
  'Laskar Prabowo 08 Kalimantan Utara OR LAPRA 08 Kaltara',
  'Laskar Prabowo 08 Sulawesi Utara OR LAPRA 08 Sulut',
  'Laskar Prabowo 08 Sulawesi Tengah OR LAPRA 08 Sulteng',
  'Laskar Prabowo 08 Sulawesi Selatan OR LAPRA 08 Sulsel',
  'Laskar Prabowo 08 Sulawesi Tenggara OR LAPRA 08 Sultra',
  'Laskar Prabowo 08 Gorontalo OR LAPRA 08 Gorontalo',
  'Laskar Prabowo 08 Sulawesi Barat OR LAPRA 08 Sulbar',
  'Laskar Prabowo 08 Maluku OR LAPRA 08 Maluku',
  'Laskar Prabowo 08 Maluku Utara OR LAPRA 08 Malut',
  'Laskar Prabowo 08 Papua OR LAPRA 08 Papua',
  'Laskar Prabowo 08 Papua Barat OR LAPRA 08 Papua Barat',
  'Laskar Prabowo 08 Papua Selatan OR LAPRA 08 Papua Selatan',
  'Laskar Prabowo 08 Papua Tengah OR LAPRA 08 Papua Tengah',
  'Laskar Prabowo 08 Papua Pegunungan OR LAPRA 08 Papua Pegunungan',
  'Laskar Prabowo 08 Papua Barat Daya OR LAPRA 08 Papua Barat Daya',
]

// === QUERY AKTIVITAS DAERAH (aksi, kolaborasi, audiensi, deklarasi) ===
const AKTIVITAS_QUERIES = [
  'LAPRA 08 audiensi DPD OR DPC',
  'Laskar Prabowo 08 kolaborasi OR kemitraan daerah',
  'LAPRA 08 deklarasi pengurus DPC OR DPD',
  'Laskar Prabowo 08 bakti sosial OR aksi sosial',
  'LAPRA 08 pelantikan pengurus cabang',
  'Laskar Prabowo 08 rapat koordinasi daerah',
  'LAPRA 08 kegiatan keorganisasian DPD',
  'Laskar Prabowo 08 pemberdayaan ummat',
]

// === RSS FEED LOKAL (berita daerah — gratis, no API key) ===
const LOCAL_RSS_FEEDS = [
  // Tribun Network (per daerah)
  { name: 'Tribun Kalbar', url: 'https://kalimantanbarat.tribunnews.com/rss', region: 'Kalimantan Barat' },
  { name: 'Tribun Pontianak', url: 'https://pontianak.tribunnews.com/rss', region: 'Kalimantan Barat' },
  { name: 'Tribun Jabar', url: 'https://jabar.tribunnews.com/rss', region: 'Jawa Barat' },
  { name: 'Tribun Jateng', url: 'https://jateng.tribunnews.com/rss', region: 'Jawa Tengah' },
  { name: 'Tribun Jatim', url: 'https://jatim.tribunnews.com/rss', region: 'Jawa Timur' },
  { name: 'Tribun Bali', url: 'https://bali.tribunnews.com/rss', region: 'Bali' },
  { name: 'Tribun Sumsel', url: 'https://sumsel.tribunnews.com/rss', region: 'Sumatera Selatan' },
  { name: 'Tribun Sumbar', url: 'https://sumbar.tribunnews.com/rss', region: 'Sumatera Barat' },
  { name: 'Tribun Sulsel', url: 'https://sulsel.tribunnews.com/rss', region: 'Sulawesi Selatan' },
  // Detik Regional
  { name: 'Detik Kalbar', url: 'https://www.detik.com/rss/jawa-barat', region: 'Jawa Barat' },
  // Kompas Regional
  { name: 'Kompas Nasional', url: 'https://www.kompas.com/rss/nasional.xml', region: 'Nasional' },
]

// === COMBINED: semua query (rotasi per scrape) ===
const ALL_QUERIES = [
  ...LAPRA_QUERIES_NASIONAL,
  ...PROVINSI_QUERIES,
  ...AKTIVITAS_QUERIES,
]

// === ROTATION STATE (5 query per batch, anti Vercel timeout) ===
let _rotationIndex = 0
function getNextQueryBatch(batchSize = 5): string[] {
  const batch: string[] = []
  for (let i = 0; i < batchSize; i++) {
    batch.push(ALL_QUERIES[_rotationIndex % ALL_QUERIES.length])
    _rotationIndex++
  }
  return batch
}

// Backward compat: LAPRA_QUERIES untuk code lain yang masih pakai
const LAPRA_QUERIES = LAPRA_QUERIES_NASIONAL

// === INVIDIOUS INSTANCE FALLBACK LIST ===
// Public Invidious instances — often rate-limited or down.
// For production, self-host: https://docs.invidious.io/installation/
const INVIDIOUS_INSTANCES = [
  process.env.INVIDIOUS_HOST, // self-hosted takes priority
  'https://invidious.private.coffee',
  'https://yewtu.be',
  'https://invidious.kavin.rocks',
  'https://inv.tux.pizza',
  'https://invidious.einfachzocken.eu',
].filter(Boolean) as string[]

const REQUEST_TIMEOUT = 8000

async function fetchWithTimeout(url: string, opts: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

// === YOUTUBE SCRAPER (via Invidious API) ===
// Invidious API docs: https://docs.invidious.io/api/
// GET /api/v1/search?q=...&type=video&sort_by=relevance
// Returns: [{ videoId, title, author, authorUrl, description, published, viewCount, likeCount }]
async function scrapeYouTube(maxResults = 5): Promise<{ posts: ScrapedPost[]; instance: string | null }> {
  // === ENHANCED: pakai rotasi query (bukan hanya query pertama) ===
  const queryBatch = getNextQueryBatch(2) // 2 query YouTube per batch (anti timeout)
  const allPosts: ScrapedPost[] = []
  let usedInstance: string | null = null

  // Loop setiap query di batch
  for (const query of queryBatch) {
    // Loop Invidious instances (fallback)
    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance&hl=id`
        const res = await fetchWithTimeout(url, {
          headers: { 'User-Agent': 'LAPRA08-Bot/1.0' },
        })
        if (!res.ok) {
          continue
        }
        const data = await res.json()
        if (!Array.isArray(data) || data.length === 0) {
          continue
        }

        const posts: ScrapedPost[] = data.slice(0, maxResults).map((v: any) => ({
          platform: 'YOUTUBE' as const,
          postId: v.videoId,
          author: v.author || 'Unknown',
          authorHandle: v.authorUrl ? v.authorUrl.replace('/channel/', '@') : null,
          title: v.title || '',
          content: (v.description || '').substring(0, 1000),
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
          publishedAt: v.published ? new Date(v.published * 1000) : new Date(),
          engagementCount: (v.viewCount || 0) + (v.likeCount || 0),
          source: 'invidious' as const,
          rawPayload: { ...v, query }, // simpan query untuk traceability
        }))

        allPosts.push(...posts)
        usedInstance = instance
        console.log(`[Invidious] ✅ ${posts.length} videos for query "${query.substring(0, 40)}..."`)
        break // sukses untuk query ini, lanjut ke query berikutnya
      } catch (e: any) {
        continue
      }
    }
  }

  if (allPosts.length === 0) {
    console.warn('[Invidious] All instances failed. Self-host Invidious on Railway/Fly.io for reliable access.')
    return { posts: [], instance: null }
  }

  // Dedupe by videoId
  const seen = new Set<string>()
  const unique = allPosts.filter(p => {
    if (seen.has(p.postId)) return false
    seen.add(p.postId)
    return true
  })

  console.log(`[Invidious] ✅ Total ${unique.length} unique videos from ${queryBatch.length} queries`)
  return { posts: unique, instance: usedInstance }
}

// === GOOGLE NEWS SCRAPER (via RSS) — ENHANCED: rotasi query daerah ===
// FIX: Sebelumnya hanya 2 query nasional → data daerah tidak terjaring
// Sekarang: rotasi 5 query per batch (nasional + provinsi + aktivitas)
async function scrapeGoogleNews(maxResults = 5): Promise<ScrapedPost[]> {
  const allPosts: ScrapedPost[] = []

  // === ROTATION: ambil 5 query per batch (anti Vercel timeout 10s) ===
  const queryBatch = getNextQueryBatch(5)
  console.log(`[Google News RSS] Scraping ${queryBatch.length} queries (rotation batch)...`)

  for (const query of queryBatch) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=id&gl=ID&ceid=ID:id`
      const feed = await rssParser.parseURL(url)
      const items = feed.items?.slice(0, maxResults) || []

      for (const item of items) {
        allPosts.push({
          platform: 'GOOGLE',
          postId: item.guid || item.link || `${Date.now()}-${Math.random()}`,
          author: item.creator || item.author || feed.title || 'Google News',
          authorHandle: null,
          title: item.title || '',
          content: (item.contentSnippet || item.content || '').substring(0, 1000),
          url: item.link || '',
          publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
          engagementCount: 0,
          source: 'google-news-rss',
          rawPayload: {
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            content: item.content,
            categories: item.categories,
            creator: item.creator,
            query, // simpan query untuk traceability
          },
        })
      }
    } catch (e: any) {
      console.warn('[Google News RSS] Query failed:', query, e.message?.substring(0, 80))
    }
  }

  // === NEW: Scrape juga dari RSS lokal (Tribun, Detik, Kompas) ===
  for (const feed of LOCAL_RSS_FEEDS.slice(0, 3)) { // 3 feed per batch (anti timeout)
    try {
      const parsed = await rssParser.parseURL(feed.url)
      const items = parsed.items?.slice(0, 3) || [] // 3 item per feed

      for (const item of items) {
        // Filter: hanya simpan yang mengandung keyword LAPRA/Prabowo
        const text = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase()
        const isRelevant = text.includes('laskar prabowo') || text.includes('lapra') ||
                           text.includes('prabowo') || text.includes('asta cita') ||
                           text.includes('pemilu') || text.includes('pilkada')

        if (!isRelevant) continue

        allPosts.push({
          platform: 'GOOGLE', // tag sebagai GOOGLE karena dari RSS news
          postId: item.guid || item.link || `${Date.now()}-${Math.random()}`,
          author: item.creator || item.author || feed.name,
          authorHandle: null,
          title: `[${feed.name}] ${item.title || ''}`,
          content: (item.contentSnippet || item.content || '').substring(0, 1000),
          url: item.link || '',
          publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
          engagementCount: 0,
          source: 'google-news-rss',
          rawPayload: {
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            content: item.content,
            sourceFeed: feed.name,
            region: feed.region,
            query: `local-rss:${feed.name}`,
          },
        })
      }
      console.log(`[Local RSS] ${feed.name}: ${items.length} items scanned`)
    } catch (e: any) {
      console.warn(`[Local RSS] ${feed.name} failed:`, e.message?.substring(0, 80))
    }
  }

  // Dedupe by URL
  const seen = new Set<string>()
  const unique = allPosts.filter(p => {
    if (!p.url || seen.has(p.url)) return false
    seen.add(p.url)
    return true
  })

  console.log(`[Google News RSS + Local RSS] ✅ ${unique.length} articles (batch: ${queryBatch.length} queries + ${Math.min(3, LOCAL_RSS_FEEDS.length)} local feeds)`)
  return unique.slice(0, maxResults * 3) // tingkatkan limit karena query lebih banyak
}

// === MAIN AUTO SCRAPER (called by worker) ===
export async function scrapeAuto(): Promise<{
  posts: ScrapedPost[]
  sources: string[]
  skipped: string[]
}> {
  const sources: string[] = []
  const skipped: string[] = []

  // Parallel scrape (YouTube + Google News in parallel for speed)
  const [ytResult, newsResult] = await Promise.allSettled([
    scrapeYouTube(5),
    scrapeGoogleNews(5),
  ])

  const yt = ytResult.status === 'fulfilled' ? ytResult.value.posts : []
  const ytInstance = ytResult.status === 'fulfilled' ? ytResult.value.instance : null
  const nw = newsResult.status === 'fulfilled' ? newsResult.value : []

  if (yt.length > 0) {
    sources.push(`YouTube (Invidious${ytInstance ? ': ' + ytInstance.replace('https://', '') : ''}, ${yt.length} videos)`)
  } else {
    skipped.push('YouTube (all Invidious instances failed — self-host Invidious for reliable access)')
  }

  if (nw.length > 0) {
    sources.push(`Google News RSS (${nw.length} articles)`)
  } else {
    skipped.push('Google News RSS (no results)')
  }

  // Honest reporting: platforms we cannot access without API keys
  skipped.push('Facebook (requires Meta Graph API token — not free)')
  skipped.push('Instagram (requires Meta Graph API token — not free)')
  skipped.push('TikTok (requires Research API approval)')
  skipped.push('X/Twitter (requires X API v2 Bearer token — $100/month)')

  return {
    posts: [...yt, ...nw],
    sources,
    skipped,
  }
}
