'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/ui-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useToastStore, useAuthStore } from '@/lib/store'
import { formatDateID } from '@/lib/format'
import { Building2, Plus, FileText, Trash2, Briefcase, Crown, User } from 'lucide-react'

interface OrgPosition {
  id: string
  fullName: string
  positionName: string
  level: string
  territoryId: string
  territory: { id: string; name: string; code: string }
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
}

const LEVEL_LABELS: Record<string, string> = {
  DPN: 'DPN (Pusat)',
  DPD: 'DPD (Provinsi)',
  DPC: 'DPC (Kab/Kota)',
}

export function OrganizationMenu() {
  const user = useAuthStore((s) => s.user)!
  const [tab, setTab] = useState('positions')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Struktur Pengurus & SK"
        description="Pendataan pengurus DPN/DPD/DPC dan arsip Surat Keputusan digital"
        icon={Building2}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="positions">
            <Briefcase className="w-4 h-4 mr-2" />
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

function PositionsTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [positions, setPositions] = useState<OrgPosition[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)

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

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  // Group by level
  const grouped = positions.reduce((acc, p) => {
    if (!acc[p.level]) acc[p.level] = []
    acc[p.level].push(p)
    return acc
  }, {} as Record<string, OrgPosition[]>)

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pengurus ini?')) return
    try {
      // Soft delete by setting isActive = false (we'll just refetch)
      // For simplicity, we delete via direct API call - need DELETE endpoint
      addToast('Fitur hapus pengurus akan ditambahkan', 'info')
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> Tambah Pengurus
        </Button>
      </div>

      {positions.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Belum ada data pengurus"
          description="Tambahkan data pengurus untuk membangun struktur organisasi."
        />
      ) : (
        ['DPN', 'DPD', 'DPC'].map((level) => {
          const items = grouped[level] || []
          if (items.length === 0) return null
          return (
            <Card key={level}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Crown className="w-4 h-4 text-orange-600" />
                  {LEVEL_LABELS[level]} ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {items.sort((a, b) => a.order - b.order).map((p) => (
                    <div key={p.id} className="rounded-lg border p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{p.fullName}</div>
                          <div className="text-sm text-orange-600 font-medium">{p.positionName}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {p.territory.name}
                          </div>
                          {p.phone && (
                            <div className="text-xs text-muted-foreground mt-1">
                              📱 {p.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })
      )}

      <AddPositionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        territories={territories}
        onSuccess={() => { loadData(); setAddOpen(false) }}
      />
    </div>
  )
}

function AddPositionDialog({
  open, onOpenChange, territories, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  territories: Territory[]; onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    fullName: '', positionName: '', level: 'DPC', territoryId: '',
    phone: '', email: '', startDate: '',
  })
  const [loading, setLoading] = useState(false)

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
      addToast('Pengurus baru berhasil ditambahkan', 'success')
      setForm({ fullName: '', positionName: '', level: 'DPC', territoryId: '', phone: '', email: '', startDate: '' })
      onSuccess()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Pengurus</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Nama Lengkap *</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Jabatan *</Label>
              <Input value={form.positionName} onChange={(e) => setForm({ ...form, positionName: e.target.value })} placeholder="cth: Ketua, Sekretaris" required />
            </div>
            <div className="space-y-2">
              <Label>Level *</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DPN">DPN (Pusat)</SelectItem>
                  <SelectItem value="DPD">DPD (Provinsi)</SelectItem>
                  <SelectItem value="DPC">DPC (Kab/Kota)</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SKTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [docs, setDocs] = useState<SKDocument[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([api('/api/sk'), api('/api/territory')])
      .then(([d, t]) => { setDocs(d); setTerritories(t) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> Upload SK
        </Button>
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Belum ada dokumen SK"
          description="Upload Surat Keputusan untuk mengarsipkan secara digital."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor SK</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Wilayah</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Penerbit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell><code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{d.skNumber}</code></TableCell>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{d.territory.name}</Badge></TableCell>
                    <TableCell className="text-xs">{formatDateID(d.issuedAt)}</TableCell>
                    <TableCell className="text-xs">{d.issuedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AddSKDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        territories={territories}
        onSuccess={() => { loadData(); setAddOpen(false) }}
      />
    </div>
  )
}

function AddSKDialog({
  open, onOpenChange, territories, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  territories: Territory[]; onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    skNumber: '', title: '', description: '', fileUrl: '',
    issuedAt: '', issuedBy: '', territoryId: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/api/sk', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          fileUrl: form.fileUrl || 'placeholder-sk-url',
          issuedAt: form.issuedAt || new Date().toISOString(),
        }),
      })
      addToast('SK berhasil diupload', 'success')
      setForm({ skNumber: '', title: '', description: '', fileUrl: '', issuedAt: '', issuedBy: '', territoryId: '' })
      onSuccess()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Surat Keputusan (SK)</DialogTitle>
          <DialogDescription>Arsip digital SK kepengurusan</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nomor SK *</Label>
              <Input value={form.skNumber} onChange={(e) => setForm({ ...form, skNumber: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Terbit *</Label>
              <Input type="date" value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Judul SK *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Penerbit *</Label>
            <Input value={form.issuedBy} onChange={(e) => setForm({ ...form, issuedBy: e.target.value })} placeholder="cth: Ketua DPD Kalbar" required />
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
            <Label>URL File SK</Label>
            <Input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} placeholder="https://... atau path file" />
          </div>
          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan SK'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
