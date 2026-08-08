// LAPRA 08 - API: Gallery Bookmarks (Arsip Berita Penting)
// Pinned/bookmarked announcements as "Arsip Berita Penting"
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// GET /api/gallery/bookmarks - List bookmarked berita
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Get all bookmarks
  const items = await db.systemSetting.findMany({
    where: { category: 'BERITA_BOOKMARK' },
    orderBy: { updatedAt: 'desc' },
  })

  const bookmarks = items.map((item) => {
    try { return JSON.parse(item.value) } catch { return null }
  }).filter(Boolean)

  // Get full announcement data
  const announcementIds = bookmarks.map((b: any) => b.announcementId).filter(Boolean)
  if (announcementIds.length === 0) {
    return NextResponse.json({ success: true, data: [] })
  }

  const announcements = await db.announcement.findMany({
    where: { id: { in: announcementIds } },
    include: { territory: true },
  })

  // Merge bookmark metadata with announcement data
  const result = bookmarks.map((b: any) => {
    const ann = announcements.find((a) => a.id === b.announcementId)
    if (!ann) return null
    return {
      ...ann,
      bookmarkedAt: b.bookmarkedAt,
      bookmarkedBy: b.bookmarkedBy,
      bookmarkNote: b.note || null,
      bookmarkCategory: b.category || 'PENTING',
    }
  }).filter(Boolean)

  return NextResponse.json({ success: true, data: result })
}

// POST /api/gallery/bookmarks - Add bookmark
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { announcementId, note, category } = body

    if (!announcementId) {
      return NextResponse.json({ success: false, error: 'ID berita wajib' }, { status: 400 })
    }

    const ann = await db.announcement.findUnique({ where: { id: announcementId } })
    if (!ann) {
      return NextResponse.json({ success: false, error: 'Berita tidak ditemukan' }, { status: 404 })
    }

    const bookmarkData = {
      id: `bm_${announcementId}`,
      announcementId,
      note: note || '',
      category: category || 'PENTING', // PENTING | SEJARAH | MILESTONE | REFERENSI
      bookmarkedBy: user.fullName,
      bookmarkedAt: new Date().toISOString(),
    }

    await db.systemSetting.upsert({
      where: { key: bookmarkData.id },
      update: { value: JSON.stringify(bookmarkData), category: 'BERITA_BOOKMARK' },
      create: {
        key: bookmarkData.id,
        value: JSON.stringify(bookmarkData),
        category: 'BERITA_BOOKMARK',
        description: `Bookmark: ${ann.title.substring(0, 60)}`,
      },
    })

    return NextResponse.json({ success: true, data: bookmarkData, message: 'Berita ditambahkan ke arsip penting' })
  } catch (e: any) {
    console.error('[Bookmark Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE /api/gallery/bookmarks?id=... - Remove bookmark
export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ success: false, error: 'ID bookmark wajib' }, { status: 400 })
  }

  await db.systemSetting.deleteMany({ where: { key: id, category: 'BERITA_BOOKMARK' } })

  return NextResponse.json({ success: true, message: 'Bookmark dihapus' })
}
