'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { PageHeader, LoadingState, ErrorState, EmptyState, StatCard } from '@/components/ui-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useToastStore } from '@/lib/store'
import { formatDateID } from '@/lib/format'
import {
  Package, Plus, ArrowRight, Truck, Boxes, AlertTriangle, TrendingDown,
} from 'lucide-react'

interface Asset {
  id: string
  name: string
  category: string
  sku: string | null
  stock: number
  unit: string
  minStock: number
  description: string | null
  territoryId: string
  territory: { id: string; name: string; code: string }
}

interface Distribution {
  id: string
  assetId: string
  asset: { id: string; name: string; category: string; unit: string }
  fromTerritoryId: string
  fromTerritory: { id: string; name: string; code: string }
  toTerritoryId: string
  toTerritory: { id: string; name: string; code: string }
  quantity: number
  notes: string | null
  status: string
  sentAt: string | null
  receivedAt: string | null
  createdAt: string
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

const CATEGORY_LABELS: Record<string, string> = {
  KEMEJA: 'Kemeja',
  SERAGAM: 'Seragam',
  BENDERA: 'Bendera',
  PLAKAT: 'Plakat',
  LAINNYA: 'Lainnya',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Menunggu',
  IN_TRANSIT: 'Dalam Pengiriman',
  RECEIVED: 'Diterima',
  CANCELLED: 'Dibatalkan',
}

export function LogisticsMenu() {
  const [tab, setTab] = useState('stock')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logistik & Atribut"
        description="Manajemen stok atribut organisasi dan distribusi ke wilayah"
        icon={Package}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="stock">
            <Boxes className="w-4 h-4 mr-2" />
            Stok Atribut
          </TabsTrigger>
          <TabsTrigger value="distribution">
            <Truck className="w-4 h-4 mr-2" />
            Distribusi Logistik
          </TabsTrigger>
        </TabsList>
        <TabsContent value="stock" className="mt-4">
          <StockTab />
        </TabsContent>
        <TabsContent value="distribution" className="mt-4">
          <DistributionTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StockTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [assets, setAssets] = useState<Asset[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([api('/api/assets'), api('/api/territory')])
      .then(([a, t]) => { setAssets(a); setTerritories(t) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const totalStock = assets.reduce((sum, a) => sum + a.stock, 0)
  const lowStock = assets.filter((a) => a.stock <= a.minStock)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Jenis Atribut" value={assets.length} icon={Package} color="orange" />
        <StatCard label="Total Stok" value={totalStock.toLocaleString('id-ID')} icon={Boxes} color="blue" />
        <StatCard label="Stok Menipis" value={lowStock.length} icon={AlertTriangle} color={lowStock.length > 0 ? 'red' : 'emerald'} />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> Tambah Atribut
        </Button>
      </div>

      {assets.length === 0 ? (
        <EmptyState icon={Package} title="Belum ada atribut" description="Tambahkan inventaris atribut organisasi." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Atribut</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Min. Stok</TableHead>
                  <TableHead>Wilayah</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((a) => {
                  const low = a.stock <= a.minStock
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[a.category] || a.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={low ? 'text-red-600 font-bold' : 'font-semibold'}>
                          {a.stock} {a.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.minStock} {a.unit}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{a.territory.name}</Badge>
                      </TableCell>
                      <TableCell>
                        {low ? (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Menipis
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                            Aman
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AddAssetDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        territories={territories}
        onSuccess={() => { loadData(); setAddOpen(false) }}
      />
    </div>
  )
}

function AddAssetDialog({
  open, onOpenChange, territories, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  territories: Territory[]; onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    name: '', category: 'KEMEJA', sku: '', stock: 0, unit: 'pcs', minStock: 0,
    description: '', territoryId: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/api/assets', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          stock: parseInt(form.stock.toString()) || 0,
          minStock: parseInt(form.minStock.toString()) || 0,
        }),
      })
      addToast('Atribut baru berhasil ditambahkan', 'success')
      setForm({ name: '', category: 'KEMEJA', sku: '', stock: 0, unit: 'pcs', minStock: 0, description: '', territoryId: '' })
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
          <DialogTitle>Tambah Atribut</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Nama Atribut *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth: Kemeja Seragam Hitam" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Kategori *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Kode internal" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Stok *</Label>
              <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} required />
            </div>
            <div className="space-y-2">
              <Label>Satuan</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Min. Stok</Label>
              <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: parseInt(e.target.value) || 0 })} />
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DistributionTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([api('/api/distributions'), api('/api/assets'), api('/api/territory')])
      .then(([d, a, t]) => { setDistributions(d); setAssets(a); setTerritories(t) })
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
          <Plus className="w-4 h-4 mr-2" /> Buat Distribusi
        </Button>
      </div>

      {distributions.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Belum ada distribusi"
          description="Buat catatan distribusi atribut dari DPD ke DPC."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atribut</TableHead>
                  <TableHead>Dari</TableHead>
                  <TableHead></TableHead>
                  <TableHead>Ke</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distributions.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.asset.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{d.fromTerritory.name}</Badge>
                    </TableCell>
                    <TableCell><ArrowRight className="w-3 h-3 text-muted-foreground" /></TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{d.toTerritory.name}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{d.quantity} {d.asset.unit}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${
                        d.status === 'RECEIVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        d.status === 'IN_TRANSIT' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        d.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {STATUS_LABELS[d.status] || d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateID(d.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AddDistributionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        assets={assets}
        territories={territories}
        onSuccess={() => { loadData(); setAddOpen(false) }}
      />
    </div>
  )
}

function AddDistributionDialog({
  open, onOpenChange, assets, territories, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  assets: Asset[]; territories: Territory[]; onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    assetId: '', fromTerritoryId: '', toTerritoryId: '', quantity: 0, notes: '', status: 'PENDING',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/api/distributions', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          quantity: parseInt(form.quantity.toString()) || 0,
        }),
      })
      addToast('Distribusi berhasil dibuat. Stok asal & tujuan otomatis diupdate.', 'success')
      setForm({ assetId: '', fromTerritoryId: '', toTerritoryId: '', quantity: 0, notes: '', status: 'PENDING' })
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
          <DialogTitle>Buat Distribusi Logistik</DialogTitle>
          <DialogDescription>Stok asal akan berkurang, stok tujuan bertambah otomatis.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Atribut *</Label>
            <Select value={form.assetId} onValueChange={(v) => setForm({ ...form, assetId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih atribut..." /></SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name} (Stok: {a.stock} {a.unit}) - {a.territory.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Dari Wilayah *</Label>
              <Select value={form.fromTerritoryId} onValueChange={(v) => setForm({ ...form, fromTerritoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>
                  {territories.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ke Wilayah *</Label>
              <Select value={form.toTerritoryId} onValueChange={(v) => setForm({ ...form, toTerritoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>
                  {territories.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Jumlah *</Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} min="1" required />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Menunggu</SelectItem>
                  <SelectItem value="IN_TRANSIT">Dalam Pengiriman</SelectItem>
                  <SelectItem value="RECEIVED">Diterima</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
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
