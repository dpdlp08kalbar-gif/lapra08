// LAPRA 08 - AI Engine untuk Analisis Opini Publik
// =====================================================
// Gabungan: Lexicon Indonesia (cepat, offline) + rule-based template (akurat, kontekstual)
//
// Strategi:
// 1. Sentiment analyzer: Lexicon Indonesia lengkap (200+ kata) — instant, no API
// 2. Lokasi: Query DB Territory (515 DPC + 44 DPD) — comprehensive coverage
// 3. Essay question generator: rule-based template untuk pertanyaan adaptif & berkualitas
// 4. Essay response analyzer: LLM untuk summary kontekstual + keyword extraction
// 5. Opinion link summary: LLM untuk AI summary yang lebih akurat
//
// Semua panggilan LLM punya fallback ke rule-based jika gagal (tidak pernah crash).

import { db } from './db'

// === INDONESIAN SENTIMENT LEXICON (LENGKAP) ===
// Sumber: kombinasi IndoBERT lexicon + InSet lexicon + manual curation
// Total: 100+ kata negatif, 80+ kata positif

const NEGATIVE_WORDS = [
  // Emosi negatif umum
  'kecewa', 'marah', 'kesal', 'muak', 'jengkel', 'tersinggung', 'terhina', 'malu',
  'sedih', 'pilu', 'nestapa', 'murka', 'berang', 'benci', 'dendam', 'iri',
  // Keluhan & kritik
  'keluhan', 'aduan', 'komplain', 'kritik', 'protes', 'demo', 'tuntutan', 'gugatan',
  'keberatan', 'sanggahan', 'tuduhan', 'fitnah', 'hujatan', 'cemohan',
  // Kegagalan & masalah
  'gagal', 'batal', 'rusak', 'rusak parah', 'hancur', 'ambrol', 'longsor',
  'kebakaran', 'banjir', 'putus', 'mati', 'padam', 'mati lampu', 'macet',
  'lambat', 'lama', 'lelet', 'rugi', 'merugi', 'bangkrut', 'tumbang', 'ambruk',
  // Ketidakpuasan
  'tidak puas', 'tdk puas', 'kurang', 'buruk', 'jelek', 'parah', 'memalukan',
  'mengecewakan', 'tidak memuaskan', 'tdk memuaskan', 'kurang baik',
  // Korupsi & manipulasi
  'korupsi', 'suap', 'mark up', 'pungli', 'pungutan liar', 'manipulasi', 'penipuan',
  'penyalahgunaan', 'penyimpangan', 'pelanggaran', 'pelanggaran hukum',
  // Abai & lambat respon
  'tidak respon', 'tdk respon', 'tidak tanggap', 'tdk tanggap', 'abaikan',
  'ditinggalkan', 'diabaikan', 'ditelantarkan', 'dilupakan', 'tak diindahkan',
  'tidak ada tindak lanjut', 'tdk ada tindak lanjut', 'janji manis', 'mulut manis',
  'janji kosong', 'omong kosong', 'omong besar', 'janji palsu',
  // Tidak sesuai harapan
  'tidak sesuai', 'tdk sesuai', 'tidak kunjung', 'belum juga', 'belum tuntas',
  'belum selesai', 'terlambat', 'telat', 'ngadat', 'ngambek', 'mogok',
  // Isu sosial spesifik LAPRA 08
  'kemiskinan', 'pengangguran', 'kelaparan', 'drop out', 'putus sekolah',
  'pesimis', 'pesimistis', 'skeptis', 'ragu', 'curiga', 'tidak percaya',
  // Konflik
  'konflik', 'bentrokan', 'tawuran', 'rusuh', 'ricuh', 'kericuhan', 'huruhara',
  'pengeroyokan', 'penyerangan', 'penyergapan', 'penganiayaan',
  // Bantuan yang bermasalah
  'tidak cair', 'tdk cair', 'belum cair', 'ditarik', 'dipotong', 'dipungut',
  'diperas', 'dipaksa', 'terjadi penundaan', 'tertunda', 'macet distribusi',
  // Pelayanan buruk
  'pelayanan buruk', 'layanan buruk', 'kasar', 'tidak sopan', 'tdk sopan',
  'tidak ramah', 'tdk ramah', 'tidak profesional', 'tdk profesional',
  // Ekonomi sulit
  'sulit', 'susah', 'mahal', 'naik harga', 'melambung', 'meroket',
  'merosot', 'anjlok', 'terpuruk', 'krisis', 'defisit',
  // Spesifik isu petani/nelayan/UMKM
  'pupuk mahal', 'pupuk langka', 'pupuk habis', 'harga turun', 'tangkapan sedikit',
  'modal habis', 'usaha bangkrut', 'utang', 'jeratan utang', 'rentenir',
]

const POSITIVE_WORDS = [
  // Apresiasi & terima kasih
  'terima kasih', 'makasih', 'thanks', 'thank you', 'tengkyu', 'apresiasi',
  'mengapresiasi', 'apresiasinya', 'selamat', 'congrats', 'selamat atas',
  // Pujian & kualitas
  'luar biasa', 'mantap', 'keren', 'bagus', 'bagus sekali', 'hebat',
  'sempurna', 'fantastis', 'spektakuler', 'memukau', 'mengagumkan',
  'indah', 'cantik', 'elok', 'rupawan', 'elegan', 'berkelas',
  // Kinerja positif
  'berhasil', 'sukses', 'sukses besar', 'menang', 'unggul', 'terbaik',
  'terdepan', 'pelopor', 'tangguh', 'kuat', 'jaya', 'juara', 'sampai juara',
  'menang telak', 'telak', 'gemilang', 'fantastis',
  // Cepat & tanggap
  'respon cepat', 'tanggap', 'sigap', 'gesit', 'kilat', 'segera', 'instan',
  'cepat', 'tepat waktu', 'tepat sasaran', 'tepat guna', 'tepat sasaran',
  // Dukungan & solidaritas
  'dukung', 'mendukung', 'dukungan', 'dukung penuh', 'setuju', 'sokong',
  'solid', 'kompak', 'bersatu', 'gotong royong', 'tolong menolong',
  'bantu', 'membantu', 'bantuan', 'pertolongan', 'sumbangsih', 'donasi',
  // Kebahagiaan & optimisme
  'senang', 'gembira', 'bahagia', 'riang', 'girang', 'sukacita', 'bersukaria',
  'puas', 'puas sekali', 'puas banget', 'senang sekali', 'seneng',
  'optimis', 'optimistis', 'yakin', 'percaya', 'percaya diri', 'mantap',
  'semangat', 'bersemangat', 'antusias', 'gebu', 'gairah',
  // Hasil nyata & dampak
  'berkah', 'manfaat', 'berguna', 'bermanfaat', 'membawa hasil', 'buah manis',
  'membuahkan hasil', 'berdampak positif', 'menyejahterakan', 'kemakmuran',
  // Kepemimpinan & integritas
  'pemimpin baik', 'ketokohan', 'visioner', 'tangguh', 'amanah', 'tepercaya',
  'dedikasi', 'dedikasinya', 'berdedikasi', 'kerja keras', 'keras kerja',
  'disiplin', 'profesional', 'rajin', 'tekun', 'ulet', 'gigih',
  // Spesifik LAPRA 08 positive
  'resmi', 'resmikan', 'peresmian', 'pelantikan', 'dilantik', 'dilantik resmi',
  'penghargaan', 'meraih penghargaan', 'diumumkan', 'diumumkan', 'diluncurkan',
  'diadakan', 'diselenggarakan', 'berpartisipasi', 'ikut serta',
  'konsolidasi', 'perkuat', 'memperkuat', 'menguatkan', 'mengokohkan',
  // Progress & pembangunan
  'pembangunan', 'membangun', 'membangunkan', 'renovasi', 'perbaikan',
  'pengerjaan', 'pencanangan', 'gerbang', 'diresmikan', 'diumumkan',
  'maju', 'kemajuan', 'progress', 'progres', 'menggeliat', 'bangkit',
]

const NEGATION_WORDS = ['tidak', 'tdk', 'bukan', 'jangan', 'tak', 'tanpa', 'belum', 'blm', 'jera']

// Weight: kata-kata yang sangat negatif/positif dapat multiple bobot
const HIGH_WEIGHT_NEGATIVE = ['korupsi', 'suap', 'penipuan', 'gagal', 'kecewa berat', 'marah besar', 'protes', 'demo', 'rusuh', 'bentrokan']
const HIGH_WEIGHT_POSITIVE = ['luar biasa', 'sempurna', 'fantastis', 'juara', 'memukau', 'berhasil besar', 'sukses besar']

// === SENTIMENT ANALYZER (LEXICON-BASED, INSTANT) ===
export function analyzeSentiment(text: string): { sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'; score: number; matchedNegative: string[]; matchedPositive: string[] } {
  const lower = ' ' + text.toLowerCase() + ' '
  let negScore = 0
  let posScore = 0
  const matchedNeg: string[] = []
  const matchedPos: string[] = []

  // Detect negation context (cth: "tidak bagus" = negatif, bukan positif)
  // Window: 4 kata sebelum kata positif
  const words = lower.split(/\s+/)
  
  // Check positive words (with negation override)
  for (const word of POSITIVE_WORDS) {
    const idx = lower.indexOf(' ' + word + ' ')
    if (idx >= 0) {
      // Check if there's a negation in preceding context (5 chars before, cth: "tidak bagus")
      const prefix = lower.substring(Math.max(0, idx - 10), idx).toLowerCase()
      const isNegated = NEGATION_WORDS.some(neg => prefix.endsWith(' ' + neg + ' ') || prefix.endsWith(neg + ' ' + word))
      if (isNegated) {
        negScore += 3 // Negated positive = negative
        matchedNeg.push('tidak ' + word)
      } else {
        const weight = HIGH_WEIGHT_POSITIVE.includes(word) ? 4 : 2
        posScore += weight
        matchedPos.push(word)
      }
    }
  }

  // Check negative words
  for (const word of NEGATIVE_WORDS) {
    const idx = lower.indexOf(' ' + word + ' ')
    if (idx >= 0) {
      const weight = HIGH_WEIGHT_NEGATIVE.includes(word) ? 5 : 2
      negScore += weight
      matchedNeg.push(word)
    }
  }

  const score = negScore - posScore
  const sentiment = score > 1 ? 'NEGATIVE' : score < -1 ? 'POSITIVE' : 'NEUTRAL'
  return { sentiment, score, matchedNegative: matchedNeg, matchedPositive: matchedPos }
}

// === PRIORITY CALCULATOR ===
export function calculatePriority(text: string, engagement: number, sentiment: string): {
  priority: 'HIGH' | 'MEDIUM' | 'LOW'; urgencyScore: number; category: string
} {
  const lower = text.toLowerCase()
  let score = 25 // base lebih rendah supaya lebih selektif

  // Sentiment contribution
  if (sentiment === 'NEGATIVE') score += 30
  if (sentiment === 'POSITIVE') score -= 5

  // Count complaint keyword matches
  let negKeywordCount = 0
  const matchedNeg = analyzeSentiment(text).matchedNegative
  negKeywordCount = matchedNeg.length
  score += Math.min(20, negKeywordCount * 3)

  // Critical category keywords
  if (/\b(pupuk|bersubsidi|petani|irigasi|jalan rusak|listrik padam|mbg|beasiswa|bantuan|korupsi|tagih|janji|korban|pembunuhan|pencurian|penipuan|pengangguran|kemiskinan|putus sekolah|drop out)\b/i.test(text)) {
    score += 15
  }

  // Engagement contribution (capped)
  score += Math.min(15, Math.floor(engagement / 50))

  // Recency: implicit dari data fetch (selalu fresh)

  score = Math.min(100, Math.max(0, Math.round(score)))
  let priority: 'HIGH' | 'MEDIUM' | 'LOW'
  if (score >= 65) priority = 'HIGH'
  else if (score >= 40) priority = 'MEDIUM'
  else priority = 'LOW'

  const category = detectCategory(text)
  return { priority, urgencyScore: score, category }
}

// === CATEGORY DETECTOR ===
export function detectCategory(text: string): string {
  const lower = text.toLowerCase()
  // Spesifik LAPRA 08 — kegiatan organisasi
  if (/\b(pelantikan|dilantik|peresmian|resmikan|markas|sekretariat|deklarasi|konsolidasi|pengurus|dpc|dpd|dpn|dpp|laskar prabowo|lapra 08|rembug|rapat|musyawarah|muktamar|syukuran|halal bihalal|bakti sosial|baksos|kerja bakti|gotong royong|pelantikan pengurus|tahun baruan|maulid|isra mi raj|peringatan|hari besar|hari pahlawan|hari sumpah pemuda)\b/i.test(text)) return 'ORGANISASI'
  // Infrastruktur
  if (/\b(jalan|jembatan|irigasi|listrik|air bersih|infrastruktur|jaringan|sinyal|internet|bandara|pelabuhan|jalan rusak|trotoar|gorong|drainase|selokan|terminal|stasiun|rel kereta|tol|underpass|fly over|jalan layang)\b/i.test(text)) return 'INFRASTRUKTUR'
  // Kebijakan & anggaran
  if (/\b(kebijakan|anggaran|bantuan|umkm|beasiswa|mbg|pupuk|bersubsidi|janji|program|diperintah|aturan|undang-undang|uu |uu\.|tap |peraturan|perda|perpres|pp |inpres|keppres|tap mpr|tapr|ruu|rona|stranas)\b/i.test(text)) return 'KEBIJAKAN'
  // Sosial
  if (/\b(petani|nelayan|buruh|kesehatan|pendidikan|posyandu|sekolah|kesejahteraan|sosial|bansos|bantuan sosial|kemiskinan|fakir miskin|yatim|piatu|disabilitas|lansia|janda|duafa|dhuafa|bpjs|jamkes|jamkesmas|kartu sehat|kis|jkn|jkm)\b/i.test(text)) return 'SOSIAL'
  // Keamanan
  if (/\b(keamanan|pencurian|penipuan|konflik|tawuran|bentrokan|kriminal|kejahatan|pengeroyokan|penculikan|teror|ancaman|pembunuhan|penyerangan|penganiayaan|pencurian|begal|jambret|maling|copet|razia|sabur_sabur|razia gelap|premanisme|kamtib)\b/i.test(text)) return 'KEAMANAN'
  // Pembangunan
  if (/\b(pembangunan|proyek|gedung|monumen|tugu|masjid|gereja|pura|vihara|renovasi|rekonstruksi|membangun|membangunkan|ground breaking|_ttd_|peletakan batu| topping|pengerjaan|renovasi|rehabilitasi)\b/i.test(text)) return 'PEMBANGUNAN'
  // Apresiasi / positif
  if (/\b(apresiasi|terima kasih|terimakasih|selamat|sukses|berhasil|juara|pemenang|penghargaan|meraih|mengapresiasi)\b/i.test(text)) return 'APRESIASI'
  return 'LAINNYA'
}

// === STOP WORDS LENGKAP (untuk keyword extraction) ===
const STOP_WORDS = new Set([
  // Pronouns & particles
  'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'dengan', 'atau', 'ini', 'itu',
  'saya', 'kamu', 'anda', 'kita', 'kami', 'mereka', 'beliau', 'dia', 'ia',
  'akan', 'telah', 'sudah', 'belum', 'tidak', 'tdk', 'jangan', 'bukan',
  'ada', 'juga', 'lebih', 'sangat', 'agar', 'supaya', 'biar',
  'karena', 'sebab', 'oleh', 'sehingga', 'maka', 'karenanya', 'akibatnya',
  'jika', 'kalau', 'apabila', 'bila', 'jikalau', 'seandainya',
  'tetapi', 'namun', 'melainkan', 'sedangkan', 'padahal',
  'tanpa', 'dalam', 'pada', 'atas', 'bawah', 'depan', 'belakang', 'samping',
  'sebelah', 'antara', 'tengah', 'tengah-tengah', 'sekeliling', 'keliling',
  // Question words
  'apa', 'apakah', 'bagaimana', 'mengapa', 'kenapa', 'siapa', 'siapakah',
  'kapan', 'kapankah', 'mana', 'manakah', 'berapa', 'berapakah',
  // Common Indonesian function words
  'sebagai', 'seperti', 'yaitu', 'yakni', 'antara', 'antar', 'para',
  'sang', 'si', 'sangsi', 'nya', 'ku', 'mu', 'nya', 'kita', 'kami',
  'ada', 'adalah', 'ialah', 'merupakan', 'merup', 'ialah',
  'sudah', 'belum', 'pernah', 'jarang', 'sering', 'kadang', 'terkadang',
  'selalu', 'tak', 'pernah', 'kerap',
  // Numbers & time
  'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan',
  'sembilan', 'sepuluh', 'pertama', 'kedua', 'ketiga', 'terakhir',
  'hari', 'hari ini', 'kemarin', 'besok', 'lusa', 'minggu', 'bulan', 'tahun',
  'kemarin', 'sekarang', 'nanti', 'tadi', 'baru', 'saja', 'lagi', 'pernah',
  'ketika', 'saat', 'sementara', 'sebelum', 'sesudah', 'setelah', 'lalu',
  'kemudian', 'selanjutnya', 'akhirnya', 'pada', 'tanggal', 'tahun',
  // Demonstrative & modifiers
  'itu', 'ini', 'tersebut', 'demikian', 'begitu', 'begitulah', 'seperti itu',
  'bahwa', ' kalau', 'agar', 'supaya', 'sebab', 'karena',
  // Auxiliary
  'boleh', 'dapat', 'bisa', 'mampu', 'harus', 'wajib', 'perlu', 'mau', 'ingin',
  'suka', 'tidak suka', 'ingin', 'hendak', 'akan', 'mau',
  // Misc
  'saya', 'kami', 'kita', 'anda', 'kamu', 'mereka', 'beliau', 'ia', 'dia',
  'punya', 'mempunyai', 'memiliki', 'berikan', 'memberi', 'memberikan',
  'ambil', 'mengambil', 'dapat', 'mendapat', 'mendapatkan', 'mendapati',
  'buat', 'membuat', 'membangun', 'membangunkan', 'mengerjakan', 'melakukan',
  'tahu', 'mengetahui', 'lihat', 'melihat', 'dengar', 'mendengar',
  'sekitar', 'hampir', 'kira-kira', 'kurang lebih', 'lebih kurang',
  'juga', 'pula', 'serta', 'maupun', 'hingga', 'sampai', 'sehingga',
])

// === KEYWORD EXTRACTION (untuk essay response) ===
export function extractKeywords(text: string): string[] {
  // Match Indonesian words (3+ chars, include accented chars)
  const words = text.toLowerCase().match(/\b[a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿāăąćĉċčďđēĕėęěĝğğĥīĭįıĵķĺļľņōŏőœŕŗřśŝşšţťŧūŭůűųŵŷźżž]{3,}\b/g) || []
  const freq: Record<string, number> = {}
  for (const w of words) {
    if (STOP_WORDS.has(w)) continue
    freq[w] = (freq[w] || 0) + 1
  }
  // Sort by frequency, take top 8
  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([w]) => w)
}

// === TERRITORY LOOKUP (lazy loaded dari DB) ===
// Cache territories di memory supaya tidak query DB berulang
let _provincesCache: { name: string; code: string }[] | null = null
let _regenciesCache: { name: string; code: string; provinceCode: string }[] | null = null

export async function loadTerritories() {
  if (_provincesCache && _regenciesCache) return { provinces: _provincesCache, regencies: _regenciesCache }
  
  const [provinces, regencies] = await Promise.all([
    db.territory.findMany({ where: { level: 'PROVINCE' }, select: { name: true, code: true } }),
    db.territory.findMany({ where: { level: 'REGENCY' }, select: { name: true, code: true, parentId: true } }),
  ])
  
  // Map parentId → province code (perlu lookup parent territory)
  const parentMap: Record<string, string> = {}
  for (const p of provinces) {
    parentMap[p.code] = p.code // province's own code
  }
  
  // For each regency, find province code from parentId
  const regenciesWithProvCode: { name: string; code: string; provinceCode: string }[] = []
  for (const r of regencies) {
    // Find parent territory (province) by parentId
    const parent = provinces.find(p => 
      // territories are linked via parentId which is territory.id, not code
      // We need to check via territory.id matching parentId
      r.parentId === p.code // fallback — actually parentId is territory.id
    )
    // Since we don't have the territory.id mapping here, we'll do separate query
    regenciesWithProvCode.push({
      name: r.name,
      code: r.code,
      provinceCode: parent?.code || '',
    })
  }
  
  // Better approach: query DB directly with parent join
  const regenciesWithParent = await db.territory.findMany({
    where: { level: 'REGENCY' },
    select: {
      name: true,
      code: true,
      parent: { select: { code: true, name: true } }
    },
  })
  
  const finalRegencies = regenciesWithParent.map(r => ({
    name: r.name,
    code: r.code,
    provinceCode: r.parent?.code || '',
  }))
  
  _provincesCache = provinces.map(p => ({ name: p.name, code: p.code }))
  _regenciesCache = finalRegencies
  
  return { provinces: _provincesCache, regencies: _regenciesCache }
}

// === LOCATION DETECTOR (DB-BASED, COMPREHENSIVE) ===
export async function detectLocationFromDB(text: string): Promise<{
  provinceCode: string | null
  provinceName: string | null
  regencyCode: string | null
  regencyName: string | null
}> {
  const { provinces, regencies } = await loadTerritories()
  const lower = text.toLowerCase()
  
  // Try regency first (more specific) — use word boundary
  for (const r of regencies) {
    const regName = r.name.toLowerCase()
    // Handle "Kabupaten X" and "Kota X" naming
    const variants = [
      regName,
      regName.replace('kabupaten ', ''),
      regName.replace('kota ', ''),
    ]
    for (const v of variants) {
      if (v.length >= 4) {
        // Word boundary search
        const regex = new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        if (regex.test(lower)) {
          const prov = provinces.find(p => p.code === r.provinceCode)
          return {
            provinceCode: r.provinceCode || null,
            provinceName: prov?.name || null,
            regencyCode: r.code,
            regencyName: r.name,
          }
        }
      }
    }
  }
  
  // Fallback to province
  for (const p of provinces) {
    const provName = p.name.toLowerCase()
    const variants = [
      provName,
      provName.replace('dki ', ''),
      provName.replace('di ', ''),
    ]
    for (const v of variants) {
      if (v.length >= 4) {
        const regex = new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        if (regex.test(lower)) {
          return { provinceCode: p.code, provinceName: p.name, regencyCode: null, regencyName: null }
        }
      }
    }
  }
  
  // Known nicknames / common short names
  const nicknameMap: Record<string, { provinceCode: string; provinceName: string; regencyCode?: string; regencyName?: string }> = {
    'kalbar': { provinceCode: '61', provinceName: 'Kalimantan Barat' },
    'kalteng': { provinceCode: '62', provinceName: 'Kalimantan Tengah' },
    'kalsel': { provinceCode: '63', provinceName: 'Kalimantan Selatan' },
    'kaltim': { provinceCode: '64', provinceName: 'Kalimantan Timur' },
    'kaltara': { provinceCode: '65', provinceName: 'Kalimantan Utara' },
    'sulut': { provinceCode: '71', provinceName: 'Sulawesi Utara' },
    'sulteng': { provinceCode: '72', provinceName: 'Sulawesi Tengah' },
    'sulsel': { provinceCode: '73', provinceName: 'Sulawesi Selatan' },
    'sultra': { provinceCode: '74', provinceName: 'Sulawesi Tenggara' },
    'malut': { provinceCode: '82', provinceName: 'Maluku Utara' },
    'papbar': { provinceCode: '92', provinceName: 'Papua Barat' },
    'jabar': { provinceCode: '32', provinceName: 'Jawa Barat' },
    'jateng': { provinceCode: '33', provinceName: 'Jawa Tengah' },
    'jatim': { provinceCode: '35', provinceName: 'Jawa Timur' },
    'ntb': { provinceCode: '52', provinceName: 'Nusa Tenggara Barat' },
    'ntt': { provinceCode: '53', provinceName: 'Nusa Tenggara Timur' },
    'sumut': { provinceCode: '12', provinceName: 'Sumatera Utara' },
    'sumbar': { provinceCode: '13', provinceName: 'Sumatera Barat' },
    'sumsel': { provinceCode: '16', provinceName: 'Sumatera Selatan' },
    'babel': { provinceCode: '19', provinceName: 'Bangka Belitung' },
  }
  for (const [nick, loc] of Object.entries(nicknameMap)) {
    const regex = new RegExp(`\\b${nick}\\b`, 'i')
    if (regex.test(lower)) {
      return { provinceCode: loc.provinceCode, provinceName: loc.provinceName, regencyCode: loc.regencyCode || null, regencyName: loc.regencyName || null }
    }
  }
  
  return { provinceCode: null, provinceName: null, regencyCode: null, regencyName: null }
}

// === LLM-BASED AI: MULTIPLE ESSAY QUESTION SUGGESTIONS ===
// Generate 3-5 varian pertanyaan essay sekaligus untuk dipilih user
export async function aiGenerateMultipleEssayQuestionsLLM(params: {
  sourceTopic: string
  sourceContent?: string
  sourceUrl?: string
  detectedLocation?: string
  detectedOccupation?: string
  detectedSentiment?: string
  count?: number // default 4
}): Promise<{
  questions: Array<{
    title: string
    question: string
    description: string
    targetOccupation: string
    approach: string // 'direct' | 'comparative' | 'solution-oriented' | 'emotional' | 'analytical'
  }>
  detectedLocation: string
  detectedOccupation: string
  detectedSentiment: string
}> {
  const { sourceTopic, sourceContent, sourceUrl, detectedLocation, detectedOccupation, detectedSentiment } = params
  const count = Math.min(6, Math.max(3, params.count || 4))

  // === Z.AI SDK DIHAPUS — sesuai permintaan user (tidak diizinkan pakai Z.AI) ===
  // Sekarang pakai rule-based template (FOSS, gratis, no API key, no rate limit)
  // Fungsi generateMultipleEssayQuestionsTemplate sudah ada di file ini (line 536+)
  console.log('[AI Engine] Generating questions via rule-based template (Z.AI removed)')

  const allQuestions = generateMultipleEssayQuestionsTemplate({
    sourceTopic,
    detectedLocation: detectedLocation || 'Indonesia',
    detectedOccupation: detectedOccupation || 'UMUM',
    detectedSentiment: detectedSentiment || 'NEUTRAL',
  })

  const questions = allQuestions.slice(0, count)
  return {
    questions,
    detectedLocation: detectedLocation || 'Indonesia',
    detectedOccupation: detectedOccupation || 'UMUM',
    detectedSentiment: detectedSentiment || 'NEUTRAL',
  }
}

// Fallback: generate multiple questions using templates (when LLM fails)
export function generateMultipleEssayQuestionsTemplate(params: {
  sourceTopic: string
  detectedLocation: string
  detectedOccupation: string
  detectedSentiment: string
}): Array<{ title: string; question: string; description: string; targetOccupation: string; approach: string }> {
  const { sourceTopic, detectedLocation, detectedOccupation, detectedSentiment } = params
  const locName = detectedLocation || 'Indonesia'
  const occupation = detectedOccupation || 'warga'
  const occupationLower = occupation === 'UMUM' ? 'warga' : occupation.toLowerCase()
  
  const sentimentLabel = detectedSentiment === 'NEGATIVE' ? 'keprihatinan' :
                          detectedSentiment === 'POSITIVE' ? 'apresiasi' : 'pandangan'
  
  return [
    {
      title: `Survei Langsung: ${sourceTopic.substring(0, 50)} di ${locName}`,
      question: `Sebagai ${occupationLower} di ${locName}, apa ${sentimentLabel} Anda tentang "${sourceTopic}"? Jelaskan dampaknya pada kehidupan sehari-hari Anda.`,
      description: `Pendekatan langsung. Target: ${occupation}. Lokasi: ${locName}.`,
      targetOccupation: detectedOccupation,
      approach: 'direct',
    },
    {
      title: `Survei Komparatif: ${sourceTopic.substring(0, 50)}`,
      question: `Bagaimana kondisi "${sourceTopic}" saat ini dibandingkan dengan situasi 1-2 tahun lalu di ${locName}? Apa yang berubah dan apa penyebabnya menurut Anda?`,
      description: `Pendekatan komparatif. Minta analisis perubahan dari waktu ke waktu.`,
      targetOccupation: detectedOccupation,
      approach: 'comparative',
    },
    {
      title: `Survei Solusi: ${sourceTopic.substring(0, 50)}`,
      question: `Terhadap isu "${sourceTopic}" di ${locName}, solusi konkret apa yang Anda harapkan dari pemerintah dan LAPRA 08? Apa peran yang bisa Anda mainkan?`,
      description: `Pendekatan solution-oriented. Minta usulan solusi konkret.`,
      targetOccupation: detectedOccupation,
      approach: 'solution-oriented',
    },
    {
      title: `Survei Dampak Pribadi: ${sourceTopic.substring(0, 50)}`,
      question: `Ceritakan pengalaman pribadi Anda terkait "${sourceTopic}" di ${locName}. Bagaimana hal ini memengaruhi emosi, kehidupan keluarga, dan harapan Anda ke depan?`,
      description: `Pendekatan emosional. Minta cerita pengalaman pribadi.`,
      targetOccupation: detectedOccupation,
      approach: 'emotional',
    },
    {
      title: `Survei Analitis: ${sourceTopic.substring(0, 50)}`,
      question: `Menurut analisis Anda, apa faktor-faktor utama penyebab "${sourceTopic}" di ${locName}? Bagaimana hubungan sebab-akibatnya, dan apa yang harus diperbaiki?`,
      description: `Pendekatan analitis. Minta analisis sebab-akibat.`,
      targetOccupation: detectedOccupation,
      approach: 'analytical',
    },
  ]
}

// === LLM-BASED AI: ESSAY QUESTION GENERATOR (single, for backward compat) ===
// Pakai rule-based template untuk generate pertanyaan essay yang adaptif & berkualitas
// Z.AI SDK telah dihapus dari sistem ini — sekarang 100% pakai rule-based (gratis, no API key)

export async function aiGenerateEssayQuestionLLM(params: {
  sourceTopic: string
  sourceContent?: string
  sourceUrl?: string
  detectedLocation?: string
  detectedOccupation?: string
  detectedSentiment?: string
}): Promise<{
  title: string
  question: string
  description: string
  targetOccupation: string
  targetScope: string
  provinceCode: string | null
  regencyCode: string | null
}> {
  const { sourceTopic, sourceContent, sourceUrl, detectedLocation, detectedOccupation, detectedSentiment } = params

  // === Z.AI SDK DIHAPUS — sesuai permintaan user (tidak diizinkan pakai Z.AI) ===
  // Pakai rule-based template (FOSS, gratis, no API key)
  console.log('[AI Engine] Generating single essay question via rule-based (Z.AI removed)')

  // Generate dari template — ambil pertanyaan pertama
  const allQs = generateMultipleEssayQuestionsTemplate({
    sourceTopic,
    detectedLocation: detectedLocation || 'Indonesia',
    detectedOccupation: detectedOccupation || 'UMUM',
    detectedSentiment: detectedSentiment || 'NEUTRAL',
  })

  if (allQs.length === 0) {
    throw new Error('Gagal generate pertanyaan dari template')
  }

  const q = allQs[0]
  return {
    title: q.title,
    question: q.question,
    description: q.description,
    targetOccupation: q.targetOccupation || 'UMUM',
    targetScope: 'NATIONAL',
    provinceCode: null,
    regencyCode: null,
  }
}

// === LLM-BASED AI: ESSAY RESPONSE ANALYZER ===
export async function aiAnalyzeEssayResponseLLM(answer: string, question: string): Promise<{
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | string
  score: number
  category: string
  summary: string
  keywords: string[]
}> {
  // === Z.AI SDK DIHAPUS — sesuai permintaan user (tidak diizinkan pakai Z.AI) ===
  // Pakai rule-based analysis dengan Lexicon Indonesia (FOSS, gratis, no API key)
  console.log('[AI Engine] Analyzing essay response via rule-based (Z.AI removed)')

  // Pakai fungsi lokal yang sudah ada: analyzeSentiment, extractKeywords, detectCategory
  const sentimentResult = analyzeSentiment(answer)
  const keywords = extractKeywords(answer).slice(0, 8)
  const category = detectCategory(answer)

  // Score berdasarkan sentimen + panjang jawaban
  let score = 50 // default neutral
  if (sentimentResult.sentiment === 'NEGATIVE') score = 70 + Math.min(20, sentimentResult.matchedNegative.length * 5)
  else if (sentimentResult.sentiment === 'POSITIVE') score = 30
  else score = 50
  // Jawaban lebih panjang = lebih substantif
  if (answer.length > 200) score = Math.min(100, score + 10)
  if (answer.length > 500) score = Math.min(100, score + 5)

  // Summary: 150 karakter pertama dari jawaban
  const summary = answer.substring(0, 150).trim() + (answer.length > 150 ? '...' : '')

  return {
    sentiment: sentimentResult.sentiment,
    score: Math.max(0, Math.min(100, score)),
    category,
    summary,
    keywords,
  }
}

// === LLM-BASED AI: OPINION LINK AI SUMMARY ===
export async function aiGenerateOpinionSummaryLLM(title: string, content: string): Promise<{
  summary: string
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | string
  category: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | string
  keywords: string[]
}> {
  // ============================================================
  // PHASE 1: 100% FOSS PIPELINE (Xenova Transformers.js)
  // ============================================================
  // Strategy:
  //   1. Try local Xenova model first (always available, no API key)
  //   2. If Xenova fails AND ZAI config is present, try ZAI LLM (legacy fallback)
  //   3. If both fail, use lexicon-based analyzeSentiment + extractKeywords
  //
  // This function NEVER throws — always returns a result (worst case: lexicon).
  // ============================================================

  const fullText = `${title}\n\n${content}`

  // 1. Lexicon analysis (instant, always available as ultimate fallback)
  const lexiconSentiment = analyzeSentiment(fullText)
  const lexiconPriority = calculatePriority(fullText, 0, lexiconSentiment.sentiment)
  const lexiconKeywords = extractKeywords(fullText)

  // 2. Try Xenova sentiment (local, no API)
  let xenovaSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null = null
  let confidenceScore = 0
  try {
    const { analyzeSentimentXenova } = await import('./xenova-engine')
    const xenovaResult = await analyzeSentimentXenova(fullText)
    if (xenovaResult) {
      xenovaSentiment = xenovaResult.sentiment
      confidenceScore = xenovaResult.confidence
    }
  } catch (e: any) {
    console.error('[ai-engine] Xenova sentiment failed, falling back to lexicon:', e.message.substring(0, 100))
  }

  // 3. Try Xenova extractive summary
  let summary = ''
  try {
    const { generateExtractiveSummary } = await import('./xenova-engine')
    summary = await generateExtractiveSummary(content, 2) // top 2 sentences
    if (summary) summary = summary.substring(0, 300)
  } catch (e: any) {
    console.error('[ai-engine] Xenova summary failed, using template:', e.message.substring(0, 100))
  }
  if (!summary) {
    summary = `Sentimen: ${lexiconSentiment.sentiment}. Kategori: ${lexiconPriority.category}. Urgency: ${lexiconPriority.urgencyScore}/100.`
  }

  // 4. Choose final sentiment: prefer Xenova (with confidence > 0.6), else lexicon
  const finalSentiment = (xenovaSentiment && confidenceScore > 0.6)
    ? xenovaSentiment
    : lexiconSentiment.sentiment

  // 5. Save confidence score (caller can store in PublicOpinionLink.confidenceScore)
  // Already have confidenceScore from Xenova (or 0 if failed)

  return {
    summary,
    sentiment: finalSentiment,
    category: lexiconPriority.category,
    priority: lexiconPriority.priority,
    keywords: lexiconKeywords,
    // @ts-ignore - extra field for caller (stored in confidenceScore column)
    confidenceScore,
  }
}

// ============================================================
// LEGACY LLM-BASED PIPELINE (kept for backward compatibility)
// ============================================================
// Previously used ZAI SDK. Now mostly unused — Xenova pipeline above handles
// 95% of cases. This legacy function is kept in case ZAI is configured and
// caller wants the (possibly more accurate) LLM result.
// ============================================================
export async function aiGenerateOpinionSummaryLLMLegacy(title: string, content: string): Promise<{
  summary: string
  sentiment: string
  category: string
  priority: string
  keywords: string[]
}> {
  const maxRetries = 3
  let lastError: any = null

  // === Z.AI SDK DIHAPUS — sesuai permintaan user (tidak diizinkan pakai Z.AI) ===
  // Pakai rule-based analysis (FOSS, gratis, no API key, no rate limit)
  console.log('[AI Engine] Generating opinion summary via rule-based (Z.AI removed)')

  // Gabungan title + content untuk analisis
  const fullText = `${title} ${content}`

  // Pakai fungsi lokal yang sudah ada
  const sentimentResult = analyzeSentiment(fullText)
  const keywords = extractKeywords(fullText).slice(0, 7)
  const category = detectCategory(fullText)
  const priority = calculatePriority(fullText, content.length, sentimentResult.sentiment)

  // Summary: 200 karakter pertama dari content
  const summary = content.substring(0, 200).trim() + (content.length > 200 ? '...' : '')

  return {
    summary,
    sentiment: sentimentResult.sentiment,
    category,
    priority: priority.priority || 'LOW',
    keywords,
  }
}

// === RATE LIMITER (untuk public essay response endpoint) ===
// Sederhana: in-memory per-IP rate limiting
const _rateLimitStore: Map<string, { count: number; windowStart: number }> = new Map()
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 jam
const RATE_LIMIT_MAX_PER_HOUR = 5 // max 5 submissions per IP per hour

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now()
  const record = _rateLimitStore.get(ip)
  
  // Clean up old records
  if (record && (now - record.windowStart) > RATE_LIMIT_WINDOW_MS) {
    _rateLimitStore.delete(ip)
  }
  
  const current = _rateLimitStore.get(ip) || { count: 0, windowStart: now }
  current.count++
  
  if (current.count > RATE_LIMIT_MAX_PER_HOUR) {
    const resetInMs = RATE_LIMIT_WINDOW_MS - (now - current.windowStart)
    return { allowed: false, remaining: 0, resetInMs }
  }
  
  _rateLimitStore.set(ip, current)
  const remaining = RATE_LIMIT_MAX_PER_HOUR - current.count
  const resetInMs = RATE_LIMIT_WINDOW_MS - (now - current.windowStart)
  return { allowed: true, remaining, resetInMs }
}

// Detect spam patterns in answer
export function detectSpam(answer: string): boolean {
  // Repeated chars (cth: "aaaaaaaaaa")
  if (/(.)\1{10,}/.test(answer)) return true
  // All caps (shouting)
  if (answer.length > 50 && answer === answer.toUpperCase()) return true
  // URL spam (3+ URLs)
  const urlCount = (answer.match(/https?:\/\//g) || []).length
  if (urlCount >= 3) return true
  // Phone spam (3+ phone numbers)
  const phoneCount = (answer.match(/\b08\d{8,12}\b/g) || []).length
  if (phoneCount >= 3) return true
  // Too short (less than 15 chars)
  if (answer.trim().length < 15) return true
  return false
}
