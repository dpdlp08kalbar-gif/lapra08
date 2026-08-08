'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { PageHeader, StatCard, LoadingState, ErrorState, EmptyState } from '@/components/ui-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useToastStore, useNavStore, useAuthStore } from '@/lib/store'
import { formatDateID, formatDateTimeID } from '@/lib/format'
import {
  Home, Users, MapPin, CalendarDays, TrendingUp, Wallet, ChevronRight,
  ShieldCheck, KeyRound, FileText, Newspaper, Image as ImageIcon, Megaphone,
  Building2, BookOpen, Scale, Briefcase, HandHeart, CalendarClock,
  PhoneCall, MessageSquare, HelpCircle, Map as MapIcon, Mail, Plus,
  Edit, Trash2, MoreVertical, Pin, Send, Eye, Upload, Loader2, Search,
  Award, CheckCircle2, Clock, AlertTriangle, Globe, ExternalLink, Lock,
} from 'lucide-react'

// Reuse existing functional components
import { PusatDataMenu } from '@/components/menus/pusat-data-menu'
import { EventsMenu } from '@/components/menus/events-menu'
import { HelpMenu } from '@/components/menus/help-menu'
import { CommunicationMenu } from '@/components/menus/communication-menu'
import { FinanceMenu } from '@/components/menus/finance-menu'
import { LogisticsMenu } from '@/components/menus/logistics-menu'

// ============================================================
// 1. BERANDA — Portal Profesional Level Internasional
// ============================================================
export function BerandaMenu() {
  const setActiveMenu = useNavStore((s) => s.setActiveMenu)
  const [stats, setStats] = useState<any>(null)
  const [announcements, setAnnouncements] = useState<any[]>([])

  useEffect(() => {
    api('/api/stats').then(setStats).catch(() => {})
    api('/api/announcements').then(setAnnouncements).catch(() => {})
  }, [])

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Hero Banner — Premium Design */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-orange-600/20">
        {/* Background gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-red-600 to-rose-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        {/* Large decorative icon */}
        <div className="absolute top-0 right-0 opacity-5">
          <ShieldCheck className="w-64 h-64 -mr-12 -mt-12" />
        </div>

        {/* Content */}
        <div className="relative z-10 p-8 lg:p-10">
          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-white/15 text-white border border-white/20 backdrop-blur-sm px-3 py-1">
              <ShieldCheck className="w-3 h-3 mr-1" /> Portal Resmi LAPRA 08
            </Badge>
            <Badge className="bg-yellow-400/20 text-yellow-200 border border-yellow-400/30 px-3 py-1">
              Periode 2024-2029
            </Badge>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white mb-3 drop-shadow-lg">
            Sistem Informasi
            <span className="block bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 bg-clip-text text-transparent">
              Laskar Prabowo 08
            </span>
          </h1>
          <p className="text-lg text-white/80 mb-6 max-w-2xl">
            Platform digital terpadu untuk pengurus DPN, DPD, dan DPC seluruh Indonesia.
            Mengawal program pemerintahan menuju Indonesia Emas 2045.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 font-bold hover:from-yellow-500 hover:to-amber-600 border-0 shadow-lg shadow-amber-500/30 hover:scale-105 transition-all"
              onClick={() => setActiveMenu('layanan')}>
              <KeyRound className="w-5 h-5 mr-2" /> Pendaftaran KTA
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm"
              onClick={() => setActiveMenu('profil')}>
              Lihat Struktur Organisasi <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Statistik Cards — Modern Glassmorphism */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCardModern
            label="Total Anggota"
            value={stats.members.total}
            icon={Users}
            gradient="from-orange-500 to-red-500"
            subtitle={`${stats.members.active} anggota aktif`}
          />
          <StatCardModern
            label="DPD (Provinsi)"
            value={stats.global.totalProvinces}
            icon={MapPin}
            gradient="from-blue-500 to-indigo-500"
            subtitle={`${stats.global.totalDpdLn || 0} DPD Luar Negeri`}
          />
          <StatCardModern
            label="DPC (Kab/Kota)"
            value={stats.global.totalRegencies}
            icon={Building2}
            gradient="from-emerald-500 to-teal-500"
            subtitle="514 DPC terhubung"
          />
          <StatCardModern
            label="Saldo Kas"
            value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.finance.balance)}
            icon={Wallet}
            gradient={stats.finance.balance >= 0 ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600'}
            subtitle={stats.finance.balance >= 0 ? 'Surplus' : 'Defisit'}
          />
        </div>
      )}

      {/* Quick Access — Premium Cards */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-orange-500 to-red-600" />
          <h2 className="text-lg font-bold text-slate-800">Akses Cepat</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <QuickAccessPremium icon={Building2} title="Struktur Pengurus" desc="DPN → DPD → DPC lengkap" gradient="from-purple-500 to-indigo-600" onClick={() => setActiveMenu('profil')} />
          <QuickAccessPremium icon={CalendarDays} title="Agenda Kegiatan" desc="Kalender & absensi" gradient="from-blue-500 to-cyan-600" onClick={() => setActiveMenu('program')} />
          <QuickAccessPremium icon={Newspaper} title="Kabar & Berita" desc="Update terbaru" gradient="from-emerald-500 to-green-600" onClick={() => setActiveMenu('pusat-media')} />
          <QuickAccessPremium icon={ShieldCheck} title="Layanan Advokasi" desc="Pengaduan & bantuan" gradient="from-orange-500 to-red-600" onClick={() => setActiveMenu('layanan')} />
          <QuickAccessPremium icon={KeyRound} title="Cek KTA Digital" desc="Verifikasi keanggotaan" gradient="from-amber-400 to-yellow-500" onClick={() => setActiveMenu('layanan')} />
          <QuickAccessPremium icon={MapIcon} title="Sekretariat" desc="Lokasi & kontak" gradient="from-slate-600 to-slate-800" onClick={() => setActiveMenu('kontak')} />
        </div>
      </div>

      {/* Pengumuman Terbaru + Sidebar Info */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pengumuman */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-white" />
                </div>
                Pengumuman Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.length === 0 ? (
                <EmptyState icon={Megaphone} title="Belum ada pengumuman" />
              ) : (
                announcements.slice(0, 4).map((a) => (
                  <div key={a.id} className="group flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200 hover:border-orange-300 hover:shadow-sm transition-all">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.isPinned ? 'bg-orange-500' : 'bg-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-sm truncate">{a.title}</div>
                        {a.isPinned && <Pin className="w-3 h-3 text-orange-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.content}</p>
                      <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-2">
                        <span>{formatDateTimeID(a.createdAt)}</span>
                        <span>•</span>
                        <span>{a.createdBy?.fullName || 'Admin'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info — Hierarchy Summary */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-white">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-orange-400" />
              </div>
              Hierarki Organisasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <HierarchyItem level="DPN" desc="Pusat Nasional" count={1} color="text-purple-400" />
            <div className="ml-4 border-l-2 border-slate-700 pl-4 space-y-3">
              <HierarchyItem level="DPD" desc="38 Provinsi + IKN + 5 LN" count={44} color="text-blue-400" />
              <div className="ml-4 border-l-2 border-slate-700 pl-4">
                <HierarchyItem level="DPC" desc="514 Kabupaten/Kota" count={514} color="text-emerald-400" />
              </div>
            </div>
            <div className="pt-3 border-t border-slate-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Wilayah</span>
                <span className="font-bold text-orange-400">559 Teritori</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-slate-400">Status</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Terhubung 100%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCardModern({ label, value, icon: Icon, gradient, subtitle }: any) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-5 rounded-full -mr-12 -mt-12 group-hover:opacity-10 transition-opacity`} />
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-800 tracking-tight">{value}</div>
        <div className="text-sm text-slate-500 font-medium mt-0.5">{label}</div>
        {subtitle && <div className="text-[10px] text-slate-400 mt-1">{subtitle}</div>}
      </div>
    </div>
  )
}

function QuickAccessPremium({ icon: Icon, title, desc, gradient, onClick }: any) {
  return (
    <button onClick={onClick} className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-5 text-left shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-5 rounded-full -mr-8 -mt-8 group-hover:scale-150 group-hover:opacity-10 transition-all duration-500`} />
      <div className="relative flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-slate-800">{title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
      </div>
    </button>
  )
}

function HierarchyItem({ level, desc, count, color }: any) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className={`text-xs font-bold ${color}`}>{level}</div>
        <div className="text-[10px] text-slate-400">{desc}</div>
      </div>
      <div className="text-lg font-black text-white">{count}</div>
    </div>
  )
}

// ============================================================
// 2. PROFIL
// ============================================================
export function ProfilMenu() {
  const [tab, setTab] = useState('tentang')
  const tabs = [
    { key: 'tentang', label: 'Tentang LAPRA 08', icon: BookOpen },
    { key: 'visi-misi', label: 'Visi & Misi', icon: TrendingUp },
    { key: 'struktur', label: 'Struktur & Pusat Data', icon: Building2 },
    { key: 'ad-art', label: 'AD/ART', icon: FileText },
    { key: 'legalitas', label: 'Landasan Hukum', icon: Scale },
  ]
  return (
    <div className="space-y-6">
      <PageHeader title="Profil" description="Profil organisasi Laskar Prabowo 08" icon={Building2} />
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-sm' : 'border hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'tentang' && (
        <Card><CardHeader><CardTitle>Tentang Laskar Prabowo 08</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Laskar Prabowo 08 (LAPRA 08) adalah komunitas relawan resmi Prabowo Subianto yang bergerak dalam pengawasan program, kaderisasi, dan aksi sosial nasional.</p>
          <p>Organisasi ini dilantik oleh Ketua Dewan Pembina, Dr. (HC) Hashim S. Djojohadikusumo, pada 21 Maret 2025 di Auditorium RRI Jakarta untuk masa bakti 2024-2029.</p>
          <p>LAPRA 08 memiliki struktur hierarki: DPN (Pusat Nasional) → DPD (Provinsi) → DPC (Kabupaten/Kota), dengan 39 DPD domestik (38 provinsi + IKN), 5 DPD luar negeri, dan 514 DPC terhubung.</p>
        </CardContent></Card>
      )}
      {tab === 'visi-misi' && (
        <Card><CardHeader><CardTitle>Visi & Misi</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div><div className="font-semibold text-orange-600 mb-1">Visi</div><p>Menjadi relawan terdepan dalam mendukung visi kebangsaan Prabowo Subianto menuju Indonesia Emas 2045.</p></div>
          <div><div className="font-semibold text-orange-600 mb-1">Misi</div>
          <ul className="space-y-1 list-disc ml-4">
            <li>Mengawal program-program pemerintah Prabowo-Gibran</li>
            <li>Kaderisasi dan pembinaan relawan di seluruh Indonesia</li>
            <li>Aksi sosial dan pengabdian masyarakat</li>
            <li>Penguatan harmoni dan persatuan bangsa</li>
          </ul></div>
        </CardContent></Card>
      )}
      {tab === 'struktur' && <PusatDataMenu />}
      {tab === 'ad-art' && (
        <Card><CardHeader><CardTitle>Anggaran Dasar / Anggaran Rumah Tangga (AD/ART)</CardTitle></CardHeader>
        <CardContent><EmptyState icon={FileText} title="Dokumen AD/ART" description="Dokumen AD/ART LAPRA 08 akan diupload di sini." /></CardContent></Card>
      )}
      {tab === 'legalitas' && (
        <Card><CardHeader><CardTitle>Landasan Hukum & Legalitas Organisasi</CardTitle></CardHeader>
        <CardContent><EmptyState icon={Scale} title="Dokumen Legalitas" description="SK Kepengurusan, Nota Kesepahatan, dan dokumen legal lainnya." /></CardContent></Card>
      )}
    </div>
  )
}

// ============================================================
// 3. PUSAT MEDIA — Wired with Announcement CRUD
// ============================================================
export function PusatMediaMenu() {
  const [tab, setTab] = useState('berita')
  const tabs = [
    { key: 'berita', label: 'Kabar Utama & Pengumuman', icon: Newspaper },
    { key: 'galeri', label: 'Galeri Media', icon: ImageIcon },
    { key: 'rilis-pers', label: 'Media Siaran LAPRA 08', icon: Megaphone },
    { key: 'majalah', label: 'Majalah / Buletin Digital', icon: BookOpen },
  ]
  return (
    <div className="space-y-6">
      <PageHeader title="Pusat Media" description="Kabar, berita, galeri, dan publikasi LAPRA 08" icon={Newspaper} />
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-sm' : 'border hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'berita' ? (
        <AnnouncementManager />
      ) : tab === 'galeri' ? (
        <GalleryManager />
      ) : tab === 'rilis-pers' ? (
        <MediaSiaranManager />
      ) : (
        <MajalahManager />
      )}
    </div>
  )
}

// ============================================================
// MEDIA SIARAN — Auto-sync dari berita kategori SIRANAN_PERS
// ============================================================
function MediaSiaranManager() {
  const addToast = useToastStore((s) => s.addToast)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    setLoading(true)
    api('/api/announcements').then((all: any[]) => {
      // Filter hanya yang kategori = SIRANAN_PERS
      const siranan = all.filter((a) => a.category === 'SIRANAN_PERS')
      setItems(siranan)
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState />

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="w-4 h-4 text-indigo-600" />
            Media Siaran LAPRA 08 ({items.length} rilis pers)
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => {
            useNavStore.getState().setActiveMenu('pusat-media')
            // Switch to berita tab via event
            window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'berita' }))
          }}>
            <Plus className="w-4 h-4 mr-1" /> Buat Siaran Pers Baru
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 mb-4 text-xs text-indigo-800">
          <Megaphone className="w-4 h-4 inline mr-1" />
          <strong>Media Siaran</strong> otomatis menampilkan berita dengan kategori <strong>"Siaran Pers"</strong> yang dibuat di tab Kabar Utama.
          Untuk membuat siaran pers baru, buat berita dengan kategori "Siaran Pers" di menu Kabar Utama.
        </div>
        {items.length === 0 ? (
          <EmptyState icon={Megaphone} title="Belum ada siaran pers" description="Buat berita dengan kategori 'Siaran Pers' di tab Kabar Utama, dan akan otomatis muncul di sini." />
        ) : (
          <div className="space-y-2">
            {items.map((a) => (
              <div key={a.id} className="group relative rounded-xl border p-4 hover:shadow-md transition-all bg-white">
                <div className="flex items-start gap-3">
                  {a.photoUrl ? (
                    <img src={a.photoUrl} alt={a.title} className="w-20 h-20 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center shrink-0">
                      <Megaphone className="w-8 h-8 text-indigo-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Badge variant="outline" className="text-[10px] mb-1 bg-indigo-50 text-indigo-700 border-indigo-200">Siaran Pers</Badge>
                    <div className="font-bold text-sm">{a.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                      <span>{a.publishDate ? formatDateID(a.publishDate) : formatDateTimeID(a.createdAt)}</span>
                      <span>•</span>
                      <span>{a.createdBy?.fullName || 'DPN LAPRA 08'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// MAJALAH / BULETIN DIGITAL — CRUD dengan upload PDF + cover
// ============================================================
function MajalahManager() {
  const addToast = useToastStore((s) => s.addToast)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [form, setForm] = useState({ title: '', description: '', edition: '', publishDate: '' })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const loadData = () => {
    setLoading(true)
    api('/api/gallery').then((all: any[]) => {
      // Filter hanya yang kategori = MAJALAH
      const majalah = all.filter((a: any) => a.category === 'MAJALAH')
      setItems(majalah)
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) { addToast('Judul wajib diisi', 'error'); return }
    setUploading(true)
    try {
      const formData = new FormData()
      if (coverFile) formData.append('file', coverFile)
      formData.append('title', form.title)
      formData.append('description', form.description)
      formData.append('category', 'MAJALAH')

      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Upload gagal')

      // If PDF also uploaded, store as separate gallery item with PDF reference
      if (pdfFile) {
        const pdfFormData = new FormData()
        pdfFormData.append('file', pdfFile)
        pdfFormData.append('title', `${form.title} - PDF`)
        pdfFormData.append('description', `File PDF majalah: ${form.title}`)
        pdfFormData.append('category', 'MAJALAH_PDF')
        await fetch('/api/gallery', {
          method: 'POST',
          headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
          body: pdfFormData,
        })
      }

      addToast('Majalah berhasil diupload', 'success')
      setForm({ title: '', description: '', edition: '', publishDate: '' })
      setCoverFile(null); setPdfFile(null); setUploadOpen(false); setEditItem(null)
      loadData()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setUploading(false) }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await fetch(`/api/gallery/${deleteItem.id}?id=${deleteItem.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
      })
      addToast('Majalah dihapus', 'success')
      setDeleteItem(null); loadData()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  if (loading) return <LoadingState />

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-4 h-4 text-purple-600" />
            Majalah / Buletin Digital ({items.length} edisi)
          </CardTitle>
          <Button onClick={() => { setEditItem(null); setForm({ title: '', description: '', edition: '', publishDate: '' }); setCoverFile(null); setPdfFile(null); setUploadOpen(true) }}
            size="sm" className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> Buat Majalah Baru
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={BookOpen} title="Belum ada majalah" description="Klik 'Buat Majalah Baru' untuk upload majalah/buletin digital (cover + PDF)." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <div key={item.id} className="group relative rounded-xl overflow-hidden border shadow-sm hover:shadow-lg transition-all bg-white">
                {item.fileUrl ? (
                  <img src={item.fileUrl} alt={item.title} className="w-full h-56 object-cover" />
                ) : (
                  <div className="w-full h-56 bg-gradient-to-br from-purple-100 to-indigo-200 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-purple-400" />
                  </div>
                )}
                <div className="p-3">
                  <div className="font-bold text-sm truncate">{item.title}</div>
                  {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                  <div className="text-[10px] text-muted-foreground mt-2">{formatDateID(item.uploadedAt)}</div>
                </div>
                <Button variant="destructive" size="sm"
                  className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setDeleteItem(item)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialog Upload Majalah */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { setUploadOpen(o); if (!o) { setEditItem(null); setCoverFile(null); setPdfFile(null) } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              {editItem ? 'Edit' : 'Buat'} Majalah / Buletin Digital
            </DialogTitle>
            <DialogDescription>Upload cover majalah (gambar) + file PDF majalah</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            {/* Judul */}
            <div className="space-y-2">
              <Label>Judul Majalah *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="cth: Majalah LAPRA 08 Edisi Januari 2026" required />
            </div>
            {/* Edisi */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Edisi</Label>
                <Input value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value })}
                  placeholder="cth: Vol. 1 No. 1" />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Terbit</Label>
                <Input type="date" value={form.publishDate} onChange={(e) => setForm({ ...form, publishDate: e.target.value })} />
              </div>
            </div>
            {/* Deskripsi */}
            <div className="space-y-2">
              <Label>Deskripsi / Ringkasan</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3} placeholder="Ringkasan isi majalah..." />
            </div>
            {/* Cover Upload */}
            <div className="space-y-2">
              <Label>Cover Majalah (Gambar)</Label>
              {coverFile ? (
                <div className="relative">
                  <img src={URL.createObjectURL(coverFile)} alt="Cover preview" className="w-full max-h-48 object-cover rounded-xl border" />
                  <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2"
                    onClick={() => setCoverFile(null)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-xl p-4 text-center hover:border-purple-400 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('majalah-cover-input')?.click()}>
                  <input type="file" id="majalah-cover-input" className="hidden" accept="image/*"
                    onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <div className="text-xs font-medium">Upload Cover (JPG/PNG)</div>
                </div>
              )}
            </div>
            {/* PDF Upload */}
            <div className="space-y-2">
              <Label>File PDF Majalah</Label>
              {pdfFile ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium flex-1 truncate">{pdfFile.name}</span>
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600"
                    onClick={() => setPdfFile(null)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-xl p-4 text-center hover:border-emerald-400 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('majalah-pdf-input')?.click()}>
                  <input type="file" id="majalah-pdf-input" className="hidden" accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                  <FileText className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <div className="text-xs font-medium">Upload PDF Majalah</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Maks 10MB</div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>Batal</Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                {editItem ? 'Simpan Perubahan' : 'Publikasikan Majalah'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Majalah?</AlertDialogTitle>
            <AlertDialogDescription>Yakin hapus <strong>{deleteItem?.title}</strong>? File cover & PDF akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// ============================================================
// GALLERY MANAGER — Upload foto, pilih dari berita, hapus
// ============================================================
function GalleryManager() {
  const addToast = useToastStore((s) => s.addToast)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [form, setForm] = useState({ title: '', description: '', category: 'KEGIATAN' })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)

  const loadData = () => {
    setLoading(true)
    api('/api/gallery').then((all: any[]) => {
      // Only show items that have fileUrl (actual gallery photos, not program content)
      const galleryItems = all.filter((a: any) => a.fileUrl)
      setItems(galleryItems)
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { addToast('Pilih file gambar dulu', 'error'); return }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', form.title || file.name)
      formData.append('description', form.description)
      formData.append('category', form.category)

      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Upload gagal')

      addToast('Foto berhasil diupload ke galeri', 'success')
      setForm({ title: '', description: '', category: 'KEGIATAN' })
      setFile(null); setUploadOpen(false)
      loadData()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setUploading(false) }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await fetch(`/api/gallery/${deleteItem.id}?id=${deleteItem.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
      })
      addToast('Foto dihapus dari galeri', 'success')
      setDeleteItem(null); loadData()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  const handleSyncFromNews = async () => {
    setSyncLoading(true)
    try {
      const res = await fetch('/api/news/sync', {
        method: 'POST',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '', 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Sync gagal')
      addToast(data.message, 'success')
      loadData()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSyncLoading(false) }
  }

  if (loading) return <LoadingState />

  const categories: Record<string, string> = {
    KEGIATAN: 'Kegiatan', RAPAT: 'Rapat', PELANTIKAN: 'Pelantikan',
    SOSIAL: 'Aksi Sosial', DOKUMENTER: 'Dokumenter', LAINNYA: 'Lainnya',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            Galeri Media ({items.length} foto)
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleSyncFromNews} size="sm" variant="outline" disabled={syncLoading}
              className="border-blue-300 text-blue-600 hover:bg-blue-50">
              {syncLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Newspaper className="w-4 h-4 mr-1" />}
              Sync Berita Terbaru
            </Button>
            <Button onClick={() => setUploadOpen(true)} size="sm"
              className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Upload Foto
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={ImageIcon} title="Galeri masih kosong" description="Upload foto kegiatan atau sync dari berita yang sudah ada." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <div key={item.id} className="group relative rounded-xl overflow-hidden border shadow-sm hover:shadow-lg transition-all">
                <img src={item.fileUrl} alt={item.title} className="w-full h-40 object-cover" />
                <div className="p-2">
                  <div className="font-medium text-xs truncate">{item.title}</div>
                  <Badge variant="outline" className="text-[10px] mt-1">{categories[item.category] || item.category}</Badge>
                </div>
                <Button variant="destructive" size="sm"
                  className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setDeleteItem(item)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Upload Foto ke Galeri</DialogTitle></DialogHeader>
          <form onSubmit={handleUpload} className="space-y-3">
            <div className="space-y-2">
              <Label>Pilih File Gambar *</Label>
              {file ? (
                <div className="relative">
                  <img src={URL.createObjectURL(file)} alt="Preview" className="w-full max-h-48 object-cover rounded-xl border" />
                  <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2"
                    onClick={() => setFile(null)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-emerald-400 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('gallery-upload-input')?.click()}>
                  <input type="file" id="gallery-upload-input" className="hidden" accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <div className="text-sm font-medium">Upload Foto</div>
                  <div className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP • Maks 10MB</div>
                </div>
              )}
            </div>
            <div className="space-y-2"><Label>Judul Foto</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="cth: Pelantikan DPC Pontianak" /></div>
            <div className="space-y-2"><Label>Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Deskripsi singkat foto..." /></div>
            <div className="space-y-2"><Label>Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categories).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>Batal</Button>
              <Button type="submit" disabled={uploading || !file}>{uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Upload</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Foto?</AlertDialogTitle>
            <AlertDialogDescription>Yakin hapus <strong>{deleteItem?.title}</strong> dari galeri?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// ============================================================
// ANNOUNCEMENT MANAGER — CRUD lengkap untuk berita & pengumuman
// ============================================================
function AnnouncementManager() {
  const addToast = useToastStore((s) => s.addToast)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', content: '', type: 'INFO', category: 'BERITA', isPinned: false,
    territoryId: '', imageUrl: '', publishDate: '',
  })
  const [territories, setTerritories] = useState<any[]>([])

  const loadData = () => {
    setLoading(true)
    Promise.all([api('/api/announcements'), api('/api/territory?level=COUNTRY')])
      .then(([a, t]) => { setItems(a); setTerritories(t) })
      .catch((e) => addToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast('File harus berupa gambar (JPG/PNG)', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Ukuran file maksimal 5MB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setForm({ ...form, imageUrl: e.target?.result as string })
      addToast('Gambar berhasil dimuat', 'success')
    }
    reader.readAsDataURL(file)
  }

  const handlePublish = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        territoryId: form.territoryId || territories[0]?.id,
        publishDate: form.publishDate || new Date().toISOString(),
        photoUrl: form.imageUrl || null,
      }
      if (editItem) {
        await api(`/api/announcements/${editItem.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        addToast('Berita/pengumuman diperbarui & disiarkan', 'success')
      } else {
        await api('/api/announcements', { method: 'POST', body: JSON.stringify(payload) })
        addToast('Berita/pengumuman berhasil disiarkan', 'success')
      }
      setAddOpen(false); setEditItem(null); setPreviewMode(false)
      setForm({ title: '', content: '', type: 'INFO', category: 'BERITA', isPinned: false, territoryId: '', imageUrl: '', publishDate: '' })
      loadData()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try { await api(`/api/announcements/${deleteItem.id}`, { method: 'DELETE' }); addToast('Berita dihapus', 'success'); setDeleteItem(null); loadData() }
    catch (e: any) { addToast(e.message, 'error') }
  }

  if (loading) return <LoadingState />

  const filtered = items.filter((a) => !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase()))

  const typeConfig: Record<string, { label: string; color: string }> = {
    INFO: { label: 'Info', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    WARNING: { label: 'Peringatan', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    URGENT: { label: 'Mendesak', color: 'bg-red-50 text-red-700 border-red-200' },
  }

  const categoryConfig: Record<string, { label: string; color: string }> = {
    BERITA: { label: 'Berita', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    PENGUMUMAN: { label: 'Pengumuman', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    SIRANAN_PERS: { label: 'Siaran Pers', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  }

  const openEditor = (item?: any) => {
    if (item) {
      setEditItem(item)
      setForm({
        title: item.title, content: item.content, type: item.type,
        category: item.category || 'BERITA', isPinned: item.isPinned,
        territoryId: item.territoryId, imageUrl: item.photoUrl || '',
        publishDate: item.publishDate ? item.publishDate.split('T')[0] : '',
      })
    } else {
      setEditItem(null)
      setForm({ title: '', content: '', type: 'INFO', category: 'BERITA', isPinned: false, territoryId: territories[0]?.id || '', imageUrl: '', publishDate: new Date().toISOString().split('T')[0] })
    }
    setPreviewMode(false)
    setAddOpen(true)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Newspaper className="w-4 h-4 text-orange-600" />
            Kabar Utama & Pengumuman ({items.length})
          </CardTitle>
          <Button onClick={() => openEditor()} size="sm" className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> Buat Berita/Pengumuman
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari berita atau pengumuman..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={Newspaper} title="Belum ada berita" description="Klik 'Buat Berita/Pengumuman' untuk menambahkan." />
        ) : (
          <div className="space-y-2">
            {filtered.map((a) => {
              const tc = typeConfig[a.type] || typeConfig.INFO
              const cc = categoryConfig[a.category] || categoryConfig.BERITA
              const isWebSync = a.source === 'WEB_SYNC' // Berita dari web lain = READ-ONLY
              return (
                <div key={a.id} className={`group relative rounded-xl border p-3 hover:shadow-md transition-all bg-white ${isWebSync ? 'border-l-4 border-l-blue-400' : ''}`}>
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    {a.photoUrl ? (
                      <img src={a.photoUrl} alt={a.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className={`w-16 h-16 rounded-lg flex items-center justify-center shrink-0 ${isWebSync ? 'bg-gradient-to-br from-blue-100 to-indigo-200' : 'bg-gradient-to-br from-slate-100 to-slate-200'}`}>
                        {isWebSync ? <Globe className="w-6 h-6 text-blue-500" /> : <ImageIcon className="w-6 h-6 text-slate-400" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {a.isPinned && <Pin className="w-3 h-3 text-orange-500 shrink-0" />}
                        <div className="font-semibold text-sm truncate">{a.title}</div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${cc.color}`}>{cc.label}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${tc.color}`}>{tc.label}</Badge>
                        {/* Badge sumber untuk WEB_SYNC */}
                        {isWebSync && (
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                            <Globe className="w-2.5 h-2.5 mr-0.5" /> {a.sourceName || 'Web'}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {a.publishDate ? formatDateID(a.publishDate) : formatDateTimeID(a.createdAt)}
                        </span>
                      </div>
                      {/* Link Baca Selengkapnya untuk WEB_SYNC */}
                      {isWebSync && a.sourceUrl && (
                        <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline">
                          <ExternalLink className="w-3 h-3" />
                          Baca Selengkapnya di {a.sourceName || 'sumber asli'}
                        </a>
                      )}
                    </div>
                    {/* Tombol Edit & Hapus HANYA untuk berita MANUAL (admin buat) */}
                    {!isWebSync && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEditor(a)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:bg-red-50" onClick={() => setDeleteItem(a)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                    {/* Badge READ-ONLY untuk WEB_SYNC */}
                    {isWebSync && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-500 border-slate-200">
                          <Lock className="w-2.5 h-2.5 mr-0.5" /> Read-Only
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Dialog Editor + Preview */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setEditItem(null); setPreviewMode(false) } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {!previewMode ? (
            // === MODE EDITOR ===
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  {editItem ? 'Edit' : 'Buat'} Berita / Pengumuman / Siaran Pers
                </DialogTitle>
                <DialogDescription>Lengkapi form di bawah, lalu klik "Pratinjau" untuk melihat hasil sebelum disiarkan</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Kategori & Tipe */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Kategori *</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BERITA">Berita</SelectItem>
                        <SelectItem value="PENGUMUMAN">Pengumuman</SelectItem>
                        <SelectItem value="SIRANAN_PERS">Siaran Pers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioritas</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INFO">Info</SelectItem>
                        <SelectItem value="WARNING">Peringatan</SelectItem>
                        <SelectItem value="URGENT">Mendesak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Judul */}
                <div className="space-y-2">
                  <Label>Judul *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Masukkan judul berita/pengumuman..."
                    className="text-base font-medium"
                    required
                  />
                </div>

                {/* Upload Gambar */}
                <div className="space-y-2">
                  <Label>Foto/Gambar Pendukung</Label>
                  {form.imageUrl ? (
                    <div className="relative group">
                      <img src={form.imageUrl} alt="Preview" className="w-full max-h-48 object-cover rounded-xl border" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setForm({ ...form, imageUrl: '' })}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-xl p-6 text-center hover:border-orange-400 transition-colors cursor-pointer"
                      onClick={() => document.getElementById('news-image-upload')?.click()}
                    >
                      <input
                        type="file"
                        id="news-image-upload"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
                      />
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <div className="text-sm font-medium">Upload Foto/Gambar</div>
                      <div className="text-xs text-muted-foreground mt-1">JPG, PNG, atau WebP • Maks 5MB</div>
                    </div>
                  )}
                </div>

                {/* Isi Berita */}
                <div className="space-y-2">
                  <Label>Isi Berita/Pengumuman *</Label>
                  <Textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    rows={6}
                    placeholder="Tulis isi berita atau pengumuman di sini..."
                    className="resize-y"
                    required
                  />
                </div>

                {/* Tanggal Rilis & Wilayah */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tanggal Rilis *</Label>
                    <Input
                      type="date"
                      value={form.publishDate}
                      onChange={(e) => setForm({ ...form, publishDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wilayah *</Label>
                    <Select value={form.territoryId} onValueChange={(v) => setForm({ ...form, territoryId: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {territories.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Pin Option */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border">
                  <input type="checkbox" id="pinned-news" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} className="w-4 h-4" />
                  <Label htmlFor="pinned-news" className="cursor-pointer">Sematkan di atas (Pinned)</Label>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-2">
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPreviewMode(true)}
                      disabled={!form.title || !form.content}
                      className="border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4 mr-1" /> Pratinjau
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // === MODE PREVIEW (sebelum siaran) ===
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  Pratinjau Sebelum Disiarkan
                </DialogTitle>
                <DialogDescription>Periksa tampilan berita/pengumuman sebelum dipublikasikan</DialogDescription>
              </DialogHeader>

              {/* Preview Content — seperti akan tampil di publik */}
              <div className="rounded-xl border overflow-hidden shadow-lg">
                {/* Image */}
                {form.imageUrl && (
                  <img src={form.imageUrl} alt={form.title} className="w-full max-h-64 object-cover" />
                )}
                <div className="p-5 bg-white">
                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${(categoryConfig[form.category] || categoryConfig.BERITA).color}`}>
                      {(categoryConfig[form.category] || categoryConfig.BERITA).label}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${(typeConfig[form.type] || typeConfig.INFO).color}`}>
                      {(typeConfig[form.type] || typeConfig.INFO).label}
                    </Badge>
                    {form.isPinned && (
                      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                        <Pin className="w-3 h-3 mr-1" /> Pinned
                      </Badge>
                    )}
                  </div>
                  {/* Title */}
                  <h2 className="text-xl font-bold text-slate-800 mb-2">{form.title || '(Judul berita)'}</h2>
                  {/* Meta */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    <span>{formatDateID(form.publishDate || new Date().toISOString())}</span>
                    <span>•</span>
                    <span>Portal LAPRA 08</span>
                  </div>
                  {/* Content */}
                  <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {form.content || '(Isi berita/pengumuman)'}
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                Pastikan semua data sudah benar. Setelah disiarkan, berita akan tampil di portal dan running news ticker.
              </div>

              {/* Action Buttons */}
              <DialogFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setPreviewMode(false)}>
                  <Edit className="w-4 h-4 mr-1" /> Edit Lagi
                </Button>
                <Button
                  type="button"
                  onClick={handlePublish}
                  disabled={saving}
                  className="bg-gradient-to-r from-orange-600 to-red-600 text-white"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Menyiarkan...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-1" /> Siarkan / Publikasikan</>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Berita?</AlertDialogTitle>
            <AlertDialogDescription>Yakin hapus <strong>{deleteItem?.title}</strong>? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// ============================================================
// 4. PROGRAM & KEGIATAN — Full Events + Absensi + Laporan
// ============================================================
export function ProgramKegiatanMenu() {
  const [tab, setTab] = useState('program')
  const tabs = [
    { key: 'program', label: 'Program Kerja', icon: Briefcase },
    { key: 'aksi', label: 'Aksi Sosial & Sinergi', icon: HandHeart },
    { key: 'kemitraan', label: 'Kemitraan', icon: Users },
    { key: 'agenda', label: 'Agenda & Kegiatan', icon: CalendarClock },
  ]
  return (
    <div className="space-y-6">
      <PageHeader title="Program & Kegiatan" description="Program kerja, aksi sosial, kemitraan, dan agenda kegiatan" icon={CalendarDays} />
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-sm' : 'border hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'agenda' ? (
        <EventsMenu />
      ) : tab === 'program' ? (
        <ProgramKerjaManager />
      ) : tab === 'aksi' ? (
        <AksiSosialManager />
      ) : (
        <KemitraanManager />
      )}
    </div>
  )
}

// ============================================================
// PROGRAM KERJA MANAGER — CRUD + auto-sync dari berita
// ============================================================
function ProgramKerjaManager() {
  return (
    <ProgramContentManager
      title="Program Kerja Nasional & Daerah"
      description="Program kerja strategis DPN, DPD, dan DPC"
      icon={Briefcase}
      category="PROGRAM_KERJA"
      accentColor="from-blue-500 to-indigo-600"
    />
  )
}

// ============================================================
// AKSI SOSIAL MANAGER — CRUD + auto-sync dari berita
// ============================================================
function AksiSosialManager() {
  return (
    <ProgramContentManager
      title="Aksi Sosialisasi & Sinergi"
      description="Dokumentasi aksi sosial dan kegiatan kemasyarakatan"
      icon={HandHeart}
      category="AKSI_SOSIAL"
      accentColor="from-emerald-500 to-teal-600"
    />
  )
}

// ============================================================
// KEMITRAAN MANAGER — CRUD + auto-sync dari berita
// ============================================================
function KemitraanManager() {
  return (
    <ProgramContentManager
      title="Kemitraan & Kolaborasi Strategis"
      description="Kemitraan dengan ummat, organisasi, dan institusi"
      icon={Users}
      category="KEMITRAAN"
      accentColor="from-purple-500 to-pink-600"
    />
  )
}

// ============================================================
// PROGRAM CONTENT MANAGER — Reusable CRUD untuk semua tab
// Store di SystemSetting dengan category = PROGRAM_*
// ============================================================
function ProgramContentManager({ title, description, icon: Icon, category, accentColor }: {
  title: string; description: string; icon: any; category: string; accentColor: string
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [form, setForm] = useState({ title: '', description: '', location: '', date: '', status: 'DIRENCANAKAN' })
  const [saving, setSaving] = useState(false)

  const loadData = () => {
    setLoading(true)
    api('/api/gallery').then((all: any[]) => {
      const filtered = all.filter((a: any) => a.category === category)
      setItems(filtered)
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const itemData = {
        id: editItem?.id || `prog_${Date.now()}`,
        title: form.title,
        description: form.description,
        location: form.location,
        date: form.date,
        status: form.status,
        category,
        uploadedBy: useAuthStore.getState().user?.fullName || 'Admin',
        uploadedAt: new Date().toISOString(),
      }

      // Save via gallery API (JSON mode) — handles both create and update
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '', 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal menyimpan')

      addToast(editItem ? 'Program diperbarui' : 'Program baru ditambahkan', 'success')
      setForm({ title: '', description: '', location: '', date: '', status: 'DIRENCANAKAN' })
      setAddOpen(false); setEditItem(null)
      loadData()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await fetch(`/api/gallery/${deleteItem.id}?id=${deleteItem.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
      })
      addToast('Program dihapus', 'success')
      setDeleteItem(null); loadData()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  const openEditor = (item?: any) => {
    if (item) {
      setEditItem(item)
      setForm({ title: item.title || '', description: item.description || '', location: item.location || '', date: item.date || '', status: item.status || 'DIRENCANAKAN' })
    } else {
      setEditItem(null)
      setForm({ title: '', description: '', location: '', date: '', status: 'DIRENCANAKAN' })
    }
    setAddOpen(true)
  }

  if (loading) return <LoadingState />

  const filtered = items.filter((a) => !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.description?.toLowerCase().includes(search.toLowerCase()))

  const statusConfig: Record<string, { label: string; color: string }> = {
    DIRENCANAKAN: { label: 'Direncanakan', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    BERJALAN: { label: 'Berjalan', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    SELESAI: { label: 'Selesai', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    DITUNDA: { label: 'Ditunda', color: 'bg-red-50 text-red-700 border-red-200' },
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accentColor} flex items-center justify-center`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            {title} ({items.length})
          </CardTitle>
          <Button onClick={() => openEditor()} size="sm" className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> Tambah
          </Button>
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={`Cari ${title.toLowerCase()}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={Icon} title={`Belum ada ${title.toLowerCase()}`} description={`Klik 'Tambah' untuk mempublikasikan ${title.toLowerCase()}.`} />
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const sc = statusConfig[item.status] || statusConfig.DIRENCANAKAN
              return (
                <div key={item.id} className="group relative rounded-xl border p-4 hover:shadow-md transition-all bg-white">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accentColor} flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">{item.title}</div>
                      {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${sc.color}`}>{sc.label}</Badge>
                        {item.location && <span className="text-[10px] text-muted-foreground">📍 {item.location}</span>}
                        {item.date && <span className="text-[10px] text-muted-foreground">📅 {formatDateID(item.date)}</span>}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEditor(item)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:bg-red-50" onClick={() => setDeleteItem(item)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Dialog Tambah/Edit */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setEditItem(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accentColor} flex items-center justify-center`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              {editItem ? 'Edit' : 'Tambah'} {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Judul *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="cth: Program Sosialisasi MBG ke DPC" required />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4} placeholder="Jelaskan program/kegiatan secara detail..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Lokasi</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="cth: Jakarta, Pontianak, dll" />
              </div>
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIRENCANAKAN">Direncanakan</SelectItem>
                  <SelectItem value="BERJALAN">Berjalan</SelectItem>
                  <SelectItem value="SELESAI">Selesai</SelectItem>
                  <SelectItem value="DITUNDA">Ditunda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                {editItem ? 'Simpan Perubahan' : 'Publikasikan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus?</AlertDialogTitle>
            <AlertDialogDescription>Yakin hapus <strong>{deleteItem?.title}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// ============================================================
// 5. LAYANAN & ADVOKASI — KTA, Pengaduan, Bantuan Hukum, Help
// ============================================================
export function LayananAdvokasiMenu() {
  const [tab, setTab] = useState('bantuan')
  const tabs = [
    { key: 'kta', label: 'Layanan KTA', icon: KeyRound },
    { key: 'pengaduan', label: 'Pengaduan & Aspirasi', icon: MessageSquare },
    { key: 'hukum', label: 'Bantuan Hukum', icon: Scale },
    { key: 'bantuan', label: 'Pusat Bantuan & Tiket', icon: HelpCircle },
  ]
  return (
    <div className="space-y-6">
      <PageHeader title="Layanan & Advokasi" description="Layanan KTA, pengaduan, advokasi hukum, dan pusat bantuan" icon={ShieldCheck} />
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-sm' : 'border hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'bantuan' ? (
        <HelpMenu />
      ) : tab === 'kta' ? (
        <KtaLayananManager />
      ) : tab === 'pengaduan' ? (
        <PengaduanManager />
      ) : (
        <BantuanHukumManager />
      )}
    </div>
  )
}

// ----- Layanan KTA -----
function KtaLayananManager() {
  const addToast = useToastStore((s) => s.addToast)
  const [search, setSearch] = useState('')
  const [member, setMember] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!search.trim()) { addToast('Masukkan KTA, NIK, atau nama', 'error'); return }
    setLoading(true); setMember(null)
    try {
      const data = await api(`/api/members?search=${encodeURIComponent(search)}&limit=1`)
      if (data && data.length > 0) {
        setMember(data[0])
      } else {
        addToast('Anggota tidak ditemukan', 'error')
      }
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="w-4 h-4 text-emerald-600" /> Verifikasi & Cek Keanggotaan</CardTitle>
          <CardDescription>Cari data anggota berdasarkan nomor KTA, NIK, atau nama lengkap</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="cth: LAPRA08.ID.61.6171.26.00001 atau nama anggota" onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
            <Button onClick={handleSearch} disabled={loading} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Cari
            </Button>
          </div>
          {member && (
            <div className="rounded-xl border bg-gradient-to-br from-orange-50 via-white to-red-50 p-6">
              <div className="flex items-start gap-4">
                <div className="w-24 h-32 rounded-lg overflow-hidden border-2 border-orange-500 shadow-md shrink-0 bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center text-white">
                  {member.photoUrl ? <img src={member.photoUrl} alt={member.fullName} className="w-full h-full object-cover" /> : <Users className="w-12 h-12" />}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold">{member.fullName}</h3>
                    <Badge variant="outline" className={`text-[10px] ${member.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {member.status === 'ACTIVE' ? 'Aktif' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">No. KTA:</span> <strong className="font-mono">{member.ktaNumber}</strong></div>
                    <div><span className="text-muted-foreground">NIK:</span> <strong>{member.nik}</strong></div>
                    <div><span className="text-muted-foreground">Wilayah:</span> <strong>{member.territory?.name || '-'}</strong></div>
                    <div><span className="text-muted-foreground">Jenis Kelamin:</span> <strong>{member.gender === 'M' ? 'Laki-laki' : 'Perempuan'}</strong></div>
                    <div><span className="text-muted-foreground">Tgl Daftar:</span> <strong>{formatDateID(member.joinDate)}</strong></div>
                    <div><span className="text-muted-foreground">Pekerjaan:</span> <strong>{member.occupation || '-'}</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Award className="w-4 h-4 text-blue-600" /> Informasi Layanan KTA</CardTitle>
          <CardDescription>Panduan layanan Kartu Tanda Anggota digital LAPRA 08</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border p-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            <div className="font-semibold text-sm">KTA Digital</div>
            <p className="text-xs text-muted-foreground mt-1">Diterbitkan otomatis setelah verifikasi DPC. Berisi QR code untuk verifikasi keaslian.</p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-2"><KeyRound className="w-5 h-5 text-blue-600" /></div>
            <div className="font-semibold text-sm">Format KTA</div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">LAPRA08.[NEGARA].[PROV].[KAB].[TAHUN].[URUT]</p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center mb-2"><FileText className="w-5 h-5 text-orange-600" /></div>
            <div className="font-semibold text-sm">Cetak KTA Fisik</div>
            <p className="text-xs text-muted-foreground mt-1">Tersedia di sekretariat DPC. Biaya Rp 25.000 dengan kartu PVC + hologram.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ----- Pengaduan & Aspirasi -----
function PengaduanManager() {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({ name: '', email: '', phone: '', category: '', subject: '', description: '', anonymous: false })
  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api('/api/sekretariat/messages?category=PENGADUAN').then((data: any[]) => {
      setComplaints(data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.subject || !form.description) { addToast('Subjek dan deskripsi wajib diisi', 'error'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/sekretariat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({
          name: form.anonymous ? 'Anonim' : form.name,
          email: form.anonymous ? 'anonim@lapra08.id' : form.email,
          phone: form.anonymous ? '' : form.phone,
          subject: `[PENGADUAN] ${form.subject}`,
          message: `Kategori: ${form.category}\n\n${form.description}`,
          priority: 'NORMAL',
          category: 'PENGADUAN',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengirim')
      addToast('Pengaduan Anda terkirim. Akan ditindaklanjuti dalam 1x24 jam.', 'success')
      setForm({ name: '', email: '', phone: '', category: '', subject: '', description: '', anonymous: false })
      api('/api/sekretariat/messages?category=PENGADUAN').then(setComplaints).catch(() => {})
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSubmitting(false) }
  }

  const categories = [
    { value: 'PELANGGARAN_ANGGOTA', label: 'Pelanggaran Anggota' },
    { value: 'KEUANGAN', label: 'Keuangan / Iuran' },
    { value: 'PEMILIHAN_PENGURUS', label: 'Pemilihan Pengurus' },
    { value: 'PROGRAM_KERJA', label: 'Program Kerja' },
    { value: 'PELAYANAN_DPC', label: 'Pelayanan DPC' },
    { value: 'LAINNYA', label: 'Lainnya' },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="w-4 h-4 text-emerald-600" /> Form Pengaduan & Aspirasi</CardTitle>
          <CardDescription>Salurkan pengaduan, kritik, dan aspirasi untuk perbaikan organisasi</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="anon" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} />
              <Label htmlFor="anon" className="text-sm">Kirim sebagai anonim</Label>
            </div>
            {!form.anonymous && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Nama</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama Anda" /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" /></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {!form.anonymous && <div className="space-y-2"><Label>Telepon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+62 812-xxxx-xxxx" /></div>}
              <div className="space-y-2"><Label>Kategori *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Subjek *</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="cth: Laporan ketidaksesuaian iuran" required /></div>
            <div className="space-y-2"><Label>Deskripsi *</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} placeholder="Jelaskan pengaduan secara detail dan faktual..." required /></div>
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white">
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} Kirim Pengaduan
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Mail className="w-4 h-4 text-blue-600" /> Riwayat Pengaduan ({complaints.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <LoadingState /> : complaints.length === 0 ? (
            <EmptyState icon={MessageSquare} title="Belum ada pengaduan" description="Pengaduan yang Anda kirim akan muncul di sini." />
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {complaints.map((c) => (
                <div key={c.id} className="rounded-xl border p-3 bg-white">
                  <div className="font-semibold text-sm">{c.subject}</div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{c.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant={c.status === 'RESOLVED' ? 'default' : 'outline'} className={`text-[10px] ${c.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {c.status === 'RESOLVED' ? 'Selesai' : c.status === 'READ' ? 'Dibaca' : 'Baru'}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{formatDateTimeID(c.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ----- Bantuan Hukum -----
function BantuanHukumManager() {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({ name: '', email: '', phone: '', caseType: '', caseDesc: '', urgency: 'NORMAL' })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.caseType || !form.caseDesc) { addToast('Lengkapi semua field wajib', 'error'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/sekretariat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone,
          subject: `[BANTUAN_HUKUM] ${form.caseType}`,
          message: `Urgensi: ${form.urgency}\n\n${form.caseDesc}`,
          priority: form.urgency === 'URGENT' ? 'URGENT' : form.urgency === 'TINGGI' ? 'TINGGI' : 'NORMAL',
          category: 'BANTUAN_HUKUM',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengirim')
      addToast('Permohonan bantuan hukum terkirim. Tim advokasi akan menghubungi Anda dalam 1x24 jam.', 'success')
      setForm({ name: '', email: '', phone: '', caseType: '', caseDesc: '', urgency: 'NORMAL' })
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSubmitting(false) }
  }

  const caseTypes = [
    { value: 'PIDANA', label: 'Hukum Pidana' },
    { value: 'PERDATA', label: 'Hukum Perdata' },
    { value: 'TATA_USAHA', label: 'Hukum Tata Usaha Negara' },
    { value: 'Ketenagakerjaan', label: 'Ketenagakerjaan' },
    { value: 'KONSUMEN', label: 'Perlindungan Konsumen' },
    { value: 'LAINNYA', label: 'Lainnya' },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Scale className="w-4 h-4 text-emerald-600" /> Formulir Bantuan Hukum</CardTitle>
          <CardDescription>Ajukan permohonan bantuan hukum untuk anggota LAPRA 08</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Nama Lengkap *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama Anda" required /></div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Telepon / WA *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+62 812-xxxx-xxxx" /></div>
              <div className="space-y-2"><Label>Urgensi</Label>
                <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RENDAH">Rendah</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="TINGGI">Tinggi</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Jenis Kasus *</Label>
              <Select value={form.caseType} onValueChange={(v) => setForm({ ...form, caseType: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih jenis kasus" /></SelectTrigger>
                <SelectContent>{caseTypes.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Deskripsi Kasus *</Label><Textarea value={form.caseDesc} onChange={(e) => setForm({ ...form, caseDesc: e.target.value })} rows={5} placeholder="Jelaskan kronologi singkat kasus, status hukum saat ini, dan bantuan yang dibutuhkan..." required /></div>
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white">
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} Kirim Permohonan
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="w-4 h-4 text-blue-600" /> Informasi Layanan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200">
            <div className="font-semibold text-emerald-800 mb-1">Konsultasi Awal - GRATIS</div>
            <p className="text-xs text-emerald-700">Anggota LAPRA 08 mendapatkan konsultasi hukum awal gratis untuk assessment kasus.</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
            <div className="font-semibold text-blue-800 mb-1">Tim Advokasi DPN</div>
            <p className="text-xs text-blue-700">Ditangani oleh tim advokasi DPN berpengalaman dengan jaringan pengacara mitra di seluruh Indonesia.</p>
          </div>
          <div className="rounded-lg bg-orange-50 p-3 border border-orange-200">
            <div className="font-semibold text-orange-800 mb-1">Tarif Khusus Anggota</div>
            <p className="text-xs text-orange-700">Untuk kasus yang membutuhkan pendampingan lanjutan, anggota mendapatkan tarif diskon 30-50% dari pengacara mitra.</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 border">
            <div className="font-semibold text-slate-800 mb-1">Hotline 24/7</div>
            <p className="text-xs text-slate-700 font-mono">+62 811-9090-08</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// 6. KONTAK & SEKRETARIAT — Lokasi, Hubungi, FAQ (Full Implementation)
// ============================================================
export function KontakSekretariatMenu() {
  const [tab, setTab] = useState('lokasi')
  const tabs = [
    { key: 'lokasi', label: 'Lokasi Sekretariat', icon: MapIcon },
    { key: 'hubungi', label: 'Hubungi Kami', icon: Mail },
    { key: 'faq', label: 'FAQ', icon: HelpCircle },
  ]
  return (
    <div className="space-y-6">
      <PageHeader title="Kontak & Sekretariat" description="Lokasi sekretariat, form kontak, dan FAQ" icon={MapIcon} />
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-sm' : 'border hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'lokasi' ? <LokasiSekretariatManager /> : tab === 'hubungi' ? <HubungiKamiManager /> : <FaqManager />}
    </div>
  )
}

// ----- Lokasi Sekretariat -----
function LokasiSekretariatManager() {
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    // Seed default locations once
    const defaults = [
      { id: 'loc_dpn', name: 'Sekretariat DPN LAPRA 08', level: 'DPN', address: 'Jl. Medan Merdeka Barat No. 12, Gambir, Jakarta Pusat', city: 'Jakarta Pusat', province: 'DKI Jakarta', postalCode: '10110', phone: '+62 21 3456 7890', email: 'sekretariat@lapra08.id', lat: -6.1754, lng: 106.8272, hours: 'Senin-Jumat 08:00-17:00 WIB', mapUrl: 'https://www.google.com/maps?q=Medan+Merdeka+Barat+Jakarta' },
      { id: 'loc_kw3', name: 'Sekretariat Koorwil III Kalimantan', level: 'KOORWIL', address: 'Jl. Ahmad Yani No. 1, Banjarmasin', city: 'Banjarmasin', province: 'Kalimantan Selatan', postalCode: '70111', phone: '+62 511 234 5678', email: 'koorwil3@lapra08.id', lat: -3.3194, lng: 114.5908, hours: 'Senin-Jumat 08:00-16:00 WIB', mapUrl: 'https://www.google.com/maps?q=Banjarmasin' },
      { id: 'loc_dpd_kalbar', name: 'Sekretariat DPD Kalimantan Barat', level: 'DPD', address: 'Jl. Sisingamangaraja No. 5, Pontianak Kota', city: 'Pontianak', province: 'Kalimantan Barat', postalCode: '78111', phone: '+62 561 732 456', email: 'dpd.kalbar@lapra08.id', lat: -0.0263, lng: 109.3425, hours: 'Senin-Jumat 08:00-16:00 WIB', mapUrl: 'https://www.google.com/maps?q=Pontianak' },
      { id: 'loc_dpc_6171', name: 'Sekretariat DPC Pontianak Kota', level: 'DPC', address: 'Jl. Tanjungpura No. 22, Pontianak Kota', city: 'Pontianak', province: 'Kalimantan Barat', postalCode: '78112', phone: '+62 561 745 111', email: 'dpc.6171@lapra08.id', lat: -0.0193, lng: 109.3218, hours: 'Senin-Sabtu 08:00-16:00 WIB', mapUrl: 'https://www.google.com/maps?q=Jl+Tanjungpura+Pontianak' },
      { id: 'loc_dpc_6175', name: 'Sekretariat DPC Sambas', level: 'DPC', address: 'Jl. Sebatang No. 14, Sambas', city: 'Sambas', province: 'Kalimantan Barat', postalCode: '79453', phone: '+62 561 888 999', email: 'dpc.6175@lapra08.id', lat: 1.2867, lng: 109.3425, hours: 'Senin-Sabtu 08:00-16:00 WIB', mapUrl: 'https://www.google.com/maps?q=Sambas+Kalbar' },
      { id: 'loc_dpdbabel', name: 'Sekretariat DPD Bangka Belitung', level: 'DPD', address: 'Jl. Mayor Syafrie Rizal No. 7, Pangkalpinang', city: 'Pangkalpinang', province: 'Bangka Belitung', postalCode: '33121', phone: '+62 717 432 100', email: 'dpd.babel@lapra08.id', lat: -2.1290, lng: 106.1143, hours: 'Senin-Jumat 08:00-16:00 WIB', mapUrl: 'https://www.google.com/maps?q=Pangkalpinang' },
    ]
    // Persist defaults to SystemSetting (once), then load
    api('/api/sekretariat').then((data: any[]) => {
      if (data && data.length > 0) {
        setLocations(data)
      } else {
        // Save defaults
        Promise.all(defaults.map(d => fetch('/api/sekretariat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
          body: JSON.stringify(d),
        }).catch(() => {}))).then(() => api('/api/sekretariat').then(setLocations))
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState />

  const filtered = locations.filter(l => !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.city.toLowerCase().includes(search.toLowerCase()) || l.province.toLowerCase().includes(search.toLowerCase()))

  const levelConfig: Record<string, { label: string; color: string; icon: any }> = {
    DPN: { label: 'DPN Pusat', color: 'bg-red-50 text-red-700 border-red-200', icon: Building2 },
    KOORWIL: { label: 'Koorwil', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Globe },
    DPD: { label: 'DPD Provinsi', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Building2 },
    DPC: { label: 'DPC Kab/Kota', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Building2 },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapIcon className="w-4 h-4 text-emerald-600" /> Lokasi Sekretariat ({filtered.length})
        </CardTitle>
        <CardDescription>Pusat informasi alamat sekretariat DPN, Koorwil, DPD, dan DPC se-Indonesia</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari sekretariat berdasarkan nama/kota/provinsi..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((loc) => {
            const lc = levelConfig[loc.level] || levelConfig.DPC
            const LcIcon = lc.icon
            return (
              <div key={loc.id} className="rounded-xl border p-4 hover:shadow-md transition-all bg-white">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
                    <LcIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm leading-tight">{loc.name}</div>
                    <Badge variant="outline" className={`text-[10px] mt-1 ${lc.color}`}>{lc.label}</Badge>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" /><span>{loc.address}, {loc.city}, {loc.province} {loc.postalCode}</span></div>
                  <div className="flex items-center gap-2"><PhoneCall className="w-3.5 h-3.5 text-blue-500 shrink-0" /><span>{loc.phone}</span></div>
                  <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-emerald-500 shrink-0" /><span className="truncate">{loc.email}</span></div>
                  <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" /><span>{loc.hours}</span></div>
                </div>
                <a href={loc.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                  <ExternalLink className="w-3 h-3" /> Lihat di Google Maps
                </a>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ----- Hubungi Kami -----
function HubungiKamiManager() {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '', priority: 'NORMAL' })
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api('/api/sekretariat/messages').then((data: any[]) => {
      setMessages(data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.subject || !form.message) {
      addToast('Lengkapi semua field wajib', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/sekretariat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengirim')
      addToast('Pesan terkirim ke sekretariat. Kami akan merespons dalam 1x24 jam.', 'success')
      setForm({ name: '', email: '', phone: '', subject: '', message: '', priority: 'NORMAL' })
      api('/api/sekretariat/messages').then(setMessages).catch(() => {})
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSubmitting(false) }
  }

  const priorityConfig: Record<string, { label: string; color: string }> = {
    RENDAH: { label: 'Rendah', color: 'bg-slate-50 text-slate-700 border-slate-200' },
    NORMAL: { label: 'Normal', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    TINGGI: { label: 'Tinggi', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    URGENT: { label: 'Urgent', color: 'bg-red-50 text-red-700 border-red-200' },
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Mail className="w-4 h-4 text-emerald-600" /> Kirim Pesan ke Sekretariat</CardTitle>
          <CardDescription>Formulir kontak resmi untuk pertanyaan, saran, atau aspirasi</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Nama Lengkap *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama Anda" required /></div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Telepon / WA</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+62 812-xxxx-xxxx" /></div>
              <div className="space-y-2"><Label>Prioritas</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Subjek *</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="cth: Permintaan informasi keanggotaan" required /></div>
            <div className="space-y-2"><Label>Pesan *</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} placeholder="Tulis pesan Anda dengan jelas dan detail..." required /></div>
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white">
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Kirim Pesan
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="w-4 h-4 text-blue-600" /> Riwayat Pesan ({messages.length})</CardTitle>
          <CardDescription>Pesan yang telah Anda kirim ke sekretariat</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <LoadingState /> : messages.length === 0 ? (
            <EmptyState icon={Mail} title="Belum ada pesan" description="Pesan yang Anda kirim akan muncul di sini." />
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {messages.map((m) => {
                const pc = priorityConfig[m.priority] || priorityConfig.NORMAL
                return (
                  <div key={m.id} className="rounded-xl border p-3 bg-white">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge variant="outline" className={`text-[10px] ${pc.color}`}>{pc.label}</Badge>
                      <Badge variant={m.status === 'RESOLVED' ? 'default' : m.status === 'READ' ? 'secondary' : 'outline'} className={`text-[10px] ${m.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' : m.status === 'READ' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                        {m.status === 'RESOLVED' ? 'Selesai' : m.status === 'READ' ? 'Dibaca' : 'Baru'}
                      </Badge>
                    </div>
                    <div className="font-semibold text-sm">{m.subject}</div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.message}</p>
                    <div className="text-[10px] text-muted-foreground mt-2">{m.name} • {formatDateTimeID(m.createdAt)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ----- FAQ -----
function FaqManager() {
  const [faqs, setFaqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [openItem, setOpenItem] = useState<string | null>(null)

  useEffect(() => {
    const defaults = [
      { id: 'faq_1', category: 'KEANGGOTAAN', q: 'Bagaimana cara mendaftar menjadi anggota LAPRA 08?', a: 'Pendaftaran anggota LAPRA 08 dilakukan melalui DPC setempat (Kabupaten/Kota). Anda dapat mengunjungi sekretariat DPC di wilayah Anda, mengisi formulir pendaftaran, melampirkan fotokopi KTP dan pas foto, serta membayar iuran pendaftaran. Setelah diverifikasi, Anda akan menerima KTA (Kartu Tanda Anggota) digital dengan format unik LAPRA08.[NEGARA].[PROVINSI].[KAB/KOTA].[TAHUN].[URUT].' },
      { id: 'faq_2', category: 'KEANGGOTAAN', q: 'Apakah anggota luar negeri bisa mendaftar?', a: 'Ya. LAPRA 08 memiliki DPD di 5 negara (Amerika Serikat, Cina, Malaysia, Arab Saudi, dan Australia). Warga Indonesia yang berdomisili di negara tersebut dapat mendaftar melalui DPD setempat. Format KTA internasional menggunakan kode negara setempat, misalnya LAPRA08.US.00.LAX.26.00001 untuk anggota di Los Angeles.' },
      { id: 'faq_3', category: 'KEANGGOTAAN', q: 'Berapa iuran anggota LAPRA 08?', a: 'Iuran anggota dibagi menjadi beberapa kategori: (1) Iuran bulanan anggota biasa Rp 25.000/bulan; (2) Iuran bulanan pengurus Rp 50.000/bulan; (3) Iuran tahunan dapat dibayar di muka dengan diskon. Iuran dapat dibayarkan melalui transfer ke rekening resmi DPC atau via QRIS. Khusus anggota luar negeri, iuran setara USD 5/bulan.' },
      { id: 'faq_4', category: 'STRUKTUR', q: 'Apa saja tingkatan struktur pengurus LAPRA 08?', a: 'Struktur LAPRA 08 terdiri dari 5 tingkat: (1) DPN (Dewan Pimpinan Pusat) di tingkat nasional; (2) Koorwil (Koordinator Wilayah) yang membawahi 7 wilayah Indonesia + 1 LN; (3) DPD (Dewan Pimpinan Daerah) di tingkat provinsi/negara LN; (4) Koor DPD (Koordinator Region) yang membawahi kelompok DPC; (5) DPC (Dewan Pimpinan Cabang) di tingkat kabupaten/kota. Total ada 38 provinsi + IKN + 5 negara LN.' },
      { id: 'faq_5', category: 'STRUKTUR', q: 'Siapa Ketua Umum DPN LAPRA 08 periode 2024-2029?', a: 'Pengurus DPN LAPRA 08 periode 2024-2029 dipimpin oleh Dr. (HC) Hashim S. Djojohadikusumo sebagai Ketua Dewan Pembina, dan Devi Taurisa, S.H., M.H., C.L.D. sebagai Ketua Umum DPN. Sekretaris Jenderal dijabat oleh Brigjen. Pol. (Purn) Dr. R. Nurhadi, S.I.K., M.Si., CHRMP, dan Bendahara Umum adalah Timmy Rorimpandey, S.E., M.M. Pembaruan pengurus inti dilakukan pada Maret 2026.' },
      { id: 'faq_6', category: 'PROGRAM', q: 'Apa program unggulan LAPRA 08?', a: 'Program unggulan LAPRA 08 meliputi: (1) Sosialisasi Asta Cita Presiden Prabowo ke seluruh DPD di 38 provinsi; (2) Penguatan kader DPC se-Indonesia melalui pelatihan rutin; (3) Aksi sosial seperti bakti sosial, donor darah, dan distribusi sembako; (4) Kemitraan dengan ummat, ormas Islam, kementerian, dan BUMN untuk program CSR; (5) Digitalisasi sistem informasi internal untuk efisiensi administrasi.' },
      { id: 'faq_7', category: 'PROGRAM', q: 'Bagaimana cara mengajukan proposal kemitraan dengan LAPRA 08?', a: 'Proposal kemitraan dapat diajukan melalui email resmi sekretariat@lapra08.id dengan subject "Proposal Kemitraan - [Nama Institusi]". Lampirkan profil institusi, latar belakang kemitraan, lingkup kerja sama, dan expected outcomes. Tim Sekretariat DPN akan melakukan review dalam 14 hari kerja dan menghubungi Anda untuk diskusi lebih lanjut jika proposal memenuhi kriteria.' },
      { id: 'faq_8', category: 'LAYANAN', q: 'Bagaimana cara mengajukan pengaduan atau aspirasi?', a: 'Pengaduan dan aspirasi dapat disampaikan melalui: (1) Formulir "Hubungi Kami" di menu Kontak & Sekretariat; (2) Pusat Pengaduan & Aspirasi di menu Layanan & Advokasi; (3) WhatsApp resmi DPC setempat; (4) Surat resmi ke sekretariat DPN. Setiap pengaduan akan ditindaklanjuti dalam 1x24 jam (kasus normal) atau 2 jam (kasus urgent). Identitas pelapor dilindungi sesuai kebijakan privasi.' },
      { id: 'faq_9', category: 'LAYANAN', q: 'Apakah LAPRA 08 menyediakan bantuan hukum untuk anggota?', a: 'Ya, LAPRA 08 menyediakan layanan bantuan hukum untuk anggota yang menghadapi kasus hukum terkait aktivitas keorganisasian. Layanan ini diakses melalui menu "Bantuan Hukum" di Layanan & Advokasi. Tim advokasi DPN akan melakukan assessment kasus, memberikan konsultasi awal gratis, dan jika diperlukan, merujuk ke pengacara mitra dengan tarif khusus untuk anggota.' },
      { id: 'faq_10', category: 'LAINNYA', q: 'Bagaimana cara mendapatkan KTA digital?', a: 'KTA digital diterbitkan secara otomatis setelah pendaftaran anggota diverifikasi oleh pengurus DPC. KTA dapat diakses melalui menu "Layanan KTA" di portal LAPRA 08. Format KTA: LAPRA08.[NEGARA].[PROVINSI].[KAB/KOTA].[TAHUN].[URUT]. KTA digital berisi QR code untuk verifikasi keaslian, foto anggota, dan data keanggotaan. KTA fisik dapat dicetak di DPC dengan biaya Rp 25.000.' },
      { id: 'faq_11', category: 'LAINNYA', q: 'Apakah portal LAPRA 08 bisa diakses publik?', a: 'Portal LAPRA 08 bersifat semi-publik. Beranda, Profil, Pusat Media (berita & galeri), dan Program & Kegiatan dapat diakses publik. Sedangkan menu operasional seperti Dashboard, Pusat Data Organisasi, Logistik, Komunikasi, Keuangan, dan User hanya dapat diakses oleh pengurus yang telah login dengan role yang sesuai (SUPERADMIN, ADMIN_DPN, ADMIN_KOORWIL, ADMIN_DPD, ADMIN_KOOR_DPD, ADMIN_DPC). Isolasi data otomatis diterapkan sesuai hierarki wilayah.' },
      { id: 'faq_12', category: 'LAINNYA', q: 'Bagaimana cara melaporkan kendala teknis portal?', a: 'Kendala teknis dapat dilaporkan melalui menu "Pusat Bantuan & Tiket" di Layanan & Advokasi. Pilih kategori "Bug/Error Sistem" atau "Permintaan Fitur", sertakan tangkapan layar dan langkah reproduksi jika memungkinkan. Tim IT DPN akan merespons dalam 4 jam kerja. Untuk kendala kritis (sistem tidak bisa diakses), hubungi hotline IT DPN di +62 811-9090-08 (24/7).' },
    ]
    setFaqs(defaults)
    setLoading(false)
  }, [])

  if (loading) return <LoadingState />

  const categories: Record<string, { label: string; color: string; icon: any }> = {
    KEANGGOTAAN: { label: 'Keanggotaan', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Users },
    STRUKTUR: { label: 'Struktur Organisasi', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Building2 },
    PROGRAM: { label: 'Program & Kegiatan', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Briefcase },
    LAYANAN: { label: 'Layanan & Advokasi', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: ShieldCheck },
    LAINNYA: { label: 'Lainnya', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: HelpCircle },
  }

  const filtered = faqs.filter(f => !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()) || f.category.toLowerCase().includes(search.toLowerCase()))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><HelpCircle className="w-4 h-4 text-emerald-600" /> FAQ - Pertanyaan yang Sering Diajukan ({filtered.length})</CardTitle>
        <CardDescription>Temukan jawaban cepat untuk pertanyaan umum tentang LAPRA 08</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari pertanyaan atau kata kunci..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(categories).map(([k, v]) => {
            const Icon = v.icon
            const count = faqs.filter(f => f.category === k).length
            return (
              <button key={k} onClick={() => setSearch(k === 'KEANGGOTAAN' ? 'keanggotaan' : k === 'STRUKTUR' ? 'struktur' : k === 'PROGRAM' ? 'program' : k === 'LAYANAN' ? 'layanan' : '')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white hover:bg-accent transition-colors">
                <Icon className="w-3.5 h-3.5" />
                <span className={v.color.split(' ').slice(1, 3).join(' ')}>{v.label}</span>
                <Badge variant="outline" className="text-[10px]">{count}</Badge>
              </button>
            )
          })}
        </div>
        <div className="space-y-2">
          {filtered.map((faq) => {
            const cat = categories[faq.category] || categories.LAINNYA
            const CatIcon = cat.icon
            const isOpen = openItem === faq.id
            return (
              <div key={faq.id} className="rounded-xl border bg-white overflow-hidden">
                <button onClick={() => setOpenItem(isOpen ? null : faq.id)} className="w-full p-4 flex items-start gap-3 hover:bg-accent/50 transition-colors text-left">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cat.color}`}>
                    <CatIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{faq.q}</div>
                    <Badge variant="outline" className={`text-[10px] mt-1 ${cat.color}`}>{cat.label}</Badge>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 mt-1 ${isOpen ? 'rotate-90' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground leading-relaxed border-t bg-slate-50/50">
                    <p className="mt-3">{faq.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {filtered.length === 0 && <EmptyState icon={HelpCircle} title="Tidak ada FAQ cocok" description="Coba kata kunci lain atau hubungi sekretariat langsung." />}
      </CardContent>
    </Card>
  )
}
