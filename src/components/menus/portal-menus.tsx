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
  Award, CheckCircle2, Clock,
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
        <Card><CardContent className="py-12"><EmptyState icon={ImageIcon} title="Galeri Media" description="Album foto kegiatan & video dokumenter siap diisi." /></CardContent></Card>
      ) : tab === 'rilis-pers' ? (
        <Card><CardContent className="py-12"><EmptyState icon={Megaphone} title="Media Siaran LAPRA 08" description="Rilis pers resmi DPN siap diisi." /></CardContent></Card>
      ) : (
        <Card><CardContent className="py-12"><EmptyState icon={BookOpen} title="Majalah / Buletin Digital" description="Publikasi majalah digital siap diisi." /></CardContent></Card>
      )}
    </div>
  )
}

// ============================================================
// ANNOUNCEMENT MANAGER — CRUD lengkap untuk berita & pengumuman
// ============================================================
function AnnouncementManager() {
  const user = useToastStore.getState // placeholder
  const addToast = useToastStore((s) => s.addToast)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [form, setForm] = useState({ title: '', content: '', type: 'INFO', isPinned: false, territoryId: '' })
  const [territories, setTerritories] = useState<any[]>([])

  const loadData = () => {
    setLoading(true)
    Promise.all([api('/api/announcements'), api('/api/territory?level=COUNTRY')])
      .then(([a, t]) => { setItems(a); setTerritories(t) })
      .catch((e) => addToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editItem) {
        await api(`/api/announcements/${editItem.id}`, { method: 'PUT', body: JSON.stringify(form) })
        addToast('Pengumuman diperbarui', 'success')
      } else {
        await api('/api/announcements', { method: 'POST', body: JSON.stringify({ ...form, territoryId: form.territoryId || territories[0]?.id }) })
        addToast('Pengumuman baru dibuat', 'success')
      }
      setAddOpen(false); setEditItem(null); setForm({ title: '', content: '', type: 'INFO', isPinned: false, territoryId: '' })
      loadData()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try { await api(`/api/announcements/${deleteItem.id}`, { method: 'DELETE' }); addToast('Pengumuman dihapus', 'success'); setDeleteItem(null); loadData() }
    catch (e: any) { addToast(e.message, 'error') }
  }

  if (loading) return <LoadingState />

  const filtered = items.filter((a) => !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase()))

  const typeConfig: Record<string, { label: string; color: string }> = {
    INFO: { label: 'Info', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    WARNING: { label: 'Peringatan', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    URGENT: { label: 'Mendesak', color: 'bg-red-50 text-red-700 border-red-200' },
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Newspaper className="w-4 h-4 text-orange-600" />
            Kabar Utama & Pengumuman ({items.length})
          </CardTitle>
          <Button onClick={() => { setEditItem(null); setForm({ title: '', content: '', type: 'INFO', isPinned: false, territoryId: territories[0]?.id || '' }); setAddOpen(true) }}
            size="sm" className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
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
              return (
                <div key={a.id} className="group relative rounded-lg border p-3 hover:shadow-sm">
                  <div className="flex items-start gap-2">
                    {a.isPinned && <Pin className="w-3 h-3 text-orange-600 shrink-0 mt-1" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{a.title}</div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={`text-[10px] ${tc.color}`}>{tc.label}</Badge>
                        <span className="text-[10px] text-muted-foreground">{formatDateTimeID(a.createdAt)}</span>
                        <span className="text-[10px] text-muted-foreground">• {a.createdBy?.fullName || 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                        onClick={() => { setEditItem(a); setForm({ title: a.title, content: a.content, type: a.type, isPinned: a.isPinned, territoryId: a.territoryId }); setAddOpen(true) }}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:bg-red-50" onClick={() => setDeleteItem(a)}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? 'Edit' : 'Buat'} Berita/Pengumuman</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-2"><Label>Judul *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Isi *</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Tipe</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="INFO">Info</SelectItem><SelectItem value="WARNING">Peringatan</SelectItem><SelectItem value="URGENT">Mendesak</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Wilayah *</Label>
                <Select value={form.territoryId} onValueChange={(v) => setForm({ ...form, territoryId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{territories.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pinned" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} className="w-4 h-4" />
              <Label htmlFor="pinned">Sematkan di atas</Label>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Batal</Button><Button type="submit">{editItem ? 'Simpan Perubahan' : 'Publikasikan'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle><AlertDialogDescription>Yakin hapus <strong>{deleteItem?.title}</strong>?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// ============================================================
// 4. PROGRAM & KEGIATAN — Full Events + Absensi + Laporan
// ============================================================
export function ProgramKegiatanMenu() {
  const [tab, setTab] = useState('agenda')
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
        <Card><CardContent className="py-8"><EmptyState icon={Briefcase} title="Program Kerja Nasional & Daerah" description="Modul ini siap diisi dengan program kerja DPN, DPD, dan DPC." /></CardContent></Card>
      ) : tab === 'aksi' ? (
        <Card><CardContent className="py-8"><EmptyState icon={HandHeart} title="Aksi Sosialisasi & Sinergi" description="Dokumentasi aksi sosial dan kegiatan kemasyarakatan." /></CardContent></Card>
      ) : (
        <Card><CardContent className="py-8"><EmptyState icon={Users} title="Kemitraan & Kolaborasi" description="Kemitraan strategis dengan ummat dan organisasi lain." /></CardContent></Card>
      )}
    </div>
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
