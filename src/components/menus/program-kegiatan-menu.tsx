// LAPRA 08 - Program & Kegiatan Menu (v2.1)
// Struktur drill-down DPN/DPD/DPC (restore dari commit 33131a2)
// + Upload multi-format file (PDF/Image/DOC/Video/Audio) + View/Edit/Delete
//
// 4 tab kategori: Program Kerja, Aksi Sosial & Sinergi, Kemitraan, Agenda & Kegiatan
// Setiap kategori → 3 kartu landing (DPN/DPD/DPC) → drill-down:
//   DPN → langsung list program
//   DPD → pilih provinsi → list program DPD provinsi tsb
//   DPC → pilih provinsi → pilih kab/kota → list program DPC
//
// Setiap list program: card dengan Upload, View, Edit, Delete
// File bukti pelaksanaan: PDF, JPG/PNG/WebP, DOC/DOCX, XLS/XLSX, MP4/MOV/WebM, MP3/WAV, TXT/CSV
'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api-client'
import { PageHeader, LoadingState, EmptyState } from '@/components/ui-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToastStore, useAuthStore } from '@/lib/store'
import { useIsSuperAdmin } from './portal-menus'
import { formatDateTimeID } from '@/lib/format'
import {
  Crown, Building2, MapPin, ChevronRight, Plus, Edit, Trash2,
  Upload, FileCheck, Loader2, CalendarDays, Briefcase, HandHeart, Users, CalendarClock,
  FileText, Image as ImageIcon, Video, Download, Eye, X, Search, RefreshCw,
  CheckCircle2, Clock, AlertTriangle, Globe,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================
type Level = 'DPN' | 'DPD' | 'DPC'
type Category = 'PROGRAM_KERJA' | 'AKSI_SOSIAL' | 'KEMITRAAN' | 'AGENDA'
type Status = 'DIRENCANAKAN' | 'BERJALAN' | 'SELESAI' | 'DITUNDA'

interface Territory {
  id: string
  name: string
  code: string
  level: string
  parentId: string | null
}

interface ProgramDoc {
  id: string
  title: string
  description?: string
  category?: Category
  level?: Level
  territoryCode?: string | null
  territoryName?: string | null
  territoryId?: string | null
  location?: string
  date?: string
  status: Status
  fileName?: string | null
  fileType?: string | null
  fileSize?: number
  uploadedBy?: string
  uploadedAt?: string
  updatedAt?: string
  // Legacy fields dari /api/gallery (untuk backward compat)
  fileUrl?: string | null
  pdfUrl?: string | null
}

// ============================================================
// MAIN MENU — 4 tab kategori
// ============================================================
export function ProgramKegiatanMenu() {
  const [tab, setTab] = useState<Category>('PROGRAM_KERJA')
  const tabs: { key: Category; label: string; icon: any; color: string; desc: string }[] = [
    { key: 'PROGRAM_KERJA', label: 'Program Kerja', icon: Briefcase, color: 'from-blue-500 to-indigo-600', desc: 'Program kerja strategis DPN, DPD, dan DPC' },
    { key: 'AKSI_SOSIAL', label: 'Aksi Sosial & Sinergi', icon: HandHeart, color: 'from-emerald-500 to-teal-600', desc: 'Dokumentasi aksi sosial dan kegiatan kemasyarakatan' },
    { key: 'KEMITRAAN', label: 'Kemitraan', icon: Users, color: 'from-purple-500 to-pink-600', desc: 'Kemitraan dengan ummat, organisasi, dan institusi' },
    { key: 'AGENDA', label: 'Agenda & Kegiatan', icon: CalendarClock, color: 'from-orange-500 to-red-600', desc: 'Agenda kegiatan organisasi' },
  ]
  const activeTab = tabs.find((t) => t.key === tab)!

  return (
    <div className="space-y-6">
      <PageHeader
        title="Program & Kegiatan"
        description="Program kerja, aksi sosial, kemitraan, dan agenda kegiatan — terstruktur per tingkat pengurus (DPN → DPD → DPC)"
        icon={CalendarDays}
      />

      {/* Visual marker untuk verifikasi versi UI */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
          v2.1 — Drill-down DPN/DPD/DPC
        </Badge>
        <span className="text-muted-foreground">
          Pilih tab kategori → klik kartu DPN/DPD/DPC → upload / lihat / edit / hapus dokumen
        </span>
      </div>

      {/* Tab navigasi utama */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? `bg-gradient-to-r ${t.color} text-white shadow-sm`
                : 'border hover:bg-accent'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Konten tab aktif → drill-down DPN/DPD/DPC */}
      <ProgramContentManager
        title={activeTab.label}
        description={activeTab.desc}
        icon={activeTab.icon}
        category={tab}
        accentColor={activeTab.color}
      />
    </div>
  )
}

// ============================================================
// PROGRAM CONTENT MANAGER — drill-down DPN/DPD/DPC (restore dari commit 33131a2)
// ============================================================
export function ProgramContentManager({ title, description, icon: Icon, category, accentColor }: {
  title: string; description: string; icon: any; category: string; accentColor: string
}) {
  const [view, setView] = useState<'home' | 'dpn' | 'dpd-list' | 'dpd-detail' | 'dpc-list' | 'dpc-detail'>('home')
  const [territories, setTerritories] = useState<Territory[]>([])
  const [regencies, setRegencies] = useState<Territory[]>([])
  const [selectedProv, setSelectedProv] = useState<Territory | null>(null)
  const [selectedRegency, setSelectedRegency] = useState<Territory | null>(null)
  const [items, setItems] = useState<ProgramDoc[]>([])
  const [loading, setLoading] = useState(true)

  // Load territories + program documents
  useEffect(() => {
    Promise.all([
      api('/api/territory').catch(() => [] as any[]),
      api('/api/program-documents').catch(() => [] as any[]),
      api('/api/gallery').catch(() => [] as any[]), // legacy fallback
    ]).then(([allTerr, allDocs, allGallery]) => {
      setTerritories((allTerr as any[]).filter(t => t.level === 'PROVINCE'))
      setRegencies((allTerr as any[]).filter(t => t.level === 'REGENCY'))
      // Gabungkan: dokumen baru dari /api/program-documents + lama dari /api/gallery
      const newDocs = (allDocs as any[]).filter(d => d.category === category)
      const legacyDocs = (allGallery as any[]).filter(a => a.category === category)
      setItems([...newDocs, ...legacyDocs])
    }).finally(() => setLoading(false))
  }, [category])

  // Helper filter
  const isFiltered = (i: any, code: string, level: string) =>
    i.territoryCode === code || (i.level === level && i.territoryCode === code)

  const dpnItems = items.filter(i => !i.territoryCode || i.territoryCode === 'ID' || i.level === 'DPN')
  const dpdCount = items.filter(i => i.level === 'DPD' || (i.territoryCode && i.territoryCode.length === 2 && i.territoryCode !== 'ID')).length
  const dpcCount = items.filter(i => i.level === 'DPC' || (i.territoryCode && i.territoryCode.length >= 4)).length

  // === HOME: 3 Kartu DPN/DPD/DPC ===
  if (view === 'home') {
    const cards = [
      { key: 'dpn' as const, title: 'DPN', subtitle: 'Pusat Nasional', desc: `${title} tingkat DPN`, count: dpnItems.length, icon: Crown, grad: 'from-red-500 to-orange-600' },
      { key: 'dpd' as const, title: 'DPD', subtitle: 'Provinsi', desc: `${title} DPD se-Indonesia + LN`, count: dpdCount, icon: Building2, grad: 'from-blue-500 to-cyan-600' },
      { key: 'dpc' as const, title: 'DPC', subtitle: 'Kabupaten/Kota', desc: `${title} DPC per DPD`, count: dpcCount, icon: MapPin, grad: 'from-emerald-500 to-teal-600' },
    ]
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
          <strong>Hierarki:</strong> DPN (Pusat Nasional) → DPD (Provinsi) → DPC (Kabupaten/Kota).
          Pilih tingkat untuk melihat {title.toLowerCase()} masing-masing wilayah.
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
                  <Badge variant="outline" className="text-[13px]">{c.count} dokumen</Badge>
                  <span className="text-xs font-medium text-blue-600">Buka <ChevronRight className="w-4 h-4 inline" /></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // === DPN VIEW ===
  if (view === 'dpn') {
    return (
      <ProgramLevelView
        title={`${title} — DPN (Pusat Nasional)`}
        description={description}
        icon={Icon}
        accentColor={accentColor}
        items={dpnItems}
        loading={loading}
        category={category}
        level="DPN"
        territoryCode="ID"
        territoryName="DPN (Pusat Nasional)"
        onBack={() => setView('home')}
        setItems={setItems}
      />
    )
  }

  // === DPD LIST VIEW ===
  if (view === 'dpd-list') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('home')}>
          <ChevronRight className="w-4 h-4 rotate-180" /> Kembali
        </Button>
        <h3 className="text-base font-bold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" /> Pilih DPD (Provinsi)
        </h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {territories.map(prov => {
            const count = items.filter(i => isFiltered(i, prov.code, 'DPD')).length
            return (
              <button key={prov.code} onClick={() => { setSelectedProv(prov); setView('dpd-detail') }}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-all text-left">
                <span className="text-sm font-medium">{prov.name}</span>
                <Badge variant="outline" className="text-[13px]">{count > 0 ? `${count} dok` : 'Kosong'}</Badge>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // === DPD DETAIL VIEW ===
  if (view === 'dpd-detail' && selectedProv) {
    const dpdItems = items.filter(i => isFiltered(i, selectedProv.code, 'DPD'))
    return (
      <ProgramLevelView
        title={`${title} — DPD ${selectedProv.name}`}
        description={description}
        icon={Icon}
        accentColor={accentColor}
        items={dpdItems}
        loading={loading}
        category={category}
        level="DPD"
        territoryCode={selectedProv.code}
        territoryName={`DPD ${selectedProv.name}`}
        onBack={() => { setSelectedProv(null); setView('dpd-list') }}
        setItems={setItems}
      />
    )
  }

  // === DPC LIST VIEW (pilih provinsi dulu) ===
  if (view === 'dpc-list') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('home')}>
          <ChevronRight className="w-4 h-4 rotate-180" /> Kembali
        </Button>
        <h3 className="text-base font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-600" /> Pilih DPD (Provinsi) untuk lihat DPC
        </h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {territories.map(prov => {
            const regCount = regencies.filter(r => r.parentId === prov.id).length
            return (
              <button key={prov.code} onClick={() => { setSelectedProv(prov); setView('dpc-detail'); setSelectedRegency(null) }}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-all text-left">
                <span className="text-sm font-medium">{prov.name}</span>
                <Badge variant="outline" className="text-[13px]">{regCount > 0 ? `${regCount} DPC` : 'Kosong'}</Badge>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // === DPC DETAIL VIEW (list kab/kota di provinsi terpilih) ===
  if (view === 'dpc-detail' && selectedProv) {
    const provRegencies = regencies.filter(r => r.parentId === selectedProv.id)
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedProv(null); setView('dpc-list') }}>
          <ChevronRight className="w-4 h-4 rotate-180" /> Kembali ke daftar provinsi
        </Button>
        <h3 className="text-base font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-600" /> DPC di {selectedProv.name}
        </h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {provRegencies.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full">Belum ada DPC terdaftar di provinsi ini.</p>
          ) : provRegencies.map(reg => {
            const count = items.filter(i => isFiltered(i, reg.code, 'DPC')).length
            return (
              <button key={reg.code} onClick={() => setSelectedRegency(reg)}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-all text-left">
                <span className="text-sm font-medium">{reg.name}</span>
                <Badge variant="outline" className="text-[13px]">{count > 0 ? `${count} dok` : 'Kosong'}</Badge>
              </button>
            )
          })}
        </div>
        {selectedRegency && (() => {
          const dpcItems = items.filter(i => isFiltered(i, selectedRegency.code, 'DPC'))
          return (
            <ProgramLevelView
              title={`${title} — DPC ${selectedRegency.name}`}
              description={description}
              icon={Icon}
              accentColor={accentColor}
              items={dpcItems}
              loading={loading}
              category={category}
              level="DPC"
              territoryCode={selectedRegency.code}
              territoryName={`DPC ${selectedRegency.name}`}
              onBack={() => setSelectedRegency(null)}
              setItems={setItems}
            />
          )
        })()}
      </div>
    )
  }

  return null
}

// ============================================================
// PROGRAM LEVEL VIEW — List dokumen per level + Upload/View/Edit/Delete
// ============================================================
function ProgramLevelView({
  title, description, icon: Icon, accentColor, items, loading, category, level, territoryCode, territoryName, onBack, setItems,
}: {
  title: string
  description: string
  icon: any
  accentColor: string
  items: ProgramDoc[]
  loading: boolean
  category: string
  level: Level
  territoryCode: string
  territoryName: string
  onBack: () => void
  setItems: React.Dispatch<React.SetStateAction<ProgramDoc[]>>
}) {
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = useIsSuperAdmin()
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<ProgramDoc | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<ProgramDoc | null>(null)
  const [viewingDoc, setViewingDoc] = useState<ProgramDoc | null>(null)

  // === Helper: format ukuran file ===
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  // === Helper: ikon file ===
  const getFileIcon = (fileType?: string | null) => {
    if (!fileType) return FileText
    const t = fileType.toUpperCase()
    if (['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'].includes(t)) return ImageIcon
    if (['MP4', 'MOV', 'WEBM'].includes(t)) return Video
    if (['PDF'].includes(t)) return FileText
    if (['DOC', 'DOCX', 'TXT'].includes(t)) return FileText
    if (['XLS', 'XLSX', 'CSV'].includes(t)) return FileCheck
    return FileText
  }

  // === Handler: reload list ===
  const reload = () => {
    Promise.all([
      api('/api/program-documents').catch(() => []),
      api('/api/gallery').catch(() => []),
    ]).then(([allDocs, allGallery]: any[]) => {
      const newDocs = (allDocs || []).filter((d: any) => d.category === category)
      const legacy = (allGallery || []).filter((a: any) => a.category === category)
      setItems([...newDocs, ...legacy])
    })
  }

  // === Handler: View bukti (inline di browser) ===
  const handleView = async (doc: ProgramDoc) => {
    setViewingDoc(doc)
    try {
      // Untuk dokumen baru: pakai /api/program-documents/[id]/view
      // Untuk dokumen legacy (fileUrl langsung): buka fileUrl
      let blobUrl: string
      if (doc.id.startsWith('progdoc_')) {
        const res = await fetch(`/api/program-documents/${doc.id}/view`, {
          headers: { 'x-user-id': user?.id || '' },
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => null)
          throw new Error(errData?.error || `HTTP ${res.status}`)
        }
        const blob = await res.blob()
        blobUrl = URL.createObjectURL(blob)
      } else if (doc.fileUrl) {
        // Legacy: fileUrl mungkin data URL atau public URL
        if (doc.fileUrl.startsWith('data:')) {
          const res = await fetch(doc.fileUrl)
          const blob = await res.blob()
          blobUrl = URL.createObjectURL(blob)
        } else {
          window.open(doc.fileUrl, '_blank')
          return
        }
      } else if (doc.pdfUrl) {
        // Legacy: PDF program kerja
        if (doc.pdfUrl.startsWith('data:')) {
          const res = await fetch(doc.pdfUrl)
          const blob = await res.blob()
          blobUrl = URL.createObjectURL(blob)
        } else {
          window.open(doc.pdfUrl, '_blank')
          return
        }
      } else {
        addToast('Dokumen tidak punya file', 'error')
        return
      }
      window.open(blobUrl, '_blank')
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
    } catch (e: any) {
      addToast(`Gagal membuka file: ${e.message}`, 'error')
    } finally {
      setViewingDoc(null)
    }
  }

  // === Handler: Download file ===
  const handleDownload = async (doc: ProgramDoc) => {
    try {
      let blob: Blob
      if (doc.id.startsWith('progdoc_')) {
        const res = await fetch(`/api/program-documents/${doc.id}/view`, {
          headers: { 'x-user-id': user?.id || '' },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        blob = await res.blob()
      } else if (doc.fileUrl?.startsWith('data:')) {
        const res = await fetch(doc.fileUrl)
        blob = await res.blob()
      } else if (doc.pdfUrl?.startsWith('data:')) {
        const res = await fetch(doc.pdfUrl)
        blob = await res.blob()
      } else if (doc.fileUrl || doc.pdfUrl) {
        // External URL
        const a = window.document.createElement('a')
        a.href = (doc.fileUrl || doc.pdfUrl) as string
        a.download = doc.fileName || doc.title
        a.target = '_blank'
        window.document.body.appendChild(a)
        a.click()
        window.document.body.removeChild(a)
        return
      } else {
        addToast('Tidak ada file untuk diunduh', 'error')
        return
      }
      const blobUrl = URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = blobUrl
      a.download = doc.fileName || `${doc.title}.bin`
      window.document.body.appendChild(a)
      a.click()
      window.document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)
      addToast(`File "${doc.fileName || doc.title}" didownload`, 'success')
    } catch (e: any) {
      addToast(`Gagal download: ${e.message}`, 'error')
    }
  }

  if (loading) return <LoadingState message={`Memuat dokumen ${level}...`} />

  const filtered = items.filter((i) =>
    !search ||
    i.title?.toLowerCase().includes(search.toLowerCase()) ||
    i.description?.toLowerCase().includes(search.toLowerCase()) ||
    i.location?.toLowerCase().includes(search.toLowerCase())
  )

  // Stats ringkas
  const stats = {
    total: filtered.length,
    selesai: filtered.filter(d => d.status === 'SELESAI').length,
    berjalan: filtered.filter(d => d.status === 'BERJALAN').length,
    direncanakan: filtered.filter(d => d.status === 'DIRENCANAKAN').length,
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ChevronRight className="w-4 h-4 rotate-180" /> Kembali
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-base font-bold flex items-center gap-2">
          <Icon className={`w-5 h-5 bg-gradient-to-br ${accentColor} bg-clip-text`} />
          {title}
          <Badge variant="outline" className="text-[13px]">{filtered.length} dokumen</Badge>
        </h3>
        <Button
          size="sm"
          onClick={() => setUploadOpen(true)}
          className={`gap-1 bg-gradient-to-r ${accentColor} text-white hover:opacity-90`}
        >
          <Upload className="w-4 h-4" /> Upload Dokumen {level}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari judul / deskripsi / lokasi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats ringkas */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <Card className="p-2"><div className="text-muted-foreground">Total</div><div className="text-lg font-bold">{stats.total}</div></Card>
        <Card className="p-2"><div className="text-muted-foreground">Selesai</div><div className="text-lg font-bold text-green-600">{stats.selesai}</div></Card>
        <Card className="p-2"><div className="text-muted-foreground">Berjalan</div><div className="text-lg font-bold text-blue-600">{stats.berjalan}</div></Card>
        <Card className="p-2"><div className="text-muted-foreground">Direncanakan</div><div className="text-lg font-bold text-orange-600">{stats.direncanakan}</div></Card>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={`Belum ada dokumen ${level}`}
          description={`Upload dokumen bukti pelaksanaan ${level} ${territoryName}. Mendukung PDF, gambar, dokumen, video, dan audio.`}
          action={
            <Button onClick={() => setUploadOpen(true)} className={`gap-1 bg-gradient-to-r ${accentColor}`}>
              <Upload className="w-4 h-4" /> Upload Sekarang
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const FileIcon = getFileIcon(doc.fileType)
            const hasFile = doc.fileName || doc.fileUrl || doc.pdfUrl
            return (
              <div key={doc.id} className="group relative rounded-lg border p-4 hover:shadow-md transition-all bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-1.5 rounded bg-orange-50 text-orange-600 shrink-0">
                      <FileIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate" title={doc.title}>{doc.title}</div>
                      {doc.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        {doc.fileName && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" /> {doc.fileName}
                            {doc.fileSize ? <span className="text-[10px]">({formatFileSize(doc.fileSize)})</span> : null}
                          </span>
                        )}
                        {doc.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {doc.location}</span>}
                        {doc.date && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {doc.date}</span>}
                        <Badge variant="outline" className="text-[11px]">{doc.status || 'DIRENCANAKAN'}</Badge>
                      </div>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-1 shrink-0">
                    {hasFile && (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600 hover:bg-green-50" onClick={() => handleView(doc)} disabled={viewingDoc?.id === doc.id} title="Lihat file">
                          {viewingDoc?.id === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-purple-600 hover:bg-purple-50" onClick={() => handleDownload(doc)} title="Download file">
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    {isSuperAdmin && (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => setEditDoc(doc)} title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:bg-red-50" onClick={() => setDeleteDoc(doc)} title="Hapus">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload Dialog */}
      {uploadOpen && (
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          category={category as Category}
          level={level}
          territoryCode={territoryCode}
          territoryName={territoryName}
          onSuccess={() => { setUploadOpen(false); reload() }}
        />
      )}

      {/* Edit Dialog */}
      {editDoc && (
        <EditDialog
          doc={editDoc}
          open={!!editDoc}
          onOpenChange={(o) => !o && setEditDoc(null)}
          onSuccess={() => { setEditDoc(null); reload() }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteDoc && (
        <AlertDialog open={!!deleteDoc} onOpenChange={(o) => !o && setDeleteDoc(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus dokumen ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Anda akan menghapus <strong>{deleteDoc.title}</strong> ({level}).
                {deleteDoc.fileName && (
                  <> File <strong>{deleteDoc.fileName}</strong> juga akan dihapus permanen.</>
                )}
                {' '}Aksi ini tidak bisa dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    // Coba hapus via /api/program-documents (untuk dokumen baru)
                    if (deleteDoc.id.startsWith('progdoc_')) {
                      await api(`/api/program-documents/${deleteDoc.id}`, { method: 'DELETE' })
                    } else {
                      // Legacy: hapus via /api/gallery
                      await api(`/api/gallery?id=${deleteDoc.id}`, { method: 'DELETE' })
                    }
                    addToast('Dokumen berhasil dihapus', 'success')
                    setDeleteDoc(null)
                    reload()
                  } catch (e: any) {
                    addToast(`Gagal hapus: ${e.message}`, 'error')
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Hapus Permanen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

// ============================================================
// UPLOAD DIALOG — upload file + metadata
// ============================================================
function UploadDialog({
  open,
  onOpenChange,
  category,
  level,
  territoryCode,
  territoryName,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  category: Category
  level: Level
  territoryCode: string
  territoryName: string
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    status: 'DIRENCANAKAN' as Status,
  })
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setForm({ title: '', description: '', location: '', date: '', status: 'DIRENCANAKAN' })
      setFile(null)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      addToast('Judul wajib diisi', 'error')
      return
    }
    if (!file) {
      addToast('File wajib diupload', 'error')
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', form.title)
      formData.append('description', form.description)
      formData.append('location', form.location)
      formData.append('date', form.date)
      formData.append('status', form.status)
      formData.append('category', category)
      formData.append('level', level)
      formData.append('territoryCode', territoryCode)
      formData.append('territoryName', territoryName)

      const res = await fetch('/api/program-documents', {
        method: 'POST',
        headers: { 'x-user-id': user?.id || '' },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      addToast(data.message || 'Dokumen berhasil diupload', 'success')
      onSuccess()
    } catch (e: any) {
      addToast(`Gagal upload: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const acceptedExtensions = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.mov,.webm,.mp3,.wav,.txt,.csv'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Dokumen {level} — {territoryName}</DialogTitle>
          <DialogDescription>
            Upload file bukti pelaksanaan. Mendukung PDF, gambar (JPG/PNG/WebP), dokumen (DOC/XLS/PPT), video (MP4/MOV/WebM), audio (MP3/WAV), teks (TXT/CSV). Maksimal 4MB.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {/* Pilih file */}
          <div className="space-y-1.5">
            <Label>File Bukti *</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    className="h-7 w-7 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <div className="text-sm font-medium">Klik untuk pilih file</div>
                  <div className="text-xs text-muted-foreground">atau drag & drop</div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedExtensions}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setFile(f)
              }}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">
              Ekstensi: PDF, JPG, PNG, WebP, GIF, DOC/DOCX, XLS/XLSX, PPT/PPTX, MP4, MOV, WebM, MP3, WAV, TXT, CSV
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Judul *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Contoh: Sosialisasi Asta Cita Presiden"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Deskripsi singkat program/kegiatan..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Lokasi</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Contoh: Jakarta Pusat"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as Status })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DIRENCANAKAN">Direncanakan</SelectItem>
                <SelectItem value="BERJALAN">Berjalan</SelectItem>
                <SelectItem value="SELESAI">Selesai</SelectItem>
                <SelectItem value="DITUNDA">Ditunda</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving} className={`gap-1 bg-gradient-to-r ${accentColor ?? 'from-orange-500 to-red-600'} text-white`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Dokumen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// EDIT DIALOG — edit metadata + opsi replace file
// ============================================================
function EditDialog({
  doc,
  open,
  onOpenChange,
  onSuccess,
}: {
  doc: ProgramDoc
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  const [form, setForm] = useState({
    title: doc.title,
    description: doc.description || '',
    location: doc.location || '',
    date: doc.date || '',
    status: doc.status,
  })
  const [replaceFile, setReplaceFile] = useState(false)
  const [newFile, setNewFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      addToast('Judul wajib diisi', 'error')
      return
    }
    if (replaceFile && !newFile) {
      addToast('Pilih file baru atau uncheck "Ganti file"', 'error')
      return
    }

    setSaving(true)
    try {
      if (doc.id.startsWith('progdoc_')) {
        // Dokumen baru via /api/program-documents/[id]
        if (replaceFile && newFile) {
          const formData = new FormData()
          formData.append('file', newFile)
          formData.append('title', form.title)
          formData.append('description', form.description)
          formData.append('location', form.location)
          formData.append('date', form.date)
          formData.append('status', form.status)

          const res = await fetch(`/api/program-documents/${doc.id}`, {
            method: 'PUT',
            headers: { 'x-user-id': user?.id || '' },
            body: formData,
          })
          const data = await res.json()
          if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
          addToast('File & metadata berhasil diperbarui', 'success')
        } else {
          await api(`/api/program-documents/${doc.id}`, {
            method: 'PUT',
            body: JSON.stringify(form),
          })
          addToast('Metadata berhasil diperbarui', 'success')
        }
      } else {
        // Legacy: update via /api/gallery
        await api('/api/gallery', {
          method: 'PUT',
          body: JSON.stringify({
            id: doc.id,
            title: form.title,
            description: form.description,
            location: form.location,
            date: form.date,
            status: form.status,
            category: doc.category,
            level: doc.level,
            territoryCode: doc.territoryCode,
            territoryName: doc.territoryName,
          }),
        })
        addToast('Dokumen (legacy) berhasil diperbarui', 'success')
      }
      onSuccess()
    } catch (e: any) {
      addToast(`Gagal update: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Dokumen — {doc.title}</DialogTitle>
          <DialogDescription>
            Level: {doc.level || '-'} • Wilayah: {doc.territoryName || '-'}
            {doc.fileName && (
              <> • File saat ini: <strong>{doc.fileName}</strong></>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {/* Opsi replace file (hanya untuk dokumen baru) */}
          {doc.id.startsWith('progdoc_') && doc.fileName && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceFile}
                  onChange={(e) => { setReplaceFile(e.target.checked); setNewFile(null) }}
                  className="rounded"
                />
                <span className="text-sm font-medium">Ganti file bukti</span>
              </label>
              {replaceFile && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-accent"
                >
                  {newFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-orange-600" />
                      <span>{newFile.name}</span>
                      <span className="text-muted-foreground">({(newFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setNewFile(null) }}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Klik untuk pilih file baru
                    </div>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.mov,.webm,.mp3,.wav,.txt,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setNewFile(f)
                }}
                className="hidden"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Judul *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Lokasi</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as Status })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DIRENCANAKAN">Direncanakan</SelectItem>
                <SelectItem value="BERJALAN">Berjalan</SelectItem>
                <SelectItem value="SELESAI">Selesai</SelectItem>
                <SelectItem value="DITUNDA">Ditunda</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
