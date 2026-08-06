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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useToastStore, useAuthStore } from '@/lib/store'
import { formatDateTimeID } from '@/lib/format'
import {
  Megaphone, Plus, MessageSquare, Bell, Pin, Send, Users, Globe,
} from 'lucide-react'

interface Broadcast {
  id: string
  title: string
  message: string
  channel: string
  status: string
  targetScope: string
  recipientCount: number
  sentAt: string | null
  scheduledAt: string | null
  sentBy: {
    id: string
    fullName: string
    territory: { name: string }
  }
  createdAt: string
}

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  isPinned: boolean
  isActive: boolean
  territoryId: string
  territory: { id: string; name: string; code: string }
  createdBy: { id: string; fullName: string }
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

export function CommunicationMenu() {
  const [tab, setTab] = useState('broadcast')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Komunikasi & Broadcast"
        description="WhatsApp Broadcast massal dan pengumuman internal"
        icon={Megaphone}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="broadcast">
            <Send className="w-4 h-4 mr-2" /> WhatsApp Broadcast
          </TabsTrigger>
          <TabsTrigger value="announcement">
            <Bell className="w-4 h-4 mr-2" /> Pengumuman Internal
          </TabsTrigger>
        </TabsList>
        <TabsContent value="broadcast" className="mt-4"><BroadcastTab /></TabsContent>
        <TabsContent value="announcement" className="mt-4"><AnnouncementTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function BroadcastTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([api('/api/broadcasts'), api('/api/territory')])
      .then(([b, t]) => { setBroadcasts(b); setTerritories(t) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const totalSent = broadcasts.filter((b) => b.status === 'SENT').length
  const totalRecipients = broadcasts.reduce((sum, b) => sum + b.recipientCount, 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Broadcast" value={broadcasts.length} icon={Send} color="orange" />
        <StatCard label="Terkirim" value={totalSent} icon={MessageSquare} color="emerald" />
        <StatCard label="Total Penerima" value={totalRecipients.toLocaleString('id-ID')} icon={Users} color="blue" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> Buat Broadcast
        </Button>
      </div>

      {broadcasts.length === 0 ? (
        <EmptyState icon={Send} title="Belum ada broadcast" description="Kirim pesan massal ke ribuan anggota." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Pesan</TableHead>
                  <TableHead>Penerima</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dikirim</TableHead>
                  <TableHead>Oleh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{b.message}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{b.recipientCount} anggota</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${
                        b.status === 'SENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        b.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {b.status === 'SENT' ? 'Terkirim' : b.status === 'FAILED' ? 'Gagal' : b.status === 'QUEUED' ? 'Antri' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{b.sentAt ? formatDateTimeID(b.sentAt) : '-'}</TableCell>
                    <TableCell className="text-xs">
                      <div>{b.sentBy.fullName}</div>
                      <div className="text-muted-foreground">{b.sentBy.territory.name}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AddBroadcastDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        territories={territories}
        onSuccess={() => { loadData(); setAddOpen(false) }}
      />
    </div>
  )
}

function AddBroadcastDialog({
  open, onOpenChange, territories, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  territories: Territory[]; onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    title: '', message: '', channel: 'WHATSAPP', territoryId: '', scheduledAt: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/api/broadcasts', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          message: form.message,
          channel: form.channel,
          targetScope: form.territoryId ? { territoryId: form.territoryId } : { all: true },
          scheduledAt: form.scheduledAt || undefined,
        }),
      })
      addToast('Broadcast berhasil dikirim (simulasi)', 'success')
      setForm({ title: '', message: '', channel: 'WHATSAPP', territoryId: '', scheduledAt: '' })
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
          <DialogTitle>Buat WhatsApp Broadcast</DialogTitle>
          <DialogDescription>Pesan akan dikirim ke semua anggota AKTIF di wilayah terpilih.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Judul Broadcast *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Isi Pesan *</Label>
            <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} placeholder="Tulis pesan instruksi massal..." required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jadwal Kirim</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Target Wilayah *</Label>
            <Select value={form.territoryId} onValueChange={(v) => setForm({ ...form, territoryId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih wilayah (kosongkan = semua)" /></SelectTrigger>
              <SelectContent>
                {territories.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <Send className="w-4 h-4 inline mr-1" />
            Sistem ini mode simulasi - di produksi akan terintegrasi dengan WhatsApp Business API.
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Mengirim...' : 'Kirim Broadcast'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AnnouncementTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([api('/api/announcements'), api('/api/territory')])
      .then(([a, t]) => { setAnnouncements(a); setTerritories(t) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const pinned = announcements.filter((a) => a.isPinned)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> Buat Pengumuman
        </Button>
      </div>

      {announcements.length === 0 ? (
        <EmptyState icon={Bell} title="Belum ada pengumuman" description="Buat pengumuman untuk ditampilkan di dashboard anggota." />
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Pin className="w-4 h-4 text-orange-600" /> Disematkan
              </div>
              {pinned.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
            </div>
          )}
          <div className="space-y-2">
            {announcements.filter((a) => !a.isPinned).map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
          </div>
        </>
      )}

      <AddAnnouncementDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        territories={territories}
        onSuccess={() => { loadData(); setAddOpen(false) }}
      />
    </div>
  )
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const typeColors: Record<string, string> = {
    INFO: 'border-blue-200 bg-blue-50',
    WARNING: 'border-amber-200 bg-amber-50',
    URGENT: 'border-red-200 bg-red-50',
  }
  return (
    <Card className={`${typeColors[announcement.type] || ''} border-2`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {announcement.isPinned && <Pin className="w-4 h-4 text-orange-600" />}
            <div className="font-bold">{announcement.title}</div>
          </div>
          <Badge variant="outline" className="text-xs">
            {announcement.type}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{announcement.content}</p>
        <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
          <span>Oleh: {announcement.createdBy.fullName}</span>
          <span>•</span>
          <span>{announcement.territory.name}</span>
          <span>•</span>
          <span>{formatDateTimeID(announcement.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function AddAnnouncementDialog({
  open, onOpenChange, territories, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  territories: Territory[]; onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    title: '', content: '', type: 'INFO', isPinned: false, territoryId: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/api/announcements', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      addToast('Pengumuman berhasil dibuat', 'success')
      setForm({ title: '', content: '', type: 'INFO', isPinned: false, territoryId: '' })
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
          <DialogTitle>Buat Pengumuman</DialogTitle>
          <DialogDescription>Pengumuman akan muncul di dashboard pengurus di wilayah terkait.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Judul *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Isi Pengumuman *</Label>
            <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="WARNING">Peringatan</SelectItem>
                  <SelectItem value="URGENT">Mendesak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Wilayah *</Label>
              <Select value={form.territoryId} onValueChange={(v) => setForm({ ...form, territoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>
                  {territories.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pinned"
              checked={form.isPinned}
              onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="pinned">Sematkan di atas</Label>
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
