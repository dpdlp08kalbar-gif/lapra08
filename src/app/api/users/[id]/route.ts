// LAPRA 08 - API: User [id] — Update & Delete
// PATCH /api/users/[id]  — edit metadata, activate/deactivate, reset password
// DELETE /api/users/[id] — hapus user (soft delete via isActive=false, atau hard delete)
//
// RBAC:
// - SUPERADMIN/ADMIN_DPN: edit semua user (kecuali diri sendiri untuk role downgrade)
// - ADMIN_DPD: edit DPC di scope-nya (territory + role DPC)
// - ADMIN_DPC: tidak bisa akses (403)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getAccessibleTerritoryIds, isDPNLevel } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Helper: cek hak edit terhadap user target
async function canEditUser(actor: any, targetUserId: string): Promise<{ allowed: boolean; reason?: string; target?: any }> {
  const target = await db.user.findUnique({
    where: { id: targetUserId },
    include: { territory: true },
  })
  if (!target) {
    return { allowed: false, reason: 'User tidak ditemukan' }
  }

  // Self-edit selalu boleh (untuk profil sendiri)
  if (actor.id === target.id) {
    return { allowed: true, target }
  }

  // SUPERADMIN/ADMIN_DPN: bisa edit semua
  if (isDPNLevel(actor.role)) {
    return { allowed: true, target }
  }

  // ADMIN_DPD: hanya bisa edit DPC di scope-nya
  if (actor.role === 'ADMIN_DPD') {
    if (target.role !== 'ADMIN_DPC') {
      return { allowed: false, reason: 'DPD hanya bisa edit user DPC' }
    }
    const editScope = await getAccessibleTerritoryIds(actor)
    if (!editScope.isGlobal && !editScope.territoryIds.includes(target.territoryId)) {
      return { allowed: false, reason: 'User di luar jangkauan wilayah Anda' }
    }
    return { allowed: true, target }
  }

  // ADMIN_DPC: tidak bisa edit user lain
  return { allowed: false, reason: 'Admin DPC tidak punya hak edit user lain' }
}

// PATCH - update user (metadata, status, password)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getUserFromRequest(request)
    if (!actor) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Hanya SUPERADMIN/ADMIN_DPN/ADMIN_DPD yang bisa edit
    if (actor.role !== 'SUPERADMIN' && actor.role !== 'ADMIN_DPN' && actor.role !== 'ADMIN_DPD' && actor.id !== (await params).id) {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }

    const { id } = await params
    const check = await canEditUser(actor, id)
    if (!check.allowed || !check.target) {
      return NextResponse.json({ success: false, error: check.reason }, { status: 403 })
    }
    const target = check.target

    const body = await request.json()
    const { action } = body

    // === Action: activate/deactivate ===
    if (action === 'toggle_active') {
      const newActive = !target.isActive
      // Cegah self-deactivate untuk SUPERADMIN terakhir
      if (!newActive && target.role === 'SUPERADMIN') {
        const activeAdmins = await db.user.count({
          where: { role: 'SUPERADMIN', isActive: true },
        })
        if (activeAdmins <= 1) {
          return NextResponse.json(
            { success: false, error: 'Tidak bisa menonaktifkan SUPERADMIN terakhir yang aktif' },
            { status: 400 }
          )
        }
      }
      const updated = await db.user.update({
        where: { id },
        data: { isActive: newActive },
        select: { id: true, username: true, fullName: true, isActive: true },
      })
      return NextResponse.json({
        success: true,
        data: updated,
        message: `User "${updated.fullName}" ${newActive ? 'diaktifkan' : 'dinonaktifkan'}`,
      })
    }

    // === Action: reset password ===
    if (action === 'reset_password') {
      const { newPassword } = body
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password baru minimal 6 karakter' },
          { status: 400 }
        )
      }
      // TODO: hash password dengan bcrypt di produksi
      await db.user.update({
        where: { id },
        data: { password: newPassword },
      })
      return NextResponse.json({
        success: true,
        message: `Password user "${target.fullName}" berhasil direset`,
      })
    }

    // === Default action: edit metadata ===
    const { fullName, email, phone, role, territoryId, isActive } = body

    // Validate role change jika ada
    if (role !== undefined && role !== target.role) {
      // DPD tidak bisa ubah role selain ke DPC
      if (actor.role === 'ADMIN_DPD' && role !== 'ADMIN_DPC') {
        return NextResponse.json(
          { success: false, error: 'DPD hanya bisa assign role DPC' },
          { status: 403 }
        )
      }
      // Cegah downgrade SUPERADMIN terakhir
      if (target.role === 'SUPERADMIN' && role !== 'SUPERADMIN') {
        const activeAdmins = await db.user.count({
          where: { role: 'SUPERADMIN', isActive: true },
        })
        if (activeAdmins <= 1) {
          return NextResponse.json(
            { success: false, error: 'Tidak bisa mengubah role SUPERADMIN terakhir' },
            { status: 400 }
          )
        }
      }
    }

    // Validate territoryId change
    if (territoryId !== undefined && territoryId !== target.territoryId) {
      const scope = await getAccessibleTerritoryIds(actor)
      if (!scope.isGlobal && !scope.territoryIds.includes(territoryId)) {
        return NextResponse.json(
          { success: false, error: 'Anda tidak punya hak ke wilayah baru' },
          { status: 403 }
        )
      }
    }

    // Build update data (hanya field yang dikirim)
    const updateData: any = {}
    if (fullName !== undefined) updateData.fullName = String(fullName).substring(0, 200)
    if (email !== undefined) updateData.email = email || null
    if (phone !== undefined) updateData.phone = phone || null
    if (role !== undefined) updateData.role = role
    if (territoryId !== undefined) updateData.territoryId = territoryId
    if (isActive !== undefined) updateData.isActive = Boolean(isActive)

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, username: true, fullName: true, email: true, phone: true,
        role: true, isActive: true, lastLogin: true, createdAt: true,
        territory: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: `User "${updated.fullName}" berhasil diperbarui`,
    })
  } catch (e: any) {
    console.error('[User PATCH] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal update user: ${e.message}` },
      { status: 500 }
    )
  }
}

// DELETE - hapus user (hard delete, dengan safety check)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getUserFromRequest(request)
    if (!actor) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Self-delete ditolak
    if (actor.id === id) {
      return NextResponse.json(
        { success: false, error: 'Tidak bisa menghapus akun sendiri' },
        { status: 400 }
      )
    }

    // Hanya SUPERADMIN/ADMIN_DPN yang bisa hapus
    if (!isDPNLevel(actor.role)) {
      return NextResponse.json(
        { success: false, error: 'Hanya Admin DPN yang bisa menghapus user' },
        { status: 403 }
      )
    }

    const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true, fullName: true, territoryId: true } })
    if (!target) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 })
    }

    // Cegah hapus SUPERADMIN terakhir
    if (target.role === 'SUPERADMIN') {
      const activeAdmins = await db.user.count({
        where: { role: 'SUPERADMIN', isActive: true },
      })
      if (activeAdmins <= 1) {
        return NextResponse.json(
          { success: false, error: 'Tidak bisa menghapus SUPERADMIN terakhir' },
          { status: 400 }
        )
      }
    }

    // Cek apakah user punya relasi (members yang dia input, dll)
    // Untuk safety, kita hard-delete tapi Prisma akan cascade berdasarkan schema
    await db.user.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: `User "${target.fullName}" berhasil dihapus`,
    })
  } catch (e: any) {
    console.error('[User DELETE] Error:', e)
    // P2003 = foreign key constraint
    if (e.code === 'P2003') {
      return NextResponse.json(
        { success: false, error: 'User tidak bisa dihapus karena masih punya data terkait (anggota/event/dll). Nonaktifkan saja user ini.' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, error: `Gagal menghapus user: ${e.message}` },
      { status: 500 }
    )
  }
}
