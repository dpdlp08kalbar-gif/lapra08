// LAPRA 08 - API: Audit AI Responding Otomatis (REAL scraper)
// POST: Trigger scan across Facebook, Instagram, TikTok, X, Google using REAL data sources
// GET: List scan results with RBAC
//
// DATA SOURCE PRIORITY (HONEST):
// 1. If Meta Graph API integration configured → scrape REAL Facebook posts + comments directly
// 2. If Instagram Graph API integration configured → scrape REAL Instagram media + comments directly
// 3. If YouTube Data API v3 key configured → scrape REAL YouTube videos + comments directly
// 4. If TikTok Display API configured → scrape REAL TikTok videos (requires Research API approval)
// 5. If X API v2 Bearer Token configured → scrape REAL tweets directly ($100/mo)
// 6. FALLBACK: Google News RSS with site: filters → returns REAL news articles about LAPRA 08
//    (this finds indexed FB/IG/TikTok/X posts but only via Google's news index)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { scrapeAllPlatforms, buildComplaint, analyzeSentiment, calculatePriority, detectLocation, ScrapedMention } from '@/lib/social-scraper'
import { scrapeAllViaApi, ApiScrapedPost } from '@/lib/api-scraper'

// Local aliases for clarity
const analyzeSentimentSimple = analyzeSentiment
const calculatePrioritySimple = calculatePriority
const detectLocationSimple = detectLocation

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

    // === STEP 1: Try REAL API integrations first (direct platform access) ===
    const apiResult = await scrapeAllViaApi()
    const apiPosts: ApiScrapedPost[] = apiResult.posts
    const apiSources: string[] = apiResult.sources

    console.log(`[Audit AI] Scan ${scan.id}: API integrations returned ${apiPosts.length} posts from sources: ${apiSources.join(', ') || 'none'}`)

    // === STEP 2: FALLBACK to Google News RSS (always runs as backup/complement) ===
    // Even with API integrations, Google News RSS gives broader coverage of news mentioning LAPRA 08.
    // This is the ONLY free option that works without API keys.
    const rssMentions: ScrapedMention[] = await scrapeAllPlatforms(scanPlatforms, { provinceCode, regencyCode })
    console.log(`[Audit AI] Scan ${scan.id}: Google News RSS returned ${rssMentions.length} mentions (fallback/complement)`)

    // === STEP 3: Merge all results into AuditComplaint records ===
    let needsResponse = 0
    let ignoredCount = 0

    // Process API posts (REAL direct platform data)
    for (const p of apiPosts) {
      const sentimentResult = analyzeSentimentSimple(p.content)
      const priorityResult = calculatePrioritySimple(p.content, p.engagementCount, sentimentResult.sentiment)
      const loc = detectLocationSimple(p.content)
      const locName = loc.regencyName || loc.provinceName || 'Nasional'

      let aiAction = 'MONITOR'
      let aiRec = `Prioritas ${priorityResult.priority === 'HIGH' ? 'TINGGI' : priorityResult.priority === 'MEDIUM' ? 'SEDANG' : 'RENDAH'} (via ${p.platform} API direct): Lokasi: ${locName}. `

      if (priorityResult.priority === 'HIGH') {
        aiAction = priorityResult.category === 'INFRASTRUKTUR' ? 'FIELD_VISIT' : 'CLARIFICATION'
        aiRec += `Tim DPC ${locName} wajib turun ke lapangan dalam 1x24 jam. ${p.isComment ? 'Ini adalah komentar warganet pada post LAPRA 08.' : 'Ini adalah post tentang LAPRA 08.'} Laporkan ke DPD dalam 2x24 jam.`
      } else if (priorityResult.priority === 'MEDIUM') {
        aiAction = 'COORDINATE'
        aiRec += `Tim DPC ${locName} disarankan koordinasi dengan dinas terkait dalam 3x24 jam.`
      } else {
        aiRec += `Monitor perkembangan dan dokumentasikan untuk laporan bulanan.`
      }

      if (sentimentResult.sentiment === 'NEGATIVE' || priorityResult.priority !== 'LOW') needsResponse++
      ignoredCount++

      await db.auditComplaint.create({
        data: {
          scanId: scan.id,
          platform: p.platform,
          author: p.author,
          authorHandle: p.authorHandle,
          content: p.content.substring(0, 800),
          url: p.url,
          publishedAt: p.publishedAt,
          provinceCode: loc.provinceCode,
          provinceName: loc.provinceName,
          regencyCode: loc.regencyCode,
          regencyName: loc.regencyName,
          priority: priorityResult.priority,
          urgencyScore: priorityResult.urgencyScore,
          category: priorityResult.category,
          sentiment: sentimentResult.sentiment,
          keywords: JSON.stringify({ source: 'API_DIRECT', isComment: p.isComment, parentPostId: p.parentPostId }),
          responseStatus: (sentimentResult.sentiment === 'NEGATIVE' || priorityResult.priority !== 'LOW') ? 'IGNORED' : 'NO_RESPONSE_NEEDED',
          aiRecommendation: aiRec,
          aiActionType: aiAction,
          engagementCount: p.engagementCount,
        },
      })
    }

    // Process RSS mentions (Google News fallback — REAL news articles)
    let filteredMentions = rssMentions
    if (scope === 'PROVINCE' && provinceCode) {
      filteredMentions = rssMentions.filter(m => {
        const text = `${m.title} ${m.content}`.toLowerCase()
        const provMentions = require_province_match(text)
        return !provMentions || provMentions.includes(provinceCode)
      })
    } else if (scope === 'REGENCY' && regencyCode) {
      filteredMentions = rssMentions.filter(m => {
        const text = `${m.title} ${m.content}`.toLowerCase()
        const regMentions = require_regency_match(text)
        return !regMentions || regMentions.includes(regencyCode)
      })
    }

    for (const m of filteredMentions) {
      const complaint = buildComplaint(m)
      if (complaint.sentiment === 'NEGATIVE' || complaint.priority !== 'LOW') needsResponse++
      ignoredCount++

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
          responseStatus: (complaint.sentiment === 'NEGATIVE' || complaint.priority !== 'LOW') ? 'IGNORED' : 'NO_RESPONSE_NEEDED',
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
        totalMentions: apiPosts.length + filteredMentions.length,
        totalComplaints: ignoredCount,
        needsResponse,
        ignoredCount,
        status: 'COMPLETED',
      },
      include: { _count: { select: { complaints: true } } },
    })

    const summary = apiSources.length > 0
      ? `Audit REAL selesai via ${apiSources.join(' + ')}: ${apiPosts.length} direct posts + ${filteredMentions.length} news articles. ${ignoredCount} mention total, ${needsResponse} wajib direspon.`
      : `Audit REAL via Google News RSS (fallback): ${filteredMentions.length} mention. ${needsResponse} wajib direspon. TIP: Untuk akses direct Facebook/Instagram/YouTube, konfigurasi API key di menu Integrasi API.`

    return NextResponse.json({
      success: true,
      data: updated,
      message: summary,
      sources: apiSources.length > 0 ? apiSources : ['Google News RSS (no API keys configured)'],
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
