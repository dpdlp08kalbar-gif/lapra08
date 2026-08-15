// LAPRA 08 - DuckDuckGo HTML Search Scraper (REAL direct social media URLs)
// =====================================================
// DuckDuckGo HTML search returns REAL direct URLs to:
// - Facebook posts (facebook.com/[page]/posts/[id])
// - Instagram posts/reels (instagram.com/[user]/p/[id] or /reel/[id])
// - TikTok videos (tiktok.com/@[user]/video/[id])
// - X/Twitter tweets (twitter.com/[user]/status/[id] or x.com/[user]/status/[id])
//
// This gives us REAL direct links to actual public social media posts,
// not just news articles ABOUT those posts (which is what Google News RSS returns).
//
// 100% free, no API key, no auth, no rate limit issues if used responsibly.

export type DDGResult = {
  url: string          // Direct URL to FB/IG/TikTok/X post (decoded from DDG redirect)
  title: string
  snippet: string
  platform: 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'TWITTER_X' | 'GOOGLE'
  author: string | null
  publishedAt: Date | null
}

const DDG_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const BASE_QUERY = '"LAPRA 08" OR "Laskar Prabowo 08" OR "Laskar Prabowo"'

const PLATFORM_SITE_FILTERS: { platform: DDGResult['platform']; siteFilter: string }[] = [
  { platform: 'FACEBOOK', siteFilter: 'facebook.com' },
  { platform: 'INSTAGRAM', siteFilter: 'instagram.com' },
  { platform: 'TIKTOK', siteFilter: 'tiktok.com' },
  { platform: 'TWITTER_X', siteFilter: 'twitter.com OR x.com' },
  // No site filter for Google = general web news
]

// Fetch DuckDuckGo HTML search results for a query
async function fetchDDG(query: string, maxResults = 10): Promise<DDGResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': DDG_UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error(`[DDG] HTTP ${res.status} for query: ${query}`)
      return []
    }
    const html = await res.text()
    return parseDDGHtml(html, maxResults)
  } catch (e: any) {
    console.error(`[DDG] Fetch failed for "${query}":`, e.message)
    return []
  }
}

// Parse DuckDuckGo HTML search results page
function parseDDGHtml(html: string, maxResults: number): DDGResult[] {
  const results: DDGResult[] = []

  // Each result block is in <div class="result results_links results_links_deep web-result">
  // The title is in <a class="result__a" href="...">TITLE</a>
  // The URL is encoded as a redirect: //duckduckgo.com/l/?uddg=ENCODED_URL&rut=...
  // The snippet is in <a class="result__snippet">SNIPPET</a>

  // Find all result blocks
  const resultRegex = /<a\s+rel="nofollow"\s+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a\s+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi

  let m: RegExpExecArray | null
  let count = 0
  while ((m = resultRegex.exec(html)) !== null && count < maxResults) {
    const rawHref = m[1]
    const titleHtml = m[2]
    const snippetHtml = m[3]

    // Decode the redirect URL
    const uddgMatch = rawHref.match(/uddg=([^&]+)/)
    if (!uddgMatch) continue
    const directUrl = decodeURIComponent(uddgMatch[1])

    const title = stripHtml(titleHtml)
    const snippet = stripHtml(snippetHtml)
    if (!title || !directUrl) continue

    const platform = detectPlatform(directUrl)
    const author = extractAuthorFromUrl(directUrl)

    results.push({
      url: directUrl,
      title,
      snippet,
      platform,
      author,
      publishedAt: null, // DDG doesn't reliably show publish date
    })
    count++
  }

  return results
}

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function detectPlatform(url: string): DDGResult['platform'] {
  const lower = url.toLowerCase()
  if (lower.includes('facebook.com')) return 'FACEBOOK'
  if (lower.includes('instagram.com')) return 'INSTAGRAM'
  if (lower.includes('tiktok.com')) return 'TIKTOK'
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'TWITTER_X'
  return 'GOOGLE'
}

function extractAuthorFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/').filter(Boolean)
    // Facebook: facebook.com/[page]/posts/[id] → author = page
    // Instagram: instagram.com/[user]/p/[id] or instagram.com/reel/[id] → author = user
    // TikTok: tiktok.com/@[user]/video/[id] → author = @user
    // Twitter/X: twitter.com/[user]/status/[id] → author = @user
    if (parts.length > 0) {
      const first = parts[0]
      if (first.startsWith('@')) return first // TikTok @username
      if (u.hostname.includes('facebook.com') && first !== 'posts' && first !== 'photo' && first !== 'permalink') return first
      if (u.hostname.includes('instagram.com') && first !== 'p' && first !== 'reel' && first !== 'explore') return first
      if (u.hostname.includes('twitter.com') || u.hostname.includes('x.com')) return `@${first}`
      if (u.hostname.includes('tiktok.com')) return `@${first}`
    }
    return u.hostname.replace(/^www\./, '')
  } catch { return null }
}

// === MAIN ENTRY POINT ===
// Searches DuckDuckGo with site: filters to get REAL direct URLs to social media posts.
// Each platform query returns REAL public posts from FB/IG/TikTok/X that mention LAPRA 08.
export async function scrapeSocialMediaViaDDG(
  platforms: string[] = ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'TWITTER_X'],
  scope?: { provinceCode?: string | null; regencyCode?: string | null },
): Promise<DDGResult[]> {
  let locationFilter = ''
  if (scope?.provinceCode) {
    locationFilter = ` ${scope.provinceCode}` // Will be matched against content anyway
  }

  const queries: { platform: DDGResult['platform']; query: string }[] = []
  for (const pf of platforms) {
    const cfg = PLATFORM_SITE_FILTERS.find(c => c.platform === pf)
    if (!cfg) continue
    const q = `${BASE_QUERY}${locationFilter} site:${cfg.siteFilter}`
    queries.push({ platform: cfg.platform, query: q })
  }

  // Fire all queries in parallel
  const results = await Promise.allSettled(
    queries.map(async ({ platform, query }) => {
      const items = await fetchDDG(query, 15)
      // Override platform from query (in case DDG result URL is cross-platform)
      return items
        .filter(it => it.platform === platform) // Only keep results matching the requested platform
        .map(it => ({ ...it, platform }))
    }),
  )

  const allResults: DDGResult[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') allResults.push(...r.value)
  }

  // Deduplicate by URL
  const seen = new Set<string>()
  return allResults.filter(r => {
    if (seen.has(r.url)) return false
    seen.add(r.url)
    return true
  })
}

// ============================================================
// GENERAL WEB SEARCH via DuckDuckGo (untuk News Search)
// ============================================================
// Mencari artikel web general (bukan khusus social media)
// Returns: array hasil { url, title, snippet, hostName, date }
//
// 100% gratis, no API key, no auth — pakai DuckDuckGo HTML endpoint
export type WebSearchResult = {
  url: string
  title: string
  snippet: string
  hostName: string
  date: string
}

export async function searchViaDDG(query: string, maxResults: number = 10): Promise<WebSearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': DDG_UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error(`[DDG Search] HTTP ${res.status} for query: ${query}`)
      return []
    }
    const html = await res.text()
    return parseDDGHtmlForWebSearch(html, maxResults)
  } catch (e: any) {
    console.error(`[DDG Search] Failed for query "${query}":`, e.message)
    return []
  }
}

function parseDDGHtmlForWebSearch(html: string, maxResults: number): WebSearchResult[] {
  const results: WebSearchResult[] = []
  // DDG HTML structure: <a class="result__a" href="...">title</a>
  // + <a class="result__snippet">snippet</a>
  // atau <div class="result__body">...<a class="result__a" href="U">T</a>...<a class="result__snippet" href="U">S</a>...

  // Pattern: <a rel="nofollow" class="result__a" href="REDIRECT_URL">TITLE</a>
  const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  // Pattern: snippet in <a class="result__snippet" href="...">SNIPPET</a>
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi

  // Collect all links
  const links: { url: string; title: string }[] = []
  let m
  while ((m = linkRegex.exec(html)) !== null && links.length < maxResults * 2) {
    const rawUrl = m[1] || ''
    const titleHtml = m[2] || ''
    // DDG wraps URLs in redirect: //duckduckgo.com/l/?uddg=ENCODED_URL&...
    let actualUrl = rawUrl
    const uddgMatch = rawUrl.match(/uddg=([^&]+)/)
    if (uddgMatch && uddgMatch[1]) {
      try {
        actualUrl = decodeURIComponent(uddgMatch[1])
      } catch {
        // keep rawUrl
      }
    }
    const title = stripHtml(titleHtml).trim()
    if (actualUrl && title) {
      links.push({ url: actualUrl, title })
    }
  }

  // Collect all snippets (in order)
  const snippets: string[] = []
  while ((m = snippetRegex.exec(html)) !== null) {
    snippets.push(stripHtml(m[1] || '').trim())
  }

  // Build results
  for (let i = 0; i < links.length && results.length < maxResults; i++) {
    const link = links[i]
    let hostName = ''
    try {
      hostName = new URL(link.url).hostname
    } catch {}
    results.push({
      url: link.url,
      title: link.title,
      snippet: snippets[i] || '',
      hostName,
      date: '', // DDG HTML doesn't reliably provide date
    })
  }

  return results
}
