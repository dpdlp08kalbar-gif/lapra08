// LAPRA 08 - Auto-scrape REAL data untuk Pusat Media & Komunikasi
// ============================================================
// Sumber 100% REAL (no API key, no fiktif):
//   1. Google News RSS  → Announcement table (Kabar Utama)
//   2. Invidious API    → GalleryVideo table (Galeri Video)
//   3. Same scrape      → PublicOpinionLink table (menu Komunikasi)
//
// Run: DATABASE_URL=<neon> node scripts/auto-scrape-real.js
//
// Sifat: Idempotent — safe untuk di-rerun (URL-based dedup).
// ============================================================
const { PrismaClient } = require('@prisma/client');
const Parser = require('rss-parser');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL || !DATABASE_URL.startsWith('postgresql://')) {
  console.error('❌ DATABASE_URL harus PostgreSQL (Neon).');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
const rssParser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'LAPRA08-Bot/1.0 (+https://lapra08.vercel.app)',
    'Accept': 'application/rss+xml, application/xml, text/xml',
  },
});

// === LAPRA 08 strict keyword filter ===
const LAPRA_KEYWORDS = [
  'laskar prabowo 08',
  'lapra 08',
  'lapra08',
  'laskarprabowo08',
  'laskar prabowo delapan',
  'devi taurisa',
  'hashim djojohadikusumo laskar',
  'hisar tambunan',
  'nurhadi laskar prabowo',
  'timmy rorimpandey',
];

function isRelevant(title, snippet) {
  const text = (title + ' ' + snippet).toLowerCase();
  return LAPRA_KEYWORDS.some((kw) => text.includes(kw));
}

// === Piped API instances (FOSS YouTube frontend, more reliable than Invidious) ===
const PIPED_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.kavin.rocks',
];

// Fallback: Invidious
const INVIDIOUS_INSTANCES = [
  'https://yewtu.be',
  'https://invidious.private.coffee',
  'https://invidious.kavin.rocks',
];

async function fetchWithTimeout(url, opts = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// Try Piped first (more reliable), fall back to Invidious
async function scrapeYouTubeVideos(maxResults = 20) {
  const query = '"Laskar Prabowo 08"';

  // Try Piped instances
  for (const instance of PIPED_INSTANCES) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`;
      const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'LAPRA08-Bot/1.0', 'Accept': 'application/json' } });
      if (!res.ok) continue;

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) continue;

      const data = await res.json();
      const items = data.items || [];
      if (items.length === 0) continue;

      const videos = items.slice(0, maxResults).map((v) => {
        // Piped API: v.uploaded is in milliseconds (not seconds like Invidious)
        let publishedAt = new Date();
        if (v.uploaded) {
          const ts = Number(v.uploaded);
          // If timestamp is in seconds (< 10^12), multiply by 1000
          // If in milliseconds (> 10^12), use as-is
          publishedAt = ts > 1e12 ? new Date(ts) : new Date(ts * 1000);
        }
        const videoId = v.url?.replace('/watch?v=', '') || '';
        return {
          videoId,
          title: v.title || '',
          description: (v.description || '').substring(0, 1000),
          author: v.uploaderName || 'Unknown',
          authorHandle: v.uploaderUrl ? v.uploaderUrl.replace('/', '') : null,
          publishedAt,
          viewCount: v.views || 0,
          likeCount: 0,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          lengthSeconds: v.duration || 0,
        };
      }).filter((v) => v.videoId);

      if (videos.length > 0) {
        console.log(`  ✅ ${instance}: ${videos.length} videos`);
        return videos;
      }
    } catch (e) {
      console.warn(`  ⚠ ${instance}: ${e.message.substring(0, 60)}`);
      continue;
    }
  }

  // Fall back to Invidious
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance&hl=id`;
      const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'LAPRA08-Bot/1.0' } });
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) continue;

      const videos = data.slice(0, maxResults).map((v) => ({
        videoId: v.videoId,
        title: v.title || '',
        description: (v.description || '').substring(0, 1000),
        author: v.author || 'Unknown',
        authorHandle: v.authorUrl ? v.authorUrl.replace('/channel/', '@') : null,
        publishedAt: v.published ? new Date(v.published * 1000) : new Date(),
        viewCount: v.viewCount || 0,
        likeCount: v.likeCount || 0,
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        lengthSeconds: v.lengthSeconds || 0,
      }));
      console.log(`  ✅ ${instance}: ${videos.length} videos (fallback)`);
      return videos;
    } catch (e) {
      console.warn(`  ⚠ ${instance}: ${e.message.substring(0, 60)}`);
    }
  }

  return [];
}

// === STEP 1: SCRAPE GOOGLE NEWS RSS → Announcement table ===
async function scrapeGoogleNewsToAnnouncements() {
  console.log('\n=== [1/3] Google News RSS → Announcement (Kabar Utama) ===');

  const queries = [
    '"LAPRA 08" OR "Laskar Prabowo 08"',
    'LAPRA 08 Devi Taurisa Hashim pengurus',
    'Laskar Prabowo 08 aksi sosial DPD DPC',
    'Laskar Prabowo 08 kegiatan deklarasi',
  ];

  const allNewsItems = [];
  for (const q of queries) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`;
      const feed = await rssParser.parseURL(url);
      console.log(`  Query "${q.substring(0, 40)}...": ${feed.items?.length || 0} items`);

      for (const item of feed.items || []) {
        if (!isRelevant(item.title || '', item.contentSnippet || '')) continue;

        // Extract source name from Google News URL pattern
        let sourceName = 'Google News';
        let realUrl = item.link || '';
        if (item.link && item.link.includes('news.google.com')) {
          // Try to extract source from title pattern "Title - Source Name"
          const titleParts = (item.title || '').split(' - ');
          if (titleParts.length > 1) {
            sourceName = titleParts[titleParts.length - 1].trim();
          }
        }

        allNewsItems.push({
          title: (item.title || '').substring(0, 500),
          content: (item.contentSnippet || item.content || '').substring(0, 2000),
          url: realUrl,
          sourceName,
          publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
          author: item.creator || item.author || sourceName,
        });
      }
    } catch (e) {
      console.warn(`  ⚠ Query failed: ${e.message.substring(0, 80)}`);
    }
  }

  // Dedup by URL
  const seen = new Set();
  const unique = allNewsItems.filter((n) => {
    if (!n.url || seen.has(n.url)) return false;
    seen.add(n.url);
    return true;
  });

  console.log(`  Total relevant: ${unique.length} articles`);

  // Insert into Announcement table
  const indonesia = await prisma.territory.findFirst({
    where: { code: 'ID', level: 'COUNTRY' },
  });
  if (!indonesia) {
    console.error('  ❌ Territory Indonesia not found');
    return;
  }

  // Use superadmin user as creator (since this is system auto-scrape)
  const superadmin = await prisma.user.findFirst({
    where: { username: 'superadmin' },
    select: { id: true },
  });
  if (!superadmin) {
    console.error('  ❌ Superadmin user not found');
    return;
  }
  const createdById = superadmin.id;

  let newCount = 0;
  let dupCount = 0;
  for (const item of unique) {
    try {
      // Dedup by URL
      const existing = await prisma.announcement.findFirst({
        where: { sourceUrl: item.url },
        select: { id: true },
      });
      if (existing) {
        dupCount++;
        continue;
      }

      await prisma.announcement.create({
        data: {
          title: item.title,
          content: `${item.content}\n\nSumber: ${item.sourceName}\nURL: ${item.url}`,
          type: 'INFO',
          category: 'BERITA',
          isPinned: false,
          isActive: true,
          photoUrl: null,
          publishDate: item.publishedAt,
          source: 'WEB_SYNC',
          sourceUrl: item.url,
          sourceName: item.sourceName.substring(0, 200),
          territoryId: indonesia.id,
          createdById: createdById,
        },
      });
      newCount++;
    } catch (e) {
      // Skip on error (likely dedup or constraint violation)
      dupCount++;
    }
  }

  console.log(`  ✅ Inserted: ${newCount} | Skipped (dup): ${dupCount}`);
}

// === STEP 2: SCRAPE Piped/Invidious YouTube → SystemSetting (GALLERY_VIDEO) ===
// Gallery videos are stored in SystemSetting table with category='GALLERY_VIDEO' (JSON-encoded value)
async function scrapeYouTubeToGalleryVideo() {
  console.log('\n=== [2/3] Piped/Invidious YouTube → GalleryVideo (Galeri Video) ===');

  const videos = await scrapeYouTubeVideos(20);
  if (videos.length === 0) {
    console.log('  ❌ All Piped & Invidious instances failed. Skipping YouTube scrape.');
    return;
  }

  // Insert into SystemSetting table with category='GALLERY_VIDEO' (dedup by youtubeId in JSON)
  let newCount = 0;
  let dupCount = 0;
  for (const v of videos) {
    try {
      const videoData = {
        id: `yt_${v.videoId}`,
        title: v.title,
        description: v.description,
        youtubeId: v.videoId,
        youtubeUrl: v.url,
        embedUrl: `https://www.youtube.com/embed/${v.videoId}`,
        thumbnail: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
        channel: v.author,
        channelHandle: v.authorHandle,
        viewCount: v.viewCount,
        likeCount: v.likeCount,
        duration: v.lengthSeconds,
        publishedAt: v.publishedAt.toISOString(),
        category: 'KEGIATAN',
        videoType: 'YOUTUBE',
        source: 'AUTO_SYNC',
        uploadedBy: 'System Auto-Sync (Piped API)',
        uploadedAt: new Date().toISOString(),
        isActive: true,
      };

      // Check dedup by key (yt_<videoId>)
      const existing = await prisma.systemSetting.findUnique({
        where: { key: videoData.id },
        select: { id: true },
      });
      if (existing) {
        dupCount++;
        continue;
      }

      await prisma.systemSetting.create({
        data: {
          key: videoData.id,
          value: JSON.stringify(videoData),
          category: 'GALLERY_VIDEO',
          description: `Video: ${videoData.title.substring(0, 200)}`,
        },
      });
      newCount++;
    } catch (e) {
      dupCount++;
    }
  }

  console.log(`  ✅ Inserted: ${newCount} | Skipped (dup): ${dupCount}`);
}

// === STEP 3: SCRAPE opinion links → PublicOpinionLink table ===
async function scrapeOpinionLinks() {
  console.log('\n=== [3/3] News + YouTube → PublicOpinionLink (menu Komunikasi) ===');

  const queries = [
    '"LAPRA 08"',
    '"Laskar Prabowo 08"',
    'LAPRA 08 Devi Taurisa',
  ];

  // Aggregate all posts (news + youtube)
  const allPosts = [];

  // Google News
  for (const q of queries) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`;
      const feed = await rssParser.parseURL(url);
      for (const item of feed.items || []) {
        if (!isRelevant(item.title || '', item.contentSnippet || '')) continue;
        allPosts.push({
          platform: 'GOOGLE',
          url: item.link || '',
          title: (item.title || '').substring(0, 500),
          content: (item.contentSnippet || '').substring(0, 1000),
          author: item.creator || item.author || 'Google News',
          authorHandle: null,
          publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
          engagementCount: 0,
        });
      }
    } catch (e) {
      console.warn(`  ⚠ Google News "${q}": ${e.message.substring(0, 60)}`);
    }
  }

  // YouTube via Piped/Invidious (using shared helper)
  const ytVideos = await scrapeYouTubeVideos(10);
  for (const v of ytVideos) {
    if (!isRelevant(v.title, v.description)) continue;
    allPosts.push({
      platform: 'YOUTUBE',
      url: v.url,
      title: v.title,
      content: v.description,
      author: v.author,
      authorHandle: v.authorHandle,
      publishedAt: v.publishedAt,
      engagementCount: v.viewCount,
    });
  }

  // Dedup by URL
  const seen = new Set();
  const unique = allPosts.filter((p) => {
    if (!p.url || seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });

  console.log(`  Total relevant posts: ${unique.length}`);

  // Insert into PublicOpinionLink table (dedup by URL)
  let newCount = 0;
  let dupCount = 0;
  for (const post of unique) {
    try {
      const existing = await prisma.publicOpinionLink.findUnique({
        where: { url: post.url },
        select: { id: true },
      });
      if (existing) {
        dupCount++;
        continue;
      }

      // Simple lexicon-based sentiment (basic Indonesian keywords)
      const text = (post.title + ' ' + post.content).toLowerCase();
      const negWords = ['kecewa', 'gagal', 'rusak', 'korupsi', 'skandal', 'kritik', 'protes', 'tolak', 'batal'];
      const posWords = ['sukses', 'berhasil', 'apresiasi', 'positif', 'dukung', 'mendukung', 'good', 'great'];
      const hasNeg = negWords.some((w) => text.includes(w));
      const hasPos = posWords.some((w) => text.includes(w));
      const sentiment = hasNeg && !hasPos ? 'NEGATIVE' : hasPos && !hasNeg ? 'POSITIVE' : 'NEUTRAL';
      const priority = hasNeg ? 'MEDIUM' : 'LOW';

      await prisma.publicOpinionLink.create({
        data: {
          url: post.url,
          platform: post.platform,
          title: post.title,
          content: post.content,
          author: post.author,
          authorHandle: post.authorHandle,
          publishedAt: post.publishedAt,
          engagementCount: post.engagementCount,
          sentiment,
          priority,
          urgencyScore: hasNeg ? 50 : 20,
          category: 'ORGANISASI',
          aiSummary: `Auto-scraped dari ${post.platform === 'YOUTUBE' ? 'YouTube' : 'Google News'} (${new Date().toISOString().slice(0, 10)})`,
          status: 'NEW',
          sourceMethod: 'AUTO',
        },
      });
      newCount++;
    } catch (e) {
      dupCount++;
    }
  }

  console.log(`  ✅ Inserted: ${newCount} | Skipped (dup): ${dupCount}`);
}

// === MAIN ===
(async () => {
  console.log('🚀 LAPRA 08 Auto-Scrape REAL Data');
  console.log(`   DATABASE_URL: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

  try {
    await scrapeGoogleNewsToAnnouncements();
    await scrapeYouTubeToGalleryVideo();
    await scrapeOpinionLinks();

    // Final summary
    console.log('\n=== Final DB Counts ===');
    const announcements = await prisma.announcement.count();
    const videos = await prisma.systemSetting.count({ where: { category: 'GALLERY_VIDEO' } });
    const opinions = await prisma.publicOpinionLink.count();
    console.log(`  Announcement (Kabar Utama): ${announcements}`);
    console.log(`  SystemSetting GALLERY_VIDEO (Galeri Video): ${videos}`);
    console.log(`  PublicOpinionLink (Komunikasi): ${opinions}`);

    console.log('\n✅ Done. Data REAL dari Google News + YouTube sekarang ada di DB.');
    console.log('   Refresh halaman Pusat Media & Komunikasi untuk melihat hasilnya.');
  } catch (e) {
    console.error('❌ Fatal:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
