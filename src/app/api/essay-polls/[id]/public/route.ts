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
        _count: { select: { responses: true } },
      },
    })

    if (!poll) {
      return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })
    }

    // Hanya expose ACTIVE poll ke publik
    if (poll.status !== 'ACTIVE') {
      return NextResponse.json({
        success: true,
        data: {
          id: poll.id,
          title: poll.title,
          status: poll.status,
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

    // Strip _count, replace dengan totalResponses
    const { _count, ...pollData } = poll

    return NextResponse.json({
      success: true,
      data: {
        ...pollData,
        provinceName,
        regencyName,
        totalResponses: _count.responses,
      },
    })
  } catch (e: any) {
    console.error('[PublicPoll GET] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
