// LAPRA 08 - Program & Kegiatan Menu (Restructured)
// 4 tabs: Program Kerja, Aksi Sosial & Sinergi, Kemitraan, Agenda & Kegiatan
// Each tab has 3 sub-levels: DPN, DPD, DPC (territory hierarchy)
// Each level supports: upload multi-format file, view bukti, edit, delete
'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api-client'
import { useAuthStore, useToastStore } from '@/lib/store'
import { PageHeader, LoadingState, EmptyState } from '@/components/ui-helpers'
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Briefcase, HandHeart, Users, CalendarClock, CalendarDays, Plus,
  Edit, Trash2, Eye, Upload, Loader2, Search, RefreshCw,
  Building2, MapPin, FileText, Image as ImageIcon, Video, FileCheck,
  ChevronRight, Globe, Download, X, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react'
import { formatDateTimeID } from '@/lib/format'

// ============================================================
// TYPES
// ============================================================
type Level = 'DPN' | 'DPD' | 'DPC'
type Category = 'PROGRAM_KERJA' | 'AKSI_SOSIAL' | 'KEMITRAAN' | 'AGENDA'
type Status = 'DIRENCANAKAN' | 'BERJALAN' | 'SELESAI' | 'DITUNDA'

interface ProgramDoc {
  id: string
  title: string
  description?: string
  category: Category
  level: Level
  territoryCode?: string | null
  territoryName?: string | null
  territoryId?: string | null
  location?: string
  date?: string
  status: Status
  fileName?: string | null
  fileType?: string | null
  fileSize?: number
  uploadedBy: string
  uploadedAt: string
  updatedAt?: string
}

interface Territory {
  id: string
  name: string
  code: string
  level: string
  parentId?: string | null
}

// ============================================================
// MAIN MENU — 4 tabs x 3 sub-levels
// ============================================================
export function ProgramKegiatanMenu() {
  const [tab, setTab] = useState<Category>('PROGRAM_KERJA')
  const tabs: { key: Category; label: string; icon: any; color: string }[] = [
    { key: 'PROGRAM_KERJA', label: 'Program Kerja', icon: Briefcase, color: 'from-blue-500 to-indigo-600' },
    { key: 'AKSI_SOSIAL', label: 'Aksi Sosial & Sinergi', icon: HandHeart, color: 'from-emerald-500 to-teal-600' },
    { key: 'KEMITRAAN', label: 'Kemitraan', icon: Users, color: 'from-purple-500 to-pink-600' },
    { key: 'AGENDA', label: 'Agenda & Kegiatan', icon: CalendarClock, color: 'from-orange-500 to-red-600' },
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
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
          v2.0 — Hierarki DPN/DPD/DPC
        </Badge>
        <span className="text-muted-foreground">
          Pilih tab kategori → pilih sub-tab level (DPN/DPD/DPC) → upload / lihat / edit / hapus dokumen
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

      {/* Konten tab aktif */}
      <ProgramLevelManager category={tab} title={activeTab.label} icon={activeTab.icon} accentColor={activeTab.color} />
    </div>
  )
}

// ============================================================
// LEVEL MANAGER — 3 sub-levels (DPN/DPD/DPC) per category
// ============================================================
function ProgramLevelManager({
  category,
  title,
  icon: Icon,
  accentColor,
}: {
  category: Category
  title: string
  icon: any
  accentColor: string
}) {
  const [level, setLevel] = useState<Level>('DPN')
  const [territories, setTerritories] = useState<Territory[]>([])
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('')

  // Load territories for filter dropdown (DPD/DPC levels)
  useEffect(() => {
    if (level === 'DPN') return
    api('/api/territory').then((all: any[]) => {
      const filtered = (all || []).filter((t: any) =>
        level === 'DPD' ? t.level === 'PROVINCE' : t.level === 'REGENCY'
      )
      setTerritories(filtered)
    }).catch(() => {})
  }, [level])

  return (
    <div className="space-y-4">
      {/* Header dengan ikon kategori */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${accentColor} text-white`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-xs">
                Kelola dokumen & bukti pelaksanaan per tingkat pengurus
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Sub-tab level: DPN / DPD / DPC */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'DPN' as Level, label: 'DPN — Pimpinan Pusat Nasional', icon: Building2, desc: 'Program nasional level pusat' },
          { key: 'DPD' as Level, label: 'DPD — Pimpinan Daerah (Provinsi)', icon: Globe, desc: 'Program tingkat provinsi & LN' },
          { key: 'DPC' as Level, label: 'DPC — Pimpinan Cabang (Kab/Kota)', icon: MapPin, desc: 'Program tingkat kabupaten/kota' },
        ]).map((lv) => (
          <button
            key={lv.key}
            onClick={() => { setLevel(lv.key); setSelectedTerritoryId('') }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
              level === lv.key
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-sm'
                : 'border hover:bg-accent'
            }`}
            title={lv.desc}
          >
            <lv.icon className="w-4 h-4" /> {lv.label}
          </button>
        ))}
      </div>

      {/* Filter wilayah untuk DPD/DPC */}
      {level !== 'DPN' && territories.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                {level === 'DPD' ? 'Filter Provinsi:' : 'Filter Kabupaten/Kota:'}
              </Label>
              <Select value={selectedTerritoryId} onValueChange={setSelectedTerritoryId}>
                <SelectTrigger className="w-64 h-9 text-sm">
                  <SelectValue placeholder="Semua wilayah" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua wilayah</SelectItem>
                  {territories.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-xs">
                {territories.length} wilayah tersedia
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daftar dokumen untuk level terpilih */}
      <ProgramDocList
        category={category}
        level={level}
        territoryId={selectedTerritoryId}
        territories={territories}
        accentColor={accentColor}
      />
    </div>
  )
}

// ============================================================
// DOC LIST — list dokumen + tombol upload
// ============================================================
function ProgramDocList({
  category,
  level,
  territoryId,
  territories,
  accentColor,
}: {
  category: Category
  level: Level
  territoryId: string
  territories: Territory[]
  accentColor: string
}) {
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  const [docs, setDocs] = useState<ProgramDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<ProgramDoc | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<ProgramDoc | null>(null)
  const [viewingDoc, setViewingDoc] = useState<ProgramDoc | null>(null)

  const loadData = () => {
    setLoading(true)
    const params = new URLSearchParams({ category, level })
    api(`/api/program-documents?${params.toString()}`)
      .then((data: any[]) => {
        let filtered = data || []
        // Client-side filter by territoryId (extra safety)
        if (territoryId) {
          filtered = filtered.filter((d) => d.territoryId === territoryId)
        }
        // Client-side search
        if (search.trim()) {
          const q = search.toLowerCase()
          filtered = filtered.filter(
            (d) =>
              d.title?.toLowerCase().includes(q) ||
              d.description?.toLowerCase().includes(q) ||
              d.location?.toLowerCase().includes(q)
          )
        }
        setDocs(filtered)
      })
      .catch((e: any) => {
        addToast(`Gagal memuat dokumen: ${e.message}`, 'error')
        setDocs([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [category, level, territoryId])

  // Refresh saat search berubah (debounced via useEffect)
  useEffect(() => {
    const t = setTimeout(() => loadData(), 300)
    return () => clearTimeout(t)
  }, [search])

  // === Handler: View bukti (buka file di tab baru via authenticated fetch + blob) ===
  const handleViewBukti = async (doc: ProgramDoc) => {
    setViewingDoc(doc)
    try {
      const userId = user?.id || ''
      const res = await fetch(`/api/program-documents/${doc.id}/view`, {
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
      addToast(`Gagal membuka file: ${e.message}`, 'error')
    } finally {
      setViewingDoc(null)
    }
  }

  // === Handler: Download file ===
  const handleDownload = async (doc: ProgramDoc) => {
    try {
      const userId = user?.id || ''
      const res = await fetch(`/api/program-documents/${doc.id}/view`, {
        headers: { 'x-user-id': userId },
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
      addToast(`File "${doc.fileName}" didownload`, 'success')
    } catch (e: any) {
      addToast(`Gagal download: ${e.message}`, 'error')
    }
  }

  // === Helper: ikon berdasarkan jenis file ===
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

  // === Helper: format ukuran file ===
  const formatFileSize = (bytes: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  // === Helper: badge warna status ===
  const getStatusBadge = (status: Status) => {
    const map: Record<Status, { variant: any; icon: any; label: string }> = {
      DIRENCANAKAN: { variant: 'secondary', icon: Clock, label: 'Direncanakan' },
      BERJALAN: { variant: 'default', icon: AlertTriangle, label: 'Berjalan' },
      SELESAI: { variant: 'outline', icon: CheckCircle2, label: 'Selesai' },
      DITUNDA: { variant: 'destructive', icon: X, label: 'Ditunda' },
    }
    const cfg = map[status] || map.DIRENCANAKAN
    return (
      <Badge variant={cfg.variant} className="text-xs gap-1">
        <cfg.icon className="w-3 h-3" /> {cfg.label}
      </Badge>
    )
  }

  if (loading) return <LoadingState message={`Memuat dokumen ${level}...`} />

  return (
    <div className="space-y-4">
      {/* Toolbar: search + upload */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari judul / deskripsi / lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-1">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
        <Button
          size="sm"
          onClick={() => setUploadOpen(true)}
          className={`gap-1 bg-gradient-to-r ${accentColor} hover:opacity-90`}
        >
          <Plus className="w-4 h-4" /> Upload Dokumen {level}
        </Button>
      </div>

      {/* Stats ringkas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <Card className="p-3">
          <div className="text-muted-foreground">Total Dokumen</div>
          <div className="text-xl font-bold">{docs.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-muted-foreground">Selesai</div>
          <div className="text-xl font-bold text-green-600">
            {docs.filter((d) => d.status === 'SELESAI').length}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-muted-foreground">Berjalan</div>
          <div className="text-xl font-bold text-blue-600">
            {docs.filter((d) => d.status === 'BERJALAN').length}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-muted-foreground">Direncanakan</div>
          <div className="text-xl font-bold text-orange-600">
            {docs.filter((d) => d.status === 'DIRENCANAKAN').length}
          </div>
        </Card>
      </div>

      {/* Empty state */}
      {docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={`Belum ada dokumen ${level}`}
          description={`Upload dokumen bukti pelaksanaan ${level} untuk kategori ini. Mendukung PDF, gambar, dokumen, video, dan audio.`}
          action={
            <Button onClick={() => setUploadOpen(true)} className={`gap-1 bg-gradient-to-r ${accentColor}`}>
              <Upload className="w-4 h-4" /> Upload Sekarang
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc) => {
            const FileIcon = getFileIcon(doc.fileType)
            return (
              <Card key={doc.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded bg-orange-50 text-orange-600 shrink-0">
                        <FileIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm truncate" title={doc.title}>
                          {doc.title}
                        </CardTitle>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="truncate">{doc.fileName || 'Tanpa file'}</span>
                          {doc.fileSize ? (
                            <span className="shrink-0">• {formatFileSize(doc.fileSize)}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-2">
                  {doc.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3">{doc.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    {doc.location && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {doc.location}
                      </div>
                    )}
                    {doc.date && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CalendarClock className="w-3 h-3" /> {formatDateTimeID(doc.date)}
                      </div>
                    )}
                    {level !== 'DPN' && doc.territoryName && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Globe className="w-3 h-3" /> {doc.territoryName}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-3 h-3" /> {doc.uploadedBy}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground border-t pt-1.5">
                    Update: {formatDateTimeID(doc.updatedAt || doc.uploadedAt)}
                  </div>
                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-1 mt-auto pt-2">
                    {doc.fileName && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewBukti(doc)}
                          disabled={viewingDoc?.id === doc.id}
                          className="gap-1 text-xs h-7"
                        >
                          {viewingDoc?.id === doc.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                          Lihat
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(doc)}
                          className="gap-1 text-xs h-7"
                        >
                          <Download className="w-3 h-3" /> Unduh
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditDoc(doc)}
                      className="gap-1 text-xs h-7"
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteDoc(doc)}
                      className="gap-1 text-xs h-7 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Upload Dialog */}
      {uploadOpen && (
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          category={category}
          level={level}
          territories={territories}
          onSuccess={() => { setUploadOpen(false); loadData() }}
        />
      )}

      {/* Edit Dialog */}
      {editDoc && (
        <EditDialog
          doc={editDoc}
          open={!!editDoc}
          onOpenChange={(o) => !o && setEditDoc(null)}
          territories={territories}
          onSuccess={() => { setEditDoc(null); loadData() }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteDoc && (
        <AlertDialog open={!!deleteDoc} onOpenChange={(o) => !o && setDeleteDoc(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus dokumen ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Anda akan menghapus <strong>{deleteDoc.title}</strong> ({deleteDoc.level}).
                {deleteDoc.fileName && (
                  <>
                    {' '}File <strong>{deleteDoc.fileName}</strong> juga akan dihapus permanen.
                  </>
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
  territories,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  category: Category
  level: Level
  territories: Territory[]
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
  const [selectedTerritoryId, setSelectedTerritoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form saat dialog dibuka
  useEffect(() => {
    if (open) {
      setForm({ title: '', description: '', location: '', date: '', status: 'DIRENCANAKAN' })
      setFile(null)
      setSelectedTerritoryId('')
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
    if (level !== 'DPN' && !selectedTerritoryId) {
      addToast(`Pilih wilayah ${level === 'DPD' ? 'provinsi' : 'kabupaten/kota'}`, 'error')
      return
    }

    setSaving(true)
    try {
      // Ambil territoryCode + territoryName
      let territoryCode = ''
      let territoryName = ''
      if (selectedTerritoryId) {
        const t = territories.find((x) => x.id === selectedTerritoryId)
        if (t) {
          territoryCode = t.code
          territoryName = t.name
        }
      }

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
      formData.append('territoryId', selectedTerritoryId)

      // Gunakan fetch langsung karena api() expect JSON
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
          <DialogTitle>Upload Dokumen {level} — {category.replace('_', ' ')}</DialogTitle>
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
              Ekstensi yang didukung: PDF, JPG, PNG, WebP, GIF, DOC/DOCX, XLS/XLSX, PPT/PPTX, MP4, MOV, WebM, MP3, WAV, TXT, CSV
            </p>
          </div>

          {/* Wilayah — hanya untuk DPD/DPC */}
          {level !== 'DPN' && (
            <div className="space-y-1.5">
              <Label>Wilayah {level === 'DPD' ? 'Provinsi' : 'Kabupaten/Kota'} *</Label>
              <Select value={selectedTerritoryId} onValueChange={setSelectedTerritoryId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Pilih ${level === 'DPD' ? 'provinsi' : 'kabupaten/kota'}`} />
                </SelectTrigger>
                <SelectContent>
                  {territories.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
          <Button onClick={handleSubmit} disabled={saving} className="gap-1">
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
  territories,
  onSuccess,
}: {
  doc: ProgramDoc
  open: boolean
  onOpenChange: (o: boolean) => void
  territories: Territory[]
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
  const [selectedTerritoryId, setSelectedTerritoryId] = useState(doc.territoryId || '')
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
      if (replaceFile && newFile) {
        // Replace file via multipart
        let territoryCode = doc.territoryCode || ''
        let territoryName = doc.territoryName || ''
        if (selectedTerritoryId) {
          const t = territories.find((x) => x.id === selectedTerritoryId)
          if (t) { territoryCode = t.code; territoryName = t.name }
        }

        const formData = new FormData()
        formData.append('file', newFile)
        formData.append('title', form.title)
        formData.append('description', form.description)
        formData.append('location', form.location)
        formData.append('date', form.date)
        formData.append('status', form.status)
        formData.append('territoryCode', territoryCode)
        formData.append('territoryName', territoryName)
        formData.append('territoryId', selectedTerritoryId)

        const res = await fetch(`/api/program-documents/${doc.id}`, {
          method: 'PUT',
          headers: { 'x-user-id': user?.id || '' },
          body: formData,
        })
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
        addToast('File & metadata berhasil diperbarui', 'success')
      } else {
        // Update metadata only via JSON
        let territoryCode = doc.territoryCode
        let territoryName = doc.territoryName
        if (selectedTerritoryId !== (doc.territoryId || '')) {
          const t = territories.find((x) => x.id === selectedTerritoryId)
          if (t) { territoryCode = t.code; territoryName = t.name }
        }

        await api(`/api/program-documents/${doc.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...form,
            territoryCode,
            territoryName,
            territoryId: selectedTerritoryId,
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
            Level: {doc.level} • Kategori: {doc.category.replace('_', ' ')}
            {doc.fileName && (
              <>
                {' '}• File saat ini: <strong>{doc.fileName}</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {/* Opsi replace file */}
          {doc.fileName && (
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

          {/* Wilayah (untuk DPD/DPC) */}
          {doc.level !== 'DPN' && territories.length > 0 && (
            <div className="space-y-1.5">
              <Label>Wilayah {doc.level === 'DPD' ? 'Provinsi' : 'Kabupaten/Kota'}</Label>
              <Select value={selectedTerritoryId} onValueChange={setSelectedTerritoryId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Pilih ${doc.level === 'DPD' ? 'provinsi' : 'kabupaten/kota'}`} />
                </SelectTrigger>
                <SelectContent>
                  {territories.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
