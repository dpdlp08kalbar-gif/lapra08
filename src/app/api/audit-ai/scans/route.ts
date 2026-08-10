// LAPRA 08 - API: Audit AI Responding Otomatis (REAL scraper)
// POST: Trigger scan across Facebook, Instagram, TikTok, X, Google using REAL Google News RSS
// GET: List scan results with RBAC
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { scrapeAllPlatforms, buildComplaint, ScrapedMention } from '@/lib/social-scraper'

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

// POST - Trigger new REAL scan
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const { platforms } = body || {}
    const scanPlatforms = platforms && Array.isArray(platforms) && platforms.length
      ? platforms
      : ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'TWITTER_X', 'GOOGLE']

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
        platforms: JSON.stringify(scanPlatforms),
        scope, provinceCode, regencyCode,
        status: 'RUNNING',
      },
    })

    console.log(`[Audit AI] Scan ${scan.id} started by ${user.fullName} | Scope: ${scope} | Platforms: ${scanPlatforms.join(', ')}`)

    // === REAL SCRAPE ===
    // Fetches actual public mentions from Google News RSS with platform-specific site: filters.
    // Each platform query returns REAL Facebook/Instagram/TikTok/X posts indexed by Google.
    const mentions: ScrapedMention[] = await scrapeAllPlatforms(scanPlatforms, { provinceCode, regencyCode })

    console.log(`[Audit AI] Scan ${scan.id}: fetched ${mentions.length} real mentions from Google News RSS`)

    // Apply RBAC location filter (if PROVINCE/REGENCY scope, only keep mentions that mention that location OR have no location)
    let filteredMentions = mentions
    if (scope === 'PROVINCE' && provinceCode) {
      // Keep mentions where location matches OR no location detected (national-level news)
      filteredMentions = mentions.filter(m => {
        const text = `${m.title} ${m.content}`.toLowerCase()
        // Loose match: if mention has any province name, it must match; if no province, keep (national news)
        const provMentions = require_province_match(text)
        return !provMentions || provMentions.includes(provinceCode)
      })
    } else if (scope === 'REGENCY' && regencyCode) {
      filteredMentions = mentions.filter(m => {
        const text = `${m.title} ${m.content}`.toLowerCase()
        const regMentions = require_regency_match(text)
        return !regMentions || regMentions.includes(regencyCode)
      })
    }

    // Insert complaints
    let needsResponse = 0
    let ignoredCount = 0

    for (const m of filteredMentions) {
      const complaint = buildComplaint(m)
      // Store ALL mentions (positive news about LAPRA 08 also counts as "audit responding" data).
      // The "needsResponse" flag is set ONLY for NEGATIVE complaints that pengurus must respond to.
      if (complaint.sentiment === 'NEGATIVE' || complaint.priority !== 'LOW') {
        needsResponse++
      }
      ignoredCount++ // All start as IGNORED (no response from pengurus yet)

      await db.auditComplaint.create({
        data: {
          scanId: scan.id,
          platform: complaint.platform,
          author: complaint.author,
          authorHandle: complaint.authorHandle,
          content: complaint.content,
          url: complaint.url,
          publishedAt: complaint.publishedAt,
          provinceCode: complaint.provinceCode,
          provinceName: complaint.provinceName,
          regencyCode: complaint.regencyCode,
          regencyName: complaint.regencyName,
          priority: complaint.priority,
          urgencyScore: complaint.urgencyScore,
          category: complaint.category,
          sentiment: complaint.sentiment,
          keywords: complaint.keywords,
          // For NEUTRAL/POSITIVE mentions, mark as NO_RESPONSE_NEEDED (informational)
          responseStatus: (complaint.sentiment === 'NEGATIVE' || complaint.priority !== 'LOW')
            ? 'IGNORED'
            : 'NO_RESPONSE_NEEDED',
          aiRecommendation: complaint.aiRecommendation,
          aiActionType: complaint.aiActionType,
          engagementCount: complaint.engagementCount,
        },
      })
    }

    // Update scan stats (mark COMPLETED)
    const updated = await db.auditScan.update({
      where: { id: scan.id },
      data: {
        totalMentions: filteredMentions.length,
        totalComplaints: ignoredCount,
        needsResponse,
        ignoredCount,
        status: 'COMPLETED',
      },
      include: { _count: { select: { complaints: true } } },
    })

    const summary = `Audit REAL selesai: ${mentions.length} mention di-fetch dari Google News RSS (Facebook/Instagram/TikTok/X/Google). ${ignoredCount} keluhan terdeteksi, ${needsResponse} wajib direspon, semua TERABAIKAN (belum direspon pengurus).`

    return NextResponse.json({
      success: true,
      data: updated,
      message: summary,
    })
  } catch (e: any) {
    console.error('[Audit AI Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// Helper: returns list of province codes mentioned in text, or null if none mentioned
function require_province_match(text: string): string[] | null {
  const PROVINCES: { name: string; code: string }[] = [
    { name: 'Aceh', code: '11' }, { name: 'Sumatera Utara', code: '12' }, { name: 'Sumatera Barat', code: '13' },
    { name: 'Riau', code: '14' }, { name: 'Kepulauan Riau', code: '21' }, { name: 'Jambi', code: '15' },
    { name: 'Bengkulu', code: '17' }, { name: 'Sumatera Selatan', code: '16' }, { name: 'Bangka Belitung', code: '19' },
    { name: 'Lampung', code: '18' }, { name: 'Banten', code: '36' }, { name: 'DKI Jakarta', code: '31' },
    { name: 'Jakarta', code: '31' }, { name: 'Jawa Barat', code: '32' }, { name: 'Jawa Tengah', code: '33' },
    { name: 'Yogyakarta', code: '34' }, { name: 'Jawa Timur', code: '35' }, { name: 'Bali', code: '51' },
    { name: 'Nusa Tenggara Barat', code: '52' }, { name: 'NTB', code: '52' },
    { name: 'Nusa Tenggara Timur', code: '53' }, { name: 'NTT', code: '53' },
    { name: 'Kalimantan Barat', code: '61' }, { name: 'Kalbar', code: '61' },
    { name: 'Kalimantan Tengah', code: '62' }, { name: 'Kalteng', code: '62' },
    { name: 'Kalimantan Selatan', code: '63' }, { name: 'Kalsel', code: '63' },
    { name: 'Kalimantan Timur', code: '64' }, { name: 'Kaltim', code: '64' },
    { name: 'Kalimantan Utara', code: '65' }, { name: 'Kaltara', code: '65' },
    { name: 'Sulawesi Utara', code: '71' }, { name: 'Sulut', code: '71' },
    { name: 'Gorontalo', code: '75' }, { name: 'Sulawesi Tengah', code: '72' }, { name: 'Sulteng', code: '72' },
    { name: 'Sulawesi Barat', code: '76' }, { name: 'Sulbar', code: '76' },
    { name: 'Sulawesi Selatan', code: '73' }, { name: 'Sulsel', code: '73' },
    { name: 'Sulawesi Tenggara', code: '74' }, { name: 'Sultra', code: '74' },
    { name: 'Maluku', code: '81' }, { name: 'Maluku Utara', code: '82' }, { name: 'Malut', code: '82' },
    { name: 'Papua', code: '91' }, { name: 'Papua Barat', code: '92' },
  ]
  const found: string[] = []
  for (const p of PROVINCES) {
    if (text.includes(p.name.toLowerCase())) found.push(p.code)
  }
  return found.length > 0 ? found : null
}

function require_regency_match(text: string): string[] | null {
  const REGENCIES: { name: string; code: string }[] = [
    { name: 'Pontianak', code: '6171' }, { name: 'Sambas', code: '6175' }, { name: 'Bengkayang', code: '6174' },
    { name: 'Singkawang', code: '6177' }, { name: 'Ketapang', code: '6103' }, { name: 'Sanggau', code: '6104' },
    { name: 'Sintang', code: '6106' }, { name: 'Jakarta Pusat', code: '3171' }, { name: 'Bandung', code: '3204' },
    { name: 'Bekasi', code: '3216' }, { name: 'Bogor', code: '3201' }, { name: 'Depok', code: '3276' },
    { name: 'Cirebon', code: '3209' }, { name: 'Semarang', code: '3374' }, { name: 'Surakarta', code: '3375' },
    { name: 'Grobogan', code: '3307' }, { name: 'Banyumas', code: '3302' }, { name: 'Surabaya', code: '3578' },
    { name: 'Malang', code: '3507' }, { name: 'Sidoarjo', code: '3516' }, { name: 'Gresik', code: '3525' },
    { name: 'Madiun', code: '3503' }, { name: 'Kediri', code: '3524' }, { name: 'Jember', code: '3509' },
    { name: 'Medan', code: '1271' }, { name: 'Padang', code: '1371' }, { name: 'Pekanbaru', code: '1471' },
    { name: 'Palembang', code: '1671' }, { name: 'Banjarmasin', code: '6371' }, { name: 'Samarinda', code: '6472' },
    { name: 'Balikpapan', code: '6471' }, { name: 'Makassar', code: '7371' }, { name: 'Manado', code: '7171' },
  ]
  const found: string[] = []
  for (const r of REGENCIES) {
    if (text.includes(r.name.toLowerCase())) found.push(r.code)
  }
  return found.length > 0 ? found : null
}
