// LAPRA 08 - API: Members (CRUD + verify + KTA generation)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getUserFromRequest,
  getAccessibleTerritoryIds,
  generateMemberNumber,
} from '@/lib/server-helpers'

// GET /api/members - List members (with filters, scoped)
export async function GET(request: NextRequest) {
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

  const scope = await getAccessibleTerritoryIds(user)

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
  // Isolasi territory
  if (!scope.isGlobal) {
    where.territoryId = { in: scope.territoryIds }
  }
  if (territoryId) {
    if (scope.isGlobal) {
      where.territoryId = territoryId
    } else {
      // Pastikan territoryId ada dalam scope
      if (scope.territoryIds.includes(territoryId)) {
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

  return NextResponse.json({ success: true, data: members, total })
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

    // Validasi akses territory
    const scope = await getAccessibleTerritoryIds(user)
    if (!scope.isGlobal && !scope.territoryIds.includes(territoryId)) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses ke wilayah ini' },
        { status: 403 }
      )
    }

    // Validasi NIK unik untuk domestik
    if (nik) {
      const existing = await db.member.findUnique({ where: { nik } })
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'NIK sudah terdaftar' },
          { status: 400 }
        )
      }
    }

    // Generate nomor KTA otomatis
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
