// LAPRA 08 - API: Bulk Triage untuk 50 Link Antrean "Belum Direview"
// POST /api/opinion-links/bulk-triage
//
// FAN-OUT #1: Triage Agent — auto-process 50 link secara berurutan
// 1. Re-analyze location pakai Lexicon Matrix baru (kota + kodim + kejati)
// 2. Update provinceCode/provinceName/regencyCode/regencyName di DB
// 3. Invalidate Decision Dashboard cache
// 4. Return summary: berapa link berhasil di-map ke provinsi mana
//
// Anti 504: sequential process, max 50 link, instant (rule-based, no LLM)
// Anti 429: tidak panggil Gemini sama sekali (100% rule-based)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { detectLocationFromDB } from '@/lib/ai-engine'
import { OrchestratorAgent } from '@/lib/agent-orchestrator'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Hanya admin yang bisa bulk triage
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN' && user.role !== 'ADMIN_DPD') {
    return NextResponse.json({
      success: false,
      error: 'Akses ditolak. Hanya admin yang dapat bulk triage.'
    }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const limit = Math.min(body.limit || 50, 100) // max 100 per batch

    // Ambil semua link dengan status NEW atau tanpa provinceCode
    const links = await db.publicOpinionLink.findMany({
      where: {
        OR: [
          { status: 'NEW' },
          { provinceCode: null },
        ]
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, content: true, url: true, provinceCode: true },
    })

    if (links.length === 0) {
      return NextResponse.json({
        success: true,
        data: { processed: 0, message: 'Tidak ada link yang perlu di-triage' },
      })
    }

    // === BULK TRIAGE: Re-analyze location untuk setiap link ===
    const stats = {
      total: links.length,
      mapped: 0,        // berhasil di-map ke provinsi
      stillNull: 0,     // masih null (tidak ada keyword lokasi)
      byProvinsi: {} as Record<string, number>,  // count per provinsi
      byKota: {} as Record<string, number>,       // count per kota
    }

    for (const link of links) {
      // Re-analyze dengan Lexicon Matrix baru
      const text = `${link.title} ${link.content || ''}`
      const loc = await detectLocationFromDB(text)

      if (loc.provinceCode) {
        // Update DB dengan location yang baru terdeteksi
        await db.publicOpinionLink.update({
          where: { id: link.id },
          data: {
            provinceCode: loc.provinceCode,
            provinceName: loc.provinceName,
            regencyCode: loc.regencyCode,
            regencyName: loc.regencyName,
          },
        })
        stats.mapped++
        stats.byProvinsi[loc.provinceName || 'Unknown'] = (stats.byProvinsi[loc.provinceName || 'Unknown'] || 0) + 1
        if (loc.regencyName) {
          stats.byKota[loc.regencyName] = (stats.byKota[loc.regencyName] || 0) + 1
        }
      } else {
        stats.stillNull++
      }
    }

    // === FAN-OUT: Emit event + invalidate Decision Dashboard ===
    OrchestratorAgent.emitEvent({
      eventType: 'BULK_TRIAGE_COMPLETED',
      sourceAgent: 'TriageAPI',
      sourceMenu: 'opinion-links',
      targetMenu: 'decision-dashboard,geospatial-voice',
      payload: {
        total: stats.total,
        mapped: stats.mapped,
        stillNull: stats.stillNull,
        topProvinsi: Object.entries(stats.byProvinsi)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([prov, count]) => ({ provinsi: prov, count })),
      },
    }).catch(() => {})

    // Invalidate Decision Dashboard cache
    try {
      const { invalidateDecisionDashboardCache } = await import('@/app/api/decision-dashboard/route')
      invalidateDecisionDashboardCache()
    } catch (e) {
      // ignore
    }

    // Format summary untuk response
    const topProvinsi = Object.entries(stats.byProvinsi)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([prov, count]) => `${prov}: ${count}`)
      .join(', ')

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        topProvinsiList: Object.entries(stats.byProvinsi)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([provinsi, count]) => ({ provinsi, count })),
        topKotaList: Object.entries(stats.byKota)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([kota, count]) => ({ kota, count })),
      },
      message: `Triage selesai: ${stats.mapped}/${stats.total} link berhasil di-map ke provinsi. Top: ${topProvinsi || 'tidak ada'}. Dashboard & Geospatial otomatis refresh.`,
    })
  } catch (e: any) {
    console.error('[Bulk Triage Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
