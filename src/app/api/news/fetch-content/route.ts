// LAPRA 08 - API: News Fetch Content (Page Reader via z-ai-web-dev-sdk)
// POST /api/news/fetch-content { url } - fetch full article: title, content (plain text), publishedTime, imageUrl
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/server-helpers'
import { requireZaiConfig } from '@/lib/zai-init'

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

    // === Init ZAI config dari env vars (untuk Vercel serverless) ===
    if (!requireZaiConfig()) {
      return NextResponse.json({
        success: false,
        error: 'Konfigurasi ZAI SDK belum lengkap. Set env vars: ZAI_BASE_URL, ZAI_API_KEY, ZAI_CHAT_ID, ZAI_TOKEN, ZAI_USER_ID di Vercel Project Settings.',
      }, { status: 500 })
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const rawResult = await zai.functions.invoke('page_reader', { url })

    // The SDK may return either the data directly or wrapped in { data }
    const data: any =
      rawResult && typeof rawResult === 'object' && 'data' in rawResult
        ? (rawResult as any).data
        : rawResult

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Tidak dapat membaca konten halaman' },
        { status: 502 }
      )
    }

    const html: string = data.html || ''
    const metadata: any = data.metadata || {}

    // Title: prefer og:title then explicit title
    const title: string = data.title || metadata['og:title'] || metadata['twitter:title'] || ''

    // Published time: prefer explicit, then metadata article:published_time
    const publishedTime: string | null =
      data.publishedTime ||
      metadata['article:published_time'] ||
      metadata['article:modified_time'] ||
      null

    // Image: prefer og:image then twitter:image, then first <img> in HTML
    let imageUrl: string | null =
      metadata['og:image'] ||
      metadata['twitter:image'] ||
      metadata['og:image:secure_url'] ||
      null

    if (!imageUrl) {
      imageUrl = extractFirstImageFromHtml(html)
    }

    // Convert HTML to plain text
    const content = htmlToPlainText(html)

    // Also expose short description (often a clean summary)
    const description: string = data.description || metadata['og:description'] || ''

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
