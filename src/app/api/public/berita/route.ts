// LAPRA 08 - PUBLIC API: Berita untuk landing page (no auth, read-only)
// GET /api/public/berita - Return 5 berita terbaru untuk publik
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const news = await db.announcement.findMany({
      where: { isActive: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        source: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ success: true, data: news })
  } catch {
    return NextResponse.json({ success: true, data: [] })
  }
}
