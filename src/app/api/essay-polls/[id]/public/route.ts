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
// FASE 3.3.2: Include pollType + options dari SystemSetting config
//   - GET /api/essay-polls/[id]/config (inline, no extra HTTP call)
//   - Default: pollType=ESSAY (backward compat)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function configKey(pollId: string) {
  return `poll_config_${pollId}`
}

// Load config dari SystemSetting
async function loadPollConfig(pollId: string): Promise<any> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: configKey(pollId) },
      select: { value: true },
    })
    if (!setting) return null
    return JSON.parse(setting.value)
  } catch {
    return null
  }
}

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

    // === FASE 3.3.2: Load poll config (pollType + options) ===
    const config = await loadPollConfig(id)
    const pollType = config?.pollType || 'ESSAY'
    const options = config?.options || null
    const likertScale = config?.likertScale || null
    const likertLabels = config?.likertLabels || null

    // Strip _count, replace dengan totalResponses
    const { _count, ...pollData } = poll

    return NextResponse.json({
      success: true,
      data: {
        ...pollData,
        provinceName,
        regencyName,
        totalResponses: _count.responses,
        // === FASE 3.3.2: poll type config ===
        pollType,
        options,
        likertScale,
        likertLabels,
      },
    })
  } catch (e: any) {
    console.error('[PublicPoll GET] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
