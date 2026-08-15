// LAPRA 08 - API: Members (CRUD + verify + KTA generation)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getUserFromRequest,
  getViewableTerritoryIds,
  getEditableTerritoryIds,
  generateMemberNumber,
  isDPNLevel,
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
    // Isolasi territory (VIEW)
    if (!viewScope.isGlobalView) {
      where.territoryId = { in: viewScope.territoryIds }
    }
    if (territoryId) {
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
