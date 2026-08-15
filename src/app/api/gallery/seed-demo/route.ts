// LAPRA 08 - API: Seed Demo Gallery (Foto + Video + Arsip Berita)
// POST /api/gallery/seed-demo — generate sample data dummy untuk Galeri Media
// Menggunakan Z.AI image generation (API Vercel gratis via z-ai-web-dev-sdk)
//
// Akses: SuperAdmin only (security)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Hanya SuperAdmin yang bisa seed data demo
  if (user.role !== 'SUPERADMIN') {
    return NextResponse.json({
      success: false,
      error: 'Akses ditolak. Hanya Super Admin yang dapat generate data demo.'
    }, { status: 403 })
  }

  try {
    let photosGenerated = 0
    let videosGenerated = 0
    let bookmarksGenerated = 0
    const errors: string[] = []

    // ============================================================
    // 1. SEED GALERI FOTO (6 foto) — generate via Z.AI image API
    // ============================================================
    const photoPrompts = [
      { title: 'Rapat Koordinasi DPN LAPRA 08 2026', category: 'KEGIATAN', location: 'Jakarta',
        prompt: 'Professional photograph of Indonesian political organization meeting, formal conference room with red and orange banners, people in batik shirts seated around long table, document folders, Indonesian flag, warm lighting, photojournalism style, high quality' },
      { title: 'Pelantikan Pengurus DPD Kalimantan Barat', category: 'PELANTIKAN', location: 'Pontianak',
        prompt: 'Indonesian political organization inauguration ceremony, officials in formal black suits taking oath, stage with red backdrop, Indonesian flag, audience seated, official photographer capturing moment, photojournalism style' },
      { title: 'Aksi Sosial Bakti Darah LAPRA 08', category: 'SOSIAL', location: 'Bandung',
        prompt: 'Indonesian community blood donation event, volunteers in red t-shirts helping donors, blood bank mobile unit, banner with Indonesian text, friendly atmosphere, photojournalism style, warm lighting' },
      { title: 'Sosialisasi Asta Cita di DPC Kabupaten', category: 'SOSIALISASI', location: 'Yogyakarta',
        prompt: 'Indonesian community gathering in rural village hall, speaker at podium with projector showing presentation, villagers seated on plastic chairs, banner with Indonesian text, daytime photo, documentary style' },
      { title: 'Kegiatan Pemberdayaan Ummat LAPRA 08', category: 'SOSIAL', location: 'Surabaya',
        prompt: 'Indonesian charity event, volunteers distributing aid packages to families in need, boxes of food and essentials, banner with Indonesian text, community center setting, photojournalism style' },
      { title: 'Deklarasi Kader Baru Laskar Prabowo 08', category: 'PELANTIKAN', location: 'Semarang',
        prompt: 'Indonesian political rally, large crowd of supporters in red shirts with raised fists, stage with speakers, Indonesian flags waving, outdoor venue, photojournalism style, dramatic lighting' },
    ]

    // Generate setiap foto via Z.AI image API
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    for (const photo of photoPrompts) {
      try {
        const response = await zai.images.generations.create({
          prompt: photo.prompt,
          size: '1344x768', // landscape
        })

        if (!response.data || !response.data[0] || !response.data[0].base64) {
          throw new Error('Invalid response dari image API')
        }

        const imageBase64 = response.data[0].base64
        const dataUrl = `data:image/png;base64,${imageBase64}`

        const id = `gallery_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        await db.systemSetting.create({
          data: {
            key: id,
            value: JSON.stringify({
              id,
              title: photo.title,
              category: photo.category,
              location: photo.location,
              imageUrl: dataUrl,
              thumbnailUrl: dataUrl,
              uploadedBy: user.fullName,
              uploadedAt: new Date().toISOString(),
              description: `${photo.title} — dokumentasi kegiatan resmi LAPRA 08 di ${photo.location}`,
              source: 'SEED_DEMO',
            }),
            category: 'GALLERY',
            description: `Galeri Foto: ${photo.title}`,
          },
        })
        photosGenerated++
      } catch (e: any) {
        errors.push(`Foto "${photo.title}": ${e.message}`)
      }
    }

    // ============================================================
    // 2. SEED GALERI VIDEO (4 video YouTube embed)
    // ============================================================
    const demoVideos = [
      {
        id: `video_${Date.now()}_1`,
        title: 'Profile LAPRA 08 — Laskar Prabowo 08',
        description: 'Video profil resmi Laskar Prabowo 08 (LAPRA 08) — organisasi pendukung program pemerintahan Presiden Prabowo Subianto.',
        category: 'DOKUMENTER',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        source: 'SEED_DEMO',
        uploadedBy: user.fullName,
        uploadedAt: new Date().toISOString(),
      },
      {
        id: `video_${Date.now()}_2`,
        title: 'Pelantikan Pengurus DPN LAPRA 08 Periode 2024-2029',
        description: 'Dokumentasi pelantikan pengurus Dewan Pimpinan Nasional LAPRA 08 periode 2024-2029 di Jakarta.',
        category: 'PELANTIKAN',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        source: 'SEED_DEMO',
        uploadedBy: user.fullName,
        uploadedAt: new Date().toISOString(),
      },
      {
        id: `video_${Date.now()}_3`,
        title: 'Aksi Sosial Bakti Darah LAPRA 08',
        description: 'Kegiatan bakti sosial donor darah yang diselenggarakan oleh DPC LAPRA 08 bersama PMI setempat.',
        category: 'SOSIAL',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        source: 'SEED_DEMO',
        uploadedBy: user.fullName,
        uploadedAt: new Date().toISOString(),
      },
      {
        id: `video_${Date.now()}_4`,
        title: 'Sosialisasi Asta Cita Presiden Prabowo',
        description: 'Sosialisasi 8 program prioritas (Asta Cita) Presiden Prabowo Subianto ke seluruh DPD se-Indonesia.',
        category: 'SOSIALISASI',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        source: 'SEED_DEMO',
        uploadedBy: user.fullName,
        uploadedAt: new Date().toISOString(),
      },
    ]

    for (const video of demoVideos) {
      try {
        await db.systemSetting.create({
          data: {
            key: video.id,
            value: JSON.stringify(video),
            category: 'GALLERY_VIDEO',
            description: `Video: ${video.title}`,
          },
        })
        videosGenerated++
      } catch (e: any) {
        errors.push(`Video "${video.title}": ${e.message}`)
      }
    }

    // ============================================================
    // 3. SEED ARSIP BERITA PENTING (3 berita)
    // ============================================================
    const demoBookmarks = [
      {
        id: `bm_${Date.now()}_1`,
        announcementId: `ann_${Date.now()}_1`,
        title: 'LAPRA 08 Resmi Dideklarasikan sebagai Organisasi Pendukung Pemerintah',
        content: 'Perkumpulan Laskar Prabowo 08 (LAPRA 08) telah resmi dideklarasikan sebagai organisasi massa pendukung pemerintahan Presiden Prabowo Subianto. Deklarasi dilakukan dalam acara yang dihadiri oleh ribuan kader dari 38 provinsi se-Indonesia dan 5 negara di luar negeri. Ketua Dewan Pembina Dr. (HC) Hashim S. Djojohadikusumo menegaskan komitmen organisasi untuk mendukung pelaksanaan Asta Cita pemerintahan.',
        bookmarkCategory: 'SEJARAH',
        bookmarkNote: 'Berita deklarasi resmi LAPRA 08 — milestone bersejarah organisasi',
        sourceUrl: 'https://example.com/news/declaration',
        sourceName: 'Media Online',
        source: 'SEED_DEMO',
        bookmarkedBy: user.fullName,
        bookmarkedAt: new Date().toISOString(),
      },
      {
        id: `bm_${Date.now()}_2`,
        title: 'Penandatanganan MoU Kemitraan LAPRA 08 dengan Kementerian Sosial',
        content: 'LAPRA 08 menandatangani Nota Kesepahaman (MoU) dengan Kementerian Sosial RI untuk program pemberdayaan masyarakat dan penanganan kemiskinan ekstrem. Kerja sama ini mencakup distribusi bantuan sosial di 38 provinsi dan pelatihan kader pemberdayaan masyarakat.',
        bookmarkCategory: 'MILESTONE',
        bookmarkNote: 'MoU strategis dengan Kementerian Sosial — tonggak kemitraan pemerintah',
        sourceUrl: 'https://example.com/news/mou-kemsos',
        sourceName: 'Antara News',
        source: 'SEED_DEMO',
        bookmarkedBy: user.fullName,
        bookmarkedAt: new Date().toISOString(),
      },
      {
        id: `bm_${Date.now()}_3`,
        title: 'Asta Cita Presiden Prabowo — 8 Program Prioritas 2024-2029',
        content: 'Presiden Prabowo Subianto menetapkan 8 program prioritas (Asta Cita) untuk periode pemerintahan 2024-2029. LAPRA 08 sebagai organisasi pendukung berkomitmen mensosialisasikan dan mendukung pelaksanaan 8 program tersebut di seluruh Indonesia melalui jaringan DPD dan DPC.',
        bookmarkCategory: 'REFERENSI',
        bookmarkNote: 'Dokumen referensi Asta Cita — panduan program kerja LAPRA 08',
        sourceUrl: 'https://example.com/news/asta-cita',
        sourceName: 'Setneg RI',
        source: 'SEED_DEMO',
        bookmarkedBy: user.fullName,
        bookmarkedAt: new Date().toISOString(),
      },
    ]

    for (const bookmark of demoBookmarks) {
      try {
        await db.systemSetting.create({
          data: {
            key: bookmark.id,
            value: JSON.stringify(bookmark),
            category: 'NEWS_BOOKMARK',
            description: `Arsip Berita: ${bookmark.title.substring(0, 60)}`,
          },
        })
        bookmarksGenerated++
      } catch (e: any) {
        errors.push(`Bookmark "${bookmark.title}": ${e.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        photosGenerated,
        videosGenerated,
        bookmarksGenerated,
        totalGenerated: photosGenerated + videosGenerated + bookmarksGenerated,
        errors: errors.length > 0 ? errors : undefined,
      },
      message: `Berhasil generate ${photosGenerated} foto, ${videosGenerated} video, dan ${bookmarksGenerated} berita arsip. Refresh halaman untuk melihat data.`,
    })
  } catch (e: any) {
    console.error('[Seed Demo Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
