// LAPRA 08 - API: Topic Suggestions untuk Essay Polls (auto-fill inspirasi)
// GET /api/essay-polls/topic-suggestions - Get trending topics untuk inspirasi pertanyaan essay
//
// Sources:
// 1. Recent news dari Announcement (WEB_SYNC LAPRA 08 news)
// 2. Recent opinion links (yang sudah dianalisis AI)
// 3. Pre-defined topic categories dengan contoh per kategori
// 4. Trending issues by category (infrastruktur, ekonomi, sosial, dll)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// === PRE-DEFINED TOPIC CATEGORIES ===
// Ide topik siap pakai per kategori, dilengkapi dengan contoh pertanyaan singkat
const TOPIC_CATEGORIES = [
  {
    id: 'pertanian',
    icon: '🌾',
    label: 'Pertanian & Pangan',
    color: 'emerald',
    description: 'Isu pupuk bersubsidi, harga pangan, irigasi, hasil panen, kesejahteraan petani',
    suggestedTopics: [
      { topic: 'Kenaikan harga pupuk bersubsidi 30% di wilayah pertanian', occupation: 'PETANI', sentiment: 'NEGATIVE' },
      { topic: 'Kelangkaan pupuk menjelang musim tanam', occupation: 'PETANI', sentiment: 'NEGATIVE' },
      { topic: 'Program bantuan bibit unggulan untuk petani', occupation: 'PETANI', sentiment: 'POSITIVE' },
      { topic: 'Harga gabah anjlok di tingkat petani', occupation: 'PETANI', sentiment: 'NEGATIVE' },
      { topic: 'Kerusakan jaringan irigasi teknis', occupation: 'PETANI', sentiment: 'NEGATIVE' },
    ],
  },
  {
    id: 'nelayan',
    icon: '🎣',
    label: 'Kelautan & Perikanan',
    color: 'blue',
    description: 'Isu solar bersubsidi, cuaca ekstrem, tangkapan ikan, kesejahteraan nelayan',
    suggestedTopics: [
      { topic: 'Kelangkaan solar bersubsidi untuk nelayan', occupation: 'NELAYAN', sentiment: 'NEGATIVE' },
      { topic: 'Cuaca ekstrem mempengaruhi hasil tangkapan ikan', occupation: 'NELAYAN', sentiment: 'NEGATIVE' },
      { topic: 'Program bantuan alat tangkap ikan untuk nelayan kecil', occupation: 'NELAYAN', sentiment: 'POSITIVE' },
      { topic: 'Pencemaran laut dan dampaknya pada nelayan', occupation: 'NELAYAN', sentiment: 'NEGATIVE' },
    ],
  },
  {
    id: 'umkm',
    icon: '🏪',
    label: 'UMKM & Ekonomi Kreatif',
    color: 'amber',
    description: 'Isu modal usaha, digitalisasi UMKM, pajak, akses pasar, kredit usaha',
    suggestedTopics: [
      { topic: 'Kesulitan akses modal bagi UMKM mikro', occupation: 'UMKM', sentiment: 'NEGATIVE' },
      { topic: 'Program digitalisasi UMKM oleh pemerintah', occupation: 'UMKM', sentiment: 'POSITIVE' },
      { topic: 'Pajak UMKM dinilai memberatkan pelaku usaha kecil', occupation: 'UMKM', sentiment: 'NEGATIVE' },
      { topic: 'Pelatihan kewirausahaan untuk pemuda', occupation: 'UMKM', sentiment: 'POSITIVE' },
    ],
  },
  {
    id: 'pendidikan',
    icon: '🎓',
    label: 'Pendidikan & Mahasiswa',
    color: 'purple',
    description: 'Isu beasiswa, biaya pendidikan, kualitas sekolah, lapangan kerja lulusan',
    suggestedTopics: [
      { topic: 'Beasiswa KIP kuliah belum cair 6 bulan', occupation: 'PELAJAR', sentiment: 'NEGATIVE' },
      { topic: 'Lapangan kerja untuk lulusan baru minim', occupation: 'PELAJAR', sentiment: 'NEGATIVE' },
      { topic: 'Program MBG (Makan Bergizi Gratis) di sekolah', occupation: 'PELAJAR', sentiment: 'POSITIVE' },
      { topic: 'Kualitas fasilitas sekolah di daerah terpencil', occupation: 'PELAJAR', sentiment: 'NEGATIVE' },
    ],
  },
  {
    id: 'infrastruktur',
    icon: '🛣️',
    label: 'Infrastruktur & Jalan',
    color: 'orange',
    description: 'Jalan rusak, jembatan, listrik, air bersih, internet',
    suggestedTopics: [
      { topic: 'Jalan rusak parah di akses menuju pasar', occupation: 'UMUM', sentiment: 'NEGATIVE' },
      { topic: 'Pemadaman listrik bergilir di wilayah pedesaan', occupation: 'UMUM', sentiment: 'NEGATIVE' },
      { topic: 'Proyek pembangunan jembatan baru', occupation: 'UMUM', sentiment: 'POSITIVE' },
      { topic: 'Akses internet lambat di daerah terpencil', occupation: 'UMUM', sentiment: 'NEGATIVE' },
    ],
  },
  {
    id: 'kesehatan',
    icon: '🏥',
    label: 'Kesehatan & BPJS',
    color: 'red',
    description: 'Fasilitas kesehatan, BPJS, obat, posyandu, tenaga medis',
    suggestedTopics: [
      { topic: 'Fasilitas puskesmas kurang memadai', occupation: 'UMUM', sentiment: 'NEGATIVE' },
      { topic: 'Pelayanan BPJS kesehatan di rumah sakit', occupation: 'UMUM', sentiment: 'NEUTRAL' },
      { topic: 'Program posyandu untuk balita dan lansia', occupation: 'UMUM', sentiment: 'POSITIVE' },
    ],
  },
  {
    id: 'sosial',
    icon: '🤝',
    label: 'Bansos & Kesejahteraan',
    color: 'pink',
    description: 'Bantuan sosial, PKH, BLT, JKN, JKM, program sosial',
    suggestedTopics: [
      { topic: 'Bantuan sosial tidak cair tepat waktu', occupation: 'UMUM', sentiment: 'NEGATIVE' },
      { topic: 'Distribusi bansos belum merata di pelosok', occupation: 'UMUM', sentiment: 'NEGATIVE' },
      { topic: 'Program keluarga harapan (PKH) untuk masyarakat', occupation: 'UMUM', sentiment: 'POSITIVE' },
    ],
  },
  {
    id: 'kebijakan',
    icon: '⚖️',
    label: 'Kebijakan Pemerintah',
    color: 'indigo',
    description: 'UU baru, peraturan, Asta Cita, kebijakan Presiden Prabowo',
    suggestedTopics: [
      { topic: 'Implementasi Asta Cita Presiden Prabowo di daerah', occupation: 'UMUM', sentiment: 'POSITIVE' },
      { topic: 'Revisi UU Pemilu dan dampaknya', occupation: 'UMUM', sentiment: 'NEUTRAL' },
      { topic: 'Program hilirisasi tambang untuk kesejahteraan', occupation: 'UMUM', sentiment: 'POSITIVE' },
    ],
  },
  {
    id: 'pemuda',
    icon: '⚡',
    label: 'Pemuda & Ormas',
    color: 'cyan',
    description: 'Karang taruna, ormas pemuda, lapangan kerja pemuda, kreativitas',
    suggestedTopics: [
      { topic: 'Pelatihan keterampilan untuk pemuda pengangguran', occupation: 'UMUM', sentiment: 'POSITIVE' },
      { topic: 'Peran ormas pemuda dalam pemberdayaan masyarakat', occupation: 'YOUTH', sentiment: 'POSITIVE' },
      { topic: 'Kurangnya ruang kreatif untuk pemuda di desa', occupation: 'YOUTH', sentiment: 'NEGATIVE' },
    ],
  },
  {
    id: 'agama',
    icon: '🕌',
    label: 'Agama & Kerukunan',
    color: 'teal',
    description: 'Kerukunan umat beragama, fasilitas ibadah, tokoh agama',
    suggestedTopics: [
      { topic: 'Kerukunan umat beragama di wilayah multikultural', occupation: 'UMUM', sentiment: 'POSITIVE' },
      { topic: 'Fasilitas tempat ibadah yang layak', occupation: 'UMUM', sentiment: 'NEUTRAL' },
      { topic: 'Peran tokoh agama dalam perdamaian', occupation: 'UMUM', sentiment: 'POSITIVE' },
    ],
  },
]

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    // 1. Recent news (WEB_SYNC LAPRA 08) — top 10 latest
    const recentNews = await db.announcement.findMany({
      where: { isActive: true, type: { in: ['BERITA', 'PENGUMUMAN'] } },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, content: true, source: true, createdAt: true },
    }).catch(() => [])

    // 2. Recent opinion links yang sudah dianalisis — top 10 trending
    const recentOpinions = await db.publicOpinionLink.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, sentiment: true, priority: true, category: true, provinceName: true, regencyName: true, engagementCount: true },
    }).catch(() => [])

    // 3. Existing essay polls (untuk avoid duplicate)
    const existingPolls = await db.essayPoll.findMany({
      where: { sourceTopic: { not: null } },
      take: 20,
      select: { sourceTopic: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }).catch(() => [])

    return NextResponse.json({
      success: true,
      data: {
        // Pre-defined categories dengan suggested topics
        categories: TOPIC_CATEGORIES,
        // Recent news from LAPRA 08 (auto-sync dari web)
        recentNews: recentNews.map(n => ({
          id: n.id,
          title: n.title,
          source: n.source,
          publishedAt: n.createdAt,
          // Auto-detect occupation & sentiment from title
          occupation: detectOccupationFromTitle(n.title),
          sentiment: detectSentimentFromTitle(n.title),
        })),
        // Recent opinion links yang sudah dianalisis (trending issues)
        recentOpinions: recentOpinions.map(o => ({
          id: o.id,
          title: o.title,
          sentiment: o.sentiment,
          priority: o.priority,
          category: o.category,
          location: o.regencyName || o.provinceName || 'Nasional',
          engagement: o.engagementCount,
        })),
        // Existing poll topics (untuk avoid duplicate)
        existingTopics: existingPolls.map(p => p.sourceTopic).filter(Boolean),
        // Statistik untuk user info
        stats: {
          totalCategories: TOPIC_CATEGORIES.length,
          totalSuggestedTopics: TOPIC_CATEGORIES.reduce((sum, c) => sum + c.suggestedTopics.length, 0),
          recentNewsCount: recentNews.length,
          recentOpinionsCount: recentOpinions.length,
        },
      },
    })
  } catch (e: any) {
    console.error('[Topic Suggestions API] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

function detectOccupationFromTitle(title: string): string {
  const lower = title.toLowerCase()
  if (/\b(pupuk|petani|sawah|panen|gabah|beras|pertanian|tani)\b/.test(lower)) return 'PETANI'
  if (/\b(nelayan|tangkapan|ikan|solar|pantai|laut|perikanan)\b/.test(lower)) return 'NELAYAN'
  if (/\b(umkm|usaha kecil|modal usaha|pelaku usaha|warung|toko|dagang)\b/.test(lower)) return 'UMKM'
  if (/\b(pelajar|mahasiswa|sekolah|kuliah|beasiswa|pendidikan|guru)\b/.test(lower)) return 'PELAJAR'
  return 'UMUM'
}

function detectSentimentFromTitle(title: string): string {
  const lower = title.toLowerCase()
  const negWords = ['gagal', 'rusak', 'keluhan', 'marah', 'kecewa', 'lambat', 'tidak', 'belum', 'korupsi', 'protes', 'demo', 'sulit', 'mahal', 'naik', 'kebakaran', 'banjir']
  const posWords = ['berhasil', 'apresiasi', 'selamat', 'resmikan', 'resmi', 'pelantikan', 'dilantik', 'penghargaan', 'dukung', 'bakti sosial']
  
  const hasNeg = negWords.some(w => lower.includes(w))
  const hasPos = posWords.some(w => lower.includes(w))
  
  if (hasNeg && !hasPos) return 'NEGATIVE'
  if (hasPos && !hasNeg) return 'POSITIVE'
  return 'NEUTRAL'
}
