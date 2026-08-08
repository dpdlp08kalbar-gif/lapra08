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
// 1. BERANDA
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
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 via-red-600 to-orange-700 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 opacity-10">
          <ShieldCheck className="w-48 h-48 -mr-8 -mt-8" />
        </div>
        <div className="relative z-10">
          <Badge className="bg-white/20 text-white border-0 mb-3">Portal Resmi LAPRA 08</Badge>
          <h1 className="text-3xl font-black tracking-tight mb-2">Sistem Informasi Internal</h1>
          <p className="text-lg opacity-90 mb-4">Perkumpulan Laskar Prabowo 08 — Membangun Indonesia Emas 2045</p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:from-yellow-600 hover:to-amber-600 border-0"
              onClick={() => setActiveMenu('layanan')}>
              <KeyRound className="w-5 h-5 mr-2" /> Pendaftaran KTA
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20"
              onClick={() => setActiveMenu('profil')}>
              Struktur Pengurus <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Statistik Singkat */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Anggota" value={stats.members.total} icon={Users} color="orange" />
          <StatCard label="DPD (Provinsi)" value={stats.global.totalProvinces} icon={MapPin} color="blue" />
          <StatCard label="DPC (Kab/Kota)" value={stats.global.totalRegencies} icon={Building2} color="emerald" />
          <StatCard label="Saldo Kas" value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.finance.balance)} icon={Wallet} color={stats.finance.balance >= 0 ? 'emerald' : 'red'} />
        </div>
      )}

      {/* Pengumuman Terbaru */}
      {announcements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="w-4 h-4 text-orange-600" /> Pengumuman Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {announcements.slice(0, 3).map((a) => (
              <div key={a.id} className="rounded-lg bg-orange-50 border border-orange-200 p-3">
                <div className="flex items-center gap-2">
                  {a.isPinned && <Pin className="w-3 h-3 text-orange-600" />}
                  <div className="font-semibold text-sm">{a.title}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                <div className="text-[10px] text-muted-foreground mt-1">{formatDateTimeID(a.createdAt)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Access */}
      <div className="grid gap-3 md:grid-cols-3">
        <QuickAccessCard icon={Building2} title="Struktur Pengurus" desc="DPN → DPD → DPC" color="purple" onClick={() => setActiveMenu('profil')} />
        <QuickAccessCard icon={CalendarDays} title="Agenda Kegiatan" desc="Kalender & Event" color="blue" onClick={() => setActiveMenu('program')} />
        <QuickAccessCard icon={Newspaper} title="Kabar & Berita" desc="Update terbaru" color="emerald" onClick={() => setActiveMenu('pusat-media')} />
        <QuickAccessCard icon={ShieldCheck} title="Layanan Advokasi" desc="Pengaduan & Bantuan" color="orange" onClick={() => setActiveMenu('layanan')} />
        <QuickAccessCard icon={KeyRound} title="Cek KTA Digital" desc="Verifikasi keanggotaan" color="amber" onClick={() => setActiveMenu('layanan')} />
        <QuickAccessCard icon={MapIcon} title="Sekretariat" desc="Lokasi & Kontak" color="blue" onClick={() => setActiveMenu('kontak')} />
      </div>
    </div>
  )
}

function QuickAccessCard({ icon: Icon, title, desc, color, onClick }: any) {
  const colors: Record<string, string> = {
    purple: 'from-purple-500 to-purple-700', blue: 'from-blue-500 to-blue-700',
    emerald: 'from-emerald-500 to-emerald-700', orange: 'from-orange-500 to-red-600',
    amber: 'from-amber-500 to-yellow-600',
  }
  return (
    <button onClick={onClick} className="group rounded-lg border p-4 text-left hover:shadow-md transition-all hover:scale-[1.02]">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
      </div>
    </button>
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
