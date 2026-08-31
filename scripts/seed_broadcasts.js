const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== Seed Multi-Channel Broadcasts ===\n')
  const admin = await prisma.user.findFirst({ where: { username: 'superadmin' } })
  if (!admin) throw new Error('superadmin not found')

  // Cleanup existing
  await prisma.broadcast.deleteMany({})

  const broadcasts = [
    {
      title: 'Klarifikasi Isu Pupuk Bersubsidi Sambas',
      message: 'KLARIFIKASI RESMI LAPRA 08\n\nKepada warga Kabupaten Sambas,\n\nTerkait isu pupuk bersubsidi langka yang beredar di grup WhatsApp, kami sampaikan:\n\n1. Distribusi pupuk bersubsidi di Sambas BERJALAN NORMAL\n2. Stok pupuk tersedia di kios resmi\n3. Jadwal distribusi tidak berubah\n\nMohon tidak menyebarluaskan informasi yang belum diverifikasi.',
      channels: JSON.stringify(['WHATSAPP', 'FACEBOOK', 'INSTAGRAM']),
      channel: 'WHATSAPP',
      status: 'SENT',
      targetScope: JSON.stringify({ territoryId: 'crisis', note: 'Sambas' }),
      recipientCount: 1247,
      imageUrl: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/5f139c90784f.jpeg',
      channelStats: JSON.stringify({
        WHATSAPP: { sent: 1247, delivered: 1185, read: 897, failed: 62 },
        FACEBOOK: { reach: 3992, likes: 287, comments: 45, shares: 89 },
        INSTAGRAM: { reach: 3492, likes: 412, comments: 67, saves: 156 }
      }),
      channelPostIds: JSON.stringify({
        WHATSAPP: 'wa_msg_1247_sambas',
        FACEBOOK: 'fb_post_3992_sambas',
        INSTAGRAM: 'ig_media_3492_sambas'
      }),
      crisisZoneId: 'crisis_sambas',
      sentAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    {
      title: 'Survei Kepuasan Program MBG - Ikuti Polling!',
      message: 'Bapak/Ibu warga yang kami hormati,\n\nLAPRA 08 mengadakan survei kepuasan publik terhadap Program Makan Bergizi Gratis (MBG).\n\nSuara Anda sangat berarti bagi Pak Prabowo.\n\nKlik link berikut untuk berpartisipasi:\nhttps://app.lapra08.id/poll/mbg-august-2026\n\nTerima kasih.\n\nSalam,\nTim LAPRA 08',
      channels: JSON.stringify(['WHATSAPP', 'FACEBOOK', 'INSTAGRAM']),
      channel: 'WHATSAPP',
      status: 'SENT',
      targetScope: JSON.stringify({ all: true }),
      recipientCount: 5000,
      imageUrl: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3651d2c23fb2.jpg',
      linkUrl: 'https://app.lapra08.id/poll/mbg-august-2026',
      channelStats: JSON.stringify({
        WHATSAPP: { sent: 5000, delivered: 4750, read: 3120, failed: 250 },
        FACEBOOK: { reach: 18500, likes: 1240, comments: 234, shares: 567 },
        INSTAGRAM: { reach: 14200, likes: 1872, comments: 312, saves: 580 }
      }),
      channelPostIds: JSON.stringify({
        WHATSAPP: 'wa_msg_5000_mbg',
        FACEBOOK: 'fb_post_18500_mbg',
        INSTAGRAM: 'ig_media_14200_mbg'
      }),
      pollId: 'poll_mbg',
      sentAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
    {
      title: 'Pengumuman Pelantikan DPD Kalbar',
      message: 'ALHAMDULILLAH 🤲\n\nPengurus DPD Laskar Prabowo 08 Kalimantan Barat periode 2024-2029 telah dilantik.\n\nKetua: Bun Hon Khiong\nSekretaris: Martinus, SE, M.Si\nBendahara: Suryadi\n+ 38 pengurus bidang lainnya\n\nSK No: 016/Kep/DPN/XI/2025\nDiterbitkan: 4 November 2025\n\nMari doakan kebersamaan & keberkahan untuk pengurus baru. 🙏',
      channels: JSON.stringify(['WHATSAPP', 'FACEBOOK']),
      channel: 'WHATSAPP',
      status: 'SENT',
      targetScope: JSON.stringify({ territoryId: 'kalbar' }),
      recipientCount: 850,
      imageUrl: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/5f139c90784f.jpeg',
      channelStats: JSON.stringify({
        WHATSAPP: { sent: 850, delivered: 812, read: 567, failed: 38 },
        FACEBOOK: { reach: 2850, likes: 425, comments: 89, shares: 178 }
      }),
      channelPostIds: JSON.stringify({
        WHATSAPP: 'wa_msg_850_pelantikan',
        FACEBOOK: 'fb_post_2850_pelantikan'
      }),
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Reminder: Peace Walk Jakarta 17 Agustus',
      message: 'REMINDER PEACE WALK 2026\n\nHari: Sabtu, 16 Agustus 2026\nWaktu: 07:00 WIB - selesai\nTempat: Monas, Jakarta Pusat\n\nAjakan: Mari bergabung dalam Peace Walk & Peace Forum untuk mendukung program pemerintahan Prabowo-Gibran.\n\nMohon konfirmasi kehadiran via WhatsApp koordinator masing-masing DPC.\n\n#PeaceWalk2026 #LAPRA08 #IndonesiaEmas2045',
      channels: JSON.stringify(['WHATSAPP', 'FACEBOOK', 'INSTAGRAM']),
      channel: 'WHATSAPP',
      status: 'SENT',
      targetScope: JSON.stringify({ all: true }),
      recipientCount: 8000,
      imageUrl: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3651d2c23fb2.jpg',
      channelStats: JSON.stringify({
        WHATSAPP: { sent: 8000, delivered: 7620, read: 5120, failed: 380 },
        FACEBOOK: { reach: 32400, likes: 2340, comments: 456, shares: 1234 },
        INSTAGRAM: { reach: 28900, likes: 3120, comments: 567, saves: 892 }
      }),
      channelPostIds: JSON.stringify({
        WHATSAPP: 'wa_msg_8000_peace_walk',
        FACEBOOK: 'fb_post_32400_peace_walk',
        INSTAGRAM: 'ig_media_28900_peace_walk'
      }),
      sentAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    {
      title: 'Aspirasi Langsung ke Pak Prabowo',
      message: 'Bapak/Ibu yang kami hormati,\n\nLAPRA 08 membuka microsite aspirasi rakyat.\n\nAnda dapat menyampaikan keluhan, saran, atau aspirasi langsung ke Pak Prabowo melalui:\n\n👉 https://app.lapra08.id/aspirasi\n\nSemua aspirasi akan dikluster berdasarkan wilayah & profesi (AI-powered) untuk menjadi dasar pidato kepresidenan yang membumi.\n\n#AspirasiRakyat #DataDrivenSpeech #PrabowoPresiden',
      channels: JSON.stringify(['FACEBOOK', 'INSTAGRAM']),
      channel: 'FACEBOOK',
      status: 'SENT',
      targetScope: JSON.stringify({ all: true }),
      recipientCount: 0,
      imageUrl: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3651d2c23fb2.jpg',
      linkUrl: 'https://app.lapra08.id/aspirasi',
      channelStats: JSON.stringify({
        FACEBOOK: { reach: 45200, likes: 3420, comments: 892, shares: 1567 },
        INSTAGRAM: { reach: 38700, likes: 4890, comments: 723, saves: 1340 }
      }),
      channelPostIds: JSON.stringify({
        FACEBOOK: 'fb_post_45200_aspirasi',
        INSTAGRAM: 'ig_media_38700_aspirasi'
      }),
      sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      title: 'Aksi Sosial Santunan Anak Yatim Ramadhan',
      message: 'ALHAMDULILLAH 🤲\n\nLAPRA 08 bersama PD Pasar Jaya menggelar santunan bagi 95 anak yatim di Pasar Pejaten.\n\nTerima kasih kepada seluruh relawan yang telah berpartisipasi. Semoga amal jariyah mengalir untuk kita semua.\n\n#AksiSosial #LAPRA08 #RamadhanKareem',
      channels: JSON.stringify(['WHATSAPP', 'INSTAGRAM']),
      channel: 'WHATSAPP',
      status: 'SENT',
      targetScope: JSON.stringify({ territoryId: 'jakarta' }),
      recipientCount: 320,
      imageUrl: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/31933e5cf281.jpg',
      channelStats: JSON.stringify({
        WHATSAPP: { sent: 320, delivered: 305, read: 245, failed: 15 },
        INSTAGRAM: { reach: 12400, likes: 1872, comments: 234, saves: 678 }
      }),
      channelPostIds: JSON.stringify({
        WHATSAPP: 'wa_msg_320_santunan',
        INSTAGRAM: 'ig_media_12400_santunan'
      }),
      sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    // Scheduled broadcast
    {
      title: 'Pidato Kenegaraan - Live Streaming Reminder',
      message: 'PENGINGAT LIVE STREAMING\n\nPidato Kenegaraan Presiden Prabowo Subianto\nHari: Sabtu, 16 Agustus 2026\nJam: 10:00 WIB\n\nTonton via:\n- TVRI\n- YouTube Setkab\n- Facebook Setkab\n\nMari simak bersama program prioritas pemerintahan untuk Indonesia Emas 2045.\n\n#PidatoKenegaraan #PresidenPrabowo #AstaCita',
      channels: JSON.stringify(['WHATSAPP', 'FACEBOOK', 'INSTAGRAM']),
      channel: 'WHATSAPP',
      status: 'QUEUED',
      targetScope: JSON.stringify({ all: true }),
      recipientCount: 10000,
      imageUrl: 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3651d2c23fb2.jpg',
      linkUrl: 'https://youtube.com/watch?v=setkab-live',
      channelStats: JSON.stringify({}),
      channelPostIds: JSON.stringify({}),
      scheduledAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    },
  ]

  for (const b of broadcasts) {
    const created = await prisma.broadcast.create({
      data: { ...b, sentById: admin.id }
    })
    console.log(`  ✓ ${created.title.substring(0, 50)}... [${created.status}] - ${JSON.parse(created.channels).join(', ')}`)
  }

  const total = await prisma.broadcast.count()
  console.log(`\n✅ Seeded ${total} multi-channel broadcasts`)
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
