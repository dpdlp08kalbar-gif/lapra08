// LAPRA 08 - API: Surveys CRUD
// ============================================================
// Vercel Free Tier Compatible:
// - Stateless API (no long-running process)
// - Prisma PostgreSQL (Supabase)
// - RBAC 4-tier: DPN/DPD/DPC/Surveyor
// - PII Protection: no respondentName/Phone stored
// - UU PDP: audit log via logAccess
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPNLevel, logAccess } from '@/lib/server-helpers'
import { analyzeSentiment, calculatePriority, extractKeywords } from '@/lib/ai-engine'
import { createHash } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Helper: Hash IP (SHA-256 + daily salt)
function hashIp(ip: string): string {
  const salt = new Date().toISOString().slice(0, 10)
  return 'HASH:' + createHash('sha256').update(`${ip}:${salt}`).digest('hex').substring(0, 32)
}

// Helper: Rate limit (in-memory, 5/jam per IP)
const _rateLimit = new Map<string, { count: number; ts: number }>()
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const r = _rateLimit.get(ip)
  if (r && now - r.ts < 3600000) {
    if (r.count >= 5) return false
    r.count++
  } else {
    _rateLimit.set(ip, { count: 1, ts: now })
  }
  return true
}

// ============================================================
// GET /api/surveys — List surveys (RBAC filtered)
// ============================================================
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const territory = await db.territory.findUnique({ where: { id: user.territoryId }, select: { code: true, level: true } })
    const where: any = { status: { not: 'ARCHIVED' } }

    // RBAC filter
    if (!isDPNLevel(user.role)) {
      if (territory?.level === 'PROVINCE') {
        where.OR = [{ targetScope: 'NATIONAL' }, { targetScope: 'PROVINCE', provinceCode: territory.code }]
      } else if (territory?.level === 'REGENCY') {
        where.OR = [{ targetScope: 'NATIONAL' }, { targetScope: 'REGENCY', regencyCode: territory.code }]
      }
    }

    const surveys = await db.essayPoll.findMany({
      where,
      include: {
        createdBy: { select: { fullName: true } },
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ success: true, data: surveys })
  } catch (e: any) {
    console.error('[Surveys GET] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// POST /api/surveys — Create new survey
// Body: { title, question, description?, targetScope, pollType?, options? }
// ============================================================
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { title, question, description, targetScope } = body

    if (!title?.trim() || !question?.trim()) {
      return NextResponse.json({ success: false, error: 'Judul dan pertanyaan wajib diisi' }, { status: 400 })
    }

    // Determine territoryId
    let territoryId = user.territoryId
    const userTerritory = await db.territory.findUnique({ where: { id: user.territoryId }, select: { code: true, level: true } })
    if (targetScope === 'NATIONAL' || !targetScope) {
      const pusat = await db.territory.findFirst({ where: { level: 'COUNTRY', code: 'ID' }, select: { id: true } })
      if (pusat) territoryId = pusat.id
    }

    const provinceCode = targetScope === 'PROVINCE' && userTerritory ? userTerritory.code : null
    const regencyCode = targetScope === 'REGENCY' && userTerritory ? userTerritory.code : null

    const survey = await db.essayPoll.create({
      data: {
        title: title.trim().substring(0, 200),
        question: question.trim().substring(0, 2000),
        description: description?.trim()?.substring(0, 500) || null,
        targetScope: targetScope || 'NATIONAL',
        provinceCode,
        regencyCode,
        status: 'DRAFT',
        territoryId,
        createdById: user.id,
      },
      select: { id: true, title: true },
    })

    // Save pollType + options to SystemSetting (no DB migration needed)
    if (body.pollType === 'MULTIPLE_CHOICE' && Array.isArray(body.options)) {
      const cleanOptions = body.options.map((o: string) => o.trim()).filter((o: string) => o.length > 0)
      if (cleanOptions.length >= 2) {
        await db.systemSetting.upsert({
          where: { key: `poll_config_${survey.id}` },
          update: { value: JSON.stringify({ pollType: 'MULTIPLE_CHOICE', options: cleanOptions }) },
          create: { key: `poll_config_${survey.id}`, value: JSON.stringify({ pollType: 'MULTIPLE_CHOICE', options: cleanOptions }), category: 'POLL_CONFIG' },
        })
      }
    } else {
      await db.systemSetting.upsert({
        where: { key: `poll_config_${survey.id}` },
        update: { value: JSON.stringify({ pollType: 'ESSAY' }) },
        create: { key: `poll_config_${survey.id}`, value: JSON.stringify({ pollType: 'ESSAY' }), category: 'POLL_CONFIG' },
      })
    }

    await logAccess({ actor: user, action: 'CREATE', resource: 'SYSTEM_SETTING', resourceId: survey.id, resourceLabel: survey.title, request, detail: 'Create survey' })

    return NextResponse.json({ success: true, data: survey, message: `Survei "${survey.title}" dibuat (DRAFT)` })
  } catch (e: any) {
    console.error('[Surveys POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
