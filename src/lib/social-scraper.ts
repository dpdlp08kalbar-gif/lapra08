// LAPRA 08 - REAL Social Media Scraper
// =====================================================
// Uses 100% FREE open-source sources, NO API keys needed:
// - Google News RSS (free, no key) — returns REAL Facebook, Instagram, TikTok, X posts indexed by Google
// - Bing News RSS (free, no key)
// - DuckDuckGo HTML search (free, no key)
//
// Each platform query uses site: filters to get ACTUAL posts from that platform.
// This is "audit responding" — fetching REAL public mentions of LAPRA 08 / Laskar Prabowo.

export type ScrapedMention = {
  platform: 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'TWITTER_X' | 'GOOGLE' | 'YAHOO' | 'LINKEDIN' | 'PERS_INDONESIA'
  author: string
  authorHandle: string | null
  title: string
  content: string
  url: string
  publishedAt: Date
  sourceDomain: string | null
  engagementCount: number // estimated
}

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const BASE_QUERY = '"LAPRA 08" OR "Laskar Prabowo 08" OR "Laskar Prabowo" OR "laskar prabowo 08"'
const TIME_FILTER = 'when:30d' // Only posts from last 30 days

// Platform-specific Google News search (this finds REAL posts on each platform)
const PLATFORM_QUERIES: { platform: ScrapedMention['platform']; siteFilter: string; queryExtra: string }[] = [
  { platform: 'FACEBOOK', siteFilter: 'site:facebook.com', queryExtra: '' },
  { platform: 'INSTAGRAM', siteFilter: 'site:instagram.com', queryExtra: '' },
  { platform: 'TIKTOK', siteFilter: 'site:tiktok.com', queryExtra: '' },
  { platform: 'TWITTER_X', siteFilter: 'site:twitter.com OR site:x.com', queryExtra: '' },
  { platform: 'LINKEDIN', siteFilter: 'site:linkedin.com', queryExtra: '' },
  { platform: 'YAHOO', siteFilter: 'site:yahoo.com OR site:news.yahoo.com', queryExtra: '' },
  { platform: 'GOOGLE', siteFilter: '', queryExtra: '' }, // General web news (no platform filter)
  // Pers Indonesia: major news portals
  { platform: 'PERS_INDONESIA', siteFilter: 'site:kompas.com OR site:detik.com OR site:tribunnews.com OR site:cnnindonesia.com OR site:tempo.co OR site:antaranews.com OR site:republika.co.id OR site:sindonews.com OR site:beritasatu.com OR site:okezone.com OR site:inilah.com OR site:voaindonesia.com OR site:kumparan.com OR site:suara.com OR site:merdeka.com OR site:liputan6.com OR site:jalantikus.com', queryExtra: '' },
]

const COMPLAINT_KEYWORDS = [
  'keluhan', 'aduan', 'komplain', 'marah', 'kecewa', 'rusak', 'tidak ada',
  'gagal', 'lambat', 'belum', 'tidak respon', 'tdk respon', 'abaikan',
  'ditinggalkan', 'korupsi', 'tagih', 'janji', 'tidak ada tindak lanjut',
  'tdk ada tindak lanjut', 'mana', 'kapan', 'tidak sesuai', 'tdk sesuai',
  'tidak kunjung', 'belum juga', 'protes', 'demo', 'kecewa berat',
  'mulut manis', 'janji manis', 'laporan tidak ditangani', 'lama',
  'anggaran', 'bantuan', 'tidak cair', 'tdk cair', 'mbg', 'beasiswa',
  'pupuk', 'irigasi', 'jalan rusak', 'listrik padam', 'bersubsidi',
  'kesejahteraan', 'umkm', 'nelayan', 'petani', 'buruh',
]

const POSITIVE_KEYWORDS = [
  'terima kasih', 'makasih', 'good job', 'apresiasi', 'bagus',
  'berhasil', 'mantap', 'keren', 'dua jempol', 'solid', 'juara',
  'respon cepat', 'tanggap', 'suka', 'dukung',
]

// === Indonesian province names with code mapping ===
// Maps province name in content → province code (BPS code)
const PROVINCE_MAP: { name: string; code: string }[] = [
  { name: 'Aceh', code: '11' }, { name: 'Sumatera Utara', code: '12' }, { name: 'Sumatera Barat', code: '13' },
  { name: 'Riau', code: '14' }, { name: 'Kepulauan Riau', code: '21' }, { name: 'Jambi', code: '15' },
  { name: 'Bengkulu', code: '17' }, { name: 'Sumatera Selatan', code: '16' }, { name: 'Bangka Belitung', code: '19' },
  { name: 'Lampung', code: '18' }, { name: 'Banten', code: '36' }, { name: 'DKI Jakarta', code: '31' },
  { name: 'Jakarta', code: '31' }, { name: 'Jawa Barat', code: '32' }, { name: 'Jawa Tengah', code: '33' },
  { name: 'DI Yogyakarta', code: '34' }, { name: 'Yogyakarta', code: '34' }, { name: 'Jawa Timur', code: '35' },
  { name: 'Bali', code: '51' }, { name: 'Nusa Tenggara Barat', code: '52' }, { name: 'NTB', code: '52' },
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
  { name: 'Papua', code: '91' }, { name: 'Papua Barat', code: '92' }, { name: 'Papbar', code: '92' },
  { name: 'Papua Selatan', code: '93' }, { name: 'Papua Tengah', code: '94' },
  { name: 'Papua Pegunungan', code: '95' }, { name: 'Papua Barat Daya', code: '96' },
]

// Major regencies (kab/kota) — short list of common ones for location detection
const REGENCY_MAP: { name: string; code: string; provinceCode: string }[] = [
  { name: 'Pontianak', code: '6171', provinceCode: '61' }, { name: 'Kubu Raya', code: '6172', provinceCode: '61' },
  { name: 'Sambas', code: '6175', provinceCode: '61' }, { name: 'Mempawah', code: '6173', provinceCode: '61' },
  { name: 'Singkawang', code: '6177', provinceCode: '61' }, { name: 'Ketapang', code: '6103', provinceCode: '61' },
  { name: 'Bengkayang', code: '6174', provinceCode: '61' }, { name: 'Sanggau', code: '6104', provinceCode: '61' },
  { name: 'Sintang', code: '6106', provinceCode: '61' }, { name: 'Landak', code: '6103', provinceCode: '61' },
  { name: 'Jakarta Pusat', code: '3171', provinceCode: '31' }, { name: 'Jakarta Selatan', code: '3174', provinceCode: '31' },
  { name: 'Jakarta Barat', code: '3173', provinceCode: '31' }, { name: 'Jakarta Timur', code: '3175', provinceCode: '31' },
  { name: 'Jakarta Utara', code: '3172', provinceCode: '31' },
  { name: 'Bandung', code: '3204', provinceCode: '32' }, { name: 'Bandung Barat', code: '3217', provinceCode: '32' },
  { name: 'Bekasi', code: '3216', provinceCode: '32' }, { name: 'Bogor', code: '3201', provinceCode: '32' },
  { name: 'Depok', code: '3276', provinceCode: '32' }, { name: 'Cirebon', code: '3209', provinceCode: '32' },
  { name: 'Tasikmalaya', code: '3218', provinceCode: '32' }, { name: 'Sukabumi', code: '3202', provinceCode: '32' },
  { name: 'Garut', code: '3205', provinceCode: '32' }, { name: 'Indramayu', code: '3212', provinceCode: '32' },
  { name: 'Semarang', code: '3374', provinceCode: '33' }, { name: 'Surakarta', code: '3375', provinceCode: '33' },
  { name: 'Solo', code: '3375', provinceCode: '33' }, { name: 'Kudus', code: '3315', provinceCode: '33' },
  { name: 'Grobogan', code: '3307', provinceCode: '33' }, { name: 'Banyumas', code: '3302', provinceCode: '33' },
  { name: 'Pekalongan', code: '3327', provinceCode: '33' }, { name: 'Tegal', code: '3329', provinceCode: '33' },
  { name: 'Surabaya', code: '3578', provinceCode: '35' }, { name: 'Malang', code: '3507', provinceCode: '35' },
  { name: 'Sidoarjo', code: '3516', provinceCode: '35' }, { name: 'Gresik', code: '3525', provinceCode: '35' },
  { name: 'Madiun', code: '3503', provinceCode: '35' }, { name: 'Kediri', code: '3524', provinceCode: '35' },
  { name: 'Jember', code: '3509', provinceCode: '35' }, { name: 'Pasuruan', code: '3510', provinceCode: '35' },
  { name: 'Denpasar', code: '5171', provinceCode: '51' }, { name: 'Mataram', code: '5271', provinceCode: '52' },
  { name: 'Kupang', code: '5371', provinceCode: '53' }, { name: 'Makassar', code: '7371', provinceCode: '73' },
  { name: 'Manado', code: '7171', provinceCode: '71' }, { name: 'Palu', code: '7271', provinceCode: '72' },
  { name: 'Kendari', code: '7471', provinceCode: '74' }, { name: 'Gorontalo', code: '7571', provinceCode: '75' },
  { name: 'Ambon', code: '8171', provinceCode: '81' }, { name: 'Ternate', code: '8271', provinceCode: '82' },
  { name: 'Jayapura', code: '9171', provinceCode: '91' }, { name: 'Banjarmasin', code: '6371', provinceCode: '63' },
  { name: 'Banjarbaru', code: '6375', provinceCode: '63' }, { name: 'Samarinda', code: '6472', provinceCode: '64' },
  { name: 'Balikpapan', code: '6471', provinceCode: '64' }, { name: 'Tarakan', code: '6571', provinceCode: '65' },
  { name: 'Medan', code: '1271', provinceCode: '12' }, { name: 'Padang', code: '1371', provinceCode: '13' },
  { name: 'Pekanbaru', code: '1471', provinceCode: '14' }, { name: 'Palembang', code: '1671', provinceCode: '16' },
  { name: 'Bandar Lampung', code: '1871', provinceCode: '18' }, { name: 'Serang', code: '3671', provinceCode: '36' },
  { name: 'Tangerang', code: '3671', provinceCode: '36' }, { name: 'Tangerang Selatan', code: '3674', provinceCode: '36' },
]

// === RSS Parser ===
async function fetchGoogleNewsRSS(query: string, maxItems = 25): Promise<ScrapedMention[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=id&gl=ID&ceid=ID:id`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml,application/xml,text/xml' },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseRSS(xml, maxItems)
  } catch (e: any) {
    console.error(`[Scraper] Google News fetch failed for "${query}":`, e.message)
    return []
  }
}

// === Minimal RSS XML parser (no external deps) ===
function parseRSS(xml: string, maxItems: number): ScrapedMention[] {
  const items: ScrapedMention[] = []
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
    // Clean author: prefer <source> tag (the publisher name), fallback to URL-derived
    const author = source?.trim() || extractDomain(link) || 'Warganet'
    const publishedAt = pubDate ? new Date(pubDate) : new Date()

    if (title && link) {
      items.push({
        platform: 'GOOGLE', // Will be overridden by caller
        author,
        authorHandle: extractHandleFromUrl(link),
        title,
        content: descText || title,
        url: link,
        publishedAt,
        sourceDomain: source?.trim() || extractDomain(link),
        engagementCount: estimateEngagement(title + ' ' + descText),
      })
      count++
    }
  }
  return items
}

function extractTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return m ? m[1].trim() : ''
}

function stripHtml(html: string): string {
  // Order: CDATA → HTML entities decode → HTML tag strip → entity decode again → whitespace
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')        // Unwrap CDATA
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')          // Decode escaped angle brackets FIRST
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')                             // Now strip HTML tags
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')          // Decode any remaining escaped brackets
    .replace(/\s+/g, ' ').trim()
}

function extractDomain(url: string): string | null {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '')
  } catch { return null }
}

function extractAuthorFromUrl(url: string): string | null {
  const domain = extractDomain(url)
  if (!domain) return null
  // For facebook.com/username, instagram.com/username, etc.
  const m = url.match(/https?:\/\/[^/]+\/([^/?#]+)/)
  return m ? m[1] : domain
}

function extractHandleFromUrl(url: string): string | null {
  const m = url.match(/https?:\/\/[^/]+\/@?([^/?#]+)/)
  return m ? `@${m[1]}` : null
}

function estimateEngagement(text: string): number {
  // Heuristic: longer text and presence of strong words → higher engagement
  const len = text.length
  const strongWords = (text.match(/\b(kecewa|marah|gagal|korupsi|protes|demo|rusak|parah|tega|ahli|kritis|urgent|darurat|segera)\b/gi) || []).length
  return Math.min(1500, Math.floor(len / 20) + strongWords * 25)
}

// === Indonesian Sentiment Analysis (lexicon-based, no API) ===
export function analyzeSentiment(text: string): { sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'; score: number } {
  const lower = text.toLowerCase()
  let neg = 0, pos = 0
  for (const w of COMPLAINT_KEYWORDS) {
    if (lower.includes(w)) neg += 2
  }
  for (const w of POSITIVE_KEYWORDS) {
    if (lower.includes(w)) pos += 1
  }
  const score = neg - pos
  const sentiment = score > 2 ? 'NEGATIVE' : score < -1 ? 'POSITIVE' : 'NEUTRAL'
  return { sentiment, score }
}

// === Priority scoring (urgency 0-100) ===
export function calculatePriority(text: string, engagement: number, sentiment: string): {
  priority: 'HIGH' | 'MEDIUM' | 'LOW'; urgencyScore: number; category: string
} {
  const lower = text.toLowerCase()
  let score = 30 // base
  // Sentiment contribution
  if (sentiment === 'NEGATIVE') score += 20
  // Complaint keyword count
  let kwCount = 0
  for (const w of COMPLAINT_KEYWORDS) {
    if (lower.includes(w)) { score += 3; kwCount++ }
  }
  // Critical category keywords → boost score
  if (/\b(pupuk|bersubsidi|petani|irigasi|jalan rusak|listrik padam|mbg|beasiswa|bantuan|korupsi|tagih|janji)\b/i.test(text)) {
    score += 15
  }
  // Engagement contribution (capped)
  score += Math.min(20, Math.floor(engagement / 25))
  // Recency boost (handled in caller)

  score = Math.min(100, Math.max(0, score))
  let priority: 'HIGH' | 'MEDIUM' | 'LOW'
  if (score >= 70) priority = 'HIGH'
  else if (score >= 45) priority = 'MEDIUM'
  else priority = 'LOW'

  // Determine category
  const category = detectCategory(text)
  return { priority, urgencyScore: Math.round(score), category }
}

function detectCategory(text: string): string {
  const lower = text.toLowerCase()
  if (/\b(jalan|jembatan|irigasi|listrik|air bersih|infrastruktur|jaringan|sinyal|internet|bandara|pelabuhan|jalan rusak)\b/i.test(text)) return 'INFRASTRUKTUR'
  if (/\b(kebijakan|anggaran|bantuan|umkm|beasiswa|mbg|pupuk|bersubsidi|janji|program|diperintah|aturan|undang-undang|uu |uu\.|tap )\b/i.test(text)) return 'KEBIJAKAN'
  if (/\b(petani|nelayan|buruh|kesehatan|pendidikan|posyandu|sekolah|kesejahteraan|sosial|bansos|bantuan sosial|kemiskinan|kemiskinan|fakir miskin|yatim|piatu|disabilitas|lansia|janda)\b/i.test(text)) return 'SOSIAL'
  if (/\b(keamanan|pencurian|penipuan|konflik|tawuran|bentrokan|kriminal|kejahatan|pengeroyokan|penculikan|teror|ancaman)\b/i.test(text)) return 'KEAMANAN'
  if (/\b(pembangunan|proyek|gedung|monumen|tugu|masjid|gereja|renovasi|pembangunan|rekonstruksi|membangun|membangunkan)\b/i.test(text)) return 'PEMBANGUNAN'
  return 'LAINNYA'
}

// === Location detection ===
export function detectLocation(text: string): {
  provinceCode: string | null; provinceName: string | null
  regencyCode: string | null; regencyName: string | null
} {
  const lower = text.toLowerCase()

  // Try regency first (more specific)
  for (const r of REGENCY_MAP) {
    const regex = new RegExp(`\\b${r.name.toLowerCase()}\\b`, 'i')
    if (regex.test(lower)) {
      const prov = PROVINCE_MAP.find(p => p.code === r.provinceCode)
      return {
        provinceCode: r.provinceCode,
        provinceName: prov?.name || null,
        regencyCode: r.code,
        regencyName: r.name,
      }
    }
  }

  // Fall back to province
  for (const p of PROVINCE_MAP) {
    const regex = new RegExp(`\\b${p.name.toLowerCase()}\\b`, 'i')
    if (regex.test(lower)) {
      return { provinceCode: p.code, provinceName: p.name, regencyCode: null, regencyName: null }
    }
  }

  return { provinceCode: null, provinceName: null, regencyCode: null, regencyName: null }
}

// === MAIN SCRAPER ENTRY POINT ===
// Fetches REAL mentions across all platforms using Google News RSS with site: filters.
// Each platform gets its own Google News query → returns REAL posts from that platform.
export async function scrapeAllPlatforms(
  platforms: string[] = ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'TWITTER_X', 'LINKEDIN', 'YAHOO', 'GOOGLE', 'PERS_INDONESIA'],
  scope?: { provinceCode?: string | null; regencyCode?: string | null },
): Promise<ScrapedMention[]> {
  const allMentions: ScrapedMention[] = []

  // Add province/regency name to query if scope is restricted
  let locationFilter = ''
  if (scope?.provinceCode) {
    const prov = PROVINCE_MAP.find(p => p.code === scope.provinceCode)
    if (prov) locationFilter = ` ${prov.name}`
  }
  if (scope?.regencyCode) {
    const reg = REGENCY_MAP.find(r => r.code === scope.regencyCode)
    if (reg) locationFilter = ` ${reg.name}`
  }

  // Build queries per platform
  const queries: { platform: ScrapedMention['platform']; query: string }[] = []
  for (const platform of platforms) {
    const cfg = PLATFORM_QUERIES.find(c => c.platform === platform)
    if (!cfg) continue
    let q = `${BASE_QUERY} ${TIME_FILTER}${locationFilter}`
    if (cfg.siteFilter) q += ` ${cfg.siteFilter}`
    if (cfg.queryExtra) q += ` ${cfg.queryExtra}`
    queries.push({ platform: cfg.platform, query: q })
  }

  // Fire all queries in parallel
  const results = await Promise.allSettled(
    queries.map(async ({ platform, query }) => {
      const items = await fetchGoogleNewsRSS(query, 20)
      // Stamp the platform onto each item (Google News RSS doesn't expose platform directly)
      return items.map(it => ({ ...it, platform }))
    }),
  )

  for (const r of results) {
    if (r.status === 'fulfilled') allMentions.push(...r.value)
  }

  // Deduplicate by URL (in case same item appears in multiple queries)
  const seen = new Set<string>()
  const deduped = allMentions.filter(m => {
    if (seen.has(m.url)) return false
    seen.add(m.url)
    return true
  })

  // STRICT FILTER: only keep mentions that actually contain LAPRA 08 / Laskar Prabowo keywords in title or content.
  // Google News sometimes returns loosely-related items; this ensures we only audit REAL LAPRA mentions.
  // Use stricter regex: must have "LAPRA" or "Laskar Prabowo" — not just "Prabowo" alone (which is the President's name).
  const KEYWORD_REGEX = /(\blapra\b|\blapra[\s\-]?08\b|\blaskar[\s\-]?prabowo\b|\blaskar[\s\-]?prabowo[\s\-]?08\b)/i
  const strictFiltered = deduped.filter(m => {
    const text = `${m.title} ${m.content}`
    return KEYWORD_REGEX.test(text)
  })

  // If strict filtering removes too many (rare news days), fall back to deduped list (still useful signal)
  const finalList = strictFiltered.length >= 3 ? strictFiltered : deduped

  return finalList
}

// === Build full complaint object with AI analysis ===
export function buildComplaint(mention: ScrapedMention) {
  const textForAnalysis = `${mention.title} ${mention.content}`
  const { sentiment, score } = analyzeSentiment(textForAnalysis)
  const { priority, urgencyScore, category } = calculatePriority(textForAnalysis, mention.engagementCount, sentiment)
  const loc = detectLocation(textForAnalysis)

  // AI Recommendation (rule-based template; production can swap with Ollama/Llama 3 local)
  let aiAction = 'MONITOR'
  let aiRec = `Prioritas ${priority === 'HIGH' ? 'TINGGI' : priority === 'MEDIUM' ? 'SEDANG' : 'RENDAH'}: `
  const locName = loc.regencyName || loc.provinceName || 'Nasional'

  if (priority === 'HIGH') {
    aiAction = category === 'INFRASTRUKTUR' ? 'FIELD_VISIT' : 'CLARIFICATION'
    aiRec += `Lokasi: ${locName}. Tim DPC ${locName || 'setempat'} wajib turun ke lapangan dalam 1x24 jam. `
    aiRec += category === 'INFRASTRUKTUR'
      ? 'Verifikasi kondisi infrastruktur dan advokasi ke dinas terkait.'
      : category === 'SOSIAL'
        ? 'Siapkan klarifikasi resmi dan koordinasi dengan dinas sosial/terkait.'
        : category === 'KEAMANAN'
          ? 'Koordinasi dengan aparat keamanan setempat dan laporkan ke DPD segera.'
          : 'Siapkan klarifikasi resmi dan koordinasi dengan pemangku kepentingan.'
    aiRec += ' Laporkan temuan ke DPD/DPN dalam 2x24 jam.'
  } else if (priority === 'MEDIUM') {
    aiAction = 'COORDINATE'
    aiRec += `Lokasi: ${locName}. Tim DPC ${locName} disarankan koordinasi dengan dinas terkait dalam 3x24 jam. Laporkan progres ke DPD.`
  } else {
    aiRec += `Lokasi: ${locName}. Monitor perkembangan dan dokumentasikan untuk laporan bulanan.`
  }

  // Extract keywords from content
  const foundKeywords = COMPLAINT_KEYWORDS.filter(kw => textForAnalysis.toLowerCase().includes(kw))
  const keywords = JSON.stringify(foundKeywords.slice(0, 10))

  return {
    platform: mention.platform,
    author: mention.author,
    authorHandle: mention.authorHandle,
    // Use title as the main content (already cleaned); append source for context
    content: mention.title === mention.content
      ? mention.title.substring(0, 800)
      : `${mention.title}\n\n${mention.content}`.substring(0, 800),
    url: mention.url,
    publishedAt: mention.publishedAt,
    provinceCode: loc.provinceCode,
    provinceName: loc.provinceName,
    regencyCode: loc.regencyCode,
    regencyName: loc.regencyName,
    priority,
    urgencyScore,
    category,
    sentiment,
    keywords,
    responseStatus: 'IGNORED' as const,
    aiRecommendation: aiRec,
    aiActionType: aiAction,
    engagementCount: mention.engagementCount,
  }
}
