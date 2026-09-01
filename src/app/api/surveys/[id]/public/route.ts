// LAPRA 08 - API: Public Survey Read (no auth needed)
// GET /api/surveys/[id]/public — Public read untuk halaman /survey/[id]
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const survey = await db.essayPoll.findUnique({
      where: { id },
      select: {
        id: true, title: true, question: true, description: true,
        status: true, targetScope: true, closesAt: true, createdAt: true,
        _count: { select: { responses: true } },
      },
    })

    if (!survey) return NextResponse.json({ success: false, error: 'Survei tidak ditemukan' }, { status: 404 })

    if (survey.status !== 'ACTIVE') {
      return NextResponse.json({ success: true, data: { id: survey.id, title: survey.title, status: survey.status, question: null, description: null } })
    }

    // Load poll config
    const config = await db.systemSetting.findUnique({ where: { key: `poll_config_${id}` }, select: { value: true } })
    const pollConfig = config ? JSON.parse(config.value) : { pollType: 'ESSAY' }

    // Lookup wilayah
    let provinceName: string | null = null
    let regencyName: string | null = null
    if (survey.targetScope === 'PROVINCE') {
      const p = await db.territory.findFirst({ where: { level: 'PROVINCE' }, select: { name: true } })
      provinceName = p?.name || null
    }

    return NextResponse.json({
      success: true,
      data: {
        ...survey,
        pollType: pollConfig.pollType || 'ESSAY',
        options: pollConfig.options || null,
        totalResponses: survey._count.responses,
        provinceName,
        regencyName,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
