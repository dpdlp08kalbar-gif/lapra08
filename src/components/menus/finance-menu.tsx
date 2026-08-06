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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useToastStore } from '@/lib/store'
import { formatIDR, formatDateID } from '@/lib/format'
import { Wallet, Plus, TrendingUp, TrendingDown, DollarSign, Receipt } from 'lucide-react'

interface FinanceTxn {
  id: string
  type: string
  category: string
  amount: number
  description: string | null
  receiptUrl: string | null
  transactionDate: string
  territoryId: string
  territory: { id: string; name: string; code: string }
  recordedBy: { id: string; fullName: string }
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

const TYPE_LABELS: Record<string, string> = {
  INCOME: 'Pemasukan',
  EXPENSE: 'Pengeluaran',
}

const CATEGORY_LABELS: Record<string, string> = {
  IURAN: 'Iuran',
  DONASI: 'Donasi',
  SEWA: 'Sewa',
  CETAK: 'Cetak',
  OPERASIONAL: 'Operasional',
  LAINNYA: 'Lainnya',
}

export function FinanceMenu() {
  const addToast = useToastStore((s) => s.addToast)
  const [txns, setTxns] = useState<FinanceTxn[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [filterType, setFilterType] = useState('')

  const loadData = () => {
    setLoading(true)
    Promise.all([api('/api/finance'), api('/api/territory')])
      .then(([t, terr]) => { setTxns(t); setTerritories(terr) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const totalIncome = txns.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const totalExpense = txns.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense

  const filtered = filterType ? txns.filter((t) => t.type === filterType) : txns

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kas & Keuangan"
        description="Pencatatan transparan iuran, donasi, dan pengeluaran operasional"
        icon={Wallet}
        actions={
          <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> Catat Transaksi
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Pemasukan" value={formatIDR(totalIncome)} icon={TrendingUp} color="emerald" />
        <StatCard label="Total Pengeluaran" value={formatIDR(totalExpense)} icon={TrendingDown} color="red" />
        <StatCard
          label="Saldo Kas"
          value={formatIDR(balance)}
          icon={DollarSign}
          color={balance >= 0 ? 'blue' : 'red'}
          subtitle={balance >= 0 ? 'Surplus' : 'Defisit'}
        />
      </div>

      <div className="flex items-center gap-2">
        <Select value={filterType || 'ALL'} onValueChange={(v) => setFilterType(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Semua tipe..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Tipe</SelectItem>
            <SelectItem value="INCOME">Pemasukan</SelectItem>
            <SelectItem value="EXPENSE">Pengeluaran</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="Belum ada transaksi" description="Catat pemasukan dan pengeluaran untuk transparansi keuangan." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Wilayah</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{formatDateID(t.transactionDate)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${
                        t.type === 'INCOME'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {TYPE_LABELS[t.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[t.category] || t.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{t.description || '-'}</TableCell>
                    <TableCell className="text-xs">{t.territory.name}</TableCell>
                    <TableCell className={`text-right font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.type === 'INCOME' ? '+' : '-'} {formatIDR(t.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AddTransactionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        territories={territories}
        onSuccess={() => { loadData(); setAddOpen(false) }}
      />
    </div>
  )
}

function AddTransactionDialog({
  open, onOpenChange, territories, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  territories: Territory[]; onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    type: 'INCOME', category: 'IURAN', amount: 0, description: '',
    transactionDate: '', territoryId: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/api/finance', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount.toString()) || 0,
          transactionDate: form.transactionDate ? new Date(form.transactionDate).toISOString() : new Date().toISOString(),
        }),
      })
      addToast('Transaksi berhasil dicatat', 'success')
      setForm({ type: 'INCOME', category: 'IURAN', amount: 0, description: '', transactionDate: '', territoryId: '' })
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
          <DialogTitle>Catat Transaksi Keuangan</DialogTitle>
          <DialogDescription>Pencatatan iuran, donasi, atau pengeluaran operasional</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipe *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Pemasukan</SelectItem>
                  <SelectItem value="EXPENSE">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Jumlah (Rp) *</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} required />
            </div>
            <div className="space-y-2">
              <Label>Tanggal *</Label>
              <Input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} required />
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
          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="cth: Iuran bulanan pengurus DPC" />
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
