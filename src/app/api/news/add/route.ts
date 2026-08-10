// LAPRA 08 - API: News Add (Manual single news from web)
// POST /api/news/add { title, content, sourceUrl, sourceName, publishedTime, imageUrl, photoUrl }
//   → add single Announcement with source=WEB_SYNC
//   Only SUPERADMIN/ADMIN_DPN. Check duplicate by sourceUrl.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    return NextResponse.json(
      { success: false, error: 'Hanya Super Admin / Admin DPN yang dapat menambah berita dari web' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const {
      title,
      content,
      sourceUrl,
      sourceName,
      publishedTime,
      imageUrl,
      photoUrl,
      territoryId,
      description,
    } = body

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Judul dan konten wajib diisi' },
        { status: 400 }
      )
    }

    if (!sourceUrl) {
      return NextResponse.json(
        { success: false, error: 'URL sumber wajib diisi' },
        { status: 400 }
      )
    }

    // Anti-duplikasi: cek sourceUrl
    const existing = await db.announcement.findFirst({
      where: { sourceUrl },
      select: { id: true, title: true },
    })
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Berita dengan URL ini sudah ada di sistem (judul: "${existing.title}")`,
          existingId: existing.id,
        },
        { status: 409 }
      )
    }

    // Resolve target territory
    let targetTerritoryId = territoryId
    if (!targetTerritoryId) {
      // Default ke Indonesia DPN
      const indonesia = await db.territory.findFirst({
        where: { code: 'ID', level: 'COUNTRY' },
      })
      if (!indonesia) {
        return NextResponse.json(
          { success: false, error: 'Territory default (Indonesia) tidak ditemukan' },
          { status: 500 }
        )
      }
      targetTerritoryId = indonesia.id
    }

    // Determine sourceName: prefer explicit, fallback to host
    let finalSourceName = sourceName || ''
    if (!finalSourceName && sourceUrl) {
      try {
        finalSourceName = new URL(sourceUrl).hostname.replace(/^www\./, '')
      } catch {
        finalSourceName = 'Web'
      }
    }

    // Build content with attribution
    let finalContent = content
    if (description && description.trim() && !content.includes(description.trim().substring(0, 80))) {
      // prepend description as lead if not already in content
      finalContent = `${description.trim()}\n\n${content}`
    }
    finalContent = `${finalContent}\n\nSumber: ${finalSourceName}\nURL: ${sourceUrl}`

    // Use provided photoUrl or fall back to imageUrl (extracted from article)
    const finalPhotoUrl = photoUrl || imageUrl || null

    // Parse publishedTime
    const publishDate = publishedTime ? new Date(publishedTime) : new Date()
    if (isNaN(publishDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Format publishedTime tidak valid' },
        { status: 400 }
      )
    }

    const created = await db.announcement.create({
      data: {
        title,
        content: finalContent,
        type: 'INFO',
        category: 'BERITA',
        isPinned: false,
        isActive: true,
        photoUrl: finalPhotoUrl,
        publishDate,
        source: 'WEB_SYNC',
        sourceUrl,
        sourceName: finalSourceName,
        territoryId: targetTerritoryId,
        createdById: user.id,
      },
      include: { territory: true, createdBy: { select: { id: true, fullName: true } } },
    })

    return NextResponse.json({
      success: true,
      data: created,
      message: `Berita "${created.title}" berhasil ditambahkan dari web`,
    })
  } catch (e: any) {
    console.error('[News Add Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
