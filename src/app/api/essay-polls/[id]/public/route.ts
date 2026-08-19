// LAPRA 08 - API: Public Essay Poll (no auth)
// ============================================================
// GET /api/essay-polls/[id]/public
//   Public read untuk halaman /poll/[id] (responden share link).
//   Tidak perlu x-user-id header.
//
// Privacy:
//   - Hanya return field yang aman untuk publik (tidak expose PII creator)
//   - Hanya return poll dengan status ACTIVE (DRAFT/CLOSED/ARCHIVED → 404)
//   - Tidak return responses array (hanya count)
//
// Rate limit:
//   - Tidak perlu rate limit di GET (Vercel cache + CDN handle)
//   - Rate limit di POST submit (di /responses endpoint)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const poll = await db.essayPoll.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        question: true,
        description: true,
        status: true,
        targetScope: true,
        provinceCode: true,
        regencyCode: true,
        targetAgeGroup: true,
        targetOccupation: true,
        closesAt: true,
        createdAt: true,
        // Ambil nama wilayah via join (jika ada)
        // NOTE: essayPoll tidak punya relation ke Territory untuk province/regency
        // Pakai raw query atau lookup manual jika perlu
        _count: { select: { responses: true } },
      },
    })

    if (!poll) {
      return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })
    }

    // Hanya expose ACTIVE poll ke publik
    if (poll.status !== 'ACTIVE') {
      // Return 200 dengan status info (supaya UI bisa tampilkan pesan sesuai)
      return NextResponse.json({
        success: true,
        data: {
          id: poll.id,
          title: poll.title,
          status: poll.status,
          // Field lain dikosongkan untuk poll non-active
          question: null,
          description: null,
        },
      })
    }

    // Lookup nama wilayah jika PROVINCE/REGENCY scope
    let provinceName: string | null = null
    let regencyName: string | null = null
    if (poll.targetScope === 'PROVINCE' && poll.provinceCode) {
      const prov = await db.territory.findFirst({
        where: { code: poll.provinceCode, level: 'PROVINCE' },
        select: { name: true },
      })
      provinceName = prov?.name || null
    } else if (poll.targetScope === 'REGENCY' && poll.regencyCode) {
      const reg = await db.territory.findFirst({
        where: { code: poll.regencyCode, level: 'REGENCY' },
        select: { name: true },
      })
      regencyName = reg?.name || null
    }

    return NextResponse.json({
      success: true,
      data: {
        ...poll,
        provinceName,
        regencyName,
        totalResponses: poll._count.responses,
        // Bersihkan _count dari response (tidak perlu expose internal structure)
        _count: undefined,
      },
    })
  } catch (e: any) {
    console.error('[PublicPoll GET] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
