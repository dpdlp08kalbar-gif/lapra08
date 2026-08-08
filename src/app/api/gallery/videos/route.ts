// LAPRA 08 - API: Gallery Videos (YouTube embeds + MP4 uploads)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import * as fs from 'fs'
import * as path from 'path'

// GET /api/gallery/videos - List all videos
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const items = await db.systemSetting.findMany({
    where: { category: 'GALLERY_VIDEO' },
    orderBy: { updatedAt: 'desc' },
  })

  const videos = items.map((item) => {
    try { return JSON.parse(item.value) } catch { return null }
  }).filter(Boolean)

  return NextResponse.json({ success: true, data: videos })
}

// POST /api/gallery/videos - Add video (YouTube link) or upload MP4
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') || ''

  try {
    let videoData: any = {}

    if (contentType.includes('multipart/form-data')) {
      // MP4 file upload
      const formData = await request.formData()
      const file = formData.get('file') as File
      const title = formData.get('title') as string
      const description = formData.get('description') as string
      const category = formData.get('category') as string || 'KEGIATAN'

      if (!file) return NextResponse.json({ success: false, error: 'File video wajib' }, { status: 400 })

      if (!file.type.startsWith('video/')) {
        return NextResponse.json({ success: false, error: 'File harus berupa video (MP4/WebM)' }, { status: 400 })
      }

      if (file.size > 100 * 1024 * 1024) {
        return NextResponse.json({ success: false, error: 'Ukuran video maksimal 100MB' }, { status: 400 })
      }

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'videos')
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = path.join(uploadDir, fileName)
      const fileBuffer = Buffer.from(await file.arrayBuffer())
      fs.writeFileSync(filePath, fileBuffer)

      videoData = {
        id: `vid_${Date.now()}`,
        title: title || file.name,
        description: description || '',
        category,
        videoType: 'UPLOAD',
        videoUrl: `/uploads/videos/${fileName}`,
        thumbnail: null,
        duration: null,
        uploadedBy: user.fullName,
        uploadedAt: new Date().toISOString(),
      }
    } else {
      // JSON: YouTube embed link
      const body = await request.json()
      const { title, description, category, youtubeUrl } = body

      if (!youtubeUrl) return NextResponse.json({ success: false, error: 'URL YouTube wajib' }, { status: 400 })

      // Extract YouTube video ID
      let youtubeId: string | null = null
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      ]
      for (const p of patterns) {
        const m = youtubeUrl.match(p)
        if (m) { youtubeId = m[1]; break }
      }

      if (!youtubeId) {
        return NextResponse.json({ success: false, error: 'URL YouTube tidak valid' }, { status: 400 })
      }

      videoData = {
        id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: title || `Video YouTube ${youtubeId}`,
        description: description || '',
        category: category || 'KEGIATAN',
        videoType: 'YOUTUBE',
        youtubeId,
        youtubeUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
        embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
        thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
        uploadedBy: user.fullName,
        uploadedAt: new Date().toISOString(),
      }
    }

    await db.systemSetting.create({
      data: {
        key: videoData.id,
        value: JSON.stringify(videoData),
        category: 'GALLERY_VIDEO',
        description: `Video: ${videoData.title}`,
      },
    })

    return NextResponse.json({ success: true, data: videoData, message: 'Video berhasil ditambahkan' })
  } catch (e: any) {
    console.error('[Gallery Video Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
