// LAPRA 08 - API: Territory Management
// With strict hierarchy validation: Code Format, Orphan Prevention, Unique Name
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getUserFromRequest,
  getViewableTerritoryIds,
  getEditableTerritoryIds,
  canEditTerritory,
  isDPNLevel,
} from '@/lib/server-helpers'

// ============================================================
// VALIDATION FUNCTIONS (Automated Checker)
// ============================================================

// RULE 1: Verify Code Format — DPC code must start with DPD parent code
// e.g., DPD Kalbar = "61" → DPC codes must be "61xx" (6171, 6172, 6101, etc.)
function verifyCodeFormat(dpcCode: string, dpdCode: string): boolean {
  // Untuk domestik: DPC code harus diawali dengan kode DPD parent
  if (dpcCode.length < 4 || dpdCode.length < 2) return false
  return dpcCode.startsWith(dpdCode)
}

// RULE 2: Orphan Prevention — DPC cannot be created if DPD parent is not active
async function checkParentActive(parentId: string): Promise<{ active: boolean; parent: any }> {
  const parent = await db.territory.findUnique({ where: { id: parentId } })
  return { active: parent?.isActive || false, parent }
}

// RULE 3: Unique Name Constraint — no duplicate DPC name within same DPD
async function checkUniqueNameInDpd(
  name: string,
  parentId: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await db.territory.findFirst({
    where: {
      name: name,
      parentId: parentId,
      level: 'REGENCY',
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  })
  return !existing
}

// GET /api/territory - List territories (filtered by viewable scope)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const level = searchParams.get('level')
  const category = searchParams.get('category')
  const parentId = searchParams.get('parentId')

  const viewScope = await getViewableTerritoryIds(user)
  const editScope = await getEditableTerritoryIds(user)

  const where: any = {}
  if (level) where.level = level
  if (category) where.category = category
  if (parentId) where.parentId = parentId

  if (!viewScope.isGlobalView) {
    where.id = { in: viewScope.territoryIds }
  }

  const territories = await db.territory.findMany({
    where,
    include: {
      parent: true,
      _count: { select: { children: true, members: true, users: true } },
    },
    orderBy: [{ category: 'asc' }, { level: 'asc' }, { name: 'asc' }],
  })

  const territoriesWithPermissions = territories.map((t) => ({
    ...t,
    canEdit: editScope.isGlobalEdit || editScope.territoryIds.includes(t.id),
    canView: true,
  }))

  return NextResponse.json({ success: true, data: territoriesWithPermissions })
}

// POST /api/territory - Tambah wilayah baru dengan VALIDASI HIERARKI KETAT
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!isDPNLevel(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Hanya Admin DPN yang dapat menambah wilayah baru' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { code, name, level, category, parentId, isActive = true, metadata } = body

    if (!code || !name || !level) {
      return NextResponse.json(
        { success: false, error: 'Code, name, level wajib diisi' },
        { status: 400 }
      )
    }

    // Cek duplikasi code
    const existing = await db.territory.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Kode wilayah sudah digunakan' },
        { status: 400 }
      )
    }

    // ===== VALIDASI HIERARKI KETAT (untuk DPC/REGENCY level) =====
    // RULE: DPC wajib punya parent DPD (tidak boleh orphan)
    if (level === 'REGENCY' && !parentId) {
      return NextResponse.json(
        { success: false, error: '❌ ORPHAN PREVENTION: DPC wajib terikat pada DPD Provinsi. Pilih wilayah induk (DPD).' },
        { status: 400 }
      )
    }

    if (level === 'REGENCY' && parentId) {
      // RULE 2: Orphan Prevention — DPD parent harus aktif
      const { active, parent } = await checkParentActive(parentId)
      if (!parent) {
        return NextResponse.json(
          { success: false, error: '❌ ORPHAN PREVENTION: DPD Parent tidak ditemukan. DPC wajib terikat pada DPD Provinsi.' },
          { status: 400 }
        )
      }
      if (!active) {
        return NextResponse.json(
          { success: false, error: `❌ ORPHAN PREVENTION: DPD Parent "${parent.name}" tidak aktif. Aktifkan DPD terlebih dahulu sebelum menambah DPC.` },
          { status: 400 }
        )
      }

      // RULE 1: Verify Code Format — DPC code harus diawali kode DPD parent
      // Untuk domestik: code DPD = "61", code DPC harus "61xx"
      // Untuk internasional: code bebas (LAX, NYC, dll)
      if (parent.category === 'DOMESTIC' && parent.level === 'PROVINCE') {
        if (!verifyCodeFormat(code, parent.code)) {
          return NextResponse.json(
            { success: false, error: `❌ CODE FORMAT VIOLATION: Kode DPC "${code}" harus diawali dengan kode DPD parent "${parent.code}". Contoh: ${parent.code}71, ${parent.code}72, dll.` },
            { status: 400 }
          )
        }
      }

      // RULE 3: Unique Name — tidak boleh ada DPC dengan nama sama dalam 1 DPD
      const isUnique = await checkUniqueNameInDpd(name, parentId)
      if (!isUnique) {
        return NextResponse.json(
          { success: false, error: `❌ UNIQUE CONSTRAINT: DPC dengan nama "${name}" sudah ada dalam DPD "${parent.name}". Tidak boleh ada nama DPC ganda dalam 1 DPD provinsi.` },
          { status: 400 }
        )
      }
    }

    // Untuk DPD (PROVINCE) — wajib punya parent COUNTRY
    if (level === 'PROVINCE' && !parentId) {
      return NextResponse.json(
        { success: false, error: '❌ HIERARKI: DPD wajib terikat pada DPN (Negara). Pilih wilayah induk (COUNTRY).' },
        { status: 400 }
      )
    }

    const territory = await db.territory.create({
      data: {
        code,
        name,
        level,
        category: category || 'DOMESTIC',
        parentId: parentId || null,
        isActive,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: { parent: true },
    })

    return NextResponse.json({ success: true, data: territory })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
