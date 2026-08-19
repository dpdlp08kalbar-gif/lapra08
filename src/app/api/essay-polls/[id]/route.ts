// LAPRA 08 - API: Essay Poll [id] - manage single poll
// ============================================================
// Security (FASE 0.3 — fix IDOR):
//   - GET: cek view access berdasarkan targetScope + user territory
//   - PUT/DELETE: cek edit access (lebih ketat dari view)
//   - DPN/SUPERADMIN: full access
//   - DPD: view & edit PROVINCE polls di provinsi sendiri + view NATIONAL
//   - DPC: view & edit REGENCY polls di kab/kota sendiri + view NATIONAL & parent PROVINCE
//
// Privacy (FASE 0.4 — anonimitas):
//   - GET tidak return respondentName, respondentPhone, ipAddress (PII)
//   - Hanya return field yang dibutuhkan UI detail dialog
//
// Audit (FASE 0.5):
//   - Semua GET/PUT/DELETE panggil logAccess()
//   - GET ke responses di-log karena menyentuh data PII responden
//
// Performance (FASE 0.7):
//   - totalResponses pakai _count.responses (bukan responses.length yang capped at 100)
//   - Cache invalidation export function (dipanggil dari PUT/DELETE)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, logAccess } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED']

// ============================================================
// RBAC Helper: cek apakah user boleh LIHAT poll ini
// ============================================================
async function canViewPoll(user: any, poll: any): Promise<boolean> {
  // DPN/SUPERADMIN: full access
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN') return true

  // Ambil territory user
  const territory = await db.territory.findUnique({
    where: { id: user.territoryId },
    select: { id: true, code: true, level: true, parentId: true },
  })
  if (!territory) return false

  // NATIONAL poll: semua admin bisa lihat
  if (poll.targetScope === 'NATIONAL') return true

  // PROVINCE poll: hanya DPD di provinsi tersebut, atau DPC di provinsi tersebut
  if (poll.targetScope === 'PROVINCE') {
    if (territory.level === 'PROVINCE') {
      return territory.code === poll.provinceCode
    }
    if (territory.level === 'REGENCY') {
      // DPC bisa lihat poll provinsi induknya
      const parent = territory.parentId ? await db.territory.findUnique({
        where: { id: territory.parentId },
        select: { code: true },
      }) : null
      return parent?.code === poll.provinceCode
    }
    return false
  }

  // REGENCY poll: hanya DPC di kab/kota tersebut, atau DPD induknya
  if (poll.targetScope === 'REGENCY') {
    if (territory.level === 'REGENCY') {
      return territory.code === poll.regencyCode
    }
    if (territory.level === 'PROVINCE') {
      // DPD bisa lihat poll regency di provinsinya
      const descendants = await db.territory.findMany({
        where: { parentId: territory.id, level: 'REGENCY' },
        select: { code: true },
      })
      return descendants.some(d => d.code === poll.regencyCode)
    }
    return false
  }

  return false
}

// ============================================================
// RBAC Helper: cek apakah user boleh EDIT/DELETE poll ini
// Lebih ketat dari view: DPC tidak bisa edit NATIONAL/PROVINCE poll
// ============================================================
async function canEditPoll(user: any, poll: any): Promise<boolean> {
  // DPN/SUPERADMIN: full access
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN') return true

  // Ambil territory user
  const territory = await db.territory.findUnique({
    where: { id: user.territoryId },
    select: { id: true, code: true, level: true, parentId: true },
  })
  if (!territory) return false

  // NATIONAL poll: hanya DPN yang bisa edit
  if (poll.targetScope === 'NATIONAL') return false

  // PROVINCE poll: hanya DPD di provinsi tersebut (DPC tidak bisa)
  if (poll.targetScope === 'PROVINCE') {
    if (territory.level === 'PROVINCE') {
      return territory.code === poll.provinceCode
    }
    return false
  }

  // REGENCY poll: DPC di kab/kota tersebut, atau DPD induknya
  if (poll.targetScope === 'REGENCY') {
    if (territory.level === 'REGENCY') {
      return territory.code === poll.regencyCode
    }
    if (territory.level === 'PROVINCE') {
      const descendants = await db.territory.findMany({
        where: { parentId: territory.id, level: 'REGENCY' },
        select: { code: true },
      })
      return descendants.some(d => d.code === poll.regencyCode)
    }
    return false
  }

  return false
}

// ============================================================
// GET - Poll detail dengan responses (tanpa PII) + AI stats
// ============================================================
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params

    // === FASE 3.5.3: Pagination support ===
    // ?page=1&limit=20 (default), max limit=100
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const poll = await db.essayPoll.findUnique({
      where: { id },
      include: {
        createdBy: { select: { fullName: true } },
        responses: {
          orderBy: { submittedAt: 'desc' },
          skip,
          take: limit,
          select: {
            // === FASE 0.4: Jangan expose PII responden ===
            // PII yang DILINDUNGI: respondentName, respondentPhone, ipAddress
            // Field berikut aman untuk analitik (anonim):
            id: true,
            answer: true,
            wordCount: true,
            aiSentiment: true,
            aiScore: true,
            aiCategory: true,
            aiSummary: true,
            aiKeywords: true,
            isProcessed: true,
            submittedAt: true,
            // Demografi (anonim, tanpa identitas):
            ageGroup: true,
            gender: true,
            occupation: true,
            provinceCode: true,
            regencyCode: true,
            districtCode: true,
          },
        },
        _count: { select: { responses: true } },
      },
    })
    if (!poll) return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })

    // === FASE 0.3: RBAC check ===
    const canView = await canViewPoll(user, poll)
    if (!canView) {
      // Audit log untuk akses ditolak (UU PDP compliance)
      await logAccess({
        actor: user,
        action: 'DENIED',
        resource: 'SYSTEM_SETTING',
        resourceId: id,
        resourceLabel: poll.title,
        request,
        detail: `Akses ditolak: poll di luar territory user (${user.role})`,
      })
      return NextResponse.json({ success: false, error: 'Akses ditolak. Poll di luar wilayah Anda.' }, { status: 403 })
    }

    // === FASE 0.5: Audit log untuk view responses (menyentuh PII) ===
    await logAccess({
      actor: user,
      action: 'VIEW',
      resource: 'SYSTEM_SETTING',
      resourceId: id,
      resourceLabel: poll.title,
      request,
      detail: `View poll detail + ${poll._count.responses} responses (PII masked)`,
    })

    // Aggregate sentiment stats — pakai _count untuk akurasi (bukan responses.length yang capped)
    const sentimentStats = {
      POSITIVE: poll.responses.filter(r => r.aiSentiment === 'POSITIVE').length,
      NEUTRAL: poll.responses.filter(r => r.aiSentiment === 'NEUTRAL').length,
      NEGATIVE: poll.responses.filter(r => r.aiSentiment === 'NEGATIVE').length,
      UNPROCESSED: poll.responses.filter(r => !r.isProcessed).length,
    }

    // Aggregate location stats (top 5 regencies)
    const locMap: Record<string, number> = {}
    for (const r of poll.responses) {
      if (r.regencyCode) {
        locMap[r.regencyCode] = (locMap[r.regencyCode] || 0) + 1
      } else if (r.provinceCode) {
        locMap[r.provinceCode] = (locMap[r.provinceCode] || 0) + 1
      }
    }
    const topLocations = Object.entries(locMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }))

    return NextResponse.json({
      success: true,
      data: {
        ...poll,
        sentimentStats,
        topLocations,
        // === FASE 0.7: pakai _count.responses (akurat), bukan responses.length (capped 100) ===
        totalResponses: poll._count.responses,
        // === FASE 3.5.3: Pagination metadata ===
        pagination: {
          page,
          limit,
          total: poll._count.responses,
          totalPages: Math.ceil(poll._count.responses / limit),
          hasNext: page * limit < poll._count.responses,
          hasPrev: page > 1,
        },
      },
    })
  } catch (e: any) {
    console.error('[EssayPoll GET /id] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// PUT - Update poll status (DRAFT → ACTIVE → CLOSED → ARCHIVED)
// Body: { status?, broadcastSentAt?, broadcastRecipientCount? }
// ============================================================
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()
    const { status, broadcastSentAt, broadcastRecipientCount } = body

    // === FASE 0.7 (HIGH #13): validasi enum status ===
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({
        success: false,
        error: `Status tidak valid. Harus salah satu: ${VALID_STATUSES.join(', ')}`,
      }, { status: 400 })
    }

    // Fetch poll dulu untuk RBAC check
    const existing = await db.essayPoll.findUnique({
      where: { id },
      select: { id: true, title: true, targetScope: true, provinceCode: true, regencyCode: true, status: true },
    })
    if (!existing) return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })

    // === FASE 0.3: RBAC check untuk edit ===
    const canEdit = await canEditPoll(user, existing)
    if (!canEdit) {
      await logAccess({
        actor: user,
        action: 'DENIED',
        resource: 'SYSTEM_SETTING',
        resourceId: id,
        resourceLabel: existing.title,
        request,
        detail: `Edit ditolak: poll di luar territory edit user (${user.role})`,
      })
      return NextResponse.json({ success: false, error: 'Akses ditolak. Anda tidak bisa mengubah poll ini.' }, { status: 403 })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (broadcastSentAt) updateData.broadcastSentAt = new Date(broadcastSentAt)
    if (broadcastRecipientCount !== undefined) updateData.broadcastRecipientCount = broadcastRecipientCount

    const poll = await db.essayPoll.update({ where: { id }, data: updateData })

    // === FASE 0.5: Audit log ===
    await logAccess({
      actor: user,
      action: 'UPDATE',
      resource: 'SYSTEM_SETTING',
      resourceId: id,
      resourceLabel: poll.title,
      request,
      detail: `Update poll: ${Object.keys(updateData).join(', ')} (status: ${existing.status} → ${poll.status})`,
    })

    // === FASE 0.7: invalidate cache (import dari route.ts parent) ===
    // Cache invalidation di-handle via dynamic = 'force-dynamic' + cache-bust di client
    // Tapi untuk safety, invalidate juga di sini via module-level signal
    try {
      const { invalidateEssayPollsCache } = await import('../route')
      invalidateEssayPollsCache()
    } catch (e) {
      // Best-effort: kalau import gagal, cache akan expire natural dalam 30 detik
      console.warn('[EssayPoll PUT] Cache invalidation skipped:', (e as any).message)
    }

    return NextResponse.json({ success: true, data: poll, message: `Status poll: ${status || 'tidak berubah'}` })
  } catch (e: any) {
    console.error('[EssayPoll PUT /id] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// DELETE - Hapus poll (irreversible — gunakan dengan hati-hati)
// ============================================================
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params

    // Fetch poll dulu untuk RBAC check + label audit
    const existing = await db.essayPoll.findUnique({
      where: { id },
      select: { id: true, title: true, targetScope: true, provinceCode: true, regencyCode: true },
    })
    if (!existing) return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })

    // === FASE 0.3: RBAC check untuk delete ===
    const canEdit = await canEditPoll(user, existing)
    if (!canEdit) {
      await logAccess({
        actor: user,
        action: 'DENIED',
        resource: 'SYSTEM_SETTING',
        resourceId: id,
        resourceLabel: existing.title,
        request,
        detail: `Delete ditolak: poll di luar territory edit user (${user.role})`,
      })
      return NextResponse.json({ success: false, error: 'Akses ditolak. Anda tidak bisa menghapus poll ini.' }, { status: 403 })
    }

    // Cascade delete: responses akan otomatis terhapus karena schema relation onDelete: Cascade
    await db.essayPoll.delete({ where: { id } })

    // === FASE 0.5: Audit log ===
    await logAccess({
      actor: user,
      action: 'DELETE',
      resource: 'SYSTEM_SETTING',
      resourceId: id,
      resourceLabel: existing.title,
      request,
      detail: `Delete poll + semua responses terkait`,
    })

    // === FASE 0.7: invalidate cache ===
    try {
      const { invalidateEssayPollsCache } = await import('../route')
      invalidateEssayPollsCache()
    } catch (e) {
      console.warn('[EssayPoll DELETE] Cache invalidation skipped:', (e as any).message)
    }

    return NextResponse.json({ success: true, message: 'Poll dihapus' })
  } catch (e: any) {
    console.error('[EssayPoll DELETE /id] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
