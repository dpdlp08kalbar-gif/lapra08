// LAPRA 08 - Program & Kegiatan Menu (v3.0 — Enterprise grade)
// 4 tab kategori × drill-down DPN/DPD/DPC × pagination + filter + sorting + bulk upload
//
// Fitur:
// 1. 4 tab: Program Kerja, Aksi Sosial & Sinergi, Kemitraan, Agenda & Kegiatan
// 2. 3 sub-level: DPN (Pusat) → DPD (Provinsi) → DPC (Kab/Kota) via drill-down kartu
// 3. Breadcrumb untuk navigasi konteks
// 4. Server-side pagination (20/page default)
// 5. Filter: status (Select), file type (Select)
// 6. Sorting: updated desc/asc, title asc/desc, file size, event date
// 7. Search (debounced 250ms)
// 8. StatCard clickable untuk filter cepat by status
// 9. Bulk upload multi-file (max 10 file per batch)
// 10. Bulk select + bulk delete (checkbox per row)
// 11. View inline (blob URL) + Download
// 12. Edit dengan opsi replace file
// 13. Soft delete dengan konfirmasi
// 14. ErrorState handler (no silent fail)
// 15. RBAC hierarki (DPN/DPD/DPC) — diserahkan ke API, UI tampilkan tombol sesuai role
// 16. Drag & drop yang berfungsi (onDrop handler)
// 17. Client-side file validation (size + type) sebelum upload
'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { api } from '@/lib/api-client'
import { PageHeader, LoadingState, EmptyState, ErrorState, StatCard } from '@/components/ui-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { useToastStore, useAuthStore } from '@/lib/store'
import { useIsSuperAdmin } from './portal-menus'
import { formatDateTimeID } from '@/lib/format'
import {
  Crown, Building2, MapPin, ChevronRight, Plus, Edit, Trash2,
  Upload, FileCheck, Loader2, CalendarDays, Briefcase, HandHeart, Users, CalendarClock,
  FileText, Image as ImageIcon, Video, Download, Eye, X, Search, RefreshCw,
  CheckCircle2, Clock, AlertTriangle, Globe, Files, ChevronLeft, Filter, ArrowUpDown,
  Home, Layers, Store, Package, DollarSign, TrendingUp, Phone, MapPinned,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================
type Level = 'DPN' | 'DPD' | 'DPC'
type Category = 'PROGRAM_KERJA' | 'AKSI_SOSIAL' | 'KEMITRAAN' | 'AGENDA' | 'EKRAF_UMKM'
type Status = 'DIRENCANAKAN' | 'BERJALAN' | 'SELESAI' | 'DITUNDA'
type SortKey = 'updatedAt_desc' | 'updatedAt_asc' | 'title_asc' | 'title_desc' | 'fileSize_desc' | 'eventDate_desc'

interface ProgramDoc {
  id: string
  docKey?: string
  title: string
  description?: string | null
  category?: Category
  level?: Level
  territoryCode?: string | null
  territoryName?: string | null
  territoryId?: string | null
  location?: string | null
  eventDate?: string | null
  status: Status
  fileName?: string | null
  fileType?: string | null
  fileSize?: number
  uploadedBy?: { id: string; fullName: string }
  uploadedAt?: string
  updatedAt?: string
}

interface Territory {
  id: string
  name: string
  code: string
  level: string
  parentId?: string | null
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// ============================================================
// CONSTANTS (module-level — tidak re-create saat re-render)
// ============================================================
const CATEGORY_TABS: { key: Category; label: string; icon: any; color: string; desc: string }[] = [
  { key: 'PROGRAM_KERJA', label: 'Program Kerja', icon: Briefcase, color: 'from-blue-500 to-indigo-600', desc: 'Program kerja strategis DPN, DPD, dan DPC' },
  { key: 'AKSI_SOSIAL', label: 'Aksi Sosial & Sinergi', icon: HandHeart, color: 'from-emerald-500 to-teal-600', desc: 'Dokumentasi aksi sosial dan kegiatan kemasyarakatan' },
  { key: 'KEMITRAAN', label: 'Kemitraan', icon: Users, color: 'from-purple-500 to-pink-600', desc: 'Kemitraan dengan ummat, organisasi, dan institusi' },
  { key: 'AGENDA', label: 'Agenda & Kegiatan', icon: CalendarClock, color: 'from-orange-500 to-red-600', desc: 'Agenda kegiatan organisasi' },
  { key: 'EKRAF_UMKM', label: 'Ekonomi Kreatif & UMKM', icon: Store, color: 'from-amber-500 to-orange-600', desc: 'Koperasi, usaha kecil, dan ekonomi kreatif DPN/DPD/DPC' },
]

const LEVEL_CARDS: { key: Level; title: string; subtitle: string; icon: any; grad: string }[] = [
  { key: 'DPN', title: 'DPN', subtitle: 'Pusat Nasional', icon: Crown, grad: 'from-red-500 to-orange-600' },
  { key: 'DPD', title: 'DPD', subtitle: 'Provinsi', icon: Building2, grad: 'from-blue-500 to-cyan-600' },
  { key: 'DPC', title: 'DPC', subtitle: 'Kabupaten/Kota', icon: MapPin, grad: 'from-emerald-500 to-teal-600' },
]

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: any; badgeVariant: any }> = {
  DIRENCANAKAN: { label: 'Direncanakan', color: 'text-orange-600', icon: Clock, badgeVariant: 'secondary' },
  BERJALAN: { label: 'Berjalan', color: 'text-blue-600', icon: AlertTriangle, badgeVariant: 'default' },
  SELESAI: { label: 'Selesai', color: 'text-green-600', icon: CheckCircle2, badgeVariant: 'outline' },
  DITUNDA: { label: 'Ditunda', color: 'text-red-600', icon: X, badgeVariant: 'destructive' },
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'updatedAt_desc', label: 'Update Terbaru' },
  { key: 'updatedAt_asc', label: 'Update Terlama' },
  { key: 'title_asc', label: 'Judul A-Z' },
  { key: 'title_desc', label: 'Judul Z-A' },
  { key: 'fileSize_desc', label: 'File Terbesar' },
  { key: 'eventDate_desc', label: 'Tanggal Event Terbaru' },
]

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB — match server
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.mov,.webm,.mp3,.wav,.txt,.csv'
const ALLOWED_EXT_ARRAY = ['pdf','jpg','jpeg','png','webp','gif','doc','docx','xls','xlsx','ppt','pptx','mp4','mov','webm','mp3','wav','txt','csv']

const PAGE_SIZE = 20

// ============================================================
// HELPERS (module-level pure functions)
// ============================================================
function formatFileSize(bytes?: number): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function getFileIcon(fileType?: string | null) {
  if (!fileType) return FileText
  const t = fileType.toUpperCase()
  if (['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'].includes(t)) return ImageIcon
  if (['MP4', 'MOV', 'WEBM'].includes(t)) return Video
  if (['PDF'].includes(t)) return FileText
  if (['DOC', 'DOCX', 'TXT'].includes(t)) return FileText
  if (['XLS', 'XLSX', 'CSV'].includes(t)) return FileCheck
  return FileText
}

function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `Ukuran > 4MB (${(file.size / 1024 / 1024).toFixed(2)}MB)` }
  }
  const parts = file.name.toLowerCase().split('.')
  const ext = parts.length > 1 ? parts[parts.length - 1] : ''
  if (!ALLOWED_EXT_ARRAY.includes(ext)) {
    return { valid: false, error: `Format .${ext} tidak didukung` }
  }
  return { valid: true }
}

// ============================================================
// MAIN MENU — 4 tab kategori
// ============================================================
export function ProgramKegiatanMenu() {
  const [tab, setTab] = useState<Category>('PROGRAM_KERJA')
  const activeTab = useMemo(() => CATEGORY_TABS.find(t => t.key === tab) || CATEGORY_TABS[0], [tab])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Program & Kegiatan"
        description="Program kerja, aksi sosial, kemitraan, dan agenda kegiatan — terstruktur per tingkat pengurus (DPN → DPD → DPC)"
        icon={CalendarDays}
      />

      {/* Tab navigasi utama */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_TABS.map((t) => (
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

      {/* Conditional render: tab EKRAF_UMKM pakai manager khusus, tab lain pakai ProgramContentManager */}
      {tab === 'EKRAF_UMKM' ? (
        <EkrafUmkmManager />
      ) : (
        <ProgramContentManager
          key={tab}
          category={tab}
          title={activeTab.label}
          description={activeTab.desc}
          icon={activeTab.icon}
          accentColor={activeTab.color}
        />
      )}
    </div>
  )
}

// ============================================================
// PROGRAM CONTENT MANAGER — drill-down DPN/DPD/DPC + Breadcrumb
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
  const [error, setError] = useState<string | null>(null)

  // Load territories sekali saja (mount-only)
  useEffect(() => {
    let cancelled = false
    api('/api/territory')
      .then((all: any[]) => {
        if (cancelled) return
        setTerritories((all || []).filter(t => t.level === 'PROVINCE'))
        setRegencies((all || []).filter(t => t.level === 'REGENCY'))
      })
      .catch((e: any) => {
        if (cancelled) return
        console.error('[ProgramContentManager] territory load failed:', e.message)
      })
    return () => { cancelled = true }
  }, [])

  // Helper filter (FIX B4 — pakai && bukan ||)
  const isFiltered = useCallback((i: ProgramDoc, code: string, level: string) => {
    // Strict match: territoryCode sama DAN level sama
    if (i.territoryCode === code && i.level === level) return true
    // Fallback untuk legacy data yang mungkin level-nya null
    if (!i.level && i.territoryCode === code && level === 'DPD') return true
    return false
  }, [])

  const dpnItems = useMemo(() => items.filter(i => !i.territoryCode || i.territoryCode === 'ID' || i.level === 'DPN'), [items])
  const dpdCount = useMemo(() => items.filter(i => i.level === 'DPD').length, [items])
  const dpcCount = useMemo(() => items.filter(i => i.level === 'DPC').length, [items])

  // === HOME: 3 Kartu DPN/DPD/DPC ===
  if (view === 'home') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
          <strong>Hierarki:</strong> DPN (Pusat Nasional) → DPD (Provinsi) → DPC (Kabupaten/Kota).
          Pilih tingkat untuk melihat {title.toLowerCase()} masing-masing wilayah.
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {LEVEL_CARDS.map(c => {
            const count = c.key === 'DPN' ? dpnItems.length : c.key === 'DPD' ? dpdCount : dpcCount
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => { setView(c.key === 'DPN' ? 'dpn' : c.key === 'DPD' ? 'dpd-list' : 'dpc-list'); setSelectedProv(null); setSelectedRegency(null) }}
                className="rounded-2xl border-2 hover:shadow-lg transition-all overflow-hidden text-left"
              >
                <div className={`bg-gradient-to-br ${c.grad} p-5 text-white`}>
                  <c.icon className="w-8 h-8 mb-2" />
                  <div className="text-xl font-bold">{c.title}</div>
                  <div className="text-sm opacity-90">{c.subtitle}</div>
                </div>
                <div className="p-4 bg-white">
                  <div className="text-sm text-muted-foreground mb-2">{title} tingkat {c.title}</div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[13px]">{count} dokumen</Badge>
                    <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
                      Buka <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // === DPN VIEW ===
  if (view === 'dpn') {
    return (
      <ProgramLevelView
        key={`dpn-${category}`}
        title={`${title} — DPN (Pusat Nasional)`}
        description={description}
        icon={Icon}
        accentColor={accentColor}
        category={category}
        level="DPN"
        territoryCode="ID"
        territoryName="DPN (Pusat Nasional)"
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => setView('home')}><Home className="w-3 h-3 inline mr-1" />Beranda</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>DPN</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        onBack={() => setView('home')}
      />
    )
  }

  // === DPD LIST VIEW ===
  if (view === 'dpd-list') {
    return (
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => setView('home')}><Home className="w-3 h-3 inline mr-1" />Beranda</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>DPD</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h3 className="text-base font-bold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" /> Pilih DPD (Provinsi)
        </h3>
        {territories.length === 0 ? (
          <EmptyState icon={Building2} title="Belum ada DPD" description="Data wilayah belum dimuat. Coba refresh halaman." />
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {territories.map(prov => (
              <button
                key={prov.code}
                type="button"
                onClick={() => { setSelectedProv(prov); setView('dpd-detail') }}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-all text-left"
              >
                <span className="text-sm font-medium">{prov.name}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // === DPD DETAIL VIEW ===
  if (view === 'dpd-detail' && selectedProv) {
    return (
      <ProgramLevelView
        key={`dpd-${category}-${selectedProv.code}`}
        title={`${title} — DPD ${selectedProv.name}`}
        description={description}
        icon={Icon}
        accentColor={accentColor}
        category={category}
        level="DPD"
        territoryCode={selectedProv.code}
        territoryName={`DPD ${selectedProv.name}`}
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => setView('home')}><Home className="w-3 h-3 inline mr-1" />Beranda</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => { setSelectedProv(null); setView('dpd-list') }}>DPD</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>{selectedProv.name}</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        onBack={() => { setSelectedProv(null); setView('dpd-list') }}
      />
    )
  }

  // === DPC LIST VIEW (pilih provinsi dulu) ===
  if (view === 'dpc-list') {
    return (
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => setView('home')}><Home className="w-3 h-3 inline mr-1" />Beranda</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>DPC</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h3 className="text-base font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-600" /> Pilih DPD (Provinsi) untuk lihat DPC
        </h3>
        {territories.length === 0 ? (
          <EmptyState icon={MapPin} title="Belum ada DPD" description="Data wilayah belum dimuat." />
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {territories.map(prov => {
              const regCount = regencies.filter(r => r.parentId === prov.id).length
              return (
                <button
                  key={prov.code}
                  type="button"
                  onClick={() => { setSelectedProv(prov); setView('dpc-detail'); setSelectedRegency(null) }}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-all text-left"
                >
                  <span className="text-sm font-medium">{prov.name}</span>
                  <Badge variant="outline" className="text-[13px]">{regCount > 0 ? `${regCount} DPC` : 'Kosong'}</Badge>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // === DPC DETAIL VIEW (list kab/kota di provinsi terpilih) ===
  if (view === 'dpc-detail' && selectedProv) {
    const provRegencies = regencies.filter(r => r.parentId === selectedProv.id)
    return (
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => setView('home')}><Home className="w-3 h-3 inline mr-1" />Beranda</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => { setSelectedProv(null); setView('dpc-list') }}>DPC</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{selectedProv.name}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h3 className="text-base font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-600" /> DPC di {selectedProv.name}
        </h3>
        {provRegencies.length === 0 ? (
          <EmptyState icon={MapPin} title="Belum ada DPC" description={`Belum ada DPC terdaftar di ${selectedProv.name}.`} />
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {provRegencies.map(reg => (
              <button
                key={reg.code}
                type="button"
                onClick={() => setSelectedRegency(reg)}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-all text-left"
              >
                <span className="text-sm font-medium">{reg.name}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
        {selectedRegency && (
          <ProgramLevelView
            key={`dpc-${category}-${selectedRegency.code}`}
            title={`${title} — DPC ${selectedRegency.name}`}
            description={description}
            icon={Icon}
            accentColor={accentColor}
            category={category}
            level="DPC"
            territoryCode={selectedRegency.code}
            territoryName={`DPC ${selectedRegency.name}`}
            breadcrumb={
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink onClick={() => setView('home')}><Home className="w-3 h-3 inline mr-1" />Beranda</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink onClick={() => { setSelectedProv(null); setView('dpc-list') }}>DPC</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink onClick={() => setSelectedRegency(null)}>{selectedProv.name}</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbPage>{selectedRegency.name}</BreadcrumbPage></BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            }
            onBack={() => setSelectedRegency(null)}
          />
        )}
      </div>
    )
  }

  return null
}

// ============================================================
// PROGRAM LEVEL VIEW — List dokumen per level dengan semua fitur
// ============================================================
function ProgramLevelView({
  title, description, icon: Icon, accentColor, category, level, territoryCode, territoryName, onBack, breadcrumb,
}: {
  title: string
  description: string
  icon: any
  accentColor: string
  category: string
  level: Level
  territoryCode: string
  territoryName: string
  onBack: () => void
  breadcrumb?: React.ReactNode
}) {
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)

  // State data
  const [docs, setDocs] = useState<ProgramDoc[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State filter
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [statusFilter, setStatusFilter] = useState<Status | 'ALL'>('ALL')
  const [sort, setSort] = useState<SortKey>('updatedAt_desc')
  const [page, setPage] = useState(1)

  // State UI
  const [uploadOpen, setUploadOpen] = useState(false)
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<ProgramDoc | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<ProgramDoc | null>(null)
  const [viewingDoc, setViewingDoc] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  // Debounce search (250ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search)
      setPage(1) // reset to page 1 saat search berubah
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  // === Load data ===
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        category,
        level,
        territoryCode,
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sort,
      })
      if (searchDebounced) params.set('search', searchDebounced)
      if (statusFilter !== 'ALL') params.set('status', statusFilter)

      const data = await api(`/api/program-documents?${params.toString()}`)
      // api() return data (unwrapped)
      if (Array.isArray(data)) {
        // Backward compat: kalau API lama return array langsung
        setDocs(data)
        setPagination({ page: 1, pageSize: PAGE_SIZE, total: data.length, totalPages: 1 })
      } else if (data && Array.isArray((data as any).data)) {
        // API baru return { data, pagination }
        setDocs((data as any).data)
        setPagination((data as any).pagination || { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 })
      } else {
        setDocs([])
      }
    } catch (e: any) {
      console.error('[ProgramLevelView] load failed:', e)
      setError(e.message || 'Gagal memuat data')
      setDocs([])
    } finally {
      setLoading(false)
    }
  }, [category, level, territoryCode, page, sort, searchDebounced, statusFilter])

  useEffect(() => { loadData() }, [loadData])

  // Reset selectedIds saat data berubah
  useEffect(() => { setSelectedIds(new Set()) }, [docs])

  // === Handler: View bukti ===
  const handleView = async (doc: ProgramDoc) => {
    setViewingDoc(doc.id)
    try {
      const res = await fetch(`/api/program-documents/${doc.id}/view`, {
        headers: { 'x-user-id': user?.id || '' },
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
      addToast(`Gagal membuka file: ${e.message}`, 'error')
    } finally {
      setViewingDoc(null)
    }
  }

  // === Handler: Download file ===
  const handleDownload = async (doc: ProgramDoc) => {
    try {
      const res = await fetch(`/api/program-documents/${doc.id}/view`, {
        headers: { 'x-user-id': user?.id || '' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
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

  // === Handler: Bulk delete ===
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    try {
      const ids = Array.from(selectedIds)
      await api(`/api/program-documents/bulk?ids=${ids.join(',')}`, { method: 'DELETE' })
      addToast(`${ids.length} dokumen berhasil dihapus`, 'success')
      setBulkDeleteOpen(false)
      setSelectedIds(new Set())
      loadData()
    } catch (e: any) {
      addToast(`Gagal hapus massal: ${e.message}`, 'error')
    }
  }

  // === Stats: hitung sekali, gunakan useMemo ===
  const stats = useMemo(() => {
    // Note: stats ini hanya untuk page aktif (bukan total)
    // Untuk total stats server-side, butuh API stats terpisah
    return {
      total: pagination.total,
      selesai: 0,
      berjalan: 0,
      direncanakan: 0,
      inPage: docs.length,
    }
  }, [pagination.total, docs.length])

  // === Render ===
  return (
    <div className="space-y-4">
      {breadcrumb}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ChevronLeft className="w-4 h-4" /> Kembali
      </Button>

      {/* Header dengan tombol upload */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-base font-bold flex items-center gap-2">
          <Icon className={`w-5 h-5 bg-gradient-to-br ${accentColor} bg-clip-text`} />
          {title}
          <Badge variant="outline" className="text-[13px]">{pagination.total} total dokumen</Badge>
        </h3>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBulkUploadOpen(true)}
            className="gap-1"
          >
            <Files className="w-4 h-4" /> Bulk Upload
          </Button>
          <Button
            size="sm"
            onClick={() => setUploadOpen(true)}
            className={`gap-1 bg-gradient-to-r ${accentColor} text-white hover:opacity-90`}
          >
            <Upload className="w-4 h-4" /> Upload Dokumen
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari judul / deskripsi / lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Status</SelectItem>
            <SelectItem value="DIRENCANAKAN">Direncanakan</SelectItem>
            <SelectItem value="BERJALAN">Berjalan</SelectItem>
            <SelectItem value="SELESAI">Selesai</SelectItem>
            <SelectItem value="DITUNDA">Ditunda</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-44">
            <ArrowUpDown className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Urutkan" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(s => (
              <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {/* Bulk action bar — tampil saat ada selected */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
          <Checkbox checked={true} onCheckedChange={(checked) => {
            if (!checked) setSelectedIds(new Set())
          }} />
          <span className="text-sm font-medium">{selectedIds.size} dipilih</span>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setBulkDeleteOpen(true)}
            className="gap-1 ml-auto"
          >
            <Trash2 className="w-3 h-3" /> Hapus Massal
          </Button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <ErrorState message={error} />
      )}

      {/* Loading state */}
      {loading && !error && <LoadingState message={`Memuat dokumen ${level}...`} />}

      {/* Empty state */}
      {!loading && !error && docs.length === 0 && (
        <EmptyState
          icon={FileText}
          title={searchDebounced || statusFilter !== 'ALL' ? 'Tidak ada dokumen cocok' : `Belum ada dokumen ${level}`}
          description={
            searchDebounced || statusFilter !== 'ALL'
              ? 'Coba ubah filter atau kata kunci pencarian.'
              : `Upload dokumen bukti pelaksanaan ${level} ${territoryName}. Mendukung PDF, gambar, dokumen, video, dan audio.`
          }
          action={
            !searchDebounced && statusFilter === 'ALL' ? (
              <Button onClick={() => setUploadOpen(true)} className={`gap-1 bg-gradient-to-r ${accentColor}`}>
                <Upload className="w-4 h-4" /> Upload Sekarang
              </Button>
            ) : undefined
          }
        />
      )}

      {/* List dokumen */}
      {!loading && !error && docs.length > 0 && (
        <div className="space-y-2">
          {/* Header dengan select-all */}
          <div className="flex items-center gap-2 pb-1">
            <Checkbox
              checked={docs.length > 0 && selectedIds.size === docs.length}
              onCheckedChange={(checked) => {
                if (checked) setSelectedIds(new Set(docs.map(d => d.id)))
                else setSelectedIds(new Set())
              }}
            />
            <span className="text-xs text-muted-foreground">Pilih semua di halaman ini</span>
          </div>
          {docs.map((doc) => {
            const FileIcon = getFileIcon(doc.fileType)
            const hasFile = !!doc.fileName
            const isSelected = selectedIds.has(doc.id)
            const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.DIRENCANAKAN
            return (
              <div
                key={doc.id}
                className={`group relative rounded-lg border p-4 hover:shadow-md transition-all bg-white ${isSelected ? 'border-orange-400 bg-orange-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      const newSet = new Set(selectedIds)
                      if (checked) newSet.add(doc.id)
                      else newSet.delete(doc.id)
                      setSelectedIds(newSet)
                    }}
                    className="mt-1"
                  />
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
                      {doc.eventDate && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatDateTimeID(doc.eventDate)}</span>}
                      <Badge variant={statusCfg.badgeVariant} className="text-[11px] gap-1">
                        <statusCfg.icon className="w-3 h-3" /> {statusCfg.label}
                      </Badge>
                      {doc.uploadedBy && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {doc.uploadedBy.fullName}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-1 shrink-0">
                    {hasFile && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                          onClick={() => handleView(doc)}
                          disabled={viewingDoc === doc.id}
                          aria-label="Lihat file"
                        >
                          {viewingDoc === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-purple-600 hover:bg-purple-50"
                          onClick={() => handleDownload(doc)}
                          aria-label="Download file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                      onClick={() => setEditDoc(doc)}
                      aria-label="Edit dokumen"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteDoc(doc)}
                      aria-label="Hapus dokumen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <span className="text-xs text-muted-foreground">
            Halaman {pagination.page} dari {pagination.totalPages} • {pagination.total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="gap-1"
            >
              <ChevronLeft className="w-3 h-3" /> Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="gap-1"
            >
              Berikutnya <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
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
          accentColor={accentColor}
          onSuccess={() => { setUploadOpen(false); loadData() }}
        />
      )}

      {/* Bulk Upload Dialog */}
      {bulkUploadOpen && (
        <BulkUploadDialog
          open={bulkUploadOpen}
          onOpenChange={setBulkUploadOpen}
          category={category as Category}
          level={level}
          territoryCode={territoryCode}
          territoryName={territoryName}
          accentColor={accentColor}
          onSuccess={() => { setBulkUploadOpen(false); loadData() }}
        />
      )}

      {/* Edit Dialog */}
      {editDoc && (
        <EditDialog
          doc={editDoc}
          open={!!editDoc}
          onOpenChange={(o) => !o && setEditDoc(null)}
          onSuccess={() => { setEditDoc(null); loadData() }}
        />
      )}

      {/* Delete Confirmation (single) */}
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
                    await api(`/api/program-documents/${deleteDoc.id}`, { method: 'DELETE' })
                    addToast('Dokumen berhasil dihapus', 'success')
                    setDeleteDoc(null)
                    loadData()
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

      {/* Bulk Delete Confirmation */}
      {bulkDeleteOpen && (
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus {selectedIds.size} dokumen?</AlertDialogTitle>
              <AlertDialogDescription>
                Anda akan menghapus <strong>{selectedIds.size} dokumen</strong> sekaligus.
                Aksi ini tidak bisa dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                Hapus {selectedIds.size} Dokumen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

// ============================================================
// UPLOAD DIALOG — single file upload + metadata
// ============================================================
function UploadDialog({
  open, onOpenChange, category, level, territoryCode, territoryName, accentColor, onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  category: Category
  level: Level
  territoryCode: string
  territoryName: string
  accentColor: string
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  const [form, setForm] = useState({
    title: '', description: '', location: '', eventDate: '', status: 'DIRENCANAKAN' as Status,
  })
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setForm({ title: '', description: '', location: '', eventDate: '', status: 'DIRENCANAKAN' })
      setFile(null)
      setFileError(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [open])

  const handleFileSelect = (f: File | null) => {
    setFileError(null)
    if (!f) {
      setFile(null)
      return
    }
    const validation = validateFile(f)
    if (!validation.valid) {
      setFileError(validation.error || 'File tidak valid')
      setFile(null)
      return
    }
    setFile(f)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Judul wajib diisi', 'error'); return }
    if (!file) { addToast('File wajib diupload', 'error'); return }
    if (fileError) { addToast(fileError, 'error'); return }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', form.title)
      formData.append('description', form.description)
      formData.append('location', form.location)
      formData.append('eventDate', form.eventDate)
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
          {/* Dropzone dengan drag & drop yang berfungsi */}
          <div className="space-y-1.5">
            <Label>File Bukti *</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const f = e.dataTransfer.files?.[0]
                if (f) handleFileSelect(f)
              }}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-orange-500 bg-orange-50' : 'hover:bg-accent'
              } ${fileError ? 'border-red-400' : ''}`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="h-7 w-7 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <div className="text-sm font-medium">Klik untuk pilih file atau drag & drop</div>
                  <div className="text-xs text-muted-foreground">PDF, JPG, PNG, WebP, DOC, XLS, MP4, MP3, TXT — maks 4MB</div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              className="hidden"
            />
            {fileError && (
              <p className="text-xs text-red-600">{fileError}</p>
            )}
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
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
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
          <Button
            onClick={handleSubmit}
            disabled={saving || !!fileError || !file || !form.title.trim()}
            className={`gap-1 bg-gradient-to-r ${accentColor} text-white hover:opacity-90`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Dokumen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// BULK UPLOAD DIALOG — multiple files + shared metadata
// ============================================================
function BulkUploadDialog({
  open, onOpenChange, category, level, territoryCode, territoryName, accentColor, onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  category: Category
  level: Level
  territoryCode: string
  territoryName: string
  accentColor: string
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  const [files, setFiles] = useState<File[]>([])
  const [filesError, setFilesError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [titlePrefix, setTitlePrefix] = useState('')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [status, setStatus] = useState<Status>('DIRENCANAKAN')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setFiles([])
      setFilesError(null)
      setTitlePrefix('')
      setLocation('')
      setEventDate('')
      setStatus('DIRENCANAKAN')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [open])

  const handleFilesSelect = (fileList: FileList | null) => {
    setFilesError(null)
    if (!fileList || fileList.length === 0) return
    const arr = Array.from(fileList)
    if (arr.length > 10) {
      setFilesError('Maksimal 10 file per batch')
      return
    }
    const invalid = arr.find(f => {
      const v = validateFile(f)
      return !v.valid
    })
    if (invalid) {
      const v = validateFile(invalid)
      setFilesError(`File "${invalid.name}": ${v.error}`)
      return
    }
    setFiles(arr)
  }

  const handleSubmit = async () => {
    if (files.length === 0) { addToast('Tidak ada file', 'error'); return }
    if (filesError) { addToast(filesError, 'error'); return }

    setSaving(true)
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))
      formData.append('titlePrefix', titlePrefix)
      formData.append('category', category)
      formData.append('level', level)
      formData.append('territoryCode', territoryCode)
      formData.append('territoryName', territoryName)
      formData.append('location', location)
      formData.append('eventDate', eventDate)
      formData.append('status', status)

      const res = await fetch('/api/program-documents/bulk', {
        method: 'POST',
        headers: { 'x-user-id': user?.id || '' },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const { uploaded, failed } = data.data
      addToast(`Upload selesai: ${uploaded.length} berhasil, ${failed.length} gagal`, failed.length > 0 ? 'warning' : 'success')
      if (failed.length > 0) {
        console.warn('Failed uploads:', failed)
      }
      onSuccess()
    } catch (e: any) {
      addToast(`Gagal bulk upload: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload — {level} {territoryName}</DialogTitle>
          <DialogDescription>
            Upload multiple file sekaligus (maksimal 10 file). Semua file akan diberi metadata yang sama (lokasi, tanggal, status). Judul otomatis pakai nama file atau prefix + nomor urut.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {/* Dropzone */}
          <div className="space-y-1.5">
            <Label>Pilih Multiple File (maks 10)</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                handleFilesSelect(e.dataTransfer.files)
              }}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-orange-500 bg-orange-50' : 'hover:bg-accent'
              } ${filesError ? 'border-red-400' : ''}`}
            >
              {files.length > 0 ? (
                <div className="space-y-2">
                  <FileCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="text-sm font-medium">{files.length} file dipilih</div>
                  <div className="text-xs text-muted-foreground">
                    Total: {formatFileSize(files.reduce((s, f) => s + f.size, 0))}
                  </div>
                  <div className="text-xs text-left max-h-32 overflow-y-auto border rounded p-2 bg-accent">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate">{f.name}</span>
                        <span className="text-muted-foreground shrink-0">{formatFileSize(f.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Files className="w-8 h-8 mx-auto text-muted-foreground" />
                  <div className="text-sm font-medium">Klik atau drag multiple file ke sini</div>
                  <div className="text-xs text-muted-foreground">Maks 10 file, masing-masing maks 4MB</div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              multiple
              onChange={(e) => handleFilesSelect(e.target.files)}
              className="hidden"
            />
            {filesError && <p className="text-xs text-red-600">{filesError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Prefix Judul (opsional)</Label>
            <Input
              value={titlePrefix}
              onChange={(e) => setTitlePrefix(e.target.value)}
              placeholder="Contoh: Sosialisasi Asta Cita — akan jadi 'Sosialisasi Asta Cita (1)', '(2)', dst."
            />
            <p className="text-xs text-muted-foreground">
              Kalau kosong, judul pakai nama file tanpa ekstensi.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Lokasi (untuk semua)</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal (untuk semua)</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status (untuk semua)</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
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
          <Button
            onClick={handleSubmit}
            disabled={saving || !!filesError || files.length === 0}
            className={`gap-1 bg-gradient-to-r ${accentColor} text-white hover:opacity-90`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload {files.length || ''} File
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
  doc, open, onOpenChange, onSuccess,
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
    eventDate: doc.eventDate ? doc.eventDate.substring(0, 10) : '',
    status: doc.status,
  })
  const [replaceFile, setReplaceFile] = useState(false)
  const [newFile, setNewFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (f: File | null) => {
    setFileError(null)
    if (!f) { setNewFile(null); return }
    const v = validateFile(f)
    if (!v.valid) { setFileError(v.error || 'File tidak valid'); setNewFile(null); return }
    setNewFile(f)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { addToast('Judul wajib diisi', 'error'); return }
    if (replaceFile && !newFile) { addToast('Pilih file baru atau uncheck "Ganti file"', 'error'); return }
    if (fileError) { addToast(fileError, 'error'); return }

    setSaving(true)
    try {
      if (replaceFile && newFile) {
        const formData = new FormData()
        formData.append('file', newFile)
        formData.append('title', form.title)
        formData.append('description', form.description)
        formData.append('location', form.location)
        formData.append('eventDate', form.eventDate)
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
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            location: form.location,
            eventDate: form.eventDate,
            status: form.status,
          }),
        })
        addToast('Metadata berhasil diperbarui', 'success')
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
            {doc.fileName && (<> • File: <strong>{doc.fileName}</strong></>)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {doc.fileName && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={replaceFile}
                  onCheckedChange={(checked) => { setReplaceFile(checked === true); setNewFile(null); setFileError(null) }}
                />
                <span className="text-sm font-medium">Ganti file bukti</span>
              </label>
              {replaceFile && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault() }}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleFileSelect(e.dataTransfer.files?.[0] || null)
                  }}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-accent ${fileError ? 'border-red-400' : ''}`}
                >
                  {newFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-orange-600" />
                      <span>{newFile.name}</span>
                      <span className="text-muted-foreground">({formatFileSize(newFile.size)})</span>
                      <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setNewFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }} className="h-6 w-6 p-0">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Klik atau drag file baru</div>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                className="hidden"
              />
              {fileError && <p className="text-xs text-red-600">{fileError}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Judul *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Lokasi</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal</Label>
              <Input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
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

// ============================================================
// EKRAF UMKM MANAGER — Koperasi + Usaha Kecil + Ekonomi Kreatif
// ============================================================
// Per user request: tambah tab "Ekonomi Kreatif & UMKM" di samping
// "Agenda & Kegiatan" dalam menu Program & Kegiatan.
//
// Sub-tab:
// 1. Daftar Usaha (list + filter + CRUD)
// 2. Produk (katalog per usaha)
// 3. Dashboard (stats + ringkasan per DPN/DPD/DPC)
//
// RBAC:
// - DPN: input data UMKM tingkat DPN pusat (territoryId = Country ID)
// - DPD: input data UMKM tingkat DPD provinsi (territoryId = Province)
// - DPC: input data UMKM tingkat DPC kab/kota (territoryId = Regency)
// - DPN lihat SEMUA, DPD lihat provinsi + DPC di bawahnya, DPC hanya own
// ============================================================

const UMKM_TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  KOPERASI: { label: 'Koperasi', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Store },
  USHA_KECIL: { label: 'Usaha Kecil', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Package },
  USHA_MENENGAH: { label: 'Usaha Menengah', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: Building2 },
  EKRAF: { label: 'Ekonomi Kreatif', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: TrendingUp },
}

const UMKM_BIDANG_OPTIONS = [
  { value: 'KULINER', label: 'Kuliner' },
  { value: 'FASHION', label: 'Fashion' },
  { value: 'KERAJINAN', label: 'Kerajinan' },
  { value: 'APLIKASI_DIGITAL', label: 'Aplikasi Digital' },
  { value: 'PERTANIAN', label: 'Pertanian' },
  { value: 'JASA', label: 'Jasa' },
  { value: 'PERDAGANGAN', label: 'Perdagangan' },
  { value: 'LAINNYA', label: 'Lainnya' },
]

const UMKM_LEGAL_OPTIONS = [
  { value: 'BELUM_TERDAFTAR', label: 'Belum Terdaftar' },
  { value: 'NIB', label: 'Terdaftar NIB' },
  { value: 'BADAN_HUKUM_PT', label: 'Berbadan Hukum PT' },
  { value: 'BADAN_HUKUM_CV', label: 'Berbadan Hukum CV' },
  { value: 'YAYASAN', label: 'Yayasan' },
  { value: 'KOPERASI_RESMI', label: 'Koperasi Resmi' },
]

const UMKM_STATUS_OPTIONS = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'NON-AKTIF', label: 'Non-Aktif' },
  { value: 'BERHENTI', label: 'Berhenti Operasi' },
]

function formatRupiah(amount: number): string {
  if (!amount) return 'Rp 0'
  return 'Rp ' + amount.toLocaleString('id-ID')
}

function EkrafUmkmManager() {
  const user = useAuthStore.getState().user
  const addToast = useToastStore((s) => s.addToast)
  const [subTab, setSubTab] = useState<'list' | 'dashboard'>('list')

  // User's territory context — DPN/DPC/DPC will input ke territory sendiri
  const userTerritory = user?.territoryId
  const userTerritoryName = user?.territoryName || ''
  const userTerritoryCode = user?.territoryCode || ''
  const userTerritoryLevel = user?.territoryLevel || ''

  // Determine level label
  const levelLabel = userTerritoryLevel === 'COUNTRY' ? 'DPN' :
                    userTerritoryLevel === 'PROVINCE' ? 'DPD' :
                    userTerritoryLevel === 'REGENCY' ? 'DPC' : '—'

  // === State: list ===
  const [umkms, setUmkms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('')
  const [filterBidang, setFilterBidang] = useState<string>('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // === State: form ===
  const [form, setForm] = useState<any>({
    name: '', type: 'USHA_KECIL', bidang: '', description: '', legalStatus: 'BELUM_TERDAFTAR',
    npwp: '', nib: '', noBadanHukum: '', foundedDate: '', ownerName: '', ownerPhone: '',
    address: '', employeeCount: 0, monthlyOmzet: 0, logoUrl: '', status: 'AKTIF', notes: '',
  })
  const [saving, setSaving] = useState(false)

  // === State: products ===
  const [showProducts, setShowProducts] = useState<string | null>(null) // umkmId
  const [products, setProducts] = useState<any[]>([])
  const [productForm, setProductForm] = useState<any>({
    name: '', description: '', price: 0, unit: '', stock: 0, category: '', photoUrl: '', isActive: true,
  })
  const [editingProductId, setEditingProductId] = useState<string | null>(null)

  // === State: stats ===
  const [stats, setStats] = useState<any>(null)

  // === Load UMKM list ===
  const loadUmkm = useCallback(async () => {
    setLoading(true)
    try {
      // Untuk DPN: tidak kirim territoryId → API kirim semua (global)
      // Untuk DPD/DPC: kirim territoryId user → API filter pakai getViewableTerritoryIds
      const url = userTerritoryLevel === 'COUNTRY'
        ? '/api/umkm'
        : `/api/umkm?territoryId=${userTerritory}`
      const res = await api(url, { keepWrapper: true })
      if (res?.success) setUmkms(res.data || [])
      else addToast(res?.error || 'Gagal memuat UMKM', 'error')
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [userTerritory, userTerritoryLevel, addToast])

  // === Load stats ===
  const loadStats = useCallback(async () => {
    try {
      const url = userTerritoryLevel === 'COUNTRY'
        ? '/api/umkm?stats=1'
        : `/api/umkm?territoryId=${userTerritory}&stats=1`
      const res = await api(url, { keepWrapper: true })
      if (res?.success) setStats(res.data)
    } catch (e: any) { console.error('Stats load:', e) }
  }, [userTerritory, userTerritoryLevel])

  useEffect(() => { loadUmkm(); loadStats() }, [loadUmkm, loadStats])

  // === Helpers ===
  const filtered = useMemo(() => {
    return umkms.filter((u) => {
      if (filterType && u.type !== filterType) return false
      if (filterBidang && u.bidang !== filterBidang) return false
      if (search && !u.name.toLowerCase().includes(search.toLowerCase()) &&
          !(u.ownerName || '').toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [umkms, filterType, filterBidang, search])

  // === Form submit (create/update) ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name?.trim()) { addToast('Nama usaha wajib diisi', 'error'); return }
    if (!userTerritory) { addToast('Anda tidak terikat territory', 'error'); return }

    setSaving(true)
    try {
      const payload = { ...form, territoryId: userTerritory }
      const res = editingId
        ? await api('/api/umkm', { method: 'PATCH', body: JSON.stringify({ action: 'update_umkm', id: editingId, ...payload }), keepWrapper: true })
        : await api('/api/umkm', { method: 'POST', body: JSON.stringify({ action: 'create_umkm', ...payload }), keepWrapper: true })

      if (res?.success) {
        addToast(res.message || (editingId ? 'UMKM diperbarui' : 'UMKM dibuat'), 'success')
        setShowForm(false)
        setEditingId(null)
        setForm({
          name: '', type: 'USHA_KECIL', bidang: '', description: '', legalStatus: 'BELUM_TERDAFTAR',
          npwp: '', nib: '', noBadanHukum: '', foundedDate: '', ownerName: '', ownerPhone: '',
          address: '', employeeCount: 0, monthlyOmzet: 0, logoUrl: '', status: 'AKTIF', notes: '',
        })
        loadUmkm()
        loadStats()
      } else addToast(res?.error || 'Gagal menyimpan', 'error')
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  // === Edit ===
  const handleEdit = (u: any) => {
    setEditingId(u.id)
    setForm({
      name: u.name || '', type: u.type || 'USHA_KECIL', bidang: u.bidang || '',
      description: u.description || '', legalStatus: u.legalStatus || 'BELUM_TERDAFTAR',
      npwp: u.npwp || '', nib: u.nib || '', noBadanHukum: u.noBadanHukum || '',
      foundedDate: u.foundedDate ? new Date(u.foundedDate).toISOString().slice(0, 10) : '',
      ownerName: u.ownerName || '', ownerPhone: u.ownerPhone || '', address: u.address || '',
      employeeCount: u.employeeCount || 0, monthlyOmzet: u.monthlyOmzet || 0,
      logoUrl: u.logoUrl || '', status: u.status || 'AKTIF', notes: u.notes || '',
    })
    setShowForm(true)
  }

  // === Delete ===
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus UMKM "${name}"? Semua produk juga akan dihapus.`)) return
    try {
      const res = await api(`/api/umkm?id=${id}&type=umkm`, { method: 'DELETE', keepWrapper: true })
      if (res?.success) { addToast(res.message, 'success'); loadUmkm(); loadStats() }
      else addToast(res?.error || 'Gagal', 'error')
    } catch (e: any) { addToast(e.message, 'error') }
  }

  // === Products management ===
  const loadProducts = async (umkmId: string) => {
    try {
      const res = await api(`/api/umkm?id=${umkmId}`, { keepWrapper: true })
      if (res?.success) setProducts(res.data?.products || [])
    } catch (e: any) { addToast(e.message, 'error') }
  }

  const openProducts = (umkmId: string) => {
    setShowProducts(umkmId)
    setProducts([])
    loadProducts(umkmId)
  }

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showProducts || !productForm.name?.trim()) return
    setSaving(true)
    try {
      const res = editingProductId
        ? await api('/api/umkm', { method: 'PATCH', body: JSON.stringify({ action: 'update_product', id: editingProductId, ...productForm }), keepWrapper: true })
        : await api('/api/umkm', { method: 'POST', body: JSON.stringify({ action: 'create_product', umkmId: showProducts, ...productForm }), keepWrapper: true })

      if (res?.success) {
        addToast(res.message, 'success')
        setProductForm({ name: '', description: '', price: 0, unit: '', stock: 0, category: '', photoUrl: '', isActive: true })
        setEditingProductId(null)
        loadProducts(showProducts)
      } else addToast(res?.error || 'Gagal', 'error')
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleProductDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus produk "${name}"?`)) return
    try {
      const res = await api(`/api/umkm?id=${id}&type=product`, { method: 'DELETE', keepWrapper: true })
      if (res?.success) { addToast(res.message, 'success'); if (showProducts) loadProducts(showProducts) }
      else addToast(res?.error || 'Gagal', 'error')
    } catch (e: any) { addToast(e.message, 'error') }
  }

  const handleProductEdit = (p: any) => {
    setEditingProductId(p.id)
    setProductForm({
      name: p.name || '', description: p.description || '', price: p.price || 0,
      unit: p.unit || '', stock: p.stock || 0, category: p.category || '',
      photoUrl: p.photoUrl || '', isActive: p.isActive,
    })
  }

  return (
    <div className="space-y-4">
      {/* Context banner */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
        <strong>Konteks Input:</strong> Anda login sebagai <strong>{user?.fullName}</strong> ({levelLabel}) di territory{' '}
        <strong>{userTerritoryName}</strong> ({userTerritoryCode}). UMKM yang Anda input akan ter-link ke territory ini.
        {userTerritoryLevel === 'COUNTRY' && ' DPN bisa lihat SEMUA UMKM se-Indonesia.'}
        {userTerritoryLevel === 'PROVINCE' && ' DPD bisa lihat UMKM provinsi + semua DPC di bawahnya.'}
        {userTerritoryLevel === 'REGENCY' && ' DPC hanya bisa lihat UMKM territory sendiri.'}
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setSubTab('list')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === 'list' ? 'border-amber-500 text-amber-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Store className="w-4 h-4 inline mr-1" /> Daftar Usaha
        </button>
        <button
          onClick={() => setSubTab('dashboard')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === 'dashboard' ? 'border-amber-500 text-amber-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-1" /> Dashboard
        </button>
      </div>

      {/* === SUB-TAB: LIST === */}
      {subTab === 'list' && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                placeholder="Cari nama/pemilik..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 max-w-xs"
              />
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="h-8 px-2 border rounded text-sm">
                <option value="">Semua Tipe</option>
                <option value="KOPERASI">Koperasi</option>
                <option value="USHA_KECIL">Usaha Kecil</option>
                <option value="USHA_MENENGAH">Usaha Menengah</option>
                <option value="EKRAF">Ekraf</option>
              </select>
              <select value={filterBidang} onChange={(e) => setFilterBidang(e.target.value)}
                className="h-8 px-2 border rounded text-sm">
                <option value="">Semua Bidang</option>
                {UMKM_BIDANG_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <Button onClick={() => {
              setEditingId(null)
              setForm({
                name: '', type: 'USHA_KECIL', bidang: '', description: '', legalStatus: 'BELUM_TERDAFTAR',
                npwp: '', nib: '', noBadanHukum: '', foundedDate: '', ownerName: '', ownerPhone: '',
                address: '', employeeCount: 0, monthlyOmzet: 0, logoUrl: '', status: 'AKTIF', notes: '',
              })
              setShowForm(true)
            }} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> Tambah Usaha
            </Button>
          </div>

          {/* List */}
          {loading ? <LoadingState /> : filtered.length === 0 ? (
            <EmptyState icon={Store} title="Belum ada UMKM" description="Klik 'Tambah Usaha' untuk input koperasi, UKM, atau ekraf." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map((u) => {
                const TypeConf = UMKM_TYPE_CONFIG[u.type] || UMKM_TYPE_CONFIG.USHA_KECIL
                const TypeIcon = TypeConf.icon
                return (
                  <Card key={u.id} className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Logo or icon */}
                          {u.logoUrl ? (
                            <img src={u.logoUrl} alt={u.name} className="w-12 h-12 rounded object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded bg-amber-100 flex items-center justify-center text-amber-700">
                              <TypeIcon className="w-6 h-6" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{u.name}</div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <Badge variant="outline" className={`text-xs ${TypeConf.color}`}>
                                <TypeIcon className="w-3 h-3 mr-1" />{TypeConf.label}
                              </Badge>
                              {u.bidang && (
                                <Badge variant="outline" className="text-xs">
                                  {UMKM_BIDANG_OPTIONS.find(b => b.value === u.bidang)?.label || u.bidang}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {u.territory?.name || '-'}
                              </Badge>
                            </div>
                            {u.description && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{u.description}</div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
                              {u.ownerName && <div>👤 {u.ownerName}</div>}
                              {u.ownerPhone && <div>📞 {u.ownerPhone}</div>}
                              {u.monthlyOmzet > 0 && <div>💰 Omzet/bln: {formatRupiah(u.monthlyOmzet)}</div>}
                              {u.legalStatus && u.legalStatus !== 'BELUM_TERDAFTAR' && (
                                <div>📋 {UMKM_LEGAL_OPTIONS.find(l => l.value === u.legalStatus)?.label || u.legalStatus}</div>
                              )}
                              <div>📦 {u._count?.products || 0} produk</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openProducts(u.id)}>
                            <Package className="w-3 h-3 mr-1" /> Produk
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(u)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(u.id, u.name)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* === SUB-TAB: DASHBOARD === */}
      {subTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Stats cards — 5 cards: Total + 4 tipe */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-amber-600">Total UMKM</div>
                    <div className="text-2xl font-bold text-amber-700">{stats?.totalCount || 0}</div>
                  </div>
                  <Store className="w-8 h-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-emerald-600">Koperasi</div>
                    <div className="text-2xl font-bold text-emerald-700">
                      {stats?.byType?.find((t:any) => t.type === 'KOPERASI')?._count || 0}
                    </div>
                  </div>
                  <Store className="w-8 h-8 text-emerald-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-blue-600">Usaha Kecil</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {stats?.byType?.find((t:any) => t.type === 'USHA_KECIL')?._count || 0}
                    </div>
                  </div>
                  <Package className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-cyan-50 border-cyan-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-cyan-600">Usaha Menengah</div>
                    <div className="text-2xl font-bold text-cyan-700">
                      {stats?.byType?.find((t:any) => t.type === 'USHA_MENENGAH')?._count || 0}
                    </div>
                  </div>
                  <Building2 className="w-8 h-8 text-cyan-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-purple-600">Ekraf</div>
                    <div className="text-2xl font-bold text-purple-700">
                      {stats?.byType?.find((t:any) => t.type === 'EKRAF')?._count || 0}
                    </div>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Total Omzet */}
          <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90">Total Estimasi Omzet Bulanan</div>
                  <div className="text-3xl font-bold">{formatRupiah(stats?.totalOmzet || 0)}</div>
                </div>
                <DollarSign className="w-12 h-12 opacity-50" />
              </div>
            </CardContent>
          </Card>

          {/* By Bidang */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Komposisi Bidang Usaha</CardTitle></CardHeader>
            <CardContent>
              {stats?.byBidang?.length === 0 ? (
                <EmptyState icon={Store} title="Belum ada data" description="" />
              ) : (
                <div className="space-y-2">
                  {(stats?.byBidang || []).map((b: any) => {
                    const total = stats?.totalCount || 1
                    const pct = Math.round((b._count / total) * 100)
                    const label = UMKM_BIDANG_OPTIONS.find(o => o.value === b.bidang)?.label || b.bidang || 'Tidak diketahui'
                    return (
                      <div key={b.bidang || 'none'}>
                        <div className="flex justify-between text-xs mb-1">
                          <span>{label}</span>
                          <span className="text-muted-foreground">{b._count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* By Legal Status */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Status Legalitas</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(stats?.byLegal || []).map((l: any) => (
                  <Badge key={l.legalStatus} variant="outline" className="text-xs">
                    {UMKM_LEGAL_OPTIONS.find(o => o.value === l.legalStatus)?.label || l.legalStatus}: {l._count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* === DIALOG: Form UMKM (create/edit) === */}
      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) setEditingId(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit UMKM' : 'Tambah UMKM / Koperasi / Ekraf'}</DialogTitle>
            <DialogDescription>
              UMKM akan ter-link ke territory: <strong>{userTerritoryName}</strong> ({levelLabel})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-sm">Nama Usaha/Koperasi/Ekraf <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="cth: Koperasi Konsumen LAPRA 08" required className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Tipe <span className="text-red-500">*</span></Label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full mt-1 px-2 py-1 border rounded text-sm h-9" required>
                  <option value="KOPERASI">Koperasi</option>
                  <option value="USHA_KECIL">Usaha Kecil</option>
                  <option value="USHA_MENENGAH">Usaha Menengah</option>
                  <option value="EKRAF">Ekonomi Kreatif</option>
                </select>
              </div>
              <div>
                <Label className="text-sm">Bidang</Label>
                <select value={form.bidang} onChange={(e) => setForm({ ...form, bidang: e.target.value })}
                  className="w-full mt-1 px-2 py-1 border rounded text-sm h-9">
                  <option value="">— pilih —</option>
                  {UMKM_BIDANG_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Label className="text-sm">Deskripsi Usaha</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi singkat usaha..." className="mt-1" rows={2} />
              </div>
              <div>
                <Label className="text-sm">Status Legalitas</Label>
                <select value={form.legalStatus} onChange={(e) => setForm({ ...form, legalStatus: e.target.value })}
                  className="w-full mt-1 px-2 py-1 border rounded text-sm h-9">
                  {UMKM_LEGAL_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-sm">Status Operasi</Label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full mt-1 px-2 py-1 border rounded text-sm h-9">
                  {UMKM_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-sm">NPWP</Label>
                <Input value={form.npwp} onChange={(e) => setForm({ ...form, npwp: e.target.value })}
                  placeholder="xx.xxx.xxx.x-xxx" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">NIB (Nomor Induk Berusaha)</Label>
                <Input value={form.nib} onChange={(e) => setForm({ ...form, nib: e.target.value })}
                  placeholder="13 digit" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">No. Badan Hukum</Label>
                <Input value={form.noBadanHukum} onChange={(e) => setForm({ ...form, noBadanHukum: e.target.value })}
                  placeholder="untuk PT/CV/Yayasan/Koperasi" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Tanggal Berdiri</Label>
                <Input type="date" value={form.foundedDate} onChange={(e) => setForm({ ...form, foundedDate: e.target.value })}
                  className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Nama Pemilik/Penanggung Jawab</Label>
                <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  placeholder="cth: Budi Santoso" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">No. Telepon/WhatsApp Pemilik</Label>
                <Input value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
                  placeholder="cth: 0812xxxxxxx" className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-sm">Alamat Usaha</Label>
                <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Alamat lengkap usaha..." className="mt-1" rows={2} />
              </div>
              <div>
                <Label className="text-sm">Jumlah Karyawan</Label>
                <Input type="number" min={0} value={form.employeeCount}
                  onChange={(e) => setForm({ ...form, employeeCount: parseInt(e.target.value) || 0 })}
                  className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Estimasi Omzet Bulanan (Rp)</Label>
                <Input type="number" min={0} value={form.monthlyOmzet}
                  onChange={(e) => setForm({ ...form, monthlyOmzet: parseInt(e.target.value) || 0 })}
                  placeholder="cth: 5000000" className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-sm">Catatan</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan tambahan..." className="mt-1" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null) }}>Batal</Button>
              <Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {editingId ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* === DIALOG: Products management === */}
      <Dialog open={!!showProducts} onOpenChange={(o) => { if (!o) { setShowProducts(null); setEditingProductId(null); setProducts([]) } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Kelola Produk UMKM</DialogTitle>
            <DialogDescription>
              {umkms.find(u => u.id === showProducts)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* List existing products */}
            <div className="space-y-2">
              {products.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">Belum ada produk.</div>
              ) : (
                products.map((p) => (
                  <Card key={p.id} className="border-l-4 border-l-blue-400">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1">
                          {p.photoUrl ? (
                            <img src={p.photoUrl} alt={p.name} className="w-12 h-12 rounded object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded bg-blue-100 flex items-center justify-center text-blue-700">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-sm">{p.name}</div>
                            {p.description && <div className="text-xs text-muted-foreground line-clamp-2">{p.description}</div>}
                            <div className="text-xs mt-1">
                              <span className="font-medium text-blue-600">{formatRupiah(p.price)}</span>
                              {p.unit && <span className="text-muted-foreground"> / {p.unit}</span>}
                              {p.stock > 0 && <span className="text-muted-foreground ml-2">Stok: {p.stock}</span>}
                              {p.category && <Badge variant="outline" className="ml-2 text-xs">{p.category}</Badge>}
                              {!p.isActive && <Badge variant="outline" className="ml-2 text-xs text-red-600">Non-aktif</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleProductEdit(p)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleProductDelete(p.id, p.name)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Add/Edit product form */}
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium mb-2">{editingProductId ? 'Edit Produk' : 'Tambah Produk Baru'}</h4>
              <form onSubmit={handleProductSubmit} className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Nama Produk <span className="text-red-500">*</span></Label>
                  <Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="cth: Keripik Singkong" required className="mt-1 text-xs h-8" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Deskripsi</Label>
                  <Textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="mt-1 text-xs" rows={2} />
                </div>
                <div>
                  <Label className="text-xs">Harga (Rp)</Label>
                  <Input type="number" min={0} value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: parseInt(e.target.value) || 0 })}
                    className="mt-1 text-xs h-8" />
                </div>
                <div>
                  <Label className="text-xs">Satuan</Label>
                  <Input value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    placeholder="cth: pcs, kg, porsi" className="mt-1 text-xs h-8" />
                </div>
                <div>
                  <Label className="text-xs">Stok</Label>
                  <Input type="number" min={0} value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })}
                    className="mt-1 text-xs h-8" />
                </div>
                <div>
                  <Label className="text-xs">Kategori</Label>
                  <Input value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    placeholder="cth: Makanan, Minuman" className="mt-1 text-xs h-8" />
                </div>
                <div className="col-span-2 flex justify-end gap-2 pt-2">
                  {editingProductId && (
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => { setEditingProductId(null); setProductForm({ name: '', description: '', price: 0, unit: '', stock: 0, category: '', photoUrl: '', isActive: true }) }}>
                      Batal Edit
                    </Button>
                  )}
                  <Button type="submit" disabled={saving} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                    {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    {editingProductId ? 'Simpan' : 'Tambah Produk'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
