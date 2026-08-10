// LAPRA 08 - API: Audit AI Responding Otomatis (AUTO SCRAPER, ZERO CONFIG)
// POST: Trigger scan — automatically scrapes YouTube (yt-dlp) + Google News RSS
// GET: List scan results with RBAC
//
// 100% AUTOMATIC — NO API KEY CONFIGURATION REQUIRED.
// User just clicks "Audit AI Responding Otomatis" button and gets REAL data instantly.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { scrapeAuto, ScrapedPost } from '@/lib/auto-scraper'
import { analyzeSentiment, calculatePriority, detectLocation } from '@/lib/social-scraper'

// GET - List scans with RBAC
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const territory = await db.territory.findUnique({ where: { id: user.territoryId } })
  const where: any = {}

  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    if (territory?.level === 'PROVINCE') {
      where.OR = [{ scope: 'NATIONAL' }, { scope: 'PROVINCE', provinceCode: territory.code }]
    } else if (territory?.level === 'REGENCY') {
      where.OR = [{ scope: 'NATIONAL' }, { scope: 'PROVINCE', provinceCode: territory.parentId }, { scope: 'REGENCY', regencyCode: territory.code }]
    }
  }

  const scans = await db.auditScan.findMany({
    where,
    include: { triggeredBy: { select: { fullName: true } }, _count: { select: { complaints: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({ success: true, data: scans })
}

// POST - Trigger new AUTO scan (no API keys needed)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const { platforms } = body || {}
    // platforms parameter is now ignored — auto scraper uses ALL available free sources automatically.
    // We accept the param for backward compatibility with the UI.
    void platforms

    const territory = await db.territory.findUnique({ where: { id: user.territoryId } })
    let scope = 'NATIONAL'
    let provinceCode: string | null = null
    let regencyCode: string | null = null

    if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
      if (territory?.level === 'PROVINCE') {
        scope = 'PROVINCE'; provinceCode = territory.code
      } else if (territory?.level === 'REGENCY') {
        scope = 'REGENCY'; regencyCode = territory.code
      }
    }

    // Create scan record (status RUNNING)
    const scan = await db.auditScan.create({
      data: {
        triggeredById: user.id,
        platforms: 'AUTO (yt-dlp + Google News RSS)',
        scope, provinceCode, regencyCode,
        status: 'RUNNING',
      },
    })

    console.log(`[Audit AI] Auto scan ${scan.id} started by ${user.fullName} | Scope: ${scope}`)

    // === AUTO SCRAPE — zero config, no API keys ===
    const { posts, sources, skipped } = await scrapeAuto()
    console.log(`[Audit AI] Scan ${scan.id}: ${posts.length} REAL posts from ${sources.length} sources`)

    // Insert all posts as complaints
    let needsResponse = 0
    let ignoredCount = 0

    for (const post of posts) {
      const sentiment = analyzeSentiment(post.title + ' ' + post.content)
      const priority = calculatePriority(post.title + ' ' + post.content, post.engagementCount, sentiment.sentiment)
      const loc = detectLocation(post.title + ' ' + post.content)

      // Apply RBAC location filter
      if (scope === 'PROVINCE' && provinceCode && loc.provinceCode && loc.provinceCode !== provinceCode) continue
      if (scope === 'REGENCY' && regencyCode && loc.regencyCode && loc.regencyCode !== regencyCode) continue

      // AI Recommendation
      const locName = loc.regencyName || loc.provinceName || 'Nasional'
      let aiAction = 'MONITOR'
      let aiRec = `Prioritas ${priority.priority === 'HIGH' ? 'TINGGI' : priority.priority === 'MEDIUM' ? 'SEDANG' : 'RENDAH'}: Lokasi: ${locName}. `

      if (priority.priority === 'HIGH') {
        aiAction = priority.category === 'INFRASTRUKTUR' ? 'FIELD_VISIT' : 'CLARIFICATION'
        aiRec += `Tim DPC ${locName} wajib turun ke lapangan dalam 1x24 jam. ${post.platform === 'YOUTUBE' ? 'Ini adalah video YouTube tentang LAPRA 08 yang perlu direspon.' : 'Ini adalah artikel berita yang menyebut LAPRA 08.'} Laporkan ke DPD dalam 2x24 jam.`
      } else if (priority.priority === 'MEDIUM') {
        aiAction = 'COORDINATE'
        aiRec += `Tim DPC ${locName} disarankan koordinasi dengan dinas terkait dalam 3x24 jam.`
      } else {
        aiRec += `Monitor perkembangan dan dokumentasikan untuk laporan bulanan.`
      }

      if (sentiment.sentiment === 'NEGATIVE' || priority.priority !== 'LOW') needsResponse++
      ignoredCount++

      await db.auditComplaint.create({
        data: {
          scanId: scan.id,
          platform: post.platform,
          author: post.author,
          authorHandle: post.authorHandle,
          content: post.content.substring(0, 800),
          url: post.url,
          publishedAt: post.publishedAt,
          provinceCode: loc.provinceCode,
          provinceName: loc.provinceName,
          regencyCode: loc.regencyCode,
          regencyName: loc.regencyName,
          priority: priority.priority,
          urgencyScore: priority.urgencyScore,
          category: priority.category,
          sentiment: sentiment.sentiment,
          keywords: JSON.stringify({ source: post.source, originalPlatform: post.platform }),
          responseStatus: (sentiment.sentiment === 'NEGATIVE' || priority.priority !== 'LOW') ? 'IGNORED' : 'NO_RESPONSE_NEEDED',
          aiRecommendation: aiRec,
          aiActionType: aiAction,
          engagementCount: post.engagementCount,
        },
      })

      // === ALSO sync to PublicOpinionLink table (single source of truth for Decision Dashboard) ===
      // Upsert: if URL exists, skip; if not, create new entry
      try {
        const existingLink = await db.publicOpinionLink.findUnique({ where: { url: post.url } })
        if (!existingLink) {
          await db.publicOpinionLink.create({
            data: {
              url: post.url,
              platform: post.platform,
              title: (post.title || post.content || '').substring(0, 500),
              content: post.content.substring(0, 1000),
              author: post.author,
              authorHandle: post.authorHandle,
              publishedAt: post.publishedAt,
              engagementCount: post.engagementCount,
              provinceCode: loc.provinceCode,
              provinceName: loc.provinceName,
              regencyCode: loc.regencyCode,
              regencyName: loc.regencyName,
              sentiment: sentiment.sentiment,
              priority: priority.priority,
              urgencyScore: priority.urgencyScore,
              category: priority.category,
              keywords: JSON.stringify({ source: post.source, scanId: scan.id }),
              aiSummary: `Via Audit AI: ${sentiment.sentiment}. ${priority.category}. Urgency ${priority.urgencyScore}/100. ${loc.regencyName || loc.provinceName || 'Nasional'}.`,
              status: 'NEW',
              sourceMethod: 'AUTO',
              scanId: scan.id,
            },
          })
        }
      } catch (e: any) {
        // Don't fail the whole scan if a single upsert fails
        console.error('[Audit AI] Sync to PublicOpinionLink failed:', e.message)
      }
    }

    // Update scan stats (mark COMPLETED)
    const updated = await db.auditScan.update({
      where: { id: scan.id },
      data: {
        totalMentions: posts.length,
        totalComplaints: ignoredCount,
        needsResponse,
        ignoredCount,
        status: 'COMPLETED',
      },
      include: { _count: { select: { complaints: true } } },
    })

    const sourcesLine = sources.length > 0 ? sources.join(' + ') : 'no sources available'
    const skippedLine = skipped.length > 0 ? ` | Dilewati: ${skipped.length} platform (perlu API berbayar)` : ''
    const summary = `Audit OTOMATIS selesai. ${posts.length} REAL mention dari ${sourcesLine}.${skippedLine} ${needsResponse} wajib direspon.`

    return NextResponse.json({
      success: true,
      data: updated,
      message: summary,
      sources,
      skipped,
    })
  } catch (e: any) {
    console.error('[Audit AI Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
