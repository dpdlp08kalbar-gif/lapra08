// LAPRA 08 - API: SK [id] - Update & Delete
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds } from '@/lib/server-helpers'
import * as fs from 'fs'
import * as path from 'path'

// PUT - Update SK
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
    const { skNumber, title, description, issuedAt, issuedBy, territoryId } = body

    const existing = await db.sKDocument.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'SK tidak ditemukan' }, { status: 404 })
    }

    // Cek hak edit territory lama & baru
    const editScope = await getEditableTerritoryIds(user)
    if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(existing.territoryId)) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Read-only untuk wilayah ini' },
        { status: 403 }
      )
    }
    if (territoryId && territoryId !== existing.territoryId) {
      if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(territoryId)) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak: Tidak bisa pindah ke wilayah ini' },
          { status: 403 }
        )
      }
    }

    const updated = await db.sKDocument.update({
      where: { id },
      data: {
        skNumber: skNumber || undefined,
        title: title || undefined,
        description,
        issuedAt: issuedAt ? new Date(issuedAt) : undefined,
        issuedBy: issuedBy || undefined,
        territoryId: territoryId || undefined,
      },
      include: { territory: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE - Hapus SK (juga hapus file)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const existing = await db.sKDocument.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ success: false, error: 'SK tidak ditemukan' }, { status: 404 })
  }

  // Cek hak edit
  const editScope = await getEditableTerritoryIds(user)
  if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(existing.territoryId)) {
    return NextResponse.json(
      { success: false, error: 'Akses ditolak: Read-only untuk wilayah ini' },
      { status: 403 }
    )
  }

  // Hapus file fisik jika ada
  try {
    const filePath = path.join(process.cwd(), 'public', existing.fileUrl.replace(/^\//, ''))
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (e) {
    // Ignore file deletion errors
  }

  await db.sKDocument.delete({ where: { id } })
  return NextResponse.json({ success: true, message: 'SK berhasil dihapus' })
}
