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
  RefreshCw,
  Crown, Award, CheckCircle2, Clock, AlertTriangle, Globe, ExternalLink, Lock,
  Video, PlayCircle, BookMarked, FileCheck, UserCheck, XCircle, Camera, IdCard, Zap, Lightbulb, Sparkles,
  Youtube, FolderTree, Folder, Download,
} from 'lucide-react'

// Reuse existing functional components
import { PusatDataMenu } from '@/components/menus/pusat-data-menu'
import { CommunicationMenu } from '@/components/menus/communication-menu'
import { KTACard, KTASampleCard } from '@/components/kta-card'

// === Shared interface untuk data Territory (DPN/DPD/DPC) ===
interface Territory {
  id: string; code: string; name: string; level: string
  parentId: string | null
}

// ============================================================
// 1. BERANDA — Portal Profesional Level Internasional
// ============================================================
export function BerandaMenu() {
  const setActiveMenu = useNavStore((s) => s.setActiveMenu)
  const [stats, setStats] = useState<any>(null)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [auditOpen, setAuditOpen] = useState(false)

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
            label="Total DPD"
            value={stats.global.totalProvinces + (stats.global.totalDpdLn || 0)}
            icon={MapPin}
            gradient="from-blue-500 to-indigo-500"
            subtitle={`${stats.global.totalProvinces} domestik + ${stats.global.totalDpdLn || 0} LN`}
          />
          <StatCardModern
            label="DPC (Kab/Kota)"
            value={stats.global.totalRegencies}
            icon={Building2}
            gradient="from-emerald-500 to-teal-500"
            subtitle="514 DPC terhubung"
          />
          <StatCardModern
            label="Event & Kegiatan"
            value={stats.events?.total || 0}
            icon={CalendarDays}
            gradient="from-purple-500 to-pink-500"
            subtitle={`${stats.events?.upcoming || 0} event mendatang`}
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
          <QuickAccessPremium icon={ShieldCheck} title="Audit AI Responding" desc="Scan keluhan warganet" gradient="from-red-500 to-rose-700" onClick={() => setAuditOpen(true)} />
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
                      <div className="text-[13px] text-muted-foreground mt-1 flex items-center gap-2">
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

      {/* Audit AI Responding Dialog */}
      <AuditAIRespondingDialog open={auditOpen} onOpenChange={setAuditOpen} />
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
        {subtitle && <div className="text-[13px] text-slate-400 mt-1">{subtitle}</div>}
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
        <div className="text-[13px] text-slate-400">{desc}</div>
      </div>
      <div className="text-lg font-black text-white">{count}</div>
    </div>
  )
}

// ============================================================
// 2. PROFIL
// ============================================================

// --- Hook: cek apakah user adalah SUPERADMIN (reactive) ---
export function useIsSuperAdmin() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  useEffect(() => {
    const check = () => setIsSuperAdmin(useAuthStore.getState().user?.role === 'SUPERADMIN')
    check()
    const unsub = useAuthStore.subscribe(check)
    return () => unsub()
  }, [])
  return isSuperAdmin
}

// --- Tombol Edit Konten (hanya tampil di mode SUPERADMIN) ---
function EditButton({ onClick, label = 'Edit Konten' }: { onClick: () => void; label?: string }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick} className="gap-2">
      <Edit className="w-4 h-4" /> {label}
    </Button>
  )
}

// --- Default content untuk Tentang LAPRA 08 (15 fields) ---
const DEFAULT_TENTANG_CONTENT = {
  heroTitle: 'Laskar Prabowo 08 (LAPRA 08)',
  heroSubtitle: 'Organisasi Kemasyarakatan & Wadah Relawan Resmi Prabowo Subianto',
  heroDescription:
    'Laskar Prabowo 08—yang secara resmi disingkat sebagai LAPRA 08—adalah organisasi kemasyarakatan sekaligus wadah relawan resmi Prabowo Subianto yang bergerak aktif di tingkat nasional.',
  misiStrategis1: 'Organisasi ini mengemban misi strategis dalam mengawal serta mengawasi implementasi program-program nasional, baik di tingkat pusat maupun daerah. Hal ini dilakukan guna memastikan keberhasilan pembangunan menuju Indonesia Emas yang merupakan cita-cita mulia Presiden Prabowo Subianto.',
  misiStrategis2: 'Dalam pergerakannya, LAPRA 08 bertumpu pada fokus utama yang meliputi pengawasan program pemerintah, pelaksanaan kaderisasi yang terstruktur, serta penyelenggaraan aksi sosial kemanusiaan yang berdampak nyata bagi masyarakat dan negara.',
  pelantikanDate: '21 Maret 2025',
  pelantikanTempat: 'Auditorium RRI Jakarta',
  pelantik: 'Dr. (HC) Hashim S. Djojohadikusumo (Ketua Dewan Pembina)',
  ketuaUmum: 'Devi Taurisa, SH, MH, CLD',
  pilar1Title: 'Pengawasan Kebijakan',
  pilar1Desc: 'Mengawal, memantau, dan memastikan seluruh program strategis pemerintah berjalan tepat sasaran demi kesejahteraan rakyat.',
  pilar2Title: 'Kaderisasi Nasionalis',
  pilar2Desc: 'Membentuk, membina, dan melahirkan kader-kader berkualitas yang memiliki integritas tinggi dan berjiwa kepemimpinan nasional.',
  pilar3Title: 'Aksi Sosial Nyata',
  pilar3Desc: 'Menginisiasi pengabdian masyarakat dan aksi kemanusiaan secara aktif di seluruh penjuru wilayah.',
}

// --- Default content untuk Visi & Misi ---
const DEFAULT_VISI_MISI = {
  visi: 'Menjadi relawan terdepan dalam mendukung visi kebangsaan Prabowo Subianto menuju Indonesia Emas 2045.',
  misi: [
    'Mengawal program-program pemerintah Prabowo-Gibran',
    'Kaderisasi dan pembinaan relawan di seluruh Indonesia',
    'Aksi sosial dan pengabdian masyarakat',
    'Penguatan harmoni dan persatuan bangsa',
  ],
}

// --- Section: Tentang LAPRA 08 (hero, misi strategis, eksistensi, pilar, struktur) ---
function TentangLAPRASection() {
  const isSuperAdmin = useIsSuperAdmin()
  const addToast = useToastStore((s) => s.addToast)
  const [content, setContent] = useState<any>(DEFAULT_TENTANG_CONTENT)
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'loading' | 'synced' | 'fallback' | 'error'>('loading')
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setSyncStatus('loading')
    api('/api/profile-content')
      .then((data: any[]) => {
        if (cancelled) return
        const item = (data || []).find((d) => d.key === 'profil.tentang')
        if (item && item.value && typeof item.value === 'object') {
          setContent({ ...DEFAULT_TENTANG_CONTENT, ...item.value })
          setSyncStatus('synced')
        } else {
          // Tidak ada di DB → pakai default
          setSyncStatus('fallback')
        }
      })
      .catch((e) => {
        if (cancelled) return
        console.error('[TentangLAPRASection] load failed:', e.message)
        // Tetap pakai default content, jangan block UI
        setSyncStatus('error')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  // Selalu render default content — loading cuma untuk skeleton pertama
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-slate-200 rounded-2xl" />
        <div className="h-24 bg-slate-200 rounded-xl" />
        <div className="h-24 bg-slate-200 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-orange-500 to-red-600" />
          <h3 className="text-base font-bold">Tentang LAPRA 08</h3>
        </div>
        {isSuperAdmin && <EditButton onClick={() => setEditOpen(true)} />}
      </div>

      {/* Banner sync status — tampil kalau fallback atau error */}
      {syncStatus === 'fallback' && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-xs text-blue-700">
          ℹ Menampilkan konten default. Super Admin bisa edit untuk personalisasi.
        </div>
      )}
      {syncStatus === 'error' && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-700">
          ⚠ Gagal memuat dari server, menampilkan konten default. Cek koneksi atau coba refresh.
        </div>
      )}

      {/* Hero card — dark gradient */}
      <div className="relative overflow-hidden rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 right-0 opacity-5">
          <Crown className="w-56 h-56 -mr-8 -mt-8" />
        </div>
        <div className="relative z-10 p-6 lg:p-8 flex items-start gap-6">
          {/* Logo LAPRA 08 */}
          <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 overflow-hidden border border-white/20">
            <img src="/logo-lapra08.png" alt="Logo LAPRA 08" className="w-full h-full object-contain p-2" />
          </div>
          <div className="flex-1 min-w-0">
            <Badge className="bg-orange-500/20 text-orange-200 border border-orange-400/30 mb-3">
              <ShieldCheck className="w-3 h-3 mr-1" /> Periode 2024-2029
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-black text-white mb-2">{content.heroTitle}</h2>
            <p className="text-orange-200 font-medium mb-3">{content.heroSubtitle}</p>
            <p className="text-white/70 max-w-3xl leading-relaxed">{content.heroDescription}</p>
          </div>
        </div>
      </div>

      {/* Misi Strategis card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            Misi Strategis
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 border border-orange-100">
            <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
            <p className="text-sm">{content.misiStrategis1}</p>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-100">
            <CheckCircle2 className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
            <p className="text-sm">{content.misiStrategis2}</p>
          </div>
        </CardContent>
      </Card>

      {/* Eksistensi & Legalitas card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Award className="w-4 h-4 text-white" />
            </div>
            Eksistensi & Legalitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <CalendarDays className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm text-muted-foreground">Tanggal Pelantikan</div>
                <div className="text-sm font-semibold">{content.pelantikanDate}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm text-muted-foreground">Tempat Pelantikan</div>
                <div className="text-sm font-semibold">{content.pelantikanTempat}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm text-muted-foreground">Dilantik oleh</div>
                <div className="text-sm font-semibold">{content.pelantik}</div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-sm">
            <span className="font-semibold text-emerald-700">Ketua Umum:</span>{' '}
            <span className="text-emerald-900">{content.ketuaUmum}</span>
          </div>
        </CardContent>
      </Card>

      {/* Pilar Gerakan — 3 cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-1 rounded-full bg-gradient-to-b from-purple-500 to-pink-600" />
          <h3 className="text-base font-bold">Pilar Gerakan</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: content.pilar1Title, desc: content.pilar1Desc, icon: Users, grad: 'from-orange-500 to-amber-600' },
            { title: content.pilar2Title, desc: content.pilar2Desc, icon: HandHeart, grad: 'from-rose-500 to-pink-600' },
            { title: content.pilar3Title, desc: content.pilar3Desc, icon: ShieldCheck, grad: 'from-emerald-500 to-teal-600' },
          ].map((p, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${p.grad} flex items-center justify-center mb-3`}>
                  <p.icon className="w-5 h-5 text-white" />
                </div>
                <div className="font-semibold mb-1">{p.title}</div>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Struktur Hierarki */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            Struktur Hierarki Organisasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-stretch gap-3">
            <div className="flex-1 p-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white">
              <Badge className="bg-yellow-400/20 text-yellow-200 border border-yellow-400/30 mb-2">DPN</Badge>
              <div className="font-bold">Dewan Pengurus Nasional</div>
              <p className="text-xs text-white/70 mt-1">Pusat Nasional — Jakarta</p>
            </div>
            <div className="hidden lg:flex items-center justify-center text-slate-300">
              <ChevronRight className="w-6 h-6" />
            </div>
            <div className="flex-1 p-4 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
              <Badge className="bg-white/15 text-white border border-white/20 mb-2">DPD</Badge>
              <div className="font-bold">Dewan Pengurus Daerah</div>
              <p className="text-xs text-white/70 mt-1">39 domestik + 5 luar negeri</p>
            </div>
            <div className="hidden lg:flex items-center justify-center text-slate-300">
              <ChevronRight className="w-6 h-6" />
            </div>
            <div className="flex-1 p-4 rounded-xl bg-gradient-to-br from-orange-600 to-red-700 text-white">
              <Badge className="bg-white/15 text-white border border-white/20 mb-2">DPC</Badge>
              <div className="font-bold">Dewan Pengurus Cabang</div>
              <p className="text-xs text-white/70 mt-1">514 Kabupaten/Kota</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <TentangEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        content={content}
        onSaved={(c) => setContent(c)}
        addToast={addToast}
      />
    </div>
  )
}

// --- Dialog edit untuk Tentang LAPRA 08 (15 fields) ---
function TentangEditDialog({
  open, onOpenChange, content, onSaved, addToast,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  content: any
  onSaved: (c: any) => void
  addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void
}) {
  const [form, setForm] = useState<any>(content)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(content) }, [open, content])

  const fields: { key: string; label: string; multiline?: boolean }[] = [
    { key: 'heroTitle', label: 'Hero: Judul' },
    { key: 'heroSubtitle', label: 'Hero: Subtitle' },
    { key: 'heroDescription', label: 'Hero: Deskripsi', multiline: true },
    { key: 'misiStrategis1', label: 'Misi Strategis #1', multiline: true },
    { key: 'misiStrategis2', label: 'Misi Strategis #2', multiline: true },
    { key: 'pelantikanDate', label: 'Tanggal Pelantikan' },
    { key: 'pelantikanTempat', label: 'Tempat Pelantikan' },
    { key: 'pelantik', label: 'Pelantik' },
    { key: 'ketuaUmum', label: 'Ketua Umum' },
    { key: 'pilar1Title', label: 'Pilar 1: Judul' },
    { key: 'pilar1Desc', label: 'Pilar 1: Deskripsi', multiline: true },
    { key: 'pilar2Title', label: 'Pilar 2: Judul' },
    { key: 'pilar2Desc', label: 'Pilar 2: Deskripsi', multiline: true },
    { key: 'pilar3Title', label: 'Pilar 3: Judul' },
    { key: 'pilar3Desc', label: 'Pilar 3: Deskripsi', multiline: true },
  ]

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({ key: 'profil.tentang', value: form }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Gagal menyimpan')
      onSaved(form)
      addToast('Konten Tentang LAPRA 08 berhasil disimpan', 'success')
      onOpenChange(false)
    } catch (e: any) {
      addToast(e.message || 'Gagal menyimpan', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Edit Konten — Tentang LAPRA 08</DialogTitle>
          <DialogDescription>Perbarui informasi profil organisasi.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              {f.multiline ? (
                <Textarea
                  value={form[f.key] || ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  rows={2}
                />
              ) : (
                <Input
                  value={form[f.key] || ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Batal</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Section: Visi & Misi ---
function VisiMisiSection() {
  const isSuperAdmin = useIsSuperAdmin()
  const addToast = useToastStore((s) => s.addToast)
  const [content, setContent] = useState<any>(DEFAULT_VISI_MISI)
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'loading' | 'synced' | 'fallback' | 'error'>('loading')
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setSyncStatus('loading')
    api('/api/profile-content')
      .then((data: any[]) => {
        if (cancelled) return
        const item = (data || []).find((d) => d.key === 'profil.visi-misi')
        if (item && item.value && typeof item.value === 'object') {
          setContent({ ...DEFAULT_VISI_MISI, ...item.value })
          setSyncStatus('synced')
        } else {
          setSyncStatus('fallback')
        }
      })
      .catch((e) => {
        if (cancelled) return
        console.error('[VisiMisiSection] load failed:', e.message)
        setSyncStatus('error')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-slate-200 rounded-xl" />
        <div className="h-48 bg-slate-200 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-orange-500 to-red-600" />
          <h3 className="text-base font-bold">Visi & Misi</h3>
        </div>
        {isSuperAdmin && <EditButton onClick={() => setEditOpen(true)} />}
      </div>

      {/* Banner sync status */}
      {syncStatus === 'fallback' && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-xs text-blue-700">
          ℹ Menampilkan konten default. Super Admin bisa edit untuk personalisasi.
        </div>
      )}
      {syncStatus === 'error' && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-700">
          ⚠ Gagal memuat dari server, menampilkan konten default. Cek koneksi atau coba refresh.
        </div>
      )}

      {/* Visi card */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-100" />
          <div className="relative z-10 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-5 h-5 text-orange-600" />
              <Badge className="bg-orange-600 text-white">Visi</Badge>
            </div>
            <p className="text-lg font-semibold text-slate-800 leading-relaxed">{content.visi}</p>
          </div>
        </div>
      </Card>

      {/* Misi card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            Misi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {(content.misi || []).map((m: string, i: number) => (
              <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm pt-1">{m}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <VisiMisiEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        content={content}
        onSaved={(c) => setContent(c)}
        addToast={addToast}
      />
    </div>
  )
}

// --- Dialog edit untuk Visi & Misi (dynamic list) ---
function VisiMisiEditDialog({
  open, onOpenChange, content, onSaved, addToast,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  content: any
  onSaved: (c: any) => void
  addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void
}) {
  const [form, setForm] = useState<any>(content)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(content) }, [open, content])

  const updateMisi = (i: number, v: string) => {
    const newMisi = [...(form.misi || [])]
    newMisi[i] = v
    setForm({ ...form, misi: newMisi })
  }
  const addMisi = () => setForm({ ...form, misi: [...(form.misi || []), ''] })
  const removeMisi = (i: number) =>
    setForm({ ...form, misi: (form.misi || []).filter((_: any, idx: number) => idx !== i) })

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({ key: 'profil.visi-misi', value: form }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Gagal menyimpan')
      onSaved(form)
      addToast('Visi & Misi berhasil disimpan', 'success')
      onOpenChange(false)
    } catch (e: any) {
      addToast(e.message || 'Gagal menyimpan', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Edit Visi & Misi</DialogTitle>
          <DialogDescription>Perbarui visi dan daftar misi organisasi.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Visi</Label>
            <Textarea
              value={form.visi || ''}
              onChange={(e) => setForm({ ...form, visi: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Misi</Label>
              <Button size="sm" variant="outline" onClick={addMisi} className="gap-1 h-7 text-xs">
                <Plus className="w-3 h-3" /> Tambah Misi
              </Button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(form.misi || []).map((m: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center shrink-0 mt-1">
                    {i + 1}
                  </div>
                  <Textarea
                    value={m}
                    onChange={(e) => updateMisi(i, e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button size="icon" variant="ghost" onClick={() => removeMisi(i)} className="text-red-500 hover:text-red-600 h-8 w-8">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {(!form.misi || form.misi.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Belum ada misi. Klik &quot;Tambah Misi&quot; untuk menambahkan.
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Batal</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Section: Document upload & list (AD/ART & LEGALITAS) ---
// FIX: Sebelumnya tombol "Buka" pakai <a href={data:base64}> → browser blank page
// Sekarang: pakai fetch + blob URL (kirim x-user-id header untuk auth)
// FITUR TAMBAHAN: search, filter format, statistik, dialog preview PDF inline, tombol Download
function ProfileDocumentSection({ type }: { type: 'AD_ART' | 'LEGALITAS' }) {
  const isSuperAdmin = useIsSuperAdmin()
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  // === State baru untuk fitur enhanced ===
  const [search, setSearch] = useState('')
  const [filterFormat, setFilterFormat] = useState('ALL') // ALL | PDF | IMAGE | DOC
  const [viewLoading, setViewLoading] = useState<string | null>(null) // docId yang sedang di-fetch
  const [previewDoc, setPreviewDoc] = useState<any | null>(null) // dialog preview

  const meta = type === 'AD_ART'
    ? {
        icon: FileText,
        title: 'Anggaran Dasar / Anggaran Rumah Tangga (AD/ART)',
        emptyTitle: 'Belum ada dokumen AD/ART',
        emptyDesc: 'Dokumen AD/ART LAPRA 08 akan ditampilkan di sini.',
        grad: 'from-blue-500 to-cyan-600',
      }
    : {
        icon: Scale,
        title: 'Landasan Hukum & Legalitas Organisasi',
        emptyTitle: 'Belum ada dokumen legalitas',
        emptyDesc: 'SK Kepengurusan, Nota Kesepahaman, dan dokumen legal lainnya.',
        grad: 'from-emerald-500 to-teal-600',
      }

  const load = () => {
    setLoading(true)
    setError(null)
    api(`/api/profile-documents?type=${type}`)
      .then((data: any[]) => setDocs(data || []))
      .catch((e) => {
        console.error('[ProfileDocumentSection] load failed:', e.message)
        setError(e.message || 'Gagal memuat dokumen')
        setDocs([]) // pastikan empty state, bukan crash
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [type])

  // === Render: Loading skeleton ===
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-orange-500 to-red-600" />
            <h3 className="text-base font-bold">{meta.title}</h3>
          </div>
        </div>
        <div className="space-y-2 animate-pulse">
          <div className="h-16 bg-slate-200 rounded-xl" />
          <div className="h-16 bg-slate-200 rounded-xl" />
        </div>
      </div>
    )
  }

  // === Render: Error state dengan tombol retry ===
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-orange-500 to-red-600" />
            <h3 className="text-base font-bold">{meta.title}</h3>
          </div>
          {isSuperAdmin && (
            <Button size="sm" onClick={() => setUploadOpen(true)} className={`gap-1 bg-gradient-to-r ${meta.grad} text-white`}>
              <Plus className="w-4 h-4" /> Upload Dokumen
            </Button>
          )}
        </div>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-amber-900">Gagal memuat dokumen dari server</div>
                <div className="text-xs text-amber-700 mt-1">Error: {error}</div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={load} className="gap-1">
              <RefreshCw className="w-3 h-3" /> Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleDelete = async (doc: any) => {
    try {
      const res = await fetch(`/api/profile-documents/${doc.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Gagal menghapus')
      addToast('Dokumen berhasil dihapus', 'success')
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      addToast(e.message || 'Gagal menghapus dokumen', 'error')
    }
  }

  const formatSize = (bytes: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  // === Helper: deteksi kategori format file ===
  const getFileCategory = (fileType: string): 'PDF' | 'IMAGE' | 'DOC' | 'FILE' => {
    const ft = (fileType || '').toLowerCase()
    if (ft === 'pdf') return 'PDF'
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ft)) return 'IMAGE'
    if (['doc', 'docx'].includes(ft)) return 'DOC'
    return 'FILE'
  }

  const formatIcons: Record<string, any> = {
    PDF: FileText,
    IMAGE: ImageIcon,
    DOC: FileText,
    FILE: FileText,
  }

  const formatColors: Record<string, string> = {
    PDF: 'bg-red-50 text-red-700 border-red-200',
    IMAGE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DOC: 'bg-blue-50 text-blue-700 border-blue-200',
    FILE: 'bg-slate-50 text-slate-700 border-slate-200',
  }

  // === Filter + search ===
  const filtered = docs.filter(doc => {
    const matchSearch = !search ||
      doc.title?.toLowerCase().includes(search.toLowerCase()) ||
      doc.description?.toLowerCase().includes(search.toLowerCase()) ||
      doc.uploadedBy?.toLowerCase().includes(search.toLowerCase())
    const matchFormat = filterFormat === 'ALL' || getFileCategory(doc.fileType) === filterFormat
    return matchSearch && matchFormat
  })

  // === Statistik ===
  const stats = {
    total: docs.length,
    pdf: docs.filter(d => getFileCategory(d.fileType) === 'PDF').length,
    image: docs.filter(d => getFileCategory(d.fileType) === 'IMAGE').length,
    doc: docs.filter(d => getFileCategory(d.fileType) === 'DOC').length,
    totalSize: docs.reduce((sum, d) => sum + (d.fileSize || 0), 0),
  }

  // === Handler: Buka dokumen via authenticated fetch + blob URL ===
  // FIX BUG: sebelumnya pakai <a href={data:base64}> → browser blank page
  // Sekarang: fetch /api/profile-documents/[id]/view → blob → window.open
  const handleViewDoc = async (doc: any) => {
    setViewLoading(doc.id)
    try {
      const userId = user?.id || ''
      const res = await fetch(`/api/profile-documents/${doc.id}/view`, {
        headers: { 'x-user-id': userId },
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank')
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
    } catch (e: any) {
      addToast(`Gagal membuka dokumen: ${e.message}`, 'error')
    } finally {
      setViewLoading(null)
    }
  }

  // === Handler: Preview PDF inline di dialog ===
  const handlePreviewDoc = async (doc: any) => {
    setViewLoading(doc.id)
    try {
      const userId = user?.id || ''
      const res = await fetch(`/api/profile-documents/${doc.id}/view`, {
        headers: { 'x-user-id': userId },
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      setPreviewDoc({ ...doc, blobUrl })
    } catch (e: any) {
      addToast(`Gagal preview dokumen: ${e.message}`, 'error')
    } finally {
      setViewLoading(null)
    }
  }

  // === Handler: Download dokumen ===
  const handleDownloadDoc = async (doc: any) => {
    setViewLoading(doc.id)
    try {
      const userId = user?.id || ''
      const res = await fetch(`/api/profile-documents/${doc.id}/view`, {
        headers: { 'x-user-id': userId },
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      // Trigger download dengan anchor + download attribute
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = doc.fileName || `${doc.title}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)
    } catch (e: any) {
      addToast(`Gagal download dokumen: ${e.message}`, 'error')
    } finally {
      setViewLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* === Header + tombol Upload === */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${meta.grad} flex items-center justify-center`}>
            <meta.icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold">{meta.title}</h3>
            <p className="text-sm text-muted-foreground">{stats.total} dokumen • {formatSize(stats.totalSize)}</p>
          </div>
        </div>
        {isSuperAdmin && (
          <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" /> Upload Dokumen
          </Button>
        )}
      </div>

      {/* === Statistik cards === */}
      {docs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-lg border bg-white p-2 text-center">
            <div className="text-lg font-bold text-slate-700">{stats.total}</div>
            <div className="text-[11px] text-muted-foreground">Total Dokumen</div>
          </div>
          <div className="rounded-lg border bg-red-50 p-2 text-center">
            <div className="text-lg font-bold text-red-700">{stats.pdf}</div>
            <div className="text-[11px] text-red-700/70">PDF</div>
          </div>
          <div className="rounded-lg border bg-emerald-50 p-2 text-center">
            <div className="text-lg font-bold text-emerald-700">{stats.image}</div>
            <div className="text-[11px] text-emerald-700/70">Gambar</div>
          </div>
          <div className="rounded-lg border bg-blue-50 p-2 text-center">
            <div className="text-lg font-bold text-blue-700">{stats.doc}</div>
            <div className="text-[11px] text-blue-700/70">DOC/DOCX</div>
          </div>
        </div>
      )}

      {/* === Search + filter format === */}
      {docs.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari judul/deskripsi/uploader..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterFormat} onValueChange={setFilterFormat}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Format</SelectItem>
              <SelectItem value="PDF">PDF</SelectItem>
              <SelectItem value="IMAGE">Gambar</SelectItem>
              <SelectItem value="DOC">DOC/DOCX</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <LoadingState message="Memuat dokumen..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : docs.length === 0 ? (
        <EmptyState icon={meta.icon} title={meta.emptyTitle} description={meta.emptyDesc} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={meta.icon} title="Tidak ada dokumen cocok" description="Coba ubah kata kunci atau filter format." />
      ) : (
        <div className="grid gap-3 max-h-[40rem] overflow-y-auto pr-1">
          {filtered.map((doc) => {
            const fileCat = getFileCategory(doc.fileType)
            const FileIcon = formatIcons[fileCat]
            const fileColor = formatColors[fileCat]
            const isLoading = viewLoading === doc.id
            return (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon berdasarkan format file */}
                    <div className={`w-12 h-12 rounded-lg border flex items-center justify-center shrink-0 ${fileColor}`}>
                      <FileIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm truncate">{doc.title}</h4>
                        <Badge variant="secondary" className="uppercase text-[11px]">{doc.fileType || 'file'}</Badge>
                        <Badge variant="outline" className="text-[11px]">{formatSize(doc.fileSize)}</Badge>
                        {doc.description && doc.description.startsWith('AD_ART:') && (
                          <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 border-blue-200">AD/ART</Badge>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.description.replace(/^(AD_ART|LEGALITAS):\s*/, '')}</p>
                      )}
                      <div className="text-[12px] text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
                        <span>📤 Diunggah oleh {doc.uploadedBy || '-'}</span>
                        <span className="opacity-50">•</span>
                        <span>📅 {formatDateTimeID(doc.uploadedAt || doc.updatedAt)}</span>
                      </div>
                    </div>
                    {/* === Tombol Aksi === */}
                    <div className="flex items-center gap-1 shrink-0 flex-wrap">
                      {/* Tombol Preview (ikon mata) — buka dialog inline */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50"
                        disabled={isLoading}
                        onClick={() => handlePreviewDoc(doc)}
                        title="Preview dokumen inline">
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      {/* Tombol Buka di tab baru */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1"
                        disabled={isLoading}
                        onClick={() => handleViewDoc(doc)}
                        title="Buka dokumen di tab baru">
                        <ExternalLink className="w-3.5 h-3.5" /> Buka
                      </Button>
                      {/* Tombol Download */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                        disabled={isLoading}
                        onClick={() => handleDownloadDoc(doc)}
                        title="Download dokumen">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      {/* Tombol Hapus (admin only) */}
                      {isSuperAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 h-8 w-8"
                          onClick={() => setDeleteTarget(doc)}
                          title="Hapus dokumen">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        type={type}
        onUploaded={() => { setUploadOpen(false); load() }}
        addToast={addToast}
      />

      {/* === Dialog Preview PDF/Image inline === */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => {
        if (!o && previewDoc?.blobUrl) {
          URL.revokeObjectURL(previewDoc.blobUrl)
        }
        setPreviewDoc(null)
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="truncate">{previewDoc?.title}</span>
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[11px] uppercase">{previewDoc?.fileType}</Badge>
              <Badge variant="outline" className="text-[11px]">{previewDoc ? formatSize(previewDoc.fileSize) : ''}</Badge>
              {previewDoc?.uploadedBy && <span className="text-xs">oleh {previewDoc.uploadedBy}</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden rounded-lg border bg-slate-100">
            {previewDoc?.fileType === 'pdf' ? (
              <iframe src={previewDoc.blobUrl} className="w-full h-[70vh] rounded-lg" title="Preview PDF" />
            ) : ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes((previewDoc?.fileType || '').toLowerCase()) ? (
              <img src={previewDoc?.blobUrl} alt={previewDoc?.title} className="w-full max-h-[70vh] object-contain" />
            ) : (
              <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8">
                <FileText className="w-16 h-16 text-slate-400 mb-3" />
                <div className="font-semibold mb-1">Preview tidak tersedia untuk format ini</div>
                <p className="text-sm text-muted-foreground mb-4">Format {previewDoc?.fileType?.toUpperCase()} tidak bisa di-preview di browser. Silakan download untuk membuka.</p>
                <Button onClick={() => previewDoc && handleDownloadDoc(previewDoc)} className="gap-2">
                  <Download className="w-4 h-4" /> Download File
                </Button>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => previewDoc && handleViewDoc(previewDoc)} className="gap-2">
              <ExternalLink className="w-4 h-4" /> Buka di Tab Baru
            </Button>
            <Button onClick={() => previewDoc && handleDownloadDoc(previewDoc)} className="gap-2">
              <Download className="w-4 h-4" /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Dokumen</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus dokumen{' '}
              <strong>&quot;{deleteTarget?.title}&quot;</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// --- Dialog upload dokumen (FormData) ---
function DocumentUploadDialog({
  open, onOpenChange, type, onUploaded, addToast,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  type: 'AD_ART' | 'LEGALITAS'
  onUploaded: () => void
  addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(''); setDescription(''); setFile(null)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!file) {
      addToast('Pilih file terlebih dahulu', 'warning')
      return
    }
    if (!title.trim()) {
      addToast('Judul wajib diisi', 'warning')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', title.trim())
      fd.append('description', description.trim())
      fd.append('docType', type)
      const res = await fetch('/api/profile-documents', {
        method: 'POST',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: fd,
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Gagal upload')
      addToast('Dokumen berhasil diupload', 'success')
      onUploaded()
    } catch (e: any) {
      addToast(e.message || 'Gagal upload dokumen', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Upload Dokumen {type === 'AD_ART' ? 'AD/ART' : 'Legalitas'}</DialogTitle>
          <DialogDescription>
            Format yang didukung: PDF, JPG, PNG, DOC/DOCX. Maksimal 20MB.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Judul Dokumen *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="cth: AD/ART LAPRA 08 Periode 2024-2029"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Deskripsi (opsional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Ringkasan singkat dokumen..."
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">File Dokumen *</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                {file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving || !file} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ProfilMenu() {
  const [tab, setTab] = useState('tentang')
  const tabs = [
    { key: 'tentang', label: 'Tentang LAPRA 08', icon: BookOpen },
    { key: 'visi-misi', label: 'Visi & Misi', icon: TrendingUp },
    { key: 'struktur', label: 'Struktur Organisasi', icon: Building2 },
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
      {tab === 'tentang' && <TentangLAPRASection />}
      {tab === 'visi-misi' && <VisiMisiSection />}
      {tab === 'struktur' && <PusatDataMenu />}
      {tab === 'ad-art' && <ProfileDocumentSection type="AD_ART" />}
      {tab === 'legalitas' && <ProfileDocumentSection type="LEGALITAS" />}
    </div>
  )
}

// ============================================================
// 3. PUSAT MEDIA — Wired with Announcement CRUD
// ============================================================
export function PusatMediaMenu() {
  const [tab, setTab] = useState('berita')
  // Lifted state: lets MediaSiaranManager trigger AnnouncementManager's new-berita dialog
  // with category pre-set to SIRANAN_PERS (auto consumed once opened)
  const [pendingNewBerita, setPendingNewBerita] = useState<string | null>(null)
  const tabs = [
    { key: 'berita', label: 'Kabar Utama & Pengumuman', icon: Newspaper },
    { key: 'galeri', label: 'Galeri Media', icon: ImageIcon },
    { key: 'rilis-pers', label: 'Media Siaran LAPRA 08', icon: Megaphone },
    { key: 'majalah', label: 'Majalah / Buletin Digital', icon: BookOpen },
  ]

  // Helper: switch to berita tab + auto-open new-berita dialog with optional category preset
  const openNewBerita = (category: string = 'BERITA') => {
    setTab('berita')
    setPendingNewBerita(category)
  }

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
        <AnnouncementManager
          pendingNewBerita={pendingNewBerita}
          onConsumePendingNewBerita={() => setPendingNewBerita(null)}
        />
      ) : tab === 'galeri' ? (
        <GaleriMediaManager />
      ) : tab === 'rilis-pers' ? (
        <MediaSiaranManager onCreateNew={() => openNewBerita('SIRANAN_PERS')} />
      ) : (
        <MajalahManager />
      )}
    </div>
  )
}

// ============================================================
// GALERI MEDIA — 3 Sub-Tab: Foto, Video, Arsip Berita Penting
// ============================================================
function GaleriMediaManager() {
  const addToast = useToastStore((s) => s.addToast)
  const isSuperAdmin = useIsSuperAdmin()
  const [subTab, setSubTab] = useState('foto')
  const [seedLoading, setSeedLoading] = useState(false)
  const subTabs = [
    { key: 'foto', label: 'Galeri Foto', icon: ImageIcon },
    { key: 'video', label: 'Galeri Video', icon: Video },
    { key: 'arsip', label: 'Arsip Berita Penting', icon: BookMarked },
  ]

  // === Handler: Generate Data Demo via Z.AI image API ===
  const handleSeedDemo = async () => {
    setSeedLoading(true)
    try {
      const userId = useAuthStore.getState().user?.id || ''
      const res = await fetch('/api/gallery/seed-demo', {
        method: 'POST',
        headers: { 'x-user-id': userId },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Gagal generate data demo')
      addToast(
        `Berhasil generate: ${data.data.photosGenerated} foto, ${data.data.videosGenerated} video, ${data.data.bookmarksGenerated} berita arsip. Refresh halaman.`,
        'success'
      )
      // Auto-refresh halaman setelah 2 detik
      setTimeout(() => window.location.reload(), 2000)
    } catch (e: any) {
      addToast(`Gagal generate demo: ${e.message}`, 'error')
    } finally {
      setSeedLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {subTabs.map((t) => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${subTab === t.key ? 'bg-emerald-600 text-white shadow-sm' : 'border hover:bg-accent'}`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>
        {/* === Tombol "Generate Data Demo" — SuperAdmin only === */}
        {isSuperAdmin && (
          <Button
            size="sm"
            onClick={handleSeedDemo}
            disabled={seedLoading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
            title="Generate data dummy untuk demo Galeri Foto, Video, dan Arsip Berita menggunakan Z.AI image generation (API gratis)">
            {seedLoading ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-1" /> Generate Data Demo</>
            )}
          </Button>
        )}
      </div>
      {subTab === 'foto' ? (
        <GalleryManager />
      ) : subTab === 'video' ? (
        <GaleriVideoManager />
      ) : (
        <ArsipBeritaPentingManager />
      )}
    </div>
  )
}

// ============================================================
// GALERI VIDEO — YouTube embed + MP4 upload
// ============================================================
function GaleriVideoManager() {
  const addToast = useToastStore((s) => s.addToast)
  const [items, setItems] = useState<any[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [form, setForm] = useState({
    title: '', description: '', category: 'KEGIATAN', youtubeUrl: '',
    level: 'DPN', territoryCode: 'ID', territoryName: 'DPN (Pusat Nasional)',
    albumName: '',
  })
  const [mode, setMode] = useState<'YOUTUBE' | 'UPLOAD'>('YOUTUBE')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [playingVideo, setPlayingVideo] = useState<any>(null)
  // === Filter state ===
  const [filterLevel, setFilterLevel] = useState('ALL')
  const [filterTerritoryCode, setFilterTerritoryCode] = useState('ALL')
  const [filterAlbum, setFilterAlbum] = useState('ALL')

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api('/api/gallery/videos'),
      api('/api/territory'),
    ]).then(([vids, terr]: any) => {
      setItems(vids || [])
      setTerritories(terr || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.albumName.trim()) { addToast('Nama Album wajib diisi', 'error'); return }
    setUploading(true)
    try {
      const albumName = form.albumName.trim() || 'Umum'
      if (mode === 'YOUTUBE') {
        if (!form.youtubeUrl) { addToast('URL YouTube wajib diisi', 'error'); setUploading(false); return }
        const res = await fetch('/api/gallery/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
          body: JSON.stringify({ ...form, albumName }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(data.error || 'Gagal')
        addToast('Video YouTube berhasil ditambahkan', 'success')
      } else {
        if (!file) { addToast('Pilih file video dulu', 'error'); setUploading(false); return }
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', form.title || file.name)
        formData.append('description', form.description)
        formData.append('category', form.category)
        formData.append('level', form.level)
        formData.append('territoryCode', form.territoryCode)
        formData.append('territoryName', form.territoryName)
        formData.append('albumName', albumName)
        const res = await fetch('/api/gallery/videos', {
          method: 'POST',
          headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
          body: formData,
        })
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(data.error || 'Upload gagal')
        addToast('Video berhasil diupload', 'success')
      }
      setForm({ title: '', description: '', category: 'KEGIATAN', youtubeUrl: '', level: 'DPN', territoryCode: 'ID', territoryName: 'DPN (Pusat Nasional)', albumName: '' })
      setFile(null); setAddOpen(false)
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
      addToast('Video dihapus', 'success')
      setDeleteItem(null); loadData()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  if (loading) return <LoadingState />

  const categories: Record<string, string> = {
    KEGIATAN: 'Kegiatan', RAPAT: 'Rapat', PELANTIKAN: 'Pelantikan',
    SOSIAL: 'Aksi Sosial', DOKUMENTER: 'Dokumenter', LAINNYA: 'Lainnya',
  }

  // === Filter wilayah berdasarkan level yang dipilih ===
  const territoriesByLevel = (level: string): Territory[] => {
    if (level === 'DPN') return [{ id: 'id', name: 'DPN (Pusat Nasional)', code: 'ID', level: 'COUNTRY', parentId: null }]
    if (level === 'DPD') return territories.filter(t => t.level === 'PROVINCE')
    if (level === 'DPC') return territories.filter(t => t.level === 'REGENCY')
    return territories
  }

  // === Filter items ===
  const filtered = items.filter(item => {
    if (filterLevel !== 'ALL' && (item.level || 'DPN') !== filterLevel) return false
    if (filterTerritoryCode !== 'ALL' && (item.territoryCode || 'ID') !== filterTerritoryCode) return false
    if (filterAlbum !== 'ALL' && (item.albumName || 'Umum') !== filterAlbum) return false
    return true
  })

  // === List album unik ===
  const availableAlbums = Array.from(new Set(
    items
      .filter(item =>
        (filterLevel === 'ALL' || (item.level || 'DPN') === filterLevel) &&
        (filterTerritoryCode === 'ALL' || (item.territoryCode || 'ID') === filterTerritoryCode)
      )
      .map(item => item.albumName || 'Umum')
  )).sort()

  // === Group by level + territory + album ===
  const grouped = filtered.reduce((acc: any, item: any) => {
    const level = item.level || 'DPN'
    const terrCode = item.territoryCode || 'ID'
    const terrName = item.territoryName || 'DPN (Pusat Nasional)'
    const album = item.albumName || 'Umum'
    const key = `${level}|${terrCode}|${album}`
    if (!acc[key]) acc[key] = { level, terrCode, terrName, album, items: [] }
    acc[key].items.push(item)
    return acc
  }, {} as Record<string, any>)

  const groupedArray = Object.values(grouped).sort((a: any, b: any) => {
    const levelOrder: Record<string, number> = { DPN: 1, DPD: 2, DPC: 3 }
    const lvlA = levelOrder[a.level] || 4
    const lvlB = levelOrder[b.level] || 4
    if (lvlA !== lvlB) return lvlA - lvlB
    if (a.terrName !== b.terrName) return a.terrName.localeCompare(b.terrName)
    return a.album.localeCompare(b.album)
  })

  const levelColors: Record<string, string> = {
    DPN: 'bg-red-50 text-red-700 border-red-200',
    DPD: 'bg-blue-50 text-blue-700 border-blue-200',
    DPC: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="w-4 h-4 text-emerald-600" /> Galeri Video ({filtered.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={async () => {
              setUploading(true)
              try {
                const res = await fetch('/api/gallery/videos', {
                  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
                  body: JSON.stringify({ action: 'sync_youtube' }),
                })
                const data = await res.json()
                if (data.success) {
                  addToast(data.message, 'success')
                  loadData()
                } else {
                  addToast(data.error, 'error')
                }
              } catch (e: any) { addToast(e.message, 'error') }
              finally { setUploading(false) }
            }} size="sm" variant="outline" disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              {uploading ? 'Syncing...' : 'Sync YouTube'}
            </Button>
            <Button onClick={() => setAddOpen(true)} size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Tambah Video
            </Button>
          </div>
        </div>
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-800 mt-2">
          <strong>📋 Filter LAPRA 08 Aktif:</strong> Hanya video yang mengandung keyword "Laskar Prabowo 08" / "LAPRA 08" / varian yang diperbolehkan.
          Klik <strong>"Sync YouTube"</strong> untuk auto-cari video LAPRA 08 terbaru dari YouTube.
        </div>

        {/* === Filter Hierarki === */}
        <div className="mt-3 p-3 rounded-lg bg-slate-50 border">
          <div className="flex items-center gap-2 mb-2">
            <FolderTree className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-semibold text-slate-700">Filter berdasarkan hierarki & folder:</span>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Level</Label>
              <Select value={filterLevel} onValueChange={(v) => { setFilterLevel(v); setFilterTerritoryCode('ALL'); setFilterAlbum('ALL') }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">📂 Semua Level</SelectItem>
                  <SelectItem value="DPN">🔴 DPN (Pusat)</SelectItem>
                  <SelectItem value="DPD">🔵 DPD (Provinsi)</SelectItem>
                  <SelectItem value="DPC">🟢 DPC (Kab/Kota)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Wilayah</Label>
              <Select value={filterTerritoryCode} onValueChange={(v) => { setFilterTerritoryCode(v); setFilterAlbum('ALL') }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">📍 Semua Wilayah</SelectItem>
                  {filterLevel === 'ALL'
                    ? territories.map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)
                    : territoriesByLevel(filterLevel).map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Album/Folder</Label>
              <Select value={filterAlbum} onValueChange={setFilterAlbum}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">📁 Semua Album</SelectItem>
                  {availableAlbums.map(a => <SelectItem key={a} value={a}>📁 {a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <EmptyState icon={Video} title={items.length === 0 ? "Galeri video masih kosong" : "Tidak ada video cocok"} description={items.length === 0 ? "Klik 'Sync YouTube' untuk auto-cari video LAPRA 08, atau tambah manual." : "Coba ubah filter level/wilayah/album."} />
        ) : (
          <div className="space-y-6">
            {/* === Display grouped by level + territory + album === */}
            {groupedArray.map((group: any) => (
              <div key={`vid-${group.level}-${group.terrCode}-${group.album}`} className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap pb-2 border-b">
                  <Badge variant="outline" className={`text-[11px] ${levelColors[group.level]}`}>
                    {group.level}
                  </Badge>
                  <span className="text-sm font-semibold">{group.terrName}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm flex items-center gap-1">
                    <Folder className="w-4 h-4 text-amber-500" />
                    {group.album}
                  </span>
                  <Badge variant="outline" className="text-[11px] ml-auto">{group.items.length} video</Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item: any) => {
                    const thumb = item.thumbnail || (item.youtubeId ? `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg` : null)
                    const isYouTube = item.videoType === 'YOUTUBE' || item.youtubeId || item.youtubeUrl || item.embedUrl
                    return (
                      <div key={item.id} className="group relative rounded-xl overflow-hidden border shadow-sm hover:shadow-lg transition-all">
                        <div className="aspect-video bg-slate-900 relative cursor-pointer" onClick={() => setPlayingVideo(item)}>
                          {isYouTube && thumb ? (
                            <img src={thumb} alt={item.title} className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }} />
                          ) : item.videoType === 'UPLOAD' && item.videoUrl ? (
                            <video src={item.videoUrl} className="w-full h-full object-cover" muted preload="metadata" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                              <Video className="w-12 h-12 text-slate-500" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                              <PlayCircle className="w-10 h-10 text-red-600" />
                            </div>
                          </div>
                          <Badge variant="outline" className="absolute top-2 left-2 text-[13px] bg-black/70 text-white border-white/20">
                            {isYouTube ? '📺 YouTube' : '🎬 MP4'}
                          </Badge>
                          {item.viewCount > 0 && (
                            <Badge variant="outline" className="absolute top-2 right-2 text-[13px] bg-black/70 text-white border-white/20">
                              👁 {item.viewCount.toLocaleString('id-ID')}
                            </Badge>
                          )}
                        </div>
                        <div className="p-3 space-y-1">
                          <div className="font-medium text-sm line-clamp-2 leading-snug">{item.title}</div>
                          {item.channel && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Youtube className="w-3 h-3 text-red-600" /> {item.channel}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[13px]">{categories[item.category] || item.category}</Badge>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                              onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialog Tambah Video */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Video className="w-4 h-4 text-emerald-600" /> Tambah Video</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode('YOUTUBE')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border ${mode === 'YOUTUBE' ? 'bg-emerald-600 text-white border-emerald-600' : 'hover:bg-accent'}`}>
                Link YouTube
              </button>
              <button type="button" onClick={() => setMode('UPLOAD')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border ${mode === 'UPLOAD' ? 'bg-emerald-600 text-white border-emerald-600' : 'hover:bg-accent'}`}>
                Upload MP4
              </button>
            </div>
            {mode === 'YOUTUBE' ? (
              <div className="space-y-2">
                <Label>URL YouTube *</Label>
                <Input value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=XXXX atau youtu.be/XXXX" required />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>File Video (MP4/WebP) *</Label>
                {file ? (
                  <div className="relative">
                    <video src={URL.createObjectURL(file)} className="w-full max-h-48 object-contain rounded-lg border" controls />
                    <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2"
                      onClick={() => setFile(null)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-emerald-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('video-upload-input')?.click()}>
                    <input type="file" id="video-upload-input" className="hidden" accept="video/mp4,video/webm,video/ogg"
                      onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <div className="text-sm font-medium">Upload Video</div>
                    <div className="text-xs text-muted-foreground mt-1">MP4, WebM • Maks 100MB</div>
                  </div>
                )}
              </div>
            )}

            {/* === PILIHAN HIERARKI: Level + Wilayah + Album === */}
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <FolderTree className="w-4 h-4" />
                Pengelompokan Video (Hierarki LAPRA 08)
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Level Organisasi *</Label>
                  <Select value={form.level} onValueChange={(v) => {
                    const def = v === 'DPN' ? { code: 'ID', name: 'DPN (Pusat Nasional)' }
                      : v === 'DPD' ? { code: territories.find(t => t.level === 'PROVINCE')?.code || '', name: territories.find(t => t.level === 'PROVINCE')?.name || '' }
                      : { code: territories.find(t => t.level === 'REGENCY')?.code || '', name: territories.find(t => t.level === 'REGENCY')?.name || '' }
                    setForm({ ...form, level: v, territoryCode: def.code, territoryName: def.name })
                  }}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DPN">🔴 DPN (Pusat Nasional)</SelectItem>
                      <SelectItem value="DPD">🔵 DPD (Provinsi)</SelectItem>
                      <SelectItem value="DPC">🟢 DPC (Kabupaten/Kota)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.level !== 'DPN' && (
                  <div className="space-y-1">
                    <Label className="text-xs">{form.level === 'DPD' ? 'Pilih DPD (Provinsi)' : 'Pilih DPC (Kab/Kota)'} *</Label>
                    <Select value={form.territoryCode} onValueChange={(v) => {
                      const t = territories.find(t => t.code === v)
                      setForm({ ...form, territoryCode: v, territoryName: t?.name || v })
                    }}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Pilih wilayah..." /></SelectTrigger>
                      <SelectContent>
                        {territoriesByLevel(form.level).map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Nama Album/Folder *</Label>
                  <Input value={form.albumName} onChange={(e) => setForm({ ...form, albumName: e.target.value })}
                    placeholder="cth: Dokumentasi Pelantikan 2026, Bakti Sosial Lebaran..." />
                  <p className="text-[11px] text-muted-foreground">Video akan dikelompokkan ke folder album ini</p>
                </div>
              </div>
            </div>

            <div className="space-y-2"><Label>Judul Video</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="cth: Dokumentasi Pelantikan DPN" /></div>
            <div className="space-y-2"><Label>Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Deskripsi singkat video..." /></div>
            <div className="space-y-2"><Label>Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(categories).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
              <Button type="submit" disabled={uploading || !form.albumName.trim()}>
                {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Tambah
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Play Video */}
      {/* Video Player Dialog */}
      <Dialog open={!!playingVideo} onOpenChange={(o) => !o && setPlayingVideo(null)}>
        <DialogContent className="max-w-3xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-base">{playingVideo?.title}</DialogTitle>
            <DialogDescription>
              {playingVideo?.channel && <span className="flex items-center gap-1"><Youtube className="w-3 h-3 text-red-600" /> {playingVideo.channel}</span>}
              {playingVideo?.viewCount > 0 && <span className="ml-2">👁 {playingVideo.viewCount.toLocaleString('id-ID')} views</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            {(playingVideo?.videoType === 'YOUTUBE' || playingVideo?.youtubeId) ? (
              <iframe
                src={playingVideo?.embedUrl || (playingVideo?.youtubeId ? `https://www.youtube.com/embed/${playingVideo.youtubeId}` : '')}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen frameBorder="0" />
            ) : playingVideo?.videoType === 'UPLOAD' && playingVideo?.videoUrl ? (
              <video src={playingVideo.videoUrl} className="w-full h-full" controls autoPlay />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm opacity-70">Video tidak dapat diputar</p>
                </div>
              </div>
            )}
          </div>
          {playingVideo?.description && (
            <p className="text-sm text-muted-foreground mt-2">{playingVideo.description}</p>
          )}
          {(playingVideo?.youtubeUrl || playingVideo?.url) && (
            <a href={playingVideo?.youtubeUrl || playingVideo?.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
              <ExternalLink className="w-3.5 h-3.5" /> Buka di YouTube
            </a>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Video?</AlertDialogTitle>
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
// ARSIP BERITA PENTING - Bookmarked news
// ============================================================
function ArsipBeritaPentingManager() {
  const addToast = useToastStore((s) => s.addToast)
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [form, setForm] = useState({
    announcementId: '', note: '', category: 'PENTING',
    level: 'DPN', territoryCode: 'ID', territoryName: 'DPN (Pusat Nasional)',
    albumName: '',
  })
  // === Filter state ===
  const [filterLevel, setFilterLevel] = useState('ALL')
  const [filterTerritoryCode, setFilterTerritoryCode] = useState('ALL')
  const [filterAlbum, setFilterAlbum] = useState('ALL')

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api('/api/gallery/bookmarks'),
      api('/api/announcements'),
      api('/api/territory'),
    ]).then(([bm, ann, terr]: any) => {
      setBookmarks(bm || [])
      setAnnouncements(ann || [])
      setTerritories(terr || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.announcementId) { addToast('Pilih berita dulu', 'error'); return }
    if (!form.albumName.trim()) { addToast('Nama Album wajib diisi', 'error'); return }
    try {
      const res = await fetch('/api/gallery/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({ ...form, albumName: form.albumName.trim() || 'Umum' }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal')
      addToast('Berita ditambahkan ke arsip penting', 'success')
      setForm({ announcementId: '', note: '', category: 'PENTING', level: 'DPN', territoryCode: 'ID', territoryName: 'DPN (Pusat Nasional)', albumName: '' })
      setAddOpen(false); loadData()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await fetch(`/api/gallery/bookmarks?id=bm_${deleteItem.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
      })
      addToast('Berita dihapus dari arsip', 'success')
      setDeleteItem(null); loadData()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  if (loading) return <LoadingState />

  const categoryConfig: Record<string, { label: string; color: string }> = {
    PENTING: { label: 'Penting', color: 'bg-red-50 text-red-700 border-red-200' },
    SEJARAH: { label: 'Sejarah', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    MILESTONE: { label: 'Milestone', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    REFERENSI: { label: 'Referensi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  }

  // === Filter wilayah berdasarkan level ===
  const territoriesByLevel = (level: string): Territory[] => {
    if (level === 'DPN') return [{ id: 'id', name: 'DPN (Pusat Nasional)', code: 'ID', level: 'COUNTRY', parentId: null }]
    if (level === 'DPD') return territories.filter(t => t.level === 'PROVINCE')
    if (level === 'DPC') return territories.filter(t => t.level === 'REGENCY')
    return territories
  }

  // === Filter bookmarks ===
  const filtered = bookmarks.filter(item => {
    if (filterLevel !== 'ALL' && (item.level || 'DPN') !== filterLevel) return false
    if (filterTerritoryCode !== 'ALL' && (item.territoryCode || 'ID') !== filterTerritoryCode) return false
    if (filterAlbum !== 'ALL' && (item.albumName || 'Umum') !== filterAlbum) return false
    return true
  })

  // === List album unik ===
  const availableAlbums = Array.from(new Set(
    bookmarks
      .filter(item =>
        (filterLevel === 'ALL' || (item.level || 'DPN') === filterLevel) &&
        (filterTerritoryCode === 'ALL' || (item.territoryCode || 'ID') === filterTerritoryCode)
      )
      .map(item => item.albumName || 'Umum')
  )).sort()

  // === Group by level + territory + album ===
  const grouped = filtered.reduce((acc: any, item: any) => {
    const level = item.level || 'DPN'
    const terrCode = item.territoryCode || 'ID'
    const terrName = item.territoryName || 'DPN (Pusat Nasional)'
    const album = item.albumName || 'Umum'
    const key = `${level}|${terrCode}|${album}`
    if (!acc[key]) acc[key] = { level, terrCode, terrName, album, items: [] }
    acc[key].items.push(item)
    return acc
  }, {} as Record<string, any>)

  const groupedArray = Object.values(grouped).sort((a: any, b: any) => {
    const levelOrder: Record<string, number> = { DPN: 1, DPD: 2, DPC: 3 }
    const lvlA = levelOrder[a.level] || 4
    const lvlB = levelOrder[b.level] || 4
    if (lvlA !== lvlB) return lvlA - lvlB
    if (a.terrName !== b.terrName) return a.terrName.localeCompare(b.terrName)
    return a.album.localeCompare(b.album)
  })

  const levelColors: Record<string, string> = {
    DPN: 'bg-red-50 text-red-700 border-red-200',
    DPD: 'bg-blue-50 text-blue-700 border-blue-200',
    DPC: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }

  // Available announcements not yet bookmarked
  const bookmarkedIds = new Set(bookmarks.map((b: any) => b.id))
  const availableAnnouncements = announcements.filter((a: any) => !bookmarkedIds.has(a.id))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookMarked className="w-4 h-4 text-amber-600" /> Arsip Berita Penting ({filtered.length})
          </CardTitle>
          <Button onClick={() => setAddOpen(true)} size="sm" className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> Tambah ke Arsip
          </Button>
        </div>
        <CardDescription>Kumpulan berita penting LAPRA 08 yang diarsipkan untuk referensi & sejarah organisasi</CardDescription>

        {/* === Filter Hierarki === */}
        <div className="mt-3 p-3 rounded-lg bg-slate-50 border">
          <div className="flex items-center gap-2 mb-2">
            <FolderTree className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-semibold text-slate-700">Filter berdasarkan hierarki & folder:</span>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Level</Label>
              <Select value={filterLevel} onValueChange={(v) => { setFilterLevel(v); setFilterTerritoryCode('ALL'); setFilterAlbum('ALL') }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">📂 Semua Level</SelectItem>
                  <SelectItem value="DPN">🔴 DPN (Pusat)</SelectItem>
                  <SelectItem value="DPD">🔵 DPD (Provinsi)</SelectItem>
                  <SelectItem value="DPC">🟢 DPC (Kab/Kota)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Wilayah</Label>
              <Select value={filterTerritoryCode} onValueChange={(v) => { setFilterTerritoryCode(v); setFilterAlbum('ALL') }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">📍 Semua Wilayah</SelectItem>
                  {filterLevel === 'ALL'
                    ? territories.map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)
                    : territoriesByLevel(filterLevel).map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Album/Folder</Label>
              <Select value={filterAlbum} onValueChange={setFilterAlbum}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">📁 Semua Album</SelectItem>
                  {availableAlbums.map(a => <SelectItem key={a} value={a}>📁 {a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <EmptyState icon={BookMarked} title={bookmarks.length === 0 ? "Arsip masih kosong" : "Tidak ada berita cocok"} description={bookmarks.length === 0 ? "Bookmark berita penting dari Kabar Utama untuk dijadikan arsip permanen." : "Coba ubah filter level/wilayah/album."} />
        ) : (
          <div className="space-y-6">
            {/* === Display grouped by level + territory + album === */}
            {groupedArray.map((group: any) => (
              <div key={`bm-${group.level}-${group.terrCode}-${group.album}`} className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap pb-2 border-b">
                  <Badge variant="outline" className={`text-[11px] ${levelColors[group.level]}`}>
                    {group.level}
                  </Badge>
                  <span className="text-sm font-semibold">{group.terrName}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm flex items-center gap-1">
                    <Folder className="w-4 h-4 text-amber-500" />
                    {group.album}
                  </span>
                  <Badge variant="outline" className="text-[11px] ml-auto">{group.items.length} berita</Badge>
                </div>
                <div className="space-y-3">
                  {group.items.map((b: any) => {
                    const cc = categoryConfig[b.bookmarkCategory] || categoryConfig.PENTING
                    return (
                      <div key={b.id} className="group relative rounded-xl border p-3 hover:shadow-md transition-all bg-white">
                        <div className="flex items-start gap-3">
                          {b.photoUrl ? (
                            <img src={b.photoUrl} alt={b.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center shrink-0">
                              <BookMarked className="w-6 h-6 text-amber-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={`text-[13px] ${cc.color}`}>{cc.label}</Badge>
                              {b.source === 'WEB_SYNC' && (
                                <Badge variant="outline" className="text-[13px] bg-blue-50 text-blue-700 border-blue-200">
                                  <Globe className="w-2.5 h-2.5 mr-0.5" /> {b.sourceName || 'Web'}
                                </Badge>
                              )}
                            </div>
                            <div className="font-semibold text-sm line-clamp-2">{b.title}</div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.content}</p>
                            {b.bookmarkNote && (
                              <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800">
                                <strong>Catatan Arsip:</strong> {b.bookmarkNote}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-[13px] text-muted-foreground">
                              <span>Diarsipkan: {formatDateTimeID(b.bookmarkedAt)}</span>
                              {b.sourceUrl && (
                                <a href={b.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  <ExternalLink className="w-3 h-3 inline mr-0.5" />Sumber
                                </a>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100"
                            onClick={() => setDeleteItem(b)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BookMarked className="w-4 h-4 text-amber-600" /> Tambah Berita ke Arsip</DialogTitle>
            <DialogDescription>Pilih berita dari Kabar Utama untuk diarsipkan</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-2">
              <Label>Pilih Berita *</Label>
              <Select value={form.announcementId} onValueChange={(v) => setForm({ ...form, announcementId: v })}>
                <SelectTrigger><SelectValue placeholder={`${availableAnnouncements.length} berita tersedia`} /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {availableAnnouncements.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.title.substring(0, 60)}{a.title.length > 60 ? '...' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* === PILIHAN HIERARKI: Level + Wilayah + Album === */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                <FolderTree className="w-4 h-4" />
                Pengelompokan Arsip (Hierarki LAPRA 08)
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Level Organisasi *</Label>
                  <Select value={form.level} onValueChange={(v) => {
                    const def = v === 'DPN' ? { code: 'ID', name: 'DPN (Pusat Nasional)' }
                      : v === 'DPD' ? { code: territories.find(t => t.level === 'PROVINCE')?.code || '', name: territories.find(t => t.level === 'PROVINCE')?.name || '' }
                      : { code: territories.find(t => t.level === 'REGENCY')?.code || '', name: territories.find(t => t.level === 'REGENCY')?.name || '' }
                    setForm({ ...form, level: v, territoryCode: def.code, territoryName: def.name })
                  }}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DPN">🔴 DPN (Pusat Nasional)</SelectItem>
                      <SelectItem value="DPD">🔵 DPD (Provinsi)</SelectItem>
                      <SelectItem value="DPC">🟢 DPC (Kabupaten/Kota)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.level !== 'DPN' && (
                  <div className="space-y-1">
                    <Label className="text-xs">{form.level === 'DPD' ? 'Pilih DPD (Provinsi)' : 'Pilih DPC (Kab/Kota)'} *</Label>
                    <Select value={form.territoryCode} onValueChange={(v) => {
                      const t = territories.find(t => t.code === v)
                      setForm({ ...form, territoryCode: v, territoryName: t?.name || v })
                    }}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Pilih wilayah..." /></SelectTrigger>
                      <SelectContent>
                        {territoriesByLevel(form.level).map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Nama Album/Folder *</Label>
                  <Input value={form.albumName} onChange={(e) => setForm({ ...form, albumName: e.target.value })}
                    placeholder="cth: Arsip Sejarah 2026, Milestone Pelantikan, Referensi Asta Cita..." />
                  <p className="text-[11px] text-muted-foreground">Berita akan dikelompokkan ke folder album ini</p>
                </div>
              </div>
            </div>

            <div className="space-y-2"><Label>Kategori Arsip</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Catatan Arsip (opsional)</Label>
              <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={3}
                placeholder="Alasan mengapa berita ini diarsipkan..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
              <Button type="submit" disabled={!form.albumName.trim()} className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">Tambah ke Arsip</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus dari Arsip?</AlertDialogTitle>
            <AlertDialogDescription>Yakin hapus <strong>{deleteItem?.title?.substring(0, 50)}</strong> dari arsip?</AlertDialogDescription>
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
// MEDIA SIARAN — Auto-sync dari berita kategori SIRANAN_PERS
// ============================================================
function MediaSiaranManager({ onCreateNew }: { onCreateNew?: () => void }) {
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // Switch to Kabar Utama tab + auto-open new berita dialog
              // with category pre-set to SIRANAN_PERS via callback from parent PusatMediaMenu
              if (onCreateNew) {
                onCreateNew()
              } else {
                // Fallback: just notify user (shouldn't happen in normal flow)
                addToast('Silakan buka tab "Kabar Utama" lalu klik "Tambah Berita" dengan kategori "Siaran Pers"', 'info')
              }
            }}
          >
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
                    <Badge variant="outline" className="text-[13px] mb-1 bg-indigo-50 text-indigo-700 border-indigo-200">Siaran Pers</Badge>
                    <div className="font-bold text-sm">{a.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-[13px] text-muted-foreground">
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
                  <div className="text-[13px] text-muted-foreground mt-2">{formatDateID(item.uploadedAt)}</div>
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
                  <div className="text-[13px] text-muted-foreground mt-0.5">Maks 10MB</div>
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
  const user = useAuthStore((s) => s.user)
  const [items, setItems] = useState<any[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [form, setForm] = useState({
    title: '', description: '', category: 'KEGIATAN',
    level: 'DPN', territoryCode: 'ID', territoryName: 'DPN (Pusat Nasional)',
    albumName: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  // === Filter state ===
  const [filterLevel, setFilterLevel] = useState('ALL')
  const [filterTerritoryCode, setFilterTerritoryCode] = useState('ALL')
  const [filterAlbum, setFilterAlbum] = useState('ALL')

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api('/api/gallery'),
      api('/api/territory'),
    ]).then(([all, terr]: any) => {
      const galleryItems = (all as any[]).filter((a: any) => a.fileUrl)
      setItems(galleryItems)
      setTerritories(terr as Territory[])
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
      // === Field baru untuk pengelompokan ===
      formData.append('level', form.level)
      formData.append('territoryCode', form.territoryCode)
      formData.append('territoryName', form.territoryName)
      formData.append('albumName', form.albumName.trim() || 'Umum')

      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Upload gagal')

      addToast('Foto berhasil diupload ke galeri', 'success')
      setForm({
        title: '', description: '', category: 'KEGIATAN',
        level: 'DPN', territoryCode: 'ID', territoryName: 'DPN (Pusat Nasional)',
        albumName: '',
      })
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

  // === Filter wilayah berdasarkan level yang dipilih ===
  const territoriesByLevel = (level: string): Territory[] => {
    if (level === 'DPN') return [{ id: 'id', name: 'DPN (Pusat Nasional)', code: 'ID', level: 'COUNTRY', parentId: null }]
    if (level === 'DPD') return territories.filter(t => t.level === 'PROVINCE')
    if (level === 'DPC') return territories.filter(t => t.level === 'REGENCY')
    return territories
  }

  // === Filter items berdasarkan level + territory + album ===
  const filtered = items.filter(item => {
    if (filterLevel !== 'ALL' && (item.level || 'DPN') !== filterLevel) return false
    if (filterTerritoryCode !== 'ALL' && (item.territoryCode || 'ID') !== filterTerritoryCode) return false
    if (filterAlbum !== 'ALL' && (item.albumName || 'Umum') !== filterAlbum) return false
    return true
  })

  // === List album unik (dari items yang sudah filter level+territory) ===
  const availableAlbums = Array.from(new Set(
    items
      .filter(item =>
        (filterLevel === 'ALL' || (item.level || 'DPN') === filterLevel) &&
        (filterTerritoryCode === 'ALL' || (item.territoryCode || 'ID') === filterTerritoryCode)
      )
      .map(item => item.albumName || 'Umum')
  )).sort()

  // === Group items by level + territory + album ===
  const grouped = filtered.reduce((acc: any, item: any) => {
    const level = item.level || 'DPN'
    const terrCode = item.territoryCode || 'ID'
    const terrName = item.territoryName || 'DPN (Pusat Nasional)'
    const album = item.albumName || 'Umum'
    const key = `${level}|${terrCode}|${album}`
    if (!acc[key]) {
      acc[key] = { level, terrCode, terrName, album, items: [] }
    }
    acc[key].items.push(item)
    return acc
  }, {} as Record<string, { level: string; terrCode: string; terrName: string; album: string; items: any[] }>)

  const groupedArray = Object.values(grouped).sort((a: any, b: any) => {
    // Sort: DPN > DPD > DPC, lalu by territoryName, lalu by album
    const levelOrder: Record<string, number> = { DPN: 1, DPD: 2, DPC: 3 }
    const lvlA = levelOrder[a.level] || 4
    const lvlB = levelOrder[b.level] || 4
    if (lvlA !== lvlB) return lvlA - lvlB
    if (a.terrName !== b.terrName) return a.terrName.localeCompare(b.terrName)
    return a.album.localeCompare(b.album)
  })

  const levelLabels: Record<string, string> = {
    DPN: 'DPN (Pusat Nasional)',
    DPD: 'DPD (Provinsi)',
    DPC: 'DPC (Kabupaten/Kota)',
  }

  const levelColors: Record<string, string> = {
    DPN: 'bg-red-50 text-red-700 border-red-200',
    DPD: 'bg-blue-50 text-blue-700 border-blue-200',
    DPC: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            Galeri Media ({filtered.length} foto)
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleSyncFromNews} size="sm" variant="outline" disabled={syncLoading}
              className="border-blue-300 text-blue-600 hover:bg-blue-50">
              {syncLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Newspaper className="w-4 h-4 mr-1" />}
              Sync Berita
            </Button>
            <Button onClick={() => setUploadOpen(true)} size="sm"
              className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Upload Foto
            </Button>
          </div>
        </div>

        {/* === Filter Hierarki: Level + Wilayah + Album === */}
        <div className="mt-3 p-3 rounded-lg bg-slate-50 border">
          <div className="flex items-center gap-2 mb-2">
            <FolderTree className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-semibold text-slate-700">Filter berdasarkan hierarki & folder:</span>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Level</Label>
              <Select value={filterLevel} onValueChange={(v) => { setFilterLevel(v); setFilterTerritoryCode('ALL'); setFilterAlbum('ALL') }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">📂 Semua Level</SelectItem>
                  <SelectItem value="DPN">🔴 DPN (Pusat)</SelectItem>
                  <SelectItem value="DPD">🔵 DPD (Provinsi)</SelectItem>
                  <SelectItem value="DPC">🟢 DPC (Kab/Kota)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Wilayah</Label>
              <Select value={filterTerritoryCode} onValueChange={(v) => { setFilterTerritoryCode(v); setFilterAlbum('ALL') }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">📍 Semua Wilayah</SelectItem>
                  {filterLevel === 'ALL'
                    ? territories.map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)
                    : territoriesByLevel(filterLevel).map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Album/Folder</Label>
              <Select value={filterAlbum} onValueChange={setFilterAlbum}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">📁 Semua Album</SelectItem>
                  {availableAlbums.map(a => <SelectItem key={a} value={a}>📁 {a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <EmptyState icon={ImageIcon} title={items.length === 0 ? "Galeri masih kosong" : "Tidak ada foto cocok"} description={items.length === 0 ? "Upload foto kegiatan atau sync dari berita yang sudah ada." : "Coba ubah filter level/wilayah/album."} />
        ) : (
          <div className="space-y-6">
            {/* === Display grouped by level + territory + album === */}
            {groupedArray.map((group: any) => (
              <div key={`${group.level}-${group.terrCode}-${group.album}`} className="space-y-2">
                {/* === Group header: Level badge + Territory + Album === */}
                <div className="flex items-center gap-2 flex-wrap pb-2 border-b">
                  <Badge variant="outline" className={`text-[11px] ${levelColors[group.level]}`}>
                    {group.level}
                  </Badge>
                  <span className="text-sm font-semibold">{group.terrName}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm flex items-center gap-1">
                    <Folder className="w-4 h-4 text-amber-500" />
                    {group.album}
                  </span>
                  <Badge variant="outline" className="text-[11px] ml-auto">{group.items.length} foto</Badge>
                </div>
                {/* === Photo grid === */}
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {group.items.map((item: any) => (
                    <div key={item.id} className="group relative rounded-xl overflow-hidden border shadow-sm hover:shadow-lg transition-all">
                      <img src={item.fileUrl} alt={item.title} className="w-full h-40 object-cover" />
                      <div className="p-2">
                        <div className="font-medium text-xs truncate">{item.title}</div>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[11px]">{categories[item.category] || item.category}</Badge>
                        </div>
                      </div>
                      <Button variant="destructive" size="sm"
                        className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setDeleteItem(item)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Upload Dialog — dengan pilihan level + wilayah + album */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Foto ke Galeri</DialogTitle>
            <DialogDescription>Pilih wilayah & album/folder untuk pengelompokan foto</DialogDescription>
          </DialogHeader>
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

            {/* === PILIHAN HIERARKI: Level + Wilayah + Album === */}
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-800">
                <FolderTree className="w-4 h-4" />
                Pengelompokan Foto (Hierarki LAPRA 08)
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Level Organisasi *</Label>
                  <Select value={form.level} onValueChange={(v) => {
                    const def = v === 'DPN' ? { code: 'ID', name: 'DPN (Pusat Nasional)' }
                      : v === 'DPD' ? { code: territories.find(t => t.level === 'PROVINCE')?.code || '', name: territories.find(t => t.level === 'PROVINCE')?.name || '' }
                      : { code: territories.find(t => t.level === 'REGENCY')?.code || '', name: territories.find(t => t.level === 'REGENCY')?.name || '' }
                    setForm({ ...form, level: v, territoryCode: def.code, territoryName: def.name })
                  }}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DPN">🔴 DPN (Pusat Nasional)</SelectItem>
                      <SelectItem value="DPD">🔵 DPD (Provinsi)</SelectItem>
                      <SelectItem value="DPC">🟢 DPC (Kabupaten/Kota)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.level !== 'DPN' && (
                  <div className="space-y-1">
                    <Label className="text-xs">{form.level === 'DPD' ? 'Pilih DPD (Provinsi)' : 'Pilih DPC (Kab/Kota)'} *</Label>
                    <Select value={form.territoryCode} onValueChange={(v) => {
                      const t = territories.find(t => t.code === v)
                      setForm({ ...form, territoryCode: v, territoryName: t?.name || v })
                    }}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Pilih wilayah..." /></SelectTrigger>
                      <SelectContent>
                        {territoriesByLevel(form.level).map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Nama Album/Folder *</Label>
                  <Input value={form.albumName} onChange={(e) => setForm({ ...form, albumName: e.target.value })}
                    placeholder="cth: Kegiatan Pelantikan 2026, Bakti Sosial Lebaran, Rapat Koordinasi..." />
                  <p className="text-[11px] text-muted-foreground">Foto akan dikelompokkan ke folder album ini</p>
                </div>
              </div>
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
              <Button type="submit" disabled={uploading || !file || !form.albumName.trim()}>{uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Upload</Button>
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
function AnnouncementManager({
  pendingNewBerita,
  onConsumePendingNewBerita,
}: {
  pendingNewBerita?: string | null
  onConsumePendingNewBerita?: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [syncOpen, setSyncOpen] = useState(false)
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

  // === Auto-open new-berita dialog when triggered from sibling (e.g. Media Siaran) ===
  // Trigger fires when `pendingNewBerita` becomes a non-null category string.
  useEffect(() => {
    if (!pendingNewBerita) return
    setEditItem(null)
    setPreviewMode(false)
    setForm({
      title: '', content: '', type: 'INFO',
      category: pendingNewBerita, // preset (e.g. SIRANAN_PERS from Media Siaran tab)
      isPinned: false,
      territoryId: '', imageUrl: '', publishDate: '',
    })
    setAddOpen(true)
    onConsumePendingNewBerita?.() // reset parent state so it can fire again later
  }, [pendingNewBerita, onConsumePendingNewBerita])

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

  const handleSyncMedsos = async () => {
    setSyncLoading(true); setSyncResult(null)
    try {
      const res = await fetch('/api/news/sync', {
        method: 'POST',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Sync gagal')
      setSyncResult(data.data)
      setSyncOpen(true)
      addToast(`Sync selesai: ${data.data.newCreated} berita baru`, 'success')
      loadData()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSyncLoading(false) }
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
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleSyncMedsos} size="sm" variant="outline" disabled={syncLoading}
              className="border-blue-400 text-blue-600 hover:bg-blue-50">
              {syncLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Globe className="w-4 h-4 mr-1" />}
              Update Informasi Medsos
            </Button>
            <Button onClick={() => openEditor()} size="sm" className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Buat Berita/Pengumuman
            </Button>
          </div>
        </div>
        {/* Info banner - strict filter policy */}
        <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Filter Ketat Aktif:</strong> Sinkronisasi medsos HANYA menampilkan berita terkait <strong>Laskar Prabowo 08 / LAPRA 08</strong> dan <strong>agenda kegiatan positif Presiden Prabowo</strong>. Berita lain tidak akan disinkronkan kecuali atas izin admin (entry manual).
          </div>
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
                        <Badge variant="outline" className={`text-[13px] ${cc.color}`}>{cc.label}</Badge>
                        <Badge variant="outline" className={`text-[13px] ${tc.color}`}>{tc.label}</Badge>
                        {/* Badge sumber untuk WEB_SYNC */}
                        {isWebSync && (
                          <Badge variant="outline" className="text-[13px] bg-blue-50 text-blue-700 border-blue-200">
                            <Globe className="w-2.5 h-2.5 mr-0.5" /> {a.sourceName || 'Web'}
                          </Badge>
                        )}
                        <span className="text-[13px] text-muted-foreground">
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
                        <Badge variant="outline" className="text-[13px] bg-slate-50 text-slate-500 border-slate-200">
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

      {/* Sync Result Dialog */}
      <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Hasil Sinkronisasi Medsos</DialogTitle>
            <DialogDescription>Update informasi terbaru dari medsos tentang LAPRA 08</DialogDescription>
          </DialogHeader>
          {syncResult && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                  <div className="text-2xl font-bold text-emerald-700">{syncResult.newCreated}</div>
                  <div className="text-xs text-emerald-700">Berita Baru</div>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <div className="text-2xl font-bold text-blue-700">{syncResult.skippedDuplicate}</div>
                  <div className="text-xs text-blue-700">Duplikat Skip</div>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <div className="text-2xl font-bold text-slate-700">{syncResult.skippedIrrelevant}</div>
                  <div className="text-xs text-slate-700">Tidak Relevan</div>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <div className="text-2xl font-bold text-red-700">{syncResult.skippedNegative}</div>
                  <div className="text-xs text-red-700">Berita Negatif</div>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                <ShieldCheck className="w-4 h-4 inline mr-1" />
                <strong>Total ditemukan:</strong> {syncResult.totalFound} berita • <strong>Relevan:</strong> {syncResult.totalRelevant} berita
              </div>
              {syncResult.newBerita && syncResult.newBerita.length > 0 && (
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-muted-foreground">Berita baru ditambahkan:</div>
                  {syncResult.newBerita.slice(0, 5).map((b: any, i: number) => (
                    <div key={i} className="text-xs p-2 rounded bg-white border">
                      <div className="font-medium line-clamp-1">{b.title}</div>
                      <div className="text-[13px] text-muted-foreground">{b.sourceName}</div>
                    </div>
                  ))}
                  {syncResult.newBerita.length > 5 && (
                    <div className="text-[13px] text-muted-foreground">+ {syncResult.newBerita.length - 5} berita lainnya</div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSyncOpen(false)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}


// ============================================================
// 5. LAYANAN & ADVOKASI — KTA, Pengaduan, Bantuan Hukum, Help
// ============================================================
export function LayananAdvokasiMenu() {
  const [tab, setTab] = useState('kta')
  const tabs = [
    { key: 'kta', label: 'Layanan KTA', icon: KeyRound },
    { key: 'pengaduan', label: 'Pengaduan & Aspirasi', icon: MessageSquare },
    { key: 'hukum', label: 'Bantuan Hukum', icon: Scale },
  ]
  return (
    <div className="space-y-6">
      <PageHeader title="Layanan & Advokasi" description="Layanan KTA, pengaduan, dan advokasi hukum" icon={ShieldCheck} />
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-sm' : 'border hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'kta' ? (
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
  const [subTab, setSubTab] = useState('daftar')
  const subTabs = [
    { key: 'daftar', label: 'Daftar KTA Online', icon: IdCard },
    { key: 'status', label: 'Cek Status Permohonan', icon: Search },
    { key: 'digital', label: 'KTA Digital', icon: Award },
    { key: 'admin', label: 'Admin Review Permohonan', icon: UserCheck },
    { key: 'info', label: 'Info Layanan KTA', icon: Award },
  ]
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {subTabs.map((t) => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${subTab === t.key ? 'bg-emerald-600 text-white shadow-sm' : 'border hover:bg-accent'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>
      {subTab === 'daftar' ? (
        <KtaPendaftaranForm />
      ) : subTab === 'status' ? (
        <KtaCekStatus />
      ) : subTab === 'digital' ? (
        <KtaDigitalManager />
      ) : subTab === 'admin' ? (
        <KtaAdminReview />
      ) : (
        <KtaInfoLayanan />
      )}
    </div>
  )
}

// ============================================================
// KTA DIGITAL MANAGER — list anggota/pengurus yang punya KTA, klik → preview card
// ============================================================
function KtaDigitalManager() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const loadData = () => {
    setLoading(true)
    setError(null)
    // Ambil KtaApplication dengan status APPROVED atau ISSUED
    api('/api/kta-applications?status=APPROVED')
      .then((data: any[]) => {
        setItems(data || [])
      })
      .catch((e: any) => {
        setError(e.message || 'Gagal memuat data')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  // Kalau ada selectedId → tampilkan KTA card
  if (selectedId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="gap-1">
          <ChevronRight className="w-4 h-4 rotate-180" /> Kembali ke Daftar
        </Button>
        <KTACard applicationId={selectedId} />
      </div>
    )
  }

  if (loading) return <LoadingState message="Memuat daftar KTA..." />
  if (error) return <ErrorState message={error} />

  const filtered = items.filter((item: any) =>
    !search ||
    item.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    item.applicationNumber?.toLowerCase().includes(search.toLowerCase()) ||
    item.ktaNumber?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
        <strong>KTA Digital:</strong> Klik anggota untuk lihat KTA digital (depan + belakang).
        KTA berisi: foto, nama, jabatan, nomor KTA, QR code, masa berlaku (1 Januari - 31 Desember {new Date().getFullYear()}).
        Bisa download PNG atau print.
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama / nomor pendaftaran / nomor KTA..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon={IdCard}
            title="Belum ada KTA yang diterbitkan"
            description="KTA digital akan muncul di sini setelah permohonan KTA di-approve oleh admin. Gunakan tab 'Admin Review Permohonan' untuk approve permohonan."
          />
          {/* Preview format KTA */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" /> Contoh Format KTA Digital
              </CardTitle>
              <CardDescription>Begini tampilan KTA yang akan diterbitkan</CardDescription>
            </CardHeader>
            <CardContent>
              <KTASampleCard compact />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((item: any) => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent hover:border-emerald-400 transition-all text-left"
            >
              {item.photoUrl ? (
                <img src={item.photoUrl} alt={item.fullName} className="w-10 h-12 rounded object-cover" />
              ) : (
                <div className="w-10 h-12 rounded bg-muted flex items-center justify-center">
                  <IdCard className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.fullName}</div>
                <div className="text-xs text-muted-foreground">
                  {item.ktaNumber || 'KTA belum generate'} • {item.territory?.name || '-'}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {item.applicationNumber} • Status: {item.status}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// KTA — Form Pendaftaran Online (Public)
// ============================================================
function KtaPendaftaranForm() {
  const addToast = useToastStore((s) => s.addToast)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<any>(null)
  const [territories, setTerritories] = useState<any[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [idCardFile, setIdCardFile] = useState<File | null>(null)
  const [isInternational, setIsInternational] = useState(false)
  const [wilayahLevel, setWilayahLevel] = useState<'DPN' | 'DPD' | 'DPC'>('DPC')
  const [form, setForm] = useState({
    fullName: '', gender: '', birthPlace: '', birthDate: '', bloodType: '',
    maritalStatus: '', occupation: '', shirtSize: '',
    nik: '', passportNumber: '', phone: '', email: '', address: '',
    territoryId: '', applicantNotes: '',
  })

  useEffect(() => {
    // Load semua territory dulu, filter berdasarkan level yang dipilih
    api('/api/territory').then((all: any[]) => {
      setTerritories(all || [])
      // Default: tampilkan DPC (REGENCY)
      const dpcList = (all || []).filter((t: any) => t.level === 'REGENCY')
      if (dpcList.length > 0) setForm(f => ({ ...f, territoryId: dpcList[0].id }))
    }).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.phone || !form.territoryId) {
      addToast('Nama, WA, dan wilayah wajib diisi', 'error'); return
    }
    if (isInternational && !form.passportNumber) {
      addToast('Nomor Paspor wajib untuk pemohon luar negeri', 'error'); return
    }
    if (!isInternational && !form.nik) {
      addToast('NIK wajib untuk pemohon domestik', 'error'); return
    }
    if (!photoFile) { addToast('Pass foto wajib diupload', 'error'); return }
    if (!idCardFile) { addToast('KTP/Paspor wajib diupload', 'error'); return }
    setSubmitting(true); setSuccess(null)
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([k, v]) => formData.append(k, String(v || '')))
      formData.append('isInternational', String(isInternational))
      formData.append('photo', photoFile)
      formData.append('idCard', idCardFile)

      const res = await fetch('/api/kta-applications', {
        method: 'POST',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal')

      setSuccess(data.data)
      addToast('Permohonan KTA berhasil dikirim!', 'success')
      // Reset form
      setForm({
        fullName: '', gender: '', birthPlace: '', birthDate: '', bloodType: '',
        maritalStatus: '', occupation: '', shirtSize: '',
        nik: '', passportNumber: '', phone: '', email: '', address: '',
        territoryId: territories[0]?.id || '', applicantNotes: '',
      })
      setPhotoFile(null); setIdCardFile(null); setIsInternational(false)
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSubmitting(false) }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-emerald-700">Permohonan Berhasil Dikirim!</h3>
              <p className="text-sm text-muted-foreground mt-1">Pemohonan KTA Anda telah kami terima. Tim DPC akan menghubungi via WhatsApp dalam 1x24 jam.</p>
            </div>
            <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
              <div className="text-xs text-emerald-700 mb-1">Nomor Pendaftaran:</div>
              <div className="font-mono text-2xl font-bold text-emerald-800">{success.applicationNumber}</div>
              <div className="text-xs text-emerald-600 mt-2">Simpan nomor ini untuk cek status permohonan Anda.</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-left bg-slate-50 rounded-xl p-3 border">
              <div><div className="text-sm text-muted-foreground">Nama</div><div className="font-medium">{success.fullName}</div></div>
              <div><div className="text-sm text-muted-foreground">Wilayah</div><div className="font-medium">{success.territory?.name}</div></div>
              <div><div className="text-sm text-muted-foreground">Status</div><Badge className="bg-amber-100 text-amber-700 text-xs w-fit">PENDING</Badge></div>
              <div><div className="text-sm text-muted-foreground">Tanggal</div><div className="font-medium">{formatDateTimeID(success.createdAt)}</div></div>
            </div>
            <Button onClick={() => setSuccess(null)} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              Daftar Pemohon Lain
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <IdCard className="w-4 h-4 text-emerald-600" /> Formulir Pendaftaran KTA Online
        </CardTitle>
        <CardDescription>Lengkapi data diri, upload Pass Foto + KTP/Paspor. Tim DPC akan verifikasi dalam 1x24 jam.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle: Domestik / Luar Negeri */}
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsInternational(false)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border ${!isInternational ? 'bg-emerald-600 text-white border-emerald-600' : 'hover:bg-accent'}`}>
              🇮🇩 Domestik (WNI)
            </button>
            <button type="button" onClick={() => setIsInternational(true)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border ${isInternational ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-accent'}`}>
              🌍 Luar Negeri (WNA/WNI LN)
            </button>
          </div>

          {/* Data Diri */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-orange-600" /> Data Diri</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Nama Lengkap *</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Sesuai KTP/Paspor" required /></div>
              <div className="space-y-2"><Label>Jenis Kelamin</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Tempat Lahir</Label><Input value={form.birthPlace} onChange={(e) => setForm({ ...form, birthPlace: e.target.value })} placeholder="cth: Pontianak" /></div>
              <div className="space-y-2"><Label>Tanggal Lahir</Label><Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Golongan Darah</Label>
                <Select value={form.bloodType} onValueChange={(v) => setForm({ ...form, bloodType: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    {['A', 'B', 'AB', 'O'].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Status Pernikahan</Label>
                <Select value={form.maritalStatus} onValueChange={(v) => setForm({ ...form, maritalStatus: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LAJANG">Lajang</SelectItem>
                    <SelectItem value="MENIKAH">Menikah</SelectItem>
                    <SelectItem value="CERAI">Cerai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Pekerjaan</Label><Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="cth: Wiraswasta" /></div>
              <div className="space-y-2">
                <Label>Jabatan di Pengurus / Anggota *</Label>
                <Select value={form.applicantNotes || ''} onValueChange={(v) => setForm({ ...form, applicantNotes: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih Jabatan" /></SelectTrigger>
                  <SelectContent className="max-h-72">

                    {/* I. DEWAN PEMBINA */}
                    <SelectItem value="Ketua Dewan Pembina">Ketua Dewan Pembina</SelectItem>
                    <SelectItem value="Wakil Ketua Dewan Pembina I">Wakil Ketua Dewan Pembina I</SelectItem>
                    <SelectItem value="Wakil Ketua Dewan Pembina II">Wakil Ketua Dewan Pembina II</SelectItem>
                    <SelectItem value="Anggota Dewan Pembina I">Anggota Dewan Pembina I</SelectItem>
                    <SelectItem value="Anggota Dewan Pembina II">Anggota Dewan Pembina II</SelectItem>
                    <SelectItem value="Anggota Dewan Pembina III">Anggota Dewan Pembina III</SelectItem>
                    <SelectItem value="Anggota Dewan Pembina IV">Anggota Dewan Pembina IV</SelectItem>
                    <SelectItem value="Anggota Dewan Pembina V">Anggota Dewan Pembina V</SelectItem>

                    {/* II. DEWAN PENASEHAT */}
                    <SelectItem value="Ketua Dewan Penasehat">Ketua Dewan Penasehat</SelectItem>
                    <SelectItem value="Wakil Ketua Dewan Penasehat I">Wakil Ketua Dewan Penasehat I</SelectItem>
                    <SelectItem value="Wakil Ketua Dewan Penasehat II">Wakil Ketua Dewan Penasehat II</SelectItem>
                    <SelectItem value="Wakil Ketua Dewan Penasehat III">Wakil Ketua Dewan Penasehat III</SelectItem>
                    <SelectItem value="Wakil Ketua Dewan Penasehat IV">Wakil Ketua Dewan Penasehat IV</SelectItem>
                    <SelectItem value="Anggota Dewan Penasehat I">Anggota Dewan Penasehat I</SelectItem>
                    <SelectItem value="Anggota Dewan Penasehat II">Anggota Dewan Penasehat II</SelectItem>
                    <SelectItem value="Anggota Dewan Penasehat III">Anggota Dewan Penasehat III</SelectItem>
                    <SelectItem value="Anggota Dewan Penasehat IV">Anggota Dewan Penasehat IV</SelectItem>
                    <SelectItem value="Anggota Dewan Penasehat V">Anggota Dewan Penasehat V</SelectItem>
                    <SelectItem value="Anggota Dewan Penasehat VI">Anggota Dewan Penasehat VI</SelectItem>

                    {/* III. DEWAN PAKAR */}
                    <SelectItem value="Ketua Dewan Pakar">Ketua Dewan Pakar</SelectItem>
                    <SelectItem value="Anggota Dewan Pakar I">Anggota Dewan Pakar I</SelectItem>
                    <SelectItem value="Anggota Dewan Pakar II">Anggota Dewan Pakar II</SelectItem>

                    {/* IV. PENGURUS HARIAN */}
                    <SelectItem value="Ketua Umum">Ketua Umum</SelectItem>
                    <SelectItem value="Ketua Harian">Ketua Harian</SelectItem>
                    <SelectItem value="Wakil Ketua Umum I">Wakil Ketua Umum I (Internal)</SelectItem>
                    <SelectItem value="Wakil Ketua Umum II">Wakil Ketua Umum II (Eksternal)</SelectItem>
                    <SelectItem value="Wakil Ketua Umum III">Wakil Ketua Umum III (Dana & Investasi)</SelectItem>
                    <SelectItem value="Wakil Ketua Umum IV">Wakil Ketua Umum IV (Hukum & HAM)</SelectItem>
                    <SelectItem value="Sekretaris Jenderal">Sekretaris Jenderal</SelectItem>
                    <SelectItem value="Wakil Sekretaris Jenderal I">Wakil Sekretaris Jenderal I</SelectItem>
                    <SelectItem value="Wakil Sekretaris Jenderal II">Wakil Sekretaris Jenderal II</SelectItem>
                    <SelectItem value="Wakil Sekretaris Jenderal III">Wakil Sekretaris Jenderal III</SelectItem>
                    <SelectItem value="Bendahara Umum">Bendahara Umum</SelectItem>
                    <SelectItem value="Wakil Bendahara Umum I">Wakil Bendahara Umum I</SelectItem>
                    <SelectItem value="Wakil Bendahara Umum II">Wakil Bendahara Umum II</SelectItem>
                    <SelectItem value="Wakil Bendahara Umum III">Wakil Bendahara Umum III</SelectItem>
                    <SelectItem value="Sekretaris">Sekretaris</SelectItem>
                    <SelectItem value="Wakil Sekretaris I">Wakil Sekretaris I</SelectItem>
                    <SelectItem value="Wakil Sekretaris II">Wakil Sekretaris II</SelectItem>
                    <SelectItem value="Bendahara">Bendahara</SelectItem>
                    <SelectItem value="Wakil Bendahara I">Wakil Bendahara I</SelectItem>
                    <SelectItem value="Wakil Bendahara II">Wakil Bendahara II</SelectItem>

                    {/* V. DIVISI / BIRO */}
                    <SelectItem value="Ketua Biro Sekretariat">Ketua Biro Sekretariat</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Sekretariat">Wakil Ketua Biro Sekretariat</SelectItem>
                    <SelectItem value="Ketua Divisi Humas">Ketua Divisi Humas</SelectItem>
                    <SelectItem value="Wakil Ketua Divisi Humas">Wakil Ketua Divisi Humas</SelectItem>
                    <SelectItem value="Ketua Divisi Antar Lembaga">Ketua Divisi Antar Lembaga</SelectItem>
                    <SelectItem value="Wakil Ketua Divisi Antar Lembaga">Wakil Ketua Divisi Antar Lembaga</SelectItem>
                    <SelectItem value="Ketua Biro Lembaga Pemerintahan">Ketua Biro Lembaga Pemerintahan</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Lembaga Pemerintahan">Wakil Ketua Biro Lembaga Pemerintahan</SelectItem>
                    <SelectItem value="Ketua Biro Lembaga Non Pemerintahan">Ketua Biro Lembaga Non Pemerintahan/Swasta</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Lembaga Non Pemerintahan">Wakil Ketua Biro Lembaga Non Pemerintahan/Swasta</SelectItem>
                    <SelectItem value="Ketua Biro Lembaga Luar Negeri">Ketua Biro Lembaga di Luar Negeri</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Lembaga Luar Negeri">Wakil Ketua Biro Lembaga di Luar Negeri</SelectItem>
                    <SelectItem value="Ketua Divisi Program Internal">Ketua Divisi Program Internal</SelectItem>
                    <SelectItem value="Wakil Ketua Divisi Program Internal">Wakil Ketua Divisi Program Internal</SelectItem>
                    <SelectItem value="Ketua Biro Hubungan Internal">Ketua Biro Hubungan Internal</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Hubungan Internal">Wakil Ketua Biro Hubungan Internal</SelectItem>
                    <SelectItem value="Ketua Biro Seni dan Budaya">Ketua Biro Seni dan Budaya</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Seni dan Budaya">Wakil Ketua Biro Seni dan Budaya</SelectItem>
                    <SelectItem value="Ketua Biro Kaderisasi SDM">Ketua Biro Kaderisasi dan Pengembangan SDM</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Kaderisasi SDM">Wakil Ketua Biro Kaderisasi dan Pengembangan SDM</SelectItem>
                    <SelectItem value="Ketua Divisi Program Eksternal">Ketua Divisi Program Eksternal</SelectItem>
                    <SelectItem value="Wakil Ketua Divisi Program Eksternal">Wakil Ketua Divisi Program Eksternal</SelectItem>
                    <SelectItem value="Ketua Biro Pemberdayaan Perempuan">Ketua Biro Pemberdayaan Perempuan</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Pemberdayaan Perempuan">Wakil Ketua Biro Pemberdayaan Perempuan</SelectItem>
                    <SelectItem value="Ketua Biro Ketahanan Pangan">Ketua Biro Ketahanan Pangan</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Ketahanan Pangan">Wakil Ketua Biro Ketahanan Pangan</SelectItem>
                    <SelectItem value="Ketua Biro Kesehatan Gizi Anak">Ketua Biro Kesehatan & Gizi Anak</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Kesehatan Gizi Anak">Wakil Ketua Biro Kesehatan & Gizi Anak</SelectItem>
                    <SelectItem value="Ketua Biro Kerukunan Antar Agama">Ketua Biro Kerukunan Antar Agama</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Kerukunan Antar Agama">Wakil Ketua Biro Kerukunan Antar Agama</SelectItem>
                    <SelectItem value="Ketua Divisi Kaderisasi Organisasi">Ketua Divisi Kaderisasi & Organisasi</SelectItem>
                    <SelectItem value="Wakil Ketua Divisi Kaderisasi Organisasi">Wakil Ketua Divisi Kaderisasi & Organisasi</SelectItem>
                    <SelectItem value="Ketua Biro Kaderisasi">Ketua Biro Kaderisasi</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Kaderisasi">Wakil Ketua Biro Kaderisasi</SelectItem>
                    <SelectItem value="Ketua Biro Etik">Ketua Biro Etik</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Etik">Wakil Ketua Biro Etik</SelectItem>
                    <SelectItem value="Ketua Divisi Advokasi Hukum">Ketua Divisi Advokasi & Hukum</SelectItem>
                    <SelectItem value="Wakil Ketua Divisi Advokasi Hukum">Wakil Ketua Divisi Advokasi & Hukum</SelectItem>
                    <SelectItem value="Ketua Biro Litigasi">Ketua Biro Litigasi</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Litigasi">Wakil Ketua Biro Litigasi</SelectItem>
                    <SelectItem value="Ketua Biro Non Litigasi">Ketua Biro Non Litigasi</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Non Litigasi">Wakil Ketua Biro Non Litigasi</SelectItem>
                    <SelectItem value="Ketua Biro Ketenagakerjaan">Ketua Biro Ketenagakerjaan</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Ketenagakerjaan">Wakil Ketua Biro Ketenagakerjaan</SelectItem>
                    <SelectItem value="Ketua Divisi Kepemudaan">Ketua Divisi Kepemudaan</SelectItem>
                    <SelectItem value="Wakil Ketua Divisi Kepemudaan">Wakil Ketua Divisi Kepemudaan</SelectItem>
                    <SelectItem value="Ketua Biro UMKM">Ketua Biro UMKM</SelectItem>
                    <SelectItem value="Wakil Ketua Biro UMKM">Wakil Ketua Biro UMKM</SelectItem>
                    <SelectItem value="Ketua Biro Ekonomi Kreatif">Ketua Biro Ekonomi Kreatif</SelectItem>
                    <SelectItem value="Wakil Ketua Biro Ekonomi Kreatif">Wakil Ketua Biro Ekonomi Kreatif</SelectItem>

                    {/* BIDANG-BIDANG */}
                    {['Sekretariat', 'Humas', 'Antar Lembaga', 'Lembaga Pemerintahan', 'Non Pemerintah/Swasta', 'Lembaga di Luar Negeri', 'Program Internal', 'Program Eksternal', 'Pemberdayaan Perempuan', 'Kerukunan Antar Agama', 'Kaderisasi & Organisasi', 'Etik', 'Advokasi & Hukum', 'Litigasi', 'Non Litigasi', 'Ketenagakerjaan', 'Kepemudaan', 'Ekonomi Kreatif'].map((b) => (
                      <SelectItem key={`k${b}`} value={`Ketua Bidang ${b}`}>Ketua Bidang {b}</SelectItem>
                    ))}
                    {['Sekretariat', 'Humas', 'Antar Lembaga', 'Lembaga Pemerintahan', 'Non Pemerintah/Swasta', 'Lembaga di Luar Negeri', 'Program Internal', 'Program Eksternal', 'Pemberdayaan Perempuan', 'Kerukunan Antar Agama', 'Kaderisasi & Organisasi', 'Etik', 'Advokasi & Hukum', 'Litigasi', 'Non Litigasi', 'Ketenagakerjaan', 'Kepemudaan', 'Ekonomi Kreatif'].map((b) => (
                      <SelectItem key={`w${b}`} value={`Wakil Bidang ${b}`}>Wakil Bidang {b}</SelectItem>
                    ))}
                    {['Sekretariat', 'Humas', 'Antar Lembaga', 'Lembaga Pemerintahan', 'Non Pemerintah/Swasta', 'Lembaga di Luar Negeri', 'Program Internal', 'Program Eksternal', 'Pemberdayaan Perempuan', 'Kerukunan Antar Agama', 'Kaderisasi & Organisasi', 'Etik', 'Advokasi & Hukum', 'Litigasi', 'Non Litigasi', 'Ketenagakerjaan', 'Kepemudaan', 'Ekonomi Kreatif'].map((b) => (
                      <SelectItem key={`a${b}`} value={`Anggota Bidang ${b}`}>Anggota Bidang {b}</SelectItem>
                    ))}

                    {/* UMUM */}
                    <SelectItem value="Staf">Staf</SelectItem>
                    <SelectItem value="Anggota">Anggota</SelectItem>
                    <SelectItem value="Relawan">Relawan</SelectItem>
                    <SelectItem value="Koordinator Wilayah">Koordinator Wilayah</SelectItem>
                    <SelectItem value="Lainnya">Lainnya (isi manual)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Input detail untuk Lainnya */}
                {form.applicantNotes === 'Lainnya' && (
                  <Input
                    value={form.applicantNotes === 'Lainnya' ? (form.applicantNotes.split('||')[1] || '') : ''}
                    onChange={(e) => setForm({ ...form, applicantNotes: 'Lainnya||' + e.target.value })}
                    placeholder="Tulis jabatan lainnya..."
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2"><Label>Ukuran Baju Seragam</Label>
                <Select value={form.shirtSize} onValueChange={(v) => setForm({ ...form, shirtSize: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    {['S', 'M', 'L', 'XL', 'XXL', '3XL'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Identitas */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" /> Identitas & Kontak</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {isInternational ? (
                <div className="space-y-2"><Label>Nomor Paspor *</Label><Input value={form.passportNumber} onChange={(e) => setForm({ ...form, passportNumber: e.target.value })} placeholder="cth: C12345678" required /></div>
              ) : (
                <div className="space-y-2"><Label>NIK (16 digit) *</Label><Input value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} placeholder="cth: 6101010101900001" maxLength={16} required /></div>
              )}
              <div className="space-y-2"><Label>Nomor WhatsApp *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+62 812-xxxx-xxxx" required /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" /></div>
              <div className="space-y-2">
                <Label>Wilayah Tujuan *</Label>
                {/* Pilih Level: DPN / DPD / DPC */}
                <div className="flex gap-1 mb-2">
                  {([
                    { key: 'DPN', label: 'DPN (Pusat)', level: 'COUNTRY' },
                    { key: 'DPD', label: 'DPD (Provinsi)', level: 'PROVINCE' },
                    { key: 'DPC', label: 'DPC (Kab/Kota)', level: 'REGENCY' },
                  ] as const).map((lv) => (
                    <button
                      key={lv.key}
                      type="button"
                      onClick={() => {
                        setWilayahLevel(lv.key)
                        const filtered = territories.filter((t: any) => t.level === lv.level)
                        if (filtered.length > 0) setForm(f => ({ ...f, territoryId: filtered[0].id }))
                        else setForm(f => ({ ...f, territoryId: '' }))
                      }}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        wilayahLevel === lv.key
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'border hover:bg-accent'
                      }`}
                    >
                      {lv.label}
                    </button>
                  ))}
                </div>
                {/* Pilih Wilayah sesuai level */}
                <Select value={form.territoryId} onValueChange={(v) => setForm({ ...form, territoryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      wilayahLevel === 'DPN' ? 'Pilih DPN' :
                      wilayahLevel === 'DPD' ? 'Pilih DPD (Provinsi)' :
                      'Pilih DPC (Kab/Kota)'
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {territories
                      .filter((t: any) =>
                        wilayahLevel === 'DPN' ? t.level === 'COUNTRY' :
                        wilayahLevel === 'DPD' ? t.level === 'PROVINCE' :
                        t.level === 'REGENCY'
                      )
                      .map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Alamat Lengkap</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} placeholder="Alamat domisili saat ini" /></div>
          </div>

          {/* Upload Dokumen */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2"><Camera className="w-4 h-4 text-purple-600" /> Upload Dokumen</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Pass Foto */}
              <div className="space-y-2">
                <Label>Pass Foto 3x4 / 4x6 *</Label>
                {photoFile ? (
                  <div className="relative">
                    <img src={URL.createObjectURL(photoFile)} alt="Preview" className="w-full max-h-48 object-contain rounded-lg border" />
                    <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setPhotoFile(null)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Ganti
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-purple-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('photo-upload-input')?.click()}>
                    <input type="file" id="photo-upload-input" className="hidden" accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f && f.type.startsWith('image/') && f.size < 5 * 1024 * 1024) setPhotoFile(f)
                        else addToast('File harus gambar maks 5MB', 'error')
                      }} />
                    <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <div className="text-sm font-medium">Upload Pass Foto</div>
                    <div className="text-xs text-muted-foreground mt-1">JPG/PNG • Latar Merah/Biru • Maks 5MB</div>
                  </div>
                )}
              </div>
              {/* KTP / Paspor */}
              <div className="space-y-2">
                <Label>{isInternational ? 'Scan Paspor *' : 'Scan KTP *'}</Label>
                {idCardFile ? (
                  <div className="relative">
                    {idCardFile.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(idCardFile)} alt="Preview" className="w-full max-h-48 object-contain rounded-lg border" />
                    ) : (
                      <div className="w-full p-6 rounded-lg border bg-slate-50 flex flex-col items-center gap-2">
                        <FileText className="w-10 h-10 text-red-500" />
                        <div className="text-sm font-medium">{idCardFile.name}</div>
                        <div className="text-sm text-muted-foreground">{(idCardFile.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                    )}
                    <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setIdCardFile(null)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Ganti
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-purple-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('idcard-upload-input')?.click()}>
                    <input type="file" id="idcard-upload-input" className="hidden" accept="image/*,application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f && (f.type.startsWith('image/') || f.type === 'application/pdf') && f.size < 10 * 1024 * 1024) setIdCardFile(f)
                        else addToast('File harus gambar/PDF maks 10MB', 'error')
                      }} />
                    <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <div className="text-sm font-medium">Upload {isInternational ? 'Paspor' : 'KTP'}</div>
                    <div className="text-xs text-muted-foreground mt-1">JPG/PNG/PDF • Maks 10MB</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-2">
            <Label>Catatan untuk Admin (opsional)</Label>
            <Textarea value={form.applicantNotes} onChange={(e) => setForm({ ...form, applicantNotes: e.target.value })} rows={2}
              placeholder="Pertanyaan atau informasi tambahan untuk pengurus DPC..." />
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <strong>Privasi & Keamanan Data:</strong> Data yang Anda kirim hanya digunakan untuk verifikasi keanggotaan LAPRA 08 dan tidak akan dibagikan ke pihak ketiga. Dengan mendaftar, Anda menyetujui AD/ART LAPRA 08.
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            Kirim Permohonan KTA
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ============================================================
// KTA — Cek Status Permohonan (Public)
// ============================================================
function KtaCekStatus() {
  const addToast = useToastStore((s) => s.addToast)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) { addToast('Masukkan nomor pendaftaran atau WA', 'error'); return }
    setLoading(true); setResult(null)
    try {
      const res = await fetch(`/api/kta-applications/track?q=${encodeURIComponent(query)}`, {
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Tidak ditemukan')
      setResult(data.data)
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const statusConfig: Record<string, { label: string; color: string; icon: any; desc: string }> = {
    PENDING: { label: 'Menunggu Review', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, desc: 'Permohonan Anda diterima dan menunggu ditinjau admin DPC.' },
    REVIEWING: { label: 'Sedang Direview', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Eye, desc: 'Admin DPC sedang memverifikasi data & dokumen Anda.' },
    APPROVED: { label: 'Disetujui - KTA Diterbitkan', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, desc: 'Selamat! KTA digital Anda telah diterbitkan.' },
    REJECTED: { label: 'Ditolak', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, desc: 'Permohonan ditolak. Lihat alasan di bawah.' },
    ISSUED: { label: 'KTA Aktif', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: IdCard, desc: 'KTA digital Anda aktif. Masa berlaku 5 tahun.' },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="w-4 h-4 text-emerald-600" /> Cek Status Permohonan KTA
        </CardTitle>
        <CardDescription>Masukkan nomor pendaftaran (cth: APP-LAPRA08-20260808-0001) atau nomor WhatsApp</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="APP-LAPRA08-YYYYMMDD-XXXX atau +62 812-xxxx-xxxx"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          <Button onClick={handleSearch} disabled={loading} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Cek
          </Button>
        </div>
        {result && (
          <div className="rounded-xl border bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6">
            {(() => {
              const sc = statusConfig[result.status] || statusConfig.PENDING
              const ScIcon = sc.icon
              return (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-14 h-14 rounded-xl ${sc.color} flex items-center justify-center`}>
                      <ScIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Status Permohonan</div>
                      <Badge variant="outline" className={`text-sm ${sc.color}`}>{sc.label}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{sc.desc}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm bg-white rounded-lg p-4 border">
                    <div><div className="text-sm text-muted-foreground">Nomor Pendaftaran</div><div className="font-mono font-bold text-emerald-700">{result.applicationNumber}</div></div>
                    <div><div className="text-sm text-muted-foreground">Nama Pemohon</div><div className="font-medium">{result.fullName}</div></div>
                    <div><div className="text-sm text-muted-foreground">Wilayah DPC</div><div className="font-medium">{result.territory?.name || '-'}</div></div>
                    <div><div className="text-sm text-muted-foreground">Tanggal Daftar</div><div className="font-medium">{formatDateTimeID(result.createdAt)}</div></div>
                    {result.ktaNumber && (
                      <div className="col-span-2"><div className="text-sm text-muted-foreground">Nomor KTA</div><div className="font-mono font-bold text-emerald-700 text-base">{result.ktaNumber}</div></div>
                    )}
                    {result.ktaIssuedAt && (
                      <div><div className="text-sm text-muted-foreground">Diterbitkan</div><div className="font-medium">{formatDateID(result.ktaIssuedAt)}</div></div>
                    )}
                    {result.ktaExpiryDate && (
                      <div><div className="text-sm text-muted-foreground">Berlaku Sampai</div><div className="font-medium">{formatDateID(result.ktaExpiryDate)}</div></div>
                    )}
                  </div>
                  {result.rejectionReason && (
                    <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                      <strong>Alasan Penolakan:</strong> {result.rejectionReason}
                    </div>
                  )}
                  {result.reviewNotes && (
                    <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                      <strong>Catatan Admin:</strong> {result.reviewNotes}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// KTA — Admin Review Permohonan (Admin only)
// ============================================================
function KtaAdminReview() {
  const addToast = useToastStore((s) => s.addToast)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [reviewItem, setReviewItem] = useState<any>(null)
  const [reviewAction, setReviewAction] = useState<'REVIEWING' | 'APPROVE' | 'REJECT'>('REVIEWING')
  const [reviewNotes, setReviewNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [stats, setStats] = useState<any>({})

  const loadData = () => {
    setLoading(true)
    api(`/api/kta-applications?status=${statusFilter === 'ALL' ? '' : statusFilter}&search=${encodeURIComponent(search)}`)
      .then((data: any[]) => {
        setItems(data || [])
        // Calc stats
        const allStatuses = ['PENDING', 'REVIEWING', 'ISSUED', 'REJECTED']
        const s: any = {}
        allStatuses.forEach(st => s[st] = data?.filter((d: any) => d.status === st).length || 0)
        setStats(s)
      })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [statusFilter, search])

  const handleReview = async () => {
    if (!reviewItem) return
    if (reviewAction === 'REJECT' && !rejectionReason) { addToast('Alasan penolakan wajib diisi', 'error'); return }
    setProcessing(true)
    try {
      const res = await fetch(`/api/kta-applications/${reviewItem.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({
          action: reviewAction,
          reviewNotes,
          rejectionReason: reviewAction === 'REJECT' ? rejectionReason : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal')
      addToast(data.message, 'success')
      setReviewItem(null); setReviewNotes(''); setRejectionReason(''); setReviewAction('REVIEWING')
      loadData()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setProcessing(false) }
  }

  if (loading) return <LoadingState />

  const statusConfig: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Menunggu', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    REVIEWING: { label: 'Direview', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    ISSUED: { label: 'KTA Aktif', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REJECTED: { label: 'Ditolak', color: 'bg-red-50 text-red-700 border-red-200' },
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.entries(statusConfig).map(([k, v]) => (
          <button key={k} onClick={() => setStatusFilter(statusFilter === k ? 'ALL' : k)}
            className={`rounded-lg border p-3 text-left transition-all ${statusFilter === k ? 'ring-2 ring-emerald-500' : 'hover:bg-accent'}`}>
            <div className={`text-xs font-medium ${v.color.split(' ').slice(1, 3).join(' ')} px-2 py-0.5 rounded inline-block mb-1`}>{v.label}</div>
            <div className="text-2xl font-bold">{stats[k] || 0}</div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="w-4 h-4 text-emerald-600" /> Review Permohonan KTA ({items.length})
          </CardTitle>
          <CardDescription>Verifikasi dokumen pemohon & terbitkan KTA digital</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari nama / nomor pendaftaran / NIK / WA..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="PENDING">Menunggu Review</SelectItem>
                <SelectItem value="REVIEWING">Sedang Direview</SelectItem>
                <SelectItem value="ISSUED">KTA Diterbitkan</SelectItem>
                <SelectItem value="REJECTED">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {items.length === 0 ? (
            <EmptyState icon={UserCheck} title="Tidak ada permohonan" description="Belum ada permohonan KTA pada filter ini." />
          ) : (
            <div className="space-y-2">
              {items.map((a) => {
                const sc = statusConfig[a.status] || statusConfig.PENDING
                return (
                  <div key={a.id} className="rounded-xl border p-3 hover:shadow-md transition-all bg-white">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border shrink-0 bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center">
                        {a.photoUrl ? <img src={a.photoUrl} alt={a.fullName} className="w-full h-full object-cover" /> : <Users className="w-6 h-6 text-emerald-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-sm">{a.fullName}</div>
                          <Badge variant="outline" className={`text-[13px] ${sc.color}`}>{sc.label}</Badge>
                          {a.canReview && <Badge variant="outline" className="text-[13px] bg-emerald-50 text-emerald-700 border-emerald-200">Bisa Review</Badge>}
                        </div>
                        <div className="font-mono text-xs text-emerald-700 mt-0.5">{a.applicationNumber}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          📍 {a.territory?.name || '-'} • 📞 {a.phone}
                          {a.nik && ` • NIK: ${a.nik}`}
                          {a.passportNumber && ` • Paspor: ${a.passportNumber}`}
                        </div>
                        <div className="text-[13px] text-muted-foreground mt-1">{formatDateTimeID(a.createdAt)}</div>
                        {a.ktaNumber && (
                          <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-mono">
                            <IdCard className="w-3 h-3" /> {a.ktaNumber}
                          </div>
                        )}
                      </div>
                      {a.canReview && (
                        <Button variant="outline" size="sm" onClick={() => setReviewItem(a)}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> Review
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewItem} onOpenChange={(o) => !o && setReviewItem(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {reviewItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <IdCard className="w-5 h-5 text-emerald-600" /> Review Permohonan KTA
                </DialogTitle>
                <DialogDescription>{reviewItem.applicationNumber} • {reviewItem.fullName}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Documents */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Dokumen Upload</h4>
                  <div>
                    <Label className="text-xs">Pass Foto</Label>
                    {reviewItem.photoUrl ? (
                      <img src={reviewItem.photoUrl} alt="Pass Foto" className="w-full rounded-lg border max-h-64 object-contain" />
                    ) : <div className="text-xs text-red-600">Belum upload pass foto</div>}
                  </div>
                  <div>
                    <Label className="text-xs">KTP / Paspor</Label>
                    {reviewItem.idCardUrl ? (
                      reviewItem.idCardUrl.endsWith('.pdf') ? (
                        <a href={reviewItem.idCardUrl} target="_blank" rel="noopener noreferrer" className="block p-4 rounded-lg border bg-red-50 text-red-700 text-sm font-medium text-center hover:bg-red-100">
                          <FileText className="w-6 h-6 inline mr-2" />Lihat Dokumen PDF
                        </a>
                      ) : (
                        <img src={reviewItem.idCardUrl} alt="KTP" className="w-full rounded-lg border max-h-64 object-contain" />
                      )
                    ) : <div className="text-xs text-red-600">Belum upload KTP/Paspor</div>}
                  </div>
                </div>

                {/* Biodata */}
                <div className="space-y-2 text-sm">
                  <h4 className="text-sm font-semibold">Biodata Pemohon</h4>
                  <div className="rounded-lg bg-slate-50 border p-3 space-y-1.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-sm text-muted-foreground">Nama:</span><div className="font-medium">{reviewItem.fullName}</div></div>
                      <div><span className="text-sm text-muted-foreground">Gender:</span><div className="font-medium">{reviewItem.gender === 'L' ? 'Laki-laki' : reviewItem.gender === 'P' ? 'Perempuan' : '-'}</div></div>
                      <div><span className="text-sm text-muted-foreground">TTL:</span><div className="font-medium">{reviewItem.birthPlace}, {reviewItem.birthDate ? formatDateID(reviewItem.birthDate) : '-'}</div></div>
                      <div><span className="text-sm text-muted-foreground">Gol. Darah:</span><div className="font-medium">{reviewItem.bloodType || '-'}</div></div>
                      <div><span className="text-sm text-muted-foreground">Pekerjaan:</span><div className="font-medium">{reviewItem.occupation || '-'}</div></div>
                      <div><span className="text-sm text-muted-foreground">Status:</span><div className="font-medium">{reviewItem.maritalStatus || '-'}</div></div>
                      <div><span className="text-sm text-muted-foreground">Ukuran Baju:</span><div className="font-medium">{reviewItem.shirtSize || '-'}</div></div>
                      <div><span className="text-sm text-muted-foreground">Wilayah:</span><div className="font-medium">{reviewItem.territory?.name}</div></div>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div><span className="text-sm text-muted-foreground">NIK:</span><div className="font-mono font-medium">{reviewItem.nik || '-'}</div></div>
                      <div><span className="text-sm text-muted-foreground">Paspor:</span><div className="font-mono font-medium">{reviewItem.passportNumber || '-'}</div></div>
                      <div><span className="text-sm text-muted-foreground">WA:</span><div className="font-medium">{reviewItem.phone}</div></div>
                      <div><span className="text-sm text-muted-foreground">Email:</span><div className="font-medium">{reviewItem.email || '-'}</div></div>
                      <div><span className="text-sm text-muted-foreground">Alamat:</span><div className="text-xs">{reviewItem.address || '-'}</div></div>
                    </div>
                    {reviewItem.applicantNotes && (
                      <div className="border-t pt-2 mt-2">
                        <div className="text-sm text-muted-foreground">Catatan Pemohon:</div>
                        <div className="text-xs italic p-2 bg-amber-50 rounded">{reviewItem.applicantNotes}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Review Action */}
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-semibold">Aksi Admin</h4>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setReviewAction('REVIEWING')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${reviewAction === 'REVIEWING' ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-accent'}`}>
                    <Eye className="w-3 h-3 inline mr-1" />Tandai Sedang Direview
                  </button>
                  <button onClick={() => setReviewAction('APPROVE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${reviewAction === 'APPROVE' ? 'bg-emerald-600 text-white border-emerald-600' : 'hover:bg-accent'}`}>
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />Setujui & Terbitkan KTA
                  </button>
                  <button onClick={() => setReviewAction('REJECT')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${reviewAction === 'REJECT' ? 'bg-red-600 text-white border-red-600' : 'hover:bg-accent'}`}>
                    <XCircle className="w-3 h-3 inline mr-1" />Tolak Permohonan
                  </button>
                </div>
                <div className="space-y-2">
                  <Label>Catatan Admin (opsional)</Label>
                  <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={2}
                    placeholder="Catatan internal atau pesan untuk pemohon..." />
                </div>
                {reviewAction === 'REJECT' && (
                  <div className="space-y-2">
                    <Label className="text-red-700">Alasan Penolakan *</Label>
                    <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={2}
                      placeholder="Jelaskan alasan penolakan (akan dilihat pemohon)..." required />
                  </div>
                )}
                {reviewAction === 'APPROVE' && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                    KTA digital akan otomatis dibuat dengan format: <strong>LAPRA08.[NEGARA].[PROV].[KAB].[TAHUN].[URUT]</strong> berdasarkan wilayah pemohon. Masa berlaku 5 tahun.
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setReviewItem(null)}>Batal</Button>
                  <Button onClick={handleReview} disabled={processing}
                    className={reviewAction === 'REJECT' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'}>
                    {processing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                    {reviewAction === 'APPROVE' ? 'Setujui & Terbitkan KTA' : reviewAction === 'REJECT' ? 'Tolak Permohonan' : 'Update Status'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// KTA — Info Layanan
// ============================================================
function KtaInfoLayanan() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Award className="w-4 h-4 text-blue-600" /> Informasi Layanan KTA</CardTitle>
          <CardDescription>Panduan layanan Kartu Tanda Anggota digital LAPRA 08</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border p-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            <div className="font-semibold text-sm">KTA Digital</div>
            <p className="text-xs text-muted-foreground mt-1">Diterbitkan otomatis setelah verifikasi admin DPC. Berisi QR code untuk verifikasi keaslian.</p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-2"><KeyRound className="w-5 h-5 text-blue-600" /></div>
            <div className="font-semibold text-sm">Format KTA</div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">08[LEVEL][WILAYAH]P[URUT]</p>
            <p className="text-[10px] text-muted-foreground mt-1">Contoh: 08DPD 6100 P0001</p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center mb-2"><FileText className="w-5 h-5 text-orange-600" /></div>
            <div className="font-semibold text-sm">Cetak KTA Fisik</div>
            <p className="text-xs text-muted-foreground mt-1">Tersedia di sekretariat DPC. Biaya Rp 25.000 dengan kartu PVC + hologram.</p>
          </div>
        </CardContent>
      </Card>

      {/* Preview Format KTA Digital — depan + belakang + penjelasan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><IdCard className="w-4 h-4 text-emerald-600" /> Format KTA Digital</CardTitle>
          <CardDescription>Tampilan dan format Kartu Tanda Anggota digital LAPRA 08</CardDescription>
        </CardHeader>
        <CardContent>
          <KTASampleCard />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><FileCheck className="w-4 h-4 text-emerald-600" /> Alur Pendaftaran KTA Online</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { step: 1, title: 'Isi Formulir Online', desc: 'Lengkapi data diri (nama, NIK, kontak, pekerjaan, dll) di formulir pendaftaran online.', icon: FileText, color: 'bg-blue-500' },
            { step: 2, title: 'Upload Dokumen', desc: 'Upload pass foto (latar merah/biru) dan scan KTP/Paspor. Format JPG/PNG/PDF.', icon: Camera, color: 'bg-purple-500' },
            { step: 3, title: 'Pilih DPC Tujuan', desc: 'Pilih DPC (kabupaten/kota) tempat Anda berdomisili untuk verifikasi.', icon: MapPin, color: 'bg-amber-500' },
            { step: 4, title: 'Submit & Tunggu Review', desc: 'Tim DPC akan verifikasi data & dokumen dalam 1x24 jam via WhatsApp.', icon: Clock, color: 'bg-orange-500' },
            { step: 5, title: 'KTA Diterbitkan', desc: 'Setelah disetujui, KTA digital aktif dengan masa berlaku 5 tahun. Cetak fisik opsional.', icon: CheckCircle2, color: 'bg-emerald-500' },
          ].map((s) => {
            const Icon = s.icon
            return (
              <div key={s.step} className="flex items-start gap-3 p-3 rounded-lg border bg-white">
                <div className={`w-10 h-10 rounded-full ${s.color} text-white flex items-center justify-center font-bold shrink-0`}>
                  {s.step}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" />{s.title}</div>
                  <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Syarat & Ketentuan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /><span>WNI minimal 17 tahun atau WNA dengan KITAS, atau WNI di luar negeri dengan paspor aktif.</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /><span>Bersedia mematuhi AD/ART LAPRA 08 dan kode etik organisasi.</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /><span>Membayar iuran bulanan (Rp 25.000 untuk anggota biasa, Rp 50.000 untuk pengurus).</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /><span>Data yang dikirim adalah BENAR dan dapat dipertanggungjawabkan secara hukum.</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /><span>Privasi data dilindungi sesuai UU PDP No. 27 Tahun 2022.</span></div>
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
                    <Badge variant={c.status === 'RESOLVED' ? 'default' : 'outline'} className={`text-[13px] ${c.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {c.status === 'RESOLVED' ? 'Selesai' : c.status === 'READ' ? 'Dibaca' : 'Baru'}
                    </Badge>
                    <span className="text-[13px] text-muted-foreground">{formatDateTimeID(c.createdAt)}</span>
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

// ----- Lokasi Sekretariat — Struktur Hierarki DPN/DPD/DPC (seperti Pusat Data Organisasi) -----
function LokasiSekretariatManager() {
  const isSuperAdmin = useIsSuperAdmin()
  const [view, setView] = useState<'home' | 'dpn' | 'dpd-list' | 'dpd-detail' | 'dpc-list' | 'dpc-detail'>('home')
  const [territories, setTerritories] = useState<any[]>([])
  const [regencies, setRegencies] = useState<any[]>([])
  const [selectedProv, setSelectedProv] = useState<any>(null)
  const [selectedRegency, setSelectedRegency] = useState<any>(null)
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [form, setForm] = useState<any>({ name: '', level: 'DPC', address: '', city: '', province: '', postalCode: '', phone: '', email: '', hours: '', lat: 0, lng: 0, mapUrl: '' })

  useEffect(() => {
    Promise.all([
      api('/api/territory').then((all: any[]) => {
        setTerritories(all.filter(t => t.level === 'PROVINCE'))
        setRegencies(all.filter(t => t.level === 'REGENCY'))
      }).catch(() => {}),
      api('/api/sekretariat').then((data: any[]) => setLocations(data || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const reloadLocations = () => {
    api('/api/sekretariat').then((data: any[]) => setLocations(data || [])).catch(() => {})
  }

  // Filter locations by level
  const dpnLocations = locations.filter(l => l.level === 'DPN')
  const dpdLocations = locations.filter(l => l.level === 'DPD')
  const dpcLocations = locations.filter(l => l.level === 'DPC')

  // Filter DPD locations by selected province
  const dpdFiltered = selectedProv ? dpdLocations.filter(l => l.province === selectedProv.name || l.territoryCode === selectedProv.code) : []

  // Filter DPC locations by selected regency
  const dpcFiltered = selectedRegency ? dpcLocations.filter(l => l.city === selectedRegency.name || l.territoryCode === selectedRegency.code) : []

  // Filter regencies by selected province
  const filteredRegencies = selectedProv
    ? regencies.filter(r => { const prov = territories.find(p => p.code === selectedProv.code); return prov && r.parentId === prov.id })
    : []

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const userId = useAuthStore.getState().user?.id || ''
    const method = editItem ? 'PUT' : 'POST'
    const url = editItem ? `/api/sekretariat/${editItem.id}` : '/api/sekretariat'
    try {
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      useToastStore.getState().addToast(editItem ? 'Sekretariat diperbarui' : 'Sekretariat ditambahkan', 'success')
      setAddOpen(false); setEditItem(null); reloadLocations()
    } catch (e: any) { useToastStore.getState().addToast(e.message, 'error') }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await fetch(`/api/sekretariat/${deleteItem.id}`, { method: 'DELETE', headers: { 'x-user-id': useAuthStore.getState().user?.id || '' } })
      useToastStore.getState().addToast('Sekretariat dihapus', 'success')
      setDeleteItem(null); reloadLocations()
    } catch (e: any) { useToastStore.getState().addToast(e.message, 'error') }
  }

  const openEditor = (item?: any) => {
    if (item) { setEditItem(item); setForm({ ...item }) }
    else { setEditItem(null); setForm({ name: '', level: view === 'dpn' ? 'DPN' : view === 'dpd-detail' ? 'DPD' : 'DPC', address: '', city: '', province: selectedProv?.name || '', postalCode: '', phone: '', email: '', hours: '', lat: 0, lng: 0, mapUrl: '' }) }
    setAddOpen(true)
  }

  if (loading) return <LoadingState />

  const levelConfig: Record<string, { label: string; color: string }> = {
    DPN: { label: 'DPN Pusat', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    KOORWIL: { label: 'Koorwil', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    DPD: { label: 'DPD Provinsi', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    DPC: { label: 'DPC Kab/Kota', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  }

  const SekretariatCard = ({ loc }: { loc: any }) => {
    const lc = levelConfig[loc.level] || levelConfig.DPC
    return (
      <div className="rounded-xl border p-4 hover:shadow-md transition-all bg-white">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
            <MapIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm leading-tight">{loc.name}</div>
            <Badge variant="outline" className={`text-[13px] mt-1 ${lc.color}`}>{lc.label}</Badge>
          </div>
          {isSuperAdmin && (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => openEditor(loc)}>
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50" onClick={() => setDeleteItem(loc)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          {loc.address && <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" /><span>{loc.address}, {loc.city}, {loc.province} {loc.postalCode}</span></div>}
          {loc.phone && <div className="flex items-center gap-2"><PhoneCall className="w-3.5 h-3.5 text-blue-500 shrink-0" /><span>{loc.phone}</span></div>}
          {loc.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-emerald-500 shrink-0" /><span className="truncate">{loc.email}</span></div>}
          {loc.hours && <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" /><span>{loc.hours}</span></div>}
        </div>
        {loc.mapUrl && <a href={loc.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
          <ExternalLink className="w-3 h-3" /> Lihat di Google Maps
        </a>}
      </div>
    )
  }

  // === Render view content based on view state ===
  let viewContent: React.ReactNode = null

  // HOME VIEW: 3 Kartu DPN/DPD/DPC
  if (view === 'home') {
    const cards = [
      { key: 'dpn', title: 'DPN', subtitle: 'Pusat Nasional', desc: 'Sekretariat DPN LAPRA 08', count: dpnLocations.length, icon: Building2, grad: 'from-red-500 to-orange-600' },
      { key: 'dpd', title: 'DPD', subtitle: 'Provinsi', desc: 'Daftar sekretariat DPD se-Indonesia + LN', count: dpdLocations.length, icon: Globe, grad: 'from-blue-500 to-cyan-600' },
      { key: 'dpc', title: 'DPC', subtitle: 'Kabupaten/Kota', desc: 'Daftar sekretariat DPC per DPD', count: dpcLocations.length, icon: MapPin, grad: 'from-emerald-500 to-teal-600' },
    ]
    viewContent = (
      <div className="space-y-4">
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-800">
          <strong>Hierarki:</strong> DPN (Pusat Nasional) → DPD (Provinsi) → DPC (Kabupaten/Kota).
          Pilih tingkat untuk melihat sekretariat masing-masing wilayah.
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map(c => (
            <div key={c.key} className="rounded-2xl border-2 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
              onClick={() => { setView(c.key === 'dpn' ? 'dpn' : c.key === 'dpd' ? 'dpd-list' : 'dpc-list'); setSelectedProv(null); setSelectedRegency(null) }}>
              <div className={`bg-gradient-to-br ${c.grad} p-5 text-white`}>
                <c.icon className="w-8 h-8 mb-2" />
                <div className="text-xl font-bold">{c.title}</div>
                <div className="text-sm opacity-90">{c.subtitle}</div>
              </div>
              <div className="p-4 bg-white">
                <div className="text-sm text-muted-foreground mb-2">{c.desc}</div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[13px]">{c.count} sekretariat</Badge>
                  <span className="text-xs font-medium text-blue-600">Buka <ChevronRight className="w-4 h-4 inline" /></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // DPN VIEW
  else if (view === 'dpn') {
    viewContent = (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('home')}><ChevronRight className="w-4 h-4 rotate-180" /> Kembali</Button>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-red-600" /> Sekretariat DPN (Pusat Nasional)</h3>
          {isSuperAdmin && <Button size="sm" onClick={() => openEditor()} className="bg-gradient-to-r from-orange-600 to-red-600 text-white"><Plus className="w-4 h-4 mr-1" /> Tambah</Button>}
        </div>
        {dpnLocations.length === 0 ? <EmptyState icon={MapIcon} title="Belum ada sekretariat DPN" /> : (
          <div className="grid gap-4 md:grid-cols-2">{dpnLocations.map(loc => <SekretariatCard key={loc.id} loc={loc} />)}</div>
        )}
      </div>
    )
  }

  // DPD LIST VIEW
  else if (view === 'dpd-list') {
    viewContent = (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('home')}><ChevronRight className="w-4 h-4 rotate-180" /> Kembali</Button>
        <h3 className="text-base font-bold flex items-center gap-2"><Globe className="w-5 h-5 text-blue-600" /> Pilih DPD (Provinsi)</h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {territories.map(prov => {
            const count = dpdLocations.filter(l => l.province === prov.name || l.territoryCode === prov.code).length
            return (
              <button key={prov.code} onClick={() => { setSelectedProv(prov); setView('dpd-detail') }}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-all text-left">
                <span className="text-sm font-medium">{prov.name}</span>
                <Badge variant="outline" className="text-[13px]">{count > 0 ? `${count} lokasi` : 'Kosong'}</Badge>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // DPD DETAIL VIEW
  else if (view === 'dpd-detail' && selectedProv) {
    viewContent = (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('dpd-list')}><ChevronRight className="w-4 h-4 rotate-180" /> Kembali ke daftar DPD</Button>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2"><Globe className="w-5 h-5 text-blue-600" /> Sekretariat DPD {selectedProv.name}</h3>
          {isSuperAdmin && <Button size="sm" onClick={() => openEditor()} className="bg-gradient-to-r from-orange-600 to-red-600 text-white"><Plus className="w-4 h-4 mr-1" /> Tambah</Button>}
        </div>
        {dpdFiltered.length === 0 ? <EmptyState icon={MapIcon} title={`Belum ada sekretariat DPD ${selectedProv.name}`} description="Klik 'Tambah' untuk menambah sekretariat DPD." /> : (
          <div className="grid gap-4 md:grid-cols-2">{dpdFiltered.map(loc => <SekretariatCard key={loc.id} loc={loc} />)}</div>
        )}
      </div>
    )
  }

  // DPC LIST VIEW (pilih provinsi dulu)
  else if (view === 'dpc-list') {
    viewContent = (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('home')}><ChevronRight className="w-4 h-4 rotate-180" /> Kembali</Button>
        <h3 className="text-base font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-600" /> Pilih DPD (Provinsi) untuk lihat DPC</h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {territories.map(prov => {
            const count = dpcLocations.filter(l => l.province === prov.name || l.territoryCode === prov.code).length
            return (
              <button key={prov.code} onClick={() => { setSelectedProv(prov); setView('dpc-detail'); setSelectedRegency(null) }}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-all text-left">
                <span className="text-sm font-medium">{prov.name}</span>
                <Badge variant="outline" className="text-[13px]">{count > 0 ? `${count} DPC` : 'Kosong'}</Badge>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // DPC DETAIL VIEW (list kab/kota di provinsi terpilih)
  else if (view === 'dpc-detail' && selectedProv) {
    viewContent = (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('dpc-list')}><ChevronRight className="w-4 h-4 rotate-180" /> Kembali ke daftar provinsi</Button>
        <h3 className="text-base font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-600" /> DPC di {selectedProv.name}</h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {filteredRegencies.map(reg => {
            const count = dpcLocations.filter(l => l.city === reg.name || l.territoryCode === reg.code).length
            return (
              <button key={reg.code} onClick={() => setSelectedRegency(reg)}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-all text-left">
                <span className="text-sm font-medium">{reg.name}</span>
                <Badge variant="outline" className="text-[13px]">{count > 0 ? `${count} lokasi` : 'Kosong'}</Badge>
              </button>
            )
          })}
        </div>
        {selectedRegency && (
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Sekretariat DPC {selectedRegency.name}</h4>
              {isSuperAdmin && <Button size="sm" onClick={() => openEditor()} className="bg-gradient-to-r from-orange-600 to-red-600 text-white"><Plus className="w-4 h-4 mr-1" /> Tambah</Button>}
            </div>
            {dpcFiltered.length === 0 ? <EmptyState icon={MapIcon} title={`Belum ada sekretariat DPC ${selectedRegency.name}`} /> : (
              <div className="grid gap-4 md:grid-cols-2">{dpcFiltered.map(loc => <SekretariatCard key={loc.id} loc={loc} />)}</div>
            )}
          </div>
        )}
      </div>
    )
  }

  // === Final return: view content + always-rendered dialogs ===
  return (
    <>
      {viewContent}

      {/* Dialog: Tambah / Edit Sekretariat */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setEditItem(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-orange-600" />
              {editItem ? 'Edit Sekretariat' : 'Tambah Sekretariat'}
            </DialogTitle>
            <DialogDescription>
              {editItem ? `Perbarui informasi lokasi: ${editItem.name}` : 'Lengkapi informasi lokasi sekretariat.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 py-2">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <Label className="text-[13px]">Nama Sekretariat <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mis. Sekretariat DPN LAPRA 08" required className="text-[14px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[13px]">Tingkat</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger className="text-[14px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DPN">DPN — Pusat Nasional</SelectItem>
                    <SelectItem value="KOORWIL">Koorwil</SelectItem>
                    <SelectItem value="DPD">DPD — Provinsi</SelectItem>
                    <SelectItem value="DPC">DPC — Kabupaten/Kota</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[13px]">Kode Wilayah</Label>
                <Input value={form.territoryCode || ''} onChange={(e) => setForm({ ...form, territoryCode: e.target.value })} placeholder="Mis. 6171" className="text-[14px]" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-[13px]">Alamat Lengkap</Label>
                <Textarea value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Jalan, nomor, RT/RW, kelurahan" rows={2} className="text-[14px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[13px]">Kabupaten/Kota</Label>
                <Input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Mis. Pontianak" className="text-[14px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[13px]">Provinsi</Label>
                <Input value={form.province || ''} onChange={(e) => setForm({ ...form, province: e.target.value })} placeholder="Mis. Kalimantan Barat" className="text-[14px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[13px]">Kode Pos</Label>
                <Input value={form.postalCode || ''} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} placeholder="Mis. 78112" className="text-[14px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[13px]">Telepon</Label>
                <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Mis. 0812-xxxx-xxxx" className="text-[14px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[13px]">Email</Label>
                <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Mis. sekretariat@lapra08.id" className="text-[14px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[13px]">Jam Operasional</Label>
                <Input value={form.hours || ''} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="Mis. Senin–Jumat 08.00–17.00 WIB" className="text-[14px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[13px]">Latitude</Label>
                <Input type="number" step="any" value={form.lat || 0} onChange={(e) => setForm({ ...form, lat: parseFloat(e.target.value) || 0 })} className="text-[14px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[13px]">Longitude</Label>
                <Input type="number" step="any" value={form.lng || 0} onChange={(e) => setForm({ ...form, lng: parseFloat(e.target.value) || 0 })} className="text-[14px]" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-[13px]">Google Maps URL</Label>
                <Input value={form.mapUrl || ''} onChange={(e) => setForm({ ...form, mapUrl: e.target.value })} placeholder="https://maps.google.com/..." className="text-[14px]" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setAddOpen(false); setEditItem(null) }}>Batal</Button>
              <Button type="submit" className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                {editItem ? 'Simpan Perubahan' : 'Tambah Sekretariat'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Konfirmasi Hapus */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Sekretariat?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>&quot;{deleteItem?.name}&quot;</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
                      <Badge variant="outline" className={`text-[13px] ${pc.color}`}>{pc.label}</Badge>
                      <Badge variant={m.status === 'RESOLVED' ? 'default' : m.status === 'READ' ? 'secondary' : 'outline'} className={`text-[13px] ${m.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' : m.status === 'READ' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                        {m.status === 'RESOLVED' ? 'Selesai' : m.status === 'READ' ? 'Dibaca' : 'Baru'}
                      </Badge>
                    </div>
                    <div className="font-semibold text-sm">{m.subject}</div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.message}</p>
                    <div className="text-[13px] text-muted-foreground mt-2">{m.name} • {formatDateTimeID(m.createdAt)}</div>
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
// FAQ dapat diedit (CRUD) hanya oleh Super Admin. User lain hanya lihat (read-only).
// FAQ disimpan ke database via /api/faq. Jika database kosong, fallback ke 20 FAQ default hardcoded.
function FaqManager() {
  const addToast = useToastStore((s) => s.addToast)
  const isSuperAdmin = useIsSuperAdmin()
  const [faqs, setFaqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [openItem, setOpenItem] = useState<string | null>(null)
  // === Edit/Tambah dialog state (Super Admin only) ===
  const [editDialog, setEditDialog] = useState<any>(null) // null | { faq: any } | { faq: null, isNew: true }
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null) // null | faq
  const [form, setForm] = useState({ id: '', category: 'KEANGGOTAAN', q: '', a: '' })

  // === 20 FAQ default (12 lama + 8 baru) ===
  const DEFAULT_FAQS = [
    // ===== KEANGGOTAAN (4) =====
    { id: 'faq_1', category: 'KEANGGOTAAN', q: 'Bagaimana cara mendaftar menjadi anggota LAPRA 08?', a: 'Pendaftaran anggota LAPRA 08 dilakukan melalui DPC setempat (Kabupaten/Kota). Anda dapat mengunjungi sekretariat DPC di wilayah Anda, mengisi formulir pendaftaran, melampirkan fotokopi KTP dan pas foto, serta membayar iuran pendaftaran. Setelah diverifikasi, Anda akan menerima KTA (Kartu Tanda Anggota) digital dengan format unik LAPRA08.[NEGARA].[PROVINSI].[KAB/KOTA].[TAHUN].[URUT].' },
    { id: 'faq_2', category: 'KEANGGOTAAN', q: 'Apakah anggota luar negeri bisa mendaftar?', a: 'Ya. LAPRA 08 memiliki DPD di 5 negara (Amerika Serikat, Cina, Malaysia, Arab Saudi, dan Australia). Warga Indonesia yang berdomisili di negara tersebut dapat mendaftar melalui DPD setempat. Format KTA internasional menggunakan kode negara setempat, misalnya LAPRA08.US.00.LAX.26.00001 untuk anggota di Los Angeles.' },
    { id: 'faq_3', category: 'KEANGGOTAAN', q: 'Berapa iuran anggota LAPRA 08?', a: 'Iuran anggota dibagi menjadi beberapa kategori: (1) Iuran bulanan anggota biasa Rp 25.000/bulan; (2) Iuran bulanan pengurus Rp 50.000/bulan; (3) Iuran tahunan dapat dibayar di muka dengan diskon. Iuran dapat dibayarkan melalui transfer ke rekening resmi DPC atau via QRIS. Khusus anggota luar negeri, iuran setara USD 5/bulan.' },
    { id: 'faq_13', category: 'KEANGGOTAAN', q: 'Bagaimana cara memperbarui data anggota jika ada perubahan (nama, alamat, no HP)?', a: 'Perubahan data anggota dapat dilakukan melalui DPC setempat dengan mengisi formulir "Permohonan Update Data Anggota" dan melampirkan dokumen pendukung (KTP baru, bukti domisili, dll). Update data diproses maksimal 3 hari kerja. Jika anggota berdomisili di luar negeri, permohonan dapat dikirim via email ke DPD setempat dengan scan dokumen yang telah dilegalisasi oleh KBRI.' },
    { id: 'faq_14', category: 'KEANGGOTAAN', q: 'Apa yang harus dilakukan jika KTA digital hilang atau tidak bisa diakses?', a: 'Jika KTA digital hilang/tidak bisa diakses, laporkan ke DPC setempat atau gunakan menu "Layanan KTA" > "Lapor KTA Bermasalah". Sistem akan memverifikasi identitas Anda dan menerbitkan ulang KTA digital dalam 1x24 jam. Untuk KTA fisik yang hilang, biaya cetak ulang Rp 25.000. Pastikan data kontak (HP/email) selalu aktif agar proses verifikasi cepat.' },
    // ===== STRUKTUR (3) =====
    { id: 'faq_4', category: 'STRUKTUR', q: 'Apa saja tingkatan struktur pengurus LAPRA 08?', a: 'Struktur LAPRA 08 terdiri dari 5 tingkat: (1) DPN (Dewan Pimpinan Pusat) di tingkat nasional; (2) Koorwil (Koordinator Wilayah) yang membawahi 7 wilayah Indonesia + 1 LN; (3) DPD (Dewan Pimpinan Daerah) di tingkat provinsi/negara LN; (4) Koor DPD (Koordinator Region) yang membawahi kelompok DPC; (5) DPC (Dewan Pimpinan Cabang) di tingkat kabupaten/kota. Total ada 38 provinsi + IKN + 5 negara LN.' },
    { id: 'faq_5', category: 'STRUKTUR', q: 'Siapa Ketua Umum DPN LAPRA 08 periode 2024-2029?', a: 'Pengurus DPN LAPRA 08 periode 2024-2029 dipimpin oleh Dr. (HC) Hashim S. Djojohadikusumo sebagai Ketua Dewan Pembina, dan Devi Taurisa, S.H., M.H., C.L.D. sebagai Ketua Umum DPN. Sekretaris Jenderal dijabat oleh Brigjen. Pol. (Purn) Dr. R. Nurhadi, S.I.K., M.Si., CHRMP, dan Bendahara Umum adalah Timmy Rorimpandey, S.E., M.M. Pembaruan pengurus inti dilakukan pada Maret 2026.' },
    { id: 'faq_15', category: 'STRUKTUR', q: 'Bagaimana cara menjadi pengurus di DPC atau DPD?', a: 'Untuk menjadi pengurus, anggota harus: (1) Telah bergabung minimal 6 bulan; (2) Aktif mengikuti kegiatan organisasi; (3) Bersedia menjabat minimal 1 periode (2 tahun). Pemilihan pengurus dilakukan melalui Musyawarah Cabang/Daerah. Calon dapat diajukan oleh anggota lain atau mengajukan diri sendiri melalui formulir "Lamaran Pengurus" di DPC/DPD setempat. Keputusan final melalui voting pengurus inti.' },
    // ===== PROGRAM & KEGIATAN (3) =====
    { id: 'faq_6', category: 'PROGRAM', q: 'Apa program unggulan LAPRA 08?', a: 'Program unggulan LAPRA 08 meliputi: (1) Sosialisasi Asta Cita Presiden Prabowo ke seluruh DPD di 38 provinsi; (2) Penguatan kader DPC se-Indonesia melalui pelatihan rutin; (3) Aksi sosial seperti bakti sosial, donor darah, dan distribusi sembako; (4) Kemitraan dengan ummat, ormas Islam, kementerian, dan BUMN untuk program CSR; (5) Digitalisasi sistem informasi internal untuk efisiensi administrasi.' },
    { id: 'faq_7', category: 'PROGRAM', q: 'Bagaimana cara mengajukan proposal kemitraan dengan LAPRA 08?', a: 'Proposal kemitraan dapat diajukan melalui email resmi sekretariat@lapra08.id dengan subject "Proposal Kemitraan - [Nama Institusi]". Lampirkan profil institusi, latar belakang kemitraan, lingkup kerja sama, dan expected outcomes. Tim Sekretariat DPN akan melakukan review dalam 14 hari kerja dan menghubungi Anda untuk diskusi lebih lanjut jika proposal memenuhi kriteria.' },
    { id: 'faq_16', category: 'PROGRAM', q: 'Bagaimana mekanisme pelaporan kegiatan (LPJ) setelah event selesai?', a: 'Setiap kegiatan yang dibiayai organisasi wajib membuat Laporan Pertanggungjawaban (LPJ) maksimal 7 hari setelah event selesai. LPJ berisi: (1) Laporan pelaksanaan (foto/video bukti); (2) Laporan keuangan (kuitansi, nota, bukti transfer); (3) Daftar hadir peserta; (4) Evaluasi dan rekomendasi. Upload melalui menu "Program & Kegiatan" > pilih program > "Upload Bukti Pelaksanaan". LPJ yang tidak disampaikan akan menghambat pencairan dana kegiatan berikutnya.' },
    // ===== LAYANAN & ADVOKASI (3) =====
    { id: 'faq_8', category: 'LAYANAN', q: 'Bagaimana cara mengajukan pengaduan atau aspirasi?', a: 'Pengaduan dan aspirasi dapat disampaikan melalui: (1) Formulir "Hubungi Kami" di menu Kontak & Sekretariat; (2) Pusat Pengaduan & Aspirasi di menu Layanan & Advokasi; (3) WhatsApp resmi DPC setempat; (4) Surat resmi ke sekretariat DPN. Setiap pengaduan akan ditindaklanjuti dalam 1x24 jam (kasus normal) atau 2 jam (kasus urgent). Identitas pelapor dilindungi sesuai kebijakan privasi.' },
    { id: 'faq_9', category: 'LAYANAN', q: 'Apakah LAPRA 08 menyediakan bantuan hukum untuk anggota?', a: 'Ya, LAPRA 08 menyediakan layanan bantuan hukum untuk anggota yang menghadapi kasus hukum terkait aktivitas keorganisasian. Layanan ini diakses melalui menu "Bantuan Hukum" di Layanan & Advokasi. Tim advokasi DPN akan melakukan assessment kasus, memberikan konsultasi awal gratis, dan jika diperlukan, merujuk ke pengacara mitra dengan tarif khusus untuk anggota.' },
    { id: 'faq_17', category: 'LAYANAN', q: 'Bagaimana cara mengajukan proposal bantuan dana kegiatan?', a: 'Proposal bantuan dana dapat diajukan melalui menu "Layanan & Advokasi" > "Pengajuan Proposal". Setiap proposal harus berisi: (1) Latar belakang kegiatan; (2) Tujuan dan target peserta; (3) Rincian anggaran (maksimal Rp 50 juta untuk DPC, Rp 200 juta untuk DPD); (4) Jadwal pelaksanaan; (5) Komitmen LPJ. Proposal dievaluasi tim Sekretariat DPN dalam 14 hari kerja. Dana dicairkan 50% di awal, 50% setelah LPJ disetujui.' },
    // ===== LAINNYA (4) =====
    { id: 'faq_10', category: 'LAINNYA', q: 'Bagaimana cara mendapatkan KTA digital?', a: 'KTA digital diterbitkan secara otomatis setelah pendaftaran anggota diverifikasi oleh pengurus DPC. KTA dapat diakses melalui menu "Layanan KTA" di portal LAPRA 08. Format KTA: LAPRA08.[NEGARA].[PROVINSI].[KAB/KOTA].[TAHUN].[URUT]. KTA digital berisi QR code untuk verifikasi keaslian, foto anggota, dan data keanggotaan. KTA fisik dapat dicetak di DPC dengan biaya Rp 25.000.' },
    { id: 'faq_11', category: 'LAINNYA', q: 'Apakah portal LAPRA 08 bisa diakses publik?', a: 'Portal LAPRA 08 bersifat semi-publik. Beranda, Profil, Pusat Media (berita & galeri), dan Program & Kegiatan dapat diakses publik. Sedangkan menu operasional seperti Dashboard, Pusat Data Organisasi, Logistik, Komunikasi, Keuangan, dan User hanya dapat diakses oleh pengurus yang telah login dengan role yang sesuai (SUPERADMIN, ADMIN_DPN, ADMIN_KOORWIL, ADMIN_DPD, ADMIN_KOOR_DPD, ADMIN_DPC). Isolasi data otomatis diterapkan sesuai hierarki wilayah.' },
    { id: 'faq_12', category: 'LAINNYA', q: 'Bagaimana cara melaporkan kendala teknis portal?', a: 'Kendala teknis dapat dilaporkan melalui menu "Pusat Bantuan & Tiket" di Layanan & Advokasi. Pilih kategori "Bug/Error Sistem" atau "Permintaan Fitur", sertakan tangkapan layar dan langkah reproduksi jika memungkinkan. Tim IT DPN akan merespons dalam 4 jam kerja. Untuk kendala kritis (sistem tidak bisa diakses), hubungi hotline IT DPN di +62 811-9090-08 (24/7).' },
    { id: 'faq_18', category: 'LAINNYA', q: 'Bagaimana cara mengajukan izin kegiatan yang melibatkan massa besar (>100 orang)?', a: 'Kegiatan dengan peserta >100 orang wajib: (1) Mengajukan permohonan izin ke DPC setempat minimal 14 hari sebelum event; (2) Mendapatkan rekomendasi dari DPD; (3) Berkoordinasi dengan kepolisian dan Pemda setempat; (4) Menyiapkan tim keamanan (minimal 1 petugas per 50 peserta); (5) Membuat protokol K3 dan jalur evakuasi. Formulir permohonan tersedia di menu "Layanan & Advokasi" > "Permohonan Izin Kegiatan".' },
    { id: 'faq_19', category: 'LAINNYA', q: 'Apakah ada aplikasi mobile LAPRA 08 untuk Android/iOS?', a: 'Saat ini portal LAPRA 08 dioptimalkan untuk akses mobile melalui browser (responsive web design). Aplikasi mobile native (Android/iOS) sedang dalam tahap pengembangan dan rencananya akan dirilis Q1 2027. Fitur yang akan tersedia di app mobile: login biometrik, push notification, KTA digital dengan QR code, check-in event via QR scanner, dan offline mode untuk akses data dasar. Update akan diumumkan melalui portal dan grup WhatsApp resmi.' },
    { id: 'faq_20', category: 'LAINNYA', q: 'Bagaimana kebijakan privasi dan keamanan data anggota di portal LAPRA 08?', a: 'Data anggota dilindungi sesuai UU PDP No. 27 Tahun 2022. Kebijakan: (1) Data anggota hanya dapat diakses oleh pengurus dengan otorisasi sesuai hierarki wilayah; (2) Data sensitif (no KTP, alamat lengkap) dienkripsi di database; (3) Setiap akses dicatat dalam audit log; (4) Anggota dapat request akses/hapus data (GDPR-style) melalui menu "Pengaturan" > "Privasi Data"; (5) Tidak ada data yang dibagikan ke pihak ketiga tanpa persetujuan tertulis anggota.' },
  ]

  // === Load FAQ from API. Gabungkan DEFAULT_FAQS + data DB (deduplikasi by ID) ===
  // Jika database kosong → pakai DEFAULT_FAQS (20 FAQ)
  // Jika database ada data → gabungkan DEFAULT + DB (DB override DEFAULT by ID)
  const reload = () => {
    setLoading(true)
    api('/api/faq')
      .then((data: any[]) => {
        // Extract value dari response API
        const dbFaqs = (data || [])
          .map((item: any) => item.value || item)
          .filter(Boolean)
          .filter((f: any) => f && f.id && f.q && f.a) // validasi field wajib

        // Map DEFAULT_FAQS by ID untuk override
        const defaultMap = new Map(DEFAULT_FAQS.map(f => [f.id, f]))
        const dbMap = new Map(dbFaqs.map((f: any) => [f.id, f]))

        // Gabungan: semua default + semua DB (DB override default dengan ID sama)
        const merged = [
          ...DEFAULT_FAQS.map(f => dbMap.get(f.id) || f),  // default, di-override DB jika ada
          ...dbFaqs.filter((f: any) => !defaultMap.has(f.id)),  // DB items yang bukan default
        ]
        setFaqs(merged)
      })
      .catch(() => setFaqs(DEFAULT_FAQS))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // === Handler: Simpan FAQ (create or update) - Super Admin only ===
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.q.trim() || !form.a.trim()) {
      addToast('Pertanyaan dan jawaban wajib diisi', 'error')
      return
    }
    setSaving(true)
    try {
      const id = form.id || `faq_${Date.now()}`
      await api('/api/faq', {
        method: 'POST',
        body: JSON.stringify({ id, category: form.category, q: form.q, a: form.a }),
      })
      addToast(editDialog?.isNew ? 'FAQ baru ditambahkan' : 'FAQ diperbarui', 'success')
      setEditDialog(null)
      setForm({ id: '', category: 'KEANGGOTAAN', q: '', a: '' })
      reload()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // === Handler: Hapus FAQ - Super Admin only ===
  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await api(`/api/faq?id=${deleteConfirm.id}`, { method: 'DELETE' })
      addToast('FAQ dihapus', 'success')
      setDeleteConfirm(null)
      reload()
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

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
        <CardTitle className="flex items-center gap-2 text-base">
          <HelpCircle className="w-4 h-4 text-emerald-600" /> FAQ - Pertanyaan yang Sering Diajukan ({filtered.length})
          {/* === Tombol "Tambah FAQ" - Super Admin only === */}
          {isSuperAdmin && (
            <Button size="sm" className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => { setEditDialog({ isNew: true }); setForm({ id: '', category: 'KEANGGOTAAN', q: '', a: '' }) }}>
              <Plus className="w-4 h-4 mr-1" /> Tambah FAQ
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Temukan jawaban cepat untuk pertanyaan umum tentang LAPRA 08
          {isSuperAdmin && <span className="block text-xs text-emerald-700 mt-1 font-medium">🔓 Mode Super Admin — Anda dapat menambah, mengedit, dan menghapus FAQ</span>}
        </CardDescription>
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
                <Badge variant="outline" className="text-[13px]">{count}</Badge>
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
                <div className="flex items-stretch">
                  <button onClick={() => setOpenItem(isOpen ? null : faq.id)} className="flex-1 p-4 flex items-start gap-3 hover:bg-accent/50 transition-colors text-left">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cat.color}`}>
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{faq.q}</div>
                      <Badge variant="outline" className={`text-[13px] mt-1 ${cat.color}`}>{cat.label}</Badge>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 mt-1 ${isOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {/* === Tombol Edit/Hapus - Super Admin only === */}
                  {isSuperAdmin && (
                    <div className="flex flex-col gap-1 p-2 border-l bg-slate-50/50 justify-center">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          setEditDialog({ faq })
                          setForm({ id: faq.id, category: faq.category, q: faq.q, a: faq.a })
                          if (!isOpen) setOpenItem(faq.id) // auto-expand saat edit
                        }}
                        title="Edit FAQ">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteConfirm(faq)}
                        title="Hapus FAQ">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground leading-relaxed border-t bg-slate-50/50">
                    <p className="mt-3 whitespace-pre-wrap">{faq.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {filtered.length === 0 && <EmptyState icon={HelpCircle} title="Tidak ada FAQ cocok" description="Coba kata kunci lain atau hubungi sekretariat langsung." />}
      </CardContent>

      {/* === Dialog Tambah/Edit FAQ - Super Admin only === */}
      <Dialog open={!!editDialog} onOpenChange={(o) => { if (!o) { setEditDialog(null); setForm({ id: '', category: 'KEANGGOTAAN', q: '', a: '' }) } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDialog?.isNew ? 'Tambah FAQ Baru' : 'Edit FAQ'}</DialogTitle>
            <DialogDescription>
              {editDialog?.isNew
                ? 'Tambah pertanyaan dan jawaban baru ke daftar FAQ'
                : 'Edit pertanyaan atau jawaban FAQ yang dipilih'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KEANGGOTAAN">Keanggotaan</SelectItem>
                  <SelectItem value="STRUKTUR">Struktur Organisasi</SelectItem>
                  <SelectItem value="PROGRAM">Program & Kegiatan</SelectItem>
                  <SelectItem value="LAYANAN">Layanan & Advokasi</SelectItem>
                  <SelectItem value="LAINNYA">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pertanyaan *</Label>
              <Input value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} required placeholder="Contoh: Bagaimana cara mendaftar menjadi anggota LAPRA 08?" />
            </div>
            <div className="space-y-2">
              <Label>Jawaban *</Label>
              <Textarea value={form.a} onChange={(e) => setForm({ ...form, a: e.target.value })} required rows={6}
                placeholder="Tulis jawaban lengkap dan informatif. Mendukung multiline (tekan Enter untuk baris baru)." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setEditDialog(null); setForm({ id: '', category: 'KEANGGOTAAN', q: '', a: '' }) }}>Batal</Button>
              <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving ? 'Menyimpan...' : editDialog?.isNew ? 'Tambah FAQ' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* === Dialog Konfirmasi Hapus FAQ === */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus pertanyaan berikut?
              <br /><br />
              <strong>"{deleteConfirm?.q}"</strong>
              <br /><br />
              <span className="text-xs text-muted-foreground">Tindakan ini tidak dapat dibatalkan.</span>
            </AlertDialogDescription>
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
// AUDIT AI RESPONDING OTOMATIS - Dialog Component
// ============================================================
function AuditAIRespondingDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const addToast = useToastStore((s) => s.addToast)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [complaints, setComplaints] = useState<any[]>([])
  const [ignoredByWilayah, setIgnoredByWilayah] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [filterPriority, setFilterPriority] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)

  const handleScan = async () => {
    setScanning(true); setScanResult(null); setComplaints([]); setIgnoredByWilayah([]); setStats(null)
    try {
      const res = await fetch('/api/audit-ai/scans', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({ platforms: ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'TWITTER_X', 'GOOGLE'] }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      setScanResult(data.data)
      addToast(data.message, 'success')
      // Load detail complaints
      loadComplaints(data.data.id)
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setScanning(false) }
  }

  const loadComplaints = async (scanId: string) => {
    setLoadingDetail(true)
    try {
      const params = filterPriority ? `?priority=${filterPriority}` : ''
      const res = await fetch(`/api/audit-ai/scans/${scanId}${params}`, { headers: { 'x-user-id': useAuthStore.getState().user?.id || '' } })
      const data = await res.json()
      if (data.success) {
        setComplaints(data.data.complaints)
        setIgnoredByWilayah(data.data.ignoredByWilayah)
        setStats(data.data.stats)
      }
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setLoadingDetail(false) }
  }

  const handleRespond = async (complaintId: string, status: string, type: string) => {
    try {
      await fetch(`/api/audit-ai/complaints/${complaintId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({ responseStatus: status, responseType: type }),
      })
      addToast(`Keluhan ditandai: ${status}`, 'success')
      if (scanResult) loadComplaints(scanResult.id)
    } catch (e: any) { addToast(e.message, 'error') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-red-600" /> Audit AI Responding Otomatis
          </DialogTitle>
          <DialogDescription>
            Deteksi instan keluhan warganet di Facebook, Instagram, TikTok, X (Twitter), dan Google. Identifikasi mana yang wajib direspon oleh DPN/DPD/DPC.
          </DialogDescription>
        </DialogHeader>

        {/* Rp0 info banner */}
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <strong>100% OTOMATIS — TANPA KONFIGURASI:</strong>
            <div className="mt-2 space-y-1">
              <div>✅ <strong>YouTube:</strong> yt-dlp otomatis search 15 video REAL yang mention "LAPRA 08" — dengan view count, channel, dan tanggal asli. GRATIS, tanpa API key.</div>
              <div>✅ <strong>Google News:</strong> RSS otomatis ambil 20 artikel REAL berita tentang LAPRA 08 dari MetroTVNews, Atjeh Watch, dll. GRATIS, tanpa API key.</div>
              <div>ℹ️ <strong>Facebook, Instagram, TikTok, X/Twitter:</strong> Platform-platform ini memblokir akses anonim sejak 2023. Untuk audit REAL posts dari medsos ini, perlu API resmi (Meta Graph API gratis untuk FB+IG, YouTube Data API v3 gratis, TikTok Research API perlu approval, X API v2 berbayar $100/bln).</div>
            </div>
            <div className="mt-2 pt-2 border-t border-emerald-200">
              <strong>Cara kerja:</strong> Klik tombol "Mulai Audit" → sistem otomatis scraping YouTube + Google News → AI analisis sentimen + prioritas + lokasi → tampilkan daftar keluhan + rekomendasi tindakan. Semua dalam &lt;3 detik.
            </div>
          </div>
        </div>

        {/* Scan button */}
        {!scanResult && !scanning && (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h3 className="font-bold text-lg mb-2">Audit AI Responding Otomatis</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Klik tombol di bawah untuk melakukan scan instan terhadap semua media sosial dan mendeteksi keluhan warganet yang wajib direspon oleh pengurus LAPRA 08.
            </p>
            <Button onClick={handleScan} size="lg" className="bg-gradient-to-r from-red-600 to-rose-700 text-white">
              <Zap className="w-5 h-5 mr-2" /> Mulai Audit Sekarang
            </Button>
          </div>
        )}

        {/* Scanning */}
        {scanning && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-red-600 mb-4" />
            <p className="text-sm font-medium">Sedang mengscan Facebook, Instagram, TikTok, X, dan Google...</p>
            <p className="text-xs text-muted-foreground mt-1">Menganalisis keluhan warganet dengan AI lokal (IndoBERT)...</p>
          </div>
        )}

        {/* Results */}
        {scanResult && !scanning && (
          <div className="space-y-4">
            {/* Summary stats */}
            {stats && (
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border p-3 text-center bg-slate-50">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-[13px] text-muted-foreground">Total Keluhan</div>
                </div>
                <div className="rounded-lg border p-3 text-center bg-red-50 border-red-200">
                  <div className="text-2xl font-bold text-red-700">{stats.high}</div>
                  <div className="text-[13px] text-red-600">Prioritas Tinggi</div>
                </div>
                <div className="rounded-lg border p-3 text-center bg-amber-50 border-amber-200">
                  <div className="text-2xl font-bold text-amber-700">{stats.medium}</div>
                  <div className="text-[13px] text-amber-600">Prioritas Sedang</div>
                </div>
                <div className="rounded-lg border p-3 text-center bg-blue-50 border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{stats.ignored}</div>
                  <div className="text-[13px] text-blue-600">Terabaikan</div>
                </div>
              </div>
            )}

            {/* Priority filter */}
            <div className="flex gap-2 items-center">
              <span className="text-sm font-semibold text-muted-foreground">Filter Prioritas:</span>
              <Button size="sm" variant={filterPriority === '' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => { setFilterPriority(''); if (scanResult) loadComplaints(scanResult.id) }}>Semua</Button>
              <Button size="sm" variant={filterPriority === 'HIGH' ? 'default' : 'outline'} className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={() => { setFilterPriority('HIGH'); if (scanResult) loadComplaints(scanResult.id) }}>Tinggi</Button>
              <Button size="sm" variant={filterPriority === 'MEDIUM' ? 'default' : 'outline'} className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={() => { setFilterPriority('MEDIUM'); if (scanResult) loadComplaints(scanResult.id) }}>Sedang</Button>
              <Button size="sm" variant={filterPriority === 'LOW' ? 'default' : 'outline'} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setFilterPriority('LOW'); if (scanResult) loadComplaints(scanResult.id) }}>Rendah</Button>
            </div>

            {/* Complaints list with priority */}
            {loadingDetail ? (
              <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto" /></div>
            ) : complaints.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="Tidak ada keluhan" description="Tidak ditemukan keluhan pada filter ini." />
            ) : (
              <div className="space-y-2">
                {complaints.map((c, i) => {
                  const priColor = c.priority === 'HIGH' ? 'border-l-red-500 bg-red-50/30' : c.priority === 'MEDIUM' ? 'border-l-amber-500 bg-amber-50/30' : 'border-l-blue-500 bg-blue-50/30'
                  const priBadge = c.priority === 'HIGH' ? 'bg-red-100 text-red-800 border-red-300' : c.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-blue-100 text-blue-800 border-blue-300'
                  const platformIcon = c.platform === 'FACEBOOK' ? '📘' : c.platform === 'INSTAGRAM' ? '📷' : c.platform === 'TIKTOK' ? '🎵' : c.platform === 'TWITTER_X' ? '🐦' : '🔍'
                  return (
                    <div key={c.id} className={`rounded-xl border-l-4 p-3 ${priColor}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge className={`text-[13px] ${priBadge}`}>{c.priority}</Badge>
                            <Badge variant="outline" className="text-[13px]">{platformIcon} {c.platform}</Badge>
                            <Badge variant="outline" className="text-[13px] bg-emerald-50 text-emerald-700 border-emerald-200">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />REAL
                            </Badge>
                            <Badge variant="outline" className={`text-[13px] ${c.sentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' : c.sentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700'}`}>
                              {c.sentiment}
                            </Badge>
                            <Badge variant="outline" className="text-[13px] bg-purple-50 text-purple-700">{c.category}</Badge>
                            {c.regencyName && <Badge variant="outline" className="text-[13px] bg-blue-50 text-blue-700"><MapPin className="w-2.5 h-2.5 mr-0.5" />{c.regencyName}</Badge>}
                            {c.provinceName && !c.regencyName && <Badge variant="outline" className="text-[13px] bg-blue-50 text-blue-700"><MapPin className="w-2.5 h-2.5 mr-0.5" />{c.provinceName}</Badge>}
                            <Badge variant="outline" className={`text-[13px] ${c.responseStatus === 'IGNORED' ? 'bg-red-50 text-red-700' : c.responseStatus === 'RESPONDED' ? 'bg-emerald-50 text-emerald-700' : c.responseStatus === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
                              {c.responseStatus === 'IGNORED' ? '⚠ TERABAIKAN' : c.responseStatus === 'RESPONDED' ? '✓ Direspon' : c.responseStatus === 'IN_PROGRESS' ? '⏳ Proses' : 'ℹ Info (No Response Needed)'}
                            </Badge>
                          </div>
                          <div className="text-sm font-semibold flex items-center gap-2">
                            <span className="text-blue-600">{c.author}</span>
                            {c.authorHandle && c.authorHandle !== '@rss' && <span className="text-xs text-muted-foreground font-normal">{c.authorHandle}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{c.content}</p>
                          {c.aiRecommendation && (
                            <div className="mt-2 p-2 rounded bg-white border text-xs">
                              <Lightbulb className="w-3 h-3 inline mr-1 text-amber-500" />
                              <strong>AI Rekomendasi:</strong> {c.aiRecommendation}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[13px] text-muted-foreground">
                            <span>📅 {formatDateTimeID(c.publishedAt)}</span>
                            <span>💬 {c.engagementCount} engagement</span>
                            <span>⚡ Urgency: {c.urgencyScore}/100</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          {c.responseStatus === 'IGNORED' && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-700 border-emerald-300" onClick={() => handleRespond(c.id, 'IN_PROGRESS', 'ACKNOWLEDGMENT')}>
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Tandai Proses
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-blue-700 border-blue-300" onClick={() => handleRespond(c.id, 'RESPONDED', 'CLARIFICATION')}>
                                <Send className="w-3 h-3 mr-1" /> Sudah Respon
                              </Button>
                            </>
                          )}
                          <a href={c.url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-7 text-xs w-full"><ExternalLink className="w-3 h-3 mr-1" /> Buka Post</Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Daftar Keluhan Terabaikan per Wilayah */}
            {ignoredByWilayah.length > 0 && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4" /> Daftar Keluhan Terabaikan per Wilayah
                  </CardTitle>
                  <CardDescription>Wilayah yang pasif/lambat merespon keluhan warganet</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provinsi</TableHead>
                        <TableHead>Kab/Kota</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center text-red-600">Tinggi</TableHead>
                        <TableHead className="text-center text-amber-600">Sedang</TableHead>
                        <TableHead className="text-center text-blue-600">Rendah</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ignoredByWilayah.map((w, i) => (
                        <TableRow key={i} className={w.high > 0 ? 'bg-red-50/50' : ''}>
                          <TableCell className="text-sm font-medium">{w.provinceName}</TableCell>
                          <TableCell className="text-sm">{w.regencyName}</TableCell>
                          <TableCell className="text-center font-bold">{w.total}</TableCell>
                          <TableCell className="text-center text-red-700 font-bold">{w.high}</TableCell>
                          <TableCell className="text-center text-amber-700">{w.medium}</TableCell>
                          <TableCell className="text-center text-blue-700">{w.low}</TableCell>
                          <TableCell>
                            {w.high > 0 ? <Badge className="bg-red-100 text-red-800 text-[13px]">⚠ KRITIS - Wajib Respon</Badge> :
                             w.medium > 0 ? <Badge className="bg-amber-100 text-amber-800 text-[13px]">⚠ Perlu Perhatian</Badge> :
                             <Badge variant="outline" className="text-[13px]">Monitor</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Re-scan button */}
            <div className="flex justify-end">
              <Button onClick={handleScan} disabled={scanning} variant="outline">
                <Loader2 className={`w-4 h-4 mr-1 ${scanning ? 'animate-spin' : 'hidden'}`} /> Scan Ulang
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
