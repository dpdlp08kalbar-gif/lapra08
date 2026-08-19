// LAPRA 08 - API: Surveyor Manager (Kelola Akun & Wilayah Surveyor)
// ============================================================
// Manajemen surveyor lapangan untuk pengumpulan data door-to-door.
//
// Storage: SystemSetting key='surveyor_assignments' (JSON array)
//   - Pola sama dengan dpo_assignments & medsos_keywords
//   - Avoid DB migration (Vercel Free Tier constraint)
//
// Schema (per assignment):
//   {
//     id: string (cuid),
//     userId: string,              // → User.id
//     fullName: string,            // snapshot untuk display cepat
//     phone: string?,              // snapshot
//     territoryIds: string[],      // → Territory.id (multiple — surveyor bisa cover beberapa wilayah)
//     territoryNames: string[],    // snapshot untuk display
//     assignedPollIds: string[],   // → EssayPoll.id yang harus dijawab surveyor ini
//     isActive: boolean,           // bisa pause tanpa hapus assignment
//     deviceInfo?: {               // diisi saat surveyor sync pertama kali
//       userAgent?: string,
//       platform?: string,
//       lastSeen?: string (ISO),
//     },
//     lastSyncAt?: string (ISO),   // terakhir kali surveyor pull feed
//     responsesCount: number,      // counter respon yang sudah dikumpulkan
//     notes?: string,
//     createdAt: string (ISO),
//     updatedAt: string (ISO),
//     createdBy: string (userId),
//   }
//
// RBAC:
//   - GET   : semua admin (DPN/DPD/DPC) — DPD/DPC hanya lihat surveyor di wilayahnya
//   - POST  : DPN/DPD (DPD hanya assign di provinsi sendiri)
//   - PATCH : DPN/DPD
//   - DELETE: DPN/DPD
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPNLevel, logAccess } from '@/lib/server-helpers'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SETTING_KEY = 'surveyor_assignments'
const SETTING_CATEGORY = 'SURVEYOR'

interface SurveyorAssignment {
  id: string
  userId: string
  fullName: string
  phone: string | null
  territoryIds: string[]
  territoryNames: string[]
  assignedPollIds: string[]
  isActive: boolean
  deviceInfo?: {
    userAgent?: string
    platform?: string
    lastSeen?: string
  }
  lastSyncAt?: string
  responsesCount: number
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

function genId(): string {
  return 'svy_' + Date.now().toString(36) + '_' + randomBytes(6).toString('hex')
}

async function loadAssignments(): Promise<SurveyorAssignment[]> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: SETTING_KEY },
      select: { value: true },
    })
    if (!setting) return []
    const parsed = JSON.parse(setting.value)
    if (!Array.isArray(parsed)) return []
    return parsed as SurveyorAssignment[]
  } catch {
    return []
  }
}

async function saveAssignments(items: SurveyorAssignment[]): Promise<void> {
  const value = JSON.stringify(items)
  await db.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value, category: SETTING_CATEGORY, description: 'Surveyor assignments (akun + wilayah + survei yang ditugaskan)' },
    create: {
      key: SETTING_KEY,
      value,
      category: SETTING_CATEGORY,
      description: 'Surveyor assignments (akun + wilayah + survei yang ditugaskan)',
    },
  })
}

// Helper: dapatkan territory yang bisa diakses admin (untuk filter)
// DPN: semua; DPD: provinsi sendiri + DPC di bawahnya; DPC: hanya DPC sendiri
async function getAccessibleTerritoryIds(user: any): Promise<{ allowed: string[] | null; level: 'DPN' | 'DPD' | 'DPC' }> {
  if (isDPNLevel(user.role)) return { allowed: null, level: 'DPN' } // null = semua
  if (user.role === 'ADMIN_DPD' && user.territoryId) {
    // DPD: ambil provinsi sendiri + semua DPC di bawahnya
    const ids = [user.territoryId]
    const children = await db.territory.findMany({
      where: { parentId: user.territoryId },
      select: { id: true },
    })
    ids.push(...children.map(c => c.id))
    return { allowed: ids, level: 'DPD' }
  }
  if (user.role === 'ADMIN_DPC' && user.territoryId) {
    return { allowed: [user.territoryId], level: 'DPC' }
  }
  return { allowed: [], level: 'DPC' } // fallback: tidak ada akses
}

// ============================================================
// GET /api/surveyors
// Query params:
//   ?territoryId=xxx     — filter by territory
//   ?active=true         — hanya yang aktif
//   ?q=john              — search by name/phone
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const territoryFilter = searchParams.get('territoryId')
    const activeFilter = searchParams.get('active')
    const q = searchParams.get('q')?.toLowerCase().trim()

    const { allowed, level } = await getAccessibleTerritoryIds(user)

    let items = await loadAssignments()

    // Filter by access level
    if (allowed !== null) {
      items = items.filter(a => a.territoryIds.some(tid => allowed.includes(tid)))
    }

    if (territoryFilter) {
      items = items.filter(a => a.territoryIds.includes(territoryFilter))
    }
    if (activeFilter === 'true') items = items.filter(a => a.isActive)
    if (activeFilter === 'false') items = items.filter(a => !a.isActive)
    if (q) {
      items = items.filter(a =>
        a.fullName.toLowerCase().includes(q) ||
        (a.phone || '').toLowerCase().includes(q) ||
        a.territoryNames.some(n => n.toLowerCase().includes(q))
      )
    }

    // Sort: active first, lalu by name
    items.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return a.fullName.localeCompare(b.fullName)
    })

    // Statistik
    const allItems = await loadAssignments()
    const accessibleItems = allowed === null ? allItems : allItems.filter(a => a.territoryIds.some(tid => allowed.includes(tid)))
    const stats = {
      total: accessibleItems.length,
      active: accessibleItems.filter(a => a.isActive).length,
      neverSynced: accessibleItems.filter(a => !a.lastSyncAt).length,
      totalResponses: accessibleItems.reduce((sum, a) => sum + (a.responsesCount || 0), 0),
      totalAssignedSurveys: accessibleItems.reduce((sum, a) => sum + a.assignedPollIds.length, 0),
    }

    return NextResponse.json({
      success: true,
      data: items,
      stats,
      accessLevel: level,
      message: items.length === 0
        ? 'Belum ada surveyor. Tambahkan surveyor dari daftar anggota/USER.'
        : `${items.length} surveyor dimuat`,
    })
  } catch (e: any) {
    console.error('[Surveyors GET] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal memuat surveyor: ${e.message}` }, { status: 500 })
  }
}

// ============================================================
// POST /api/surveyors
// Body:
//   - { userId, territoryIds, assignedPollIds?, notes?, isActive? }   — assign user sebagai surveyor
//   - { action: 'sync', userId, deviceInfo? }                         — record sync event
//   - { action: 'increment_response', userId, pollId }                — tambah counter respon
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const actor = await getUserFromRequest(request)
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // DPN & DPD bisa assign; DPC tidak bisa
    const canManage = isDPNLevel(actor.role) || actor.role === 'ADMIN_DPD'
    if (!canManage) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Hanya admin DPN/DPD yang bisa mengelola surveyor.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const items = await loadAssignments()

    // === Action: sync (record surveyor pull feed) ===
    if (body.action === 'sync' && body.userId) {
      const idx = items.findIndex(a => a.userId === body.userId)
      if (idx === -1) {
        return NextResponse.json({ success: false, error: 'User bukan surveyor' }, { status: 404 })
      }
      const now = new Date().toISOString()
      items[idx].lastSyncAt = now
      items[idx].deviceInfo = {
        userAgent: body.deviceInfo?.userAgent || items[idx].deviceInfo?.userAgent,
        platform: body.deviceInfo?.platform || items[idx].deviceInfo?.platform,
        lastSeen: now,
      }
      items[idx].updatedAt = now
      await saveAssignments(items)

      // Return feed sekaligus (survei aktif yang ditugaskan)
      const activePolls = items[idx].assignedPollIds.length > 0
        ? await db.essayPoll.findMany({
            where: { id: { in: items[idx].assignedPollIds }, status: 'ACTIVE' },
            select: {
              id: true, title: true, question: true, description: true,
              targetScope: true, targetAgeGroup: true, targetOccupation: true,
              provinceCode: true, regencyCode: true,
              closesAt: true, createdAt: true,
            },
          })
        : []

      return NextResponse.json({
        success: true,
        data: {
          surveyor: items[idx],
          activeSurveys: activePolls,
          serverTime: now,
        },
        message: `Sync berhasil. ${activePolls.length} survei aktif menunggu.`,
      })
    }

    // === Action: increment_response ===
    if (body.action === 'increment_response' && body.userId) {
      const idx = items.findIndex(a => a.userId === body.userId)
      if (idx === -1) {
        return NextResponse.json({ success: false, error: 'User bukan surveyor' }, { status: 404 })
      }
      items[idx].responsesCount = (items[idx].responsesCount || 0) + 1
      items[idx].updatedAt = new Date().toISOString()
      await saveAssignments(items)
      return NextResponse.json({ success: true, data: items[idx], message: 'Counter respon ditambah' })
    }

    // === Default: assign surveyor baru ===
    const { userId, territoryIds, assignedPollIds, notes, isActive } = body
    if (!userId) return NextResponse.json({ success: false, error: 'Field wajib: userId' }, { status: 400 })
    if (!Array.isArray(territoryIds) || territoryIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Field wajib: territoryIds (array, minimal 1)' }, { status: 400 })
    }

    // Cek user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, phone: true, role: true, isActive: true, territoryId: true },
    })
    if (!targetUser) return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 })
    if (!targetUser.isActive) return NextResponse.json({ success: false, error: 'User tidak aktif' }, { status: 400 })

    // Cek duplicate
    if (items.some(a => a.userId === userId)) {
      return NextResponse.json({ success: false, error: `${targetUser.fullName} sudah terdaftar sebagai surveyor` }, { status: 409 })
    }

    // Validasi territory access untuk DPD
    if (actor.role === 'ADMIN_DPD') {
      const { allowed } = await getAccessibleTerritoryIds(actor)
      if (allowed !== null) {
        const forbidden = territoryIds.filter((tid: string) => !allowed.includes(tid))
        if (forbidden.length > 0) {
          return NextResponse.json(
            { success: false, error: 'Anda hanya bisa assign surveyor ke wilayah DPD/DPC sendiri' },
            { status: 403 }
          )
        }
      }
    }

    // Ambil nama territory
    const territories = await db.territory.findMany({
      where: { id: { in: territoryIds } },
      select: { id: true, name: true, code: true, level: true },
    })
    if (territories.length !== territoryIds.length) {
      return NextResponse.json({ success: false, error: 'Sebagian territory tidak ditemukan' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const newAssignment: SurveyorAssignment = {
      id: genId(),
      userId,
      fullName: targetUser.fullName,
      phone: targetUser.phone,
      territoryIds,
      territoryNames: territories.map(t => `${t.name} (${t.level})`),
      assignedPollIds: Array.isArray(assignedPollIds) ? assignedPollIds : [],
      isActive: typeof isActive === 'boolean' ? isActive : true,
      responsesCount: 0,
      notes: notes || undefined,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
    }

    items.push(newAssignment)
    await saveAssignments(items)

    await logAccess({
      actor, action: 'CREATE', resource: 'SYSTEM_SETTING', resourceId: SETTING_KEY,
      resourceLabel: 'Surveyor Assignments', request,
      detail: `Assign ${targetUser.fullName} sebagai surveyor (${territories.length} wilayah)`,
    })

    return NextResponse.json({
      success: true,
      data: newAssignment,
      message: `${targetUser.fullName} ditambahkan sebagai surveyor`,
    })
  } catch (e: any) {
    console.error('[Surveyors POST] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal tambah surveyor: ${e.message}` }, { status: 500 })
  }
}

// ============================================================
// PATCH /api/surveyors
// Body: { id, territoryIds?, assignedPollIds?, isActive?, notes? }
// ============================================================
export async function PATCH(request: NextRequest) {
  try {
    const actor = await getUserFromRequest(request)
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const canManage = isDPNLevel(actor.role) || actor.role === 'ADMIN_DPD'
    if (!canManage) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Hanya admin DPN/DPD yang bisa mengubah surveyor.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ success: false, error: 'Field wajib: id' }, { status: 400 })

    const items = await loadAssignments()
    const idx = items.findIndex(a => a.id === id)
    if (idx === -1) return NextResponse.json({ success: false, error: 'Assignment tidak ditemukan' }, { status: 404 })

    const old = items[idx]

    // Jika update territoryIds, validasi & re-fetch names
    let newTerritoryIds = old.territoryIds
    let newTerritoryNames = old.territoryNames
    if (Array.isArray(updates.territoryIds) && updates.territoryIds.length > 0) {
      newTerritoryIds = updates.territoryIds
      const territories = await db.territory.findMany({
        where: { id: { in: newTerritoryIds } },
        select: { id: true, name: true, level: true },
      })
      newTerritoryNames = territories.map(t => `${t.name} (${t.level})`)
    }

    items[idx] = {
      ...old,
      territoryIds: newTerritoryIds,
      territoryNames: newTerritoryNames,
      assignedPollIds: Array.isArray(updates.assignedPollIds) ? updates.assignedPollIds : old.assignedPollIds,
      isActive: typeof updates.isActive === 'boolean' ? updates.isActive : old.isActive,
      notes: updates.notes !== undefined ? (updates.notes || undefined) : old.notes,
      updatedAt: new Date().toISOString(),
    }

    await saveAssignments(items)

    await logAccess({
      actor, action: 'UPDATE', resource: 'SYSTEM_SETTING', resourceId: SETTING_KEY,
      resourceLabel: 'Surveyor Assignments', request,
      detail: `Update surveyor ${old.fullName} (active=${items[idx].isActive}, wilayah=${items[idx].territoryIds.length})`,
    })

    return NextResponse.json({
      success: true,
      data: items[idx],
      message: `Surveyor ${items[idx].fullName} diperbarui`,
    })
  } catch (e: any) {
    console.error('[Surveyors PATCH] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal update surveyor: ${e.message}` }, { status: 500 })
  }
}

// ============================================================
// DELETE /api/surveyors
// Body: { id } atau { ids: [...] }
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    const actor = await getUserFromRequest(request)
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const canManage = isDPNLevel(actor.role) || actor.role === 'ADMIN_DPD'
    if (!canManage) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Hanya admin DPN/DPD yang bisa menghapus surveyor.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const idsToDelete: string[] = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : [])
    if (idsToDelete.length === 0) {
      return NextResponse.json({ success: false, error: 'Field wajib: id atau ids' }, { status: 400 })
    }

    const items = await loadAssignments()
    const deleted = items.filter(a => idsToDelete.includes(a.id))
    const remaining = items.filter(a => !idsToDelete.includes(a.id))

    if (deleted.length === 0) {
      return NextResponse.json({ success: false, error: 'Assignment tidak ditemukan' }, { status: 404 })
    }

    await saveAssignments(remaining)

    await logAccess({
      actor, action: 'DELETE', resource: 'SYSTEM_SETTING', resourceId: SETTING_KEY,
      resourceLabel: 'Surveyor Assignments', request,
      detail: `Unassign ${deleted.length} surveyor: ${deleted.map(d => d.fullName).join(', ')}`,
    })

    return NextResponse.json({
      success: true,
      data: remaining,
      deletedCount: deleted.length,
      message: `${deleted.length} surveyor dihapus dari penugasan`,
    })
  } catch (e: any) {
    console.error('[Surveyors DELETE] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal hapus surveyor: ${e.message}` }, { status: 500 })
  }
}
