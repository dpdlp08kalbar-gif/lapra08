'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { PageHeader, LoadingState, ErrorState, EmptyState, StatCard } from '@/components/ui-helpers'
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
import { useToastStore, useAuthStore } from '@/lib/store'
import { formatDateID, formatDateTimeID } from '@/lib/format'
import {
  Building2, Plus, FileText, Trash2, Edit, Crown, User, Phone, Mail,
  MoreVertical, Eye, UserPlus, Building, ShieldCheck, ScanText,
  Upload, FileImage, FileCheck, FileX, Loader2, Search, Filter,
  Network, Layers, MapPin, Award,
} from 'lucide-react'

interface OrgPosition {
  id: string
  fullName: string
  positionName: string
  level: string
  territoryId: string
  territory: { id: string; name: string; code: string; level: string }
  phone: string | null
  email: string | null
  photoUrl: string | null
  startDate: string | null
  endDate: string | null
  isActive: boolean
  order: number
}

interface SKDocument {
  id: string
  skNumber: string
  title: string
  description: string | null
  fileUrl: string
  fileName: string | null
  fileType: string | null
  fileSize: number | null
  ocrStatus: string
  extractedText: string | null
  ocrMetadata: string | null
  issuedAt: string
  issuedBy: string
  territoryId: string
  territory: { id: string; name: string; code: string }
}

interface Territory {
  id: string
  code: string
  name: string
  level: string
  category: string
  parentId: string | null
  isActive: boolean
  canEdit?: boolean
}

const LEVEL_LABELS: Record<string, string> = {
  DPN: 'DPN (Pusat Nasional)',
  DPD: 'DPD (Provinsi)',
  DPC: 'DPC (Kabupaten/Kota)',
}

const LEVEL_COLORS: Record<string, string> = {
  DPN: 'bg-purple-100 text-purple-700 border-purple-200',
  DPD: 'bg-blue-100 text-blue-700 border-blue-200',
  DPC: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const LEVEL_ICONS: Record<string, any> = {
  DPN: Crown,
  DPD: Building2,
  DPC: MapPin,
}

const OCR_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Menunggu', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Loader2 },
  PROCESSING: { label: 'Memproses OCR', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Loader2 },
  COMPLETED: { label: 'OCR Selesai', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: FileCheck },
  FAILED: { label: 'OCR Gagal', color: 'bg-red-100 text-red-700 border-red-200', icon: FileX },
}

const FILE_TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pdf: { label: 'PDF', color: 'bg-red-100 text-red-700', icon: FileText },
  image: { label: 'Gambar', color: 'bg-blue-100 text-blue-700', icon: FileImage },
  scan: { label: 'Scan', color: 'bg-amber-100 text-amber-700', icon: ScanText },
  doc: { label: 'Document', color: 'bg-indigo-100 text-indigo-700', icon: FileText },
}

export function OrganizationMenu() {
  const [tab, setTab] = useState('positions')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Struktur Pengurus & SK"
        description="Pendataan pengurus DPN/DPD/DPC + arsip Surat Keputusan digital dengan OCR"
        icon={Building2}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="positions">
            <Building2 className="w-4 h-4 mr-2" />
            Struktur Pengurus
          </TabsTrigger>
          <TabsTrigger value="sk">
            <FileText className="w-4 h-4 mr-2" />
            E-SK (Surat Keputusan)
          </TabsTrigger>
        </TabsList>
        <TabsContent value="positions" className="mt-4">
          <PositionsTab />
        </TabsContent>
        <TabsContent value="sk" className="mt-4">
          <SKTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// POSITIONS TAB - Per Level dengan CRUD
// ============================================================
function PositionsTab() {
  const user = useAuthStore((s) => s.user)!
  const addToast = useToastStore((s) => s.addToast)
  const [positions, setPositions] = useState<OrgPosition[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeLevel, setActiveLevel] = useState('DPN')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editPosition, setEditPosition] = useState<OrgPosition | null>(null)
  const [deletePosition, setDeletePosition] = useState<OrgPosition | null>(null)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api('/api/organization'),
      api('/api/territory'),
    ])
      .then(([p, t]) => {
        setPositions(p)
        setTerritories(t)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleDelete = async () => {
    if (!deletePosition) return
    try {
      await api(`/api/organization/${deletePosition.id}`, { method: 'DELETE' })
      addToast(`Pengurus "${deletePosition.fullName}" berhasil dihapus`, 'success')
      setDeletePosition(null)
      loadData()
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const levels = ['DPN', 'DPD', 'DPC']
  
  // Filter positions berdasarkan level aktif & search
  const filtered = positions.filter((p) => {
    if (activeLevel && p.level !== activeLevel) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.positionName.toLowerCase().includes(q) ||
        p.territory.name.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Statistik per level
  const stats = levels.reduce((acc, level) => {
    acc[level] = positions.filter((p) => p.level === level && p.isActive).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-4">
      {/* Statistik per level */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {levels.map((level) => {
          const Icon = LEVEL_ICONS[level]
          const colorMap: Record<string, string> = {
            DPN: 'purple',
            DPD: 'blue',
            DPC: 'emerald',
          }
          return (
            <button
              key={level}
              onClick={() => setActiveLevel(level)}
              className={`text-left transition-all ${activeLevel === level ? 'ring-2 ring-orange-500 ring-offset-2' : ''}`}
            >
              <StatCard
                label={LEVEL_LABELS[level].split(' (')[0]}
                value={stats[level] || 0}
                icon={Icon}
                color={colorMap[level] as any || 'orange'}
              />
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, jabatan, atau wilayah..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={activeLevel} onValueChange={setActiveLevel}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {levels.map((level) => (
                <SelectItem key={level} value={level}>{LEVEL_LABELS[level]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> Tambah Pengurus
        </Button>
      </div>

      {/* Daftar pengurus dalam card grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Belum ada pengurus"
          description={`Belum ada data pengurus ${LEVEL_LABELS[activeLevel]}. Klik "Tambah Pengurus" untuk mulai.`}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.sort((a, b) => a.order - b.order).map((p) => {
            const Icon = LEVEL_ICONS[p.level] || User
            return (
              <Card key={p.id} className={`group hover:shadow-md transition-shadow ${!p.isActive ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{p.fullName}</div>
                          <div className="text-sm text-orange-600 font-medium">{p.positionName}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-[13px] ${LEVEL_COLORS[p.level]}`}>
                              <Icon className="w-3 h-3 mr-1" />
                              {LEVEL_LABELS[p.level].split(' (')[0]}
                            </Badge>
                            <Badge variant="outline" className="text-[13px]">
                              {p.territory.name}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditPosition(p)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit Pengurus
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletePosition(p)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {p.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3" />
                            {p.phone}
                          </div>
                        )}
                        {p.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{p.email}</span>
                          </div>
                        )}
                        {p.startDate && (
                          <div className="text-[13px]">
                            Sejak: {formatDateID(p.startDate)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialogs */}
      <AddPositionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        territories={territories}
        defaultLevel={activeLevel}
        onSuccess={() => { loadData(); setAddOpen(false); addToast('Pengurus baru berhasil ditambahkan', 'success') }}
      />

      <EditPositionDialog
        position={editPosition}
        territories={territories}
        onOpenChange={(o) => !o && setEditPosition(null)}
        onSuccess={() => { loadData(); setEditPosition(null); addToast('Pengurus berhasil diperbarui', 'success') }}
      />

      <AlertDialog open={!!deletePosition} onOpenChange={(o) => !o && setDeletePosition(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Pengurus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengurus <strong>{deletePosition?.fullName}</strong> ({deletePosition?.positionName})?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// SK TAB - Upload dengan OCR + CRUD
// ============================================================
function SKTab() {
  const user = useAuthStore((s) => s.user)!
  const addToast = useToastStore((s) => s.addToast)
  const [docs, setDocs] = useState<SKDocument[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<SKDocument | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<SKDocument | null>(null)
  const [viewDoc, setViewDoc] = useState<SKDocument | null>(null)
  const [search, setSearch] = useState('')

  const loadData = () => {
    setLoading(true)
    Promise.all([api('/api/sk'), api('/api/territory')])
      .then(([d, t]) => { setDocs(d); setTerritories(t) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleDelete = async () => {
    if (!deleteDoc) return
    try {
      await api(`/api/sk/${deleteDoc.id}`, { method: 'DELETE' })
      addToast(`SK "${deleteDoc.title}" berhasil dihapus`, 'success')
      setDeleteDoc(null)
      loadData()
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const filtered = docs.filter((d) => {
    if (search) {
      const q = search.toLowerCase()
      return d.title.toLowerCase().includes(q) || d.skNumber.toLowerCase().includes(q) || d.issuedBy.toLowerCase().includes(q)
    }
    return true
  })

  const stats = {
    total: docs.length,
    completed: docs.filter((d) => d.ocrStatus === 'COMPLETED').length,
    processing: docs.filter((d) => d.ocrStatus === 'PROCESSING').length,
    failed: docs.filter((d) => d.ocrStatus === 'FAILED').length,
  }

  return (
    <div className="space-y-4">
      {/* Statistik */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Total SK" value={stats.total} icon={FileText} color="orange" />
        <StatCard label="OCR Selesai" value={stats.completed} icon={FileCheck} color="emerald" />
        <StatCard label="Memproses" value={stats.processing} icon={Loader2} color="blue" />
        <StatCard label="Gagal" value={stats.failed} icon={FileX} color="red" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor SK, judul, atau penerbit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setUploadOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
          <Upload className="w-4 h-4 mr-2" /> Upload SK dengan OCR
        </Button>
      </div>

      {/* Daftar SK */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Belum ada dokumen SK"
          description="Upload Surat Keputusan untuk mengarsipkan secara digital. Sistem akan otomatis melakukan OCR untuk ekstraksi teks."
          action={
            <Button onClick={() => setUploadOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
              <Upload className="w-4 h-4 mr-2" /> Upload SK Pertama
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((d) => {
            const ocrConfig = OCR_STATUS_CONFIG[d.ocrStatus] || OCR_STATUS_CONFIG.PENDING
            const OcrIcon = ocrConfig.icon
            const fileConfig = FILE_TYPE_CONFIG[d.fileType || ''] || FILE_TYPE_CONFIG.doc
            const FileIcon = fileConfig.icon
            return (
              <Card key={d.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${fileConfig.color}`}>
                      <FileIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{d.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            <code className="bg-muted px-1.5 py-0.5 rounded">{d.skNumber}</code>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewDoc(d)}>
                              <Eye className="w-4 h-4 mr-2" /> Lihat Detail & OCR
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditDoc(d)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit SK
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(d.fileUrl, '_blank')}>
                              <FileImage className="w-4 h-4 mr-2" /> Buka File
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteDoc(d)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge variant="outline" className={`text-[13px] ${ocrConfig.color}`}>
                          <OcrIcon className={`w-3 h-3 mr-1 ${d.ocrStatus === 'PROCESSING' ? 'animate-spin' : ''}`} />
                          {ocrConfig.label}
                        </Badge>
                        {d.fileType && (
                          <Badge variant="outline" className={`text-[13px] ${fileConfig.color}`}>
                            {fileConfig.label}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[13px]">
                          {d.territory.name}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <div>Penerbit: <span className="font-medium text-foreground">{d.issuedBy}</span></div>
                        <div>Tanggal: {formatDateID(d.issuedAt)}</div>
                        {d.fileSize && (
                          <div>Ukuran: {(d.fileSize / 1024).toFixed(1)} KB</div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialogs */}
      <UploadSKDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        territories={territories}
        onSuccess={() => { loadData(); setUploadOpen(false); addToast('SK berhasil diupload. OCR diproses otomatis.', 'success') }}
      />

      <EditSKDialog
        doc={editDoc}
        territories={territories}
        onOpenChange={(o) => !o && setEditDoc(null)}
        onSuccess={() => { loadData(); setEditDoc(null); addToast('SK berhasil diperbarui', 'success') }}
      />

      <ViewSKDialog doc={viewDoc} onClose={() => setViewDoc(null)} />

      <AlertDialog open={!!deleteDoc} onOpenChange={(o) => !o && setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus SK</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus SK <strong>{deleteDoc?.title}</strong> ({deleteDoc?.skNumber})?
              File fisik juga akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// DIALOGS
// ============================================================

function AddPositionDialog({
  open, onOpenChange, territories, defaultLevel, onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  territories: Territory[]
  defaultLevel: string
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    fullName: '', positionName: '', level: defaultLevel || 'DPC',
    territoryId: '', phone: '', email: '', startDate: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm((f) => ({ ...f, level: defaultLevel }))
  }, [defaultLevel])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/api/organization', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          startDate: form.startDate || undefined,
        }),
      })
      setForm({ fullName: '', positionName: '', level: defaultLevel || 'DPC', territoryId: '', phone: '', email: '', startDate: '' })
      onSuccess()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Filter territories berdasarkan level
  const levelToTerritoryLevel: Record<string, string> = {
    DPN: 'COUNTRY',
    DPD: 'PROVINCE',
    DPC: 'REGENCY',
  }
  const filteredTerritories = territories.filter((t) => t.level === levelToTerritoryLevel[form.level] && t.isActive)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Pengurus</DialogTitle>
          <DialogDescription>Tambah pengurus baru ke struktur organisasi</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Nama Lengkap *</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="cth: Dr. H. Bambang Sutejo, M.Si" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Jabatan *</Label>
              <Input value={form.positionName} onChange={(e) => setForm({ ...form, positionName: e.target.value })} placeholder="cth: Ketua, Sekretaris, Bendahara" required />
            </div>
            <div className="space-y-2">
              <Label>Level *</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v, territoryId: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Wilayah *</Label>
            <Select value={form.territoryId} onValueChange={(v) => setForm({ ...form, territoryId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih wilayah..." /></SelectTrigger>
              <SelectContent>
                {filteredTerritories.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="628xxx" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tanggal Mulai Menjabat</Label>
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Pengurus'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditPositionDialog({
  position, territories, onOpenChange, onSuccess,
}: {
  position: OrgPosition | null
  territories: Territory[]
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState<any>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (position) {
      setForm({
        fullName: position.fullName,
        positionName: position.positionName,
        level: position.level,
        territoryId: position.territoryId,
        phone: position.phone || '',
        email: position.email || '',
        startDate: position.startDate ? position.startDate.split('T')[0] : '',
        isActive: position.isActive,
      })
    }
  }, [position])

  if (!position) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api(`/api/organization/${position.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      onSuccess()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const levelToTerritoryLevel: Record<string, string> = {
  }
  const filteredTerritories = territories.filter((t) => t.level === levelToTerritoryLevel[form.level || 'DPC'] && t.isActive)

  return (
    <Dialog open={!!position} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Pengurus</DialogTitle>
          <DialogDescription>Edit data <strong>{position.fullName}</strong></DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Nama Lengkap *</Label>
            <Input value={form.fullName || ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Jabatan *</Label>
              <Input value={form.positionName || ''} onChange={(e) => setForm({ ...form, positionName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={form.level || 'DPC'} onValueChange={(v) => setForm({ ...form, level: v, territoryId: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Wilayah</Label>
            <Select value={form.territoryId || ''} onValueChange={(v) => setForm({ ...form, territoryId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
              <SelectContent>
                {filteredTerritories.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input type="date" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.isActive ? 'true' : 'false'} onValueChange={(v) => setForm({ ...form, isActive: v === 'true' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Aktif</SelectItem>
                  <SelectItem value="false">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function UploadSKDialog({
  open, onOpenChange, territories, onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  territories: Territory[]
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    skNumber: '', title: '', description: '', issuedAt: '', issuedBy: '', territoryId: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
      // Validasi tipe file
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(pdf|jpg|jpeg|png|webp|tif|tiff|gif|doc|docx)$/i)) {
        addToast('Format file tidak didukung. Gunakan PDF, JPG, PNG, DOC, atau TIFF', 'error')
        return
      }
      setFile(selectedFile)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    handleFileChange(e.dataTransfer.files[0])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      addToast('File SK wajib diupload', 'error')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('territoryId', form.territoryId)
      formData.append('skNumber', form.skNumber)
      formData.append('title', form.title)
      formData.append('description', form.description)
      formData.append('issuedAt', form.issuedAt || new Date().toISOString())
      formData.append('issuedBy', form.issuedBy)

      const res = await fetch('/api/sk/upload', {
        method: 'POST',
        headers: {
          'x-user-id': (useAuthStore.getState().user)?.id || '',
        },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload gagal')
      }
      setForm({ skNumber: '', title: '', description: '', issuedAt: '', issuedBy: '', territoryId: '' })
      setFile(null)
      onSuccess()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Surat Keputusan (SK)</DialogTitle>
          <DialogDescription>
            Upload file SK untuk diarsipkan. Sistem akan otomatis melakukan OCR untuk ekstraksi teks & metadata.
            Mendukung: PDF, JPG/PNG (foto/scan), DOC/DOCX, TIFF.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Drop zone */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false) }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive ? 'border-orange-500 bg-orange-50' : 'border-gray-300'
            }`}
          >
            {file ? (
              <div>
                <FileCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <div className="font-medium text-sm">{file.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {(file.size / 1024).toFixed(1)} KB • {file.type || 'unknown'}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-red-600"
                  onClick={() => setFile(null)}
                >
                  Ganti File
                </Button>
              </div>
            ) : (
              <div>
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <div className="text-sm font-medium">Drag & drop file SK di sini</div>
                <div className="text-xs text-muted-foreground mt-1">atau klik untuk pilih file</div>
                <input
                  type="file"
                  className="hidden"
                  id="file-input"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.tif,.tiff,.gif,.doc,.docx"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  Pilih File
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nomor SK</Label>
              <Input value={form.skNumber} onChange={(e) => setForm({ ...form, skNumber: e.target.value })} placeholder="cth: SK-001/2026" />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Terbit *</Label>
              <Input type="date" value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Judul SK *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="cth: SK Pelantikan Pengurus DPN" required />
          </div>
          <div className="space-y-2">
            <Label>Penerbit SK *</Label>
            <Input value={form.issuedBy} onChange={(e) => setForm({ ...form, issuedBy: e.target.value })} placeholder="cth: Ketua Dewan Pembina" required />
          </div>
          <div className="space-y-2">
            <Label>Wilayah *</Label>
            <Select value={form.territoryId} onValueChange={(v) => setForm({ ...form, territoryId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih wilayah..." /></SelectTrigger>
              <SelectContent>
                {territories.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Ringkasan isi SK..." />
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
            <ScanText className="w-4 h-4 inline mr-1" />
            <strong>OCR Otomatis:</strong> Setelah upload, sistem akan otomatis mengekstrak teks dari file SK menggunakan AI Vision. Untuk PDF berbasis teks, metadata akan diekstrak. Untuk scan/gambar, VLM akan membaca konten visual.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading || !file}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading & OCR...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" /> Upload & Proses OCR
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditSKDialog({
  doc, territories, onOpenChange, onSuccess,
}: {
  doc: SKDocument | null
  territories: Territory[]
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState<any>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (doc) {
      setForm({
        skNumber: doc.skNumber,
        title: doc.title,
        description: doc.description || '',
        issuedAt: doc.issuedAt.split('T')[0],
        issuedBy: doc.issuedBy,
        territoryId: doc.territoryId,
      })
    }
  }, [doc])

  if (!doc) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api(`/api/sk/${doc.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      onSuccess()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit SK</DialogTitle>
          <DialogDescription>Edit data SK <strong>{doc.title}</strong></DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nomor SK</Label>
              <Input value={form.skNumber || ''} onChange={(e) => setForm({ ...form, skNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Terbit</Label>
              <Input type="date" value={form.issuedAt || ''} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Judul SK</Label>
            <Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Penerbit</Label>
            <Input value={form.issuedBy || ''} onChange={(e) => setForm({ ...form, issuedBy: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Wilayah</Label>
            <Select value={form.territoryId || ''} onValueChange={(v) => setForm({ ...form, territoryId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {territories.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ViewSKDialog({ doc, onClose }: { doc: SKDocument | null; onClose: () => void }) {
  if (!doc) return null

  const ocrConfig = OCR_STATUS_CONFIG[doc.ocrStatus] || OCR_STATUS_CONFIG.PENDING
  const OcrIcon = ocrConfig.icon
  const fileConfig = FILE_TYPE_CONFIG[doc.fileType || ''] || FILE_TYPE_CONFIG.doc
  const FileIcon = fileConfig.icon

  let ocrMetadata: any = null
  try {
    if (doc.ocrMetadata) ocrMetadata = JSON.parse(doc.ocrMetadata)
  } catch {}

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{doc.title}</DialogTitle>
          <DialogDescription>
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{doc.skNumber}</code>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${fileConfig.color}`}>
              <FileIcon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{doc.fileName || 'Unknown file'}</div>
              <div className="text-xs text-muted-foreground">
                {fileConfig.label} • {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(doc.fileUrl, '_blank')}
            >
              <FileImage className="w-4 h-4 mr-2" /> Buka
            </Button>
          </div>

          {/* Metadata SK */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Penerbit</div>
              <div className="font-medium">{doc.issuedBy}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tanggal Terbit</div>
              <div className="font-medium">{formatDateID(doc.issuedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Wilayah</div>
              <div className="font-medium">{doc.territory.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status OCR</div>
              <Badge variant="outline" className={`text-xs ${ocrConfig.color}`}>
                <OcrIcon className={`w-3 h-3 mr-1 ${doc.ocrStatus === 'PROCESSING' ? 'animate-spin' : ''}`} />
                {ocrConfig.label}
              </Badge>
            </div>
          </div>

          {doc.description && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Deskripsi</div>
              <div className="text-sm bg-muted/50 p-3 rounded-lg">{doc.description}</div>
            </div>
          )}

          {/* OCR Results */}
          {doc.ocrStatus === 'COMPLETED' && (
            <div>
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <ScanText className="w-3 h-3" /> Hasil Ekstraksi OCR
              </div>
              <div className="text-sm bg-emerald-50 border border-emerald-200 p-3 rounded-lg max-h-48 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-xs">{doc.extractedText}</pre>
              </div>
            </div>
          )}

          {/* Auto-detected metadata */}
          {ocrMetadata && ocrMetadata.autoDetected && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Metadata Auto-Detected</div>
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg space-y-1 text-xs">
                {ocrMetadata.nomorSK && <div><strong>Nomor SK:</strong> {ocrMetadata.nomorSK}</div>}
                {ocrMetadata.tanggalTerbit && <div><strong>Tanggal:</strong> {ocrMetadata.tanggalTerbit}</div>}
                {ocrMetadata.penerbit && <div><strong>Penerbit:</strong> {ocrMetadata.penerbit}</div>}
                {ocrMetadata.jabatanPenerbit && <div><strong>Jabatan:</strong> {ocrMetadata.jabatanPenerbit}</div>}
                {ocrMetadata.tentang && <div><strong>Subjek:</strong> {ocrMetadata.tentang}</div>}
                {ocrMetadata.masaBakti && <div><strong>Masa Bakti:</strong> {ocrMetadata.masaBakti}</div>}
                {ocrMetadata.pihakDilantik && Array.isArray(ocrMetadata.pihakDilantik) && ocrMetadata.pihakDilantik.length > 0 && (
                  <div>
                    <strong>Pihak Dilantik:</strong>
                    <ul className="ml-4 list-disc mt-1">
                      {ocrMetadata.pihakDilantik.map((name: string, i: number) => (
                        <li key={i}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
