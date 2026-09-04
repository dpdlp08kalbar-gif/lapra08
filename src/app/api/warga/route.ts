// LAPRA 08 - API: Family Card (Kartu Keluarga) & Resident (Warga)
// ============================================================
// GET  /api/warga?territoryId=xxx       — list KK + residents di territory (RT)
// GET  /api/warga?territoryId=xxx&stats=1 — summary stats (KK count, residents, demography)
// POST /api/warga                      — create KK or Resident (action: 'create_kk' | 'create_resident')
// PATCH /api/warga                     — update KK or Resident (action: 'update_kk' | 'update_resident' | 'toggle_resident')
// DELETE /api/warga?id=xxx&type=kk|resident  — delete
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPNLevel, logAccess } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ============================================================
// GET — list KK + residents in a territory (RT level ideal)
// ============================================================
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const territoryId = searchParams.get('territoryId')
    const statsOnly = searchParams.get('stats') === '1'

    if (!territoryId) {
      return NextResponse.json({ success: false, error: 'territoryId wajib diisi' }, { status: 400 })
    }

    // Verify territory exists
    const territory = await db.territory.findUnique({
      where: { id: territoryId },
      select: { id: true, code: true, name: true, level: true, parentId: true },
    })
    if (!territory) {
      return NextResponse.json({ success: false, error: 'Territory tidak ditemukan' }, { status: 404 })
    }

    // Stats only mode
    if (statsOnly) {
      const kkCount = await db.familyCard.count({ where: { territoryId } })
      const residentCount = await db.resident.count({ where: { territoryId } })
      const activeResidents = await db.resident.count({ where: { territoryId, isActive: true } })
      const inactiveResidents = await db.resident.count({ where: { territoryId, isActive: false } })

      const byGender = await db.resident.groupBy({
        by: ['gender'],
        where: { territoryId },
        _count: true,
      })
      const byReligion = await db.resident.groupBy({
        by: ['religion'],
        where: { territoryId },
        _count: true,
      })
      const byRelation = await db.resident.groupBy({
        by: ['relationToHead'],
        where: { territoryId },
        _count: true,
      })

      await logAccess({
        actor: user,
        action: 'VIEW',
        resource: 'RESIDENT',
        resourceId: territoryId,
        resourceLabel: `Stats warga ${territory.name} (${territory.code})`,
        request,
        detail: `KK=${kkCount}, Warga=${residentCount}`,
      })

      return NextResponse.json({
        success: true,
        data: {
          territory,
          kkCount,
          residentCount,
          activeResidents,
          inactiveResidents,
          byGender,
          byReligion,
          byRelation,
        },
      })
    }

    // Full list: KK with residents
    const familyCards = await db.familyCard.findMany({
      where: { territoryId },
      include: {
        residents: {
          orderBy: [{ relationToHead: 'asc' }, { fullName: 'asc' }],
        },
      },
      orderBy: { kkNumber: 'asc' },
    })

    await logAccess({
      actor: user,
      action: 'VIEW',
      resource: 'FAMILY_CARD',
      resourceId: territoryId,
      resourceLabel: `List KK ${territory.name} (${territory.code})`,
      request,
      detail: `${familyCards.length} KK`,
    })

    return NextResponse.json({
      success: true,
      data: {
        territory,
        familyCards,
      },
    })
  } catch (e: any) {
    console.error('[Warga GET] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// POST — create KK or Resident
// ============================================================
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const action = body.action || 'create_kk'

    // ============================================================
    // CREATE KARTU KELUARGA
    // ============================================================
    if (action === 'create_kk') {
      const { kkNumber, headOfFamilyName, address, territoryId } = body

      if (!kkNumber?.trim() || !headOfFamilyName?.trim() || !territoryId) {
        return NextResponse.json({ success: false, error: 'kkNumber, headOfFamilyName, territoryId wajib diisi' }, { status: 400 })
      }

      // Check unique KK number
      const existing = await db.familyCard.findUnique({ where: { kkNumber: kkNumber.trim() } })
      if (existing) {
        return NextResponse.json({ success: false, error: `Nomor KK "${kkNumber.trim()}" sudah terdaftar` }, { status: 409 })
      }

      // Get territory to derive codes/names
      const territory = await db.territory.findUnique({
        where: { id: territoryId },
        include: { parent: { include: { parent: { include: { parent: { include: { parent: true } } } } } } },
      })
      if (!territory) {
        return NextResponse.json({ success: false, error: 'Territory tidak ditemukan' }, { status: 404 })
      }

      const path = buildPath(territory)

      const kk = await db.familyCard.create({
        data: {
          kkNumber: kkNumber.trim(),
          headOfFamilyName: headOfFamilyName.trim(),
          address: address?.trim() || null,
          territoryId,
          rtCode: path.rtCode,
          rwCode: path.rwCode,
          villageCode: path.villageCode,
          villageName: path.villageName,
          districtName: path.districtName,
          regencyName: path.regencyName,
          provinceName: path.provinceName,
          createdById: user.id,
        },
        include: { residents: true },
      })

      // Auto-create head of family as first resident
      if (body.autoCreateHead !== false) {
        await db.resident.create({
          data: {
            familyCardId: kk.id,
            fullName: headOfFamilyName.trim(),
            nik: body.headNIK?.trim() || null,
            gender: body.headGender || null,
            birthPlace: body.headBirthPlace || null,
            birthDate: body.headBirthDate ? new Date(body.headBirthDate) : null,
            religion: body.headReligion || null,
            occupation: body.headOccupation || null,
            relationToHead: 'KEPALA KELUARGA',
            address: address?.trim() || null,
            territoryId,
            createdById: user.id,
          },
        })
      }

      await logAccess({
        actor: user,
        action: 'CREATE',
        resource: 'FAMILY_CARD',
        resourceId: kk.id,
        resourceLabel: `KK ${kk.kkNumber} (${kk.headOfFamilyName})`,
        request,
        detail: `Auto-create head: ${body.autoCreateHead !== false}`,
      })

      return NextResponse.json({
        success: true,
        data: kk,
        message: `KK ${kk.kkNumber} berhasil dibuat`,
      })
    }

    // ============================================================
    // CREATE RESIDENT (anggota KK)
    // ============================================================
    if (action === 'create_resident') {
      const { familyCardId, fullName, nik, gender, birthPlace, birthDate, religion, maritalStatus, bloodType, education, occupation, citizenship, motherName, fatherName, relationToHead, phone, email, address, territoryId } = body

      if (!familyCardId || !fullName?.trim() || !territoryId) {
        return NextResponse.json({ success: false, error: 'familyCardId, fullName, territoryId wajib diisi' }, { status: 400 })
      }

      // Validate KK exists
      const kk = await db.familyCard.findUnique({ where: { id: familyCardId } })
      if (!kk) {
        return NextResponse.json({ success: false, error: 'KK tidak ditemukan' }, { status: 404 })
      }

      // Check unique NIK if provided
      if (nik?.trim()) {
        const existingNik = await db.resident.findUnique({ where: { nik: nik.trim() } })
        if (existingNik) {
          return NextResponse.json({ success: false, error: `NIK "${nik.trim()}" sudah terdaftar` }, { status: 409 })
        }
      }

      const resident = await db.resident.create({
        data: {
          familyCardId,
          fullName: fullName.trim(),
          nik: nik?.trim() || null,
          gender: gender || null,
          birthPlace: birthPlace?.trim() || null,
          birthDate: birthDate ? new Date(birthDate) : null,
          religion: religion || null,
          maritalStatus: maritalStatus || null,
          bloodType: bloodType || null,
          education: education || null,
          occupation: occupation?.trim() || null,
          citizenship: citizenship || 'WNI',
          motherName: motherName?.trim() || null,
          fatherName: fatherName?.trim() || null,
          relationToHead: relationToHead || 'FAMILI LAIN',
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          address: address?.trim() || null,
          territoryId,
          createdById: user.id,
        },
      })

      await logAccess({
        actor: user,
        action: 'CREATE',
        resource: 'RESIDENT',
        resourceId: resident.id,
        resourceLabel: `Warga ${resident.fullName} (KK ${kk.kkNumber})`,
        request,
        detail: `NIK: ${resident.nik || '-'}; Relation: ${resident.relationToHead}`,
      })

      return NextResponse.json({
        success: true,
        data: resident,
        message: `Warga ${resident.fullName} ditambahkan ke KK ${kk.kkNumber}`,
      })
    }

    return NextResponse.json({ success: false, error: `Action tidak dikenal: ${action}` }, { status: 400 })
  } catch (e: any) {
    console.error('[Warga POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// PATCH — update KK or Resident
// ============================================================
export async function PATCH(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const action = body.action

    if (action === 'update_kk') {
      const { id, kkNumber, headOfFamilyName, address } = body
      if (!id) return NextResponse.json({ success: false, error: 'id wajib diisi' }, { status: 400 })

      const existing = await db.familyCard.findUnique({ where: { id } })
      if (!existing) return NextResponse.json({ success: false, error: 'KK tidak ditemukan' }, { status: 404 })

      if (kkNumber && kkNumber.trim() !== existing.kkNumber) {
        const dup = await db.familyCard.findUnique({ where: { kkNumber: kkNumber.trim() } })
        if (dup && dup.id !== id) {
          return NextResponse.json({ success: false, error: `Nomor KK "${kkNumber.trim()}" sudah dipakai KK lain` }, { status: 409 })
        }
      }

      const updated = await db.familyCard.update({
        where: { id },
        data: {
          ...(kkNumber !== undefined ? { kkNumber: kkNumber.trim() } : {}),
          ...(headOfFamilyName !== undefined ? { headOfFamilyName: headOfFamilyName.trim() } : {}),
          ...(address !== undefined ? { address: address?.trim() || null } : {}),
        },
      })

      await logAccess({
        actor: user,
        action: 'UPDATE',
        resource: 'FAMILY_CARD',
        resourceId: id,
        resourceLabel: `KK ${updated.kkNumber}`,
        request,
        detail: 'Update KK fields',
      })

      return NextResponse.json({ success: true, data: updated, message: 'KK diperbarui' })
    }

    if (action === 'update_resident') {
      const { id, fullName, nik, gender, birthPlace, birthDate, religion, maritalStatus, bloodType, education, occupation, citizenship, motherName, fatherName, relationToHead, phone, email, address, statusNote } = body
      if (!id) return NextResponse.json({ success: false, error: 'id wajib diisi' }, { status: 400 })

      const existing = await db.resident.findUnique({ where: { id } })
      if (!existing) return NextResponse.json({ success: false, error: 'Warga tidak ditemukan' }, { status: 404 })

      if (nik && nik.trim() !== existing.nik) {
        const dup = await db.resident.findUnique({ where: { nik: nik.trim() } })
        if (dup && dup.id !== id) {
          return NextResponse.json({ success: false, error: `NIK "${nik.trim()}" sudah dipakai warga lain` }, { status: 409 })
        }
      }

      const updated = await db.resident.update({
        where: { id },
        data: {
          ...(fullName !== undefined ? { fullName: fullName.trim() } : {}),
          ...(nik !== undefined ? { nik: nik?.trim() || null } : {}),
          ...(gender !== undefined ? { gender: gender || null } : {}),
          ...(birthPlace !== undefined ? { birthPlace: birthPlace?.trim() || null } : {}),
          ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}),
          ...(religion !== undefined ? { religion: religion || null } : {}),
          ...(maritalStatus !== undefined ? { maritalStatus: maritalStatus || null } : {}),
          ...(bloodType !== undefined ? { bloodType: bloodType || null } : {}),
          ...(education !== undefined ? { education: education || null } : {}),
          ...(occupation !== undefined ? { occupation: occupation?.trim() || null } : {}),
          ...(citizenship !== undefined ? { citizenship: citizenship || null } : {}),
          ...(motherName !== undefined ? { motherName: motherName?.trim() || null } : {}),
          ...(fatherName !== undefined ? { fatherName: fatherName?.trim() || null } : {}),
          ...(relationToHead !== undefined ? { relationToHead: relationToHead || null } : {}),
          ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
          ...(email !== undefined ? { email: email?.trim() || null } : {}),
          ...(address !== undefined ? { address: address?.trim() || null } : {}),
          ...(statusNote !== undefined ? { statusNote: statusNote?.trim() || null } : {}),
        },
      })

      await logAccess({
        actor: user,
        action: 'UPDATE',
        resource: 'RESIDENT',
        resourceId: id,
        resourceLabel: `Warga ${updated.fullName}`,
        request,
        detail: `Update fields: ${Object.keys(body).filter(k => !['id', 'action'].includes(k)).join(', ')}`,
      })

      return NextResponse.json({ success: true, data: updated, message: 'Warga diperbarui' })
    }

    if (action === 'toggle_resident') {
      const { id, isActive, statusNote } = body
      if (!id) return NextResponse.json({ success: false, error: 'id wajib diisi' }, { status: 400 })

      const updated = await db.resident.update({
        where: { id },
        data: {
          isActive: !!isActive,
          ...(statusNote !== undefined ? { statusNote: statusNote?.trim() || null } : {}),
        },
      })

      await logAccess({
        actor: user,
        action: 'UPDATE',
        resource: 'RESIDENT',
        resourceId: id,
        resourceLabel: `Warga ${updated.fullName}`,
        request,
        detail: `Toggle isActive: ${updated.isActive}; note: ${updated.statusNote || '-'}`,
      })

      return NextResponse.json({ success: true, data: updated, message: `Status warga: ${updated.isActive ? 'AKTIF' : 'NON-AKTIF'}` })
    }

    return NextResponse.json({ success: false, error: `Action tidak dikenal: ${action}` }, { status: 400 })
  } catch (e: any) {
    console.error('[Warga PATCH] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// DELETE
// ============================================================
export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type')

    if (!id || !type) {
      return NextResponse.json({ success: false, error: 'id dan type wajib diisi' }, { status: 400 })
    }

    if (type === 'kk') {
      const kk = await db.familyCard.findUnique({ where: { id }, include: { residents: true } })
      if (!kk) return NextResponse.json({ success: false, error: 'KK tidak ditemukan' }, { status: 404 })

      const residentCount = kk.residents.length
      await db.familyCard.delete({ where: { id } })

      await logAccess({
        actor: user,
        action: 'DELETE',
        resource: 'FAMILY_CARD',
        resourceId: id,
        resourceLabel: `KK ${kk.kkNumber} (${kk.headOfFamilyName})`,
        request,
        detail: `Deleted KK + ${residentCount} residents`,
      })

      return NextResponse.json({ success: true, message: `KK ${kk.kkNumber} dihapus (${residentCount} warga turut terhapus)` })
    }

    if (type === 'resident') {
      const resident = await db.resident.findUnique({ where: { id }, include: { familyCard: true } })
      if (!resident) return NextResponse.json({ success: false, error: 'Warga tidak ditemukan' }, { status: 404 })

      await db.resident.delete({ where: { id } })

      await logAccess({
        actor: user,
        action: 'DELETE',
        resource: 'RESIDENT',
        resourceId: id,
        resourceLabel: `Warga ${resident.fullName} (KK ${resident.familyCard.kkNumber})`,
        request,
        detail: `Deleted resident`,
      })

      return NextResponse.json({ success: true, message: `Warga ${resident.fullName} dihapus` })
    }

    return NextResponse.json({ success: false, error: `Type tidak dikenal: ${type}` }, { status: 400 })
  } catch (e: any) {
    console.error('[Warga DELETE] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// Helper: build path from RT territory
// ============================================================
function buildPath(territory: any): {
  rtCode: string | null
  rwCode: string | null
  villageCode: string | null
  villageName: string | null
  districtName: string | null
  regencyName: string | null
  provinceName: string | null
} {
  let rt: any = territory
  let rw: any = null
  let village: any = null
  let district: any = null
  let regency: any = null
  let province: any = null

  if (rt?.level === 'RT' && rt.parent) {
    rw = rt.parent
    if (rw?.level === 'RW' && rw.parent) {
      village = rw.parent
      if (village?.level === 'VILLAGE' && village.parent) {
        district = village.parent
        if (district?.level === 'DISTRICT' && district.parent) {
          regency = district.parent
          if (regency?.level === 'REGENCY' && regency.parent) {
            province = regency.parent
          }
        }
      }
    }
  }

  if (!rw && territory?.level === 'RW') {
    rw = territory
    if (rw.parent?.level === 'VILLAGE') {
      village = rw.parent
      if (village.parent?.level === 'DISTRICT') {
        district = village.parent
        if (district.parent?.level === 'REGENCY') {
          regency = district.parent
          if (regency.parent?.level === 'PROVINCE') {
            province = regency.parent
          }
        }
      }
    }
  }

  return {
    rtCode: rt?.code || null,
    rwCode: rw?.code || null,
    villageCode: village?.code || null,
    villageName: village?.name || null,
    districtName: district?.name || null,
    regencyName: regency?.name || null,
    provinceName: province?.name || null,
  }
}
