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
import { useToastStore } from '@/lib/store'
import { formatDateTimeID } from '@/lib/format'
import {
  CalendarDays, Plus, Calendar, CheckSquare, FileText, Users, MapPin, Activity,
} from 'lucide-react'

interface EventItem {
  id: string
  title: string
  description: string | null
  type: string
  startDate: string
  endDate: string | null
  location: string | null
  territoryId: string
  territory: { id: string; name: string; code: string }
  status: string
  targetAttendance: number | null
  _count: { attendance: number; reports: number }
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
  PELANTIKAN: 'Pelantikan',
  MOBILISASI: 'Mobilisasi Massa',
  RAPAT: 'Rapat',
  SOSIAL: 'Sosial',
  LAINNYA: 'Lainnya',
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Terjadwal',
  ONGOING: 'Berlangsung',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
}

export function EventsMenu() {
  const [tab, setTab] = useState('agenda')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event & Mobilisasi"
        description="Manajemen agenda kegiatan, absensi lapangan, dan laporan kegiatan"
        icon={CalendarDays}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="agenda">
            <Calendar className="w-4 h-4 mr-2" /> Agenda Kegiatan
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <CheckSquare className="w-4 h-4 mr-2" /> Absensi Lapangan
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="w-4 h-4 mr-2" /> Laporan Kegiatan
          </TabsTrigger>
        </TabsList>
        <TabsContent value="agenda" className="mt-4"><AgendaTab /></TabsContent>
        <TabsContent value="attendance" className="mt-4"><AttendanceTab /></TabsContent>
        <TabsContent value="reports" className="mt-4"><ReportsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function AgendaTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [events, setEvents] = useState<EventItem[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([api('/api/events'), api('/api/territory')])
      .then(([e, t]) => { setEvents(e); setTerritories(t) })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const upcoming = events.filter((e) => e.status === 'SCHEDULED')
  const completed = events.filter((e) => e.status === 'COMPLETED')

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Event" value={events.length} icon={CalendarDays} color="blue" />
        <StatCard label="Mendatang" value={upcoming.length} icon={Activity} color="orange" />
        <StatCard label="Selesai" value={completed.length} icon={CheckSquare} color="emerald" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> Buat Event Baru
        </Button>
      </div>

      {events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Belum ada event" description="Buat agenda kegiatan organisasi." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <Card key={e.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                    {TYPE_LABELS[e.type] || e.type}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${
                    e.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    e.status === 'ONGOING' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    e.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {STATUS_LABELS[e.status] || e.status}
                  </Badge>
                </div>
                <div className="font-bold text-sm mb-2 line-clamp-2">{e.title}</div>
                {e.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{e.description}</p>
                )}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {formatDateTimeID(e.startDate)}
                  </div>
                  {e.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      {e.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    {e._count.attendance} hadir / {e.targetAttendance || '?'} target
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    {e._count.reports} laporan
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddEventDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        territories={territories}
        onSuccess={() => { loadData(); setAddOpen(false) }}
      />
    </div>
  )
}

function AddEventDialog({
  open, onOpenChange, territories, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  territories: Territory[]; onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    title: '', description: '', type: 'PELANTIKAN',
    startDate: '', endDate: '', location: '', territoryId: '', targetAttendance: 0,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/api/events', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          startDate: new Date(form.startDate).toISOString(),
          endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
          targetAttendance: parseInt(form.targetAttendance.toString()) || undefined,
        }),
      })
      addToast('Event baru berhasil dibuat', 'success')
      setForm({ title: '', description: '', type: 'PELANTIKAN', startDate: '', endDate: '', location: '', territoryId: '', targetAttendance: 0 })
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
          <DialogTitle>Buat Event Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Judul Event *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipe *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Hadir</Label>
              <Input type="number" value={form.targetAttendance} onChange={(e) => setForm({ ...form, targetAttendance: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tanggal Mulai *</Label>
              <Input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Selesai</Label>
              <Input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Lokasi</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="cth: Aula Kantor Walikota" />
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
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Event'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AttendanceTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [events, setEvents] = useState<EventItem[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [attendance, setAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/events').then((e) => {
      setEvents(e)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedEvent) {
      api(`/api/members?status=ACTIVE`).then(setMembers).catch(() => {})
      api(`/api/attendance?eventId=${selectedEvent}`).then(setAttendance).catch(() => {})
    }
  }, [selectedEvent])

  const handleMarkAttendance = async (memberId: string, status: string) => {
    try {
      await api('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({ eventId: selectedEvent, memberIds: [memberId], status }),
      })
      api(`/api/attendance?eventId=${selectedEvent}`).then(setAttendance)
      addToast(`Kehadiran dicatat: ${status}`, 'success')
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  if (loading) return <LoadingState />

  const getMemberStatus = (memberId: string) => {
    const rec = attendance.find((a) => a.memberId === memberId)
    return rec?.status || null
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-w-md">
        <Label>Pilih Event untuk Absensi</Label>
        <Select value={selectedEvent} onValueChange={setSelectedEvent}>
          <SelectTrigger><SelectValue placeholder="Pilih event..." /></SelectTrigger>
          <SelectContent>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.title} - {formatDateTimeID(e.startDate)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedEvent ? (
        <EmptyState icon={CheckSquare} title="Pilih event dulu" description="Pilih event dari dropdown di atas untuk mulai mencatat absensi." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daftar Anggota untuk Absensi ({members.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Wilayah</TableHead>
                  <TableHead className="text-center">Status Kehadiran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const status = getMemberStatus(m.id)
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.fullName}</TableCell>
                      <TableCell>{m.phone}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{m.territory?.name}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant={status === 'PRESENT' ? 'default' : 'outline'}
                            className={`h-7 text-xs ${status === 'PRESENT' ? 'bg-emerald-600' : ''}`}
                            onClick={() => handleMarkAttendance(m.id, 'PRESENT')}
                          >
                            Hadir
                          </Button>
                          <Button
                            size="sm"
                            variant={status === 'ABSENT' ? 'default' : 'outline'}
                            className={`h-7 text-xs ${status === 'ABSENT' ? 'bg-red-600' : ''}`}
                            onClick={() => handleMarkAttendance(m.id, 'ABSENT')}
                          >
                            Tidak
                          </Button>
                          <Button
                            size="sm"
                            variant={status === 'EXCUSED' ? 'default' : 'outline'}
                            className={`h-7 text-xs ${status === 'EXCUSED' ? 'bg-amber-600' : ''}`}
                            onClick={() => handleMarkAttendance(m.id, 'EXCUSED')}
                          >
                            Izin
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ReportsTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [events, setEvents] = useState<EventItem[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    api('/api/events').then((e) => { setEvents(e); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (selectedEvent) {
      api(`/api/reports?eventId=${selectedEvent}`).then(setReports).catch(() => {})
    } else {
      api('/api/reports').then(setReports).catch(() => {})
    }
  }, [selectedEvent])

  const [form, setForm] = useState({
    eventId: '', title: '', content: '', notes: '',
  })
  const [submitLoading, setSubmitLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)
    try {
      await api('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ ...form, eventId: form.eventId || selectedEvent }),
      })
      addToast('Laporan kegiatan berhasil ditambahkan', 'success')
      setForm({ eventId: '', title: '', content: '', notes: '' })
      setAddOpen(false)
      if (selectedEvent) {
        api(`/api/reports?eventId=${selectedEvent}`).then(setReports)
      } else {
        api('/api/reports').then(setReports)
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <div className="space-y-2 sm:w-72">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger><SelectValue placeholder="Semua event..." /></SelectTrigger>
            <SelectContent>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setForm({ ...form, eventId: selectedEvent }); setAddOpen(true) }} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> Buat Laporan
        </Button>
      </div>

      {reports.length === 0 ? (
        <EmptyState icon={FileText} title="Belum ada laporan" description="Buat laporan kegiatan setelah acara selesai." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="font-bold text-sm mb-1">{r.title}</div>
                <div className="text-xs text-muted-foreground mb-2">
                  {r.event?.title} - {formatDateTimeID(r.createdAt)}
                </div>
                <p className="text-sm line-clamp-3">{r.content}</p>
                {r.notes && (
                  <div className="mt-2 text-xs italic text-muted-foreground border-t pt-2">
                    Catatan: {r.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Laporan Kegiatan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label>Event *</Label>
              <Select value={form.eventId} onValueChange={(v) => setForm({ ...form, eventId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih event..." /></SelectTrigger>
                <SelectContent>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Judul Laporan *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Isi Laporan *</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} required />
            </div>
            <div className="space-y-2">
              <Label>Catatan Tambahan</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
              <Button type="submit" disabled={submitLoading}>{submitLoading ? 'Menyimpan...' : 'Simpan Laporan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
