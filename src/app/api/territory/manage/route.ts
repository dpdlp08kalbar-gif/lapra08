// LAPRA 08 - API: Territory Management (Fase 5 — Struktur Wilayah)
// ============================================================
// GET  /api/territory/manage?parentId=xxx — List children
// POST /api/territory/manage               — Create new territory
// PUT  /api/territory/manage/[id]          — Update territory
// DELETE /api/territory/manage/[id]        — Delete territory
//
// Struktur:
//   COUNTRY (Indonesia) — pengganti DPN
//     └─ PROVINCE (Kalimantan Barat) — pengganti DPD
//          └─ REGENCY (Pontianak, Kubu Raya, dll) — pengganti DPC
//               └─ DISTRICT (Kecamatan)
//                    └─ VILLAGE (Desa/Kelurahan)
//                         └─ RW (custom level)
//                              └─ RT (custom level)
//
// Admin DPN bisa kelola semua level
// Admin DPD bisa kelola mulai dari DISTRICT di provinsinya
// Admin DPC bisa kelola mulai dari VILLAGE di kab/kotanya
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPNLevel, logAccess } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Level hierarchy
const LEVELS = ['COUNTRY', 'PROVINCE', 'REGENCY', 'DISTRICT', 'VILLAGE', 'RW', 'RT']

// ============================================================
// GET /api/territory/manage?parentId=xxx
// List children of a territory (or all COUNTRY if no parentId)
// ============================================================
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')
    const level = searchParams.get('level')

    let where: any = {}
    if (parentId) {
      where.parentId = parentId
    } else if (level) {
      where.level = level
    } else {
      // Default: show COUNTRY level (Indonesia)
      where.level = 'COUNTRY'
    }

    // RBAC: DPD hanya lihat provinsinya, DPC hanya kab/kotanya
    if (!isDPNLevel(user.role)) {
      const userTerr = await db.territory.findUnique({ where: { id: user.territoryId }, select: { level: true, code: true, parentId: true } })
      if (userTerr?.level === 'PROVINCE') {
        where.OR = [{ level: 'COUNTRY' }, { parentId: user.territoryId }, { id: user.territoryId }]
      } else if (userTerr?.level === 'REGENCY') {
        where.OR = [{ level: 'COUNTRY' }, { level: 'PROVINCE', id: userTerr.parentId || '' }, { id: user.territoryId }]
      }
    }

    const territories = await db.territory.findMany({
      where,
      include: {
        _count: { select: { children: true } },
        parent: { select: { name: true, code: true } },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    })

    // Add metadata if exists
    const result = territories.map(t => ({
      ...t,
      parsedMetadata: t.metadata ? JSON.parse(t.metadata) : null,
      childCount: t._count.children,
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (e: any) {
    console.error('[Territory GET] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// POST /api/territory/manage
// Body: { name, code, level, parentId, metadata? }
// ============================================================
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { name, code, level, parentId, metadata } = body

    if (!name?.trim() || !level) {
      return NextResponse.json({ success: false, error: 'Nama dan level wajib diisi' }, { status: 400 })
    }
    if (!LEVELS.includes(level)) {
      return NextResponse.json({ success: false, error: `Level tidak valid: ${LEVELS.join(', ')}` }, { status: 400 })
    }

    // RBAC: COUNTRY & PROVINCE hanya DPN
    if ((level === 'COUNTRY' || level === 'PROVINCE') && !isDPNLevel(user.role)) {
      return NextResponse.json({ success: false, error: 'Hanya admin DPN yang bisa tambah level ini' }, { status: 403 })
    }

    // Check unique code
    const existing = await db.territory.findUnique({ where: { code: code || `TEMP_${Date.now()}` } })
    if (existing && code) {
      return NextResponse.json({ success: false, error: `Kode "${code}" sudah dipakai` }, { status: 409 })
    }

    const territory = await db.territory.create({
      data: {
        name: name.trim(),
        code: code?.trim() || `TERR_${Date.now()}`,
        level,
        parentId: parentId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        category: 'DOMESTIC',
      },
    })

    await logAccess({ actor: user, action: 'CREATE', resource: 'SYSTEM_SETTING', resourceId: territory.id, resourceLabel: territory.name, request, detail: `Create territory: ${level} ${name}` })

    return NextResponse.json({ success: true, data: territory, message: `${level} "${name}" ditambahkan` })
  } catch (e: any) {
    console.error('[Territory POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
