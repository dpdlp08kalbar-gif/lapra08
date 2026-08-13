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

// === SEARCH QUERIES (strict LAPRA 08 + positive Prabowo agenda) ===
const LAPRA_QUERIES = [
  '"LAPRA 08" OR "Laskar Prabowo 08"',
  'LAPRA 08 Devi Taurisa Hashim pengurus',
  'Laskar Prabowo 08 aksi sosial kegiatan',
  'Presiden Prabowo astacita program positif',
]

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
  const query = LAPRA_QUERIES[0] // primary LAPRA query

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance&hl=id`
      const res = await fetchWithTimeout(url, {
        headers: { 'User-Agent': 'LAPRA08-Bot/1.0' },
      })
      if (!res.ok) {
        console.warn(`[Invidious] ${instance} returned ${res.status}`)
        continue
      }
      const data = await res.json()
      if (!Array.isArray(data) || data.length === 0) {
        console.warn(`[Invidious] ${instance} returned empty array`)
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
        rawPayload: v, // save full response for re-analysis later
      }))

      console.log(`[Invidious] ✅ ${posts.length} videos from ${instance}`)
      return { posts, instance }
    } catch (e: any) {
      console.warn(`[Invidious] ${instance} failed:`, e.message?.substring(0, 80))
      continue
    }
  }

  console.warn('[Invidious] All instances failed. Self-host Invidious on Railway/Fly.io for reliable access.')
  return { posts: [], instance: null }
}

// === GOOGLE NEWS SCRAPER (via RSS) ===
// Google News RSS endpoint (free, no API key, no auth required)
// GET https://news.google.com/rss/search?q=...&hl=id&gl=ID&ceid=ID:id
async function scrapeGoogleNews(maxResults = 5): Promise<ScrapedPost[]> {
  const allPosts: ScrapedPost[] = []

  for (const query of LAPRA_QUERIES.slice(0, 2)) { // use 2 main queries for news
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
          },
        })
      }
    } catch (e: any) {
      console.warn('[Google News RSS] Query failed:', query, e.message?.substring(0, 80))
    }
  }

  // Dedupe by URL
  const seen = new Set<string>()
  const unique = allPosts.filter(p => {
    if (!p.url || seen.has(p.url)) return false
    seen.add(p.url)
    return true
  })

  console.log(`[Google News RSS] ✅ ${unique.length} articles`)
  return unique.slice(0, maxResults)
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
