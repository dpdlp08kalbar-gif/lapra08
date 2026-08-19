// LAPRA 08 - API: Essay Poll Config (pollType + options)
// ============================================================
// GET  /api/essay-polls/[id]/config — ambil konfigurasi pollType & options
// PUT  /api/essay-polls/[id]/config — update konfigurasi
//
// Constraint: No DB migration (Vercel Free + SystemSetting pattern)
// Storage: SystemSetting key='poll_config_[pollId]' (JSON)
//
// Schema (per config):
//   {
//     pollId: string,
//     pollType: 'ESSAY' | 'MULTIPLE_CHOICE' | 'LIKERT',
//     options?: string[],      // untuk MULTIPLE_CHOICE: list pilihan (mis. ["Setuju", "Tidak Setuju"])
//     likertScale?: number,    // untuk LIKERT: jumlah skala (default 5)
//     likertLabels?: string[], // untuk LIKERT: label per skala (default: Sangat Tidak Setuju..Sangat Setuju)
//     updatedAt: string (ISO),
//     updatedBy: string (userId),
//   }
//
// RBAC: sama dengan edit poll (DPN full, DPD per provinsi, DPC per kab/kota)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, logAccess } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_POLL_TYPES = ['ESSAY', 'MULTIPLE_CHOICE', 'LIKERT']
const DEFAULT_LIKERT_LABELS = [
  'Sangat Tidak Setuju',
  'Tidak Setuju',
  'Netral',
  'Setuju',
  'Sangat Setuju',
]

function configKey(pollId: string) {
  return `poll_config_${pollId}`
}

// === Helper: load config dari SystemSetting ===
async function loadConfig(pollId: string): Promise<any | null> {
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

// === Helper: save config ke SystemSetting ===
async function saveConfig(pollId: string, config: any): Promise<void> {
  const value = JSON.stringify(config)
  await db.systemSetting.upsert({
    where: { key: configKey(pollId) },
    update: { value, category: 'POLL_CONFIG' },
    create: {
      key: configKey(pollId),
      value,
      category: 'POLL_CONFIG',
      description: `Poll type config for ${pollId}`,
    },
  })
}

// === RBAC: cek apakah user bisa edit poll ini ===
// Reuse logic dari /api/essay-polls/[id]/route.ts (canEditPoll)
// Untuk simplicitas, di-skip di sini — PUT handler cek via parent poll ownership
async function canEditPoll(user: any, pollId: string): Promise<boolean> {
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN') return true

  const poll = await db.essayPoll.findUnique({
    where: { id: pollId },
    select: { targetScope: true, provinceCode: true, regencyCode: true },
  })
  if (!poll) return false

  const territory = await db.territory.findUnique({
    where: { id: user.territoryId },
    select: { id: true, code: true, level: true, parentId: true },
  })
  if (!territory) return false

  if (poll.targetScope === 'NATIONAL') return false
  if (poll.targetScope === 'PROVINCE') {
    return territory.level === 'PROVINCE' && territory.code === poll.provinceCode
  }
  if (poll.targetScope === 'REGENCY') {
    if (territory.level === 'REGENCY') return territory.code === poll.regencyCode
    if (territory.level === 'PROVINCE') {
      const descendants = await db.territory.findMany({
        where: { parentId: territory.id, level: 'REGENCY' },
        select: { code: true },
      })
      return descendants.some(d => d.code === poll.regencyCode)
    }
  }
  return false
}

// ============================================================
// GET /api/essay-polls/[id]/config — ambil config
// Public read (no auth needed) — surveyor & responden perlu akses
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Cek poll exists
    const poll = await db.essayPoll.findUnique({
      where: { id },
      select: { status: true },
    })
    if (!poll) {
      return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })
    }

    const config = await loadConfig(id)
    // Default config jika belum ada: ESSAY (backward compat)
    const responseData = config || {
      pollId: id,
      pollType: 'ESSAY',
      options: null,
      likertScale: null,
      likertLabels: null,
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (e: any) {
    console.error('[PollConfig GET] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// PUT /api/essay-polls/[id]/config — update config
// Body: {
//   pollType: 'ESSAY' | 'MULTIPLE_CHOICE' | 'LIKERT',
//   options?: string[],       // wajib untuk MULTIPLE_CHOICE (min 2, max 10)
//   likertScale?: number,    // opsional untuk LIKERT (default 5, max 7)
//   likertLabels?: string[], // opsional untuk LIKERT
// }
// ============================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params

    // Cek poll exists
    const poll = await db.essayPoll.findUnique({
      where: { id },
      select: { status: true, title: true },
    })
    if (!poll) {
      return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })
    }

    // RBAC: hanya creator atau DPN yang bisa edit config
    const canEdit = await canEditPoll(user, id)
    if (!canEdit) {
      await logAccess({
        actor: user,
        action: 'DENIED',
        resource: 'SYSTEM_SETTING',
        resourceId: id,
        resourceLabel: poll.title,
        request,
        detail: `Edit poll config ditolak (${user.role})`,
      })
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const { pollType, options, likertScale, likertLabels } = body

    // === Validasi pollType ===
    if (!pollType || !VALID_POLL_TYPES.includes(pollType)) {
      return NextResponse.json({
        success: false,
        error: `pollType tidak valid. Harus salah satu: ${VALID_POLL_TYPES.join(', ')}`,
      }, { status: 400 })
    }

    // === Validasi options untuk MULTIPLE_CHOICE ===
    let finalOptions: string[] | null = null
    if (pollType === 'MULTIPLE_CHOICE') {
      if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
        return NextResponse.json({
          success: false,
          error: 'MULTIPLE_CHOICE butuh array options (min 2, max 10)',
        }, { status: 400 })
      }
      // Sanitize: trim, no empty, no duplicate
      finalOptions = options
        .map((o: any) => String(o).trim())
        .filter((o: string) => o.length > 0)
      if (finalOptions.length < 2) {
        return NextResponse.json({ success: false, error: 'Options tidak boleh kosong' }, { status: 400 })
      }
      const unique = new Set(finalOptions.map(o => o.toLowerCase()))
      if (unique.size !== finalOptions.length) {
        return NextResponse.json({ success: false, error: 'Options tidak boleh duplikat' }, { status: 400 })
      }
    }

    // === Validasi likertScale untuk LIKERT ===
    let finalLikertScale: number | null = null
    let finalLikertLabels: string[] | null = null
    if (pollType === 'LIKERT') {
      finalLikertScale = typeof likertScale === 'number' ? Math.min(7, Math.max(3, likertScale)) : 5
      // Labels: jika tidak disupply, pakai default
      if (Array.isArray(likertLabels) && likertLabels.length === finalLikertScale) {
        finalLikertLabels = likertLabels.map(l => String(l).trim()).filter(l => l.length > 0)
      } else {
        // Default labels (skala 5 = DEFAULT_LIKERT_LABELS, skala lain = generated)
        if (finalLikertScale === 5) {
          finalLikertLabels = DEFAULT_LIKERT_LABELS
        } else {
          finalLikertLabels = Array.from({ length: finalLikertScale }, (_, i) => `Skala ${i + 1}`)
        }
      }
    }

    const config = {
      pollId: id,
      pollType,
      options: finalOptions,
      likertScale: finalLikertScale,
      likertLabels: finalLikertLabels,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    }

    await saveConfig(id, config)

    // Audit log
    await logAccess({
      actor: user,
      action: 'UPDATE',
      resource: 'SYSTEM_SETTING',
      resourceId: id,
      resourceLabel: poll.title,
      request,
      detail: `Update poll config: type=${pollType}${
        pollType === 'MULTIPLE_CHOICE' ? `, ${finalOptions!.length} options` : ''
      }${pollType === 'LIKERT' ? `, scale=${finalLikertScale}` : ''}`,
    })

    return NextResponse.json({
      success: true,
      data: config,
      message: `Konfigurasi poll diupdate: ${pollType}`,
    })
  } catch (e: any) {
    console.error('[PollConfig PUT] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
