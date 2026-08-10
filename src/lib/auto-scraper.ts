// LAPRA 08 - AUTO SCRAPER (zero config, 100% FREE, no API keys)
// =====================================================
// Uses yt-dlp + Google News RSS — both work WITHOUT any API key or auth.
// This module is called automatically when "Audit AI" button is pressed.
// User does NOT need to configure anything.
//
// What works automatically:
//   ✅ YouTube: yt-dlp searches REAL videos mentioning LAPRA 08 (returns title, channel, views, date)
//   ✅ Google News: RSS returns REAL news articles mentioning LAPRA 08
//
// What does NOT work without API key (HONEST):
//   ❌ Facebook posts/comments: requires Meta Graph API token
//   ❌ Instagram posts/comments: requires Meta Graph API token
//   ❌ TikTok videos: requires Research API approval
//   ❌ X/Twitter tweets: requires X API v2 Bearer token
//
// For the audit, we get REAL YouTube data + REAL news data automatically.
// This is FAR better than nothing, and it's 100% free with zero setup.

import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'

const execAsync = promisify(exec)

const DENO_PATH = '/home/z/.deno/bin'
const YTDLP_BIN = '/home/z/.venv/bin/yt-dlp'

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
  source: 'yt-dlp' | 'google-news-rss'
}

const BASE_QUERY = '"LAPRA 08" OR "Laskar Prabowo 08" OR "Laskar Prabowo"'

// === YouTube search via yt-dlp (NO API KEY needed) ===
// yt-dlp's "ytsearchN:query" returns REAL YouTube videos with title, channel, view count.
async function scrapeYouTube(maxResults = 15): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = []
  try {
    const query = `ytsearch${maxResults}:${BASE_QUERY}`
    // Use --flat-playlist to skip video download, just metadata
    // Use --print to output specific fields as TSV
    const cmd = `"${YTDLP_BIN}" --flat-playlist --print "%(id)s|%(title)s|%(channel)s|%(uploader_id)s|%(upload_date)s|%(view_count)s|%(duration)s" "${query.replace(/"/g, '\\"')}"`
    const { stdout, stderr } = await execAsync(cmd, {
      env: { ...process.env, PATH: `${DENO_PATH}:${process.env.PATH}` },
      timeout: 30000,
      maxBuffer: 5 * 1024 * 1024,
    })

    if (stderr && !stderr.includes('WARNING')) {
      console.error('[yt-dlp] stderr:', stderr.substring(0, 500))
    }

    const lines = stdout.split('\n').filter(l => l.trim())
    for (const line of lines) {
      const [id, title, channel, uploaderId, uploadDate, viewCount, duration] = line.split('|')
      if (!id || !title) continue

      // Parse upload date (YYYYMMDD format from yt-dlp)
      let publishedAt = new Date()
      if (uploadDate && uploadDate.length === 8) {
        const y = uploadDate.substring(0, 4)
        const m = uploadDate.substring(4, 6)
        const d = uploadDate.substring(6, 8)
        publishedAt = new Date(`${y}-${m}-${d}`)
      }

      posts.push({
        platform: 'YOUTUBE',
        postId: id,
        author: channel || uploaderId || 'YouTube Channel',
        authorHandle: uploaderId ? `@${uploaderId}` : null,
        title,
        content: title, // Title is the main content for video
        url: `https://www.youtube.com/watch?v=${id}`,
        publishedAt,
        engagementCount: parseInt(viewCount) || 0,
        source: 'yt-dlp',
      })
    }
  } catch (e: any) {
    console.error('[yt-dlp] YouTube search failed:', e.message)
  }
  return posts
}

// === Google News RSS (NO API KEY) ===
async function scrapeGoogleNews(maxItems = 20): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = []
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(BASE_QUERY + ' when:30d')}&hl=id&gl=ID&ceid=ID:id`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', Accept: 'application/rss+xml' },
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    })
    if (!res.ok) return []
    const xml = await res.text()

    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let m: RegExpExecArray | null
    let count = 0
    while ((m = itemRegex.exec(xml)) !== null && count < maxItems) {
      const block = m[1]
      const title = stripHtml(extractTag(block, 'title'))
      const link = extractTag(block, 'link')
      const pubDate = extractTag(block, 'pubDate')
      const source = extractTag(block, 'source')
      const descRaw = extractTag(block, 'description')
      const descText = stripHtml(descRaw)
      if (!title || !link) continue

      posts.push({
        platform: 'GOOGLE',
        postId: link,
        author: source?.trim() || 'News Source',
        authorHandle: null,
        title,
        content: descText || title,
        url: link,
        publishedAt: pubDate ? new Date(pubDate) : new Date(),
        engagementCount: 0,
        source: 'google-news-rss',
      })
      count++
    }
  } catch (e: any) {
    console.error('[Google News] RSS fetch failed:', e.message)
  }
  return posts
}

function extractTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return m ? m[1].trim() : ''
}

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim()
}

// === MAIN AUTO SCRAPER ===
// Called automatically — zero configuration required.
// Returns REAL data from YouTube (via yt-dlp) + Google News RSS.
export async function scrapeAuto(): Promise<{
  posts: ScrapedPost[]
  sources: string[]
  skipped: string[] // platforms we couldn't access (honest reporting)
}> {
  const sources: string[] = []
  const skipped: string[] = []
  const allPosts: ScrapedPost[] = []

  // YouTube via yt-dlp (free, no API key)
  const yt = await scrapeYouTube(15)
  if (yt.length > 0) {
    sources.push(`YouTube (yt-dlp, ${yt.length} videos)`)
    allPosts.push(...yt)
  } else {
    skipped.push('YouTube (yt-dlp blocked or no results)')
  }

  // Google News RSS (free, no API key)
  const news = await scrapeGoogleNews(20)
  if (news.length > 0) {
    sources.push(`Google News RSS (${news.length} articles)`)
    allPosts.push(...news)
  } else {
    skipped.push('Google News RSS (no results)')
  }

  // Honest reporting: platforms we cannot access without API keys
  skipped.push('Facebook (requires Meta Graph API token — not free)')
  skipped.push('Instagram (requires Meta Graph API token — not free)')
  skipped.push('TikTok (requires Research API approval)')
  skipped.push('X/Twitter (requires X API v2 Bearer token — $100/month)')

  return { posts: allPosts, sources, skipped }
}
