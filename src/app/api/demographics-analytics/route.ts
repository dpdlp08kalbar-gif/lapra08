// LAPRA 08 - API: Demographics Analytics
// GET /api/demographics-analytics?code=ID - Get demographic breakdown untuk wilayah
// Returns: age groups distribution + community segments + trust index per demographic
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

const AGE_GROUPS = [
  { key: '17-21', label: 'Pemilih Pemula (17-21)', desc: 'Segmen pemilih baru, didominasi pelajar/mahasiswa yang sangat aktif di media sosial dan menjadi motor utama viralitas isu.' },
  { key: '22-30', label: 'Pemilih Muda (22-30)', desc: 'Segmen produktif awal/lulusan baru, sangat kritis terhadap isu lapangan kerja, digitalisasi, dan kebijakan ekonomi kreatif.' },
  { key: '31-40', label: 'Pemilih Matang (31-40)', desc: 'Segmen keluarga muda yang sangat sensitif terhadap isu harga kebutuhan pokok, fasilitas kesehatan, pendidikan anak, dan kesejahteraan umum.' },
  { key: '41-60', label: 'Pemilih Paruh Baya (41-60)', desc: 'Segmen mapan yang berfokus pada stabilitas politik, keamanan, jaminan hari tua, serta kebijakan pembangunan infrastruktur jangka panjang.' },
  { key: '61+', label: 'Pemilih Lansia (61+)', desc: 'Segmen pemilih senior yang cenderung loyal dan sangat dipengaruhi oleh figur kepemimpinan serta stabilitas sosial-keagamaan di wilayahnya.' },
]

const COMMUNITY_SEGMENTS = [
  { key: 'INDIGENOUS', label: 'Suku Adat & Budaya', desc: 'Identifikasi sentimen berbasis kearifan lokal wilayah' },
  { key: 'RELIGIOUS', label: 'Komunitas Agama & Kepercayaan', desc: 'Pemetaan kerukunan dan aspirasi tokoh agama' },
  { key: 'PROFESSION', label: 'Kelompok Profesi & Sektoral', desc: 'Petani, Nelayan, Buruh, Guru, UMKM, Mahasiswa' },
  { key: 'YOUTH', label: 'Aliansi Ormas & Komunitas Pemuda', desc: 'Ormas kepemudaan dan komunitas pemuda setempat' },
]

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code') || 'ID'

  const popData = await db.populationData.findUnique({ where: { territoryCode: code } })
  if (!popData) {
    return NextResponse.json({ success: false, error: `Data populasi untuk ${code} tidak ditemukan` }, { status: 404 })
  }

  // Age groups breakdown with trust index
  const ageGroupsBreakdown = await Promise.all(AGE_GROUPS.map(async (ag) => {
    const trust = await db.trustIndex.findUnique({
      where: { territoryCode_ageGroup_communitySegment: { territoryCode: code, ageGroup: ag.key, communitySegment: '' } },
    }).catch(() => null)
    
    const voters = ag.key === '17-21' ? popData.voters17to21 :
                   ag.key === '22-30' ? popData.voters22to30 :
                   ag.key === '31-40' ? popData.voters31to40 :
                   ag.key === '41-60' ? popData.voters41to60 :
                   popData.voters61plus
    
    return {
      key: ag.key,
      label: ag.label,
      desc: ag.desc,
      voters,
      percentage: popData.totalVoters > 0 ? Math.round((voters / popData.totalVoters) * 1000) / 10 : 0,
      trustScore: trust?.trustScore || 0,
      totalMentions: trust?.totalMentions || 0,
      sentimentPositive: trust?.sentimentPositive || 0,
      sentimentNegative: trust?.sentimentNegative || 0,
      sentimentNeutral: trust?.sentimentNeutral || 0,
      confidence: trust?.confidence || 0,
      trendDirection: trust?.trendDirection || 'STABLE',
    }
  }))

  // Community segments breakdown with trust index
  const segmentsBreakdown = await Promise.all(COMMUNITY_SEGMENTS.map(async (seg) => {
    const trust = await db.trustIndex.findUnique({
      where: { territoryCode_ageGroup_communitySegment: { territoryCode: code, ageGroup: '', communitySegment: seg.key } },
    }).catch(() => null)
    
    const population = seg.key === 'INDIGENOUS' ? popData.populationIndigenous :
                       seg.key === 'RELIGIOUS' ? popData.populationReligious :
                       seg.key === 'PROFESSION' ? popData.populationProfession :
                       popData.populationYouth
    
    return {
      key: seg.key,
      label: seg.label,
      desc: seg.desc,
      population,
      percentage: popData.totalPopulation > 0 ? Math.round((population / popData.totalPopulation) * 1000) / 10 : 0,
      trustScore: trust?.trustScore || 0,
      totalMentions: trust?.totalMentions || 0,
      sentimentPositive: trust?.sentimentPositive || 0,
      sentimentNegative: trust?.sentimentNegative || 0,
      sentimentNeutral: trust?.sentimentNeutral || 0,
      confidence: trust?.confidence || 0,
      trendDirection: trust?.trendDirection || 'STABLE',
    }
  }))

  // Overall trust index untuk territory ini
  const overallTrust = await db.trustIndex.findUnique({
    where: { territoryCode_ageGroup_communitySegment: { territoryCode: code, ageGroup: '', communitySegment: '' } },
  }).catch(() => null)

  return NextResponse.json({
    success: true,
    data: {
      territory: { code, name: code === 'ID' ? 'Indonesia' : code, level: popData.level },
      overall: {
        trustScore: overallTrust?.trustScore || 0,
        totalMentions: overallTrust?.totalMentions || 0,
        sentimentPositive: overallTrust?.sentimentPositive || 0,
        sentimentNegative: overallTrust?.sentimentNegative || 0,
        sentimentNeutral: overallTrust?.sentimentNeutral || 0,
        confidence: overallTrust?.confidence || 0,
        trendDirection: overallTrust?.trendDirection || 'STABLE',
      },
      ageGroups: ageGroupsBreakdown,
      communitySegments: segmentsBreakdown,
      totals: {
        population: popData.totalPopulation,
        voters: popData.totalVoters,
      },
    },
  })
}
