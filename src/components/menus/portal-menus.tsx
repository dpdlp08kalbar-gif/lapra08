'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { PageHeader, StatCard, LoadingState, ErrorState, EmptyState } from '@/components/ui-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNavStore } from '@/lib/store'
import { formatIDR } from '@/lib/format'
import {
  Home, Users, MapPin, CalendarDays, TrendingUp, Wallet, ChevronRight,
  ShieldCheck, KeyRound, FileText, Newspaper, Image, Megaphone,
  Building2, BookOpen, Scale, Briefcase, HandHeart, CalendarClock,
  PhoneCall, MessageSquare, HelpCircle, Map, Mail,
} from 'lucide-react'

export function BerandaMenu() {
  const setActiveMenu = useNavStore((s) => s.setActiveMenu)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    api('/api/stats').then(setStats).catch(() => {})
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
          <h1 className="text-3xl font-black tracking-tight mb-2">
            Sistem Informasi Internal
          </h1>
          <p className="text-lg opacity-90 mb-4">
            Perkumpulan Laskar Prabowo 08 — Membangun Indonesia Emas 2045
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:from-yellow-600 hover:to-amber-600 border-0"
              onClick={() => setActiveMenu('layanan')}
            >
              <KeyRound className="w-5 h-5 mr-2" /> Pendaftaran KTA
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 text-white border-white/30 hover:bg-white/20"
              onClick={() => setActiveMenu('profil')}
            >
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
          <StatCard label="Saldo Kas" value={formatIDR(stats.finance.balance)} icon={Wallet} color={stats.finance.balance >= 0 ? 'emerald' : 'red'} />
        </div>
      )}

      {/* Quick Access */}
      <div className="grid gap-3 md:grid-cols-3">
        <QuickAccessCard icon={Building2} title="Struktur Pengurus" desc="DPN → DPD → DPC" color="purple" onClick={() => setActiveMenu('profil')} />
        <QuickAccessCard icon={CalendarDays} title="Agenda Kegiatan" desc="Kalender & Event" color="blue" onClick={() => setActiveMenu('program')} />
        <QuickAccessCard icon={Newspaper} title="Kabar & Berita" desc="Update terbaru" color="emerald" onClick={() => setActiveMenu('pusat-media')} />
        <QuickAccessCard icon={ShieldCheck} title="Layanan Advokasi" desc="Pengaduan & Bantuan" color="orange" onClick={() => setActiveMenu('layanan')} />
        <QuickAccessCard icon={KeyRound} title="Cek KTA Digital" desc="Verifikasi keanggotaan" color="amber" onClick={() => setActiveMenu('layanan')} />
        <QuickAccessCard icon={Map} title="Sekretariat" desc="Lokasi & Kontak" color="blue" onClick={() => setActiveMenu('kontak')} />
      </div>

      {/* Running News / Pengumuman */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="w-4 h-4 text-orange-600" />
            Pengumuman Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
            <div className="font-semibold text-sm">Sistem Informasi LAPRA 08 Telah Aktif</div>
            <p className="text-xs text-muted-foreground mt-1">
              DPN membawahi 39 DPD (38 Provinsi + IKN) + 5 DPD Luar Negeri, dengan total 514 DPC terhubung.
              Hierarki: DPN → DPD (Provinsi) → DPC (Kabupaten/Kota).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function QuickAccessCard({ icon: Icon, title, desc, color, onClick }: any) {
  const colors: Record<string, string> = {
    purple: 'from-purple-500 to-purple-700',
    blue: 'from-blue-500 to-blue-700',
    emerald: 'from-emerald-500 to-emerald-700',
    orange: 'from-orange-500 to-red-600',
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
// PROFIL MENU
// ============================================================
export function ProfilMenu() {
  const setActiveMenu = useNavStore((s) => s.setActiveMenu)
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

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-sm'
                : 'border hover:bg-accent'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tentang' && (
        <Card>
          <CardHeader><CardTitle>Tentang Laskar Prabowo 08</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Laskar Prabowo 08 (LAPRA 08) adalah komunitas relawan resmi Prabowo Subianto yang bergerak dalam pengawasan program, kaderisasi, dan aksi sosial nasional.</p>
            <p>Organisasi ini dilantik oleh Ketua Dewan Pembina, Dr. (HC) Hashim S. Djojohadikusumo, pada 21 Maret 2025 di Auditorium RRI Jakarta untuk masa bakti 2024-2029.</p>
            <p>LAPRA 08 memiliki struktur hierarki: DPN (Pusat Nasional) → DPD (Provinsi) → DPC (Kabupaten/Kota), dengan 39 DPD domestik (38 provinsi + IKN), 5 DPD luar negeri, dan 514 DPC terhubung.</p>
          </CardContent>
        </Card>
      )}

      {tab === 'visi-misi' && (
        <Card>
          <CardHeader><CardTitle>Visi & Misi</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="font-semibold text-orange-600 mb-1">Visi</div>
              <p>Menjadi relawan terdepan dalam mendukung visi kebangsaan Prabowo Subianto menuju Indonesia Emas 2045.</p>
            </div>
            <div>
              <div className="font-semibold text-orange-600 mb-1">Misi</div>
              <ul className="space-y-1 list-disc ml-4">
                <li>Mengawal program-program pemerintah Prabowo-Gibran</li>
                <li>Kaderisasi dan pembinaan relawan di seluruh Indonesia</li>
                <li>Aksi sosial dan pengabdian masyarakat</li>
                <li>Penguatan harmoni dan persatuan bangsa</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'struktur' && (
        <div>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-4 text-sm">
            <Building2 className="w-4 h-4 inline mr-1 text-blue-600" />
            Struktur Pengurus & Pusat Data Organisasi — terintegrasi dengan hierarki DPN → DPD → DPC, CRUD, Approval Admin, & Arsip SK dengan OCR.
          </div>
          <PusatDataInline />
        </div>
      )}

      {tab === 'ad-art' && (
        <Card>
          <CardHeader><CardTitle>Anggaran Dasar / Anggaran Rumah Tangga (AD/ART)</CardTitle></CardHeader>
          <CardContent>
            <EmptyState icon={FileText} title="Dokumen AD/ART" description="Dokumen AD/ART LAPRA 08 akan diupload di sini." />
          </CardContent>
        </Card>
      )}

      {tab === 'legalitas' && (
        <Card>
          <CardHeader><CardTitle>Landasan Hukum & Legalitas Organisasi</CardTitle></CardHeader>
          <CardContent>
            <EmptyState icon={Scale} title="Dokumen Legalitas" description="SK Kepengurusan, Nota Kesepahatan, dan dokumen legal lainnya akan diarsipkan di sini." />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Reuse PusatDataMenu inside Profil
import { PusatDataMenu } from '@/components/menus/pusat-data-menu'
function PusatDataInline() {
  return <PusatDataMenu />
}

// ============================================================
// PUSAT MEDIA MENU
// ============================================================
export function PusatMediaMenu() {
  const [tab, setTab] = useState('berita')
  const tabs = [
    { key: 'berita', label: 'Kabar Utama', icon: Newspaper },
    { key: 'galeri', label: 'Galeri Media', icon: Image },
    { key: 'rilis-pers', label: 'Media Siaran LAPRA 08', icon: Megaphone },
    { key: 'majalah', label: 'Majalah / Buletin Digital', icon: BookOpen },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Pusat Media" description="Kabar, berita, galeri, dan publikasi LAPRA 08" icon={Newspaper} />
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-sm' : 'border hover:bg-accent'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      <Card><CardContent className="py-12">
        <EmptyState icon={tabs.find(t => t.key === tab)?.icon || Newspaper}
          title={`Modul ${tabs.find(t => t.key === tab)?.label}`} description="Konten modul ini siap diisi. Terintegrasi dengan sistem manajemen konten LAPRA 08." />
      </CardContent></Card>
    </div>
  )
}

// ============================================================
// PROGRAM & KEGIATAN MENU
// ============================================================
export function ProgramKegiatanMenu() {
  const [tab, setTab] = useState('program')
  const tabs = [
    { key: 'program', label: 'Program Kerja Nasional & Daerah', icon: Briefcase },
    { key: 'aksi', label: 'Aksi Sosialisasi & Sinergi', icon: HandHeart },
    { key: 'kemitraan', label: 'Kemitraan & Kolaborasi', icon: Users },
    { key: 'agenda', label: 'Agenda / Kalender Kegiatan', icon: CalendarClock },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Program & Kegiatan" description="Program kerja, aksi sosial, kemitraan, dan agenda" icon={CalendarDays} />
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-sm' : 'border hover:bg-accent'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'agenda' ? (
        <EventsInline />
      ) : (
        <Card><CardContent className="py-12">
          <EmptyState icon={tabs.find(t => t.key === tab)?.icon || Briefcase}
            title={`Modul ${tabs.find(t => t.key === tab)?.label}`} description="Konten modul ini siap diisi." />
        </CardContent></Card>
      )}
    </div>
  )
}

import { EventsMenu } from '@/components/menus/events-menu'
function EventsInline() {
  return <EventsMenu />
}

// ============================================================
// LAYANAN & ADVOKASI MENU
// ============================================================
export function LayananAdvokasiMenu() {
  const [tab, setTab] = useState('kta')
  const tabs = [
    { key: 'kta', label: 'Layanan KTA & Cek Keanggotaan', icon: KeyRound },
    { key: 'pengaduan', label: 'Pusat Pengaduan & Aspirasi', icon: MessageSquare },
    { key: 'hukum', label: 'Bantuan Hukum / Advokasi', icon: Scale },
    { key: 'bantuan', label: 'Pusat Bantuan & Verifikasi OCR', icon: HelpCircle },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Layanan & Advokasi" description="Layanan KTA, pengaduan, advokasi hukum, dan pusat bantuan" icon={ShieldCheck} />
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-sm' : 'border hover:bg-accent'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'bantuan' ? (
        <HelpInline />
      ) : (
        <Card><CardContent className="py-12">
          <EmptyState icon={tabs.find(t => t.key === tab)?.icon || ShieldCheck}
            title={`Modul ${tabs.find(t => t.key === tab)?.label}`} description="Modul ini siap diintegrasikan dengan sistem LAPRA 08." />
        </CardContent></Card>
      )}
    </div>
  )
}

import { HelpMenu } from '@/components/menus/help-menu'
function HelpInline() {
  return <HelpMenu />
}

// ============================================================
// KONTAK & SEKRETARIAT MENU
// ============================================================
export function KontakSekretariatMenu() {
  const [tab, setTab] = useState('lokasi')
  const tabs = [
    { key: 'lokasi', label: 'Lokasi Sekretariat', icon: Map },
    { key: 'hubungi', label: 'Hubungi Kami', icon: Mail },
    { key: 'faq', label: 'Pertanyaan Umum (FAQ)', icon: HelpCircle },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Kontak & Sekretariat" description="Lokasi sekretariat, form kontak, dan FAQ" icon={Map} />
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-sm' : 'border hover:bg-accent'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      <Card><CardContent className="py-12">
        <EmptyState icon={tabs.find(t => t.key === tab)?.icon || Map}
          title={`Modul ${tabs.find(t => t.key === tab)?.label}`} description="Modul ini siap diisi dengan peta interaktif dan informasi kontak." />
      </CardContent></Card>
    </div>
  )
}
