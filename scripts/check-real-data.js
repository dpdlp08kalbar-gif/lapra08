const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});

(async () => {
  console.log('=== Real Data Status ===\n');
  const announcements = await prisma.announcement.count();
  const videos = await prisma.systemSetting.count({ where: { category: 'GALLERY_VIDEO' } });
  const opinions = await prisma.publicOpinionLink.count();
  const financeTxns = await prisma.financeTransaction.count();

  console.log(`Announcement (Kabar Utama): ${announcements} articles`);
  console.log(`GALLERY_VIDEO SystemSetting (Galeri Video): ${videos} videos`);
  console.log(`PublicOpinionLink (menu Komunikasi): ${opinions} posts`);
  console.log(`FinanceTransaction (Kas & Keuangan): ${financeTxns} transactions (harusnya 0)`);

  console.log('\n=== Sample Announcement (5 newest) ===');
  const sampleNews = await prisma.announcement.findMany({
    where: { source: 'WEB_SYNC' },
    orderBy: { publishDate: 'desc' },
    take: 5,
    select: { title: true, sourceName: true, publishDate: true, sourceUrl: true }
  });
  sampleNews.forEach((n, i) => {
    console.log(`\n  ${i+1}. ${n.title}`);
    console.log(`     Source: ${n.sourceName} | Date: ${n.publishDate?.toISOString().slice(0, 10)}`);
    console.log(`     URL: ${n.sourceUrl}`);
  });

  console.log('\n\n=== Sample Gallery Video (5 newest) ===');
  const videoItems = await prisma.systemSetting.findMany({
    where: { category: 'GALLERY_VIDEO' },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: { value: true, description: true }
  });
  videoItems.forEach((item, i) => {
    try {
      const v = JSON.parse(item.value);
      console.log(`\n  ${i+1}. ${v.title}`);
      console.log(`     Channel: ${v.channel} | Views: ${(v.viewCount || 0).toLocaleString('id-ID')}`);
      console.log(`     Date: ${v.publishedAt?.slice(0, 10)} | URL: ${v.youtubeUrl}`);
    } catch {}
  });

  console.log('\n\n=== Sample PublicOpinionLink (5 newest) ===');
  const sampleOpinions = await prisma.publicOpinionLink.findMany({
    orderBy: { publishedAt: 'desc' },
    take: 5,
    select: { title: true, platform: true, sentiment: true, priority: true, url: true, publishedAt: true }
  });
  sampleOpinions.forEach((o, i) => {
    console.log(`\n  ${i+1}. ${o.title}`);
    console.log(`     Platform: ${o.platform} | Sentiment: ${o.sentiment} | Priority: ${o.priority}`);
    console.log(`     Date: ${o.publishedAt?.toISOString().slice(0, 10)}`);
    console.log(`     URL: ${o.url}`);
  });

  await prisma.$disconnect();
})();
