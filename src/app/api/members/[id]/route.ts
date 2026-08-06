// LAPRA 08 - API: Members [id] - Update, Delete, Verify
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getAccessibleTerritoryIds } from '@/lib/server-helpers'

// GET single member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const scope = await getAccessibleTerritoryIds(user)
  const where: any = { id }
  if (!scope.isGlobal) {
    where.territoryId = { in: scope.territoryIds }
  }

  const member = await db.member.findFirst({
    where,
    include: { territory: true, registeredBy: true, verifiedBy: true },
  })

  if (!member) {
    return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: member })
}

// PUT - Update member (edit bebas di development mode)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const scope = await getAccessibleTerritoryIds(user)
  const existing = await db.member.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 })
  }
  if (!scope.isGlobal && !scope.territoryIds.includes(existing.territoryId)) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
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
      status,
      dynamicFields,
    } = body

    const member = await db.member.update({
      where: { id },
      data: {
        fullName,
        nik,
        passportNumber,
        phone,
        email,
        address,
        shirtSize,
        profession,
        gender,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        birthPlace,
        bloodType,
        maritalStatus,
        photoUrl,
        idCardUrl,
        status,
        dynamicFields: dynamicFields ? JSON.stringify(dynamicFields) : undefined,
        verifiedAt: status === 'ACTIVE' && existing.status !== 'ACTIVE' ? new Date() : undefined,
        verifiedById: status === 'ACTIVE' && existing.status !== 'ACTIVE' ? user.id : undefined,
      },
      include: { territory: true },
    })

    return NextResponse.json({ success: true, data: member })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE - Hapus anggota (bebas di development mode)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const scope = await getAccessibleTerritoryIds(user)
  const existing = await db.member.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 })
  }
  if (!scope.isGlobal && !scope.territoryIds.includes(existing.territoryId)) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  await db.member.delete({ where: { id } })
  return NextResponse.json({ success: true, message: 'Member deleted' })
}

// PATCH - Quick action (verify, reject, activate, deactivate)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const scope = await getAccessibleTerritoryIds(user)
  const existing = await db.member.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 })
  }
  if (!scope.isGlobal && !scope.territoryIds.includes(existing.territoryId)) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  const body = await request.json()
  const { action } = body // verify | reject | activate | deactivate

  const statusMap: Record<string, string> = {
    verify: 'VERIFIED',
    reject: 'REJECTED',
    activate: 'ACTIVE',
    deactivate: 'INACTIVE',
  }

  if (!statusMap[action]) {
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  }

  const newStatus = statusMap[action]
  const updateData: any = { status: newStatus }
  if (newStatus === 'ACTIVE' || newStatus === 'VERIFIED') {
    updateData.verifiedAt = new Date()
    updateData.verifiedById = user.id
  }

  const member = await db.member.update({
    where: { id },
    data: updateData,
    include: { territory: true },
  })

  return NextResponse.json({ success: true, data: member })
}
