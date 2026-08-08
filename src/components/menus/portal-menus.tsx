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
import { useToastStore, useNavStore } from '@/lib/store'
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
    api('/api/gallery').then(setItems).catch(() => {}).finally(() => setLoading(false))
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

      if (editItem) {
        // Update via gallery API (reuse SystemSetting)
        await fetch(`/api/gallery/${editItem.id}?id=${editItem.id}`, {
          method: 'DELETE',
          headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
        })
        await fetch('/api/gallery', {
          method: 'POST',
          headers: { 'x-user-id': useAuthStore.getState().user?.id || '', 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...itemData, title: form.title, description: form.description, category }),
        })
        addToast('Program diperbarui', 'success')
      } else {
        // Create new
        await fetch('/api/program-content', {
          method: 'POST',
          headers: { 'x-user-id': useAuthStore.getState().user?.id || '', 'Content-Type': 'application/json' },
          body: JSON.stringify(itemData),
        }).catch(() => {})
        // Fallback: use gallery API
        await fetch('/api/gallery', {
          method: 'POST',
          headers: { 'x-user-id': useAuthStore.getState().user?.id || '', 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...itemData, title: form.title, description: form.description, category }),
        }).catch(() => {})
        addToast('Program baru ditambahkan', 'success')
      }
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
// 5. LAYANAN & ADVOKASI — Full Help + Ticket System
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
        <Card><CardContent className="py-8"><EmptyState icon={KeyRound} title="Layanan KTA & Cek Keanggotaan" description="Cetak KTA digital dan verifikasi keanggotaan anggota." /></CardContent></Card>
      ) : tab === 'pengaduan' ? (
        <Card><CardContent className="py-8"><EmptyState icon={MessageSquare} title="Pusat Pengaduan & Aspirasi" description="Form pengaduan dan aspirasi warga." /></CardContent></Card>
      ) : (
        <Card><CardContent className="py-8"><EmptyState icon={Scale} title="Bantuan Hukum / Advokasi" description="Layanan bantuan hukum untuk anggota dan masyarakat." /></CardContent></Card>
      )}
    </div>
  )
}

// ============================================================
// 6. KONTAK & SEKRETARIAT
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
      {tab === 'lokasi' ? (
        <Card><CardContent className="py-8"><EmptyState icon={MapIcon} title="Lokasi Sekretariat" description="Peta interaktif kantor DPN, DPD, dan DPC." /></CardContent></Card>
      ) : tab === 'hubungi' ? (
        <Card><CardContent className="py-8"><EmptyState icon={Mail} title="Hubungi Kami" description="Formulir pesan langsung ke sekretariat." /></CardContent></Card>
      ) : (
        <Card><CardContent className="py-8"><EmptyState icon={HelpCircle} title="FAQ" description="Pertanyaan yang sering diajukan." /></CardContent></Card>
      )}
    </div>
  )
}
