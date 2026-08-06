'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/ui-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToastStore, useAuthStore } from '@/lib/store'
import {
  Map,
  Plus,
  Globe,
  MapPin,
  Building,
  Users,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
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
  _count?: {
    children: number
    members: number
    users: number
  }
}

const LEVEL_LABELS: Record<string, string> = {
  COUNTRY: 'Negara (DPN)',
  COORDINATOR: 'Koorwil (Koordinator Wilayah)',
  PROVINCE: 'Provinsi / Negara LN (DPD)',
  COORD_DPD: 'Koor DPD (Koordinator Region)',
  REGENCY: 'Kabupaten/Kota (DPC)',
  DISTRICT: 'Kecamatan',
  VILLAGE: 'Desa/Kelurahan',
}

const LEVEL_COLORS: Record<string, string> = {
  COUNTRY: 'bg-purple-100 text-purple-700 border-purple-200',
  COORDINATOR: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  PROVINCE: 'bg-blue-100 text-blue-700 border-blue-200',
  COORD_DPD: 'bg-amber-100 text-amber-700 border-amber-200',
  REGENCY: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  DISTRICT: 'bg-gray-100 text-gray-700 border-gray-200',
  VILLAGE: 'bg-gray-50 text-gray-600 border-gray-200',
}

export function TerritoryMenu() {
  const user = useAuthStore((s) => s.user)!
  const addToast = useToastStore((s) => s.addToast)
  const [territories, setTerritories] = useState<Territory[]>([])
  const [allTerritories, setAllTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tab, setTab] = useState('domestic')

  // Hanya DPN yang bisa tambah wilayah baru (sesuai prinsip isolasi)
  const canCreate = user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN'

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api('/api/territory'),
      api('/api/territory?level=COUNTRY'),
    ])
      .then(([all, countries]) => {
        setTerritories(all)
        setAllTerritories(countries)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const domestic = territories.filter((t) => t.category === 'DOMESTIC')
  const international = territories.filter((t) => t.category === 'INTERNATIONAL')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Wilayah"
        description="Kelola hierarki wilayah kepengurusan - domestik & internasional (100% dinamis)"
        icon={Map}
        actions={
          canCreate && (
            <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Wilayah
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="domestic">
            <Building className="w-4 h-4 mr-2" />
            Domestik ({domestic.length})
          </TabsTrigger>
          <TabsTrigger value="international">
            <Globe className="w-4 h-4 mr-2" />
            Internasional ({international.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="domestic" className="mt-4">
          <TerritoryTree territories={domestic} onRefresh={loadData} canCreate={canCreate} />
        </TabsContent>

        <TabsContent value="international" className="mt-4">
          <TerritoryTree territories={international} onRefresh={loadData} canCreate={canCreate} />
        </TabsContent>
      </Tabs>

      <AddTerritoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        allTerritories={territories}
        onSuccess={() => {
          loadData()
          setDialogOpen(false)
          addToast('Wilayah baru berhasil ditambahkan', 'success')
        }}
      />
    </div>
  )
}

function TerritoryTree({
  territories,
  onRefresh,
  canCreate,
}: {
  territories: Territory[]
  onRefresh: () => void
  canCreate: boolean
}) {
  // Build tree structure
  const buildTree = (items: Territory[], parentId: string | null = null): any[] => {
    return items
      .filter((t) => t.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({
        ...t,
        children: buildTree(items, t.id),
      }))
  }

  const tree = buildTree(territories)

  if (tree.length === 0) {
    return (
      <EmptyState
        icon={Map}
        title="Belum ada data wilayah"
        description="Klik 'Tambah Wilayah' untuk mulai membangun hierarki wilayah."
      />
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-1">
          {tree.map((t) => (
            <TerritoryNode key={t.id} territory={t} depth={0} onRefresh={onRefresh} canCreate={canCreate} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TerritoryNode({
  territory,
  depth,
  onRefresh,
  canCreate,
}: {
  territory: any
  depth: number
  onRefresh: () => void
  canCreate: boolean
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = territory.children && territory.children.length > 0
  const addToast = useToastStore((s) => s.addToast)

  const toggleActive = async () => {
    try {
      await api('/api/territory', {
        method: 'POST',
        body: JSON.stringify({ ...territory, isActive: !territory.isActive }),
      })
      addToast(`Wilayah ${territory.isActive ? 'dinonaktifkan' : 'diaktifkan'}`, 'success')
      onRefresh()
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
          territory.canEdit === false ? 'bg-muted/20' : 'hover:bg-accent/50'
        }`}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {expanded ? '−' : '+'}
          </button>
        ) : (
          <div className="w-5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{territory.name}</span>
            <Badge variant="outline" className={`text-[10px] ${LEVEL_COLORS[territory.level]}`}>
              {LEVEL_LABELS[territory.level]}
            </Badge>
            {territory.isActive ? (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                Aktif
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-500 border-gray-200">
                Nonaktif
              </Badge>
            )}
            {territory.canEdit === false && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                Read-Only
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Kode: <code className="bg-muted px-1 rounded font-mono">{territory.code}</code>
            {territory._count && (
              <>
                {' • '}
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {territory._count.members} anggota
                </span>
                {' • '}
                <span>{territory._count.children} sub-wilayah</span>
                {' • '}
                <span>{territory._count.users} user</span>
              </>
            )}
          </div>
        </div>
        {canCreate && territory.canEdit !== false && (
          <Button variant="ghost" size="sm" onClick={toggleActive} className="h-7 px-2 text-xs">
            {territory.isActive ? (
              <>
                <XCircle className="w-3 h-3 mr-1" /> Nonaktifkan
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Aktifkan
              </>
            )}
          </Button>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {territory.children.map((child: any) => (
            <TerritoryNode
              key={child.id}
              territory={child}
              depth={depth + 1}
              onRefresh={onRefresh}
              canCreate={canCreate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AddTerritoryDialog({
  open,
  onOpenChange,
  allTerritories,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  allTerritories: Territory[]
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    code: '',
    name: '',
    level: 'REGENCY',
    category: 'DOMESTIC',
    parentId: '',
    isActive: true,
  })
  const [loading, setLoading] = useState(false)

  // Get potential parents based on selected level
  const getParentOptions = () => {
    // Hierarki: COUNTRY → COORDINATOR → PROVINCE → COORD_DPD → REGENCY → DISTRICT → VILLAGE
    const parentMap: Record<string, string> = {
      COORDINATOR: 'COUNTRY',
      PROVINCE: 'COORDINATOR', // bisa juga langsung COUNTRY (untuk LN)
      COORD_DPD: 'PROVINCE',
      REGENCY: 'COORD_DPD', // bisa juga PROVINCE atau COUNTRY
      DISTRICT: 'REGENCY',
      VILLAGE: 'DISTRICT',
    }
    const parentLevel = parentMap[form.level]
    if (!parentLevel) return []

    // Untuk PROVINCE dan REGENCY, parent bisa multiple level
    if (form.level === 'PROVINCE') {
      return allTerritories.filter((t) => t.level === 'COORDINATOR' || t.level === 'COUNTRY')
    }
    if (form.level === 'REGENCY') {
      return allTerritories.filter(
        (t) => t.level === 'COORD_DPD' || t.level === 'PROVINCE' || t.level === 'COUNTRY'
      )
    }
    return allTerritories.filter((t) => t.level === parentLevel)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/api/territory', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          parentId: form.parentId || null,
        }),
      })
      onSuccess()
      setForm({
        code: '',
        name: '',
        level: 'REGENCY',
        category: 'DOMESTIC',
        parentId: '',
        isActive: true,
      })
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
              <Label htmlFor="code">Kode Wilayah</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="cth: 71, US, LAX"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Wilayah</Label>
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
              <Label>Level</Label>
              <Select
                value={form.level}
                onValueChange={(v) => setForm({ ...form, level: v, parentId: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COUNTRY">Negara (DPN)</SelectItem>
                  <SelectItem value="COORDINATOR">Koorwil (Koordinator Wilayah)</SelectItem>
                  <SelectItem value="PROVINCE">Provinsi / Negara LN (DPD)</SelectItem>
                  <SelectItem value="COORD_DPD">Koor DPD (Koordinator Region)</SelectItem>
                  <SelectItem value="REGENCY">Kabupaten/Kota (DPC)</SelectItem>
                  <SelectItem value="DISTRICT">Kecamatan</SelectItem>
                  <SelectItem value="VILLAGE">Desa/Kelurahan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v, parentId: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOMESTIC">Domestik (Indonesia)</SelectItem>
                  <SelectItem value="INTERNATIONAL">Internasional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {parentOptions.length > 0 && (
            <div className="space-y-2">
              <Label>Wilayah Induk (Parent)</Label>
              <Select
                value={form.parentId}
                onValueChange={(v) => setForm({ ...form, parentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih wilayah induk..." />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch
              id="active"
              checked={form.isActive}
              onCheckedChange={(c) => setForm({ ...form, isActive: c })}
            />
            <Label htmlFor="active">Wilayah aktif (siap digunakan)</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Wilayah'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
