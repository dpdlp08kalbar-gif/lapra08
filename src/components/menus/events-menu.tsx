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
  CalendarDays, Plus, Calendar, CheckSquare, FileText, Users, MapPin, Activity,
  Zap, Upload, Loader2,
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
  const user = useAuthStore((s: any) => s.user)
  const [mode, setMode] = useState<'scheduled' | 'quick' | 'manual' | 'csv'>('scheduled')
  const [events, setEvents] = useState<EventItem[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [attendance, setAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // === Quick Event form state ===
  const [quickForm, setQuickForm] = useState({
    title: '',
    date: new Date().toISOString().slice(0, 16),
    location: '',
    type: 'LAINNYA',
    notes: '',
  })

  // === Manual names textarea ===
  const [namesText, setNamesText] = useState('')

  // === CSV upload state ===
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<any[]>([])

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
    if (!selectedEvent) return
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

  // === Submit Quick Event + Attendees (manual names) ===
  const handleQuickEventSubmit = async () => {
    if (!quickForm.title || !quickForm.date) {
      addToast('Nama acara dan tanggal wajib diisi', 'error')
      return
    }
    const names = namesText.split('\n').map((n) => n.trim()).filter((n) => n.length >= 2)
    if (names.length === 0) {
      addToast('Daftar peserta wajib diisi (minimal 1 nama, satu per baris)', 'error')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({
          mode: 'quick_event',
          event: {
            title: quickForm.title,
            date: quickForm.date,
            location: quickForm.location,
            type: quickForm.type,
            notes: quickForm.notes,
          },
          attendees: names.map((n) => ({ name: n, status: 'PRESENT' })),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)

      addToast(data.message, 'success')
      // Reset form
      setQuickForm({ title: '', date: new Date().toISOString().slice(0, 16), location: '', type: 'LAINNYA', notes: '' })
      setNamesText('')
      // Reload events list
      api('/api/events').then(setEvents).catch(() => {})
      setMode('scheduled')
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // === Submit Manual Names (for existing event) ===
  const handleManualNamesSubmit = async () => {
    if (!selectedEvent) {
      addToast('Pilih event dulu', 'error')
      return
    }
    const names = namesText.split('\n').map((n) => n.trim()).filter((n) => n.length >= 2)
    if (names.length === 0) {
      addToast('Daftar nama wajib diisi (minimal 1 nama, satu per baris)', 'error')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({
          mode: 'manual_names',
          eventId: selectedEvent,
          namesText,
          status: 'PRESENT',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)

      addToast(data.message, 'success')
      setNamesText('')
      // Reload attendance
      api(`/api/attendance?eventId=${selectedEvent}`).then(setAttendance).catch(() => {})
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // === Parse CSV file client-side ===
  const handleCsvFileChange = async (file: File | null) => {
    if (!file) {
      setCsvFile(null)
      setCsvPreview([])
      return
    }
    setCsvFile(file)
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      const rows = lines.map((line) => {
        // Parse CSV (handle quoted values)
        const cols = line.match(/("([^"]*)"|([^,]*)),?/g)?.map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '')) || []
        return {
          name: cols[0] || '',
          phone: cols[1] || '',
          territoryName: cols[2] || '',
        }
      }).filter((r) => r.name.length >= 2)
      setCsvPreview(rows.slice(0, 10)) // Preview first 10
    } catch (e: any) {
      addToast(`Gagal parse CSV: ${e.message}`, 'error')
    }
  }

  // === Submit CSV Upload ===
  const handleCsvSubmit = async () => {
    if (!selectedEvent) {
      addToast('Pilih event dulu', 'error')
      return
    }
    if (!csvFile || csvPreview.length === 0) {
      addToast('Pilih file CSV dulu', 'error')
      return
    }

    setSubmitting(true)
    try {
      // Parse full CSV (not just preview)
      const text = await csvFile.text()
      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      const rows = lines.map((line) => {
        const cols = line.match(/("([^"]*)"|([^,]*)),?/g)?.map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '')) || []
        return {
          name: cols[0] || '',
          phone: cols[1] || '',
          territoryName: cols[2] || '',
        }
      }).filter((r) => r.name.length >= 2)

      const res = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({
          mode: 'csv_upload',
          eventId: selectedEvent,
          rows,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)

      addToast(data.message, 'success')
      setCsvFile(null)
      setCsvPreview([])
      api(`/api/attendance?eventId=${selectedEvent}`).then(setAttendance).catch(() => {})
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState />

  const getMemberStatus = (memberId: string) => {
    const rec = attendance.find((a) => a.memberId === memberId)
    return rec?.status || null
  }

  // Stats for selected event
  const presentCount = attendance.filter((a) => a.status === 'PRESENT').length
  const absentCount = attendance.filter((a) => a.status === 'ABSENT').length
  const excusedCount = attendance.filter((a) => a.status === 'EXCUSED').length

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30 border">
        <Button
          size="sm"
          variant={mode === 'scheduled' ? 'default' : 'outline'}
          className={mode === 'scheduled' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
          onClick={() => setMode('scheduled')}
        >
          <CheckSquare className="w-4 h-4 mr-1" /> Acara Terjadwal
        </Button>
        <Button
          size="sm"
          variant={mode === 'quick' ? 'default' : 'outline'}
          className={mode === 'quick' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
          onClick={() => setMode('quick')}
        >
          <Zap className="w-4 h-4 mr-1" /> Acara Dadakan
        </Button>
        <Button
          size="sm"
          variant={mode === 'manual' ? 'default' : 'outline'}
          className={mode === 'manual' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
          onClick={() => setMode('manual')}
        >
          <FileText className="w-4 h-4 mr-1" /> Ketik Manual
        </Button>
        <Button
          size="sm"
          variant={mode === 'csv' ? 'default' : 'outline'}
          className={mode === 'csv' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
          onClick={() => setMode('csv')}
        >
          <Upload className="w-4 h-4 mr-1" /> Upload CSV
        </Button>
      </div>

      {/* === MODE 1: SCHEDULED — Existing dropdown event + table === */}
      {mode === 'scheduled' && (
        <>
          <div className="space-y-2 max-w-md">
            <Label>Pilih Event untuk Absensi</Label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger><SelectValue placeholder="Pilih event..." /></SelectTrigger>
              <SelectContent>
                {events.length === 0 ? (
                  <SelectItem value="_empty" disabled>Tidak ada event — buat di tab Agenda atau gunakan mode Acara Dadakan</SelectItem>
                ) : (
                  events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.title} - {formatDateTimeID(e.startDate)}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {events.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Belum ada event terdaftar. Gunakan mode <strong>Acara Dadakan</strong> untuk absensi cepat tanpa perlu buat event terjadwal.
              </p>
            )}
          </div>

          {!selectedEvent ? (
            <EmptyState icon={CheckSquare} title="Pilih event dulu" description="Pilih event dari dropdown di atas untuk mulai mencatat absensi, atau gunakan mode Acara Dadakan / Ketik Manual / Upload CSV." />
          ) : (
            <>
              {/* Stats summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-700">{presentCount}</div>
                  <div className="text-xs text-emerald-700">Hadir</div>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center">
                  <div className="text-2xl font-bold text-red-700">{absentCount}</div>
                  <div className="text-xs text-red-700">Tidak Hadir</div>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
                  <div className="text-2xl font-bold text-amber-700">{excusedCount}</div>
                  <div className="text-xs text-amber-700">Izin</div>
                </div>
              </div>

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
                      {members.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Belum ada anggota. Tambahkan anggota di menu Pusat Data Organisasi.
                          </TableCell>
                        </TableRow>
                      ) : (
                        members.map((m) => {
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
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* === MODE 2: QUICK EVENT (Acara Dadakan) === */}
      {mode === 'quick' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4 text-orange-600" /> Acara Dadakan + Absensi Cepat
            </CardTitle>
            <CardDescription>
              Untuk acara impromptu yang belum terjadwal. Isi nama acara, tanggal, lokasi, lalu ketik nama peserta hadir (satu per baris). Sistem akan otomatis membuat event + mencatat absensi sekaligus.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Nama Acara *</Label>
                <Input
                  value={quickForm.title}
                  onChange={(e) => setQuickForm({ ...quickForm, title: e.target.value })}
                  placeholder="Mis. Pertemuan Koordinasi DPC Pontianak"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tanggal & Waktu *</Label>
                <Input
                  type="datetime-local"
                  value={quickForm.date}
                  onChange={(e) => setQuickForm({ ...quickForm, date: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Lokasi</Label>
                <Input
                  value={quickForm.location}
                  onChange={(e) => setQuickForm({ ...quickForm, location: e.target.value })}
                  placeholder="Mis. Sekretariat DPC Pontianak"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Jenis Acara</Label>
                <Select value={quickForm.type} onValueChange={(v) => setQuickForm({ ...quickForm, type: v })}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PELANTIKAN">Pelantikan</SelectItem>
                    <SelectItem value="MOBILISASI">Mobilisasi Massa</SelectItem>
                    <SelectItem value="RAPAT">Rapat</SelectItem>
                    <SelectItem value="SOSIAL">Aksi Sosial</SelectItem>
                    <SelectItem value="LAINNYA">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Catatan (opsional)</Label>
                <Input
                  value={quickForm.notes}
                  onChange={(e) => setQuickForm({ ...quickForm, notes: e.target.value })}
                  placeholder="Mis. Pertemuan mendadak untuk bahas persiapan HUT"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Daftar Peserta Hadir (satu nama per baris) *</Label>
              <Textarea
                value={namesText}
                onChange={(e) => setNamesText(e.target.value)}
                rows={8}
                placeholder={'Budi Santoso\nSiti Aminah\nAhmad Yani\nDewi Lestari\n...'}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {namesText.split('\n').filter((n) => n.trim().length >= 2).length} nama terdeteksi. Anggota yang belum terdaftar akan otomatis dibuat (status ACTIVE) — perlu dilengkapi data WA & NIK nanti di menu Pusat Data Organisasi.
              </p>
            </div>

            <Button
              onClick={handleQuickEventSubmit}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
              {submitting ? 'Memproses...' : 'Buat Acara + Catat Absensi'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* === MODE 3: MANUAL NAMES (untuk event existing) === */}
      {mode === 'manual' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-blue-600" /> Ketik Manual — Tambah Peserta Hadir
            </CardTitle>
            <CardDescription>
              Untuk event yang sudah dipilih. Ketik nama peserta yang hadir (satu per baris). Cocok untuk absensi massal tanpa perlu klik satu-satu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 max-w-md">
              <Label className="text-xs">Pilih Event *</Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Pilih event..." /></SelectTrigger>
                <SelectContent>
                  {events.length === 0 ? (
                    <SelectItem value="_empty" disabled>Tidak ada event — gunakan mode Acara Dadakan</SelectItem>
                  ) : (
                    events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.title} - {formatDateTimeID(e.startDate)}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Daftar Peserta Hadir (satu nama per baris) *</Label>
              <Textarea
                value={namesText}
                onChange={(e) => setNamesText(e.target.value)}
                rows={10}
                placeholder={'Budi Santoso\nSiti Aminah\nAhmad Yani\n...'}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {namesText.split('\n').filter((n) => n.trim().length >= 2).length} nama terdeteksi. Semua akan di-set "Hadir".
                Anggota yang belum terdaftar akan otomatis dibuat (status ACTIVE).
              </p>
            </div>

            <Button
              onClick={handleManualNamesSubmit}
              disabled={submitting || !selectedEvent}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
              {submitting ? 'Memproses...' : 'Catat Absensi Massal'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* === MODE 4: CSV UPLOAD === */}
      {mode === 'csv' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="w-4 h-4 text-emerald-600" /> Upload CSV — Import Peserta
            </CardTitle>
            <CardDescription>
              Upload file CSV/Excel berisi daftar peserta. Format kolom: <strong>Nama, WhatsApp, Wilayah</strong> (dipisah koma). Semua akan di-set "Hadir".
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 max-w-md">
              <Label className="text-xs">Pilih Event *</Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Pilih event..." /></SelectTrigger>
                <SelectContent>
                  {events.length === 0 ? (
                    <SelectItem value="_empty" disabled>Tidak ada event — gunakan mode Acara Dadakan</SelectItem>
                  ) : (
                    events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.title} - {formatDateTimeID(e.startDate)}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => handleCsvFileChange(e.target.files?.[0] || null)}
                  className="text-sm"
                />
                <a
                  href="data:text/csv;charset=utf-8,Nama,WhatsApp,Wilayah%0ABudi Santoso,081234567890,Pontianak%0ASiti Aminah,081298765432,Sambas"
                  download="template-absensi.csv"
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs border rounded-md hover:bg-accent whitespace-nowrap"
                >
                  <FileText className="w-3 h-3" /> Download Template
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                Format: <code className="bg-muted px-1 rounded text-[11px]">Nama,WhatsApp,Wilayah</code> — header opsional, dipisah koma.
              </p>
            </div>

            {/* CSV Preview */}
            {csvPreview.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Preview (10 baris pertama):</Label>
                <div className="rounded border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Nama</TableHead>
                        <TableHead className="text-xs">WhatsApp</TableHead>
                        <TableHead className="text-xs">Wilayah</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvPreview.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="text-xs font-medium">{row.name}</TableCell>
                          <TableCell className="text-xs">{row.phone || '-'}</TableCell>
                          <TableCell className="text-xs">{row.territoryName || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total: {csvFile ? 'File dipilih' : 'Belum ada file'}
                </p>
              </div>
            )}

            <Button
              onClick={handleCsvSubmit}
              disabled={submitting || !selectedEvent || !csvFile}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
              {submitting ? 'Mengimpor...' : 'Import & Catat Absensi'}
            </Button>
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
