// LAPRA 08 - API: Announcement [id] - Update & Delete
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds } from '@/lib/server-helpers'

// Pastikan route berjalan di Node.js runtime (bukan Edge), selalu dynamic
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// PUT - Update announcement
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params

    const body = await request.json()
    const { title, content, type, category, isPinned, isActive, photoUrl, publishDate, territoryId } = body

    const existing = await db.announcement.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Berita tidak ditemukan' }, { status: 404 })
    }

    // RBAC check: hanya creator atau admin DPN/terkait yang boleh edit
    const isOwner = existing.createdById === user.id
    const isDPN = user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN'
    if (!isOwner && !isDPN) {
      const editScope = await getEditableTerritoryIds(user)
      if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(existing.territoryId)) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak: Anda tidak bisa edit berita di wilayah ini' },
          { status: 403 }
        )
      }
    }

    const updated = await db.announcement.update({
      where: { id },
      data: {
        title: title || undefined,
        content: content || undefined,
        type: type || undefined,
        category: category || undefined,
        isPinned: typeof isPinned === 'boolean' ? isPinned : undefined,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
        photoUrl: photoUrl !== undefined ? photoUrl : undefined,
        publishDate: publishDate ? new Date(publishDate) : undefined,
        territoryId: territoryId || undefined,
      },
      include: { territory: true, createdBy: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) {
    console.error('[Announcement PUT] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal memperbarui berita: ${e.message}` },
      { status: 500 }
    )
  }
}

// DELETE - Delete announcement (admin bisa hapus berita yg tidak penting)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params

    const existing = await db.announcement.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Berita tidak ditemukan' }, { status: 404 })
    }

    // RBAC check: hanya creator atau admin DPN/terkait yang boleh hapus
    const isOwner = existing.createdById === user.id
    const isDPN = user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN'
    if (!isOwner && !isDPN) {
      const editScope = await getEditableTerritoryIds(user)
      if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(existing.territoryId)) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak: Anda tidak bisa menghapus berita di wilayah ini' },
          { status: 403 }
        )
      }
    }

    await db.announcement.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Berita berhasil dihapus' })
  } catch (e: any) {
    console.error('[Announcement DELETE] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal menghapus berita: ${e.message}` },
      { status: 500 }
    )
  }
}
