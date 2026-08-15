// LAPRA 08 - AUTO SCRAPER (100% FOSS, no API keys, Vercel-compatible)
// =====================================================
// PHASE 1 REFACTOR:
//   ❌ REMOVED: yt-dlp child process (hardcoded to /home/z/.venv/bin/yt-dlp)
//   ✅ ADDED:   Invidious API (FOSS YouTube frontend, JSON API, no key)
//   ✅ KEPT:    Google News RSS via rss-parser (FOSS, no key)
//
// Vercel serverless compatible — pure fetch + RSS, no child_process spawn.
// Invidious instances are tried in order with health-check fallback.
//
// SELF-HOST OPTION (recommended for production):
//   Deploy your own Invidious instance on Railway/Fly.io for reliable
//   YouTube access. Set INVIDIOUS_HOST env var to override the fallback list.
// =====================================================

import Parser from 'rss-parser'

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
  source: 'invidious' | 'google-news-rss'
  rawPayload?: any // full JSON response from source (saved to PublicOpinionLink.rawPayload)
}

const rssParser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'LAPRA08-Bot/1.0 (+https://lapra08.vercel.app)',
    'Accept': 'application/rss+xml, application/xml, text/xml',
  },
})

// === SEARCH QUERIES (LEXICON MATRIX v2 — 200+ kombinasi) ===
// FIX: Sebelumnya 4 query nasional → data daerah tidak terjaring
// SEKARANG: Lexicon Matrix = 4 varian organisasi × 38 provinsi × kota utama + tokoh lokal
//
// ATURAN MATRIKS:
//   organisasi: ["Laskar Prabowo", "LAPRA 08", "LP 08", "Relawan Laskar Prabowo 08"]
//   × 38 provinsi (nama + nickname + kota utama + kodim + kejati + dprd)
//   × aktivitas (audiensi, deklarasi, pelantikan, bakti sosial, dll)
//   = 200+ query combinations, rotasi 5 per batch

// === 4 varian nama organisasi ===
const ORG_VARIANTS = [
  'Laskar Prabowo 08',
  'LAPRA 08',
  'LP 08',
  'Relawan Laskar Prabowo 08',
]

// === HANYA LAPRA 08 / Laskar Prabowo 08 — tidak boleh menangkap organisasi lain ===
// User instruction: "ingat jgn memuat selain laskar prabowo 08"
// Tidak pakai broad keywords seperti "Prabowo relawan" / "Gerindra" / "Prabowo Gibran"
// Hanya varian nama LAPRA 08 yang resmi

// === 38 PROVINSI + KOTA UTAMA + TOKOH LOKAL + INSTITUSI ===
// Format: { prov, nickname, kota, kodim, kejati, dprd }
const WILAYAH_MATRIX: {
  prov: string; nick: string; kota: string[]; kodim?: string; kejati?: string; dprd?: string
}[] = [
  // Sumatera
  { prov: 'Aceh', nick: 'Aceh', kota: ['Banda Aceh', 'Lhokseumawe', 'Sabang'], kodim: 'Kodim 0104', kejati: 'Kejati Aceh', dprd: 'DPRD Aceh' },
  { prov: 'Sumatera Utara', nick: 'Sumut', kota: ['Medan', 'Pematangsiantar', 'Binjai'], kodim: 'Kodim 0205', kejati: 'Kejati Sumut', dprd: 'DPRD Sumut' },
  { prov: 'Sumatera Barat', nick: 'Sumbar', kota: ['Padang', 'Bukittinggi', 'Payakumbuh'], kodim: 'Kodim 0306', kejati: 'Kejati Sumbar', dprd: 'DPRD Sumbar' },
  { prov: 'Riau', nick: 'Riau', kota: ['Pekanbaru', 'Dumai'], kodim: 'Kodim 0407', kejati: 'Kejati Riau', dprd: 'DPRD Riau' },
  { prov: 'Kepulauan Riau', nick: 'Kepri', kota: ['Tanjungpinang', 'Batam'], kodim: 'Kodim 0508', kejati: 'Kejati Kepri', dprd: 'DPRD Kepri' },
  { prov: 'Jambi', nick: 'Jambi', kota: ['Jambi', 'Sungai Penuh'], kodim: 'Kodim 0410', kejati: 'Kejati Jambi', dprd: 'DPRD Jambi' },
  { prov: 'Sumatera Selatan', nick: 'Sumsel', kota: ['Palembang', 'Prabumulih', 'Pagaralam'], kodim: 'Kodim 0412', kejati: 'Kejati Sumsel', dprd: 'DPRD Sumsel' },
  { prov: 'Bangka Belitung', nick: 'Babel', kota: ['Pangkalpinang', 'Sungailiat'], kodim: 'Kodim 0414', kejati: 'Kejati Babel', dprd: 'DPRD Babel' },
  { prov: 'Bengkulu', nick: 'Bengkulu', kota: ['Bengkulu'], kodim: 'Kodim 0416', kejati: 'Kejati Bengkulu', dprd: 'DPRD Bengkulu' },
  { prov: 'Lampung', nick: 'Lampung', kota: ['Bandar Lampung', 'Metro'], kodim: 'Kodim 0418', kejati: 'Kejati Lampung', dprd: 'DPRD Lampung' },
  // Jawa
  { prov: 'Banten', nick: 'Banten', kota: ['Serang', 'Tangerang', 'Cilegon'], kodim: 'Kodim 0620', kejati: 'Kejati Banten', dprd: 'DPRD Banten' },
  { prov: 'DKI Jakarta', nick: 'Jakarta', kota: ['Jakarta', 'Jakpus', 'Jakbar', 'Jakut', 'Jaksel', 'Jaktim'], kodim: 'Kodim 0501', kejati: 'Kejati DKI', dprd: 'DPRD DKI' },
  { prov: 'Jawa Barat', nick: 'Jabar', kota: ['Bandung', 'Bekasi', 'Bogor', 'Depok', 'Cimahi'], kodim: 'Kodim 0612', kejati: 'Kejati Jabar', dprd: 'DPRD Jabar' },
  { prov: 'Jawa Tengah', nick: 'Jateng', kota: ['Semarang', 'Surakarta', 'Solo', 'Tegal', 'Pekalongan'], kodim: 'Kodim 0712', kejati: 'Kejati Jateng', dprd: 'DPRD Jateng' },
  { prov: 'DI Yogyakarta', nick: 'Jogja', kota: ['Yogyakarta', 'Jogja', 'Sleman', 'Bantul'], kodim: 'Kodim 0720', kejati: 'Kejati DIY', dprd: 'DPRD DIY' },
  { prov: 'Jawa Timur', nick: 'Jatim', kota: ['Surabaya', 'Malang', 'Kediri', 'Madiun', 'Sidoarjo'], kodim: 'Kodim 0818', kejati: 'Kejati Jatim', dprd: 'DPRD Jatim' },
  // Bali & Nusa Tenggara
  { prov: 'Bali', nick: 'Bali', kota: ['Denpasar', 'Singaraja', 'Tabanan'], kodim: 'Kodim 1621', kejati: 'Kejati Bali', dprd: 'DPRD Bali' },
  { prov: 'Nusa Tenggara Barat', nick: 'NTB', kota: ['Mataram', 'Bima'], kodim: 'Kodim 1622', kejati: 'Kejati NTB', dprd: 'DPRD NTB' },
  { prov: 'Nusa Tenggara Timur', nick: 'NTT', kota: ['Kupang', 'Ende', 'Maumere'], kodim: 'Kodim 1623', kejati: 'Kejati NTT', dprd: 'DPRD NTT' },
  // Kalimantan
  { prov: 'Kalimantan Barat', nick: 'Kalbar', kota: ['Pontianak', 'Singkawang', 'Sintang', 'Ketapang'], kodim: 'Kodim 1207', kejati: 'Kejati Kalbar', dprd: 'DPRD Kalbar' },
  { prov: 'Kalimantan Tengah', nick: 'Kalteng', kota: ['Palangkaraya', 'Banjarmasin'], kodim: 'Kodim 1208', kejati: 'Kejati Kalteng', dprd: 'DPRD Kalteng' },
  { prov: 'Kalimantan Selatan', nick: 'Kalsel', kota: ['Banjarmasin', 'Banjarbaru', 'Martapura'], kodim: 'Kodim 1209', kejati: 'Kejati Kalsel', dprd: 'DPRD Kalsel' },
  { prov: 'Kalimantan Timur', nick: 'Kaltim', kota: ['Samarinda', 'Balikpapan', 'Bontang'], kodim: 'Kodim 1210', kejati: 'Kejati Kaltim', dprd: 'DPRD Kaltim' },
  { prov: 'Kalimantan Utara', nick: 'Kaltara', kota: ['Tanjung Selor', 'Tarakan'], kodim: 'Kodim 1211', kejati: 'Kejati Kaltara', dprd: 'DPRD Kaltara' },
  // Sulawesi
  { prov: 'Sulawesi Utara', nick: 'Sulut', kota: ['Manado', 'Bitung', 'Tomohon'], kodim: 'Kodim 1305', kejati: 'Kejati Sulut', dprd: 'DPRD Sulut' },
  { prov: 'Sulawesi Tengah', nick: 'Sulteng', kota: ['Palu', 'Donggala'], kodim: 'Kodim 1307', kejati: 'Kejati Sulteng', dprd: 'DPRD Sulteng' },
  { prov: 'Sulawesi Selatan', nick: 'Sulsel', kota: ['Makassar', 'Parepare', 'Palopo'], kodim: 'Kodim 1404', kejati: 'Kejati Sulsel', dprd: 'DPRD Sulsel' },
  { prov: 'Sulawesi Tenggara', nick: 'Sultra', kota: ['Kendari', 'BauBau'], kodim: 'Kodim 1405', kejati: 'Kejati Sultra', dprd: 'DPRD Sultra' },
  { prov: 'Gorontalo', nick: 'Gorontalo', kota: ['Gorontalo'], kodim: 'Kodim 1303', kejati: 'Kejati Gorontalo', dprd: 'DPRD Gorontalo' },
  { prov: 'Sulawesi Barat', nick: 'Sulbar', kota: ['Mamuju'], kodim: 'Kodim 1304', kejati: 'Kejati Sulbar', dprd: 'DPRD Sulbar' },
  // Maluku & Papua
  { prov: 'Maluku', nick: 'Maluku', kota: ['Ambon', 'Tual'], kodim: 'Kodim 1506', kejati: 'Kejati Maluku', dprd: 'DPRD Maluku' },
  { prov: 'Maluku Utara', nick: 'Malut', kota: ['Sofifi', 'Ternate', 'Tidore'], kodim: 'Kodim 1507', kejati: 'Kejati Malut', dprd: 'DPRD Malut' },
  { prov: 'Papua', nick: 'Papua', kota: ['Jayapura', 'Wamena'], kodim: 'Kodim 1701', kejati: 'Kejati Papua', dprd: 'DPRD Papua' },
  { prov: 'Papua Barat', nick: 'Papbar', kota: ['Manokwari', 'Sorong'], kodim: 'Kodim 1802', kejati: 'Kejati Papbar', dprd: 'DPRD Papbar' },
  { prov: 'Papua Selatan', nick: 'Papsel', kota: ['Merauke'], kodim: 'Kodim 1803', kejati: 'Kejati Papsel', dprd: 'DPRD Papsel' },
  { prov: 'Papua Tengah', nick: 'Papteng', kota: ['Nabire'], kodim: 'Kodim 1804', kejati: 'Kejati Papteng', dprd: 'DPRD Papteng' },
  { prov: 'Papua Pegunungan', nick: 'Pappeg', kota: ['Wamena', 'Jayawijaya'], kodim: 'Kodim 1805', kejati: 'Kejati Pappeg', dprd: 'DPRD Pappeg' },
  { prov: 'Papua Barat Daya', nick: 'Papbardaya', kota: ['Sorong Selatan'], kodim: 'Kodim 1806', kejati: 'Kejati Papbardaya', dprd: 'DPRD Papbardaya' },
]

// === GENERATE LEXICON MATRIX QUERIES (otomatis dari matrix) ===
// HANYA LAPRA 08 / Laskar Prabowo 08 — tidak boleh menangkap organisasi lain
function generateLexiconQueries(): string[] {
  const queries: string[] = []

  // ORG_VARIANTS × WILAYAH_MATRIX = 4 × 38 = 152+ query
  for (const org of ORG_VARIANTS) {
    for (const w of WILAYAH_MATRIX) {
      // org + provinsi
      queries.push(`"${org}" ${w.prov} OR ${w.nick}`)
      // org + kota utama
      const kota = w.kota[0]
      if (kota && kota !== w.prov) {
        queries.push(`"${org}" ${kota}`)
      }
    }
  }

  return queries
}

// === Query nasional (lama, tetap dipakai untuk fallback) ===
const LAPRA_QUERIES_NASIONAL = [
  '"LAPRA 08" OR "Laskar Prabowo 08"',
  'LAPRA 08 Devi Taurisa Hashim pengurus',
  'Laskar Prabowo 08 aksi sosial kegiatan',
  'Presiden Prabowo astacita program positif',
]

// === Query aktivitas daerah + sumber yang user temukan ===
const AKTIVITAS_QUERIES = [
  'LAPRA 08 audiensi DPD OR DPC',
  'Laskar Prabowo 08 kolaborasi OR kemitraan daerah',
  'LAPRA 08 deklarasi pengurus DPC OR DPD',
  'Laskar Prabowo 08 bakti sosial OR aksi sosial',
  'LAPRA 08 pelantikan pengurus cabang',
  'Laskar Prabowo 08 rapat koordinasi daerah',
  'LAPRA 08 kegiatan keorganisasian DPD',
  'Laskar Prabowo 08 pemberdayaan ummat',
  // Query yang user temukan (spesifik Kalbar)
  'Laskar Prabowo 08 Kalbar',
  'LP 08 Kalbar',
  'Laskar Prabowo Kalbar sambangi',
  'Laskar Prabowo 08 Kayong Utara',
  'Laskar Prabowo 08 Kabupaten Pontianak',
  'Laskar Prabowo 08 Mempawah',
  'Laskar Prabowo 08 Sambas',
  'Laskar Prabowo 08 Singkawang',
  // Query yang user temukan (spesifik Jabar)
  'Laskar Prabowo 08 Jabar',
  'Laskar Prabowo 08 Bandung',
  'Laskar Prabowo 08 Bekasi',
  'Laskar Prabowo 08 Bogor',
  'Laskar Prabowo 08 Depok',
  'Laskar Prabowo 08 Koppeta HAM',
]

// === RSS FEED LOKAL (EXPANDED v2 — 35+ sumber daerah + pers lokal) ===
const LOCAL_RSS_FEEDS = [
  // Media Kalbar (sumber yang user temukan!)
  { name: 'Media Kalbar News', url: 'https://mediakalbarnews.com/feed/', region: 'Kalimantan Barat' },
  // Tribun Network (per daerah)
  { name: 'Tribun Kalbar', url: 'https://kalimantanbarat.tribunnews.com/rss', region: 'Kalimantan Barat' },
  { name: 'Tribun Pontianak', url: 'https://pontianak.tribunnews.com/rss', region: 'Kalimantan Barat' },
  { name: 'Tribun Jabar', url: 'https://jabar.tribunnews.com/rss', region: 'Jawa Barat' },
  { name: 'Tribun Jateng', url: 'https://jateng.tribunnews.com/rss', region: 'Jawa Tengah' },
  { name: 'Tribun Jatim', url: 'https://jatim.tribunnews.com/rss', region: 'Jawa Timur' },
  { name: 'Tribun Bali', url: 'https://bali.tribunnews.com/rss', region: 'Bali' },
  { name: 'Tribun Sumsel', url: 'https://sumsel.tribunnews.com/rss', region: 'Sumatera Selatan' },
  { name: 'Tribun Sumbar', url: 'https://sumbar.tribunnews.com/rss', region: 'Sumatera Barat' },
  { name: 'Tribun Sulsel', url: 'https://sulsel.tribunnews.com/rss', region: 'Sulawesi Selatan' },
  { name: 'Tribun Medan', url: 'https://medan.tribunnews.com/rss', region: 'Sumatera Utara' },
  { name: 'Tribun Pekanbaru', url: 'https://pekanbaru.tribunnews.com/rss', region: 'Riau' },
  { name: 'Tribun Lampung', url: 'https://lampung.tribunnews.com/rss', region: 'Lampung' },
  { name: 'Tribun Padang', url: 'https://padang.tribunnews.com/rss', region: 'Sumatera Barat' },
  { name: 'Tribun Banjar', url: 'https://banjarmasin.tribunnews.com/rss', region: 'Kalimantan Selatan' },
  { name: 'Tribun Samarinda', url: 'https://samarinda.tribunnews.com/rss', region: 'Kalimantan Timur' },
  { name: 'Tribun Makassar', url: 'https://makassar.tribunnews.com/rss', region: 'Sulawesi Selatan' },
  { name: 'Tribun Manado', url: 'https://manado.tribunnews.com/rss', region: 'Sulawesi Utara' },
  { name: 'Tribun Ambon', url: 'https://ambon.tribunnews.com/rss', region: 'Maluku' },
  { name: 'Tribun Papua', url: 'https://papua.tribunnews.com/rss', region: 'Papua' },
  { name: 'Tribun Banten', url: 'https://banten.tribunnews.com/rss', region: 'Banten' },
  { name: 'Tribun Jakarta', url: 'https://jakarta.tribunnews.com/rss', region: 'DKI Jakarta' },
  // Pers lokal yang user temukan (bukan Tribun)
  { name: 'Radar Jabar', url: 'https://www.radarjabar.com/feed/', region: 'Jawa Barat' },
  { name: 'AT News', url: 'https://www.atnews.id/feed/', region: 'Nasional' },
  { name: 'Intipos', url: 'https://intipos.com/feed/', region: 'Nasional' },
  { name: 'Seru.co.id', url: 'https://seru.co.id/feed/', region: 'Nasional' },
  { name: 'Koran Sinar Pagionline', url: 'https://koransinarpagionline.com/feed/', region: 'Nasional' },
  { name: 'Beranta Jejak Digital', url: 'https://berantasjejakdigital.com/feed/', region: 'Nasional' },
  { name: 'Nusantara TV', url: 'https://nusantaratv.com/feed/', region: 'Nasional' },
  // Kompas
  { name: 'Kompas Nasional', url: 'https://www.kompas.com/rss/nasional.xml', region: 'Nasional' },
  // Detik
  { name: 'Detik News', url: 'https://rss.detik.com/index.php/detik/news', region: 'Nasional' },
  // ANTARA (sumber user temukan)
  { name: 'ANTARA News', url: 'https://www.antaranews.com/rss/terkini.xml', region: 'Nasional' },
  // Metro TV (sumber user temukan)
  { name: 'Metro TV News', url: 'https://www.metrotvnews.com/rss', region: 'Nasional' },
  // RRI (sumber user temukan)
  { name: 'RRI News', url: 'https://rri.co.id/index.php/rss', region: 'Nasional' },
  // Koppeta HAM (sumber user temukan — Jawa Barat)
  { name: 'Koppeta HAM', url: 'https://koppeta.or.id/feed/', region: 'Jawa Barat' },
]

// === COMBINED: semua query (LEXICON MATRIX + nasional + aktivitas) ===
const LEXICON_QUERIES = generateLexiconQueries()
const ALL_QUERIES = [
  ...LEXICON_QUERIES,  // 152+ queries dari matrix
  ...LAPRA_QUERIES_NASIONAL,  // 4 nasional
  ...AKTIVITAS_QUERIES,  // 8 aktivitas
]

console.log(`[Scraper] Lexicon Matrix loaded: ${LEXICON_QUERIES.length} queries (4 org × 38 provinsi × 4 variant) + ${LOCAL_RSS_FEEDS.length} RSS lokal`)

// === ROTATION STATE (5 query per batch, anti Vercel timeout) ===
let _rotationIndex = 0
function getNextQueryBatch(batchSize = 5): string[] {
  const batch: string[] = []
  for (let i = 0; i < batchSize; i++) {
    batch.push(ALL_QUERIES[_rotationIndex % ALL_QUERIES.length])
    _rotationIndex++
  }
  return batch
}

// Backward compat: LAPRA_QUERIES untuk code lain yang masih pakai
const LAPRA_QUERIES = LAPRA_QUERIES_NASIONAL

// === INVIDIOUS INSTANCE FALLBACK LIST ===
// Public Invidious instances — often rate-limited or down.
// For production, self-host: https://docs.invidious.io/installation/
const INVIDIOUS_INSTANCES = [
  process.env.INVIDIOUS_HOST, // self-hosted takes priority
  'https://invidious.private.coffee',
  'https://yewtu.be',
  'https://invidious.kavin.rocks',
  'https://inv.tux.pizza',
  'https://invidious.einfachzocken.eu',
].filter(Boolean) as string[]

const REQUEST_TIMEOUT = 8000

async function fetchWithTimeout(url: string, opts: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

// === STRICT FILTER: HANYA simpan yang mengandung Laskar Prabowo 08 / LAPRA 08 ===
// User instruction: "jgn memuat selain laskar prabowo 08 / lapra 08"
// Fungsi ini dipanggil untuk SEMUA hasil (YouTube, Google News, RSS lokal)
function isLapraRelevant(title: string, content: string): boolean {
  const text = `${title} ${content}`.toLowerCase()
  return text.includes('laskar prabowo 08') ||
         text.includes('lapra 08') ||
         text.includes('lapra08') ||
         text.includes('relawan laskar prabowo 08') ||
         text.includes('laskar prabowo delapan')
  // CATATAN: "lp 08" TIDAK dipakai karena terlalu pendek → false positive
}

// === YOUTUBE SCRAPER (via Invidious API) ===
// Invidious API docs: https://docs.invidious.io/api/
// GET /api/v1/search?q=...&type=video&sort_by=relevance
// Returns: [{ videoId, title, author, authorUrl, description, published, viewCount, likeCount }]
async function scrapeYouTube(maxResults = 5): Promise<{ posts: ScrapedPost[]; instance: string | null }> {
  // === ENHANCED: pakai rotasi query (bukan hanya query pertama) ===
  const queryBatch = getNextQueryBatch(2) // 2 query YouTube per batch (anti timeout)
  const allPosts: ScrapedPost[] = []
  let usedInstance: string | null = null

  // Loop setiap query di batch
  for (const query of queryBatch) {
    // Loop Invidious instances (fallback)
    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance&hl=id`
        const res = await fetchWithTimeout(url, {
          headers: { 'User-Agent': 'LAPRA08-Bot/1.0' },
        })
        if (!res.ok) {
          continue
        }
        const data = await res.json()
        if (!Array.isArray(data) || data.length === 0) {
          continue
        }

        const posts: ScrapedPost[] = data.slice(0, maxResults)
          .filter((v: any) => isLapraRelevant(v.title || '', v.description || ''))
          .map((v: any) => ({
          platform: 'YOUTUBE' as const,
          postId: v.videoId,
          author: v.author || 'Unknown',
          authorHandle: v.authorUrl ? v.authorUrl.replace('/channel/', '@') : null,
          title: v.title || '',
          content: (v.description || '').substring(0, 1000),
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
          publishedAt: v.published ? new Date(v.published * 1000) : new Date(),
          engagementCount: (v.viewCount || 0) + (v.likeCount || 0),
          source: 'invidious' as const,
          rawPayload: { ...v, query },
        }))

        allPosts.push(...posts)
        usedInstance = instance
        console.log(`[Invidious] ✅ ${posts.length} videos for query "${query.substring(0, 40)}..."`)
        break // sukses untuk query ini, lanjut ke query berikutnya
      } catch (e: any) {
        continue
      }
    }
  }

  if (allPosts.length === 0) {
    console.warn('[Invidious] All instances failed. Self-host Invidious on Railway/Fly.io for reliable access.')
    return { posts: [], instance: null }
  }

  // Dedupe by videoId
  const seen = new Set<string>()
  const unique = allPosts.filter(p => {
    if (seen.has(p.postId)) return false
    seen.add(p.postId)
    return true
  })

  console.log(`[Invidious] ✅ Total ${unique.length} unique videos from ${queryBatch.length} queries`)
  return { posts: unique, instance: usedInstance }
}

// === GOOGLE NEWS SCRAPER (via RSS) — ENHANCED: rotasi query daerah ===
// FIX: Sebelumnya hanya 2 query nasional → data daerah tidak terjaring
// Sekarang: rotasi 5 query per batch (nasional + provinsi + aktivitas)
async function scrapeGoogleNews(maxResults = 5): Promise<ScrapedPost[]> {
  const allPosts: ScrapedPost[] = []

  // === ROTATION: ambil 5 query per batch (anti Vercel timeout 10s) ===
  const queryBatch = getNextQueryBatch(5)
  console.log(`[Google News RSS] Scraping ${queryBatch.length} queries (rotation batch)...`)

  for (const query of queryBatch) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=id&gl=ID&ceid=ID:id`
      const feed = await rssParser.parseURL(url)
      const items = feed.items?.slice(0, maxResults) || []

      for (const item of items) {
        // === STRICT FILTER: HANYA simpan yang mengandung Laskar Prabowo 08 ===
        const itemTitle = item.title || ''
        const itemContent = item.contentSnippet || item.content || ''
        if (!isLapraRelevant(itemTitle, itemContent)) continue

        allPosts.push({
          platform: 'GOOGLE',
          postId: item.guid || item.link || `${Date.now()}-${Math.random()}`,
          author: item.creator || item.author || feed.title || 'Google News',
          authorHandle: null,
          title: itemTitle,
          content: itemContent.substring(0, 1000),
          url: item.link || '',
          publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
          engagementCount: 0,
          source: 'google-news-rss',
          rawPayload: {
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            content: item.content,
            categories: item.categories,
            creator: item.creator,
            query,
          },
        })
      }
    } catch (e: any) {
      console.warn('[Google News RSS] Query failed:', query, e.message?.substring(0, 80))
    }
  }

  // === NEW: Scrape juga dari RSS lokal (Tribun, Detik, Kompas) ===
  for (const feed of LOCAL_RSS_FEEDS.slice(0, 3)) { // 3 feed per batch (anti timeout)
    try {
      const parsed = await rssParser.parseURL(feed.url)
      const items = parsed.items?.slice(0, 3) || [] // 3 item per feed

      for (const item of items) {
        // === STRICT FILTER: pakai fungsi isLapraRelevant (konsisten dengan Google News & YouTube) ===
        if (!isLapraRelevant(item.title || '', item.contentSnippet || '')) continue

        allPosts.push({
          platform: 'GOOGLE', // tag sebagai GOOGLE karena dari RSS news
          postId: item.guid || item.link || `${Date.now()}-${Math.random()}`,
          author: item.creator || item.author || feed.name,
          authorHandle: null,
          title: `[${feed.name}] ${item.title || ''}`,
          content: (item.contentSnippet || item.content || '').substring(0, 1000),
          url: item.link || '',
          publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
          engagementCount: 0,
          source: 'google-news-rss',
          rawPayload: {
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            content: item.content,
            sourceFeed: feed.name,
            region: feed.region,
            query: `local-rss:${feed.name}`,
          },
        })
      }
      console.log(`[Local RSS] ${feed.name}: ${items.length} items scanned`)
    } catch (e: any) {
      console.warn(`[Local RSS] ${feed.name} failed:`, e.message?.substring(0, 80))
    }
  }

  // Dedupe by URL
  const seen = new Set<string>()
  const unique = allPosts.filter(p => {
    if (!p.url || seen.has(p.url)) return false
    seen.add(p.url)
    return true
  })

  console.log(`[Google News RSS + Local RSS] ✅ ${unique.length} articles (batch: ${queryBatch.length} queries + ${Math.min(3, LOCAL_RSS_FEEDS.length)} local feeds)`)
  return unique.slice(0, maxResults * 3) // tingkatkan limit karena query lebih banyak
}

// === MAIN AUTO SCRAPER (called by worker) ===
export async function scrapeAuto(): Promise<{
  posts: ScrapedPost[]
  sources: string[]
  skipped: string[]
}> {
  const sources: string[] = []
  const skipped: string[] = []

  // Parallel scrape (YouTube + Google News in parallel for speed)
  const [ytResult, newsResult] = await Promise.allSettled([
    scrapeYouTube(5),
    scrapeGoogleNews(5),
  ])

  const yt = ytResult.status === 'fulfilled' ? ytResult.value.posts : []
  const ytInstance = ytResult.status === 'fulfilled' ? ytResult.value.instance : null
  const nw = newsResult.status === 'fulfilled' ? newsResult.value : []

  if (yt.length > 0) {
    sources.push(`YouTube (Invidious${ytInstance ? ': ' + ytInstance.replace('https://', '') : ''}, ${yt.length} videos)`)
  } else {
    skipped.push('YouTube (all Invidious instances failed — self-host Invidious for reliable access)')
  }

  if (nw.length > 0) {
    sources.push(`Google News RSS (${nw.length} articles)`)
  } else {
    skipped.push('Google News RSS (no results)')
  }

  // Honest reporting: platforms we cannot access without API keys
  skipped.push('Facebook (requires Meta Graph API token — not free)')
  skipped.push('Instagram (requires Meta Graph API token — not free)')
  skipped.push('TikTok (requires Research API approval)')
  skipped.push('X/Twitter (requires X API v2 Bearer token — $100/month)')

  return {
    posts: [...yt, ...nw],
    sources,
    skipped,
  }
}
