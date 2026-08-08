// LAPRA 08 - API: Gallery [id] - Delete single item
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
  const { id } = await params

  const item = await db.systemSetting.findUnique({ where: { key: id } })
  if (!item) {
    return NextResponse.json({ success: false, error: 'Item tidak ditemukan' }, { status: 404 })
  }

  // Delete file (gallery photo OR uploaded video)
  try {
    const data = JSON.parse(item.value)
    if (data.fileUrl) {
      const filePath = path.join(process.cwd(), 'public', data.fileUrl.replace(/^\//, ''))
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    if (data.videoType === 'UPLOAD' && data.videoUrl) {
      const filePath = path.join(process.cwd(), 'public', data.videoUrl.replace(/^\//, ''))
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
  } catch {}

  await db.systemSetting.delete({ where: { key: id } })
  return NextResponse.json({ success: true, message: 'Item dihapus' })
}
