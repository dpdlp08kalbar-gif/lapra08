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
import { useToastStore, useAuthStore } from '@/lib/store'
import {
  Map, Plus, Globe, MapPin, Users, Trash2, Edit, CheckCircle2, XCircle,
  ChevronRight, ChevronDown, Crown, Building2, User, Phone, Mail,
  MoreVertical, Eye, UserPlus, ShieldCheck, Layers, Network, Flag, Building, UserCog,
} from 'lucide-react'

interface Territory {
  id: string
  code: string
  name: string
  level: string
  category: string
  parentId: string | null
  parent?: Territory | null
  isActive: boolean
  metadata: string | null
  createdAt: string
  canEdit?: boolean
  _count?: {
    children: number
    members: number
    users: number
  }
}

interface OrgPosition {
  id: string
  fullName: string
  positionName: string
  level: string
  territoryId: string
  phone: string | null
  email: string | null
  photoUrl: string | null
  isActive: boolean
  order: number
}

const LEVEL_LABELS: Record<string, string> = {
  COUNTRY: 'Negara (DPN)',
  PROVINCE: 'Provinsi (DPD)',
  REGENCY: 'Kabupaten/Kota (DPC)',
  DISTRICT: 'Kecamatan',
  VILLAGE: 'Desa/Kelurahan',
}

const LEVEL_COLORS: Record<string, string> = {
  COUNTRY: 'bg-purple-100 text-purple-700 border-purple-200',
  PROVINCE: 'bg-blue-100 text-blue-700 border-blue-200',
  REGENCY: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  DISTRICT: 'bg-gray-100 text-gray-700 border-gray-200',
  VILLAGE: 'bg-gray-50 text-gray-600 border-gray-200',
}

const LEVEL_ICONS: Record<string, any> = {
  COUNTRY: Crown,
  PROVINCE: Building2,
  REGENCY: MapPin,
  DISTRICT: Building,
  VILLAGE: Flag,
}

const LEVEL_ORDER = ['COUNTRY', 'PROVINCE', 'REGENCY', 'DISTRICT', 'VILLAGE']

export function TerritoryMenu() {
  const user = useAuthStore((s) => s.user)!
  const addToast = useToastStore((s) => s.addToast)
  const [territories, setTerritories] = useState<Territory[]>([])
  const [orgPositions, setOrgPositions] = useState<OrgPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editTerritory, setEditTerritory] = useState<Territory | null>(null)
  const [deleteTerritory, setDeleteTerritory] = useState<Territory | null>(null)
  const [addPositionFor, setAddPositionFor] = useState<Territory | null>(null)
  const [editPosition, setEditPosition] = useState<OrgPosition | null>(null)
  const [deletePosition, setDeletePosition] = useState<OrgPosition | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState('tree')

  const canCreate = user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN'

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api('/api/territory'),
      api('/api/organization'),
    ])
      .then(([t, p]) => {
        setTerritories(t)
        setOrgPositions(p)
        // Auto-expand COUNTRY
        const initialExpanded = new Set<string>()
        t.forEach((tt: Territory) => {
          if (tt.level === 'COUNTRY') {
            initialExpanded.add(tt.id)
          }
        })
        setExpandedIds(initialExpanded)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDeleteTerritory = async () => {
    if (!deleteTerritory) return
    try {
      await api(`/api/territory/${deleteTerritory.id}`, { method: 'DELETE' })
      addToast(`Wilayah "${deleteTerritory.name}" berhasil dihapus`, 'success')
      setDeleteTerritory(null)
      loadData()
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  const handleDeletePosition = async () => {
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

  const domestic = territories.filter((t) => t.category === 'DOMESTIC')
  const international = territories.filter((t) => t.category === 'INTERNATIONAL')

  // Statistik per level
  const stats = LEVEL_ORDER.reduce((acc, level) => {
    acc[level] = territories.filter((t) => t.level === level && t.isActive).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Wilayah"
        description="Kelola hierarki wilayah: DPN (Pusat) → DPD (Provinsi) → DPC (Kabupaten/Kota)"
        icon={Map}
        actions={
          canCreate && (
            <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Wilayah
            </Button>
          )
        }
      />

      {/* Statistik per level */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {(['COUNTRY', 'PROVINCE', 'REGENCY'] as const).map((level) => {
          const Icon = LEVEL_ICONS[level]
          const colorMap: Record<string, string> = {
            COUNTRY: 'purple',
            PROVINCE: 'blue',
            REGENCY: 'emerald',
          }
          return (
            <StatCard
              key={level}
              label={LEVEL_LABELS[level].split(' (')[0]}
              value={stats[level] || 0}
              icon={Icon}
              color={colorMap[level] as any || 'orange'}
            />
          )
        })}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="tree">
            <Network className="w-4 h-4 mr-2" />
            Pohon Hierarki
          </TabsTrigger>
          <TabsTrigger value="list">
            <Layers className="w-4 h-4 mr-2" />
            Daftar Lengkap
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree" className="mt-4">
          {domestic.length === 0 && international.length === 0 ? (
            <EmptyState
              icon={Map}
              title="Belum ada data wilayah"
              description="Klik 'Tambah Wilayah' untuk mulai membangun hierarki wilayah."
            />
          ) : (
            <div className="space-y-6">
              {/* Domestik */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    Domestik (Indonesia)
                    <Badge variant="outline" className="text-xs">{domestic.length} wilayah</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <TerritoryTreeList
                    territories={domestic}
                    orgPositions={orgPositions}
                    expandedIds={expandedIds}
                    onToggleExpand={toggleExpand}
                    onEdit={setEditTerritory}
                    onDelete={setDeleteTerritory}
                    onAddPosition={setAddPositionFor}
                    onEditPosition={setEditPosition}
                    onDeletePosition={setDeletePosition}
                    canCreate={canCreate}
                  />
                </CardContent>
              </Card>

              {/* Internasional */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    Internasional (Luar Negeri)
                    <Badge variant="outline" className="text-xs">{international.length} wilayah</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <TerritoryTreeList
                    territories={international}
                    orgPositions={orgPositions}
                    expandedIds={expandedIds}
                    onToggleExpand={toggleExpand}
                    onEdit={setEditTerritory}
                    onDelete={setDeleteTerritory}
                    onAddPosition={setAddPositionFor}
                    onEditPosition={setEditPosition}
                    onDeletePosition={setDeletePosition}
                    canCreate={canCreate}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <TerritoryFlatList
            territories={territories}
            orgPositions={orgPositions}
            onEdit={setEditTerritory}
            onDelete={setDeleteTerritory}
            onAddPosition={setAddPositionFor}
            onEditPosition={setEditPosition}
            onDeletePosition={setDeletePosition}
            canCreate={canCreate}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddTerritoryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        allTerritories={territories}
        onSuccess={() => { loadData(); setAddOpen(false); addToast('Wilayah baru berhasil ditambahkan', 'success') }}
      />

      <EditTerritoryDialog
        territory={editTerritory}
        allTerritories={territories}
        onOpenChange={(o) => !o && setEditTerritory(null)}
        onSuccess={() => { loadData(); setEditTerritory(null); addToast('Wilayah berhasil diperbarui', 'success') }}
      />

      <AlertDialog open={!!deleteTerritory} onOpenChange={(o) => !o && setDeleteTerritory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Wilayah</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus wilayah <strong>{deleteTerritory?.name}</strong> ({deleteTerritory?.code})?
              Tindakan ini tidak dapat dibatalkan. Pastikan tidak ada sub-wilayah, anggota, atau user yang terkait.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTerritory}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddOrgPositionDialog
        territory={addPositionFor}
        onOpenChange={(o) => !o && setAddPositionFor(null)}
        onSuccess={() => { loadData(); setAddPositionFor(null); addToast('Pengurus baru berhasil ditambahkan', 'success') }}
      />

      <EditOrgPositionDialog
        position={editPosition}
        onOpenChange={(o) => !o && setEditPosition(null)}
        onSuccess={() => { loadData(); setEditPosition(null); addToast('Pengurus berhasil diperbarui', 'success') }}
      />

      <AlertDialog open={!!deletePosition} onOpenChange={(o) => !o && setDeletePosition(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Pengurus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengurus <strong>{deletePosition?.fullName}</strong> ({deletePosition?.positionName})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePosition}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// TREE VIEW - Hierarki bertingkat dengan expand/collapse
// ============================================================
function TerritoryTreeList({
  territories, orgPositions, expandedIds, onToggleExpand,
  onEdit, onDelete, onAddPosition, onEditPosition, onDeletePosition, canCreate,
}: {
  territories: Territory[]
  orgPositions: OrgPosition[]
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  onEdit: (t: Territory) => void
  onDelete: (t: Territory) => void
  onAddPosition: (t: Territory) => void
  onEditPosition: (p: OrgPosition) => void
  onDeletePosition: (p: OrgPosition) => void
  canCreate: boolean
}) {
  const buildTree = (items: Territory[], parentId: string | null = null): Territory[] => {
    return items
      .filter((t) => t.parentId === parentId)
      .sort((a, b) => {
        const aIdx = LEVEL_ORDER.indexOf(a.level)
        const bIdx = LEVEL_ORDER.indexOf(b.level)
        if (aIdx !== bIdx) return aIdx - bIdx
        return a.name.localeCompare(b.name)
      })
  }

  const roots = buildTree(territories, null)

  if (roots.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Tidak ada data wilayah
      </div>
    )
  }

  return (
    <div className="p-2 space-y-1">
      {roots.map((t) => (
        <TerritoryNode
          key={t.id}
          territory={t}
          allTerritories={territories}
          orgPositions={orgPositions}
          depth={0}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddPosition={onAddPosition}
          onEditPosition={onEditPosition}
          onDeletePosition={onDeletePosition}
          canCreate={canCreate}
        />
      ))}
    </div>
  )
}

function TerritoryNode({
  territory, allTerritories, orgPositions, depth, expandedIds, onToggleExpand,
  onEdit, onDelete, onAddPosition, onEditPosition, onDeletePosition, canCreate,
}: {
  territory: Territory
  allTerritories: Territory[]
  orgPositions: OrgPosition[]
  depth: number
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  onEdit: (t: Territory) => void
  onDelete: (t: Territory) => void
  onAddPosition: (t: Territory) => void
  onEditPosition: (p: OrgPosition) => void
  onDeletePosition: (p: OrgPosition) => void
  canCreate: boolean
}) {
  const children = allTerritories.filter((t) => t.parentId === territory.id)
    .sort((a, b) => {
      const aIdx = LEVEL_ORDER.indexOf(a.level)
      const bIdx = LEVEL_ORDER.indexOf(b.level)
      if (aIdx !== bIdx) return aIdx - bIdx
      return a.name.localeCompare(b.name)
    })
  const hasChildren = children.length > 0
  const isExpanded = expandedIds.has(territory.id)
  const Icon = LEVEL_ICONS[territory.level] || Map
  const positions = orgPositions.filter((p) => p.territoryId === territory.id && p.isActive)
    .sort((a, b) => a.order - b.order)
  const ketua = positions.find((p) =>
    p.positionName.toLowerCase().includes('ketua') &&
    !p.positionName.toLowerCase().includes('wakil')
  ) || positions[0]

  const canEdit = territory.canEdit !== false && canCreate

  return (
    <div>
      <div
        className={`group flex items-start gap-2 p-2 rounded-lg transition-colors ${
          territory.canEdit === false ? 'bg-muted/20' : 'hover:bg-accent/50'
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={() => hasChildren && onToggleExpand(territory.id)}
          className={`mt-0.5 w-5 h-5 flex items-center justify-center shrink-0 ${
            hasChildren ? 'hover:bg-muted rounded' : 'opacity-0'
          }`}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : null}
        </button>

        {/* Icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${LEVEL_COLORS[territory.level]}`}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{territory.name}</span>
            <Badge variant="outline" className={`text-[10px] ${LEVEL_COLORS[territory.level]}`}>
              {LEVEL_LABELS[territory.level]}
            </Badge>
            <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              {territory.code}
            </code>
            {territory.isActive ? (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                Aktif
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-500 border-gray-200">
                Nonaktif
              </Badge>
            )}
            {territory.canEdit === false && canCreate && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                Read-Only
              </Badge>
            )}
          </div>

          {/* Info: Ketua & stats */}
          <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            {ketua && (
              <span className="inline-flex items-center gap-1">
                <Crown className="w-3 h-3 text-orange-500" />
                <span className="font-medium text-foreground">{ketua.fullName}</span>
                <span className="text-muted-foreground">({ketua.positionName})</span>
              </span>
            )}
            {territory._count && (
              <>
                {territory._count.children > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {territory._count.children} sub-wilayah
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {territory._count.members} anggota
                </span>
                {territory._count.users > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <UserCog className="w-3 h-3" />
                    {territory._count.users} user
                  </span>
                )}
              </>
            )}
            {positions.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {positions.length} pengurus
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {canCreate && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(territory)}>
                  <Edit className="w-4 h-4 mr-2" /> Edit Wilayah
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddPosition(territory)}>
                  <UserPlus className="w-4 h-4 mr-2" /> Tambah Pengurus
                </DropdownMenuItem>
                {hasChildren && (
                  <DropdownMenuItem onClick={() => onToggleExpand(territory.id)}>
                    {isExpanded ? (
                      <><ChevronDown className="w-4 h-4 mr-2" /> Tutup Sub-wilayah</>
                    ) : (
                      <><ChevronRight className="w-4 h-4 mr-2" /> Buka Sub-wilayah</>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(territory)}
                  className="text-red-600"
                  disabled={hasChildren || (territory._count?.members || 0) > 0 || (territory._count?.users || 0) > 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Hapus Wilayah
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Pengurus Inti (jika expanded & ada pengurus) */}
      {isExpanded && positions.length > 0 && (
        <div
          className="ml-6 border-l-2 border-orange-200 pl-3 py-2 space-y-1"
          style={{ marginLeft: `${depth * 20 + 36}px` }}
        >
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Pengurus Inti ({positions.length})
          </div>
          {positions.slice(0, 5).map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs group/pos">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
                <User className="w-3 h-3 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium">{p.fullName}</span>
                <span className="text-muted-foreground ml-1">- {p.positionName}</span>
                {p.phone && (
                  <span className="text-muted-foreground ml-2 inline-flex items-center gap-0.5">
                    <Phone className="w-3 h-3" />
                    {p.phone}
                  </span>
                )}
              </div>
              {canCreate && (
                <div className="opacity-0 group-hover/pos:opacity-100 transition-opacity flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onEditPosition(p)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600" onClick={() => onDeletePosition(p)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          {positions.length > 5 && (
            <div className="text-xs text-muted-foreground italic pl-8">
              + {positions.length - 5} pengurus lainnya
            </div>
          )}
        </div>
      )}

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <TerritoryNode
              key={child.id}
              territory={child}
              allTerritories={allTerritories}
              orgPositions={orgPositions}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddPosition={onAddPosition}
              onEditPosition={onEditPosition}
              onDeletePosition={onDeletePosition}
              canCreate={canCreate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// FLAT LIST VIEW - Daftar lengkap dengan filter
// ============================================================
function TerritoryFlatList({
  territories, orgPositions, onEdit, onDelete, onAddPosition, onEditPosition, onDeletePosition, canCreate,
}: {
  territories: Territory[]
  orgPositions: OrgPosition[]
  onEdit: (t: Territory) => void
  onDelete: (t: Territory) => void
  onAddPosition: (t: Territory) => void
  onEditPosition: (p: OrgPosition) => void
  onDeletePosition: (p: OrgPosition) => void
  canCreate: boolean
}) {
  const [filterLevel, setFilterLevel] = useState('')
  const [search, setSearch] = useState('')

  const filtered = territories.filter((t) => {
    if (filterLevel && t.level !== filterLevel) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.code.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Cari nama atau kode wilayah..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={filterLevel || 'ALL'} onValueChange={(v) => setFilterLevel(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Filter level..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Level</SelectItem>
            {LEVEL_ORDER.map((level) => (
              <SelectItem key={level} value={level}>{LEVEL_LABELS[level]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-3 font-semibold">Nama Wilayah</th>
                  <th className="text-left p-3 font-semibold">Level</th>
                  <th className="text-left p-3 font-semibold">Kode</th>
                  <th className="text-left p-3 font-semibold">Ketua</th>
                  <th className="text-center p-3 font-semibold">Anggota</th>
                  <th className="text-center p-3 font-semibold">Pengurus</th>
                  <th className="text-center p-3 font-semibold">Status</th>
                  {canCreate && <th className="text-right p-3 font-semibold">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const positions = orgPositions.filter((p) => p.territoryId === t.id && p.isActive)
                  const ketua = positions.find((p) => p.positionName.toLowerCase().includes('ketua') && !p.positionName.toLowerCase().includes('wakil')) || positions[0]
                  const Icon = LEVEL_ICONS[t.level] || Map
                  return (
                    <tr key={t.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${LEVEL_COLORS[t.level]}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-medium">{t.name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-[10px] ${LEVEL_COLORS[t.level]}`}>
                          {LEVEL_LABELS[t.level]}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{t.code}</code>
                      </td>
                      <td className="p-3 text-xs">
                        {ketua ? (
                          <div>
                            <div className="font-medium">{ketua.fullName}</div>
                            <div className="text-muted-foreground text-[10px]">{ketua.positionName}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Belum ada</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-xs">
                          {t._count?.members || 0}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-xs">
                          {positions.length}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        {t.isActive ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-500 border-gray-200">
                            Nonaktif
                          </Badge>
                        )}
                      </td>
                      {canCreate && (
                        <td className="p-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEdit(t)}>
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onAddPosition(t)}>
                                <UserPlus className="w-4 h-4 mr-2" /> Tambah Pengurus
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDelete(t)}
                                className="text-red-600"
                                disabled={(t._count?.children || 0) > 0 || (t._count?.members || 0) > 0 || (t._count?.users || 0) > 0}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// DIALOGS
// ============================================================

function AddTerritoryDialog({
  open, onOpenChange, allTerritories, onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  allTerritories: Territory[]
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    code: '', name: '', level: 'REGENCY', category: 'DOMESTIC', parentId: '', isActive: true,
  })
  const [loading, setLoading] = useState(false)

  const getParentOptions = () => {
    const parentMap: Record<string, string> = {
      PROVINCE: 'COUNTRY',
      REGENCY: 'PROVINCE',
      DISTRICT: 'REGENCY',
      VILLAGE: 'DISTRICT',
    }
    const parentLevel = parentMap[form.level]
    if (!parentLevel) return []
    if (form.level === 'PROVINCE') {
      return allTerritories.filter((t) => t.level === 'COUNTRY')
    }
    if (form.level === 'REGENCY') {
      return allTerritories.filter((t) => t.level === 'PROVINCE' || t.level === 'COUNTRY')
    }
    return allTerritories.filter((t) => t.level === parentLevel)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/api/territory', {
        method: 'POST',
        body: JSON.stringify({ ...form, parentId: form.parentId || null }),
      })
      setForm({ code: '', name: '', level: 'REGENCY', category: 'DOMESTIC', parentId: '', isActive: true })
      onSuccess()
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const parentOptions = getParentOptions()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Wilayah Baru</DialogTitle>
          <DialogDescription>
            Tambah wilayah kepengurusan baru. Sistem 100% dinamis - tidak ada batasan hardcoded.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Wilayah *</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="cth: 6171, US, LAX, IKN"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Wilayah *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth: Kota Pontianak"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Level *</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v, parentId: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVEL_ORDER.map((level) => (
                    <SelectItem key={level} value={level}>{LEVEL_LABELS[level]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, parentId: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOMESTIC">Domestik (Indonesia)</SelectItem>
                  <SelectItem value="INTERNATIONAL">Internasional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {parentOptions.length > 0 && (
            <div className="space-y-2">
              <Label>Wilayah Induk (Parent) *</Label>
              <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih wilayah induk..." /></SelectTrigger>
                <SelectContent>
                  {parentOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      [{LEVEL_LABELS[t.level].split(' (')[0]}] {t.name} ({t.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="active">Wilayah aktif (siap digunakan)</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Wilayah'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditTerritoryDialog({
  territory, allTerritories, onOpenChange, onSuccess,
}: {
  territory: Territory | null
  allTerritories: Territory[]
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState<any>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (territory) {
      setForm({
        code: territory.code,
        name: territory.name,
        level: territory.level,
        category: territory.category,
        parentId: territory.parentId || '',
        isActive: territory.isActive,
      })
    }
  }, [territory])

  if (!territory) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api(`/api/territory/${territory.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          parentId: form.parentId || null,
        }),
      })
      onSuccess()
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!territory} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Wilayah</DialogTitle>
          <DialogDescription>
            Edit data wilayah <strong>{territory.name}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Kode Wilayah *</Label>
              <Input
                value={form.code || ''}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Wilayah *</Label>
              <Input
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVEL_ORDER.map((level) => (
                    <SelectItem key={level} value={level}>{LEVEL_LABELS[level]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOMESTIC">Domestik</SelectItem>
                  <SelectItem value="INTERNATIONAL">Internasional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Wilayah Induk</Label>
            <Select value={form.parentId || 'NONE'} onValueChange={(v) => setForm({ ...form, parentId: v === 'NONE' ? '' : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">- Tanpa Induk (Root) -</SelectItem>
                {allTerritories
                  .filter((t) => t.id !== territory.id && t.level !== territory.level)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      [{LEVEL_LABELS[t.level].split(' (')[0]}] {t.name} ({t.code})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-active"
              checked={form.isActive || false}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="edit-active">Wilayah aktif</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AddOrgPositionDialog({
  territory, onOpenChange, onSuccess,
}: {
  territory: Territory | null
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    fullName: '', positionName: '', level: 'DPC', phone: '', email: '', order: 1,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (territory) {
      // Auto-set level berdasarkan territory level
      const levelMap: Record<string, string> = {
        COUNTRY: 'DPN',
        PROVINCE: 'DPD',
        REGENCY: 'DPC',
      }
      setForm({
        fullName: '', positionName: '',
        level: levelMap[territory.level] || 'DPC',
        phone: '', email: '', order: 1,
      })
    }
  }, [territory])

  if (!territory) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/api/organization', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          territoryId: territory.id,
          order: parseInt(form.order.toString()) || 1,
        }),
      })
      setForm({ fullName: '', positionName: '', level: 'DPC', phone: '', email: '', order: 1 })
      onSuccess()
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!territory} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Pengurus</DialogTitle>
          <DialogDescription>
            Tambah pengurus untuk wilayah <strong>{territory.name}</strong> ({LEVEL_LABELS[territory.level]})
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Nama Lengkap *</Label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="cth: Dr. H. Bambang Sutejo, M.Si"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Jabatan *</Label>
              <Input
                value={form.positionName}
                onChange={(e) => setForm({ ...form, positionName: e.target.value })}
                placeholder="cth: Ketua, Sekretaris, Bendahara"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Level *</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DPN">DPN</SelectItem>
                  <SelectItem value="DPD">DPD</SelectItem>
                  <SelectItem value="DPC">DPC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="628xxx"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Urutan</Label>
            <Input
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 1 })}
              min="1"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Pengurus'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditOrgPositionDialog({
  position, onOpenChange, onSuccess,
}: {
  position: OrgPosition | null
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
        phone: position.phone || '',
        email: position.email || '',
        order: position.order,
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
        body: JSON.stringify({
          ...form,
          order: parseInt(form.order.toString()) || 1,
        }),
      })
      onSuccess()
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!position} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Pengurus</DialogTitle>
          <DialogDescription>Edit data pengurus <strong>{position.fullName}</strong></DialogDescription>
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
              <Select value={form.level || 'DPC'} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DPN">DPN</SelectItem>
                  <SelectItem value="DPD">DPD</SelectItem>
                  <SelectItem value="DPC">DPC</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              <Label>Urutan</Label>
              <Input type="number" value={form.order || 1} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 1 })} min="1" />
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
