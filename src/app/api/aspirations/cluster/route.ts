// LAPRA 08 - API: Aspiration Cluster Analytics
// GET /api/aspirations/cluster - Aggregate analytics for speech recommendations
//   - byCategory (count + percentage)
//   - byOccupation
//   - byProvince
//   - topClusters (top aiCluster values)
//   - topOccupations
//   - insights (speech recommendations based on top clusters/categories)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPNLevel } from '@/lib/server-helpers'

// Speech recommendations per category
const CATEGORY_SPEECH_RECOMMENDATIONS: Record<string, string> = {
  PERTANIAN: 'Tekankan program subsidi pupuk, perbaikan irigasi, dan ketersediaan benih unggul.',
  EKONOMI: 'Soroti pengendalian harga kebutuhan pokok, penguatan UMKM, dan akses modal usaha.',
  PENDIDIKAN: 'Tunjukkan komitmen perbaikan sekolah, kesejahteraan guru, dan beasiswa.',
  KESEHATAN: 'Janjikan peningkatan rumah sakit, puskesmas, BPJS, dan ketersediaan obat.',
  INFRASTRUKTUR: 'Tegaskan perbaikan jalan, penyediaan listrik, dan air bersih.',
  LAINNYA: 'Pertimbangkan aspirasi spesifik yang masuk untuk pidato tematik.',
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Build where clause (admin scope filter)
    const where: any = {}
    if (!isDPNLevel(user.role)) {
      const userCode = user.territory?.code
      if (user.role === 'ADMIN_DPD' && user.territory?.level === 'PROVINCE') {
        where.provinceCode = userCode
      } else if (user.role === 'ADMIN_DPC' && user.territory?.level === 'REGENCY') {
        where.regencyCode = userCode
      } else if (userCode) {
        where.OR = [{ provinceCode: userCode }, { regencyCode: userCode }]
      }
    }

    // Pull aggregated data via findMany (Prisma SQLite doesn't support groupBy well for all cases)
    const aspirations = await db.aspiration.findMany({
      where,
      select: {
        category: true,
        occupation: true,
        provinceCode: true,
        aiCluster: true,
        sentiment: true,
        priority: true,
        status: true,
      },
    })

    const total = aspirations.length

    // byCategory
    const byCategoryMap: Record<string, number> = {}
    const byOccupationMap: Record<string, number> = {}
    const byProvinceMap: Record<string, number> = {}
    const clusterMap: Record<string, number> = {}

    for (const a of aspirations) {
      const cat = a.category || 'LAINNYA'
      byCategoryMap[cat] = (byCategoryMap[cat] || 0) + 1

      const occ = a.occupation || 'TIDAK_DIKETAHUI'
      byOccupationMap[occ] = (byOccupationMap[occ] || 0) + 1

      const prov = a.provinceCode || 'TIDAK_DIKETAHUI'
      byProvinceMap[prov] = (byProvinceMap[prov] || 0) + 1

      if (a.aiCluster) {
        clusterMap[a.aiCluster] = (clusterMap[a.aiCluster] || 0) + 1
      }
    }

    const pct = (count: number) => (total > 0 ? Math.round((count / total) * 1000) / 10 : 0)

    const byCategory = Object.entries(byCategoryMap)
      .map(([category, count]) => ({ category, count, percentage: pct(count) }))
      .sort((a, b) => b.count - a.count)

    const byOccupation = Object.entries(byOccupationMap)
      .map(([occupation, count]) => ({ occupation, count, percentage: pct(count) }))
      .sort((a, b) => b.count - a.count)

    const byProvince = Object.entries(byProvinceMap)
      .map(([provinceCode, count]) => ({ provinceCode, count, percentage: pct(count) }))
      .sort((a, b) => b.count - a.count)

    const topClusters = Object.entries(clusterMap)
      .map(([cluster, count]) => ({ aiCluster: cluster, count, percentage: pct(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const topOccupations = [...byOccupation].slice(0, 5)

    // ===== Insights: speech recommendations =====
    const insights: Array<{
      type: string
      title: string
      description: string
      recommendation: string
      supportingData?: any
    }> = []

    // Insight 1: Top category speech theme
    if (byCategory.length > 0) {
      const top = byCategory[0]
      insights.push({
        type: 'TOP_CATEGORY_THEME',
        title: `Tema Utama: ${top.category}`,
        description: `${top.count} aspirasi (${top.percentage}%) berkategori ${top.category}. Ini adalah isu yang paling banyak disorot oleh rakyat.`,
        recommendation: CATEGORY_SPEECH_RECOMMENDATIONS[top.category] || '',
        supportingData: { category: top.category, count: top.count, percentage: top.percentage },
      })
    }

    // Insight 2: Top 3 categories combined recommendation
    if (byCategory.length >= 1) {
      const top3 = byCategory.slice(0, 3)
      const combinedRec = top3
        .map((c) => CATEGORY_SPEECH_RECOMMENDATIONS[c.category] || '')
        .filter(Boolean)
        .join(' ')
      insights.push({
        type: 'COMBINED_TOP_3',
        title: 'Rekomendasi Pidato Kombinasi',
        description: `Gabungkan 3 tema isu teratas (${top3.map((c) => c.category).join(', ')}) untuk pidato yang menyentuh kebutuhan terbanyak rakyat.`,
        recommendation: combinedRec,
        supportingData: top3,
      })
    }

    // Insight 3: Top occupation focus
    if (topOccupations.length > 0) {
      const topOcc = topOccupations[0]
      insights.push({
        type: 'OCCUPATION_FOCUS',
        title: `Fokus Demografi: ${topOcc.occupation}`,
        description: `${topOcc.count} aspirasi (${topOcc.percentage}%) berasal dari kelompok pekerjaan ${topOcc.occupation}. Pertimbangkan pidato yang relevan untuk segmen ini.`,
        recommendation: `Sertakan narasi dan program spesifik yang relevan untuk ${topOcc.occupation}.`,
        supportingData: topOcc,
      })
    }

    // Insight 4: Top cluster deep dive
    if (topClusters.length > 0) {
      const topCluster = topClusters[0]
      insights.push({
        type: 'HOTSPOT_CLUSTER',
        title: `Hotspot Klaster: ${topCluster.aiCluster}`,
        description: `Klaster aspirasi "${topCluster.aiCluster}" muncul paling banyak (${topCluster.count} aspirasi, ${topCluster.percentage}%).`,
        recommendation:
          'Lakukan klarifikasi atau program khusus untuk klaster ini sebagai respons cepat atas konsentrasi aspirasi.',
        supportingData: topCluster,
      })
    }

    // Insight 5: Top province attention
    if (byProvince.length > 0) {
      const topProv = byProvince[0]
      insights.push({
        type: 'PROVINCE_ATTENTION',
        title: `Provinsi Perhatian: ${topProv.provinceCode}`,
        description: `${topProv.count} aspirasi (${topProv.percentage}%) berasal dari provinsi ${topProv.provinceCode}. Pertimbangkan kunjungan atau program khusus.`,
        recommendation: `Susun agenda kampanye/visiting di provinsi ${topProv.provinceCode} untuk merespons aspirasi yang masuk.`,
        supportingData: topProv,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        total,
        byCategory,
        byOccupation,
        byProvince,
        topClusters,
        topOccupations,
        insights,
      },
    })
  } catch (e: any) {
    console.error('[Aspiration Cluster Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
