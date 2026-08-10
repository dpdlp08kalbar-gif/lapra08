// LAPRA 08 - Sync YouTube videos ke Galeri Video
// Hanya video yang benar-benar tentang Laskar Prabowo 08 / LAPRA 08
import { exec } from 'child_process'
import { promisify } from 'util'
import { db } from '../src/lib/db'

const execAsync = promisify(exec)
const YTDLP_BIN = '/home/z/.venv/bin/yt-dlp'

// STRICT LAPRA 08 keywords — video harus mengandung salah satu
const LAPRA_KEYWORDS = [
  'laskar prabowo 08', 'laskar prabowo delapan', 'lapra 08', 'lapra08',
  'laskarprabowo08', 'laskar prabowo 8', 'lapra 8'
]

// Validasi: title harus mengandung minimal 1 keyword LAPRA 08
function isLapraRelated(title: string, description: string = ''): boolean {
  const text = (title + ' ' + description).toLowerCase()
  return LAPRA_KEYWORDS.some(kw => text.includes(kw))
}

// Detect kategori dari title
function detectCategory(title: string): string {
  const lower = title.toLowerCase()
  if (/\b(pelantikan|dilantik|resmikan|peresmian)\b/i.test(title)) return 'PELANTIKAN'
  if (/\b(rapat|musyawarah|meeting)\b/i.test(title)) return 'RAPAT'
  if (/\b(aksi sosial|bakti sosial|baksos|berbagi|donasi|charity)\b/i.test(title)) return 'SOSIAL'
  if (/\b(dokumenter|profile|profil|tentang)\b/i.test(title)) return 'DOKUMENTER'
  if (/\b(deklarasi|declaration)\b/i.test(title)) return 'KEGIATAN'
  return 'KEGIATAN'
}

async function searchYouTubeVideos(query: string, maxResults: number = 15): Promise<any[]> {
  // yt-dlp doesn't handle quotes in ytsearch well, so use plain text query
  const cmd = `"${YTDLP_BIN}" --flat-playlist --print "%(id)s|%(title)s|%(channel)s|%(uploader_id)s|%(upload_date)s|%(view_count)s|%(duration)s" "ytsearch${maxResults}:${query}"`
  try {
    const { stdout } = await execAsync(cmd, { timeout: 30000, maxBuffer: 5 * 1024 * 1024 })
    const lines = stdout.split('\n').filter(l => l.trim())
    return lines.map(line => {
      const parts = line.split('|')
      return {
        id: parts[0],
        title: parts[1] || '',
        channel: parts[2] || '',
        uploaderId: parts[3] || '',
        uploadDate: parts[4] || '',
        viewCount: parseInt(parts[5]) || 0,
        duration: parts[6] || '',
      }
    })
  } catch (e: any) {
    console.error('[yt-dlp] Error:', e.message)
    return []
  }
}

async function main() {
  console.log('=== SYNC Video YouTube LAPRA 08 ke Galeri Video ===\n')
  
  // Search dengan multiple queries untuk coverage maksimal
  const queries = [
    'Laskar Prabowo 08',
    'LAPRA 08',
    'Laskar Prabowo 08 Prabowo',
  ]
  
  const allVideos: any[] = []
  for (const q of queries) {
    console.log(`Searching: ${q}`)
    const results = await searchYouTubeVideos(q, 15)
    console.log(`  Found: ${results.length} videos`)
    allVideos.push(...results)
  }
  
  // Deduplicate by YouTube ID
  const seen = new Set<string>()
  const uniqueVideos = allVideos.filter(v => {
    if (seen.has(v.id)) return false
    seen.add(v.id)
    return true
  })
  
  console.log(`\nTotal unique videos found: ${uniqueVideos.length}`)
  
  // STRICT FILTER: hanya video yang mengandung keyword LAPRA 08 di title
  const lapraVideos = uniqueVideos.filter(v => isLapraRelated(v.title, ''))
  console.log(`After LAPRA 08 filter: ${lapraVideos.length} videos (rejected ${uniqueVideos.length - lapraVideos.length})`)
  console.log()
  console.log('=== LAPRA 08 related videos (filtered): ===')
  lapraVideos.forEach((v, i) => {
    console.log(`  ${i+1}. ${v.title} (${v.viewCount} views)`)
  })
  console.log()
  
  // Hapus video lama yang tidak relevan
  const deleted = await db.systemSetting.deleteMany({ where: { category: 'GALLERY_VIDEO' } })
  console.log(`Deleted old videos: ${deleted.count}`)
  
  // Insert video LAPRA 08 yang valid
  let inserted = 0
  let skipped = 0
  for (const v of lapraVideos) {
    // Skip jika tidak ada ID atau title
    if (!v.id || !v.title) { skipped++; continue }
    
    // Parse upload date
    let publishedAt: Date | null = null
    if (v.uploadDate && v.uploadDate.length === 8) {
      const y = v.uploadDate.substring(0, 4)
      const m = v.uploadDate.substring(4, 6)
      const d = v.uploadDate.substring(6, 8)
      publishedAt = new Date(`${y}-${m}-${d}`)
    }
    
    const category = detectCategory(v.title)
    const youtubeUrl = `https://www.youtube.com/watch?v=${v.id}`
    
    // Cek duplikat (by YouTube ID di value)
    const existing = await db.systemSetting.findFirst({
      where: {
        category: 'GALLERY_VIDEO',
        value: { contains: v.id }
      }
    })
    if (existing) { skipped++; continue }
    
    await db.systemSetting.create({
      data: {
        key: `gallery_video_${v.id}`,
        category: 'GALLERY_VIDEO',
        value: JSON.stringify({
          id: `gallery_video_${v.id}`,
          title: v.title,
          description: v.description ? v.description.substring(0, 500) : '',
          youtubeId: v.id,
          url: youtubeUrl,
          channel: v.channel,
          category,
          source: 'YOUTUBE_AUTO_SYNC',
          viewCount: v.viewCount,
          duration: v.duration,
          publishedAt: publishedAt?.toISOString(),
          isActive: true,
          createdAt: new Date().toISOString(),
        }),
      },
    })
    inserted++
    console.log(`✅ Inserted: ${v.title.substring(0, 80)}...`)
  }
  
  console.log(`\n=== SUMMARY ===`)
  console.log(`Total found: ${uniqueVideos.length}`)
  console.log(`LAPRA 08 related: ${lapraVideos.length}`)
  console.log(`Inserted: ${inserted}`)
  console.log(`Skipped (duplicate/invalid): ${skipped}`)
  
  // Show all inserted videos
  const allInDb = await db.systemSetting.findMany({ where: { category: 'GALLERY_VIDEO' } })
  console.log(`\nTotal videos in DB: ${allInDb.length}`)
  console.log()
  allInDb.forEach((item, i) => {
    try {
      const v = JSON.parse(item.value)
      console.log(`--- Video #${i + 1} ---`)
      console.log(`  Title: ${v.title}`)
      console.log(`  YouTube ID: ${v.youtubeId}`)
      console.log(`  Channel: ${v.channel}`)
      console.log(`  Category: ${v.category}`)
      console.log(`  Views: ${v.viewCount}`)
      console.log(`  URL: ${v.url}`)
      console.log()
    } catch {}
  })
}

main().catch(e => { console.error(e); process.exit(1) })
.finally(async () => { await db.$disconnect() })
