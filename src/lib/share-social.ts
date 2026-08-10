// LAPRA 08 - Social Media Share Helper
// =====================================================
// Generate share URLs untuk berbagai platform medsos
// Termasuk preset popular groups yang sering dikunjungi calon pemilih

export type SharePlatform = {
  id: string
  label: string
  icon: string // emoji untuk UI
  color: string // tailwind classes
  category: 'personal' | 'group' | 'page' | 'forum'
  buildUrl: (text: string, url: string) => string
}

// Platform share yang didukung
export const SHARE_PLATFORMS: SharePlatform[] = [
  // === WHATSAPP ===
  {
    id: 'whatsapp_personal',
    label: 'WhatsApp (Personal)',
    icon: '💬',
    color: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    category: 'personal',
    buildUrl: (_text, url) => `https://wa.me/?text=${encodeURIComponent(`${_text}\n\n${url}`)}`,
  },
  {
    id: 'whatsapp_web',
    label: 'WhatsApp Web (Pilih Grup)',
    icon: '💬',
    color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    category: 'group',
    buildUrl: (_text, url) => `https://web.whatsapp.com/send?text=${encodeURIComponent(`${_text}\n\n${url}`)}`,
  },
  // === FACEBOOK ===
  {
    id: 'facebook_share',
    label: 'Facebook (Share ke Timeline)',
    icon: '📘',
    color: 'bg-blue-600 hover:bg-blue-700 text-white',
    category: 'personal',
    buildUrl: (_text, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(_text)}`,
  },
  {
    id: 'facebook_group',
    label: 'Facebook Group (Pilih Grup)',
    icon: '👥',
    color: 'bg-blue-700 hover:bg-blue-800 text-white',
    category: 'group',
    buildUrl: (_text, url) => `https://www.facebook.com/groups/feed?trigger=share_dialog&u=${encodeURIComponent(url)}&quote=${encodeURIComponent(_text)}`,
  },
  // === X / TWITTER ===
  {
    id: 'x_twitter',
    label: 'X (Twitter)',
    icon: '🐦',
    color: 'bg-slate-800 hover:bg-slate-900 text-white',
    category: 'personal',
    buildUrl: (_text, url) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(_text)}&url=${encodeURIComponent(url)}`,
  },
  // === TELEGRAM ===
  {
    id: 'telegram_personal',
    label: 'Telegram (Pilih Chat)',
    icon: '✈️',
    color: 'bg-sky-500 hover:bg-sky-600 text-white',
    category: 'personal',
    buildUrl: (_text, url) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(_text)}`,
  },
  // === INSTAGRAM ===
  {
    id: 'instagram_dm',
    label: 'Instagram DM',
    icon: '📷',
    color: 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90',
    category: 'personal',
    buildUrl: (_text, url) => `https://www.instagram.com direct/inbox/`,
  },
  // === EMAIL ===
  {
    id: 'email',
    label: 'Email',
    icon: '✉️',
    color: 'bg-slate-600 hover:bg-slate-700 text-white',
    category: 'personal',
    buildUrl: (_text, url) => `mailto:?subject=${encodeURIComponent('Survei Opini Publik LAPRA 08')}&body=${encodeURIComponent(`${_text}\n\n${url}\n\nMohon partisipasi Anda dalam survei ini. Jawaban Anda sangat berharga untuk kami.`)}`,
  },
  // === LINKEDIN ===
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: '💼',
    color: 'bg-blue-700 hover:bg-blue-800 text-white',
    category: 'personal',
    buildUrl: (_text, url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  // === TIKTOK ===
  {
    id: 'tiktok',
    label: 'TikTok (Copy Link untuk Video)',
    icon: '🎵',
    color: 'bg-slate-900 hover:bg-black text-white',
    category: 'personal',
    buildUrl: (_text, url) => `https://www.tiktok.com/upload?link=${encodeURIComponent(url)}`,
  },
  // === COPY LINK ===
  {
    id: 'copy_link',
    label: 'Copy Link + Text',
    icon: '🔗',
    color: 'bg-slate-500 hover:bg-slate-600 text-white',
    category: 'personal',
    buildUrl: () => '', // handled by clipboard API
  },
]

// === POPULAR GROUPS PRESET (yang sering dikunjungi calon pemilih / masyarakat) ===
// Ini adalah saran grup/preset yang umum. User bisa tambah custom group-nya sendiri.
export type PopularGroup = {
  id: string
  platform: 'whatsapp' | 'facebook' | 'telegram'
  name: string
  category: string // cth: 'Pemilih Pemula', 'Kelompok Profesi'
  description: string
  // Untuk grup yang bisa langsung dibuka, pakai URL share standard
  shareHint: string
}

export const POPULAR_GROUPS: PopularGroup[] = [
  // WhatsApp Groups (umum di Indonesia)
  { id: 'wa_g1', platform: 'whatsapp', name: 'Grup RT/RW Setempat', category: 'Komunitas Lokal', description: 'Grup warga RT/RW di wilayah Anda', shareHint: 'Pilih grup RT/RW di WhatsApp Web' },
  { id: 'wa_g2', platform: 'whatsapp', name: 'Grup Paguyuban Petani', category: 'Kelompok Profesi', description: 'Grup petani untuk isu pertanian', shareHint: 'Pilih grup petani di WhatsApp Web' },
  { id: 'wa_g3', platform: 'whatsapp', name: 'Grup Nelayan Wilayah', category: 'Kelompok Profesi', description: 'Grup nelayan untuk isu kelautan', shareHint: 'Pilih grup nelayan di WhatsApp Web' },
  { id: 'wa_g4', platform: 'whatsapp', name: 'Grup UMKM Lokal', category: 'Kelompok Profesi', description: 'Grup pelaku UMKM setempat', shareHint: 'Pilih grup UMKM di WhatsApp Web' },
  { id: 'wa_g5', platform: 'whatsapp', name: 'Grup Orang Tua Murid', category: 'Pendidikan', description: 'Grup orang tua siswa di sekolah', shareHint: 'Pilih grup orang tua murid di WhatsApp Web' },
  { id: 'wa_g6', platform: 'whatsapp', name: 'Grup Karang Taruna', category: 'Pemuda', description: 'Grup pemuda karang taruna desa/kelurahan', shareHint: 'Pilih grup karang taruna di WhatsApp Web' },
  { id: 'wa_g7', platform: 'whatsapp', name: 'Grup Partai/Relawan Setempat', category: 'Politik', description: 'Grup relawan LAPRA 08 tingkat DPC', shareHint: 'Pilih grup relawan di WhatsApp Web' },
  { id: 'wa_g8', platform: 'whatsapp', name: 'Grup Organisasi Keagamaan', category: 'Agama', description: 'Grup majelis taklim, pemuda masjid, dll', shareHint: 'Pilih grup keagamaan di WhatsApp Web' },
  
  // Facebook Groups (umum di Indonesia)
  { id: 'fb_g1', platform: 'facebook', name: 'Info Pemilu & Politik Indonesia', category: 'Politik', description: 'Grup Facebook pembahasan isu politik', shareHint: 'Cari & pilih grup politik di Facebook' },
  { id: 'fb_g2', platform: 'facebook', name: 'Warga [Nama Kota] Update', category: 'Komunitas Lokal', description: 'Grup warga setempat', shareHint: 'Cari grup warga kota Anda' },
  { id: 'fb_g3', platform: 'facebook', name: 'Petani Indonesia', category: 'Kelompok Profesi', description: 'Group petani se-Indonesia', shareHint: 'Cari grup petani Indonesia' },
  { id: 'fb_g4', platform: 'facebook', name: 'UMKM Indonesia', category: 'Kelompok Profesi', description: 'Group pelaku UMKM', shareHint: 'Cari grup UMKM Indonesia' },
  { id: 'fb_g5', platform: 'facebook', name: 'Mahasiswa & Pelajar Aktif', category: 'Pemuda', description: 'Group mahasiswa/pelajar aktif', shareHint: 'Cari grup mahasiswa/pelajar' },
  
  // Telegram Groups
  { id: 'tg_g1', platform: 'telegram', name: 'Channel Berita Politik', category: 'Politik', description: 'Channel berita politik terbaru', shareHint: 'Pilih channel berita politik di Telegram' },
  { id: 'tg_g2', platform: 'telegram', name: 'Grup Diskusi Warga', category: 'Komunitas Lokal', description: 'Grup diskusi warga setempat', shareHint: 'Pilih grup warga di Telegram' },
]

// Build share text for essay poll
export function buildShareText(poll: {
  title: string
  question: string
  targetOccupation?: string | null
  provinceName?: string | null
  regencyName?: string | null
}): string {
  const location = poll.regencyName || poll.provinceName || 'Indonesia'
  const occupation = poll.targetOccupation && poll.targetOccupation !== 'UMUM'
    ? ` (untuk ${poll.targetOccupation.toLowerCase()})`
    : ''
  return `📝 SURVEI OPINI PUBLIK LAPRA 08${occupation}\n${poll.title}\n\n${poll.question}\n\n📍 Lokasi: ${location}\n\nMohon partisipasi Anda. Jawaban sangat berharga untuk advokasi kami.`
}

// Get platform by ID
export function getPlatform(id: string): SharePlatform | undefined {
  return SHARE_PLATFORMS.find(p => p.id === id)
}

// Open share URL in new window
export function openShareUrl(url: string) {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=600')
  }
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback untuk browser lama
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return true
    } catch {
      document.body.removeChild(textarea)
      return false
    }
  }
}
