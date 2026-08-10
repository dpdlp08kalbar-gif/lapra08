// LAPRA 08 - API: Audit AI Responding Otomatis (Scan + Results)
// POST: Trigger scan across all platforms
// GET: List scan results with RBAC
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

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

// POST - Trigger new scan
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { platforms } = body
    const scanPlatforms = platforms || ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'TWITTER_X', 'GOOGLE']

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

    // Create scan record
    const scan = await db.auditScan.create({
      data: {
        triggeredById: user.id,
        platforms: JSON.stringify(scanPlatforms),
        scope, provinceCode, regencyCode,
        status: 'COMPLETED',
      },
    })

    // === SIMULATE SCAN RESULTS (Production: use open-source scrapers) ===
    // In production:
    // - Google: Google Custom Search API (free tier) or RSS
    // - Facebook/Instagram: Meta Graph API (free, public pages only)
    // - TikTok: open-source scraper (tiktok-scraper npm)
    // - Twitter/X: Twikit or Nitter (open-source, no API key)
    //
    // For demo: generate realistic complaints based on common Indonesian issues
    
    const sampleComplaints = [
      // HIGH priority
      { platform: 'TWITTER_X', author: 'Warga_Grobogan', content: 'Pupuk bersubsidi di Grobogan habis! Petani nggak bisa tanam. Sudah 2 minggu dilaporkan ke DPC tapi tidak ada respon. @Lapra08 tolong tindak lanjut!', priority: 'HIGH', urgencyScore: 92, category: 'INFRASTRUKTUR', provinceCode: '33', provinceName: 'Jawa Tengah', regencyCode: '3307', regencyName: 'Grobogan', engagementCount: 342 },
      { platform: 'TIKTOK', author: 'petani_muda_id', content: 'Video: Jalan rusak parah di akses ke pasar Madiun. Truk pengangkut hasil tani sering terguling. Sudah lama tidak diperbaiki. DPC LAPRA 08 Madiun tidur kah?', priority: 'HIGH', urgencyScore: 88, category: 'INFRASTRUKTUR', provinceCode: '35', provinceName: 'Jawa Timur', regencyCode: '3503', regencyName: 'Madiun', engagementCount: 1250 },
      { platform: 'FACEBOOK', author: 'Ibu Rumah Tangga Bekasi', content: 'MBG di sekolah anak saya di Bekasi tidak ada lagi! Sudah 3 minggu berhenti. DPC LAPRA 08 Bekasi tidak respon laporan saya. Kecewa sekali!', priority: 'HIGH', urgencyScore: 90, category: 'SOSIAL', provinceCode: '32', provinceName: 'Jawa Barat', regencyCode: '3216', regencyName: 'Bekasi', engagementCount: 567 },
      { platform: 'INSTAGRAM', author: 'mahasiswa_jakarta', content: 'Beasiswa KIP kuliah tidak cair 6 bulan. Teman-teman banyak yang drop out. DPC Jakarta Pusat tidak tanggap keluhan kami. @laskarprabowo08official', priority: 'HIGH', urgencyScore: 85, category: 'KEBIJAKAN', provinceCode: '31', provinceName: 'DKI Jakarta', regencyCode: '3171', regencyName: 'Jakarta Pusat', engagementCount: 892 },
      
      // MEDIUM priority
      { platform: 'GOOGLE', author: 'Warga Sambas', content: 'Listrik sering padam di Sambas Kalbar. Komplain ke PLN tidak ditangani. Apakah DPC LAPRA 08 Sambas bisa bantu advokasi?', priority: 'MEDIUM', urgencyScore: 65, category: 'INFRASTRUKTUR', provinceCode: '61', provinceName: 'Kalimantan Barat', regencyCode: '6175', regencyName: 'Sambas', engagementCount: 145 },
      { platform: 'TWITTER_X', author: 'UMKM_Bandung', content: 'Modal usaha UMKM dari pemerintah belum cair di Bandung. Prosedur ribet. DPC LAPRA 08 Bandung tolong bantu info kelanjutannya.', priority: 'MEDIUM', urgencyScore: 60, category: 'KEBIJAKAN', provinceCode: '32', provinceName: 'Jawa Barat', regencyCode: '3204', regencyName: 'Bandung', engagementCount: 234 },
      { platform: 'FACEBOOK', author: 'Nelayan Cirebon', content: 'Hasil tangkapan ikan menurun, harga solar naik. DPC Cirebon belum ada program bantuan untuk nelayan. Mohon perhatian DPD Jabar.', priority: 'MEDIUM', urgencyScore: 55, category: 'SOSIAL', provinceCode: '32', provinceName: 'Jawa Barat', regencyCode: '3209', regencyName: 'Cirebon', engagementCount: 178 },
      { platform: 'TIKTOK', author: 'gen_z_surabaya', content: 'Lapangan kerja untuk lulusan baru minim di Surabaya. DPC LAPRA 08 Surabaya ada program kaderisasi yang bisa bantu dapet kerja nggak?', priority: 'MEDIUM', urgencyScore: 50, category: 'KEBIJAKAN', provinceCode: '35', provinceName: 'Jawa Timur', regencyCode: '3503', regencyName: 'Surabaya', engagementCount: 456 },
      
      // LOW priority
      { platform: 'INSTAGRAM', author: 'warga_pontianak', content: 'Fasilitas posyandu di Pontianak kurang memadai. Mohon DPC LAPRA 08 Pontianak bisa bantu advokasi ke dinas kesehatan.', priority: 'LOW', urgencyScore: 35, category: 'SOSIAL', provinceCode: '61', provinceName: 'Kalimantan Barat', regencyCode: '6171', regencyName: 'Pontianak', engagementCount: 67 },
      { platform: 'GOOGLE', author: 'Petani Banyumas', content: 'Irigasi sawah rusak, hasil panen menurun. Mohon DPC Banyumas bantu koordinasi dengan Dinas Pertanian.', priority: 'LOW', urgencyScore: 40, category: 'INFRASTRUKTUR', provinceCode: '33', provinceName: 'Jawa Tengah', regencyCode: '3302', regencyName: 'Banyumas', engagementCount: 89 },
    ]

    // Apply RBAC filter to sample complaints
    let filteredComplaints = sampleComplaints
    if (scope === 'PROVINCE') {
      filteredComplaints = sampleComplaints.filter(c => c.provinceCode === territory?.code)
    } else if (scope === 'REGENCY') {
      filteredComplaints = sampleComplaints.filter(c => c.regencyCode === territory?.code)
    }

    // Insert complaints
    let needsResponse = 0
    let ignoredCount = 0

    for (const c of filteredComplaints) {
      // AI Recommendation (template-based, production: Ollama/Llama 3)
      let aiRec = ''
      let aiAction = 'MONITOR'
      if (c.priority === 'HIGH') {
        aiAction = c.category === 'INFRASTRUKTUR' ? 'FIELD_VISIT' : 'CLARIFICATION'
        aiRec = `Prioritas TINGGI: ${c.regencyName}. Tim DPC ${c.regencyName} wajib turun ke lapangan dalam 1x24 jam. ${c.category === 'INFRASTRUKTUR' ? 'Verifikasi kondisi infrastruktur dan advokasi ke dinas terkait.' : 'Siapkan klarifikasi resmi dan koordinasi dengan dinas terkait.'} Laporkan temuan ke DPD/DPN dalam 2x24 jam.`
      } else if (c.priority === 'MEDIUM') {
        aiAction = 'COORDINATE'
        aiRec = `Prioritas SEDANG: ${c.regencyName}. Tim DPC ${c.regencyName} disarankan koordinasi dengan dinas terkait dalam 3x24 jam. Laporkan progres ke DPD.`
      } else {
        aiRec = `Prioritas RENDAH: ${c.regencyName}. Monitor perkembangan dan dokumentasikan untuk laporan bulanan.`
      }

      needsResponse++
      ignoredCount++ // All are IGNORED (no response from pengurus yet)

      await db.auditComplaint.create({
        data: {
          scanId: scan.id,
          platform: c.platform,
          author: c.author,
          authorHandle: c.author,
          content: c.content,
          url: `https://${c.platform.toLowerCase()}.com/post/${Math.random().toString(36).substring(2, 10)}`,
          publishedAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
          provinceCode: c.provinceCode,
          provinceName: c.provinceName,
          regencyCode: c.regencyCode,
          regencyName: c.regencyName,
          priority: c.priority,
          urgencyScore: c.urgencyScore,
          category: c.category,
          sentiment: 'NEGATIVE',
          keywords: JSON.stringify(c.content.toLowerCase().match(/\b(pupuk|jalan|listrik|mbg|beasiswa|umkm|irigasi|posyandu|lapangan kerja|nelayan)\b/g) || []),
          responseStatus: 'IGNORED',
          aiRecommendation: aiRec,
          aiActionType: aiAction,
          engagementCount: c.engagementCount,
        },
      })
    }

    // Update scan stats
    const updated = await db.auditScan.update({
      where: { id: scan.id },
      data: {
        totalMentions: filteredComplaints.length + Math.floor(Math.random() * 50),
        totalComplaints: filteredComplaints.length,
        needsResponse,
        ignoredCount,
      },
      include: { _count: { select: { complaints: true } } },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Audit selesai: ${filteredComplaints.length} keluhan terdeteksi. ${needsResponse} wajib direspon. ${ignoredCount} TERABAIKAN (belum direspon pengurus).`,
    })
  } catch (e: any) {
    console.error('[Audit AI Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
