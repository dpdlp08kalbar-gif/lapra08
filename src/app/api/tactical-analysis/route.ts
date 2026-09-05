// LAPRA 08 - API: Tactical Analysis (3 kemampuan AI taktis)
// ============================================================
// 100% rule-based (keyword + template), no LLM, Vercel Free
//
// 1. Scan Isu Hangat: cluster berita berdasarkan topik
// 2. Deteksi Peluang Politik: 5 type (RISIKO/AMPLIFIKASI/PELUANG_DAERAH/GAP/TREND)
// 3. Rekomendasi Aksi Taktis: 6 actionType (FIELD/DIGITAL/BROADCAST/CLARIFY/COORDINATE/MONITOR)
//
// Sumber: Announcement + PublicOpinionLink + EssayResponse (3 sumber gabungan)
// Simpan rekomendasi HIGH/URGENT ke AIRecommendation table untuk tracking
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, logAccess } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRABOWO_KW = ['prabowo', 'presiden prabowo', 'prabowo subianto', 'astacita', 'asta cita',
                   'kabinet merah putih', 'prabowo gibran', 'mbg', 'makan bergizi',
                   'lapra 08', 'lapra08', 'laskar prabowo 08', 'laskar prabowo', 'relawan prabowo']
const POSITIVE_KW = ['apresiasi', 'puji', 'dukung', 'setuju', 'bagus', 'baik', 'hebat',
                     'sukses', 'berhasil', 'kompak', 'sambut', 'restu']
const NEGATIVE_KW = ['kritik', 'kecewa', 'tolak', 'gagal', 'buruk', 'protes', 'demo',
                     'korupsi', 'skandal', 'tersangka', 'konflik', 'mundur']

function sentiment(text: string): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
  const lower = (text || '').toLowerCase()
  const pos = POSITIVE_KW.some(kw => lower.includes(kw))
  const neg = NEGATIVE_KW.some(kw => lower.includes(kw))
  if (pos && !neg) return 'POSITIVE'
  if (neg && !pos) return 'NEGATIVE'
  return 'NEUTRAL'
}

function isPrabowo(text: string): boolean {
  const lower = (text || '').toLowerCase()
  return PRABOWO_KW.some(kw => lower.includes(kw))
}

// Detect dominant topic dari text
function detectTopic(text: string): string {
  const t = (text || '').toLowerCase()
  if (t.includes('mbg') || t.includes('makan bergizi') || t.includes('makan gratis')) return 'MBG (Makan Bergizi)'
  if (t.includes('astacita') || t.includes('asta cita')) return 'Astacita'
  if (t.includes('kabinet merah putih')) return 'Kabinet Merah Putih'
  if (t.includes('prabowo gibran')) return 'Prabowo-Gibran'
  if (t.includes('lapra') || t.includes('laskar prabowo')) return 'LAPRA 08'
  if (t.includes('relawan')) return 'Relawan Prabowo'
  if (t.includes('bansos') || t.includes('bantuan sosial')) return 'Bansos'
  if (t.includes('infrastruktur') || t.includes('jalan') || t.includes('jembatan')) return 'Infrastruktur'
  if (t.includes('pendidikan') || t.includes('sekolah')) return 'Pendidikan'
  if (t.includes('kesehatan') || t.includes('bpjs')) return 'Kesehatan'
  if (t.includes('umkm') || t.includes('koperasi')) return 'UMKM/Koperasi'
  if (t.includes('pertanian') || t.includes('petani')) return 'Pertanian'
  if (t.includes('korupsi') || t.includes('skandal')) return 'Isu Korupsi'
  if (t.includes('demo') || t.includes('protes') || t.includes('tolak')) return 'Protes/Demo'
  if (t.includes('apresiasi') || t.includes('puji')) return 'Apresiasi Publik'
  if (t.includes('kunjungan') || t.includes('sambang')) return 'Kunjungan/Sambang'
  return 'Isu Lainnya'
}

interface Item { id: string; title: string; date: Date; sourceType: string; sourceName: string;
  url?: string; sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'; engagement: number;
  provinceName?: string | null; platform?: string | null; }

// Cluster items by topic
function clusterItems(items: Item[]) {
  const clusters = new Map<string, Item[]>()
  for (const item of items) {
    const topic = detectTopic(`${item.title}`)
    const key = item.provinceName ? `${topic}#${item.provinceName}` : topic
    const arr = clusters.get(key) || []
    arr.push(item)
    clusters.set(key, arr)
  }
  return Array.from(clusters.entries()).map(([key, group]) => {
    const topic = key.split('#')[0]
    const provinceName = key.includes('#') ? key.split('#')[1] : undefined
    const provinces = new Set(group.map(g => g.provinceName).filter(Boolean))
    const scope = provinces.size === 0 ? 'UNKNOWN' : provinces.size === 1 ? 'PROVINCIAL' : 'NATIONAL'
    return {
      id: `cluster_${key.replace(/[^a-z0-9]/g, '_').substring(0, 30)}`,
      topic, itemCount: group.length,
      sentimentBreakdown: {
        positive: group.filter(g => g.sentiment === 'POSITIVE').length,
        neutral: group.filter(g => g.sentiment === 'NEUTRAL').length,
        negative: group.filter(g => g.sentiment === 'NEGATIVE').length,
      },
      totalEngagement: group.reduce((sum, g) => sum + (g.engagement || 0), 0),
      scope: scope as 'NATIONAL' | 'PROVINCIAL' | 'REGENCY' | 'UNKNOWN',
      provinceName,
      sampleTitles: [...group].sort((a, b) => (b.engagement || 0) - (a.engagement || 0)).slice(0, 3).map(g => g.title),
    }
  }).sort((a, b) => (b.totalEngagement + b.itemCount * 100) - (a.totalEngagement + a.itemCount * 100))
}

// Detect political opportunity
function detectOpportunity(cluster: any): any | null {
  const total = cluster.itemCount
  if (total === 0) return null
  const posPct = (cluster.sentimentBreakdown.positive / total) * 100
  const negPct = (cluster.sentimentBreakdown.negative / total) * 100

  if (negPct >= 40 && cluster.totalEngagement > 500) {
    return { type: 'RISIKO_NEGATIF', topic: cluster.topic, urgencyScore: Math.min(100, Math.round(negPct + cluster.totalEngagement / 100)),
      description: `Isu "${cluster.topic}" didominasi sentimen negatif (${negPct.toFixed(0)}%) dengan engagement tinggi. Perlu klarifikasi & respons cepat.` }
  }
  if (posPct >= 60) {
    return { type: 'AMPLIFIKASI_POSITIF', topic: cluster.topic, urgencyScore: Math.round(posPct),
      description: `Isu "${cluster.topic}" didominasi positif (${posPct.toFixed(0)}%). Perlu amplifikasi untuk damping citra Prabowo.` }
  }
  if (cluster.scope === 'PROVINCIAL' && posPct >= 30) {
    return { type: 'PELUANG_DAERAH', topic: cluster.topic, urgencyScore: 60,
      description: `Isu "${cluster.topic}" di ${cluster.provinceName || 'provinsi'} menunjukkan momentum positif. Aktivasi DPD untuk amplifikasi lokal.` }
  }
  if (total >= 5 && cluster.totalEngagement < 100) {
    return { type: 'GAP_RESPON', topic: cluster.topic, urgencyScore: 50,
      description: `Isu "${cluster.topic}" banyak dibicarakan (${total} berita) tapi engagement rendah. Perlu konten untuk dorong diskusi.` }
  }
  if (cluster.totalEngagement > 1000 && posPct >= cluster.sentimentBreakdown.neutral / total * 100) {
    return { type: 'TREND_NAIK', topic: cluster.topic, urgencyScore: 75,
      description: `Isu "${cluster.topic}" trending dengan engagement sangat tinggi. Momentum baik untuk dorong narasi positif.` }
  }
  return null
}

// Generate tactical recommendations
function generateRecs(cluster: any, opp: any | null): any[] {
  const recs: any[] = []
  const province = cluster.provinceName || 'nasional'
  const topic = cluster.topic

  if (opp?.type === 'RISIKO_NEGATIF') {
    recs.push({ id: `rec_${cluster.id}_clarify`, clusterId: cluster.id, topic, actionType: 'CLARIFICATION', priority: 'URGENT',
      title: `Terbitkan klarifikasi resmi isu "${topic}"`,
      description: `Segera terbitkan siaran press + postingan resmi untuk klarifikasi isu "${topic}". Siapkan 3 poin fakta + 1 statement tokoh LAPRA 08.`,
      suggestedChannels: ['Website Resmi', 'Facebook', 'Instagram', 'Twitter/X', 'Press Release'],
      suggestedAudience: 'Publik umum + Media nasional', expectedImpact: 'Reduksi sentimen negatif 30-50% dalam 7 hari' })
    recs.push({ id: `rec_${cluster.id}_field`, clusterId: cluster.id, topic, actionType: 'FIELD_VISIT', priority: 'HIGH',
      title: `Kunjungan lapangan untuk verifikasi & damping warga`,
      description: `Deploy pengurus LAPRA 08 ${province === 'nasional' ? 'lokal' : `DPD ${province}`} ke lokasi isu "${topic}". Verifikasi + damping + dokumentasi.`,
      suggestedChannels: ['Lokasi isu', 'Posko LAPRA 08 terdekat', 'Sekretariat DPD'],
      suggestedAudience: `Warga terdampak + pengurus DPD ${province}`, expectedImpact: 'Sentimen warga lokal berubah dari negatif ke netral dalam 3 hari' })
    recs.push({ id: `rec_${cluster.id}_broadcast`, clusterId: cluster.id, topic, actionType: 'BROADCAST', priority: 'HIGH',
      title: `Broadcast WA ke anggota untuk kontra-narasi`,
      description: `Kirim broadcast WhatsApp ke anggota LAPRA 08 dengan talking points untuk kontra-narasi isu "${topic}". Sertakan 3 poin fakta.`,
      suggestedChannels: ['WhatsApp Broadcast', 'Grup WA Pengurus', 'Grup WA Anggota'],
      suggestedAudience: 'Semua anggota aktif LAPRA 08', expectedImpact: 'Reach 5000+ anggota dalam 24 jam untuk counter-narrative organik' })
  } else if (opp?.type === 'AMPLIFIKASI_POSITIF') {
    recs.push({ id: `rec_${cluster.id}_digital`, clusterId: cluster.id, topic, actionType: 'DIGITAL_ACTION', priority: 'HIGH',
      title: `Buat konten viral amplify isu positif "${topic}"`,
      description: `Tim digital LAPRA 08 buat 5 konten (reels Instagram + TikTok + X) tentang "${topic}" dengan angle positif. Tagline LAPRA 08.`,
      suggestedChannels: ['Instagram Reels', 'TikTok', 'Twitter/X', 'Facebook Video'],
      suggestedAudience: 'Pemilih 18-35 tahun (Gen Z & Milenial)', expectedImpact: 'Reach 50K+, engagement 5K+ dalam 72 jam' })
    recs.push({ id: `rec_${cluster.id}_coordinate`, clusterId: cluster.id, topic, actionType: 'COORDINATE', priority: 'MEDIUM',
      title: `Aktivasi multi-DPD untuk amplifikasi serempak`,
      description: `Koordinasi 10+ DPD provinsi untuk post tentang "${topic}" di waktu bersamaan (19:00 WIB). Hashtag #PrabowoAstacita #LAPRA08.`,
      suggestedChannels: ['Grup WA DPD Se-Indonesia', 'Email DPN-DPD-DPC'],
      suggestedAudience: 'Admin medsos DPD se-Indonesia', expectedImpact: 'Trending topic nasional 6-12 jam' })
  } else if (opp?.type === 'PELUANG_DAERAH') {
    recs.push({ id: `rec_${cluster.id}_field_prov`, clusterId: cluster.id, topic, actionType: 'FIELD_VISIT', priority: 'HIGH',
      title: `Aktivasi DPD ${province} untuk momentum lokal`,
      description: `DPD ${province} wajib gelar aksi nyata terkait "${topic}" dalam 7 hari. Contoh: baksos, sambang posko, deklarasi dukungan.`,
      suggestedChannels: [`Sekretariat DPD ${province}`, 'Grup WA DPC di bawah DPD'],
      suggestedAudience: `Pengurus & anggota DPD ${province} + DPC bawahannya`,
      expectedImpact: `Elektabilitas Prabowo di ${province} naik 5-10% dalam 1 bulan` })
    recs.push({ id: `rec_${cluster.id}_digital_prov`, clusterId: cluster.id, topic, actionType: 'DIGITAL_ACTION', priority: 'MEDIUM',
      title: `Konten lokalistik "${topic}" untuk ${province}`,
      description: `Buat konten Instagram/Facebook dengan angle lokal ${province} tentang "${topic}". Bahasa daerah + tokoh lokal.`,
      suggestedChannels: ['Instagram', 'Facebook', 'Media Daerah (Tribun lokal)'],
      suggestedAudience: `Warga ${province} 25-55 tahun`, expectedImpact: `Reach 10K+ di ${province} dalam seminggu` })
  } else if (opp?.type === 'GAP_RESPON') {
    recs.push({ id: `rec_${cluster.id}_monitor`, clusterId: cluster.id, topic, actionType: 'MONITOR', priority: 'MEDIUM',
      title: `Monitor intensif isu "${topic}" 7 hari ke depan`,
      description: `Set alert untuk isu "${topic}". Update harian ke DPN. Jika engagement naik 2x dalam 48 jam, eskalasi ke FIELD_VISIT atau CLARIFICATION.`,
      suggestedChannels: ['Dashboard Admin LAPRA 08', 'Email DPN', 'Grup WA Pengawasan'],
      suggestedAudience: 'Admin DPN + Tim Monitoring', expectedImpact: 'Early warning system aktif, respons siap 24 jam' })
    recs.push({ id: `rec_${cluster.id}_content`, clusterId: cluster.id, topic, actionType: 'DIGITAL_ACTION', priority: 'LOW',
      title: `Buat konten edukasi tentang "${topic}"`,
      description: `Buat konten infografis / video pendek edukatif tentang "${topic}" dari angle positif. Target jadi rujukan publik.`,
      suggestedChannels: ['Instagram', 'Twitter/X', 'TikTok'], suggestedAudience: 'Publik umum',
      expectedImpact: 'Edukasi 5K+ orang, antisipasi sebelum isu membesar' })
  } else if (opp?.type === 'TREND_NAIK') {
    recs.push({ id: `rec_${cluster.id}_amplify_trend`, clusterId: cluster.id, topic, actionType: 'DIGITAL_ACTION', priority: 'HIGH',
      title: `Surfing tren "${topic}" — konten cepat 24 jam`,
      description: `Isu "${topic}" trending. Tim digital wajib produksi 3 konten dalam 24 jam (reel + thread X + infografis). Hashtag #PrabowoAstacita.`,
      suggestedChannels: ['Instagram Reels', 'Twitter/X Thread', 'Facebook'],
      suggestedAudience: 'Netizen aktif 18-45 tahun', expectedImpact: 'Hitch hike trending topic, reach 100K+' })
    recs.push({ id: `rec_${cluster.id}_field_trend`, clusterId: cluster.id, topic, actionType: 'FIELD_VISIT', priority: 'MEDIUM',
      title: `Aksi lapangan ride-on "${topic}"`,
      description: `Gelar aksi lapangan terkait "${topic}" (baksos, donor darah, sambang posko). Dokumentasi premium untuk konten follow-up 7 hari.`,
      suggestedChannels: ['Lapangan', 'Posko LAPRA 08', 'Sekretariat DPD'],
      suggestedAudience: 'Warga lokal + media lokal', expectedImpact: 'Elektabilitas lokal naik 3-5%, konten viral sekunder' })
    recs.push({ id: `rec_${cluster.id}_coordinate_trend`, clusterId: cluster.id, topic, actionType: 'COORDINATE', priority: 'HIGH',
      title: `Komando serentak DPN-DPD-DPC untuk "${topic}"`,
      description: `DPN instruksi semua DPD + DPC post serentak tentang "${topic}" jam 19:00 WIB hari ini. Template post disiapkan DPN.`,
      suggestedChannels: ['Email Blast DPN', 'Grup WA DPN-DPD-DPC', 'Memo Resmi'],
      suggestedAudience: 'Semua pengurus DPN, DPD, DPC',
      expectedImpact: 'Soliditas organisasi terlihat publik + reach 500K+ gabungan' })
  } else {
    recs.push({ id: `rec_${cluster.id}_default_monitor`, clusterId: cluster.id, topic, actionType: 'MONITOR', priority: 'LOW',
      title: `Lanjut monitoring isu "${topic}"`,
      description: `Isu "${topic}" belum menunjukkan peluang/risiko signifikan. Lanjut monitoring harian, eskalasi jika ada perubahan sentimen.`,
      suggestedChannels: ['Dashboard Analitik LAPRA 08'], suggestedAudience: 'Admin monitoring',
      expectedImpact: 'Early detection jika isu eskalasi' })
  }
  return recs
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '24h'
    const periodNum = parseInt(period.replace('h', '').replace('d', '')) || 24
    const isDays = period.includes('d')
    const since = new Date(Date.now() - (isDays ? periodNum * 24 : periodNum) * 60 * 60 * 1000)

    // 1. Fetch Pusat Media
    const announcements = await db.announcement.findMany({
      where: { OR: [{ publishDate: { gte: since } }, { publishDate: null, createdAt: { gte: since } }] },
      select: { id: true, title: true, content: true, publishDate: true, createdAt: true, sourceName: true, sourceUrl: true, category: true },
      orderBy: { createdAt: 'desc' }, take: 300,
    })

    // 2. Fetch Monitoring Berita
    const opinionLinks = await db.publicOpinionLink.findMany({
      where: { OR: [{ publishedAt: { gte: since } }, { publishedAt: null, createdAt: { gte: since } }] },
      select: { id: true, url: true, platform: true, title: true, content: true,
                publishedAt: true, createdAt: true, engagementCount: true,
                provinceName: true, sentiment: true, category: true },
      orderBy: { createdAt: 'desc' }, take: 300,
    })

    // 3. Fetch Survei Essay (try-catch jika schema beda)
    let essayResponses: any[] = []
    try {
      essayResponses = await (db as any).essayResponse.findMany({
        where: { submittedAt: { gte: since } },
        select: { id: true, answer: true, submittedAt: true,
                  poll: { select: { title: true, question: true } } },
        orderBy: { submittedAt: 'desc' }, take: 200,
      })
    } catch (e) { /* EssayResponse might not exist */ }

    // Convert to Item[]
    const items: Item[] = []
    for (const a of announcements) {
      const text = `${a.title} ${a.content || ''}`
      if (!isPrabowo(text)) continue
      items.push({
        id: a.id, title: a.title, date: a.publishDate || a.createdAt,
        sourceType: 'PUSAT_MEDIA', sourceName: a.sourceName || 'Pusat Media',
        url: a.sourceUrl || undefined, sentiment: sentiment(text), engagement: 0,
        provinceName: null, platform: null,
      })
    }
    for (const o of opinionLinks) {
      const text = `${o.title} ${o.content || ''}`
      if (!isPrabowo(text)) continue
      items.push({
        id: o.id, title: o.title, date: o.publishedAt || o.createdAt,
        sourceType: 'MONITORING_BERITA', sourceName: o.platform,
        url: o.url, sentiment: o.sentiment as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE',
        engagement: o.engagementCount || 0, provinceName: o.provinceName, platform: o.platform,
      })
    }
    for (const e of essayResponses) {
      const pollTitle = e.poll?.title || e.poll?.question || 'Survei Essay'
      const fullText = `${pollTitle} ${e.answer || ''}`
      if (!isPrabowo(fullText)) continue
      items.push({
        id: e.id, title: pollTitle, date: e.submittedAt || new Date(),
        sourceType: 'SURVEI_ESSAY', sourceName: 'Tanggapan Warga',
        sentiment: sentiment(fullText), engagement: 0,
        provinceName: null, platform: null,
      })
    }

    // Cluster
    const clusters = clusterItems(items).slice(0, 20)

    // Detect opportunity + generate recs per cluster
    const analysisResult = clusters.map(cluster => {
      const opp = detectOpportunity(cluster)
      const recs = generateRecs(cluster, opp)
      return { cluster, opportunity: opp, recommendations: recs }
    })

    // Save HIGH/URGENT recs to AIRecommendation (skip if table not accessible)
    let savedCount = 0
    try {
      for (const ar of analysisResult) {
        for (const rec of ar.recommendations) {
          if (rec.priority === 'HIGH' || rec.priority === 'URGENT') {
            try {
              await (db as any).aIRecommendation.create({
                data: {
                  context: `Isu "${ar.cluster.topic}" (${ar.cluster.itemCount} berita, scope ${ar.cluster.scope})`,
                  scope: ar.cluster.scope === 'NATIONAL' ? 'NATIONAL' :
                         ar.cluster.scope === 'PROVINCIAL' ? 'PROVINCE' :
                         ar.cluster.scope === 'REGENCY' ? 'REGENCY' : 'NATIONAL',
                  recommendation: `${rec.title} — ${rec.description} [Channels: ${rec.suggestedChannels.join(', ')}; Impact: ${rec.expectedImpact}]`,
                  actionType: rec.actionType, priority: rec.priority, status: 'PENDING',
                },
              })
              savedCount++
            } catch (e) { /* skip if field mismatch */ }
          }
        }
      }
    } catch (e) { /* AIRecommendation table might not exist */ }

    const summary = {
      period, since: since.toISOString(),
      totalSources: items.length,
      sourcePusatMedia: items.filter(i => i.sourceType === 'PUSAT_MEDIA').length,
      sourceMonitoringBerita: items.filter(i => i.sourceType === 'MONITORING_BERITA').length,
      sourceSurveiEssay: items.filter(i => i.sourceType === 'SURVEI_ESSAY').length,
      totalClusters: clusters.length,
      totalRecommendations: analysisResult.reduce((sum, ar) => sum + ar.recommendations.length, 0),
      urgentCount: analysisResult.reduce((sum, ar) => sum + ar.recommendations.filter(r => r.priority === 'URGENT').length, 0),
      highCount: analysisResult.reduce((sum, ar) => sum + ar.recommendations.filter(r => r.priority === 'HIGH').length, 0),
      savedToDb: savedCount,
    }

    await logAccess({
      actor: user, action: 'VIEW', resource: 'SYSTEM_SETTING', resourceId: 'tactical-analysis',
      resourceLabel: `Tactical ${period} (${summary.totalSources} items)`, request,
      detail: `${summary.totalRecommendations} recs`,
    })

    return NextResponse.json({ success: true, data: { summary, clusters: analysisResult } })
  } catch (e: any) {
    console.error('[Tactical Analysis] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
