// LAPRA 08 - API: Broadcasts [id] - Update & Delete
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds } from '@/lib/server-helpers'
import * as fs from 'fs'
import * as path from 'path'

// Helper: delete a file stored under /public if it's a local upload
function deleteLocalFile(url: string | null | undefined) {
  if (!url) return
  try {
    const filePath = path.join(process.cwd(), 'public', url.replace(/^\//, ''))
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch {
    // ignore
  }
}

// PUT - Update broadcast
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const body = await request.json()
    const {
      title,
      message,
      channel,
      channels,
      status,
      targetScope,
      imageUrl,
      videoUrl,
      linkUrl,
      scheduledAt,
      recipientCount,
    } = body

    const existing = await db.broadcast.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Broadcast tidak ditemukan' },
        { status: 404 }
      )
    }

    // Permission check: user must be able to edit the territory of the sender
    const editScope = await getEditableTerritoryIds(user)
    if (!editScope.isGlobalEdit) {
      // sentBy.territoryId must be in editable scope
      const sender = await db.user.findUnique({
        where: { id: existing.sentById },
        select: { territoryId: true },
      })
      if (!sender || !editScope.territoryIds.includes(sender.territoryId)) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak: Anda tidak bisa edit broadcast ini' },
          { status: 403 }
        )
      }
    }
    // Only the original sender (or DPN-level admin) may edit
    const isOwner = existing.sentById === user.id
    const isDPN = user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN'
    if (!isOwner && !isDPN) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya pengirim atau admin DPN yang dapat mengubah broadcast' },
        { status: 403 }
      )
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (message !== undefined) updateData.message = message
    if (channel !== undefined) updateData.channel = channel
    if (channels !== undefined) updateData.channels = channels
    if (status !== undefined) updateData.status = status
    if (targetScope !== undefined) updateData.targetScope = JSON.stringify(targetScope)
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl
    if (linkUrl !== undefined) updateData.linkUrl = linkUrl
    if (recipientCount !== undefined) updateData.recipientCount = recipientCount
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null
    }

    const updated = await db.broadcast.update({
      where: { id },
      data: updateData,
      include: { sentBy: { include: { territory: true } } },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) {
    console.error('[Broadcast PUT Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE - Delete broadcast + cleanup files (image, video)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const existing = await db.broadcast.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Broadcast tidak ditemukan' },
        { status: 404 }
      )
    }

    // Permission: DPN-level admin OR owner
    const isOwner = existing.sentById === user.id
    const isDPN = user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN'
    if (!isOwner && !isDPN) {
      // For non-DPN, must have edit scope on the sender's territory
      const editScope = await getEditableTerritoryIds(user)
      const sender = await db.user.findUnique({
        where: { id: existing.sentById },
        select: { territoryId: true },
      })
      if (!sender || !editScope.territoryIds.includes(sender.territoryId)) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak: Anda tidak bisa menghapus broadcast ini' },
          { status: 403 }
        )
      }
    }

    // Cleanup associated files (uploaded image/video)
    deleteLocalFile(existing.imageUrl)
    deleteLocalFile(existing.videoUrl)

    await db.broadcast.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: 'Broadcast berhasil dihapus',
    })
  } catch (e: any) {
    console.error('[Broadcast DELETE Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
