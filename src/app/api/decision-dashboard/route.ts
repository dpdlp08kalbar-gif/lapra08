// LAPRA 08 - API: Decision Dashboard - sintesis AI untuk pengambil keputusan
// GET - Returns aggregated decision-ready insights from all sources
//
// FAN-OUT #4: Real-time cache invalidation
// Cache hanya 5 detik (bukan 60 detik) + invalidate saat event COUNTER_ISSUE_DRAFT_GENERATED masuk
// Saat opinion-link baru di-scrape → cache otomatis expired → dashboard auto-refresh
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// === REDUCED: 5 detik cache (dari 60 detik) — anti stale data saat kritis ===
// Vercel Free 10s timeout aman karena query DB cepat (<2s)
let _cache: { ts: number; data: any; territoryCode: string | null } | null = null
const CACHE_TTL_MS = 5 * 1000 // 5 detik (real-time enough, anti DB hammering)

// === NEW: Cache invalidation timestamp — set saat ada event masuk ===
let _invalidateAt = 0
export function invalidateDecisionDashboardCache() {
  _invalidateAt = Date.now()
  _cache = null // immediate flush
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const territory = await db.territory.findUnique({ where: { id: user.territoryId } })
  const territoryCode = territory?.code ?? null

  // Use cache if (a) fresh and (b) same territory scope and (c) not invalidated
  if (
    _cache &&
    Date.now() - _cache.ts < CACHE_TTL_MS &&
    _cache.territoryCode === territoryCode &&
    _cache.ts > _invalidateAt
  ) {
    return NextResponse.json({ success: true, data: _cache.data, cached: true })
  }

  // RBAC filter for opinion links
  const linkWhere: any = {}
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    if (territory?.level === 'PROVINCE') {
      linkWhere.OR = [{ provinceCode: territory.code }, { provinceCode: null }]
    } else if (territory?.level === 'REGENCY') {
      linkWhere.OR = [{ regencyCode: territory.code }, { regencyCode: null }]
    }
  }

  // Fetch all data sources in parallel
  const [opinionLinks, essayPolls, auditScans] = await Promise.all([
    db.publicOpinionLink.findMany({
      where: linkWhere,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take: 50,
      select: { id: true, url: true, title: true, platform: true, sentiment: true, priority: true, urgencyScore: true, category: true, provinceName: true, regencyName: true, engagementCount: true, createdAt: true, status: true, aiSummary: true }
    }),
    db.essayPoll.findMany({
      where: linkWhere.targetScope ? undefined : undefined,
      include: {
        _count: { select: { responses: true } },
        responses: {
          select: { aiSentiment: true, aiScore: true, aiCategory: true },
          take: 50,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.auditScan.findMany({
      where: linkWhere.scope ? undefined : undefined,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, totalMentions: true, totalComplaints: true, needsResponse: true, ignoredCount: true, status: true, createdAt: true, scope: true }
    }),
  ])

  // === SINTESIS AI untuk pengambil keputusan ===
  // 1. Top 5 wilayah paling urgent (most mentions + most HIGH priority)
  const wilayahMap: Record<string, { name: string, total: number, high: number, negative: number, engagement: number }> = {}
  for (const link of opinionLinks) {
    const loc = link.regencyName || link.provinceName || 'Nasional'
    if (!wilayahMap[loc]) wilayahMap[loc] = { name: loc, total: 0, high: 0, negative: 0, engagement: 0 }
    wilayahMap[loc].total++
    if (link.priority === 'HIGH') wilayahMap[loc].high++
    if (link.sentiment === 'NEGATIVE') wilayahMap[loc].negative++
    wilayahMap[loc].engagement += link.engagementCount || 0
  }
  const topWilayahUrgent = Object.values(wilayahMap)
    .sort((a, b) => (b.high * 3 + b.negative) - (a.high * 3 + a.negative))
    .slice(0, 5)

  // 2. Top 3 kategori isu paling banyak dibahas
  const categoryMap: Record<string, number> = {}
  for (const link of opinionLinks) {
    categoryMap[link.category] = (categoryMap[link.category] || 0) + 1
  }
  const topKategori = Object.entries(categoryMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat, count]) => ({ category: cat, count }))

  // 3. Top 3 platform dengan engagement tertinggi
  const platformMap: Record<string, { total: number, engagement: number }> = {}
  for (const link of opinionLinks) {
    if (!platformMap[link.platform]) platformMap[link.platform] = { total: 0, engagement: 0 }
    platformMap[link.platform].total++
    platformMap[link.platform].engagement += link.engagementCount || 0
  }
  const topPlatform = Object.entries(platformMap)
    .sort(([, a], [, b]) => b.engagement - a.engagement)
    .slice(0, 3)
    .map(([platform, stats]) => ({ platform, ...stats }))

  // 4. Action items untuk DPN/DPD/DPC — TIDAK MENYESATKAN
  // Logic baru: cek kombinasi total mention + sentiment negatif + priority
  const actionItems: { wilayah: string, aksi: string, prioritas: string, deadline: string, alasan: string }[] = []
  for (const w of topWilayahUrgent) {
    if (w.high > 0) {
      actionItems.push({
        wilayah: w.name,
        aksi: `Segera lakukan klarifikasi publik + kunjungan lapangan ke lokasi isu`,
        prioritas: 'TINGGI',
        deadline: '1x24 jam',
        alasan: `${w.high} mention HIGH priority + ${w.negative} sentimen negatif di wilayah ini`,
      })
    } else if (w.negative > 0) {
      actionItems.push({
        wilayah: w.name,
        aksi: `Siapkan statement resmi + koordinasi dengan dinas terkait + respons cepat`,
        prioritas: 'SEDANG',
        deadline: '3x24 jam',
        alasan: `${w.negative} sentimen negatif terdeteksi di wilayah ini`,
      })
    } else if (w.total >= 5) {
      // Total mention banyak tapi tidak ada negatif — masih perlu monitor intensif
      actionItems.push({
        wilayah: w.name,
        aksi: `Monitor intensif + siapkan konten positif untuk counter narrative jika muncul isu`,
        prioritas: 'SEDANG',
        deadline: 'Mingguan',
        alasan: `${w.total} mention terdeteksi di wilayah ini — aktivitas publik tinggi`,
      })
    } else if (w.total > 0) {
      actionItems.push({
        wilayah: w.name,
        aksi: `Monitor perkembangan opini + dokumentasikan untuk laporan bulanan`,
        prioritas: 'RENDAH',
        deadline: 'Mingguan',
        alasan: `${w.total} mention di wilayah ini, sentimen dominan netral`,
      })
    }
  }

  // 5. Tren sentimen (positif vs negatif)
  const sentimentTrend = {
    positive: opinionLinks.filter(l => l.sentiment === 'POSITIVE').length,
    neutral: opinionLinks.filter(l => l.sentiment === 'NEUTRAL').length,
    negative: opinionLinks.filter(l => l.sentiment === 'NEGATIVE').length,
    total: opinionLinks.length,
  }
  sentimentTrend.total = sentimentTrend.positive + sentimentTrend.neutral + sentimentTrend.negative
  const sentimentIndex = sentimentTrend.total > 0
    ? Math.round(((sentimentTrend.positive - sentimentTrend.negative) / sentimentTrend.total) * 100)
    : 0

  // 6. Active essay polls (untuk monitoring real-time)
  const activePolls = essayPolls.filter(p => p.status === 'ACTIVE').map(p => ({
    id: p.id, title: p.title, totalResponses: p._count.responses,
    positiveResponses: p.responses.filter(r => r.aiSentiment === 'POSITIVE').length,
    negativeResponses: p.responses.filter(r => r.aiSentiment === 'NEGATIVE').length,
  }))

  // 7. Executive Summary
  const executiveSummary = generateExecutiveSummary({
    sentimentTrend, topWilayahUrgent, topKategori, topPlatform, actionItems, activePolls, auditScans
  })

  const data = {
    executiveSummary,
    sentimentTrend,
    sentimentIndex,
    topWilayahUrgent,
    topKategori,
    topPlatform,
    actionItems,
    activePolls,
    auditHistory: auditScans,
    stats: {
      totalOpinionLinks: opinionLinks.length,
      totalEssayPolls: essayPolls.length,
      totalAuditScans: auditScans.length,
      needsAction: opinionLinks.filter(l => l.status === 'NEW' && (l.priority === 'HIGH' || l.priority === 'MEDIUM')).length,
    },
  }

  _cache = { ts: Date.now(), data, territoryCode }

  return NextResponse.json({ success: true, data, cached: false })
}

function generateExecutiveSummary(data: any) {
  const { sentimentTrend, topWilayahUrgent, topKategori, actionItems, activePolls, auditScans } = data
  const total = sentimentTrend.total || 1
  const negPct = Math.round((sentimentTrend.negative / total) * 100)
  const posPct = Math.round((sentimentTrend.positive / total) * 100)

  let summary = `Berdasarkan analisis ${sentimentTrend.total} mention dari medsos dan berita, `
  summary += `${negPct}% sentimen NEGATIF, ${posPct}% POSITIF, sisanya NETRAL. `

  if (topWilayahUrgent.length > 0) {
    summary += `Wilayah paling urgent: ${topWilayahUrgent.slice(0, 3).map((w: any) => w.name).join(', ')}. `
  }

  if (topKategori.length > 0) {
    summary += `Isu terbanyak: ${topKategori.map((k: any) => `${k.category} (${k.count})`).join(', ')}. `
  }

  if (actionItems.length > 0) {
    const urgent = actionItems.filter((a: any) => a.prioritas === 'TINGGI').length
    summary += `${actionItems.length} aksi perlu diambil (${urgent} prioritas TINGGI). `
  }

  if (activePolls.length > 0) {
    summary += `${activePolls.length} essay poll aktif sedang berjalan. `
  }

  if (auditScans.length > 0) {
    const latest = auditScans[0]
    summary += `Audit terakhir (${new Date(latest.createdAt).toLocaleDateString('id-ID')}): ${latest.totalMentions} mention, ${latest.needsResponse} butuh respon.`
  } else {
    summary += `Belum ada audit yang dijalankan. Disarankan: jalankan Audit AI Responding segera.`
  }

  return summary
}
