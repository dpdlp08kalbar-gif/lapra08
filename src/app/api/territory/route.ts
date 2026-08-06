// LAPRA 08 - API: Territory Management
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getAccessibleTerritoryIds } from '@/lib/server-helpers'

// GET /api/territory - List territories (filtered by scope)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const level = searchParams.get('level')
  const category = searchParams.get('category')
  const parentId = searchParams.get('parentId')

  const scope = await getAccessibleTerritoryIds(user)

  const where: any = {}
  if (level) where.level = level
  if (category) where.category = category
  if (parentId) where.parentId = parentId

  // Non-global users hanya bisa lihat territory di scope-nya
  if (!scope.isGlobal) {
    where.id = { in: scope.territoryIds }
  }

  const territories = await db.territory.findMany({
    where,
    include: {
      parent: true,
      _count: {
        select: {
          children: true,
          members: true,
          users: true,
        },
      },
    },
    orderBy: [{ category: 'asc' }, { level: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json({ success: true, data: territories })
}

// POST /api/territory - Tambah wilayah baru (Dynamic Territory)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN' && user.role !== 'ADMIN_DPD') {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
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
