// LAPRA 08 - PUBLIC API: Video untuk landing page (no auth, read-only)
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const items = await db.systemSetting.findMany({
      where: { category: 'GALLERY_VIDEO' },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    })
    const videos = items.map(item => {
      try { return JSON.parse(item.value) } catch { return null }
    }).filter(Boolean).filter((v: any) => v.isActive !== false)
    return NextResponse.json({ success: true, data: videos })
  } catch {
    return NextResponse.json({ success: true, data: [] })
  }
}
