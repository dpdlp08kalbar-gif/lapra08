// LAPRA 08 - API: Profile Documents [id] - Delete document + file
// DELETE /api/profile-documents/[id] - delete document (SUPERADMIN only)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import * as fs from 'fs'
import * as path from 'path'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'SUPERADMIN') {
    return NextResponse.json(
      { success: false, error: 'Hanya Super Admin yang dapat menghapus dokumen profil' },
      { status: 403 }
    )
  }

  try {
    const { id } = await params

    // Profile documents are stored in SystemSetting by key (could be the doc id directly)
    // Try by key first; fallback to findById (in case id is the SystemSetting id)
    let item = await db.systemSetting.findUnique({ where: { key: id } })
    if (!item) {
      item = await db.systemSetting.findUnique({ where: { id } })
    }

    if (!item || item.category !== 'PROFILE_DOCUMENT') {
      return NextResponse.json(
        { success: false, error: 'Dokumen profil tidak ditemukan' },
        { status: 404 }
      )
    }

    // File is stored as base64 in DB value — no disk file to delete
    // Just delete the DB record

    await db.systemSetting.delete({ where: { id: item.id } })

    return NextResponse.json({
      success: true,
      message: 'Dokumen profil berhasil dihapus',
    })
  } catch (e: any) {
    console.error('[Profile Documents DELETE Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
