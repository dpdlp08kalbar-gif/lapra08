// LAPRA 08 - API: Gallery Videos (YouTube embeds + MP4 uploads)
// STRICT FILTER: Hanya video tentang Laskar Prabowo 08 / LAPRA 08 yang diperbolehkan
// Auto-sync dari YouTube via yt-dlp juga tersedia
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)
const YTDLP_BIN = '/home/z/.venv/bin/yt-dlp'

// STRICT LAPRA 08 keywords — video title/description harus mengandung salah satu
const LAPRA_KEYWORDS = [
  'laskar prabowo 08', 'laskar prabowo delapan', 'lapra 08', 'lapra08',
  'laskarprabowo08', 'laskar prabowo 8', 'lapra 8', 'hashim laskar prabowo'
]

function isLapraRelated(title: string, description: string = ''): boolean {
  const text = (title + ' ' + description).toLowerCase()
  return LAPRA_KEYWORDS.some(kw => text.includes(kw))
}

function detectCategory(title: string): string {
  if (/\b(pelantikan|dilantik|resmikan|peresmian)\b/i.test(title)) return 'PELANTIKAN'
  if (/\b(rapat|musyawarah|meeting)\b/i.test(title)) return 'RAPAT'
  if (/\b(aksi sosial|bakti sosial|baksos|berbagi|donasi|charity)\b/i.test(title)) return 'SOSIAL'
  if (/\b(dokumenter|profile|profil|tentang)\b/i.test(title)) return 'DOKUMENTER'
  if (/\b(deklarasi|declaration)\b/i.test(title)) return 'KEGIATAN'
  return 'KEGIATAN'
}

// Extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/ // just the ID
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

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
      // JSON: YouTube embed link OR sync action
      const body = await request.json()

      // === AUTO-SYNC dari YouTube via yt-dlp ===
      if (body.action === 'sync_youtube') {
        if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
          return NextResponse.json({ success: false, error: 'Hanya DPN/Superadmin yang bisa sync video' }, { status: 403 })
        }
        return await syncYouTubeVideos()
      }

      // === Manual add video (YouTube URL) ===
      const { title, description, category, youtubeUrl } = body

      if (!youtubeUrl) return NextResponse.json({ success: false, error: 'URL YouTube wajib' }, { status: 400 })

      // Extract YouTube video ID
      const youtubeId = extractYouTubeId(youtubeUrl)
      if (!youtubeId) {
        return NextResponse.json({ success: false, error: 'URL YouTube tidak valid' }, { status: 400 })
      }

      // === STRICT FILTER: Validate video terkait LAPRA 08 ===
      const videoTitle = title || `Video YouTube ${youtubeId}`
      const videoDesc = description || ''
      if (!isLapraRelated(videoTitle, videoDesc)) {
        return NextResponse.json({
          success: false,
          error: `Video ditolak: judul/deskripsi tidak mengandung keyword "Laskar Prabowo 08", "LAPRA 08", atau varian lainnya. Galeri Video hanya menerima video terkait LAPRA 08 / Laskar Prabowo 08 / momen kegiatan positif organisasi.`,
        }, { status: 400 })
      }

      videoData = {
        id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: videoTitle,
        description: videoDesc,
        category: category || detectCategory(videoTitle),
        videoType: 'YOUTUBE',
        youtubeId,
        youtubeUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
        embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
        thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
        source: 'MANUAL',
        uploadedBy: user.fullName,
        uploadedAt: new Date().toISOString(),
        isActive: true,
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

// === AUTO-SYNC YouTube videos tentang LAPRA 08 ===
// Hanya video yang title-nya mengandung keyword LAPRA 08 yang akan disimpan
async function syncYouTubeVideos(): Promise<NextResponse> {
  try {
    const queries = ['Laskar Prabowo 08', 'LAPRA 08', 'Laskar Prabowo 08 Prabowo']
    const allVideos: any[] = []

    for (const q of queries) {
      const cmd = `"${YTDLP_BIN}" --flat-playlist --print "%(id)s|%(title)s|%(channel)s|%(uploader_id)s|%(upload_date)s|%(view_count)s|%(duration)s" "ytsearch15:${q}"`
      try {
        const { stdout } = await execAsync(cmd, { timeout: 30000, maxBuffer: 5 * 1024 * 1024 })
        const lines = stdout.split('\n').filter(l => l.trim())
        for (const line of lines) {
          const parts = line.split('|')
          allVideos.push({
            id: parts[0],
            title: parts[1] || '',
            channel: parts[2] || '',
            uploadDate: parts[4] || '',
            viewCount: parseInt(parts[5]) || 0,
            duration: parts[6] || '',
          })
        }
      } catch (e: any) {
        console.error(`[yt-dlp] Query "${q}" failed:`, e.message)
      }
    }

    // Deduplicate
    const seen = new Set<string>()
    const uniqueVideos = allVideos.filter(v => {
      if (!v.id || seen.has(v.id)) return false
      seen.add(v.id)
      return true
    })

    // STRICT FILTER: hanya video LAPRA 08
    const lapraVideos = uniqueVideos.filter(v => isLapraRelated(v.title))

    // Insert ke DB (skip duplicates)
    let inserted = 0
    let skipped = 0
    for (const v of lapraVideos) {
      // Cek duplikat
      const existing = await db.systemSetting.findFirst({
        where: { category: 'GALLERY_VIDEO', value: { contains: v.id } }
      })
      if (existing) { skipped++; continue }

      let publishedAt: Date | null = null
      if (v.uploadDate && v.uploadDate.length === 8) {
        publishedAt = new Date(`${v.uploadDate.substring(0,4)}-${v.uploadDate.substring(4,6)}-${v.uploadDate.substring(6,8)}`)
      }

      await db.systemSetting.create({
        data: {
          key: `gallery_video_${v.id}`,
          category: 'GALLERY_VIDEO',
          value: JSON.stringify({
            id: `gallery_video_${v.id}`,
            title: v.title,
            description: '',
            youtubeId: v.id,
            url: `https://www.youtube.com/watch?v=${v.id}`,
            youtubeUrl: `https://www.youtube.com/watch?v=${v.id}`,
            embedUrl: `https://www.youtube.com/embed/${v.id}`,
            thumbnail: `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`,
            channel: v.channel,
            category: detectCategory(v.title),
            source: 'YOUTUBE_AUTO_SYNC',
            viewCount: v.viewCount,
            duration: v.duration,
            publishedAt: publishedAt?.toISOString(),
            isActive: true,
            createdAt: new Date().toISOString(),
          }),
          description: `Video: ${v.title}`,
        },
      })
      inserted++
    }

    return NextResponse.json({
      success: true,
      message: `Sync selesai. ${uniqueVideos.length} video ditemukan di YouTube, ${lapraVideos.length} terkait LAPRA 08, ${inserted} baru disimpan, ${skipped} duplikat dilewati.`,
      data: { totalFound: uniqueVideos.length, lapraRelated: lapraVideos.length, inserted, skipped },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
