'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api-client'
import { PageHeader, LoadingState, ErrorState, EmptyState, StatCard } from '@/components/ui-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  Database, Crown, Building, MapPin, Users, FileText, Plus, Edit, Trash2,
  MoreVertical, Upload, Phone, Mail, User, ArrowLeft, Search, Building2,
  ShieldCheck, FileCheck, ScanText, Lock, ChevronRight, Layers, Loader2,
} from 'lucide-react'

// ============================================================
// TIPE DATA
// ============================================================
interface Territory {
  id: string; code: string; name: string; level: string; category: string
  parentId: string | null; isActive: boolean; canEdit?: boolean
  _count?: { children: number; members: number; users: number }
}

interface OrgPosition {
  id: string; fullName: string; positionName: string; level: string
  territoryId: string; territory: { id: string; name: string; code: string }
  phone: string | null; email: string | null; photoUrl: string | null
  startDate: string | null; isActive: boolean; order: number
}

interface Member {
  id: string; memberNumber: string; fullName: string; nik: string | null
  phone: string; email: string | null; shirtSize: string | null
  profession: string | null; gender: string | null
  territoryId: string; territory: { id: string; name: string; code: string }
  status: string; registeredAt: string; canEdit?: boolean
}

interface SKDocument {
  id: string; skNumber: string; title: string; description: string | null
  fileUrl: string; fileName: string | null; fileType: string | null
  fileSize: number | null; ocrStatus: string; extractedText: string | null
  ocrMetadata: string | null; issuedAt: string; issuedBy: string
  territoryId: string; territory: { id: string; name: string; code: string }
}

const LEVEL_LABELS: Record<string, string> = {
  DPN: 'DPN (Pusat Nasional)', DPD: 'DPD (Provinsi)', DPC: 'DPC (Kabupaten/Kota)',
}
const LEVEL_COLORS: Record<string, string> = {
  DPN: 'bg-purple-100 text-purple-700 border-purple-200',
  DPD: 'bg-blue-100 text-blue-700 border-blue-200',
  DPC: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  VERIFIED: { label: 'Terverifikasi', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  ACTIVE: { label: 'Aktif', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Ditolak', color: 'bg-red-100 text-red-700 border-red-200' },
  INACTIVE: { label: 'Nonaktif', color: 'bg-gray-100 text-gray-700 border-gray-200' },
}

// ============================================================
// KOMPONEN UTAMA - Landing page dengan 3 kartu menu
// ============================================================
export function PusatDataMenu() {
  const [page, setPage] = useState<'landing' | 'dpn' | 'dpd' | 'dpc'>('landing')
  const [selectedDpd, setSelectedDpd] = useState<Territory | null>(null)
  const [selectedDpc, setSelectedDpc] = useState<Territory | null>(null)

  if (page === 'dpn') {
    return <DpnPage onBack={() => setPage('landing')} />
  }
  if (page === 'dpd') {
    if (selectedDpd) {
      return <DpdDetailPage dpd={selectedDpd} onBack={() => { setSelectedDpd(null); setPage('dpd') }} />
    }
    return <DpdListPage onBack={() => setPage('landing')} onSelectDpd={setSelectedDpd} />
  }
  if (page === 'dpc') {
    if (selectedDpc) {
      return <DpcDetailPage dpc={selectedDpc} onBack={() => { setSelectedDpc(null); setPage('dpc') }} />
    }
    return <DpcListPage onBack={() => setPage('landing')} onSelectDpc={setSelectedDpc} />
  }

  // Landing page dengan 3 kartu besar
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pusat Data Organisasi"
        description="Pilih tingkat kepengurusan untuk mengelola data wilayah, pengurus, anggota & SK"
        icon={Database}
      />

      {/* 3 Kartu Menu Utama - BISA DIKLIK */}
      <div className="grid gap-4 md:grid-cols-3">
        <MenuCard
          title="DPN"
          subtitle="Pusat Nasional"
          description="Struktur Susunan Pengurus DPN + Upload SK"
          color="purple"
          icon={Crown}
          onClick={() => setPage('dpn')}
        />
        <MenuCard
          title="DPD"
          subtitle="Provinsi"
          description="Daftar DPD se-Indonesia + Luar Negeri"
          color="blue"
          icon={Building}
          onClick={() => setPage('dpd')}
        />
        <MenuCard
          title="DPC"
          subtitle="Kabupaten/Kota"
          description="Daftar DPC per DPD + Pengurus & Anggota"
          color="emerald"
          icon={MapPin}
          onClick={() => setPage('dpc')}
        />
      </div>

      {/* Info anti-duplikasi */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-emerald-900">Sistem Anti-Duplikasi Aktif</div>
            <div className="text-emerald-700 mt-1">
              Hierarki: DPN (Pusat Nasional) → DPD (Provinsi) → DPC (Kabupaten/Kota).
              DPN membawahi semua DPD, setiap DPD membawahi DPC-DPC di provinsinya.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Kartu menu besar yang dapat diklik
function MenuCard({
  title, subtitle, description, color, icon: Icon, onClick,
}: {
  title: string; subtitle: string; description: string
  color: 'purple' | 'blue' | 'emerald'
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
}) {
  const colors = {
    purple: 'from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800',
    blue: 'from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800',
    emerald: 'from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800',
  }
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${colors[color]} p-6 text-left text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl`}
    >
      <div className="absolute top-0 right-0 opacity-10">
        <Icon className="w-32 h-32 -mr-8 -mt-8" />
      </div>
      <div className="relative z-10">
        <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center mb-4">
          <Icon className="w-7 h-7" />
        </div>
        <div className="text-2xl font-black tracking-tight">{title}</div>
        <div className="text-sm opacity-90 font-medium">{subtitle}</div>
        <div className="text-xs opacity-75 mt-2">{description}</div>
        <div className="mt-4 flex items-center gap-1 text-xs font-semibold opacity-90 group-hover:gap-2 transition-all">
          Buka <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </button>
  )
}

// ============================================================
// HALAMAN DPN - Langsung tampilkan Struktur Pengurus DPN
// ============================================================
function DpnPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4">
      <BackButton onBack={onBack} label="DPN (Pusat Nasional)" />
      <PengurusSection level="DPN" territoryFilter={{ level: 'COUNTRY' }} />
      <SKSection level="DPN" territoryFilter={{ level: 'COUNTRY' }} />
    </div>
  )
}

// ============================================================
// HALAMAN DPD LIST - Daftar semua DPD
// ============================================================
function DpdListPage({ onBack, onSelectDpd }: { onBack: () => void; onSelectDpd: (t: Territory) => void }) {
  const user = useAuthStore((s) => s.user)!
  const [dpds, setDpds] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const loadData = () => {
    setLoading(true)
    api('/api/territory?level=PROVINCE')
      .then(setDpds)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  if (loading) return <><BackButton onBack={onBack} label="DPD (Provinsi)" /><LoadingState /></>
  if (error) return <><BackButton onBack={onBack} label="DPD (Provinsi)" /><ErrorState message={error} /></>

  const filtered = dpds.filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase())
  )
  const domestic = filtered.filter((d) => d.category === 'DOMESTIC')
  const intl = filtered.filter((d) => d.category === 'INTERNATIONAL')

  const canManage = user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN'

  return (
    <div className="space-y-4">
      <BackButton onBack={onBack} label="DPD (Provinsi)" />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari DPD..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        {canManage && (
          <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> Tambah DPD
          </Button>
        )}
      </div>

      {/* DPD Domestik */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building className="w-4 h-4 text-blue-600" />
            DPD Domestik ({domestic.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {domestic.map((d) => (
              <DpdCard key={d.id} dpd={d} onClick={() => onSelectDpd(d)} canManage={canManage} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* DPD Luar Negeri */}
      {intl.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="w-4 h-4 text-pink-600" />
              DPD Luar Negeri ({intl.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {intl.map((d) => (
                <DpdCard key={d.id} dpd={d} onClick={() => onSelectDpd(d)} canManage={canManage} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AddTerritoryDialog open={addOpen} onOpenChange={setAddOpen} level="PROVINCE" onSuccess={loadData} />
    </div>
  )
}

function DpdCard({ dpd, onClick, canManage }: { dpd: Territory; onClick: () => void; canManage: boolean }) {
  return (
    <div className="group rounded-lg border p-3 hover:shadow-md transition-all cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{dpd.name}</div>
          <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{dpd.code}</code>
          <div className="text-xs text-muted-foreground mt-1">
            {dpd._count?.children || 0} DPC • {dpd._count?.members || 0} anggota
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
      </div>
    </div>
  )
}

// ============================================================
// HALAMAN DPD DETAIL - Struktur Pengurus DPD + CRUD + Upload SK
// ============================================================
function DpdDetailPage({ dpd, onBack }: { dpd: Territory; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <BackButton onBack={onBack} label={`DPD ${dpd.name}`} />
      <PengurusSection level="DPD" territoryId={dpd.id} />
      <SKSection level="DPD" territoryId={dpd.id} />
    </div>
  )
}

// ============================================================
// HALAMAN DPC LIST - Filter by DPD, lalu daftar DPC
// ============================================================
function DpcListPage({ onBack, onSelectDpc }: { onBack: () => void; onSelectDpc: (t: Territory) => void }) {
  const user = useAuthStore((s) => s.user)!
  const [dpds, setDpds] = useState<Territory[]>([])
  const [selectedDpdId, setSelectedDpdId] = useState<string>('')
  const [dpcs, setDpcs] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/territory?level=PROVINCE').then((d) => {
      setDpds(d)
      // Auto-select DPD Kalbar jika user adalah DPD Kalbar, atau DPN pertama
      if (user.role === 'ADMIN_DPD') {
        setSelectedDpdId(user.territoryId)
      } else if (d.length > 0) {
        const kalbar = d.find((t: Territory) => t.code === '61')
        setSelectedDpdId(kalbar?.id || d[0].id)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedDpdId) {
      api(`/api/territory?parentId=${selectedDpdId}`).then(setDpcs).catch(() => setDpcs([]))
    } else {
      setDpcs([])
    }
  }, [selectedDpdId])

  if (loading) return <><BackButton onBack={onBack} label="DPC (Kabupaten/Kota)" /><LoadingState /></>

  const canManage = user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN' || user.role === 'ADMIN_DPD'

  return (
    <div className="space-y-4">
      <BackButton onBack={onBack} label="DPC (Kabupaten/Kota)" />

      {/* Filter DPD */}
      <div className="space-y-2">
        <Label>Pilih DPD (Provinsi) untuk melihat DPC</Label>
        <Select value={selectedDpdId} onValueChange={setSelectedDpdId}>
          <SelectTrigger className="w-full max-w-md"><SelectValue placeholder="Pilih DPD..." /></SelectTrigger>
          <SelectContent>
            {dpds.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDpdId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Daftar DPC ({dpcs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dpcs.length === 0 ? (
              <EmptyState icon={MapPin} title="Belum ada DPC" description="Belum ada DPC di DPD ini." />
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {dpcs.map((d) => (
                  <div key={d.id} className="group rounded-lg border p-3 hover:shadow-md transition-all cursor-pointer" onClick={() => onSelectDpc(d)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{d.name}</div>
                        <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{d.code}</code>
                        <div className="text-xs text-muted-foreground mt-1">
                          {d._count?.members || 0} anggota
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================
// HALAMAN DPC DETAIL - 2 Tab: Pengurus + Anggota
// ============================================================
function DpcDetailPage({ dpc, onBack }: { dpc: Territory; onBack: () => void }) {
  const [tab, setTab] = useState('pengurus')

  return (
    <div className="space-y-4">
      <BackButton onBack={onBack} label={`DPC ${dpc.name}`} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pengurus">
            <Building2 className="w-4 h-4 mr-2" /> Struktur Pengurus
          </TabsTrigger>
          <TabsTrigger value="anggota">
            <Users className="w-4 h-4 mr-2" /> Daftar Anggota
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pengurus" className="mt-4">
          <PengurusSection level="DPC" territoryId={dpc.id} />
        </TabsContent>

        <TabsContent value="anggota" className="mt-4">
          <AnggotaSection territoryId={dpc.id} />
        </TabsContent>
      </Tabs>

      {/* Arsip SK DPC - sama seperti DPD */}
      <SKSection level="DPC" territoryId={dpc.id} />
    </div>
  )
}

// ============================================================
// SECTION PENGURUS (Reusable untuk DPN/DPD/DPC)
// ============================================================
function PengurusSection({ level, territoryId, territoryFilter }: {
  level: string; territoryId?: string; territoryFilter?: { level: string }
}) {
  const user = useAuthStore((s) => s.user)!
  const addToast = useToastStore((s) => s.addToast)
  const [positions, setPositions] = useState<OrgPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editPos, setEditPos] = useState<OrgPosition | null>(null)
  const [deletePos, setDeletePos] = useState<OrgPosition | null>(null)

  const loadData = () => {
    setLoading(true)
    api('/api/organization').then((all) => {
      let filtered = all.filter((p: OrgPosition) => p.level === level)
      if (territoryId) {
        filtered = filtered.filter((p: OrgPosition) => p.territoryId === territoryId)
      } else if (territoryFilter) {
        filtered = filtered.filter((p: OrgPosition) => p.territory?.level === territoryFilter.level)
      }
      setPositions(filtered)
    }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const handleDelete = async () => {
    if (!deletePos) return
    try {
      await api(`/api/organization/${deletePos.id}`, { method: 'DELETE' })
      addToast(`Pengurus "${deletePos.fullName}" berhasil dihapus`, 'success')
      setDeletePos(null); loadData()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const canManage = user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN' ||
    (user.role === 'ADMIN_DPD' && (level === 'DPD' || level === 'DPC')) ||
    (user.role === 'ADMIN_DPC' && level === 'DPC')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4 text-orange-600" />
            Struktur Pengurus {level}
            <Badge variant="outline" className="text-xs">{positions.length} pengurus</Badge>
          </CardTitle>
          {canManage && (
            <Button onClick={() => setAddOpen(true)} size="sm" className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Tambah
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {positions.length === 0 ? (
          <EmptyState icon={Building2} title="Belum ada pengurus" description={`Tambah pengurus ${level} baru.`} />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {positions.sort((a, b) => a.order - b.order).map((p) => (
              <div key={p.id} className="group relative flex items-start gap-3 p-3 rounded-lg border hover:shadow-sm">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs font-semibold">
                    {p.fullName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{p.fullName}</div>
                  <div className="text-xs text-orange-600 font-medium">{p.positionName}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {p.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{p.phone}</span>}
                    {p.territory && <Badge variant="outline" className="text-[10px]">{p.territory.name}</Badge>}
                  </div>
                </div>
                {/* Ikon Edit & Hapus eksplisit di sudut kanan atas */}
                {canManage && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                      onClick={() => setEditPos(p)}
                      title="Edit Pengurus"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                      onClick={() => setDeletePos(p)}
                      title="Hapus Pengurus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialogs */}
      <AddPositionDialog
        open={addOpen} onOpenChange={setAddOpen}
        defaultLevel={level}
        territoryId={territoryId}
        territoryFilter={territoryFilter}
        onSuccess={() => { loadData(); setAddOpen(false); addToast('Pengurus baru ditambahkan', 'success') }}
      />
      <EditPositionDialog
        position={editPos}
        onOpenChange={(o) => !o && setEditPos(null)}
        onSuccess={() => { loadData(); setEditPos(null); addToast('Pengurus diperbarui', 'success') }}
      />
      <AlertDialog open={!!deletePos} onOpenChange={(o) => !o && setDeletePos(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengurus?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin hapus <strong>{deletePos?.fullName}</strong> ({deletePos?.positionName})?
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
// SECTION ANGGOTA (Reusable untuk DPC)
// ============================================================
function AnggotaSection({ territoryId }: { territoryId: string }) {
  const user = useAuthStore((s) => s.user)!
  const addToast = useToastStore((s) => s.addToast)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editMem, setEditMem] = useState<Member | null>(null)
  const [deleteMem, setDeleteMem] = useState<Member | null>(null)
  const [search, setSearch] = useState('')

  const loadData = () => {
    setLoading(true)
    api(`/api/members?territoryId=${territoryId}`)
      .then(setMembers).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [territoryId])

  const handleDelete = async () => {
    if (!deleteMem) return
    try {
      await api(`/api/members/${deleteMem.id}`, { method: 'DELETE' })
      addToast('Anggota dihapus', 'success'); setDeleteMem(null); loadData()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const canManage = user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN' ||
    user.role === 'ADMIN_DPD' || user.role === 'ADMIN_DPC'

  const filtered = members.filter((m) =>
    !search || m.fullName.toLowerCase().includes(search.toLowerCase()) ||
    m.memberNumber.toLowerCase().includes(search.toLowerCase()) ||
    (m.nik || '').includes(search)
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-emerald-600" />
            Daftar Anggota
            <Badge variant="outline" className="text-xs">{members.length} anggota</Badge>
          </CardTitle>
          {canManage && (
            <Button onClick={() => setAddOpen(true)} size="sm" className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Tambah Anggota
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari nama, NIK, atau nomor KTA..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="Belum ada anggota" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor KTA</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => {
                  const status = STATUS_CONFIG[m.status] || STATUS_CONFIG.PENDING
                  return (
                    <TableRow key={m.id} className="group">
                      <TableCell><code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{m.memberNumber}</code></TableCell>
                      <TableCell className="font-medium">
                        {m.fullName}
                        {m.nik && <div className="text-xs text-muted-foreground">NIK: {m.nik}</div>}
                      </TableCell>
                      <TableCell>{m.phone}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${status.color}`}>{status.label}</Badge></TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditMem(m)}>
                                <Edit className="w-4 h-4 mr-2" /> Edit Anggota
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addToast('Upload foto/KTA - fitur coming soon', 'info')}>
                                <Upload className="w-4 h-4 mr-2" /> Upload Foto/KTA
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteMem(m)} className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" /> Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Dialogs */}
      <AddMemberDialog
        open={addOpen} onOpenChange={setAddOpen}
        territoryId={territoryId}
        onSuccess={() => { loadData(); setAddOpen(false); addToast('Anggota baru ditambahkan', 'success') }}
      />
      <EditMemberDialog
        member={editMem}
        onOpenChange={(o) => !o && setEditMem(null)}
        onSuccess={() => { loadData(); setEditMem(null); addToast('Anggota diperbarui', 'success') }}
      />
      <AlertDialog open={!!deleteMem} onOpenChange={(o) => !o && setDeleteMem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Anggota?</AlertDialogTitle>
            <AlertDialogDescription>Yakin hapus <strong>{deleteMem?.fullName}</strong>?</AlertDialogDescription>
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
// SECTION SK (Reusable untuk DPN/DPD/DPC)
// ============================================================
function SKSection({ level, territoryId, territoryFilter }: {
  level: string; territoryId?: string; territoryFilter?: { level: string }
}) {
  const user = useAuthStore((s) => s.user)!
  const addToast = useToastStore((s) => s.addToast)
  const [docs, setDocs] = useState<SKDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteDoc, setDeleteDoc] = useState<SKDocument | null>(null)
  // OCR auto-extract state
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrPreview, setOcrPreview] = useState<any>(null)

  const loadData = () => {
    setLoading(true)
    api('/api/sk').then((all) => {
      let filtered = all
      if (territoryId) {
        filtered = all.filter((d: SKDocument) => d.territoryId === territoryId)
      } else if (territoryFilter) {
        filtered = all.filter((d: SKDocument) => d.territory.level === territoryFilter.level)
      }
      setDocs(filtered)
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const handleDelete = async () => {
    if (!deleteDoc) return
    try {
      await api(`/api/sk/${deleteDoc.id}`, { method: 'DELETE' })
      addToast('SK dihapus', 'success'); setDeleteDoc(null); loadData()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  if (loading) return <LoadingState />

  const canManage = user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN' ||
    (user.role === 'ADMIN_DPD' && (level === 'DPD' || level === 'DPC')) ||
    (user.role === 'ADMIN_DPC' && level === 'DPC')

  // Handler: Upload SK + OCR Extract Pengurus
  const handleOcrExtract = async (file: File) => {
    setOcrLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('territoryId', territoryId || '')
      formData.append('level', level)

      const res = await fetch('/api/sk/extract-pengurus', {
        method: 'POST',
        headers: { 'x-user-id': user?.id || '' },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'OCR gagal')

      if (data.data.pengurus.length > 0) {
        setOcrPreview(data.data)
        addToast(`Berhasil ekstrak ${data.data.pengurus.length} pengurus dari SK`, 'success')
      } else {
        addToast('OCR selesai, tidak ada pengurus terdeteksi. SK tersimpan sebagai arsip.', 'info')
      }
      loadData()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setOcrLoading(false)
    }
  }

  // Handler: Confirm extracted pengurus → create records
  const handleConfirmExtract = async (pengurusList: any[]) => {
    try {
      const results = await Promise.all(
        pengurusList.map((p) =>
          api('/api/organization', {
            method: 'POST',
            body: JSON.stringify({
              fullName: p.fullName,
              positionName: p.positionName,
              level,
              territoryId,
              phone: p.phone || null,
              email: p.email || null,
              source: 'OCR_EXTRACT',
            }),
          })
        )
      )
      addToast(`${results.length} pengurus berhasil dibuat (menunggu approval)`, 'success')
      setOcrPreview(null)
      // Refresh pengurus data via parent callback
      window.dispatchEvent(new Event('pengurus-updated'))
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-indigo-600" />
            Arsip SK {level}
            <Badge variant="outline" className="text-xs">{docs.length} dokumen</Badge>
          </CardTitle>
          {canManage && (
            <div className="flex gap-2">
              {/* Upload SK biasa */}
              <Button onClick={() => setUploadOpen(true)} size="sm" variant="outline">
                <Upload className="w-4 h-4 mr-1" /> Upload SK
              </Button>
              {/* Upload SK + OCR Auto-Extract */}
              <OcrExtractButton onFileSelected={handleOcrExtract} loading={ocrLoading} level={level} />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {docs.length === 0 ? (
          <EmptyState icon={FileText} title="Belum ada SK" description="Upload SK untuk arsip digital dengan OCR." />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {docs.map((d) => (
              <div key={d.id} className="group flex items-start gap-3 p-3 rounded-lg border">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{d.title}</div>
                  <code className="text-[10px] font-mono bg-muted px-1 rounded">{d.skNumber}</code>
                  <div className="text-xs text-muted-foreground mt-1">
                    {d.issuedBy} • {formatDateID(d.issuedAt)}
                  </div>
                  {d.ocrStatus === 'COMPLETED' && (
                    <Badge variant="outline" className="text-[10px] mt-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                      <FileCheck className="w-3 h-3 mr-1" /> OCR Selesai
                    </Badge>
                  )}
                </div>
                {canManage && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-red-600" onClick={() => setDeleteDoc(d)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <UploadSKDialogSimple
        open={uploadOpen} onOpenChange={setUploadOpen}
        territoryId={territoryId}
        territoryFilter={territoryFilter}
        onSuccess={() => { loadData(); setUploadOpen(false); addToast('SK diupload, OCR diproses', 'success') }}
      />
      <AlertDialog open={!!deleteDoc} onOpenChange={(o) => !o && setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus SK?</AlertDialogTitle>
            <AlertDialogDescription>Yakin hapus <strong>{deleteDoc?.title}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* OCR Preview Dialog - tampilkan hasil ekstrak pengurus dari SK */}
      <OcrPreviewDialog
        preview={ocrPreview}
        onClose={() => setOcrPreview(null)}
        onConfirm={handleConfirmExtract}
      />
    </Card>
  )
}

// ============================================================
// OCR EXTRACT BUTTON - Upload SK + auto-extract pengurus via OCR
// ============================================================
function OcrExtractButton({ onFileSelected, loading, level }: {
  onFileSelected: (file: File) => void
  loading: boolean
  level: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.tif,.tiff"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFileSelected(f)
          if (inputRef.current) inputRef.current.value = ''
        }}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        size="sm"
        className="bg-gradient-to-r from-orange-600 to-red-600 text-white"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-1 animate-spin" /> OCR Processing...
          </>
        ) : (
          <>
            <ScanText className="w-4 h-4 mr-1" /> Upload SK + Extract
          </>
        )}
      </Button>
    </>
  )
}

// ============================================================
// OCR PREVIEW DIALOG - Preview extracted pengurus before saving
// ============================================================
function OcrPreviewDialog({ preview, onClose, onConfirm }: {
  preview: any
  onClose: () => void
  onConfirm: (pengurus: any[]) => void
}) {
  const [editable, setEditable] = useState<any[]>([])
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    if (preview?.pengurus) {
      setEditable(preview.pengurus.map((p: any, i: number) => ({ ...p, id: i, selected: true })))
    }
  }, [preview])

  if (!preview) return null

  const handleConfirm = () => {
    const selected = editable.filter((p) => p.selected && p.fullName?.trim())
    if (selected.length === 0) {
      addToast('Pilih minimal 1 pengurus untuk disimpan', 'warning')
      return
    }
    onConfirm(selected)
  }

  return (
    <Dialog open={!!preview} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanText className="w-5 h-5 text-orange-600" />
            Pratinjau Hasil Ekstrak OCR
          </DialogTitle>
          <DialogDescription>
            {editable.length} pengurus terdeteksi dari SK "{preview.fileName}". 
            Edit data jika perlu, centang yang akan disimpan, lalu klik "Simpan".
            Data akan masuk dengan status <strong>Pending</strong> (menunggu approval Admin DPN).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Info SK */}
          {preview.extractedText && (
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              <div className="font-semibold mb-1">Info SK (Auto-Detected):</div>
              <pre className="whitespace-pre-wrap max-h-32 overflow-y-auto text-muted-foreground">
                {preview.extractedText.substring(0, 500)}...
              </pre>
            </div>
          )}

          {/* Daftar pengurus yang bisa di-edit */}
          <div className="space-y-2">
            <div className="text-sm font-semibold">Daftar Pengurus Terdeteksi:</div>
            {editable.map((p, i) => (
              <div key={p.id} className="flex items-start gap-2 p-3 rounded-lg border">
                <input
                  type="checkbox"
                  checked={p.selected}
                  onChange={(e) => setEditable(prev => prev.map(x => x.id === p.id ? { ...x, selected: e.target.checked } : x))}
                  className="mt-1 w-4 h-4"
                />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Nama Lengkap</Label>
                    <Input
                      value={p.fullName || ''}
                      onChange={(e) => setEditable(prev => prev.map(x => x.id === p.id ? { ...x, fullName: e.target.value } : x))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Jabatan</Label>
                    <Input
                      value={p.positionName || ''}
                      onChange={(e) => setEditable(prev => prev.map(x => x.id === p.id ? { ...x, positionName: e.target.value } : x))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">WhatsApp</Label>
                    <Input
                      value={p.phone || ''}
                      onChange={(e) => setEditable(prev => prev.map(x => x.id === p.id ? { ...x, phone: e.target.value } : x))}
                      className="h-8 text-sm"
                      placeholder="Opsional"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Email</Label>
                    <Input
                      value={p.email || ''}
                      onChange={(e) => setEditable(prev => prev.map(x => x.id === p.id ? { ...x, email: e.target.value } : x))}
                      className="h-8 text-sm"
                      placeholder="Opsional"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleConfirm} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
            <ShieldCheck className="w-4 h-4 mr-1" />
            Simpan ({editable.filter(p => p.selected && p.fullName?.trim()).length} pengurus)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// HELPER COMPONENTS
// ============================================================
function BackButton({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
      </Button>
      <h1 className="text-xl font-bold">{label}</h1>
    </div>
  )
}

// ============================================================
// DIALOGS (Add/Edit Position, Add/Edit Member, Upload SK, Add Territory)
// ============================================================
function AddPositionDialog({ open, onOpenChange, defaultLevel, territoryId, territoryFilter, onSuccess }: any) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({ fullName: '', positionName: '', level: defaultLevel, territoryId: territoryId || '', phone: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [territories, setTerritories] = useState<Territory[]>([])

  useEffect(() => {
    if (open) {
      api('/api/territory').then((all) => {
        const levelMap: Record<string, string> = { DPN: 'COUNTRY', DPD: 'PROVINCE', DPC: 'REGENCY' }
        const targetLevel = levelMap[defaultLevel]
        setTerritories(all.filter((t: Territory) => t.level === targetLevel && t.isActive))
      }).catch(() => {})
    }
  }, [open, defaultLevel])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try {
      await api('/api/organization', { method: 'POST', body: JSON.stringify(form) })
      setForm({ fullName: '', positionName: '', level: defaultLevel, territoryId: territoryId || '', phone: '', email: '' })
      onSuccess()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Tambah Pengurus {defaultLevel}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2"><Label>Nama Lengkap *</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Jabatan *</Label><Input value={form.positionName} onChange={(e) => setForm({ ...form, positionName: e.target.value })} placeholder="cth: Ketua, Sekretaris, Bendahara" required /></div>
          {!territoryId && (
            <div className="space-y-2">
              <Label>Wilayah *</Label>
              <Select value={form.territoryId} onValueChange={(v) => setForm({ ...form, territoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih wilayah..." /></SelectTrigger>
                <SelectContent>{territories.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>WhatsApp</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="628xxx" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button><Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditPositionDialog({ position, onOpenChange, onSuccess }: any) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState<any>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (position) setForm({ fullName: position.fullName, positionName: position.positionName, phone: position.phone || '', email: position.email || '', isActive: position.isActive })
  }, [position])

  if (!position) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try { await api(`/api/organization/${position.id}`, { method: 'PUT', body: JSON.stringify(form) }); onSuccess() }
    catch (e: any) { addToast(e.message, 'error') } finally { setLoading(false) }
  }

  return (
    <Dialog open={!!position} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Pengurus</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2"><Label>Nama Lengkap *</Label><Input value={form.fullName || ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Jabatan *</Label><Input value={form.positionName || ''} onChange={(e) => setForm({ ...form, positionName: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>WhatsApp</Label><Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Status</Label><Select value={form.isActive ? 'true' : 'false'} onValueChange={(v) => setForm({ ...form, isActive: v === 'true' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Aktif</SelectItem><SelectItem value="false">Nonaktif</SelectItem></SelectContent></Select></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button><Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AddMemberDialog({ open, onOpenChange, territoryId, onSuccess }: any) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({ fullName: '', nik: '', phone: '', email: '', profession: '', gender: '', shirtSize: '', territoryId })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try {
      await api('/api/members', { method: 'POST', body: JSON.stringify({ ...form, status: 'PENDING' }) })
      setForm({ fullName: '', nik: '', phone: '', email: '', profession: '', gender: '', shirtSize: '', territoryId })
      onSuccess()
    } catch (e: any) { addToast(e.message, 'error') } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Tambah Anggota</DialogTitle><DialogDescription>Nomor KTA otomatis di-generate</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2"><Label>Nama Lengkap *</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>NIK (16 digit)</Label><Input value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value.replace(/\D/g, '').slice(0, 16) })} placeholder="16 digit" /></div>
            <div className="space-y-2"><Label>WhatsApp *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="628xxx" required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Jenis Kelamin</Label><Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Ukuran Kemeja</Label><Select value={form.shirtSize} onValueChange={(v) => setForm({ ...form, shirtSize: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>Profesi</Label><Input value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button><Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditMemberDialog({ member, onOpenChange, onSuccess }: any) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState<any>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (member) setForm({ fullName: member.fullName, nik: member.nik || '', phone: member.phone, email: member.email || '', profession: member.profession || '', status: member.status })
  }, [member])

  if (!member) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try { await api(`/api/members/${member.id}`, { method: 'PUT', body: JSON.stringify(form) }); onSuccess() }
    catch (e: any) { addToast(e.message, 'error') } finally { setLoading(false) }
  }

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Anggota</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2"><Label>Nama Lengkap *</Label><Input value={form.fullName || ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>NIK</Label><Input value={form.nik || ''} onChange={(e) => setForm({ ...form, nik: e.target.value })} /></div>
            <div className="space-y-2"><Label>WhatsApp</Label><Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Status</Label><Select value={form.status || 'PENDING'} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PENDING">Menunggu</SelectItem><SelectItem value="ACTIVE">Aktif</SelectItem><SelectItem value="INACTIVE">Nonaktif</SelectItem></SelectContent></Select></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button><Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function UploadSKDialogSimple({ open, onOpenChange, territoryId, territoryFilter, onSuccess }: any) {
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)!
  const [form, setForm] = useState({ skNumber: '', title: '', issuedAt: '', issuedBy: '' })
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [territories, setTerritories] = useState<Territory[]>([])
  const [selectedTerritory, setSelectedTerritory] = useState(territoryId || '')

  useEffect(() => {
    if (open && !territoryId) {
      api('/api/territory').then((all) => {
        const levelMap: Record<string, string> = { DPN: 'COUNTRY', DPD: 'PROVINCE', DPC: 'REGENCY' }
        const targetLevel = territoryFilter ? levelMap[territoryFilter.level === 'COUNTRY' ? 'DPN' : territoryFilter.level === 'PROVINCE' ? 'DPD' : 'DPC'] : null
        if (targetLevel) {
          setTerritories(all.filter((t: Territory) => t.level === targetLevel && t.isActive))
        }
      }).catch(() => {})
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetTerritory = territoryId || selectedTerritory
    if (!targetTerritory) { addToast('Pilih wilayah dulu', 'error'); return }

    setLoading(true)
    try {
      const formData = new FormData()
      if (file) formData.append('file', file)
      formData.append('territoryId', targetTerritory)
      formData.append('skNumber', form.skNumber || `SK-${Date.now()}`)
      formData.append('title', form.title)
      formData.append('issuedAt', form.issuedAt || new Date().toISOString())
      formData.append('issuedBy', form.issuedBy || 'Unknown')

      const res = await fetch('/api/sk/upload', { method: 'POST', headers: { 'x-user-id': user?.id || '' }, body: formData })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Upload gagal')

      setForm({ skNumber: '', title: '', issuedAt: '', issuedBy: '' }); setFile(null)
      onSuccess()
    } catch (e: any) { addToast(e.message, 'error') } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Upload SK</DialogTitle><DialogDescription>OCR otomatis akan mengekstrak teks & metadata</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="border-2 border-dashed rounded-lg p-4 text-center">
            <input type="file" className="hidden" id="sk-file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file ? (
              <div><FileCheck className="w-8 h-8 text-emerald-600 mx-auto mb-1" /><div className="text-sm font-medium">{file.name}</div><Button type="button" variant="link" size="sm" onClick={() => document.getElementById('sk-file')?.click()}>Ganti</Button></div>
            ) : (
              <div><Upload className="w-8 h-8 text-gray-400 mx-auto mb-1" /><div className="text-sm">Drag & drop atau <Button type="button" variant="link" className="p-0 h-auto" onClick={() => document.getElementById('sk-file')?.click()}>pilih file</Button></div><div className="text-xs text-muted-foreground">PDF, JPG, PNG, DOC</div></div>
            )}
          </div>
          <div className="space-y-2"><Label>Judul SK *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Nomor SK</Label><Input value={form.skNumber} onChange={(e) => setForm({ ...form, skNumber: e.target.value })} /></div>
            <div className="space-y-2"><Label>Tanggal</Label><Input type="date" value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })} /></div>
          </div>
          {!territoryId && territories.length > 0 && (
            <div className="space-y-2"><Label>Wilayah</Label><Select value={selectedTerritory} onValueChange={setSelectedTerritory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{territories.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
          )}
          <div className="space-y-2"><Label>Penerbit</Label><Input value={form.issuedBy} onChange={(e) => setForm({ ...form, issuedBy: e.target.value })} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button><Button type="submit" disabled={loading}>{loading ? 'Uploading...' : 'Upload'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AddTerritoryDialog({ open, onOpenChange, level, onSuccess }: any) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({ code: '', name: '', level: 'PROVINCE', category: 'DOMESTIC', parentId: '' })
  const [loading, setLoading] = useState(false)
  const [countries, setCountries] = useState<Territory[]>([])

  useEffect(() => {
    if (open) api('/api/territory?level=COUNTRY').then(setCountries).catch(() => {})
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try {
      await api('/api/territory', { method: 'POST', body: JSON.stringify({ ...form, parentId: form.parentId || null }) })
      setForm({ code: '', name: '', level: 'PROVINCE', category: 'DOMESTIC', parentId: '' })
      onSuccess()
    } catch (e: any) { addToast(e.message, 'error') } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Tambah DPD</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Kode *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required /></div>
            <div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          </div>
          <div className="space-y-2"><Label>Negara Induk</Label><Select value={form.parentId || 'ID'} onValueChange={(v) => setForm({ ...form, parentId: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{countries.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Kategori</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DOMESTIC">Domestik</SelectItem><SelectItem value="INTERNATIONAL">Internasional</SelectItem></SelectContent></Select></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button><Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
