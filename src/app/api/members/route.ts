// LAPRA 08 - API: Members (CRUD + verify + KTA generation)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getUserFromRequest,
  getViewableTerritoryIds,
  getEditableTerritoryIds,
  generateMemberNumber,
  isDPNLevel,
  logAccess,
} from '@/lib/server-helpers'

// Pastikan route berjalan di Node.js runtime (bukan Edge), selalu dynamic
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/members - List members (with filters, scoped to VIEW)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const territoryId = searchParams.get('territoryId')
    const search = searchParams.get('search')
    // Filter baru: level (DPN/DPD/DPC) untuk lihat anggota per tingkat
    // DPN = semua anggota di territory level COUNTRY
    // DPD = semua anggota di territory ini + anak DPC di provinsinya
    // DPC = anggota di territory ini saja (default)
    const levelFilter = searchParams.get('level') // DPN | DPD | DPC
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let viewScope, editScope
    try {
      viewScope = await getViewableTerritoryIds(user)
      editScope = await getEditableTerritoryIds(user)
    } catch (scopeErr: any) {
      console.error('[Members GET] scope failed:', scopeErr.message)
      if (!user.territoryId) return NextResponse.json({ success: true, data: [], total: 0 })
      viewScope = { isGlobalView: false, territoryIds: [user.territoryId], primaryTerritoryId: user.territoryId }
      editScope = { isGlobalEdit: false, territoryIds: [user.territoryId], primaryTerritoryId: user.territoryId }
    }

    const where: any = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { memberNumber: { contains: search } },
        { nik: { contains: search } },
        { phone: { contains: search } },
      ]
    }
    // Isolasi territory (VIEW) — default RBAC
    if (!viewScope.isGlobalView) {
      where.territoryId = { in: viewScope.territoryIds }
    }

    // === Filter level (DPN/DPD/DPC) ===
    // Kalau levelFilter diberikan, ambil semua anggota di territory level itu (dan anak-anaknya kalau DPD)
    if (levelFilter === 'DPN') {
      // DPN: anggota di territory level COUNTRY
      where.territory = { level: 'COUNTRY' }
    } else if (levelFilter === 'DPD' && territoryId) {
      // DPD: anggota di DPD itu sendiri + semua DPC di bawahnya
      // Ambil semua territory anak dari DPD ini (DPC di provinsi tsb)
      const childTerritories = await db.territory.findMany({
        where: { parentId: territoryId },
        select: { id: true },
      })
      const childIds = childTerritories.map(t => t.id)
      // Include DPD sendiri + semua DPC anak
      where.territoryId = { in: [territoryId, ...childIds] }
      // Override RBAC filter di atas
    } else if (territoryId) {
      // Default: single territoryId (DPC atau DPD specific)
      if (viewScope.isGlobalView) {
        where.territoryId = territoryId
      } else {
        // Pastikan territoryId ada dalam scope view
        if (viewScope.territoryIds.includes(territoryId)) {
          where.territoryId = territoryId
        }
      }
    }

    const [members, total] = await Promise.all([
      db.member.findMany({
        where,
        include: { territory: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.member.count({ where }),
    ])

    // Tambahkan flag canEdit untuk setiap member
    const membersWithPermissions = members.map((m) => ({
      ...m,
      canEdit: editScope.isGlobalEdit || editScope.territoryIds.includes(m.territoryId),
    }))

    // === UU PDP No. 27/2022: Audit log akses data anggota ===
    await logAccess({
      actor: user,
      action: 'VIEW',
      resource: 'MEMBER',
      request,
      detail: `List ${membersWithPermissions.length} members (filter: ${JSON.stringify(where).substring(0, 200)})`,
    })

    return NextResponse.json({ success: true, data: membersWithPermissions, total })
  } catch (e: any) {
    console.error('[Members GET] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal memuat anggota: ${e.message}` }, { status: 500 })
  }
}

// POST /api/members - Tambah anggota baru (auto-generate KTA number)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      fullName,
      nik,
      passportNumber,
      phone,
      email,
      address,
      shirtSize,
      profession,
      gender,
      birthDate,
      birthPlace,
      bloodType,
      maritalStatus,
      photoUrl,
      idCardUrl,
      territoryId,
      status = 'PENDING',
      dynamicFields,
    } = body

    if (!fullName || !phone || !territoryId) {
      return NextResponse.json(
        { success: false, error: 'Nama, nomor WhatsApp, dan wilayah wajib diisi' },
        { status: 400 }
      )
    }

    // Validasi akses EDIT territory
    const editScope = await getEditableTerritoryIds(user)
    if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(territoryId)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Akses ditolak: Anda tidak memiliki hak edit di wilayah ini. ' +
            'Admin DPN hanya bisa input anggota DPN pusat. ' +
            'Admin DPD hanya bisa input anggota DPD/DPC di provinsinya. ' +
            'Data DPN/DPD lain hanya bisa dilihat (read-only).',
        },
        { status: 403 }
      )
    }

    // Validasi NIK unik untuk domestik
    if (nik) {
      const existing = await db.member.findFirst({ where: { nik } })
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'NIK sudah terdaftar' },
          { status: 400 }
        )
      }
    }

    // Generate nomor KTA otomatis (format berbeda per level territory)
    const memberNumber = await generateMemberNumber(territoryId)

    const member = await db.member.create({
      data: {
        memberNumber,
        fullName,
        nik,
        passportNumber,
        phone,
        email,
        address,
        shirtSize,
        profession,
        gender,
        birthDate: birthDate ? new Date(birthDate) : null,
        birthPlace,
        bloodType,
        maritalStatus,
        photoUrl,
        idCardUrl,
        territoryId,
        status,
        registeredById: user.id,
        registeredAt: new Date(),
        dynamicFields: dynamicFields ? JSON.stringify(dynamicFields) : null,
      },
      include: { territory: true },
    })

    return NextResponse.json({ success: true, data: member })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
