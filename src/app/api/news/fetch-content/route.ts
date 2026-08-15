// LAPRA 08 - API: News Fetch Content (Page Reader — pakai fetch() + HTML parser FOSS)
// POST /api/news/fetch-content { url } - fetch full article: title, content (plain text), publishedTime, imageUrl
//
// === Z.AI SDK DIHAPUS — sesuai permintaan user (tidak diizinkan pakai Z.AI) ===
// Sekarang pakai fetch() standar + regex HTML parser (FOSS, gratis, no API key)
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/server-helpers'

// Strip HTML tags & convert to plain text. Collapses whitespace.
function htmlToPlainText(html: string): string {
  if (!html) return ''
  let s = html

  // Remove script, style, noscript blocks entirely
  s = s.replace(/<(script|style|noscript|svg|iframe|form|header|footer|nav)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')

  // Replace block-level closers with newlines for readability
  s = s.replace(/<\/(p|div|section|article|h[1-6]|li|ul|ol|table|tr|td|th|br|blockquote)\s*>/gi, '\n')
  s = s.replace(/<br\s*\/?>/gi, '\n')

  // Drop all remaining tags
  s = s.replace(/<[^>]+>/g, ' ')

  // Decode common HTML entities
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))

  // Collapse whitespace
  s = s.replace(/[ \t]+/g, ' ')
  s = s.replace(/\n\s*\n+/g, '\n\n')
  s = s.replace(/^\s+|\s+$/g, '')

  return s
}

// Extract first <img> URL inside the article body (skip logo/avatars)
function extractFirstImageFromHtml(html: string): string | null {
  if (!html) return null
  const imgMatch = html.match(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/i)
  return imgMatch && imgMatch[1] ? imgMatch[1] : null
}

// === Parse metadata dari <meta> tags (og:title, og:image, dll) ===
function parseMetaTags(html: string): Record<string, string> {
  const meta: Record<string, string> = {}
  // Match <meta property="og:title" content="..."> atau <meta name="twitter:title" content="...">
  const metaRegex = /<meta\s+(?:property|name)=["']([^"']+)["']\s+content=["']([^"']*)["']/gi
  let match
  while ((match = metaRegex.exec(html)) !== null) {
    if (match[1] && match[2]) {
      meta[match[1].toLowerCase()] = match[2]
    }
  }
  // Match reverse order: content first then property/name
  const metaRegexReverse = /<meta\s+content=["']([^"']*)["']\s+(?:property|name)=["']([^"']+)["']/gi
  while ((match = metaRegexReverse.exec(html)) !== null) {
    if (match[1] && match[2]) {
      meta[match[2].toLowerCase()] = match[1]
    }
  }
  return meta
}

// === Extract <title>...</title> ===
function extractTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match && match[1] ? match[1].trim() : null
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    return NextResponse.json(
      { success: false, error: 'Hanya Super Admin / Admin DPN yang dapat mengambil konten berita' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const url = (body.url || '').trim()

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL artikel wajib diisi' },
        { status: 400 }
      )
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { success: false, error: 'URL tidak valid' },
        { status: 400 }
      )
    }

    // === HAPUS Z.AI — pakai fetch() standar (FOSS, gratis) ===
    let html = ''
    try {
      const fetchRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LAPRA08Bot/1.0; +https://lapra08.vercel.app)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000), // 15 detik timeout
      })
      if (!fetchRes.ok) {
        return NextResponse.json(
          { success: false, error: `Gagal fetch URL: HTTP ${fetchRes.status}` },
          { status: 502 }
        )
      }
      html = await fetchRes.text()
    } catch (fetchErr: any) {
      return NextResponse.json(
        { success: false, error: `Gagal fetch URL: ${fetchErr.message}` },
        { status: 502 }
      )
    }

    if (!html) {
      return NextResponse.json(
        { success: false, error: 'Tidak dapat membaca konten halaman' },
        { status: 502 }
      )
    }

    // === Parse metadata dari <meta> tags ===
    const metadata = parseMetaTags(html)

    // Title: prefer og:title then <title> tag then twitter:title
    const titleTag = extractTitleTag(html)
    const title: string = metadata['og:title'] || titleTag || metadata['twitter:title'] || ''

    // Published time: prefer article:published_time then article:modified_time
    const publishedTime: string | null =
      metadata['article:published_time'] ||
      metadata['article:modified_time'] ||
      null

    // Image: prefer og:image then twitter:image then first <img> in HTML
    let imageUrl: string | null =
      metadata['og:image'] ||
      metadata['twitter:image'] ||
      metadata['og:image:secure_url'] ||
      null

    if (!imageUrl) {
      imageUrl = extractFirstImageFromHtml(html)
    }

    // Description: prefer og:description then meta description
    const description: string = metadata['og:description'] || metadata['description'] || ''

    // Convert HTML to plain text
    const content = htmlToPlainText(html)

    return NextResponse.json({
      success: true,
      data: {
        url,
        title,
        content,
        description,
        publishedTime,
        imageUrl,
        hostName: (() => {
          try { return new URL(url).hostname } catch { return '' }
        })(),
      },
    })
  } catch (e: any) {
    console.error('[News Fetch Content Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
