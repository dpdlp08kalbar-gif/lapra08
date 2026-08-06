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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useToastStore } from '@/lib/store'
import { formatDateTimeID } from '@/lib/format'
import {
  LifeBuoy, Plus, BookOpen, Ticket, MessageSquare, Bug, Lightbulb,
  CheckCircle2, Clock, AlertCircle, BookMarked,
} from 'lucide-react'

interface Ticket {
  id: string
  ticketNumber: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  reporter: { id: string; fullName: string; territory: { name: string } }
  createdAt: string
  replies: Array<{
    id: string
    message: string
    user: { id: string; fullName: string }
    createdAt: string
  }>
}

const CATEGORY_LABELS: Record<string, string> = {
  BUG: 'Bug / Error',
  QUESTION: 'Pertanyaan',
  FEATURE_REQUEST: 'Permintaan Fitur',
  OTHER: 'Lainnya',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Rendah',
  MEDIUM: 'Sedang',
  HIGH: 'Tinggi',
  URGENT: 'Mendesak',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-50 text-blue-700 border-blue-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  URGENT: 'bg-red-50 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Terbuka',
  IN_PROGRESS: 'Diproses',
  RESOLVED: 'Selesai',
  CLOSED: 'Ditutup',
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-amber-50 text-amber-700 border-amber-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-gray-50 text-gray-700 border-gray-200',
}

export function HelpMenu() {
  const [tab, setTab] = useState('manual')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pusat Bantuan & Panduan"
        description="User manual sistem dan layanan tiket laporan error"
        icon={LifeBuoy}
      />
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab('manual')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'manual' ? 'border-orange-600 text-orange-600' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-4 h-4 inline mr-2" />
          User Manual
        </button>
        <button
          onClick={() => setTab('tickets')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'tickets' ? 'border-orange-600 text-orange-600' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Ticket className="w-4 h-4 inline mr-2" />
          Tiket Laporan
        </button>
      </div>
      {tab === 'manual' && <ManualTab />}
      {tab === 'tickets' && <TicketsTab />}
    </div>
  )
}

function ManualTab() {
  const manuals = [
    {
      icon: BookMarked,
      title: '1. Memulai Sistem',
      content: 'Sistem LAPRA 08 menggunakan login username & password standar. Pilih akun sesuai level wilayah Anda (DPN/DPD/DPC). Setelah login, sidebar kiri berisi 10 menu utama yang bisa diklik untuk navigasi.',
    },
    {
      icon: Bug,
      title: '2. Manajemen Wilayah',
      content: 'Menu "Manajemen Wilayah" menampilkan hierarki Negara → Provinsi → Kabupaten/Kota. Admin DPN dapat menambah wilayah baru (domestik atau internasional) dengan klik "Tambah Wilayah". Sistem 100% dinamis - tidak ada batasan hardcoded.',
    },
    {
      icon: Lightbulb,
      title: '3. Input Anggota & KTA Otomatis',
      content: 'Di menu "Data Keanggotaan", klik "Input Anggota". Pilih skema Domestik (Kalbar) atau Internasional. Nomor KTA dihasilkan otomatis dengan format: LAPRA08.[NEGARA].[PROVINSI].[KAB/KOTA].[TAHUN].[URUT]. Contoh: LAPRA08.ID.61.71.26.00001 untuk anggota Kota Pontianak.',
    },
    {
      icon: AlertCircle,
      title: '4. Verifikasi Anggota',
      content: 'Anggota baru berstatus "Menunggu Verifikasi". Buka tab "Antrean Verifikasi" di menu Keanggotaan, lalu klik tombol Verifikasi atau Aktifkan pada setiap anggota untuk mengubah statusnya menjadi AKTIF.',
    },
    {
      icon: CheckCircle2,
      title: '5. Isolasi Data Wilayah',
      content: 'Admin DPC hanya bisa melihat data di wilayahnya sendiri. Admin DPD bisa melihat data di provinsi dan semua DPC di bawahnya. Admin DPN (Pusat) bisa melihat semua data global. Ini memastikan isolasi data yang aman.',
    },
    {
      icon: LifeBuoy,
      title: '6. Melaporkan Error',
      content: 'Jika menemui kendala teknis, buka tab "Tiket Laporan" di menu ini, klik "Buat Tiket", isi judul dan deskripsi error. Tim Super Admin akan memproses dan membalas tiket Anda.',
    },
  ]

  return (
    <div className="space-y-4">
      <Card className="border-orange-200 bg-orange-50/30">
        <CardContent className="p-4 flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold">Panduan Singkat Sistem LAPRA 08</div>
            <p className="text-muted-foreground mt-1">
              Berikut adalah panduan operasional singkat untuk menggunakan sistem informasi internal LAPRA 08.
              Setiap menu di sidebar memiliki fungsi spesifik yang dijelaskan di bawah.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {manuals.map((m, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
                  <m.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{m.title}</div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{m.content}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bug className="w-4 h-4 text-orange-600" />
            Tips & Trik
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Gunakan fitur pencarian di menu Keanggotaan untuk mencari anggota berdasarkan nama, NIK, atau nomor KTA.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Stok atribut akan otomatis berkurang di wilayah asal dan bertambah di wilayah tujuan saat membuat distribusi logistik.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Broadcast WhatsApp mendukung filter per wilayah - pilih DPC tujuan untuk kirim pesan targeted.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Dashboard menampilkan heatmap real-time sebaran anggota per wilayah dengan gradasi warna kepadatan.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TicketsTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  const loadData = () => {
    setLoading(true)
    api('/api/tickets')
      .then(setTickets)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const openCount = tickets.filter((t) => t.status === 'OPEN').length
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED').length

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Tiket" value={tickets.length} icon={Ticket} color="orange" />
        <StatCard label="Terbuka" value={openCount} icon={Clock} color="amber" />
        <StatCard label="Selesai" value={resolvedCount} icon={CheckCircle2} color="emerald" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> Buat Tiket
        </Button>
      </div>

      {tickets.length === 0 ? (
        <EmptyState icon={Ticket} title="Belum ada tiket" description="Laporkan kendala teknis dengan membuat tiket baru." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Prioritas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pelapor</TableHead>
                  <TableHead>Dibuat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedTicket(t)}>
                    <TableCell><code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{t.ticketNumber}</code></TableCell>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[t.category]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[t.priority]}`}>{PRIORITY_LABELS[t.priority]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[t.status]}`}>{STATUS_LABELS[t.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{t.reporter.fullName}</div>
                      <div className="text-muted-foreground">{t.reporter.territory.name}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTimeID(t.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AddTicketDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => { loadData(); setAddOpen(false) }}
      />

      <TicketDetailDialog
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onReply={() => loadData()}
      />
    </div>
  )
}

function AddTicketDialog({
  open, onOpenChange, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    title: '', description: '', category: 'BUG', priority: 'MEDIUM',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/api/tickets', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      addToast('Tiket berhasil dibuat. Tim support akan memproses.', 'success')
      setForm({ title: '', description: '', category: 'BUG', priority: 'MEDIUM' })
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
          <DialogTitle>Buat Tiket Laporan</DialogTitle>
          <DialogDescription>Laporkan kendala teknis atau ajukan pertanyaan</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Judul *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ringkasan masalah" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Kategori</Label>
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
              <Label>Prioritas</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Deskripsi *</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} placeholder="Jelaskan masalah atau pertanyaan Anda secara detail..." required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Mengirim...' : 'Kirim Tiket'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TicketDetailDialog({
  ticket, onClose, onReply,
}: {
  ticket: Ticket | null; onClose: () => void; onReply: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [reply, setReply] = useState('')

  if (!ticket) return null

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim()) return
    try {
      // Note: Tidak ada API reply di server, simpan di state lokal untuk demo
      addToast('Balasan terkirim (simulasi)', 'success')
      setReply('')
      onReply()
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  return (
    <Dialog open={!!ticket} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{ticket.ticketNumber}</code>
            {ticket.title}
          </DialogTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className={`text-xs ${STATUS_COLORS[ticket.status]}`}>
              {STATUS_LABELS[ticket.status]}
            </Badge>
            <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[ticket.priority]}`}>
              {PRIORITY_LABELS[ticket.priority]}
            </Badge>
            <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[ticket.category]}</Badge>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Deskripsi</div>
            <div className="text-sm bg-muted/50 p-3 rounded-lg">{ticket.description}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2">Balasan ({ticket.replies.length})</div>
            <div className="space-y-2">
              {ticket.replies.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">Belum ada balasan</div>
              ) : (
                ticket.replies.map((r) => (
                  <div key={r.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">{r.user.fullName}</span>
                      <span className="text-muted-foreground">{formatDateTimeID(r.createdAt)}</span>
                    </div>
                    <div className="text-sm">{r.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleReply} className="space-y-2">
            <Label>Tambah Balasan</Label>
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Tulis balasan..." />
            <Button type="submit" size="sm" disabled={!reply.trim()}>
              <MessageSquare className="w-4 h-4 mr-2" /> Kirim Balasan
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
